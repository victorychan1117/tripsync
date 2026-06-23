import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { APP_NAME } from '@/lib/config/site';
import { normalizeEmbed } from '@/lib/supabase/normalize';
import { resolveOgImageUrl } from '@/lib/trip/coverImage';
import { generatePublicTripJsonLd } from '@/lib/seo/jsonLd';
import { aggregateReactions, type ReactionType } from '@/lib/trip/reactions';
import type { TripCommentItem } from '@/components/trip/TripComments';
import Navbar from '@/components/landing/Navbar';
import JsonLd from '@/components/seo/JsonLd';
import TripPublicView from '@/components/explore/TripPublicView';

interface Props {
  params: Promise<{ tripId: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { tripId } = await params;
  const supabase = await createClient();
  const { data } = await supabase
    .from('trip_rooms')
    .select('title, destination, nights, marker_count, cover_image_url, owner:users!owner_id(nickname)')
    .eq('id', tripId)
    .eq('is_public', true)
    .single();

  if (!data) return { title: '여행 일정' };

  const dest     = data.destination ?? '여행지';
  const nights   = (data.nights ?? 0) === 0 ? '당일치기' : `${data.nights}박 ${(data.nights ?? 0) + 1}일`;
  const raw      = data.owner as unknown;
  const owner    = Array.isArray(raw) ? (raw[0] ?? null) : raw;
  const author   = (owner as { nickname?: string } | null)?.nickname;
  const places   = data.marker_count ?? 0;

  const title       = data.title;
  const description = author
    ? `${author}님의 ${dest} ${nights} 여행 일정 — 장소 ${places}곳 수록. ${APP_NAME}에서 확인해보세요.`
    : `${dest} ${nights} 여행 일정 — 장소 ${places}곳 수록. ${APP_NAME}에서 확인해보세요.`;

  const ogImage = resolveOgImageUrl(data.cover_image_url);

  return {
    title,
    description,
    alternates: { canonical: `/t/${tripId}` },
    openGraph: {
      title:       `${title} | ${APP_NAME}`,
      description,
      url:         `/t/${tripId}`,
      type:        'article',
      images:      [{ url: ogImage, width: 1200, height: 630, alt: title }],
    },
    twitter: {
      card:        'summary_large_image',
      title:       `${title} | ${APP_NAME}`,
      description,
      images:      [ogImage],
    },
  };
}

export default async function TripPublicPage({ params }: Props) {
  const { tripId } = await params;
  const supabase = await createClient();

  const [{ data: { session } }, { data: trip }, { data: markers }, { data: comments }, { data: reactions }] = await Promise.all([
    supabase.auth.getSession(),
    supabase
      .from('trip_rooms')
      .select(`
        id, title, destination, country_code, is_domestic,
        start_date, end_date, nights, marker_count, member_count,
        view_count, fork_count, save_count, comment_count,
        cover_image_url, created_at, updated_at,
        owner:users!owner_id(id, nickname, avatar_url)
      `)
      .eq('id', tripId)
      .eq('is_public', true)
      .single(),
    supabase
      .from('markers')
      .select('id, name, address, category, day_number, order_index, lat, lng, stay_minutes, memo')
      .eq('room_id', tripId)
      .order('day_number')
      .order('order_index'),
    supabase
      .from('trip_comments')
      .select(`
        id, content, created_at, updated_at, user_id, is_hidden,
        users ( nickname, avatar_url )
      `)
      .eq('room_id', tripId)
      .order('created_at', { ascending: true }),
    supabase
      .from('trip_reactions')
      .select('reaction_type, user_id')
      .eq('room_id', tripId),
  ]);

  if (!trip) notFound();

  // 로그인 사용자의 저장 여부 확인
  let userId: string | null = null;
  let initialSaved = false;

  const user = session?.user ?? null;
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

  // 조회수 증가 (fire-and-forget, service role로 RLS 우회)
  createServiceClient()
    .from('trip_rooms')
    .update({ view_count: (trip.view_count ?? 0) + 1 })
    .eq('id', tripId)
    .eq('is_public', true)
    .then(() => {});

  const raw = trip as Record<string, unknown>;
  const normalizedTrip = {
    ...raw,
    owner: normalizeEmbed(raw.owner),
  };

  const owner = normalizedTrip.owner as { nickname?: string } | null;
  const jsonLd = generatePublicTripJsonLd({
    id:              trip.id,
    title:           trip.title,
    destination:     trip.destination,
    nights:          trip.nights ?? 0,
    start_date:      trip.start_date,
    end_date:        trip.end_date,
    cover_image_url: trip.cover_image_url,
    created_at:      trip.created_at,
    updated_at:      trip.updated_at,
    markers:         (markers ?? []).map(m => ({
      name:         m.name,
      address:      m.address,
      day_number:   m.day_number,
      order_index:  m.order_index,
      lat:          m.lat,
      lng:          m.lng,
    })),
    authorName: owner?.nickname ?? '여행자',
  });

  const normalizedComments: TripCommentItem[] = (comments ?? []).map(c => {
    const rawUser = c.users as unknown;
    const u = Array.isArray(rawUser) ? (rawUser[0] ?? null) : rawUser;
    const author = u as { nickname?: string; avatar_url?: string | null } | null;
    const hidden = (c as { is_hidden?: boolean }).is_hidden ?? false;
    return {
      id:         c.id,
      content:    hidden ? '' : c.content,
      created_at: c.created_at,
      updated_at: (c as { updated_at?: string }).updated_at,
      user_id:    c.user_id,
      is_hidden:  hidden,
      author: {
        nickname:   author?.nickname ?? '여행자',
        avatar_url: author?.avatar_url ?? null,
      },
    };
  });

  const reactionCounts = aggregateReactions(reactions ?? []);
  const userReactions: ReactionType[] = userId
    ? (reactions ?? [])
        .filter(r => r.user_id === userId)
        .map(r => r.reaction_type as ReactionType)
    : [];

  return (
    <main className="min-h-screen bg-[#F6F4FF]">
      <JsonLd data={jsonLd} />
      <Navbar />
      <TripPublicView
        trip={normalizedTrip as import('@/components/explore/TripPublicView').Trip}
        markers={markers ?? []}
        userId={userId}
        initialSaved={initialSaved}
        initialReactionCounts={reactionCounts}
        initialUserReactions={userReactions}
        initialComments={normalizedComments}
      />
    </main>
  );
}
