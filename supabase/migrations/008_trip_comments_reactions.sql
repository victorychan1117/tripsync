-- ════════════════════════════════════════════════════════════════════
-- 008_trip_comments_reactions.sql
-- 공개 여행 상세 댓글 / 반응
-- ════════════════════════════════════════════════════════════════════

-- 공개 여행 여부 확인 (RLS용)
CREATE OR REPLACE FUNCTION public.is_public_trip(p_room_id TEXT)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM trip_rooms
    WHERE id = p_room_id AND is_public = TRUE
  );
$$;

-- ── trip_comments ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS trip_comments (
  id         BIGSERIAL    PRIMARY KEY,
  room_id    VARCHAR(12)  NOT NULL REFERENCES trip_rooms(id) ON DELETE CASCADE,
  user_id    UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content    TEXT         NOT NULL
               CHECK (char_length(trim(content)) > 0 AND char_length(content) <= 500),
  created_at TIMESTAMPTZ  DEFAULT now(),
  updated_at TIMESTAMPTZ  DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_trip_comments_room
  ON trip_comments(room_id, created_at DESC);

DROP TRIGGER IF EXISTS trip_comments_updated_at ON trip_comments;
CREATE TRIGGER trip_comments_updated_at
  BEFORE UPDATE ON trip_comments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ── trip_reactions ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS trip_reactions (
  id            BIGSERIAL    PRIMARY KEY,
  room_id       VARCHAR(12)  NOT NULL REFERENCES trip_rooms(id) ON DELETE CASCADE,
  user_id       UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reaction_type TEXT         NOT NULL
                  CHECK (reaction_type IN ('like', 'bookmark', 'want_to_go', 'beautiful')),
  created_at    TIMESTAMPTZ  DEFAULT now(),
  CONSTRAINT trip_reactions_unique UNIQUE (room_id, user_id, reaction_type)
);

CREATE INDEX IF NOT EXISTS idx_trip_reactions_room ON trip_reactions(room_id);

-- ── RLS ─────────────────────────────────────────────────────────────
ALTER TABLE trip_comments  ENABLE ROW LEVEL SECURITY;
ALTER TABLE trip_reactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "trip_comments_select_public"  ON trip_comments;
DROP POLICY IF EXISTS "trip_comments_insert"         ON trip_comments;
DROP POLICY IF EXISTS "trip_comments_update_own"     ON trip_comments;
DROP POLICY IF EXISTS "trip_comments_delete_own"     ON trip_comments;
DROP POLICY IF EXISTS "trip_reactions_select_public" ON trip_reactions;
DROP POLICY IF EXISTS "trip_reactions_insert"        ON trip_reactions;
DROP POLICY IF EXISTS "trip_reactions_delete_own"    ON trip_reactions;

-- 댓글: 공개 여행만 조회
CREATE POLICY "trip_comments_select_public" ON trip_comments
  FOR SELECT USING (public.is_public_trip(room_id));

-- 댓글: 로그인 + 공개 여행만 작성
CREATE POLICY "trip_comments_insert" ON trip_comments
  FOR INSERT WITH CHECK (
    user_id = (SELECT id FROM users WHERE auth_id = auth.uid())
    AND public.is_public_trip(room_id)
  );

-- 댓글: 본인만 수정
CREATE POLICY "trip_comments_update_own" ON trip_comments
  FOR UPDATE USING (
    user_id = (SELECT id FROM users WHERE auth_id = auth.uid())
    AND public.is_public_trip(room_id)
  );

-- 댓글: 본인만 삭제
CREATE POLICY "trip_comments_delete_own" ON trip_comments
  FOR DELETE USING (
    user_id = (SELECT id FROM users WHERE auth_id = auth.uid())
  );

-- 반응: 공개 여행 count 조회
CREATE POLICY "trip_reactions_select_public" ON trip_reactions
  FOR SELECT USING (public.is_public_trip(room_id));

-- 반응: 로그인 + 공개 여행만 추가
CREATE POLICY "trip_reactions_insert" ON trip_reactions
  FOR INSERT WITH CHECK (
    user_id = (SELECT id FROM users WHERE auth_id = auth.uid())
    AND public.is_public_trip(room_id)
  );

-- 반응: 본인만 삭제 (토글 취소)
CREATE POLICY "trip_reactions_delete_own" ON trip_reactions
  FOR DELETE USING (
    user_id = (SELECT id FROM users WHERE auth_id = auth.uid())
  );
