import type { MetadataRoute } from 'next';
import { createServiceClient } from '@/lib/supabase/server';
import { APP_URL } from '@/lib/config/site';

export const revalidate = 3600; // 1시간 캐시

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = createServiceClient();

  const [{ data: trips }, { data: ownerRows }] = await Promise.all([
    supabase
      .from('trip_rooms')
      .select('id, updated_at')
      .eq('is_public', true)
      .order('updated_at', { ascending: false })
      .limit(5000),
    supabase
      .from('trip_rooms')
      .select('owner_id')
      .eq('is_public', true),
  ]);

  // 공개 여행이 있는 유저 목록 (중복 제거)
  const ownerIds = [...new Set((ownerRows ?? []).map((r: { owner_id: string }) => r.owner_id))];

  const staticPages: MetadataRoute.Sitemap = [
    {
      url:             `${APP_URL}/`,
      lastModified:    new Date(),
      changeFrequency: 'daily',
      priority:        1.0,
    },
    {
      url:             `${APP_URL}/explore`,
      lastModified:    new Date(),
      changeFrequency: 'hourly',
      priority:        0.9,
    },
    {
      url:             `${APP_URL}/privacy`,
      lastModified:    new Date(),
      changeFrequency: 'monthly',
      priority:        0.3,
    },
    {
      url:             `${APP_URL}/terms`,
      lastModified:    new Date(),
      changeFrequency: 'monthly',
      priority:        0.3,
    },
  ];

  const tripPages: MetadataRoute.Sitemap = (trips ?? []).map((t: { id: string; updated_at: string | null }) => ({
    url:             `${APP_URL}/t/${t.id}`,
    lastModified:    t.updated_at ? new Date(t.updated_at) : new Date(),
    changeFrequency: 'weekly' as const,
    priority:        0.7,
  }));

  const profilePages: MetadataRoute.Sitemap = ownerIds.map(id => ({
    url:             `${APP_URL}/u/${id}`,
    lastModified:    new Date(),
    changeFrequency: 'weekly' as const,
    priority:        0.6,
  }));

  return [...staticPages, ...tripPages, ...profilePages];
}
