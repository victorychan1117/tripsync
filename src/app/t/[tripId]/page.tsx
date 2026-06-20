import { notFound } from 'next/navigation';
import Link from 'next/link';
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

  const [{ data: trip }, { data: markers }] = await Promise.all([
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

  // 조회수 증가 (fire-and-forget)
  supabase
    .from('trip_rooms')
    .update({ view_count: (trip.view_count ?? 0) + 1 })
    .eq('id', tripId)
    .then(() => {});

  return (
    <main className="min-h-screen bg-[#F6F4FF]">
      <Navbar />
      <TripPublicView trip={trip} markers={markers ?? []} />
    </main>
  );
}
