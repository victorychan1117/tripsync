-- ════════════════════════════════════════════════════════════════════
-- 004_owner_only_rls.sql
-- 권한 개선: markers 쓰기를 owner 전용으로 변경 +
--            trip_members DELETE 정책 추가 (나가기/강퇴)
-- ════════════════════════════════════════════════════════════════════

-- ── 1. markers 쓰기 정책 교체 ────────────────────────────────────────
--
-- 기존: markers_write → role IN ('owner', 'editor') 모두 허용
-- 변경: owner만 INSERT / UPDATE / DELETE 가능
--       is_locked = FALSE 조건은 유지 (잠긴 방은 owner도 편집 불가)
-- ─────────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "markers_write" ON markers;

-- 공통 owner 체크 subquery (세 정책에서 동일하게 사용)
-- : 현재 유저가 해당 방의 role='owner' 멤버이고, 방이 잠겨 있지 않아야 함

CREATE POLICY "markers_insert_owner" ON markers
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1
      FROM   trip_rooms   tr
      JOIN   trip_members tm ON tm.room_id = tr.id
      WHERE  tr.id          = markers.room_id
        AND  tr.is_locked   = FALSE
        AND  tm.role        = 'owner'
        AND  tm.user_id     = (SELECT id FROM users WHERE auth_id = auth.uid())
    )
  );

CREATE POLICY "markers_update_owner" ON markers
  FOR UPDATE USING (
    EXISTS (
      SELECT 1
      FROM   trip_rooms   tr
      JOIN   trip_members tm ON tm.room_id = tr.id
      WHERE  tr.id          = markers.room_id
        AND  tr.is_locked   = FALSE
        AND  tm.role        = 'owner'
        AND  tm.user_id     = (SELECT id FROM users WHERE auth_id = auth.uid())
    )
  );

CREATE POLICY "markers_delete_owner" ON markers
  FOR DELETE USING (
    EXISTS (
      SELECT 1
      FROM   trip_rooms   tr
      JOIN   trip_members tm ON tm.room_id = tr.id
      WHERE  tr.id          = markers.room_id
        AND  tr.is_locked   = FALSE
        AND  tm.role        = 'owner'
        AND  tm.user_id     = (SELECT id FROM users WHERE auth_id = auth.uid())
    )
  );


-- ── 2. trip_members DELETE 정책 추가 ─────────────────────────────────
--
-- 기존 파일에 DELETE 정책이 누락되어 있어 나가기/강퇴 불가.
--
-- 허용 케이스:
--   A) 본인이 non-owner 멤버인 경우 → 본인 row 삭제 (여행 나가기)
--   B) 방장인 경우              → 같은 방의 모든 row 삭제 가능 (강퇴 + 방 삭제 연쇄)
--
-- 주의: 방장(role='owner')은 A 조건을 충족하지 않으므로,
--       본인 탈퇴는 B 경로(방장 권한)로만 가능.
--       → 방을 삭제할 때 CASCADE가 처리하거나, 코드에서 room 삭제 전에
--         members를 일괄 삭제할 때 B 조건으로 허용됨.
-- ─────────────────────────────────────────────────────────────────────

CREATE POLICY "trip_members_delete" ON trip_members
  FOR DELETE USING (
    -- A) 본인 탈퇴 (방장은 자신을 직접 탈퇴할 수 없음 — 방 삭제로만 해결)
    (
      user_id = (SELECT id FROM users WHERE auth_id = auth.uid())
      AND role != 'owner'
    )
    -- B) 방장이 해당 방의 멤버를 삭제 (강퇴 또는 방 삭제 전 일괄 제거)
    OR EXISTS (
      SELECT 1
      FROM   trip_rooms
      WHERE  id       = trip_members.room_id
        AND  owner_id = (SELECT id FROM users WHERE auth_id = auth.uid())
    )
  );


-- ── 3. (선택) trip_members SELECT 정책 보완 ──────────────────────────
--
-- 기존 정책은 "본인 row 또는 방장" 만 조회 가능.
-- 같은 방 멤버라면 멤버 목록을 볼 수 있어야 하므로 추가.
-- 기존 "trip_members_select" 를 교체.
-- ─────────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "trip_members_select" ON trip_members;

CREATE POLICY "trip_members_select" ON trip_members
  FOR SELECT USING (
    -- 본인 row
    user_id = (SELECT id FROM users WHERE auth_id = auth.uid())
    -- 게스트 세션
    OR guest_session = current_setting('app.guest_session', TRUE)
    -- 같은 방의 다른 멤버 (방장 포함)
    OR EXISTS (
      SELECT 1
      FROM   trip_members self_tm
      WHERE  self_tm.room_id = trip_members.room_id
        AND  self_tm.user_id = (SELECT id FROM users WHERE auth_id = auth.uid())
    )
    -- 공개 방
    OR EXISTS (
      SELECT 1
      FROM   trip_rooms tr
      WHERE  tr.id        = trip_members.room_id
        AND  tr.is_public = TRUE
    )
  );
