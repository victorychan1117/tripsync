import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { createServiceClient } from '@/lib/supabase/server';
import { generateTripMeta, generateTripJsonLd } from '@/lib/seo/generateTripMeta';
import TripPublicView from '@/components/trips/TripPublicView';

interface Props {
  params: Promise<{
    destination: string;
    duration:    string;
    tripId:      string;
  }>;
}

// ── 동적 메타태그 생성 (ISR) ──────────────────────────────────────
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { tripId } = await params;
  const supabase   = createServiceClient();

  const { data: room } = await supabase
    .from('trip_rooms')
    .select('*, users!owner_id(nickname)')
    .eq('id', tripId)
    .eq('is_public', true)
    .single();

  if (!room) return { title: '일정을 찾을 수 없습니다' };

  const { data: markers } = await supabase
    .from('markers').select('*').eq('room_id', tripId).order('order_index');

  const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://tripsync.com';
  const p       = await params;
  const canonical = `${APP_URL}/trips/${p.destination}/${p.duration}/${tripId}`;

  return generateTripMeta({
    room,
    markers:      markers ?? [],
    authorName:   (room as any).users?.nickname ?? '여행자',
    canonicalUrl: canonical,
  });
}

// ISR: 1시간마다 재생성
export const revalidate = 3600;

export default async function TripDetailPage({ params }: Props) {
  const { tripId } = await params;
  const supabase   = createServiceClient();

  const { data: room } = await supabase
    .from('trip_rooms')
    .select('*, users!owner_id(nickname, avatar_url)')
    .eq('id', tripId)
    .eq('is_public', true)
    .single();

  if (!room) notFound();

  const { data: markers } = await supabase
    .from('markers').select('*').eq('room_id', tripId)
    .order('day_number').order('order_index');

  // 조회수 증가 (비동기, 응답 대기 안 함)
  supabase.from('trip_rooms')
    .update({ view_count: room.view_count + 1 })
    .eq('id', tripId);

  const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://tripsync.com';
  const p       = await params;
  const canonical = `${APP_URL}/trips/${p.destination}/${p.duration}/${tripId}`;

  const jsonLd = generateTripJsonLd({
    room,
    markers:      markers ?? [],
    authorName:   (room as any).users?.nickname ?? '여행자',
    canonicalUrl: canonical,
  });

  return (
    <>
      {/* JSON-LD 스키마 삽입 */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <TripPublicView
        room={room}
        markers={markers ?? []}
        authorName={(room as any).users?.nickname ?? '여행자'}
      />
    </>
  );
}
