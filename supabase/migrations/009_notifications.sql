-- ════════════════════════════════════════════════════════════════════
-- 009_notifications.sql
-- 인앱 알림 (댓글 / 반응 / 저장 / 담기)
-- ════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS notifications (
  id         BIGSERIAL    PRIMARY KEY,
  user_id    UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  actor_id   UUID         REFERENCES users(id) ON DELETE SET NULL,
  room_id    VARCHAR(12)  REFERENCES trip_rooms(id) ON DELETE CASCADE,
  type       TEXT         NOT NULL
               CHECK (type IN ('trip_comment', 'trip_reaction', 'trip_saved', 'trip_cloned')),
  title      TEXT         NOT NULL,
  message    TEXT,
  link_url   TEXT,
  is_read    BOOLEAN      NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_created
  ON notifications(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notifications_user_unread
  ON notifications(user_id, is_read)
  WHERE is_read = FALSE;

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "notifications_select_own" ON notifications;
DROP POLICY IF EXISTS "notifications_update_own" ON notifications;

-- 본인 알림만 조회
CREATE POLICY "notifications_select_own" ON notifications
  FOR SELECT USING (
    user_id = (SELECT id FROM users WHERE auth_id = auth.uid())
  );

-- 본인 알림만 읽음 처리 (is_read 변경)
CREATE POLICY "notifications_update_own" ON notifications
  FOR UPDATE USING (
    user_id = (SELECT id FROM users WHERE auth_id = auth.uid())
  )
  WITH CHECK (
    user_id = (SELECT id FROM users WHERE auth_id = auth.uid())
  );

-- INSERT는 트리거/RPC(Security Definer)만 — 클라이언트 insert 정책 없음

-- ── 반응 타입 → 라벨 ───────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.reaction_type_label(p_type TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE p_type
    WHEN 'like'       THEN '❤️ 좋아요'
    WHEN 'bookmark'   THEN '📌 참고할게요'
    WHEN 'want_to_go' THEN '✈️ 가고 싶어요'
    WHEN 'beautiful'  THEN '🌸 예뻐요'
    ELSE p_type
  END;
$$;

-- ── 댓글 알림 ─────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.notify_on_trip_comment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_owner_id       UUID;
  v_actor_nickname TEXT;
  v_snippet        TEXT;
BEGIN
  SELECT owner_id INTO v_owner_id
  FROM trip_rooms
  WHERE id = NEW.room_id AND is_public = TRUE;

  IF v_owner_id IS NULL OR v_owner_id = NEW.user_id THEN
    RETURN NEW;
  END IF;

  SELECT nickname INTO v_actor_nickname FROM users WHERE id = NEW.user_id;
  v_snippet := left(NEW.content, 80);
  IF length(NEW.content) > 80 THEN v_snippet := v_snippet || '...'; END IF;

  INSERT INTO notifications (user_id, actor_id, room_id, type, title, message, link_url)
  VALUES (
    v_owner_id,
    NEW.user_id,
    NEW.room_id,
    'trip_comment',
    coalesce(v_actor_nickname, '누군가') || '님이 내 여행에 댓글을 남겼어요.',
    '"' || v_snippet || '"',
    '/t/' || NEW.room_id || '#comments'
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trip_comments_notify ON trip_comments;
CREATE TRIGGER trip_comments_notify
  AFTER INSERT ON trip_comments
  FOR EACH ROW EXECUTE FUNCTION notify_on_trip_comment();

-- ── 반응 알림 ─────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.notify_on_trip_reaction()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_owner_id       UUID;
  v_actor_nickname TEXT;
BEGIN
  SELECT owner_id INTO v_owner_id
  FROM trip_rooms
  WHERE id = NEW.room_id AND is_public = TRUE;

  IF v_owner_id IS NULL OR v_owner_id = NEW.user_id THEN
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
    public.reaction_type_label(NEW.reaction_type),
    '/t/' || NEW.room_id
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trip_reactions_notify ON trip_reactions;
CREATE TRIGGER trip_reactions_notify
  AFTER INSERT ON trip_reactions
  FOR EACH ROW EXECUTE FUNCTION notify_on_trip_reaction();

-- ── 저장 알림 ─────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.notify_on_trip_saved()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_owner_id  UUID;
  v_trip_title TEXT;
BEGIN
  SELECT owner_id, title INTO v_owner_id, v_trip_title
  FROM trip_rooms
  WHERE id = NEW.room_id AND is_public = TRUE;

  IF v_owner_id IS NULL OR v_owner_id = NEW.user_id THEN
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

DROP TRIGGER IF EXISTS saved_trips_notify ON saved_trips;
CREATE TRIGGER saved_trips_notify
  AFTER INSERT ON saved_trips
  FOR EACH ROW EXECUTE FUNCTION notify_on_trip_saved();

-- ── clone_public_trip — 담기 알림 추가 ─────────────────────────────
CREATE OR REPLACE FUNCTION clone_public_trip(p_source_room_id TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id        UUID;
  v_new_room_id    TEXT;
  v_source         trip_rooms%ROWTYPE;
  v_actor_nickname TEXT;
BEGIN
  SELECT id INTO v_user_id
  FROM users
  WHERE auth_id = auth.uid();

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'not_authenticated'
      USING HINT = '로그인이 필요합니다.';
  END IF;

  SELECT * INTO v_source
  FROM trip_rooms
  WHERE id = p_source_room_id
    AND is_public = TRUE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'not_public'
      USING HINT = '공개된 여행만 담을 수 있어요.';
  END IF;

  v_new_room_id := generate_room_code();

  INSERT INTO trip_rooms (
    id, owner_id,
    title, destination, country_code,
    start_date, end_date,
    is_public, is_locked
  ) VALUES (
    v_new_room_id, v_user_id,
    v_source.title || ' (복사본)',
    v_source.destination, v_source.country_code,
    v_source.start_date, v_source.end_date,
    FALSE, FALSE
  );

  INSERT INTO trip_members (room_id, user_id, role)
  VALUES (v_new_room_id, v_user_id, 'owner');

  INSERT INTO markers (
    room_id, day_number, order_index,
    name, address, lat, lng, category,
    stay_minutes, visit_time, memo,
    booking_url, image_url, phone,
    google_place_id, kakao_place_id,
    added_by_user
  )
  SELECT
    v_new_room_id, day_number, order_index,
    name, address, lat, lng, category,
    stay_minutes, visit_time, memo,
    booking_url, image_url, phone,
    google_place_id, kakao_place_id,
    v_user_id
  FROM markers
  WHERE room_id = p_source_room_id
  ORDER BY day_number, order_index;

  UPDATE trip_rooms
  SET fork_count = COALESCE(fork_count, 0) + 1
  WHERE id = p_source_room_id;

  -- 담기 알림 (본인 여행 제외)
  IF v_source.owner_id IS DISTINCT FROM v_user_id THEN
    SELECT nickname INTO v_actor_nickname FROM users WHERE id = v_user_id;

    INSERT INTO notifications (user_id, actor_id, room_id, type, title, message, link_url)
    VALUES (
      v_source.owner_id,
      v_user_id,
      p_source_room_id,
      'trip_cloned',
      coalesce(v_actor_nickname, '누군가') || '님이 내 여행을 담아갔어요.',
      coalesce(v_source.title, '여행'),
      '/t/' || p_source_room_id
    );
  END IF;

  RETURN v_new_room_id;
END;
$$;

REVOKE ALL ON FUNCTION clone_public_trip(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION clone_public_trip(TEXT) TO authenticated;

-- ── 모두 읽음 처리 RPC ────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.mark_all_notifications_read()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
BEGIN
  SELECT id INTO v_user_id FROM users WHERE auth_id = auth.uid();
  IF v_user_id IS NULL THEN RETURN; END IF;

  UPDATE notifications
  SET is_read = TRUE
  WHERE user_id = v_user_id AND is_read = FALSE;
END;
$$;

REVOKE ALL ON FUNCTION mark_all_notifications_read() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION mark_all_notifications_read() TO authenticated;
