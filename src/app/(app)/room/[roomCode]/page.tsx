import { redirect } from 'next/navigation';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import RoomLobby from '@/components/room/RoomLobby';

interface Props {
  params: Promise<{ roomCode: string }>;
}

export default async function RoomEntryPage({ params }: Props) {
  const { roomCode } = await params;

  // 로그인 확인 (미들웨어에서 이미 보호되지만 서버 레벨에서도 재확인)
  const userClient = await createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) redirect(`/login?redirect=/room/${roomCode}`);

  const serviceClient = createServiceClient();

  // 방 조회
  const { data: room } = await serviceClient
    .from('trip_rooms')
    .select('*, trip_members(id, user_id, role)')
    .eq('id', roomCode)
    .maybeSingle();

  if (!room) redirect('/');

  // 유저 DB ID 조회
  const { data: dbUser } = await serviceClient
    .from('users')
    .select('id')
    .eq('auth_id', user.id)
    .maybeSingle();

  // 이미 멤버이면 에디터로 바로 이동
  const isMember = dbUser
    ? room.trip_members?.some((m: any) => m.user_id === dbUser.id)
    : false;

  if (isMember) redirect(`/room/${roomCode}/edit`);

  // 멤버가 아닌 경우 → 참여 로비
  return (
    <RoomLobby
      roomId={roomCode}
      roomTitle={room.title}
      memberCount={room.member_count}
    />
  );
}
