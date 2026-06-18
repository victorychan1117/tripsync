import { notFound } from 'next/navigation';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import RoomEditor from '@/components/room/RoomEditor';

interface Props {
  params: Promise<{ roomCode: string }>;
}

export default async function RoomEditPage({ params }: Props) {
  const { roomCode } = await params;
  const serviceClient = createServiceClient();

  // 방 정보 조회 — 서비스 클라이언트로 RLS 우회 (링크 공유 게스트 접근 허용)
  const { data: room, error } = await serviceClient
    .from('trip_rooms')
    .select(`
      *,
      trip_members (
        id, user_id, guest_nickname, role, cursor_color,
        users ( nickname, avatar_url )
      )
    `)
    .eq('id', roomCode)
    .single();

  if (error || !room) notFound();

  // 마커 초기 데이터
  const { data: markers } = await serviceClient
    .from('markers')
    .select('*')
    .eq('room_id', roomCode)
    .order('day_number')
    .order('order_index');

  // 현재 유저 (로그인 안 해도 게스트로 접근 가능)
  const userClient = await createClient();
  const { data: { user } } = await userClient.auth.getUser();
  let currentMember = null;
  if (user) {
    const { data: dbUser } = await serviceClient
      .from('users').select('id, nickname, avatar_url').eq('auth_id', user.id).single();
    if (dbUser) {
      currentMember = room.trip_members.find(
        (m: any) => m.user_id === dbUser.id
      );
    }
  }

  return (
    <RoomEditor
      initialRoom={room}
      initialMarkers={markers ?? []}
      currentMember={currentMember}
    />
  );
}
