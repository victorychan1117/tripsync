import { redirect } from 'next/navigation';
import Navbar from '@/components/landing/Navbar';
import SavedTripsClient, { type SavedTrip } from '@/components/my/SavedTripsClient';
import { createClient } from '@/lib/supabase/server';

export const metadata = { title: '저장한 여행 | TripSync' };

export default async function SavedTripsPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: dbUser } = await supabase
    .from('users')
    .select('id')
    .eq('auth_id', user.id)
    .single();

  if (!dbUser) redirect('/login');

  const { data: saved } = await supabase
    .from('saved_trips')
    .select(`
      id,
      room_id,
      created_at,
      trip_rooms (
        id, title, destination, country_code,
        nights, marker_count, view_count,
        owner:users!owner_id(nickname, avatar_url)
      )
    `)
    .eq('user_id', dbUser.id)
    .order('created_at', { ascending: false });

  const trips: SavedTrip[] = (saved ?? [])
    .flatMap(s => {
      const t = s.trip_rooms;
      if (!t || Array.isArray(t)) return [];
      return [t as unknown as SavedTrip];
    });

  return (
    <main className="min-h-screen bg-slate-50">
      <Navbar />
      <SavedTripsClient trips={trips} userId={dbUser.id} />
    </main>
  );
}
