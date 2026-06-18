// ════════════════════════════════════════════════════════════════════
// 하이브리드 지도 엔진 선택기
// 국내(KR): Kakao Maps SDK + Kakao Mobility API
// 해외:     Google Maps SDK + Google Routes API
// ════════════════════════════════════════════════════════════════════

export type MapEngine    = 'KAKAO' | 'GOOGLE';
export type RouteEngine  = 'KAKAO_MOBILITY' | 'GOOGLE_ROUTES';

export interface MapConfig {
  renderer:      MapEngine;
  router:        RouteEngine;
  geocoder:      MapEngine;
  defaultLocale: string;
  sdkUrl:        string;
}

const CONFIG_BY_COUNTRY: Record<string, MapConfig> = {
  KR: {
    renderer:      'KAKAO',
    router:        'KAKAO_MOBILITY',
    geocoder:      'KAKAO',
    defaultLocale: 'ko',
    sdkUrl: `//dapi.kakao.com/v2/maps/sdk.js?appkey=${process.env.NEXT_PUBLIC_KAKAO_MAP_KEY}&libraries=services,clusterer&autoload=false`,
  },
  DEFAULT: {
    renderer:      'GOOGLE',
    router:        'GOOGLE_ROUTES',
    geocoder:      'GOOGLE',
    defaultLocale: 'en',
    sdkUrl: `https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY}&libraries=places,geometry&language=ko`,
  },
};

export function getMapConfig(countryCode: string): MapConfig {
  return CONFIG_BY_COUNTRY[countryCode] ?? CONFIG_BY_COUNTRY['DEFAULT'];
}

// ── SDK 동적 로드 ─────────────────────────────────────────────────
const loadedSdks = new Set<string>();

export function isSdkLoaded(renderer: MapEngine): boolean {
  return loadedSdks.has(renderer);
}

export function loadMapSdk(config: MapConfig): Promise<void> {
  if (loadedSdks.has(config.renderer)) return Promise.resolve();

  return new Promise((resolve, reject) => {
    const script  = document.createElement('script');
    script.src    = config.sdkUrl;
    script.async  = true;

    script.onload = () => {
      if (config.renderer === 'KAKAO') {
        const kakao = (window as any).kakao;
        kakao.maps.load(() => {
          loadedSdks.add(config.renderer);
          resolve();
        });
      } else {
        loadedSdks.add(config.renderer);
        resolve();
      }
    };

    script.onerror = () => reject(new Error(`Failed to load ${config.renderer} SDK`));
    document.head.appendChild(script);
  });
}

// ── Kakao 지도 초기화 ─────────────────────────────────────────────
export function initKakaoMap(
  container: HTMLElement,
  options: { lat: number; lng: number; level?: number },
) {
  const kakao = (window as any).kakao;
  if (!kakao?.maps) throw new Error('Kakao Maps SDK not loaded');

  const map = new kakao.maps.Map(container, {
    center: new kakao.maps.LatLng(options.lat, options.lng),
    level:  options.level ?? 7,
  });

  // 지도 타입 컨트롤 추가
  map.addControl(
    new kakao.maps.MapTypeControl(),
    kakao.maps.ControlPosition.TOPRIGHT,
  );
  map.addControl(
    new kakao.maps.ZoomControl(),
    kakao.maps.ControlPosition.RIGHT,
  );

  return map;
}

// ── Google 지도 초기화 ────────────────────────────────────────────
export function initGoogleMap(
  container: HTMLElement,
  options: { lat: number; lng: number; zoom?: number },
) {
  const google = (window as any).google;
  if (!google?.maps) throw new Error('Google Maps SDK not loaded');

  return new google.maps.Map(container, {
    center:            { lat: options.lat, lng: options.lng },
    zoom:              options.zoom ?? 13,
    mapId:             'tripsync_map',
    disableDefaultUI:  false,
    clickableIcons:    false,
    styles: [
      // 불필요한 POI 레이블 제거 (우리 마커만 표시)
      { featureType: 'poi', elementType: 'labels', stylers: [{ visibility: 'off' }] },
      { featureType: 'transit', elementType: 'labels', stylers: [{ visibility: 'off' }] },
    ],
  });
}

// ── Kakao 마커 생성 ───────────────────────────────────────────────
export function createKakaoMarker(
  map: any,
  lat: number,
  lng: number,
  label: string,
  color: string,
) {
  const kakao = (window as any).kakao;

  const markerImage = new kakao.maps.MarkerImage(
    createMarkerSvgDataUrl(label, color),
    new kakao.maps.Size(40, 40),
    { offset: new kakao.maps.Point(20, 40) },
  );

  const marker = new kakao.maps.Marker({
    position: new kakao.maps.LatLng(lat, lng),
    image:    markerImage,
    map,
  });

  return marker;
}

// ── Google 마커 생성 (Advanced Marker) ───────────────────────────
export function createGoogleMarker(
  map: any,
  lat: number,
  lng: number,
  label: string,
  color: string,
) {
  const google = (window as any).google;

  const pin = document.createElement('div');
  pin.innerHTML = `
    <div style="
      width:36px;height:36px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);
      background:${color};border:3px solid white;display:flex;align-items:center;
      justify-content:center;box-shadow:0 4px 12px ${color}66;
    ">
      <span style="transform:rotate(45deg);color:white;font-weight:800;font-size:13px;">
        ${label}
      </span>
    </div>
  `;

  return new google.maps.marker.AdvancedMarkerElement({
    map,
    position: { lat, lng },
    content:  pin,
  });
}

// ── 마커 SVG DataURL 생성 ─────────────────────────────────────────
function createMarkerSvgDataUrl(label: string, color: string): string {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="40" height="48" viewBox="0 0 40 48">
      <path d="M20 0 C9 0 0 9 0 20 C0 35 20 48 20 48 C20 48 40 35 40 20 C40 9 31 0 20 0Z"
        fill="${color}" stroke="white" stroke-width="2"/>
      <text x="20" y="25" text-anchor="middle" dominant-baseline="middle"
        font-family="Inter,sans-serif" font-size="14" font-weight="800" fill="white">
        ${label}
      </text>
    </svg>
  `;
  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
}

// ── Kakao 경로선 그리기 ───────────────────────────────────────────
export function drawKakaoPolyline(map: any, path: Array<{ lat: number; lng: number }>, color: string) {
  const kakao = (window as any).kakao;
  const polyline = new kakao.maps.Polyline({
    map,
    path: path.map(p => new kakao.maps.LatLng(p.lat, p.lng)),
    strokeWeight:   4,
    strokeColor:    color,
    strokeOpacity:  0.85,
    strokeStyle:    'solid',
  });
  return polyline;
}

// ── Google 경로선 그리기 ──────────────────────────────────────────
export function drawGooglePolyline(map: any, encodedPolyline: string, color: string) {
  const google = (window as any).google;
  const path   = google.maps.geometry.encoding.decodePath(encodedPolyline);

  return new google.maps.Polyline({
    map,
    path,
    strokeColor:   color,
    strokeOpacity: 0.85,
    strokeWeight:  4,
  });
}
