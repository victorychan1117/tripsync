import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import Navbar from '@/components/landing/Navbar';
import TripPublicView from '@/components/explore/TripPublicView';

interface Props {
  params: Promise<{ tripId: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { tripId } = await params;
  const supabase = await createClient();
  const { data } = await supabase
    .from('trip_rooms')
    .select('title, destination')
    .eq('id', tripId)
    .eq('is_public', true)
    .single();

  if (!data) return { title: '여행 일정 | TripSync' };
  return {
    title: `${data.title} | TripSync`,
    description: `${data.destination ?? ''}의 여행 일정을 TripSync에서 확인해보세요.`,
  };
}

export default async function TripPublicPage({ params }: Props) {
  const { tripId } = await params;
  const supabase = await createClient();

  const [{ data: { user } }, { data: trip }, { data: markers }] = await Promise.all([
    supabase.auth.getUser(),
    supabase
      .from('trip_rooms')
      .select('id, title, destination, country_code, is_domestic, start_date, end_date, nights, marker_count, member_count, view_count')
      .eq('id', tripId)
      .eq('is_public', true)
      .single(),
    supabase
      .from('markers')
      .select('id, name, address, category, day_number, stay_minutes, memo')
      .eq('room_id', tripId)
      .order('day_number')
      .order('order_index'),
  ]);

  if (!trip) notFound();

  // 로그인 사용자의 저장 여부 확인
  let userId: string | null = null;
  let initialSaved = false;

  if (user) {
    const { data: dbUser } = await supabase
      .from('users')
      .select('id')
      .eq('auth_id', user.id)
      .single();

    if (dbUser) {
      userId = dbUser.id;
      const { data: saved } = await supabase
        .from('saved_trips')
        .select('id')
        .eq('user_id', dbUser.id)
        .eq('room_id', tripId)
        .maybeSingle();
      initialSaved = !!saved;
    }
  }

  // 조회수 증가 (fire-and-forget)
  supabase
    .from('trip_rooms')
    .update({ view_count: (trip.view_count ?? 0) + 1 })
    .eq('id', tripId)
    .then(() => {});

  return (
    <main className="min-h-screen bg-[#F6F4FF]">
      <Navbar />
      <TripPublicView
        trip={trip}
        markers={markers ?? []}
        userId={userId}
        initialSaved={initialSaved}
      />
    </main>
  );
}
