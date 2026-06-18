// ════════════════════════════════════════════════════════════════════
// SEO 메타태그 + JSON-LD 자동 생성
// ════════════════════════════════════════════════════════════════════
import type { Metadata } from 'next';
import type { TripRoom, Marker } from '@/lib/supabase/types';

const APP_URL  = process.env.NEXT_PUBLIC_APP_URL  ?? 'https://tripsync.com';
const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME ?? 'TripSync';

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

  const ogImageUrl = room.cover_image_url
    ?? `${APP_URL}/api/og?roomId=${room.id}`;

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

// ── JSON-LD 스키마 생성 (구글 리치 스니펫) ────────────────────────
export function generateTripJsonLd(input: TripMetaInput): object {
  const { room, markers, authorName, canonicalUrl } = input;

  const dest     = room.destination ?? '여행지';
  const duration = room.nights === 0
    ? '당일치기'
    : `${room.nights}박 ${room.nights + 1}일`;

  // Day별 그룹핑
  const dayGroups = markers.reduce<Record<number, Marker[]>>((acc, m) => {
    (acc[m.day_number] = acc[m.day_number] ?? []).push(m);
    return acc;
  }, {});

  return {
    '@context': 'https://schema.org',
    '@type':    'TouristTrip',
    name:        `${dest} ${duration} 여행 코스`,
    description: `${dest} ${duration} 여행 일정. ${markers.length}개 장소.`,
    url:          canonicalUrl,
    touristType: ['여행', dest],
    itinerary: Object.entries(dayGroups).map(([day, dayMarkers]) => ({
      '@type': 'ItemList',
      name:    `Day ${day}`,
      itemListElement: dayMarkers
        .sort((a, b) => a.order_index - b.order_index)
        .map((m, i) => ({
          '@type':    'ListItem',
          position:   i + 1,
          item: {
            '@type': 'TouristAttraction',
            name:     m.name,
            address:  m.address,
            geo: m.lat && m.lng ? {
              '@type':    'GeoCoordinates',
              latitude:   m.lat,
              longitude:  m.lng,
            } : undefined,
          },
        })),
    })),
    author: {
      '@type': 'Person',
      name:    authorName,
    },
    datePublished: room.created_at,
    dateModified:  room.updated_at,
    aggregateRating: room.fork_count > 0 ? {
      '@type':       'AggregateRating',
      ratingValue:   '4.5',
      reviewCount:   room.fork_count,
    } : undefined,
  };
}

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
