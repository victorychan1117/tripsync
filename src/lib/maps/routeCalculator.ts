// ════════════════════════════════════════════════════════════════════
// 경로 계산기 — 3계층 캐시 + 디바운싱 + 국내/해외 분기
// L1: 인메모리(Map) → L2: Supabase route_cache → L3: 외부 API
// ════════════════════════════════════════════════════════════════════
import { createClient } from '@/lib/supabase/client';
import { roundCoord, formatDuration, formatDistance } from '@/lib/utils';
import type { TransportMode, RouteSegment } from '@/lib/supabase/types';

// ── 타입 ──────────────────────────────────────────────────────────
interface Coord {
  lat: number;
  lng: number;
}

interface RouteRequest {
  markers:     Array<Coord & { name: string }>;
  mode:        TransportMode;
  countryCode: string;
}

// ── L1 인메모리 캐시 ──────────────────────────────────────────────
const memCache = new Map<string, RouteSegment>();

function makeCacheKey(from: Coord, to: Coord, mode: TransportMode): string {
  return `${roundCoord(from.lat)},${roundCoord(from.lng)}|${roundCoord(to.lat)},${roundCoord(to.lng)}|${mode}`;
}

// ── L2 DB 캐시 조회 ───────────────────────────────────────────────
async function checkDbCache(from: Coord, to: Coord, mode: TransportMode): Promise<RouteSegment | null> {
  const supabase = createClient();

  const { data } = await supabase
    .from('route_cache')
    .select('duration_sec, distance_m, polyline, summary')
    .eq('origin_lat', roundCoord(from.lat))
    .eq('origin_lng', roundCoord(from.lng))
    .eq('dest_lat',   roundCoord(to.lat))
    .eq('dest_lng',   roundCoord(to.lng))
    .eq('mode', mode)
    .gt('expires_at', new Date().toISOString())
    .maybeSingle();

  if (!data) return null;
  if (data.duration_sec === 0 && data.distance_m === 0) return null;

  return {
    durationSec:  data.duration_sec,
    distanceM:    data.distance_m,
    durationText: formatDuration(data.duration_sec),
    distanceText: formatDistance(data.distance_m),
    polyline:     data.polyline,
  };
}

// ── L2 DB 캐시 저장 ───────────────────────────────────────────────
async function saveDbCache(
  from: Coord, to: Coord, mode: TransportMode,
  segment: RouteSegment, provider: string,
): Promise<void> {
  // 서버 API를 통해 저장 (클라이언트에서 직접 INSERT는 service_role 필요)
  await fetch('/api/route-cache', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      origin_lat:   roundCoord(from.lat),
      origin_lng:   roundCoord(from.lng),
      dest_lat:     roundCoord(to.lat),
      dest_lng:     roundCoord(to.lng),
      mode,
      duration_sec: segment.durationSec,
      distance_m:   segment.distanceM,
      polyline:     segment.polyline,
      api_provider: provider,
    }),
  }).catch(console.error);
}

// ── Google Routes API 호출 ────────────────────────────────────────
async function callGoogleRoutes(req: RouteRequest): Promise<RouteSegment[]> {
  const origin      = req.markers[0];
  const destination = req.markers[req.markers.length - 1];
  const intermediates = req.markers.slice(1, -1).map(m => ({
    location: { latLng: { latitude: m.lat, longitude: m.lng } },
  }));

  const response = await fetch('/api/route-calculate', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      origin:         { location: { latLng: { latitude: origin.lat, longitude: origin.lng } } },
      destination:    { location: { latLng: { latitude: destination.lat, longitude: destination.lng } } },
      intermediates,
      travelMode:     req.mode,
      languageCode:   'ko',
      units:          'METRIC',
    }),
  });

  if (!response.ok) throw new Error('Google Routes API failed');
  const data = await response.json();

  return (data.routes?.[0]?.legs ?? []).map((leg: any) => ({
    durationSec:  parseInt(leg.duration?.replace('s', '') ?? '0'),
    distanceM:    leg.distanceMeters ?? 0,
    durationText: formatDuration(parseInt(leg.duration?.replace('s', '') ?? '0')),
    distanceText: formatDistance(leg.distanceMeters ?? 0),
    polyline:     leg.polyline?.encodedPolyline ?? null,
  }));
}

// ── Kakao Mobility API 호출 ───────────────────────────────────────
async function callKakaoMobility(from: Coord, to: Coord): Promise<RouteSegment> {
  const response = await fetch('/api/route-calculate', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      provider: 'kakao',
      origin:   `${from.lng},${from.lat}`,
      destination: `${to.lng},${to.lat}`,
    }),
  });

  if (!response.ok) throw new Error('Kakao Mobility API failed');
  const data = await response.json();

  const route = data.routes?.[0];
  if (!route) throw new Error('Kakao: no route found');
  const durationSec = route.summary?.duration ?? 0;
  const distanceM   = route.summary?.distance ?? 0;
  if (durationSec === 0 && distanceM === 0) throw new Error('Kakao: empty route data');

  return {
    durationSec,
    distanceM,
    durationText: formatDuration(durationSec),
    distanceText: formatDistance(distanceM),
    polyline:     null,
  };
}

// ════════════════════════════════════════════════════════════════════
// 메인 경로 계산 함수 (3계층 캐시 적용)
// ════════════════════════════════════════════════════════════════════
export async function calculateRoutes(req: RouteRequest): Promise<RouteSegment[]> {
  if (req.markers.length < 2) return [];

  const results: (RouteSegment | null)[] = new Array(req.markers.length - 1).fill(null);
  const needApiCall: number[] = [];

  // ── 1단계: L1 인메모리 캐시 확인 ─────────────────────────────
  for (let i = 0; i < req.markers.length - 1; i++) {
    const from = req.markers[i];
    const to   = req.markers[i + 1];
    const key  = makeCacheKey(from, to, req.mode);
    const cached = memCache.get(key);
    if (cached) {
      results[i] = cached;
    } else {
      needApiCall.push(i);
    }
  }

  if (needApiCall.length === 0) return results as RouteSegment[];

  // ── 2단계: L2 DB 캐시 확인 (병렬 조회) ─────────────────────
  const dbResults = await Promise.all(
    needApiCall.map(i =>
      checkDbCache(req.markers[i], req.markers[i + 1], req.mode)
    ),
  );

  const stillNeedApi: number[] = [];
  dbResults.forEach((cached, idx) => {
    const i = needApiCall[idx];
    if (cached) {
      results[i] = cached;
      memCache.set(makeCacheKey(req.markers[i], req.markers[i + 1], req.mode), cached);
    } else {
      stillNeedApi.push(i);
    }
  });

  if (stillNeedApi.length === 0) return results as RouteSegment[];

  // ── 3단계: 외부 API 호출 ─────────────────────────────────────
  const isDomestic = req.countryCode === 'KR';

  const isConsecutive = stillNeedApi.every((idx, j) => j === 0 || idx === stillNeedApi[j - 1] + 1);

  if (!isDomestic && stillNeedApi.length > 1 && isConsecutive) {
    // Google: waypoints 묶어서 1회 호출 (연속 구간일 때만)
    const batchMarkers = [
      req.markers[stillNeedApi[0]],
      ...stillNeedApi.map(i => req.markers[i + 1]),
    ];
    try {
      const apiResults = await callGoogleRoutes({ ...req, markers: batchMarkers });
      for (let j = 0; j < apiResults.length; j++) {
        const i = stillNeedApi[j];
        results[i] = apiResults[j];
        const key  = makeCacheKey(req.markers[i], req.markers[i + 1], req.mode);
        memCache.set(key, apiResults[j]);
        if (apiResults[j].durationSec > 0 || apiResults[j].distanceM > 0) {
          await saveDbCache(req.markers[i], req.markers[i + 1], req.mode, apiResults[j], 'google');
        }
      }
    } catch (err) {
      console.error('Google Routes API error:', err);
    }
  } else {
    // Kakao or Google 단건 호출 (캐시 최대 활용)
    await Promise.all(
      stillNeedApi.map(async (i) => {
        const from = req.markers[i];
        const to   = req.markers[i + 1];
        try {
          const segment = isDomestic
            ? await callKakaoMobility(from, to)
            : await callGoogleRoutes({ ...req, markers: [from, to] }).then(r => r[0]);

          results[i] = segment;
          const key  = makeCacheKey(from, to, req.mode);
          memCache.set(key, segment);
          if (segment.durationSec > 0 || segment.distanceM > 0) {
            await saveDbCache(from, to, req.mode, segment, isDomestic ? 'kakao' : 'google');
          }
        } catch (err) {
          console.error(`Route calc failed for segment ${i}:`, err);
        }
      }),
    );
  }

  return results.map(r => r ?? {
    durationSec: 0, distanceM: 0,
    durationText: '시간 미확인', distanceText: '거리 미확인', polyline: null,
  });
}

// ════════════════════════════════════════════════════════════════════
// 디바운서 클래스 — 마커 연속 편집 시 API 호출 최소화
// ════════════════════════════════════════════════════════════════════
export class RouteDebouncer {
  private timer:   ReturnType<typeof setTimeout> | null = null;
  private pending: RouteRequest | null = null;
  private readonly delay: number;

  constructor(delayMs = 1500) {
    this.delay = delayMs;
  }

  schedule(
    request: RouteRequest,
    callback: (results: RouteSegment[]) => void,
  ): void {
    this.pending = request;
    if (this.timer) clearTimeout(this.timer);

    this.timer = setTimeout(async () => {
      if (!this.pending) return;
      const req   = this.pending;
      this.pending = null;
      this.timer   = null;
      try {
        const results = await calculateRoutes(req);
        callback(results);
      } catch (err) {
        console.error('RouteDebouncer error:', err);
      }
    }, this.delay);
  }

  cancel(): void {
    if (this.timer) { clearTimeout(this.timer); this.timer = null; }
    this.pending = null;
  }
}
