import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://tripsync.com';

export const revalidate = 3600; // 1시간 캐시

export async function GET() {
  const supabase = createServiceClient();

  // 공개 일정 URL 목록
  const { data: seoPages } = await supabase
    .from('seo_pages')
    .select('url_path, last_modified, priority, change_freq')
    .order('last_modified', { ascending: false })
    .limit(50000);

  // 목적지 허브 페이지
  const { data: destinations } = await supabase
    .from('destinations')
    .select('slug');

  const staticPages = [
    { url: '/', priority: 1.0, changefreq: 'daily' },
  ];

  const destPages = (destinations ?? []).map(d => ({
    url:        `/explore/${d.slug}`,
    priority:   0.9,
    changefreq: 'daily',
  }));

  const tripPages = (seoPages ?? []).map(p => ({
    url:        p.url_path,
    priority:   p.priority ?? 0.7,
    changefreq: p.change_freq ?? 'weekly',
    lastmod:    p.last_modified,
  }));

  const allUrls = [...staticPages, ...destPages, ...tripPages];

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
${allUrls.map(u => `  <url>
    <loc>${APP_URL}${u.url}</loc>
    ${u.lastmod ? `<lastmod>${new Date(u.lastmod).toISOString().split('T')[0]}</lastmod>` : ''}
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>
  </url>`).join('\n')}
</urlset>`;

  return new NextResponse(xml, {
    headers: {
      'Content-Type':  'application/xml',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
    },
  });
}
