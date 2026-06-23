-- ════════════════════════════════════════════════════════════════════
-- 018_save_comment_counts.sql
-- trip_rooms에 save_count, comment_count 추가
-- saved_trips / trip_comments INSERT/DELETE/UPDATE 트리거로 자동 관리
-- ════════════════════════════════════════════════════════════════════

-- ── 컬럼 추가 ─────────────────────────────────────────────────────

ALTER TABLE trip_rooms
  ADD COLUMN IF NOT EXISTS save_count    INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS comment_count INT NOT NULL DEFAULT 0;

-- ── Backfill (기존 데이터 기준 초기값 세팅) ───────────────────────

UPDATE trip_rooms
SET save_count = (
  SELECT COUNT(*)::INT FROM saved_trips WHERE room_id = trip_rooms.id
);

UPDATE trip_rooms
SET comment_count = (
  SELECT COUNT(*)::INT FROM trip_comments
  WHERE room_id = trip_rooms.id AND is_hidden = FALSE
);

-- ════════════════════════════════════════════════════════════════════
-- save_count 트리거
-- ════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.increment_save_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE trip_rooms
  SET save_count = GREATEST(0, COALESCE(save_count, 0) + 1)
  WHERE id = NEW.room_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS saved_trips_increment_save_count ON saved_trips;
CREATE TRIGGER saved_trips_increment_save_count
  AFTER INSERT ON saved_trips
  FOR EACH ROW EXECUTE FUNCTION increment_save_count();

-- ──────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.decrement_save_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE trip_rooms
  SET save_count = GREATEST(0, COALESCE(save_count, 0) - 1)
  WHERE id = OLD.room_id;
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS saved_trips_decrement_save_count ON saved_trips;
CREATE TRIGGER saved_trips_decrement_save_count
  AFTER DELETE ON saved_trips
  FOR EACH ROW EXECUTE FUNCTION decrement_save_count();

-- ════════════════════════════════════════════════════════════════════
-- comment_count 트리거
-- 정책: is_hidden=false인 댓글만 카운트
--   INSERT → +1 (is_hidden 기본값 false)
--   DELETE → -1 (is_hidden=false일 때만)
--   UPDATE is_hidden FALSE→TRUE → -1 (신고로 숨김 처리)
-- ════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.increment_comment_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE trip_rooms
  SET comment_count = GREATEST(0, COALESCE(comment_count, 0) + 1)
  WHERE id = NEW.room_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trip_comments_increment_count ON trip_comments;
CREATE TRIGGER trip_comments_increment_count
  AFTER INSERT ON trip_comments
  FOR EACH ROW EXECUTE FUNCTION increment_comment_count();

-- ──────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.decrement_comment_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- 이미 숨김 처리된 댓글은 UPDATE 트리거에서 이미 카운트 차감됨
  IF NOT OLD.is_hidden THEN
    UPDATE trip_rooms
    SET comment_count = GREATEST(0, COALESCE(comment_count, 0) - 1)
    WHERE id = OLD.room_id;
  END IF;
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trip_comments_decrement_count ON trip_comments;
CREATE TRIGGER trip_comments_decrement_count
  AFTER DELETE ON trip_comments
  FOR EACH ROW EXECUTE FUNCTION decrement_comment_count();

-- ──────────────────────────────────────────────────────────────────
-- 신고로 is_hidden FALSE → TRUE 변경 시 comment_count 차감

CREATE OR REPLACE FUNCTION public.update_comment_count_on_hide()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT OLD.is_hidden AND NEW.is_hidden THEN
    UPDATE trip_rooms
    SET comment_count = GREATEST(0, COALESCE(comment_count, 0) - 1)
    WHERE id = NEW.room_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trip_comments_hide_count ON trip_comments;
CREATE TRIGGER trip_comments_hide_count
  AFTER UPDATE OF is_hidden ON trip_comments
  FOR EACH ROW EXECUTE FUNCTION update_comment_count_on_hide();
