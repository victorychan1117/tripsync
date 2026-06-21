-- ════════════════════════════════════════════════════════════════════
-- 011_saved_trip_folders.sql
-- 저장한 여행 폴더 정리
-- favorite_folders는 장소(favorites)용 — 여행 저장은 별도 테이블 사용
-- ════════════════════════════════════════════════════════════════════

-- ── saved_trip_folders ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS saved_trip_folders (
  id         BIGSERIAL    PRIMARY KEY,
  user_id    UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name       TEXT         NOT NULL
               CHECK (char_length(trim(name)) > 0 AND char_length(name) <= 20),
  emoji      TEXT         NOT NULL DEFAULT '📁'
               CHECK (char_length(emoji) <= 8),
  sort_order INTEGER      NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ  NOT NULL DEFAULT now(),
  CONSTRAINT saved_trip_folders_unique_name UNIQUE (user_id, name)
);

CREATE INDEX IF NOT EXISTS idx_saved_trip_folders_user
  ON saved_trip_folders(user_id, sort_order, created_at);

DROP TRIGGER IF EXISTS saved_trip_folders_updated_at ON saved_trip_folders;
CREATE TRIGGER saved_trip_folders_updated_at
  BEFORE UPDATE ON saved_trip_folders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ── saved_trips.folder_id ───────────────────────────────────────────
ALTER TABLE saved_trips
  ADD COLUMN IF NOT EXISTS folder_id BIGINT
    REFERENCES saved_trip_folders(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_saved_trips_folder
  ON saved_trips(user_id, folder_id);

-- ── RLS: saved_trip_folders ─────────────────────────────────────────
ALTER TABLE saved_trip_folders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "saved_trip_folders_select_own" ON saved_trip_folders;
DROP POLICY IF EXISTS "saved_trip_folders_insert_own" ON saved_trip_folders;
DROP POLICY IF EXISTS "saved_trip_folders_update_own" ON saved_trip_folders;
DROP POLICY IF EXISTS "saved_trip_folders_delete_own" ON saved_trip_folders;

CREATE POLICY "saved_trip_folders_select_own" ON saved_trip_folders
  FOR SELECT USING (
    user_id = (SELECT id FROM users WHERE auth_id = auth.uid())
  );

CREATE POLICY "saved_trip_folders_insert_own" ON saved_trip_folders
  FOR INSERT WITH CHECK (
    user_id = (SELECT id FROM users WHERE auth_id = auth.uid())
  );

CREATE POLICY "saved_trip_folders_update_own" ON saved_trip_folders
  FOR UPDATE USING (
    user_id = (SELECT id FROM users WHERE auth_id = auth.uid())
  )
  WITH CHECK (
    user_id = (SELECT id FROM users WHERE auth_id = auth.uid())
  );

CREATE POLICY "saved_trip_folders_delete_own" ON saved_trip_folders
  FOR DELETE USING (
    user_id = (SELECT id FROM users WHERE auth_id = auth.uid())
  );

-- ── saved_trips RLS: folder_id 검증 ───────────────────────────────────
CREATE OR REPLACE FUNCTION public.is_own_saved_trip_folder(
  p_folder_id BIGINT,
  p_user_id   UUID
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p_folder_id IS NULL OR EXISTS (
    SELECT 1 FROM saved_trip_folders
    WHERE id = p_folder_id AND user_id = p_user_id
  );
$$;

DROP POLICY IF EXISTS "saved_trips_own" ON saved_trips;

CREATE POLICY "saved_trips_select_own" ON saved_trips
  FOR SELECT USING (
    user_id = (SELECT id FROM users WHERE auth_id = auth.uid())
  );

CREATE POLICY "saved_trips_insert_own" ON saved_trips
  FOR INSERT WITH CHECK (
    user_id = (SELECT id FROM users WHERE auth_id = auth.uid())
    AND public.is_own_saved_trip_folder(
      folder_id,
      (SELECT id FROM users WHERE auth_id = auth.uid())
    )
  );

CREATE POLICY "saved_trips_update_own" ON saved_trips
  FOR UPDATE USING (
    user_id = (SELECT id FROM users WHERE auth_id = auth.uid())
  )
  WITH CHECK (
    user_id = (SELECT id FROM users WHERE auth_id = auth.uid())
    AND public.is_own_saved_trip_folder(
      folder_id,
      (SELECT id FROM users WHERE auth_id = auth.uid())
    )
  );

CREATE POLICY "saved_trips_delete_own" ON saved_trips
  FOR DELETE USING (
    user_id = (SELECT id FROM users WHERE auth_id = auth.uid())
  );

-- ── RPC: 폴더 생성 ───────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.create_saved_trip_folder(
  p_name  TEXT,
  p_emoji TEXT DEFAULT '📁'
)
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_id      BIGINT;
BEGIN
  SELECT id INTO v_user_id FROM users WHERE auth_id = auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'not_authenticated' USING HINT = '로그인이 필요합니다.';
  END IF;

  IF trim(p_name) = '' OR char_length(trim(p_name)) > 20 THEN
    RAISE EXCEPTION 'invalid_name' USING HINT = '폴더 이름은 1~20자로 입력해주세요.';
  END IF;

  INSERT INTO saved_trip_folders (user_id, name, emoji)
  VALUES (v_user_id, trim(p_name), coalesce(nullif(trim(p_emoji), ''), '📁'))
  RETURNING id INTO v_id;

  RETURN v_id;

EXCEPTION
  WHEN unique_violation THEN
    RAISE EXCEPTION 'duplicate_name' USING HINT = '같은 이름의 폴더가 이미 있어요.';
END;
$$;

-- ── RPC: 폴더 수정 ───────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.rename_saved_trip_folder(
  p_folder_id BIGINT,
  p_name      TEXT,
  p_emoji     TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
BEGIN
  SELECT id INTO v_user_id FROM users WHERE auth_id = auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'not_authenticated' USING HINT = '로그인이 필요합니다.';
  END IF;

  IF trim(p_name) = '' OR char_length(trim(p_name)) > 20 THEN
    RAISE EXCEPTION 'invalid_name' USING HINT = '폴더 이름은 1~20자로 입력해주세요.';
  END IF;

  UPDATE saved_trip_folders
  SET
    name  = trim(p_name),
    emoji = coalesce(nullif(trim(p_emoji), ''), emoji)
  WHERE id = p_folder_id AND user_id = v_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'not_found' USING HINT = '폴더를 찾을 수 없어요.';
  END IF;

EXCEPTION
  WHEN unique_violation THEN
    RAISE EXCEPTION 'duplicate_name' USING HINT = '같은 이름의 폴더가 이미 있어요.';
END;
$$;

-- ── RPC: 저장 여행 폴더 이동 ─────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.move_saved_trip_to_folder(
  p_saved_trip_id BIGINT,
  p_folder_id     BIGINT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
BEGIN
  SELECT id INTO v_user_id FROM users WHERE auth_id = auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'not_authenticated' USING HINT = '로그인이 필요합니다.';
  END IF;

  IF p_folder_id IS NOT NULL AND NOT public.is_own_saved_trip_folder(p_folder_id, v_user_id) THEN
    RAISE EXCEPTION 'invalid_folder' USING HINT = '올바르지 않은 폴더예요.';
  END IF;

  UPDATE saved_trips
  SET folder_id = p_folder_id
  WHERE id = p_saved_trip_id AND user_id = v_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'not_found' USING HINT = '저장한 여행을 찾을 수 없어요.';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION create_saved_trip_folder(TEXT, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION rename_saved_trip_folder(BIGINT, TEXT, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION move_saved_trip_to_folder(BIGINT, BIGINT) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION create_saved_trip_folder(TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION rename_saved_trip_folder(BIGINT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION move_saved_trip_to_folder(BIGINT, BIGINT) TO authenticated;
