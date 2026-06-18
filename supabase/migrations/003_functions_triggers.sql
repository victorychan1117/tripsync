-- ════════════════════════════════════════════════════════════════════
-- 003_functions_triggers.sql
-- DB 함수 및 트리거 — 비즈니스 로직 서버사이드 처리
-- ════════════════════════════════════════════════════════════════════

-- ════════════════════════════════════════════════════════════════════
-- 1. 방 초대 코드 생성 함수
-- ════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION generate_room_code()
RETURNS VARCHAR(12) LANGUAGE plpgsql AS $$
DECLARE
  -- 혼동 문자(0, O, 1, I, L) 제외
  chars       TEXT    := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  code        VARCHAR(12);
  exists_count INT;
BEGIN
  LOOP
    code := 'TRP-'
      || substr(chars, floor(random() * length(chars))::INT + 1, 1)
      || substr(chars, floor(random() * length(chars))::INT + 1, 1)
      || substr(chars, floor(random() * length(chars))::INT + 1, 1)
      || substr(chars, floor(random() * length(chars))::INT + 1, 1);
    SELECT COUNT(*) INTO exists_count FROM trip_rooms WHERE id = code;
    EXIT WHEN exists_count = 0;
  END LOOP;
  RETURN code;
END;
$$;

-- ════════════════════════════════════════════════════════════════════
-- 2. 마커 order_index 중간값 계산 함수
--    day_number + after_order_index 기준으로 삽입할 order_index 반환
-- ════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION get_next_order_index(
  p_room_id    VARCHAR(12),
  p_day_number SMALLINT,
  p_after_idx  FLOAT8 DEFAULT NULL  -- NULL이면 맨 뒤에 추가
)
RETURNS FLOAT8 LANGUAGE plpgsql AS $$
DECLARE
  max_idx   FLOAT8;
  next_idx  FLOAT8;
  gap       FLOAT8;
BEGIN
  IF p_after_idx IS NULL THEN
    -- 맨 뒤에 추가: 현재 최대값 + 1.0
    SELECT COALESCE(MAX(order_index), 0)
      INTO max_idx
      FROM markers
      WHERE room_id = p_room_id AND day_number = p_day_number;
    RETURN max_idx + 1.0;
  ELSE
    -- 중간 삽입: after_idx 다음 값과의 중간
    SELECT COALESCE(MIN(order_index), p_after_idx + 1.0)
      INTO next_idx
      FROM markers
      WHERE room_id = p_room_id
        AND day_number = p_day_number
        AND order_index > p_after_idx;

    gap := next_idx - p_after_idx;
    -- 간격이 너무 좁으면 전체 재번호 매기기 트리거
    IF gap < 0.0001 THEN
      PERFORM reindex_day_markers(p_room_id, p_day_number);
      RETURN get_next_order_index(p_room_id, p_day_number, p_after_idx);
    END IF;
    RETURN p_after_idx + (gap / 2.0);
  END IF;
END;
$$;

-- ════════════════════════════════════════════════════════════════════
-- 3. Day 마커 재번호 매기기 (order_index가 너무 촘촘해질 때)
-- ════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION reindex_day_markers(
  p_room_id    VARCHAR(12),
  p_day_number SMALLINT
)
RETURNS VOID LANGUAGE plpgsql AS $$
DECLARE
  r   RECORD;
  idx FLOAT8 := 1.0;
BEGIN
  FOR r IN
    SELECT id FROM markers
    WHERE room_id = p_room_id AND day_number = p_day_number
    ORDER BY order_index
  LOOP
    UPDATE markers SET order_index = idx WHERE id = r.id;
    idx := idx + 1.0;
  END LOOP;
END;
$$;

-- ════════════════════════════════════════════════════════════════════
-- 4. 마커 투표 집계 트리거
-- ════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION sync_vote_counts()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  UPDATE markers
  SET
    vote_up   = (SELECT COUNT(*) FROM place_votes WHERE marker_id = COALESCE(NEW.marker_id, OLD.marker_id) AND vote = 1),
    vote_down = (SELECT COUNT(*) FROM place_votes WHERE marker_id = COALESCE(NEW.marker_id, OLD.marker_id) AND vote = -1)
  WHERE id = COALESCE(NEW.marker_id, OLD.marker_id);
  RETURN NULL;
END;
$$;

CREATE TRIGGER vote_count_sync
  AFTER INSERT OR UPDATE OR DELETE ON place_votes
  FOR EACH ROW EXECUTE FUNCTION sync_vote_counts();

-- ════════════════════════════════════════════════════════════════════
-- 5. 방 마커 수 & 멤버 수 자동 갱신 트리거
-- ════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION sync_room_marker_count()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  target_room VARCHAR(12);
BEGIN
  target_room := COALESCE(NEW.room_id, OLD.room_id);
  UPDATE trip_rooms
  SET marker_count = (SELECT COUNT(*) FROM markers WHERE room_id = target_room)
  WHERE id = target_room;
  RETURN NULL;
END;
$$;

CREATE TRIGGER room_marker_count_sync
  AFTER INSERT OR DELETE ON markers
  FOR EACH ROW EXECUTE FUNCTION sync_room_marker_count();

CREATE OR REPLACE FUNCTION sync_room_member_count()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  target_room VARCHAR(12);
BEGIN
  target_room := COALESCE(NEW.room_id, OLD.room_id);
  UPDATE trip_rooms
  SET member_count = (SELECT COUNT(*) FROM trip_members WHERE room_id = target_room)
  WHERE id = target_room;
  RETURN NULL;
END;
$$;

CREATE TRIGGER room_member_count_sync
  AFTER INSERT OR DELETE ON trip_members
  FOR EACH ROW EXECUTE FUNCTION sync_room_member_count();

-- ════════════════════════════════════════════════════════════════════
-- 6. Supabase Auth 회원가입 시 users 테이블 자동 생성
-- ════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.users (auth_id, email, nickname, provider, provider_uid, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(
      NEW.raw_user_meta_data->>'full_name',
      NEW.raw_user_meta_data->>'name',
      split_part(NEW.email, '@', 1),
      '여행자'
    ),
    COALESCE(NEW.app_metadata->>'provider', 'email'),
    NEW.raw_user_meta_data->>'sub',
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (auth_id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ════════════════════════════════════════════════════════════════════
-- 7. 공개 일정 → SEO 페이지 자동 등록 트리거
-- ════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION handle_trip_public_toggle()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  url_path TEXT;
BEGIN
  -- 공개로 전환된 경우에만
  IF NEW.is_public = TRUE AND (OLD.is_public = FALSE OR OLD.is_public IS NULL) THEN
    url_path := '/trips/' || COALESCE(
      (SELECT slug FROM destinations WHERE id = NEW.destination_id),
      lower(regexp_replace(COALESCE(NEW.destination, 'unknown'), '[^a-zA-Z0-9]', '-', 'g'))
    ) || '/' || NEW.nights || 'nights-' || (NEW.nights + 1) || 'days/' || NEW.id;

    INSERT INTO seo_pages (room_id, url_path, last_modified, priority)
    VALUES (NEW.id, url_path, now(), 0.8)
    ON CONFLICT (url_path) DO UPDATE SET last_modified = now();

    -- SEO 메타 자동 생성
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

CREATE TRIGGER trip_public_toggle
  AFTER UPDATE OF is_public ON trip_rooms
  FOR EACH ROW EXECUTE FUNCTION handle_trip_public_toggle();

-- ════════════════════════════════════════════════════════════════════
-- 8. 초기 목적지 마스터 데이터
-- ════════════════════════════════════════════════════════════════════
INSERT INTO destinations (name_ko, name_en, slug, country_code, lat, lng, agoda_city_id, booking_city) VALUES
  ('제주도',   'Jeju',       'jeju',       'KR',  33.4996,  126.5312, 17482, 'Jeju'),
  ('부산',     'Busan',      'busan',      'KR',  35.1796,  129.0756, 1201,  'Busan'),
  ('서울',     'Seoul',      'seoul',      'KR',  37.5665,  126.9780, 17069, 'Seoul'),
  ('강릉',     'Gangneung',  'gangneung',  'KR',  37.7519,  128.8761, NULL,  'Gangneung'),
  ('경주',     'Gyeongju',   'gyeongju',   'KR',  35.8562,  129.2247, NULL,  'Gyeongju'),
  ('도쿄',     'Tokyo',      'tokyo',      'JP',  35.6762,  139.6503, 17094, 'Tokyo'),
  ('오사카',   'Osaka',      'osaka',      'JP',  34.6937,  135.5023, 332,   'Osaka'),
  ('방콕',     'Bangkok',    'bangkok',    'TH',  13.7563,  100.5018, 9,     'Bangkok'),
  ('발리',     'Bali',       'bali',       'ID', -8.4095,   115.1889, 1637,  'Bali'),
  ('파리',     'Paris',      'paris',      'FR',  48.8566,   2.3522,  198,   'Paris'),
  ('뉴욕',     'New York',   'new-york',   'US',  40.7128, -74.0060,  29,    'New York'),
  ('런던',     'London',     'london',     'GB',  51.5074,  -0.1278,  163,   'London')
ON CONFLICT (slug) DO NOTHING;
