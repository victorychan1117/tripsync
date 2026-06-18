import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import RoomEditor from '@/components/room/RoomEditor';

interface Props {
  params: Promise<{ roomCode: string }>;
}

export default async function RoomEditPage({ params }: Props) {
  const { roomCode } = await params;
  const supabase     = await createClient();

  // 방 정보 조회 (SSR — 초기 상태)
  const { data: room, error } = await supabase
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
  const { data: markers } = await supabase
    .from('markers')
    .select('*')
    .eq('room_id', roomCode)
    .order('day_number')
    .order('order_index');

  // 현재 유저
  const { data: { user } } = await supabase.auth.getUser();
  let currentMember = null;
  if (user) {
    const { data: dbUser } = await supabase
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
