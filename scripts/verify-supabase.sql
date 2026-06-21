-- ════════════════════════════════════════════════════════════════════
-- 출시 전 Supabase 검증 스크립트
-- Supabase Dashboard → SQL Editor 에 붙여넣고 실행
-- ════════════════════════════════════════════════════════════════════

-- 1) 핵심 테이블
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN (
    'users', 'trip_rooms', 'markers', 'room_members',
    'saved_trips', 'saved_trip_folders',
    'trip_comments', 'trip_reactions', 'comment_reports',
    'notifications', 'favorite_folders', 'favorites'
  )
ORDER BY table_name;

-- 2) saved_trips.folder_id 컬럼
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'saved_trips'
  AND column_name IN ('id', 'user_id', 'room_id', 'folder_id');

-- 3) RLS 활성화
SELECT relname AS table_name, relrowsecurity AS rls_enabled
FROM pg_class
WHERE relnamespace = 'public'::regnamespace
  AND relkind = 'r'
  AND relname IN (
    'trip_rooms', 'markers', 'saved_trips', 'saved_trip_folders',
    'trip_comments', 'trip_reactions', 'comment_reports', 'notifications'
  )
ORDER BY relname;

-- 4) 핵심 RPC / 함수
SELECT routine_name
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN (
    'clone_public_trip',
    'mark_all_notifications_read',
    'report_trip_comment',
    'move_saved_trip_to_folder',
    'create_saved_trip_folder',
    'rename_saved_trip_folder',
    'is_trip_owner',
    'is_room_guest',
    'is_public_trip',
    'set_trip_public',
    'delete_trip_room',
    'check_trip_comment_rate_limit'
  )
ORDER BY routine_name;

-- 4b) trip_rooms RLS — 012 적용 확인 (trip_members 직접 참조 없어야 함)
SELECT policyname, cmd, qual
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'trip_rooms'
  AND policyname IN ('trip_rooms_select', 'trip_rooms_update')
ORDER BY policyname;

-- 5) 알림 / 댓글 트리거
SELECT tgname, relname AS table_name
FROM pg_trigger t
JOIN pg_class c ON c.oid = t.tgrelid
WHERE NOT t.tgisinternal
  AND c.relname IN ('trip_comments', 'trip_reactions', 'saved_trips', 'saved_trips')
ORDER BY relname, tgname;

-- 6) Storage bucket
SELECT id, name, public, file_size_limit
FROM storage.buckets
WHERE id = 'trip-covers';

-- 7) Storage RLS 정책
SELECT policyname
FROM pg_policies
WHERE schemaname = 'storage'
  AND tablename = 'objects'
  AND policyname LIKE 'trip_covers%'
ORDER BY policyname;
