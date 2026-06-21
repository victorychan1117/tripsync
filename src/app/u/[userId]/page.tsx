import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import Navbar from '@/components/landing/Navbar';
import { createClient } from '@/lib/supabase/server';
import { APP_NAME } from '@/lib/config/site';
import PublicProfileClient from '@/components/profile/PublicProfileClient';
import JsonLd from '@/components/seo/JsonLd';
import { generateProfileJsonLd } from '@/lib/seo/jsonLd';
import type { ProfileUser, ProfileTrip } from '@/components/profile/PublicProfileClient';

interface Props {
  params: Promise<{ userId: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { userId } = await params;
  const supabase = await createClient();

  const [{ data: profile }, { count }] = await Promise.all([
    supabase.from('users').select('nickname').eq('id', userId).single(),
    supabase
      .from('trip_rooms')
      .select('id', { count: 'exact', head: true })
      .eq('owner_id', userId)
      .eq('is_public', true),
  ]);

  if (!profile) return { title: '여행자 프로필' };

  const title       = `${profile.nickname}님의 여행`;
  const description = count
    ? `${profile.nickname}님이 공개한 여행 일정 ${count}개를 ${APP_NAME}에서 둘러보세요.`
    : `${profile.nickname}님이 공개한 여행을 ${APP_NAME}에서 확인해보세요.`;

  return {
    title,
    description,
    alternates: { canonical: `/u/${userId}` },
    openGraph: {
      title:       `${title} | ${APP_NAME}`,
      description,
      url:         `/u/${userId}`,
      type:        'profile',
      images:      [{ url: '/landing/hero.png', width: 1672, height: 941, alt: title }],
    },
    twitter: {
      card:        'summary_large_image',
      title:       `${title} | ${APP_NAME}`,
      description,
      images:      ['/landing/hero.png'],
    },
  };
}

export default async function PublicProfilePage({ params }: Props) {
  const { userId } = await params;
  const supabase = await createClient();

  // 인증 사용자 (저장 버튼용)
  const { data: { user } } = await supabase.auth.getUser();
  let viewerUserId: string | null = null;

  if (user) {
    const { data: dbUser } = await supabase
      .from('users')
      .select('id')
      .eq('auth_id', user.id)
      .single();
    if (dbUser) viewerUserId = dbUser.id;
  }

  // 프로필 공개 정보만 조회 (이메일·auth_id 제외)
  const { data: profile } = await supabase
    .from('users')
    .select('id, nickname, avatar_url')
    .eq('id', userId)
    .single();

  if (!profile) notFound();

  // 해당 유저가 owner인 공개 여행만
  const { data: trips } = await supabase
    .from('trip_rooms')
    .select('id, title, destination, country_code, nights, marker_count, view_count, fork_count, cover_image_url, created_at')
    .eq('owner_id', userId)
    .eq('is_public', true)
    .order('created_at', { ascending: false });

  // 방문자의 저장 목록
  let savedIds: string[] = [];
  if (viewerUserId) {
    const { data: saved } = await supabase
      .from('saved_trips')
      .select('room_id')
      .eq('user_id', viewerUserId);
    savedIds = saved?.map(s => s.room_id) ?? [];
  }

  const publicTrips = (trips ?? []) as ProfileTrip[];
  const jsonLd = generateProfileJsonLd({
    nickname:    profile.nickname,
    avatarUrl:   profile.avatar_url,
    profilePath: `/u/${userId}`,
    trips:       publicTrips.map(t => ({
      id:              t.id,
      title:           t.title,
      destination:     t.destination,
      cover_image_url: t.cover_image_url,
    })),
    totalTrips: publicTrips.length,
  });

  return (
    <main className="min-h-screen bg-slate-50">
      <JsonLd data={jsonLd} />
      <Navbar />
      <PublicProfileClient
        profile={profile as ProfileUser}
        trips={publicTrips}
        isLoggedIn={!!user}
        viewerUserId={viewerUserId}
        initialSavedIds={savedIds}
      />
    </main>
  );
}
