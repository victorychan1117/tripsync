-- ════════════════════════════════════════════════════════════════════
-- 013_set_trip_public_rpc.sql
-- 공개/비공개 토글 — RLS 우회 SECURITY DEFINER RPC
-- ════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.set_trip_public(
  p_room_id   TEXT,
  p_is_public BOOLEAN
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not_authenticated'
      USING HINT = '로그인이 필요합니다.';
  END IF;

  IF NOT public.is_trip_owner(p_room_id) THEN
    RAISE EXCEPTION 'not_owner'
      USING HINT = '여행장만 설정을 변경할 수 있어요.';
  END IF;

  UPDATE trip_rooms
  SET is_public = p_is_public
  WHERE id = p_room_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'room_not_found'
      USING HINT = '여행을 찾을 수 없어요.';
  END IF;

  RETURN p_is_public;
END;
$$;

GRANT EXECUTE ON FUNCTION public.set_trip_public(TEXT, BOOLEAN) TO authenticated;

-- trip_rooms DELETE도 is_trip_owner로 통일 (owner_id 불일치 edge case)
DROP POLICY IF EXISTS "trip_rooms_delete" ON trip_rooms;

CREATE POLICY "trip_rooms_delete" ON trip_rooms
  FOR DELETE USING (public.is_trip_owner(id));
