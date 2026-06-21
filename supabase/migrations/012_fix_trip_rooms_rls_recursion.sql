-- ════════════════════════════════════════════════════════════════════
-- 012_fix_trip_rooms_rls_recursion.sql
-- trip_rooms ↔ trip_members RLS 상호 참조로 발생하는 infinite recursion 수정
--
-- 원인:
--   trip_rooms_select  → trip_members 서브쿼리
--   trip_members_select → trip_rooms 서브쿼리
--   → PostgreSQL RLS 무한 재귀 (여행 생성 .insert().select() 시 발생)
--
-- 해결:
--   SECURITY DEFINER helper 함수로 RLS 우회 (004 is_room_member 패턴 확장)
-- ════════════════════════════════════════════════════════════════════

-- owner 확인: owner_id 또는 trip_members.role = 'owner' (SECURITY DEFINER → RLS 우회)
CREATE OR REPLACE FUNCTION public.is_trip_owner(p_room_id TEXT)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM   trip_rooms tr
    WHERE  tr.id = p_room_id
      AND  tr.owner_id = (SELECT id FROM users WHERE auth_id = auth.uid())
  )
  OR EXISTS (
    SELECT 1
    FROM   trip_members tm
    WHERE  tm.room_id = p_room_id
      AND  tm.user_id = (SELECT id FROM users WHERE auth_id = auth.uid())
      AND  tm.role = 'owner'
  );
$$;

-- 게스트 세션 멤버 확인 (trip_rooms SELECT용)
CREATE OR REPLACE FUNCTION public.is_room_guest(p_room_id TEXT)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM   trip_members
    WHERE  room_id = p_room_id
      AND  guest_session IS NOT NULL
      AND  guest_session = current_setting('app.guest_session', TRUE)
      AND  current_setting('app.guest_session', TRUE) IS NOT NULL
      AND  current_setting('app.guest_session', TRUE) <> ''
  );
$$;

-- ── trip_rooms SELECT: trip_members 직접 조회 제거 ───────────────────
DROP POLICY IF EXISTS "trip_rooms_select" ON trip_rooms;

CREATE POLICY "trip_rooms_select" ON trip_rooms
  FOR SELECT USING (
    is_public = TRUE
    OR owner_id = (SELECT id FROM users WHERE auth_id = auth.uid())
    OR public.is_room_member(id)
    OR public.is_room_guest(id)
  );

-- ── trip_rooms UPDATE: trip_members 직접 조회 제거 ───────────────────
DROP POLICY IF EXISTS "trip_rooms_update" ON trip_rooms;

CREATE POLICY "trip_rooms_update" ON trip_rooms
  FOR UPDATE
  USING (public.is_trip_owner(id))
  WITH CHECK (public.is_trip_owner(id));

-- 공개 전환 트리거 내부 UPDATE도 RLS에 막히지 않도록 SECURITY DEFINER
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

-- ── trip_members SELECT: trip_rooms 직접 조회 제거 ───────────────────
DROP POLICY IF EXISTS "trip_members_select" ON trip_members;

CREATE POLICY "trip_members_select" ON trip_members
  FOR SELECT USING (
    user_id = (SELECT id FROM users WHERE auth_id = auth.uid())
    OR guest_session = current_setting('app.guest_session', TRUE)
    OR public.is_room_member(trip_members.room_id)
    OR public.is_public_trip(trip_members.room_id)
  );

-- ── trip_members UPDATE/DELETE: trip_rooms 직접 조회 제거 ─────────────
DROP POLICY IF EXISTS "trip_members_update" ON trip_members;

CREATE POLICY "trip_members_update" ON trip_members
  FOR UPDATE USING (
    user_id = (SELECT id FROM users WHERE auth_id = auth.uid())
    OR public.is_trip_owner(trip_members.room_id)
  );

DROP POLICY IF EXISTS "trip_members_delete" ON trip_members;

CREATE POLICY "trip_members_delete" ON trip_members
  FOR DELETE USING (
    (
      user_id = (SELECT id FROM users WHERE auth_id = auth.uid())
      AND role != 'owner'
    )
    OR public.is_trip_owner(trip_members.room_id)
  );
