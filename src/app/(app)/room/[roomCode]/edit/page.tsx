import { notFound, redirect } from 'next/navigation';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import RoomEditor from '@/components/room/RoomEditor';

interface Props {
  params: Promise<{ roomCode: string }>;
}

export default async function RoomEditPage({ params }: Props) {
  const { roomCode } = await params;

  // 로그인 확인
  const userClient = await createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) redirect(`/login?redirect=/room/${roomCode}/edit`);

  const serviceClient = createServiceClient();

  // 방 정보 조회
  const { data: room, error } = await serviceClient
    .from('trip_rooms')
    .select(`
      *,
      trip_members (
        id, user_id, role, cursor_color,
        users ( nickname, avatar_url )
      )
    `)
    .eq('id', roomCode)
    .single();

  if (error || !room) notFound();

  // 유저 DB ID 조회
  const { data: dbUser } = await serviceClient
    .from('users')
    .select('id, nickname, avatar_url')
    .eq('auth_id', user.id)
    .single();

  if (!dbUser) redirect('/login');

  // 멤버 확인 — 멤버가 아니면 로비로
  const currentMember = room.trip_members.find((m: any) => m.user_id === dbUser.id) ?? null;
  if (!currentMember) redirect(`/room/${roomCode}`);

  // 마커 초기 데이터
  const { data: markers } = await serviceClient
    .from('markers')
    .select('*')
    .eq('room_id', roomCode)
    .order('day_number')
    .order('order_index');

  return (
    <RoomEditor
      initialRoom={room}
      initialMarkers={markers ?? []}
      currentMember={currentMember}
    />
  );
}
