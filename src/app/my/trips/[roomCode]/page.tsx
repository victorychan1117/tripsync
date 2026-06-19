import { redirect, notFound } from 'next/navigation';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import TripDetailClient from './TripDetailClient';

interface Props {
  params: Promise<{ roomCode: string }>;
}

export default async function TripDetailPage({ params }: Props) {
  const { roomCode } = await params;

  const userClient = await createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) redirect(`/login?redirect=/my/trips/${roomCode}`);

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
    .select('role')
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

  // 장소 목록
  const { data: markers } = await service
    .from('markers')
    .select('id, name, address, category, day_number, lat, lng, stay_minutes, memo')
    .eq('room_id', roomCode)
    .order('day_number')
    .order('order_index');

  return (
    <TripDetailClient
      room={room}
      markers={markers ?? []}
      myRole={member.role}
    />
  );
}
