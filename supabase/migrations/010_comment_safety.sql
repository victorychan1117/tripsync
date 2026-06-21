-- ════════════════════════════════════════════════════════════════════
-- 010_comment_safety.sql
-- 댓글 신고 / 숨김 / rate limit / 알림 중복 방지
-- ════════════════════════════════════════════════════════════════════

-- ── trip_comments: 숨김 플래그 ─────────────────────────────────────
ALTER TABLE trip_comments
  ADD COLUMN IF NOT EXISTS is_hidden BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_trip_comments_hidden
  ON trip_comments(room_id, is_hidden)
  WHERE is_hidden = FALSE;

-- ── comment_reports ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS comment_reports (
  id          BIGSERIAL PRIMARY KEY,
  comment_id  BIGINT       NOT NULL REFERENCES trip_comments(id) ON DELETE CASCADE,
  reporter_id UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reason      TEXT         NOT NULL
                CHECK (reason IN ('spam', 'abuse', 'privacy', 'inappropriate', 'other')),
  detail      TEXT,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT now(),
  CONSTRAINT comment_reports_unique UNIQUE (comment_id, reporter_id)
);

CREATE INDEX IF NOT EXISTS idx_comment_reports_comment ON comment_reports(comment_id);

ALTER TABLE comment_reports ENABLE ROW LEVEL SECURITY;
-- 일반 사용자 SELECT/INSERT 정책 없음 — report_trip_comment RPC만 사용

-- ── Rate limit (BEFORE INSERT) ──────────────────────────────────────
CREATE OR REPLACE FUNCTION public.check_trip_comment_rate_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_last_same_room  TIMESTAMPTZ;
  v_count_minute    INT;
  v_duplicate       BOOLEAN;
BEGIN
  -- 같은 여행 30초 내 연속 작성
  SELECT created_at INTO v_last_same_room
  FROM trip_comments
  WHERE user_id = NEW.user_id AND room_id = NEW.room_id
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_last_same_room IS NOT NULL
     AND v_last_same_room > now() - INTERVAL '30 seconds' THEN
    RAISE EXCEPTION 'rate_limit'
      USING HINT = '댓글을 너무 빠르게 작성하고 있어요. 잠시 후 다시 시도해주세요.';
  END IF;

  -- 1분에 최대 3개 (전체)
  SELECT count(*)::INT INTO v_count_minute
  FROM trip_comments
  WHERE user_id = NEW.user_id
    AND created_at > now() - INTERVAL '1 minute';

  IF v_count_minute >= 3 THEN
    RAISE EXCEPTION 'rate_limit'
      USING HINT = '댓글을 너무 빠르게 작성하고 있어요. 잠시 후 다시 시도해주세요.';
  END IF;

  -- 같은 여행에 동일 내용 중복
  SELECT EXISTS (
    SELECT 1 FROM trip_comments
    WHERE user_id = NEW.user_id
      AND room_id = NEW.room_id
      AND content = trim(NEW.content)
  ) INTO v_duplicate;

  IF v_duplicate THEN
    RAISE EXCEPTION 'duplicate_comment'
      USING HINT = '같은 내용의 댓글은 등록할 수 없어요.';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trip_comments_rate_limit ON trip_comments;
CREATE TRIGGER trip_comments_rate_limit
  BEFORE INSERT ON trip_comments
  FOR EACH ROW EXECUTE FUNCTION check_trip_comment_rate_limit();

-- ── 신고 RPC ───────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.report_trip_comment(
  p_comment_id BIGINT,
  p_reason     TEXT,
  p_detail     TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_reporter_id UUID;
  v_comment     trip_comments%ROWTYPE;
  v_report_cnt  INT;
  v_hidden      BOOLEAN := FALSE;
BEGIN
  SELECT id INTO v_reporter_id FROM users WHERE auth_id = auth.uid();
  IF v_reporter_id IS NULL THEN
    RAISE EXCEPTION 'not_authenticated' USING HINT = '로그인이 필요합니다.';
  END IF;

  IF p_reason NOT IN ('spam', 'abuse', 'privacy', 'inappropriate', 'other') THEN
    RAISE EXCEPTION 'invalid_reason' USING HINT = '올바르지 않은 신고 사유예요.';
  END IF;

  SELECT * INTO v_comment FROM trip_comments WHERE id = p_comment_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'not_found' USING HINT = '댓글을 찾을 수 없어요.';
  END IF;

  IF v_comment.user_id = v_reporter_id THEN
    RAISE EXCEPTION 'self_report' USING HINT = '본인 댓글은 신고할 수 없어요.';
  END IF;

  INSERT INTO comment_reports (comment_id, reporter_id, reason, detail)
  VALUES (p_comment_id, v_reporter_id, p_reason, nullif(trim(p_detail), ''));

  SELECT count(*)::INT INTO v_report_cnt
  FROM comment_reports
  WHERE comment_id = p_comment_id;

  IF v_report_cnt >= 3 THEN
    UPDATE trip_comments SET is_hidden = TRUE WHERE id = p_comment_id;
    v_hidden := TRUE;
  END IF;

  RETURN v_hidden;

EXCEPTION
  WHEN unique_violation THEN
    RAISE EXCEPTION 'already_reported'
      USING HINT = '이미 신고한 댓글이에요.';
END;
$$;

REVOKE ALL ON FUNCTION report_trip_comment(BIGINT, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION report_trip_comment(BIGINT, TEXT, TEXT) TO authenticated;

-- ── 반응 알림 중복 방지 (24h 내 동일 actor+room+reaction_type) ─────
CREATE OR REPLACE FUNCTION public.notify_on_trip_reaction()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_owner_id       UUID;
  v_actor_nickname TEXT;
  v_label          TEXT;
BEGIN
  SELECT owner_id INTO v_owner_id
  FROM trip_rooms
  WHERE id = NEW.room_id AND is_public = TRUE;

  IF v_owner_id IS NULL OR v_owner_id = NEW.user_id THEN
    RETURN NEW;
  END IF;

  v_label := public.reaction_type_label(NEW.reaction_type);

  -- 24시간 내 동일 반응 알림 중복 방지 (토글 off→on 재알림 억제)
  IF EXISTS (
    SELECT 1 FROM notifications
    WHERE user_id  = v_owner_id
      AND actor_id = NEW.user_id
      AND room_id  = NEW.room_id
      AND type     = 'trip_reaction'
      AND message  = v_label
      AND created_at > now() - INTERVAL '24 hours'
  ) THEN
    RETURN NEW;
  END IF;

  SELECT nickname INTO v_actor_nickname FROM users WHERE id = NEW.user_id;

  INSERT INTO notifications (user_id, actor_id, room_id, type, title, message, link_url)
  VALUES (
    v_owner_id,
    NEW.user_id,
    NEW.room_id,
    'trip_reaction',
    coalesce(v_actor_nickname, '누군가') || '님이 내 여행에 반응했어요.',
    v_label,
    '/t/' || NEW.room_id
  );

  RETURN NEW;
END;
$$;

-- ── 저장 알림 중복 방지 (saved_trips unique 보조 — 재저장 시 24h 내 중복 억제)
CREATE OR REPLACE FUNCTION public.notify_on_trip_saved()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_owner_id   UUID;
  v_trip_title TEXT;
BEGIN
  SELECT owner_id, title INTO v_owner_id, v_trip_title
  FROM trip_rooms
  WHERE id = NEW.room_id AND is_public = TRUE;

  IF v_owner_id IS NULL OR v_owner_id = NEW.user_id THEN
    RETURN NEW;
  END IF;

  IF EXISTS (
    SELECT 1 FROM notifications
    WHERE user_id  = v_owner_id
      AND actor_id = NEW.user_id
      AND room_id  = NEW.room_id
      AND type     = 'trip_saved'
      AND created_at > now() - INTERVAL '24 hours'
  ) THEN
    RETURN NEW;
  END IF;

  INSERT INTO notifications (user_id, actor_id, room_id, type, title, message, link_url)
  VALUES (
    v_owner_id,
    NEW.user_id,
    NEW.room_id,
    'trip_saved',
    '누군가 내 여행을 저장했어요.',
    coalesce(v_trip_title, '여행'),
    '/t/' || NEW.room_id
  );

  RETURN NEW;
END;
$$;
