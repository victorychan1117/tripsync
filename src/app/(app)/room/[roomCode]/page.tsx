import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import RoomLobby from '@/components/room/RoomLobby';

interface Props {
  params: Promise<{ roomCode: string }>;
}

// 방 코드 입력 → 실제 room UUID 조회 후 에디터로 이동
export default async function RoomEntryPage({ params }: Props) {
  const { roomCode } = await params;
  const supabase     = await createClient();

  // URL rewrite /r/:code → /room/:code 처리
  // roomCode는 UUID 또는 초대코드(TRP-XXXX) 형태 모두 허용
  let roomId = roomCode;

  if (roomCode.length < 36) {
    // 초대코드로 방 조회
    const { data: room } = await supabase
      .from('trip_rooms')
      .select('id')
      .eq('id', roomCode)
      .maybeSingle();
    if (room) roomId = room.id;
  }

  // 방 정보 + 멤버 조회
  const { data: room } = await supabase
    .from('trip_rooms')
    .select('*, trip_members(id, user_id, role, guest_nickname)')
    .eq('id', roomId)
    .maybeSingle();

  if (!room) {
    // 방이 없으면 홈으로
    redirect('/');
  }

  const { data: { user } } = await supabase.auth.getUser();

  // 이미 멤버인지 확인
  const isMember = user
    ? room.trip_members?.some((m: any) => m.user_id)
    : false;

  if (isMember) {
    // 이미 멤버 → 바로 에디터로
    redirect(`/room/${roomId}/edit`);
  }

  // 신규 방문자 → 로비 (닉네임 입력 or 로그인 유도)
  return (
    <RoomLobby
      roomId={roomId}
      roomTitle={room.title}
      memberCount={room.member_count}
      isAuthenticated={!!user}
    />
  );
}
