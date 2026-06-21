// ════════════════════════════════════════════════════════════════════
// SEO 메타태그 + JSON-LD 자동 생성
// ════════════════════════════════════════════════════════════════════
import type { Metadata } from 'next';
import type { TripRoom, Marker } from '@/lib/supabase/types';
import { resolveOgImageUrl } from '@/lib/trip/coverImage';
import { APP_URL, APP_NAME } from '@/lib/config/site';

interface TripMetaInput {
  room:         TripRoom;
  markers:      Marker[];
  authorName:   string;
  canonicalUrl: string;
}

// ── Next.js Metadata 객체 생성 ────────────────────────────────────
export function generateTripMeta(input: TripMetaInput): Metadata {
  const { room, markers, authorName, canonicalUrl } = input;

  const dest     = room.destination ?? '여행지';
  const duration = room.nights === 0
    ? '당일치기'
    : `${room.nights}박 ${room.nights + 1}일`;

  const placeNames = markers.slice(0, 3).map(m => m.name).join(', ');

  const title       = `${dest} ${duration} 여행 일정 | ${markers.length}곳 코스`;
  const description = `${authorName}님이 짠 ${dest} 완벽 코스. `
    + `${placeNames} 등 ${markers.length}개 장소를 지도에서 바로 확인하고 `
    + `내 일정으로 복사하세요.`;

  const ogImageUrl = resolveOgImageUrl(room.cover_image_url);

  return {
    title,
    description,
    keywords: [
      `${dest} 여행`, `${dest} ${duration}`, `${dest} 코스`,
      `${dest} 여행 일정`, `${dest} 관광지`, '여행 플래너',
    ],
    authors:  [{ name: authorName }],
    openGraph: {
      title,
      description,
      type:   'article',
      url:    canonicalUrl,
      siteName: APP_NAME,
      locale: 'ko_KR',
      images: [{
        url:    ogImageUrl,
        width:  1200,
        height: 630,
        alt:    title,
      }],
      publishedTime: room.created_at,
      modifiedTime:  room.updated_at,
    },
    twitter: {
      card:        'summary_large_image',
      title,
      description,
      images:      [ogImageUrl],
    },
    alternates: {
      canonical: canonicalUrl,
    },
    robots: {
      index:             true,
      follow:            true,
      googleBot: {
        index:  true,
        follow: true,
        'max-image-preview': 'large',
      },
    },
  };
}

// JSON-LD는 jsonLd.ts에서 생성 (marketing 라우트 호환 re-export)
export { generateTripJsonLd } from '@/lib/seo/jsonLd';

// ── 프로그래매틱 랜딩페이지 메타 (탐색 페이지용) ──────────────────
export function generateExploreMeta(
  destination: string,
  duration?:   string,
  theme?:      string,
): Metadata {
  const parts   = [destination, duration, theme].filter(Boolean);
  const title   = `${parts.join(' ')} 여행 일정 추천 | ${APP_NAME}`;
  const desc    = `${destination} 여행을 계획 중이라면? `
    + `실제 여행자들이 짠 ${destination} 일정을 지도에서 바로 확인하고 `
    + `내 플래너에 복사하세요.`;

  return {
    title,
    description: desc,
    openGraph:   { title, description: desc, siteName: APP_NAME, locale: 'ko_KR' },
    robots:      { index: true, follow: true },
  };
}
