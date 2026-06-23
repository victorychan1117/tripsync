import { redirect, notFound } from 'next/navigation';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { normalizeEmbed } from '@/lib/supabase/normalize';
import TripDetailClient from './TripDetailClient';

export const metadata = {
  title:  '여행 관리',
  robots: { index: false, follow: false },
};

interface Props {
  params: Promise<{ roomCode: string }>;
}

export default async function TripDetailPage({ params }: Props) {
  const { roomCode } = await params;

  const userClient = await createClient();
  const { data: { session } } = await userClient.auth.getSession();
  if (!session?.user) redirect(`/login?redirect=/my/trips/${roomCode}`);
  const user = session.user;

  const service = createServiceClient();

  const { data: dbUser } = await service
    .from('users')
    .select('id')
    .eq('auth_id', user.id)
    .single();

  if (!dbUser) redirect('/login');

  // 멤버 확인
  const { data: member } = await service
    .from('trip_members')
    .select('id, role')
    .eq('room_id', roomCode)
    .eq('user_id', dbUser.id)
    .single();

  if (!member) redirect('/my/trips');

  // 여행 상세
  const { data: room, error } = await service
    .from('trip_rooms')
    .select(`
      *,
      trip_members (
        id, role, joined_at,
        users ( nickname, avatar_url )
      )
    `)
    .eq('id', roomCode)
    .single();

  if (error || !room) notFound();

  const normalizedRoom = {
    ...room,
    trip_members: (room.trip_members ?? []).map((m: { users?: unknown; [k: string]: unknown }) => ({
      ...m,
      users: normalizeEmbed(m.users as { nickname: string; avatar_url: string | null } | null),
    })),
  };

  // 장소 목록
  const { data: markers } = await service
    .from('markers')
    .select('id, name, address, category, day_number, lat, lng, stay_minutes, memo')
    .eq('room_id', roomCode)
    .order('day_number')
    .order('order_index');

  return (
    <TripDetailClient
      room={normalizedRoom}
      markers={markers ?? []}
      myRole={member.role}
      myMemberId={member.id}
    />
  );
}
