import { redirect, notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { createServiceClient } from '@/lib/supabase/server';
import { generateTripMeta } from '@/lib/seo/generateTripMeta';
import { APP_URL } from '@/lib/config/site';

interface Props {
  params: Promise<{
    destination: string;
    duration:    string;
    tripId:      string;
  }>;
}

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

  return generateTripMeta({
    room,
    markers:      markers ?? [],
    authorName:   (room as { users?: { nickname?: string } }).users?.nickname ?? '여행자',
    canonicalUrl: `${APP_URL}/t/${tripId}`,
  });
}

export const revalidate = 3600;

/** 레거시 SEO URL → canonical `/t/[tripId]` 로 리다이렉트 */
export default async function TripDetailPage({ params }: Props) {
  const { tripId } = await params;
  const supabase   = createServiceClient();

  const { data: room } = await supabase
    .from('trip_rooms')
    .select('id')
    .eq('id', tripId)
    .eq('is_public', true)
    .maybeSingle();

  if (!room) notFound();
  redirect(`/t/${tripId}`);
}
