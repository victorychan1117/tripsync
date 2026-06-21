import { redirect } from 'next/navigation';
import Navbar from '@/components/landing/Navbar';
import SavedTripsClient, { type SavedTrip } from '@/components/my/SavedTripsClient';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { normalizeEmbed } from '@/lib/supabase/normalize';
import type { SavedTripFolder } from '@/lib/saved/folders';

export const metadata = {
  title:  '저장한 여행',
  robots: { index: false, follow: false },
};

export default async function SavedTripsPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login?redirect=/my/saved');

  const { data: dbUser } = await supabase
    .from('users')
    .select('id')
    .eq('auth_id', user.id)
    .single();

  if (!dbUser) redirect('/login');

  const service = createServiceClient();

  const [{ data: saved }, { data: folderRows }] = await Promise.all([
    service
      .from('saved_trips')
      .select(`
        id,
        room_id,
        folder_id,
        created_at,
        trip_rooms (
          id, title, destination, country_code,
          nights, marker_count, view_count, cover_image_url,
          owner:users!owner_id(nickname, avatar_url)
        )
      `)
      .eq('user_id', dbUser.id)
      .order('created_at', { ascending: false }),
    service
      .from('saved_trip_folders')
      .select('id, name, emoji, sort_order')
      .eq('user_id', dbUser.id)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true }),
  ]);

  const folders: SavedTripFolder[] = (folderRows ?? []).map((f: { id: number; name: string; emoji: string | null; sort_order: number | null }) => ({
    id:         f.id,
    name:       f.name,
    emoji:      f.emoji ?? '📁',
    sort_order: f.sort_order ?? 0,
  }));

  const trips: SavedTrip[] = (saved ?? []).flatMap((s: { id: number; folder_id: number | null; trip_rooms: unknown }) => {
    const t = normalizeEmbed(s.trip_rooms as Record<string, unknown> | Record<string, unknown>[] | null);
    if (!t) return [];
    const owner = normalizeEmbed(t.owner as SavedTrip['owner'] | SavedTrip['owner'][] | null);
    return [{
      savedTripId:     s.id as number,
      folderId:        (s.folder_id as number | null) ?? null,
      id:              t.id as string,
      title:           t.title as string,
      destination:     (t.destination as string | null) ?? null,
      country_code:    (t.country_code as string) ?? 'KR',
      nights:          (t.nights as number) ?? 0,
      marker_count:    (t.marker_count as number) ?? 0,
      view_count:      (t.view_count as number) ?? 0,
      cover_image_url: (t.cover_image_url as string | null) ?? null,
      owner,
    }];
  });

  return (
    <main className="min-h-screen bg-slate-50">
      <Navbar />
      <SavedTripsClient trips={trips} folders={folders} userId={dbUser.id} />
    </main>
  );
}
