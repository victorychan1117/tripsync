import { Suspense } from 'react';
import Navbar from '@/components/landing/Navbar';
import ExploreClient, { type PublicTrip } from '@/components/explore/ExploreClient';
import JsonLd from '@/components/seo/JsonLd';
import { generateExploreJsonLd } from '@/lib/seo/jsonLd';
import { createClient } from '@/lib/supabase/server';
import { APP_NAME } from '@/lib/config/site';
import { normalizeEmbed } from '@/lib/supabase/normalize';

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '공개 여행 둘러보기',
  description: '다른 여행자들이 공개한 여행 일정과 코스를 둘러보고, 마음에 드는 여행을 내 일정으로 담아보세요.',
  alternates: { canonical: '/explore' },
  openGraph: {
    title:       `공개 여행 둘러보기 | ${APP_NAME}`,
    description: '다른 여행자들이 공개한 여행 일정과 코스를 둘러보고, 마음에 드는 여행을 내 일정으로 담아보세요.',
    url:         '/explore',
    type:        'website',
    images:      [{ url: '/landing/hero.png', width: 1672, height: 941, alt: '공개 여행 둘러보기' }],
  },
  twitter: {
    card:        'summary_large_image',
    title:       `공개 여행 둘러보기 | ${APP_NAME}`,
    description: '다른 여행자들이 공개한 여행 일정과 코스를 둘러보고, 마음에 드는 여행을 내 일정으로 담아보세요.',
    images:      ['/landing/hero.png'],
  },
};
export const revalidate = 60;

export default async function ExplorePage() {
  const supabase = await createClient();

  const [{ data: { user } }, { data: trips }] = await Promise.all([
    supabase.auth.getUser(),
    supabase
      .from('trip_rooms')
      .select(`
        id, title, destination, country_code, is_domestic,
        start_date, end_date, nights, marker_count, member_count,
        view_count, fork_count, cover_image_url, created_at,
        owner:users!owner_id(id, nickname, avatar_url)
      `)
      .eq('is_public', true)
      .order('created_at', { ascending: false })
      .limit(120),
  ]);

  let userId: string | null = null;
  let initialSavedIds: string[] = [];

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
        .select('room_id')
        .eq('user_id', dbUser.id);
      initialSavedIds = saved?.map(s => s.room_id) ?? [];
    }
  }

  const publicTrips = (trips ?? []).map(t => ({
    ...t,
    owner: normalizeEmbed((t as { owner?: unknown }).owner),
  })) as unknown as PublicTrip[];
  const jsonLd = generateExploreJsonLd({
    trips: publicTrips.map(t => ({
      id:              t.id,
      title:           t.title,
      destination:     t.destination,
      cover_image_url: t.cover_image_url,
    })),
    totalCount: publicTrips.length,
  });

  return (
    <main className="min-h-screen bg-slate-50">
      <JsonLd data={jsonLd} />
      <Navbar />
      {/* useSearchParams 사용 → Suspense 필요 */}
      <Suspense fallback={<ExploreLoading />}>
        <ExploreClient
          trips={publicTrips}
          isLoggedIn={!!user}
          userId={userId}
          initialSavedIds={initialSavedIds}
        />
      </Suspense>
    </main>
  );
}

function ExploreLoading() {
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-white border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="h-8 w-28 bg-slate-200 rounded-xl animate-pulse mb-2" />
          <div className="h-4 w-52 bg-slate-100 rounded-lg animate-pulse" />
        </div>
      </div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="rounded-[20px] overflow-hidden bg-white border border-slate-100 animate-pulse">
              <div className="h-[160px] bg-slate-200" />
              <div className="p-4 space-y-2.5">
                <div className="h-3 w-20 bg-slate-100 rounded" />
                <div className="h-4 w-full bg-slate-200 rounded" />
                <div className="h-4 w-3/4 bg-slate-100 rounded" />
                <div className="h-3 w-24 bg-slate-100 rounded mt-4" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
