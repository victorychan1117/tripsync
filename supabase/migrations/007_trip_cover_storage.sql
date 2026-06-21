-- ════════════════════════════════════════════════════════════════════
-- 007_trip_cover_storage.sql
-- trip_rooms.cover_image_url 컬럼은 001_initial_schema.sql 에 이미 존재.
-- 여기서는 Supabase Storage bucket + RLS 정책만 추가.
-- ════════════════════════════════════════════════════════════════════

-- trip-covers bucket (public read, 5MB, image/* only)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'trip-covers',
  'trip-covers',
  TRUE,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public             = EXCLUDED.public,
  file_size_limit    = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- owner 확인 helper (storage RLS용)
CREATE OR REPLACE FUNCTION public.is_trip_owner(p_room_id TEXT)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM   trip_rooms
    WHERE  id       = p_room_id
      AND  owner_id = (SELECT id FROM users WHERE auth_id = auth.uid())
  );
$$;

-- storage.objects 정책 (멱등)
DROP POLICY IF EXISTS "trip_covers_public_read"   ON storage.objects;
DROP POLICY IF EXISTS "trip_covers_owner_insert"  ON storage.objects;
DROP POLICY IF EXISTS "trip_covers_owner_update"  ON storage.objects;
DROP POLICY IF EXISTS "trip_covers_owner_delete"  ON storage.objects;

-- 공개 읽기 (공개/비공개 여행 모두 이미지 URL로 접근 가능)
CREATE POLICY "trip_covers_public_read" ON storage.objects
  FOR SELECT USING (bucket_id = 'trip-covers');

-- owner만 업로드 — 경로: {roomId}/{filename}
CREATE POLICY "trip_covers_owner_insert" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'trip-covers'
    AND auth.uid() IS NOT NULL
    AND public.is_trip_owner((storage.foldername(name))[1])
  );

CREATE POLICY "trip_covers_owner_update" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'trip-covers'
    AND auth.uid() IS NOT NULL
    AND public.is_trip_owner((storage.foldername(name))[1])
  );

CREATE POLICY "trip_covers_owner_delete" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'trip-covers'
    AND auth.uid() IS NOT NULL
    AND public.is_trip_owner((storage.foldername(name))[1])
  );
