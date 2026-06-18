// ════════════════════════════════════════════════════════════════════
// 제휴 마케팅 링크 자동 삽입 규칙
// 일정 컨텍스트를 분석하여 최적 파트너 × 삽입 위치 결정
// ════════════════════════════════════════════════════════════════════
import type { MarkerCategory, Marker, TripRoom } from '@/lib/supabase/types';

export type AffiliatePartner =
  | 'AGODA' | 'BOOKING_COM' | 'KLOOK' | 'GETYOURGUIDE'
  | 'SKYSCANNER' | 'KLOOK_RENTAL' | 'INSURANCE';

export type InsertionPoint =
  | 'PLACE_CARD_CTA'        // 장소 카드 하단 CTA 버튼
  | 'ROUTE_INFO_BANNER'     // 카드 사이 소요시간 옆 배너
  | 'DAY_DIVIDER_BANNER'    // Day 구분선 옆 숙소 배너
  | 'TRIP_HEADER_BANNER'    // 일정 상단 항공 배너
  | 'COMPLETION_MODAL';     // 일정 완성 후 체크리스트 모달

export interface AffiliateInsertion {
  partner:        AffiliatePartner;
  insertionPoint: InsertionPoint;
  url:            string;
  label:          string;
  sublabel:       string;
  emoji:          string;
  bgGradient:     string;
  priority:       number;
}

// ── 파트너 URL 빌더 ───────────────────────────────────────────────

const AFFILIATE_IDS = {
  AGODA:        process.env.AGODA_AFFILIATE_ID    ?? 'demo',
  BOOKING_COM:  process.env.BOOKING_AFFILIATE_ID  ?? 'demo',
  KLOOK:        process.env.KLOOK_AFFILIATE_ID    ?? 'demo',
};

function buildAgodaUrl(destination: string, checkIn?: string, checkOut?: string): string {
  const params = new URLSearchParams({
    city:      destination,
    checkIn:   checkIn  ?? '',
    checkOut:  checkOut ?? '',
    affiliateId: AFFILIATE_IDS.AGODA,
  });
  return `https://www.agoda.com/search?${params}`;
}

function buildBookingUrl(destination: string, checkIn?: string, checkOut?: string): string {
  const params = new URLSearchParams({
    ss:       destination,
    checkin:  checkIn  ?? '',
    checkout: checkOut ?? '',
    aid:      AFFILIATE_IDS.BOOKING_COM,
  });
  return `https://www.booking.com/searchresults.html?${params}`;
}

function buildKlookUrl(destination: string, query?: string): string {
  const params = new URLSearchParams({
    query: query ?? destination,
    aff_id: AFFILIATE_IDS.KLOOK,
  });
  return `https://www.klook.com/search/?${params}`;
}

function buildSkyscannerUrl(origin: string, destination: string, date?: string): string {
  return `https://www.skyscanner.co.kr/transport/flights/${origin}/${destination}/${date ?? ''}/?adults=1`;
}

// ── 트리거 평가 ───────────────────────────────────────────────────

interface TripContext {
  room:            TripRoom;
  markers:         Marker[];
  routeIndex?:     number;    // 카드 사이 배너 위치 (0-based)
  durationMinutes?: number;   // 해당 구간 이동 시간
}

// 카테고리 → 제휴 파트너 매핑
const CATEGORY_PARTNER: Partial<Record<MarkerCategory, AffiliatePartner>> = {
  lodging:    'AGODA',
  attraction: 'KLOOK',
  activity:   'KLOOK',
  beach:      'KLOOK',
  nature:     'GETYOURGUIDE',
  restaurant: 'KLOOK',
};

// ── 메인: 삽입 목록 생성 ─────────────────────────────────────────

export function getAffiliateInsertions(ctx: TripContext): AffiliateInsertion[] {
  const insertions: AffiliateInsertion[] = [];
  const { room, markers, routeIndex, durationMinutes } = ctx;
  const dest = room.destination ?? '여행지';

  // ① 숙박 - 2박 이상 일정이고 Day 구분선 위치
  if (room.nights >= 2) {
    insertions.push({
      partner:        'AGODA',
      insertionPoint: 'DAY_DIVIDER_BANNER',
      url:            buildAgodaUrl(dest, room.start_date ?? '', room.end_date ?? ''),
      label:          '아고다 최저가 예약',
      sublabel:       `${dest} 숙소`,
      emoji:          '🏨',
      bgGradient:     'linear-gradient(135deg, #E8532A, #FF7043)',
      priority:       1,
    });
    insertions.push({
      partner:        'BOOKING_COM',
      insertionPoint: 'DAY_DIVIDER_BANNER',
      url:            buildBookingUrl(dest, room.start_date ?? '', room.end_date ?? ''),
      label:          'Booking.com 가격 비교',
      sublabel:       `${dest} 호텔·리조트`,
      emoji:          '🏨',
      bgGradient:     'linear-gradient(135deg, #003580, #0071C2)',
      priority:       2,
    });
  }

  // ② 관광지/액티비티 카드 CTA
  markers.forEach(marker => {
    const partner = CATEGORY_PARTNER[marker.category];
    if (!partner) return;
    insertions.push({
      partner,
      insertionPoint: 'PLACE_CARD_CTA',
      url:            buildKlookUrl(dest, marker.name),
      label:          '클룩 할인 투어 예약',
      sublabel:       marker.name,
      emoji:          '🎫',
      bgGradient:     'linear-gradient(135deg, #FF5722, #FF8A65)',
      priority:       2,
    });
  });

  // ③ 이동 시간 120분 이상 → 렌터카 배너
  if ((durationMinutes ?? 0) >= 120 && routeIndex !== undefined) {
    insertions.push({
      partner:        'KLOOK_RENTAL',
      insertionPoint: 'ROUTE_INFO_BANNER',
      url:            buildKlookUrl(dest, `${dest} 렌터카`),
      label:          '렌터카 최저가',
      sublabel:       `${durationMinutes}분 구간`,
      emoji:          '🚗',
      bgGradient:     'linear-gradient(135deg, #6366F1, #8B5CF6)',
      priority:       1,
    });
  }

  // ④ 해외 여행 → 항공 배너 (헤더)
  if (!room.is_domestic) {
    insertions.push({
      partner:        'SKYSCANNER',
      insertionPoint: 'TRIP_HEADER_BANNER',
      url:            buildSkyscannerUrl('ICN', dest, room.start_date ?? undefined),
      label:          '스카이스캐너 최저가 항공',
      sublabel:       `인천 → ${dest}`,
      emoji:          '✈️',
      bgGradient:     'linear-gradient(135deg, #00B9F1, #0068A8)',
      priority:       1,
    });
  }

  // ⑤ 일정 완성 모달 (여행자보험)
  insertions.push({
    partner:        'INSURANCE',
    insertionPoint: 'COMPLETION_MODAL',
    url:            'https://www.klook.com/',
    label:          '여행자보험 가입하기',
    sublabel:       '출발 전 필수 체크',
    emoji:          '🛡️',
    bgGradient:     'linear-gradient(135deg, #10B981, #059669)',
    priority:       3,
  });

  return insertions.sort((a, b) => a.priority - b.priority);
}

// ── 특정 삽입 위치의 최우선 제휴 반환 ────────────────────────────
export function getPrimaryAffiliate(
  ctx: TripContext,
  insertionPoint: InsertionPoint,
): AffiliateInsertion | null {
  const all = getAffiliateInsertions(ctx);
  return all.find(a => a.insertionPoint === insertionPoint) ?? null;
}

// ── 클릭 이벤트 서버 전송 ─────────────────────────────────────────
export async function trackAffiliateClick(
  partner:     AffiliatePartner,
  roomId:      string,
  destination: string,
  markerId?:   number,
): Promise<void> {
  await fetch('/api/affiliate/click', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ partner, roomId, destination, markerId }),
  }).catch(console.error);
}
