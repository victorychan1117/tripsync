// ════════════════════════════════════════════════════════════════════
// JSON-LD 구조화 데이터 생성 (공개 라우트 전용)
// ════════════════════════════════════════════════════════════════════
import { resolveOgImageUrl } from '@/lib/trip/coverImage';
import { APP_URL, APP_NAME } from '@/lib/config/site';

export type JsonLdValue = Record<string, unknown> | Record<string, unknown>[];

/** undefined/null 필드 제거 — JSON.stringify 전 안전 처리 */
export function stripUndefined<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function absUrl(path: string): string {
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  return `${APP_URL}${path.startsWith('/') ? path : `/${path}`}`;
}

function safeAvatarUrl(url: string | null | undefined): string | undefined {
  if (!url) return undefined;
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  return undefined;
}

// ── Marker / Trip 입력 타입 (공개 페이지 최소 필드) ─────────────────

export interface JsonLdMarker {
  name:         string;
  address:      string | null;
  day_number:   number;
  order_index?: number;
  lat:          number | null;
  lng:          number | null;
}

export interface JsonLdPublicTripInput {
  id:              string;
  title:           string;
  destination:     string | null;
  nights:          number;
  start_date:      string | null;
  end_date:        string | null;
  cover_image_url: string | null;
  created_at:      string;
  updated_at:      string;
  markers:         JsonLdMarker[];
  authorName:      string;
}

export interface JsonLdProfileTrip {
  id:              string;
  title:           string;
  destination:     string | null;
  cover_image_url: string | null;
}

export interface JsonLdProfileInput {
  nickname:   string;
  avatarUrl:  string | null;
  profilePath: string;
  trips:      JsonLdProfileTrip[];
  totalTrips: number;
}

export interface JsonLdExploreTrip {
  id:              string;
  title:           string;
  destination:     string | null;
  cover_image_url: string | null;
}

export interface JsonLdExploreInput {
  trips:      JsonLdExploreTrip[];
  totalCount: number;
}

// ── 장소 ListItem 빌더 ──────────────────────────────────────────────

function buildMarkerListItem(marker: JsonLdMarker, position: number) {
  const item: Record<string, unknown> = {
    '@type': 'TouristAttraction',
    name:    marker.name,
  };
  if (marker.address) item.address = marker.address;
  if (marker.lat != null && marker.lng != null) {
    item.geo = {
      '@type':     'GeoCoordinates',
      latitude:    marker.lat,
      longitude:   marker.lng,
    };
  }
  return {
    '@type':    'ListItem',
    position,
    item,
  };
}

// ── /t/[tripId] — TouristTrip ─────────────────────────────────────

export function generatePublicTripJsonLd(input: JsonLdPublicTripInput): Record<string, unknown> {
  const { id, title, destination, nights, markers, authorName } = input;
  const dest     = destination ?? '여행지';
  const duration = nights === 0 ? '당일치기' : `${nights}박 ${nights + 1}일`;
  const pageUrl  = absUrl(`/t/${id}`);

  const description = `${authorName}님의 ${dest} ${duration} 여행 일정`
    + (markers.length > 0 ? ` — 장소 ${markers.length}곳 수록.` : '.');

  // Day별 itinerary
  const dayGroups = markers.reduce<Record<number, JsonLdMarker[]>>((acc, m) => {
    (acc[m.day_number] = acc[m.day_number] ?? []).push(m);
    return acc;
  }, {});

  const itinerary = Object.entries(dayGroups)
    .sort(([a], [b]) => Number(a) - Number(b))
    .map(([day, dayMarkers]) => ({
      '@type': 'ItemList',
      name:    `Day ${day}`,
      itemListElement: dayMarkers
        .sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0))
        .map((m, i) => buildMarkerListItem(m, i + 1)),
    }));

  // 전체 장소 flat ItemList (검색엔진용 보조)
  const flatItemList = {
    '@type': 'ItemList',
    name:    `${title} 장소 목록`,
    numberOfItems: markers.length,
    itemListElement: markers.map((m, i) => buildMarkerListItem(m, i + 1)),
  };

  return stripUndefined({
    '@context':    'https://schema.org',
    '@type':       'TouristTrip',
    name:          title,
    description,
    url:           pageUrl,
    image:         resolveOgImageUrl(input.cover_image_url),
    touristType:   '여행자',
    itinerary:     itinerary.length > 0 ? itinerary : undefined,
    subjectOf:     markers.length > 0 ? flatItemList : undefined,
    provider: {
      '@type': 'Person',
      name:    authorName,
    },
    startDate:     input.start_date ?? undefined,
    endDate:       input.end_date ?? undefined,
    dateCreated:   input.created_at,
    dateModified:  input.updated_at,
  });
}

/** @deprecated marketing 라우트 호환 — generatePublicTripJsonLd 사용 권장 */
export function generateTripJsonLd(input: {
  room: {
    id: string; title: string; destination: string | null; nights: number;
    start_date: string | null; end_date: string | null;
    cover_image_url: string | null; created_at: string; updated_at: string;
  };
  markers: JsonLdMarker[];
  authorName: string;
  canonicalUrl: string;
}): Record<string, unknown> {
  const base = generatePublicTripJsonLd({
    id:              input.room.id,
    title:           input.room.title,
    destination:     input.room.destination,
    nights:          input.room.nights,
    start_date:      input.room.start_date,
    end_date:        input.room.end_date,
    cover_image_url: input.room.cover_image_url,
    created_at:      input.room.created_at,
    updated_at:      input.room.updated_at,
    markers:         input.markers,
    authorName:      input.authorName,
  });
  // marketing canonical URL 오버라이드
  return { ...base, url: input.canonicalUrl };
}

// ── /u/[userId] — ProfilePage + Person ────────────────────────────

const PROFILE_JSONLD_TRIP_LIMIT = 12;

export function generateProfileJsonLd(input: JsonLdProfileInput): Record<string, unknown> {
  const pageUrl = absUrl(input.profilePath);
  const avatar  = safeAvatarUrl(input.avatarUrl);

  const tripItems = input.trips.slice(0, PROFILE_JSONLD_TRIP_LIMIT).map((trip, i) => ({
    '@type':    'ListItem',
    position:   i + 1,
    item: stripUndefined({
      '@type':       'TouristTrip',
      name:          trip.title,
      url:           absUrl(`/t/${trip.id}`),
      image:         trip.cover_image_url ? resolveOgImageUrl(trip.cover_image_url) : undefined,
      description:   trip.destination ?? undefined,
    }),
  }));

  return stripUndefined({
    '@context':    'https://schema.org',
    '@type':       'ProfilePage',
    name:          `${input.nickname}님의 여행 일지`,
    description:   input.totalTrips > 0
      ? `${input.nickname}님이 공개한 여행 일정 ${input.totalTrips}개`
      : `${input.nickname}님의 공개 여행 프로필`,
    url:           pageUrl,
    isPartOf: {
      '@type': 'WebSite',
      name:    APP_NAME,
      url:     APP_URL,
    },
    mainEntity: stripUndefined({
      '@type': 'Person',
      name:    input.nickname,
      image:   avatar,
      url:     pageUrl,
    }),
    hasPart: tripItems.length > 0 ? stripUndefined({
      '@type':         'ItemList',
      name:            `${input.nickname}님의 공개 여행`,
      numberOfItems:   input.totalTrips,
      itemListElement: tripItems,
    }) : undefined,
  });
}

// ── /explore — CollectionPage + ItemList ────────────────────────────

const EXPLORE_JSONLD_TRIP_LIMIT = 20;

export function generateExploreJsonLd(input: JsonLdExploreInput): Record<string, unknown> {
  const pageUrl = absUrl('/explore');
  const desc    = '다른 여행자들이 공개한 여행 일정과 코스를 둘러보고, 마음에 드는 여행을 내 일정으로 담아보세요.';

  const tripItems = input.trips.slice(0, EXPLORE_JSONLD_TRIP_LIMIT).map((trip, i) => ({
    '@type':    'ListItem',
    position:   i + 1,
    item: stripUndefined({
      '@type':     'TouristTrip',
      name:        trip.title,
      url:         absUrl(`/t/${trip.id}`),
      image:       trip.cover_image_url ? resolveOgImageUrl(trip.cover_image_url) : undefined,
      description: trip.destination ?? undefined,
    }),
  }));

  return stripUndefined({
    '@context':    'https://schema.org',
    '@type':       'CollectionPage',
    name:          '공개 여행 둘러보기',
    description:   desc,
    url:           pageUrl,
    isPartOf: {
      '@type': 'WebSite',
      name:    APP_NAME,
      url:     APP_URL,
    },
    mainEntity: stripUndefined({
      '@type':         'ItemList',
      name:            '공개 여행 일정',
      numberOfItems:   input.totalCount,
      itemListElement: tripItems,
    }),
  });
}
