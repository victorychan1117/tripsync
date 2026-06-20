import Navbar from '@/components/landing/Navbar';
import ExploreClient, { type PublicTrip } from '@/components/explore/ExploreClient';
import { createClient } from '@/lib/supabase/server';

export const metadata = { title: '여행 탐색 | TripSync' };

export const revalidate = 60;

export default async function ExplorePage() {
  const supabase = await createClient();

  const [{ data: { user } }, { data: trips }] = await Promise.all([
    supabase.auth.getUser(),
    supabase
      .from('trip_rooms')
      .select('id, title, destination, country_code, is_domestic, start_date, end_date, nights, marker_count, member_count, view_count')
      .eq('is_public', true)
      .order('view_count', { ascending: false })
      .limit(60),
  ]);

  return (
    <main className="min-h-screen bg-slate-50">
      <Navbar />
      <ExploreClient
        trips={(trips ?? []) as PublicTrip[]}
        isLoggedIn={!!user}
      />
    </main>
  );
}
