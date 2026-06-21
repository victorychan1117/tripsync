-- ════════════════════════════════════════════════════════════════════
-- 006_clone_trip_rpc.sql
-- 공개 여행 복사 RPC — 트랜잭션 단일 함수로 처리
-- Supabase Dashboard SQL Editor 에 붙여넣기
-- ════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION clone_public_trip(p_source_room_id TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id     UUID;
  v_new_room_id TEXT;
  v_source      trip_rooms%ROWTYPE;
BEGIN
  -- 1. 현재 로그인 사용자 확인
  SELECT id INTO v_user_id
  FROM users
  WHERE auth_id = auth.uid();

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'not_authenticated'
      USING HINT = '로그인이 필요합니다.';
  END IF;

  -- 2. 원본 여행 조회 — is_public = TRUE 인 경우만 허용
  SELECT * INTO v_source
  FROM trip_rooms
  WHERE id = p_source_room_id
    AND is_public = TRUE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'not_public'
      USING HINT = '공개된 여행만 담을 수 있어요.';
  END IF;

  -- 3. 새 room_id 생성 (충돌 없을 때까지 재시도 — generate_room_code 내부 루프)
  v_new_room_id := generate_room_code();

  -- 4. 새 trip_rooms 생성 (비공개, 잠금 해제)
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

  -- 5. 현재 사용자를 owner로 추가
  --    → sync_room_member_count 트리거가 member_count 자동 갱신
  INSERT INTO trip_members (room_id, user_id, role)
  VALUES (v_new_room_id, v_user_id, 'owner');

  -- 6. 마커 bulk 복사
  --    → sync_room_marker_count 트리거가 marker_count 자동 갱신
  --    vote_up/vote_down은 DEFAULT 0, added_by_guest는 NULL
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

  -- 7. 원본 여행 fork_count 증가
  UPDATE trip_rooms
  SET fork_count = COALESCE(fork_count, 0) + 1
  WHERE id = p_source_room_id;

  RETURN v_new_room_id;
END;
$$;

-- RPC 권한: 로그인 사용자만 호출 가능
REVOKE ALL ON FUNCTION clone_public_trip(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION clone_public_trip(TEXT) TO authenticated;
