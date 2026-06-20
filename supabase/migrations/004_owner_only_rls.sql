-- ════════════════════════════════════════════════════════════════════
-- 004_owner_only_rls.sql
-- Supabase Dashboard › SQL Editor 에 그대로 붙여넣기 가능
-- DROP IF EXISTS 전처리로 멱등 실행 (중복 실행 안전)
--
-- 002_rls_policies.sql 대비 변경사항:
--   1. markers_write 삭제 → owner 전용 3개 정책으로 교체
--   2. trip_members DELETE 정책 신규 추가 (나가기/강퇴)
--   3. trip_members SELECT 교체 — 같은 방 멤버 전체 조회 허용
--      (자기참조 재귀 버그를 SECURITY DEFINER 함수로 방지)
-- ════════════════════════════════════════════════════════════════════


-- ══════════════════════════════════════════════════════════════════
-- STEP 1  재귀 방지 Helper 함수
-- ══════════════════════════════════════════════════════════════════
-- trip_members SELECT 정책이 trip_members를 직접 서브쿼리하면
-- PostgreSQL RLS가 무한 재귀를 일으킴.
-- SECURITY DEFINER 함수는 함수 소유자(postgres) 권한으로 실행되어
-- RLS 를 우회하므로 재귀가 발생하지 않음.
CREATE OR REPLACE FUNCTION public.is_room_member(p_room_id TEXT)
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
      AND  user_id = (SELECT id FROM users WHERE auth_id = auth.uid())
  );
$$;


-- ══════════════════════════════════════════════════════════════════
-- STEP 2  markers 쓰기 정책 교체
-- ══════════════════════════════════════════════════════════════════
-- 기존 markers_write: role IN ('owner', 'editor') → editor도 쓰기 가능
-- 변경: role = 'owner' 만 INSERT / UPDATE / DELETE 허용
--       is_locked = FALSE 조건 유지 (잠긴 방은 owner도 편집 불가)
--
-- 주의: markers_select (002) 는 그대로 유지 — 멤버 전원 조회 가능
-- ──────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "markers_write"        ON markers;
DROP POLICY IF EXISTS "markers_insert_owner" ON markers;
DROP POLICY IF EXISTS "markers_update_owner" ON markers;
DROP POLICY IF EXISTS "markers_delete_owner" ON markers;

-- INSERT: owner만, 잠기지 않은 방에서만
CREATE POLICY "markers_insert_owner" ON markers
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1
      FROM   trip_rooms   tr
      JOIN   trip_members tm ON tm.room_id = tr.id
      WHERE  tr.id        = markers.room_id
        AND  tr.is_locked = FALSE
        AND  tm.role      = 'owner'
        AND  tm.user_id   = (SELECT id FROM users WHERE auth_id = auth.uid())
    )
  );

-- UPDATE: owner만, 잠기지 않은 방에서만
CREATE POLICY "markers_update_owner" ON markers
  FOR UPDATE USING (
    EXISTS (
      SELECT 1
      FROM   trip_rooms   tr
      JOIN   trip_members tm ON tm.room_id = tr.id
      WHERE  tr.id        = markers.room_id
        AND  tr.is_locked = FALSE
        AND  tm.role      = 'owner'
        AND  tm.user_id   = (SELECT id FROM users WHERE auth_id = auth.uid())
    )
  );

-- DELETE: owner만, 잠기지 않은 방에서만
--
-- ⚠️  여행 삭제 시 주의:
--   trip_rooms DELETE → CASCADE가 markers를 자동 삭제하므로
--   잠긴 여행이어도 trip_rooms 삭제만 하면 문제 없음.
--   단, 앱 코드가 markers를 먼저 명시적으로 DELETE하면
--   is_locked = TRUE 일 때 이 정책에 막힘 → CASCADE에 위임 권장.
CREATE POLICY "markers_delete_owner" ON markers
  FOR DELETE USING (
    EXISTS (
      SELECT 1
      FROM   trip_rooms   tr
      JOIN   trip_members tm ON tm.room_id = tr.id
      WHERE  tr.id        = markers.room_id
        AND  tr.is_locked = FALSE
        AND  tm.role      = 'owner'
        AND  tm.user_id   = (SELECT id FROM users WHERE auth_id = auth.uid())
    )
  );


-- ══════════════════════════════════════════════════════════════════
-- STEP 3  trip_members DELETE 정책 추가
-- ══════════════════════════════════════════════════════════════════
-- 002에 DELETE 정책이 없어 나가기/강퇴 불가 상태였음.
--
-- 허용 케이스:
--   A) 본인이 non-owner 멤버 → 자신의 row 삭제 (여행 나가기)
--   B) 방장 → 같은 방의 모든 row 삭제 (강퇴 + 여행 삭제 cascade 보조)
--
-- owner는 A 조건(role != 'owner')을 통과하지 못하므로 자기 탈퇴 불가.
-- 여행 삭제는 trip_rooms DELETE → CASCADE 로 처리됨.
DROP POLICY IF EXISTS "trip_members_delete" ON trip_members;

CREATE POLICY "trip_members_delete" ON trip_members
  FOR DELETE USING (
    -- A) 비-owner 본인 나가기
    (
      user_id = (SELECT id FROM users WHERE auth_id = auth.uid())
      AND role != 'owner'
    )
    -- B) 방장이 해당 방 멤버 삭제 (강퇴 또는 여행 삭제 전 일괄 제거)
    OR EXISTS (
      SELECT 1 FROM trip_rooms
      WHERE id       = trip_members.room_id
        AND owner_id = (SELECT id FROM users WHERE auth_id = auth.uid())
    )
  );


-- ══════════════════════════════════════════════════════════════════
-- STEP 4  trip_members SELECT 정책 교체
-- ══════════════════════════════════════════════════════════════════
-- 002 문제:
--   SELECT USING (본인 row OR 방장 OR 공개방)
--   → 동행(viewer/editor)은 자신의 row만 볼 수 있고
--     같은 방 다른 멤버 목록을 조회할 수 없음.
--
-- 수정:
--   같은 방의 인증 멤버라면 멤버 목록 전체 조회 가능.
--   is_room_member() SECURITY DEFINER 함수로 자기참조 재귀 방지.
DROP POLICY IF EXISTS "trip_members_select" ON trip_members;

CREATE POLICY "trip_members_select" ON trip_members
  FOR SELECT USING (
    -- 본인 row
    user_id = (SELECT id FROM users WHERE auth_id = auth.uid())
    -- 게스트 세션
    OR guest_session = current_setting('app.guest_session', TRUE)
    -- 같은 방의 인증 멤버 전체 허용 (SECURITY DEFINER → 재귀 없음)
    OR public.is_room_member(trip_members.room_id)
    -- 공개 방 멤버 목록 공개
    OR EXISTS (
      SELECT 1 FROM trip_rooms
      WHERE id        = trip_members.room_id
        AND is_public = TRUE
    )
  );
