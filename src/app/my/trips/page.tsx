import { redirect } from 'next/navigation';
import Navbar from '@/components/landing/Navbar';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { normalizeEmbed } from '@/lib/supabase/normalize';
import TripsClient from './TripsClient';

export const metadata = {
  title:  '내 여행',
  robots: { index: false, follow: false },
};

export default async function MyTripsPage() {
  const userClient = await createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) redirect('/login?redirect=/my/trips');

  const service = createServiceClient();

  let { data: dbUser } = await service
    .from('users')
    .select('id, nickname')
    .eq('auth_id', user.id)
    .single();

  // users 테이블 레코드 없으면 자동 생성 (Google/Kakao OAuth 신규 유저)
  if (!dbUser) {
    const nickname =
      user.user_metadata?.full_name ??
      user.user_metadata?.name ??
      user.email?.split('@')[0] ??
      '사용자';

    await service.from('users').upsert({
      auth_id:        user.id,
      email:          user.email ?? null,
      email_verified: !!user.email_confirmed_at,
      nickname,
      avatar_url:     user.user_metadata?.avatar_url ?? null,
      provider:       user.app_metadata?.provider ?? 'email',
      provider_uid:   user.user_metadata?.sub ?? null,
      locale:         'ko',
    }, { onConflict: 'auth_id' });

    const { data: created } = await service
      .from('users')
      .select('id, nickname')
      .eq('auth_id', user.id)
      .single();

    dbUser = created;
  }

  if (!dbUser) redirect('/');

  const { data: memberships } = await service
    .from('trip_members')
    .select(`
      role,
      joined_at,
      trip_rooms (
        id, title, destination, country_code,
        start_date, end_date, is_locked,
        marker_count, member_count, cover_image_url, created_at
      )
    `)
    .eq('user_id', dbUser.id)
    .order('joined_at', { ascending: false });

  const trips = (memberships ?? [])
    .map((m: { role: string; joined_at: string; trip_rooms: unknown }) => {
      const room = normalizeEmbed(m.trip_rooms as Record<string, unknown> | Record<string, unknown>[] | null);
      if (!room) return null;
      return { ...room, role: m.role, joined_at: m.joined_at };
    })
    .filter(Boolean);

  return (
    <>
      <Navbar />
      <TripsClient trips={trips} nickname={dbUser.nickname} />
    </>
  );
}
