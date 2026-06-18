-- ════════════════════════════════════════════════════════════════════
-- 002_rls_policies.sql
-- Row Level Security 정책 — 모든 테이블 보안 설정
-- ════════════════════════════════════════════════════════════════════

-- ── RLS 활성화 ────────────────────────────────────────────────────────
ALTER TABLE users           ENABLE ROW LEVEL SECURITY;
ALTER TABLE favorite_folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE favorites        ENABLE ROW LEVEL SECURITY;
ALTER TABLE trip_rooms       ENABLE ROW LEVEL SECURITY;
ALTER TABLE trip_members     ENABLE ROW LEVEL SECURITY;
ALTER TABLE markers          ENABLE ROW LEVEL SECURITY;
ALTER TABLE place_votes      ENABLE ROW LEVEL SECURITY;
ALTER TABLE place_comments   ENABLE ROW LEVEL SECURITY;
ALTER TABLE route_cache      ENABLE ROW LEVEL SECURITY;
ALTER TABLE affiliate_clicks ENABLE ROW LEVEL SECURITY;

-- ════════════════════════════════════════════════════════════════════
-- USERS 정책
-- ════════════════════════════════════════════════════════════════════
-- 본인 프로필만 읽기/수정
CREATE POLICY "users_select_own" ON users
  FOR SELECT USING (auth_id = auth.uid());

CREATE POLICY "users_update_own" ON users
  FOR UPDATE USING (auth_id = auth.uid());

-- 회원가입 시 insert 허용 (auth trigger에서 호출)
CREATE POLICY "users_insert_own" ON users
  FOR INSERT WITH CHECK (auth_id = auth.uid());

-- 닉네임은 공개 (다른 유저 닉네임 조회 허용)
CREATE POLICY "users_select_public_fields" ON users
  FOR SELECT USING (TRUE);

-- ════════════════════════════════════════════════════════════════════
-- FAVORITE_FOLDERS / FAVORITES 정책 (본인만)
-- ════════════════════════════════════════════════════════════════════
CREATE POLICY "fav_folders_own" ON favorite_folders
  FOR ALL USING (
    user_id = (SELECT id FROM users WHERE auth_id = auth.uid())
  );

CREATE POLICY "favorites_own" ON favorites
  FOR ALL USING (
    user_id = (SELECT id FROM users WHERE auth_id = auth.uid())
  );

-- ════════════════════════════════════════════════════════════════════
-- TRIP_ROOMS 정책
-- ════════════════════════════════════════════════════════════════════

-- 공개 방 or 멤버인 방은 읽기 가능
CREATE POLICY "trip_rooms_select" ON trip_rooms
  FOR SELECT USING (
    is_public = TRUE
    OR owner_id = (SELECT id FROM users WHERE auth_id = auth.uid())
    OR EXISTS (
      SELECT 1 FROM trip_members
      WHERE room_id = trip_rooms.id
        AND user_id = (SELECT id FROM users WHERE auth_id = auth.uid())
    )
    -- 게스트 세션 (앱에서 current_setting으로 전달)
    OR EXISTS (
      SELECT 1 FROM trip_members
      WHERE room_id = trip_rooms.id
        AND guest_session = current_setting('app.guest_session', TRUE)
    )
  );

-- 방장 or EDITOR만 수정
CREATE POLICY "trip_rooms_update" ON trip_rooms
  FOR UPDATE USING (
    owner_id = (SELECT id FROM users WHERE auth_id = auth.uid())
    OR EXISTS (
      SELECT 1 FROM trip_members
      WHERE room_id = trip_rooms.id
        AND user_id = (SELECT id FROM users WHERE auth_id = auth.uid())
        AND role = 'owner'
    )
  );

-- 로그인 유저만 방 생성
CREATE POLICY "trip_rooms_insert" ON trip_rooms
  FOR INSERT WITH CHECK (
    owner_id = (SELECT id FROM users WHERE auth_id = auth.uid())
  );

-- 방장만 삭제
CREATE POLICY "trip_rooms_delete" ON trip_rooms
  FOR DELETE USING (
    owner_id = (SELECT id FROM users WHERE auth_id = auth.uid())
  );

-- ════════════════════════════════════════════════════════════════════
-- TRIP_MEMBERS 정책
-- ════════════════════════════════════════════════════════════════════

-- 같은 방 멤버만 멤버 목록 조회
CREATE POLICY "trip_members_select" ON trip_members
  FOR SELECT USING (
    user_id = (SELECT id FROM users WHERE auth_id = auth.uid())
    OR guest_session = current_setting('app.guest_session', TRUE)
    OR EXISTS (
      SELECT 1 FROM trip_rooms tr
      WHERE tr.id = room_id AND (
        tr.owner_id = (SELECT id FROM users WHERE auth_id = auth.uid())
        OR tr.is_public = TRUE
      )
    )
  );

-- 본인 멤버십 추가 (방 참여)
CREATE POLICY "trip_members_insert_self" ON trip_members
  FOR INSERT WITH CHECK (
    user_id = (SELECT id FROM users WHERE auth_id = auth.uid())
    OR guest_session = current_setting('app.guest_session', TRUE)
  );

-- 방장만 권한 변경, 본인은 탈퇴
CREATE POLICY "trip_members_update" ON trip_members
  FOR UPDATE USING (
    user_id = (SELECT id FROM users WHERE auth_id = auth.uid())
    OR EXISTS (
      SELECT 1 FROM trip_rooms
      WHERE id = room_id
        AND owner_id = (SELECT id FROM users WHERE auth_id = auth.uid())
    )
  );

-- ════════════════════════════════════════════════════════════════════
-- MARKERS 정책
-- ════════════════════════════════════════════════════════════════════

-- 공개 방 or 멤버만 마커 조회
CREATE POLICY "markers_select" ON markers
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM trip_rooms tr
      LEFT JOIN trip_members tm ON tm.room_id = tr.id
      WHERE tr.id = markers.room_id
        AND (
          tr.is_public = TRUE
          OR tr.owner_id = (SELECT id FROM users WHERE auth_id = auth.uid())
          OR tm.user_id = (SELECT id FROM users WHERE auth_id = auth.uid())
          OR tm.guest_session = current_setting('app.guest_session', TRUE)
        )
    )
  );

-- EDITOR 이상만 마커 추가/수정/삭제 (잠긴 방 제외)
CREATE POLICY "markers_write" ON markers
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM trip_rooms tr
      JOIN trip_members tm ON tm.room_id = tr.id
      WHERE tr.id = markers.room_id
        AND tr.is_locked = FALSE
        AND tm.role IN ('owner', 'editor')
        AND (
          tm.user_id = (SELECT id FROM users WHERE auth_id = auth.uid())
          OR tm.guest_session = current_setting('app.guest_session', TRUE)
        )
    )
  );

-- ════════════════════════════════════════════════════════════════════
-- ROUTE_CACHE 정책 (모든 인증 유저 읽기, 서버만 쓰기)
-- ════════════════════════════════════════════════════════════════════
CREATE POLICY "route_cache_select" ON route_cache
  FOR SELECT USING (auth.role() IN ('authenticated', 'anon'));

CREATE POLICY "route_cache_insert" ON route_cache
  FOR INSERT WITH CHECK (auth.role() = 'service_role');

-- ════════════════════════════════════════════════════════════════════
-- PLACE_VOTES / PLACE_COMMENTS 정책
-- ════════════════════════════════════════════════════════════════════
CREATE POLICY "votes_select" ON place_votes
  FOR SELECT USING (TRUE);

CREATE POLICY "votes_write_own" ON place_votes
  FOR ALL USING (
    user_id = (SELECT id FROM users WHERE auth_id = auth.uid())
    OR guest_session = current_setting('app.guest_session', TRUE)
  );

CREATE POLICY "comments_select" ON place_comments
  FOR SELECT USING (TRUE);

CREATE POLICY "comments_insert" ON place_comments
  FOR INSERT WITH CHECK (
    user_id = (SELECT id FROM users WHERE auth_id = auth.uid())
    OR TRUE  -- 게스트도 댓글 허용
  );

-- ════════════════════════════════════════════════════════════════════
-- AFFILIATE_CLICKS (서버 사이드 insert만 허용)
-- ════════════════════════════════════════════════════════════════════
CREATE POLICY "affiliate_insert_server" ON affiliate_clicks
  FOR INSERT WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "affiliate_select_owner" ON affiliate_clicks
  FOR SELECT USING (auth.role() = 'service_role');
