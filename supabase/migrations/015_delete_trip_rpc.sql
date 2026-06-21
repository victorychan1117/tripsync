-- ════════════════════════════════════════════════════════════════════
-- 015_delete_trip_rpc.sql
-- 여행 삭제 — CASCADE 시 자식 테이블 RLS(댓글/반응/저장 등)에 막히는 문제 해결
-- SECURITY DEFINER로 trip_rooms DELETE → CASCADE 전체 처리
-- ════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.delete_trip_room(p_room_id TEXT)
RETURNS VOID
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
      USING HINT = '여행장만 삭제할 수 있어요.';
  END IF;

  DELETE FROM trip_rooms WHERE id = p_room_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'room_not_found'
      USING HINT = '여행을 찾을 수 없어요.';
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.delete_trip_room(TEXT) TO authenticated;
