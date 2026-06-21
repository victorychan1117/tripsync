-- ════════════════════════════════════════════════════════════════════
-- 014_fix_trip_public_toggle_ambiguous.sql
-- 1) handle_trip_public_toggle url_path 변수/컬럼 충돌(42702) 수정
-- 2) 트리거 제거 → set_trip_public RPC에서 SEO 처리 (구버전 클라이언트도 토글 가능)
-- ════════════════════════════════════════════════════════════════════

-- 버그 있는 트리거 제거 (trip_rooms 직접 UPDATE 시 42702 발생 원인)
DROP TRIGGER IF EXISTS trip_public_toggle ON trip_rooms;

-- RPC: 공개/비공개 + SEO 메타 (트리거 대체)
CREATE OR REPLACE FUNCTION public.set_trip_public(
  p_room_id   TEXT,
  p_is_public BOOLEAN
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_room     trip_rooms%ROWTYPE;
  v_url_path TEXT;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not_authenticated'
      USING HINT = '로그인이 필요합니다.';
  END IF;

  IF NOT public.is_trip_owner(p_room_id) THEN
    RAISE EXCEPTION 'not_owner'
      USING HINT = '여행장만 설정을 변경할 수 있어요.';
  END IF;

  SELECT * INTO v_room FROM trip_rooms WHERE id = p_room_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'room_not_found'
      USING HINT = '여행을 찾을 수 없어요.';
  END IF;

  UPDATE trip_rooms
  SET is_public = p_is_public
  WHERE id = p_room_id;

  -- 공개 전환 시 SEO 페이지·메타 등록 (구 trigger 로직 이전)
  IF p_is_public = TRUE AND (v_room.is_public = FALSE OR v_room.is_public IS NULL) THEN
    v_url_path := '/trips/' || COALESCE(
      (SELECT slug FROM destinations WHERE id = v_room.destination_id),
      lower(regexp_replace(COALESCE(v_room.destination, 'unknown'), '[^a-zA-Z0-9]', '-', 'g'))
    ) || '/' || v_room.nights || 'nights-' || (v_room.nights + 1) || 'days/' || v_room.id;

    INSERT INTO seo_pages (room_id, url_path, last_modified, priority)
    VALUES (v_room.id, v_url_path, now(), 0.8)
    ON CONFLICT (url_path) DO UPDATE SET last_modified = now();

    UPDATE trip_rooms
    SET
      seo_title       = v_room.title || ' | TripSync',
      seo_description = COALESCE(v_room.destination, '') || ' ' ||
                        v_room.nights || '박 ' || (v_room.nights + 1) || '일 여행 일정. ' ||
                        v_room.marker_count || '개 장소를 지도에서 바로 확인하세요.'
    WHERE id = v_room.id;
  END IF;

  RETURN p_is_public;
END;
$$;

GRANT EXECUTE ON FUNCTION public.set_trip_public(TEXT, BOOLEAN) TO authenticated;

-- 트리거 함수도 변수명 수정 (재생성 시 참조용 — 트리거는 위에서 DROP됨)
CREATE OR REPLACE FUNCTION handle_trip_public_toggle()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_url_path TEXT;
BEGIN
  IF NEW.is_public = TRUE AND (OLD.is_public = FALSE OR OLD.is_public IS NULL) THEN
    v_url_path := '/trips/' || COALESCE(
      (SELECT slug FROM destinations WHERE id = NEW.destination_id),
      lower(regexp_replace(COALESCE(NEW.destination, 'unknown'), '[^a-zA-Z0-9]', '-', 'g'))
    ) || '/' || NEW.nights || 'nights-' || (NEW.nights + 1) || 'days/' || NEW.id;

    INSERT INTO seo_pages (room_id, url_path, last_modified, priority)
    VALUES (NEW.id, v_url_path, now(), 0.8)
    ON CONFLICT (url_path) DO UPDATE SET last_modified = now();

    UPDATE trip_rooms
    SET
      seo_title       = NEW.title || ' | TripSync',
      seo_description = COALESCE(NEW.destination, '') || ' ' ||
                        NEW.nights || '박 ' || (NEW.nights + 1) || '일 여행 일정. ' ||
                        NEW.marker_count || '개 장소를 지도에서 바로 확인하세요.'
    WHERE id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;
