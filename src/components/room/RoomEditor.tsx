'use client';
// ════════════════════════════════════════════════════════════════════
// RoomEditor — 실시간 협업 편집 메인 컴포넌트
// Supabase Realtime + 낙관적 업데이트 + 하이브리드 지도 연동
// ════════════════════════════════════════════════════════════════════
import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useMarkerStore }     from '@/lib/realtime/markerStore';
import { useRoomSync }        from '@/lib/realtime/useRoomSync';
import { RouteDebouncer }     from '@/lib/maps/routeCalculator';
import { getMapConfig, loadMapSdk } from '@/lib/maps/mapEngineSelector';
import { getPrimaryAffiliate } from '@/lib/affiliate/affiliateRules';
import type { TripRoom, Marker, TripMember, RouteSegment, MarkerWithRoute } from '@/lib/supabase/types';
import Sidebar        from '@/components/sidebar/Sidebar';
import MapCanvas      from '@/components/map/MapCanvas';
import PlaceEditPanel from '@/components/room/PlaceEditPanel';

interface Props {
  initialRoom:    TripRoom & { trip_members: any[] };
  initialMarkers: Marker[];
  currentMember:  TripMember | null;
}

const DESTINATION_COORDS: Record<string, { lat: number; lng: number }> = {
  // 국내
  '제주도': { lat: 33.499, lng: 126.531 }, '서울':   { lat: 37.566, lng: 126.978 },
  '부산':   { lat: 35.179, lng: 129.075 }, '경주':   { lat: 35.856, lng: 129.225 },
  '강릉':   { lat: 37.751, lng: 128.876 }, '여수':   { lat: 34.761, lng: 127.662 },
  '전주':   { lat: 35.824, lng: 127.148 }, '속초':   { lat: 38.207, lng: 128.592 },
  '제천':   { lat: 37.132, lng: 128.191 }, '인천':   { lat: 37.456, lng: 126.705 },
  '대구':   { lat: 35.871, lng: 128.602 }, '광주':   { lat: 35.160, lng: 126.852 },
  '대전':   { lat: 36.351, lng: 127.385 }, '춘천':   { lat: 37.882, lng: 127.730 },
  '통영':   { lat: 34.854, lng: 128.433 }, '거제':   { lat: 34.880, lng: 128.621 },
  '남해':   { lat: 34.838, lng: 127.892 }, '포항':   { lat: 36.019, lng: 129.343 },
  '울산':   { lat: 35.538, lng: 129.311 }, '수원':   { lat: 37.264, lng: 127.029 },
  // 일본
  '도쿄':   { lat: 35.676, lng: 139.650 }, '오사카': { lat: 34.693, lng: 135.502 },
  '교토':   { lat: 35.011, lng: 135.768 }, '후쿠오카': { lat: 33.590, lng: 130.401 },
  '삿포로': { lat: 43.062, lng: 141.354 }, '오키나와': { lat: 26.212, lng: 127.679 },
  '나고야': { lat: 35.181, lng: 136.906 }, '나라':   { lat: 34.685, lng: 135.805 },
  // 태국
  '방콕':   { lat: 13.736, lng: 100.523 }, '치앙마이': { lat: 18.788, lng: 98.987 },
  '푸켓':   { lat: 7.953,  lng: 98.337  }, '파타야': { lat: 12.927, lng: 100.877 },
  '크라비': { lat: 8.086,  lng: 98.906  },
  // 베트남
  '하노이': { lat: 21.028, lng: 105.834 }, '호치민': { lat: 10.823, lng: 106.630 },
  '다낭':   { lat: 16.047, lng: 108.206 }, '나트랑': { lat: 12.238, lng: 109.197 },
  '호이안': { lat: 15.880, lng: 108.335 }, '푸꾸옥': { lat: 10.289, lng: 103.984 },
  '달랏':   { lat: 11.940, lng: 108.458 },
  // 인도네시아
  '발리':   { lat: -8.340, lng: 115.092 }, '자카르타': { lat: -6.208, lng: 106.846 },
  '롬복':   { lat: -8.565, lng: 116.351 },
  // 말레이시아
  '쿠알라룸푸르': { lat: 3.140, lng: 101.687 }, '페낭': { lat: 5.414, lng: 100.330 },
  '코타키나발루': { lat: 5.980, lng: 116.073 }, '랑카위': { lat: 6.350, lng: 99.800 },
  // 필리핀
  '마닐라': { lat: 14.599, lng: 120.984 }, '세부':   { lat: 10.315, lng: 123.885 },
  '보라카이': { lat: 11.968, lng: 121.924 }, '팔라완': { lat: 9.834, lng: 118.736 },
  // 싱가포르
  '싱가포르': { lat: 1.352, lng: 103.820 },
  // 대만
  '타이페이': { lat: 25.033, lng: 121.565 }, '타이중': { lat: 24.148, lng: 120.674 },
  '가오슝': { lat: 22.628, lng: 120.301 }, '화롄':   { lat: 23.991, lng: 121.601 },
  // 홍콩
  '홍콩':   { lat: 22.320, lng: 114.170 },
  // 중국
  '상하이': { lat: 31.230, lng: 121.473 }, '베이징': { lat: 39.904, lng: 116.407 },
  '청두':   { lat: 30.572, lng: 104.066 }, '시안':   { lat: 34.341, lng: 108.940 },
  '하이난': { lat: 20.017, lng: 110.349 },
  // 유럽
  '파리':   { lat: 48.857, lng: 2.347   }, '로마':   { lat: 41.902, lng: 12.496  },
  '밀라노': { lat: 45.465, lng: 9.186   }, '피렌체': { lat: 43.769, lng: 11.256  },
  '베네치아': { lat: 45.440, lng: 12.316 }, '나폴리': { lat: 40.851, lng: 14.268 },
  '바르셀로나': { lat: 41.385, lng: 2.173 }, '마드리드': { lat: 40.417, lng: -3.704 },
  '세비야': { lat: 37.389, lng: -5.984  }, '그라나다': { lat: 37.177, lng: -3.598 },
  '런던':   { lat: 51.507, lng: -0.128  }, '에든버러': { lat: 55.953, lng: -3.189 },
  '베를린': { lat: 52.520, lng: 13.405  }, '뮌헨':   { lat: 48.137, lng: 11.576  },
  '프랑크푸르트': { lat: 50.110, lng: 8.682 },
  '암스테르담': { lat: 52.370, lng: 4.895 }, '빈': { lat: 48.208, lng: 16.373 },
  '프라하': { lat: 50.076, lng: 14.438  }, '니스':   { lat: 43.710, lng: 7.262   },
  '리옹':   { lat: 45.750, lng: 4.845   },
  '취리히': { lat: 47.377, lng: 8.541   }, '제네바': { lat: 46.204, lng: 6.143   },
  '인터라켄': { lat: 46.686, lng: 7.863 }, '잘츠부르크': { lat: 47.804, lng: 13.045 },
  '리스본': { lat: 38.717, lng: -9.143  }, '포르투': { lat: 41.157, lng: -8.629  },
  '산토리니': { lat: 36.393, lng: 25.461 }, '아테네': { lat: 37.984, lng: 23.728 },
  '미코노스': { lat: 37.448, lng: 25.328 },
  '이스탄불': { lat: 41.015, lng: 28.979 }, '카파도키아': { lat: 38.644, lng: 34.829 },
  '안탈리아': { lat: 36.896, lng: 30.713 },
  '마라케시': { lat: 31.629, lng: -7.981 }, '페스':   { lat: 34.037, lng: -5.000  },
  '카사블랑카': { lat: 33.573, lng: -7.589 },
  // 미주
  '뉴욕':   { lat: 40.713, lng: -74.006 }, '로스앤젤레스': { lat: 34.052, lng: -118.244 },
  '라스베가스': { lat: 36.170, lng: -115.139 }, '하와이': { lat: 21.307, lng: -157.858 },
  '샌프란시스코': { lat: 37.774, lng: -122.419 }, '시카고': { lat: 41.879, lng: -87.636 },
  '밴쿠버': { lat: 49.283, lng: -123.121 }, '토론토': { lat: 43.651, lng: -79.383 },
  '퀘벡':   { lat: 46.813, lng: -71.208  },
  '멕시코시티': { lat: 19.433, lng: -99.133 }, '칸쿤': { lat: 21.161, lng: -86.851 },
  '리우데자네이루': { lat: -22.906, lng: -43.173 }, '상파울루': { lat: -23.550, lng: -46.633 },
  '부에노스아이레스': { lat: -34.603, lng: -58.382 },
  // 오세아니아
  '시드니': { lat: -33.869, lng: 151.209 }, '멜버른': { lat: -37.814, lng: 144.963 },
  '골드코스트': { lat: -28.017, lng: 153.400 }, '케언즈': { lat: -16.924, lng: 145.777 },
  '오클랜드': { lat: -36.848, lng: 174.763 }, '퀸즈타운': { lat: -45.031, lng: 168.663 },
  '크라이스트처치': { lat: -43.532, lng: 172.637 },
  // 남아시아·중동
  '몰디브': { lat: 3.202, lng: 73.220   }, '뭄바이': { lat: 19.076, lng: 72.878   },
  '뉴델리': { lat: 28.614, lng: 77.209  }, '고아':   { lat: 15.300, lng: 74.124   },
  '자이푸르': { lat: 26.912, lng: 75.787 }, '카트만두': { lat: 27.717, lng: 85.320 },
  '포카라': { lat: 28.210, lng: 83.986  },
};

function getDestinationCenter(destination: string, countryCode: string) {
  const clean = destination.replace(/^[^\s]+\s/, '');
  if (DESTINATION_COORDS[clean]) return DESTINATION_COORDS[clean];
  if (DESTINATION_COORDS[destination]) return DESTINATION_COORDS[destination];
  if (countryCode === 'KR') return { lat: 37.566, lng: 126.978 };
  return { lat: 35.676, lng: 139.650 };
}

const PIN_COLORS = ['#6366F1','#8B5CF6','#EC4899','#F97316','#EAB308','#10B981','#0EA5E9'];

const CATEGORY_LABELS: Record<string, string> = {
  attraction: '관광지', restaurant: '맛집', cafe: '카페',
  lodging: '숙소', shopping: '쇼핑', activity: '액티비티',
  beach: '해변', nature: '자연', culture: '문화',
  transport: '교통', etc: '기타',
};

function fmtStay(min: number) {
  if (!min) return null;
  const h = Math.floor(min / 60), m = min % 60;
  if (h > 0) return m > 0 ? `${h}시간 ${m}분` : `${h}시간`;
  return `${m}분`;
}

// 팀원 커서 색상 풀
const CURSOR_COLORS = ['#6366F1','#EC4899','#10B981','#F97316','#0EA5E9','#8B5CF6'];

export default function RoomEditor({ initialRoom, initialMarkers, currentMember }: Props) {
  const [room,           setRoom]           = useState(initialRoom);
  const [selectedId,     setSelectedId]     = useState<number | null>(null);
  const [isLocked,       setIsLocked]       = useState(initialRoom.is_locked);
  const isOwner = currentMember?.role === 'owner';
  const [onlineUsers,    setOnlineUsers]    = useState<Map<string, any>>(new Map());
  const [mobileView,     setMobileView]     = useState<'map' | 'list'>('map');
  const [activeDay,      setActiveDay]      = useState<number | 'all'>(1);
  const [previewPlace,   setPreviewPlace]   = useState<{ lat: number; lng: number; name: string } | null>(null);
  const [saveStatus,     setSaveStatus]     = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  const mapConfig      = getMapConfig(room.country_code);
  const pendingTempIds = useRef(new Set<string>());
  const debouncer      = useRef(new RouteDebouncer(1500));
  const saveTimer      = useRef<ReturnType<typeof setTimeout>>();

  const {
    markers: markerMap,
    loadMarkers,
    addMarkerOptimistic,
    updateMarkerOptimistic,
    removeMarkerOptimistic,
    reorderMarkerOptimistic,
    applyRealtimeEvent,
    setRouteSegment,
    getMarkersByDay,
  } = useMarkerStore();

  // ── 초기 로드 ────────────────────────────────────────────────────
  useEffect(() => {
    // Zustand 스토어에 SSR 초기 데이터 주입
    const map = new Map<number, Marker>();
    initialMarkers.forEach(m => map.set(m.id, m));
    useMarkerStore.setState({ markers: map });
  }, []);

  // ── 지도 SDK 로드 ────────────────────────────────────────────────
  useEffect(() => {
    loadMapSdk(mapConfig).catch(console.error);
  }, [mapConfig]);

  // ── 실시간 동기화 ────────────────────────────────────────────────
  const { broadcastCursor } = useRoomSync(room.id, {
    currentUserId:   currentMember?.user_id ?? null,
    currentNickname: (currentMember as any)?.users?.nickname ?? '여행자',
    currentColor:    currentMember?.cursor_color ?? CURSOR_COLORS[0],
    pendingTempIds,

    onMarkerEvent: (event) => {
      applyRealtimeEvent(event);
      // 마커 변경 후 경로 재계산 (디바운스)
      triggerRouteRecalc();
    },

    onPresenceEvent: (event) => {
      setOnlineUsers(prev => {
        const next = new Map(prev);
        if (event.type === 'MEMBER_JOINED') {
          next.set(event.payload.userId, event.payload);
        } else if (event.type === 'MEMBER_LEFT') {
          next.delete(event.payload.userId);
        }
        return next;
      });
    },

    onRoomEvent: (event) => {
      if (event.type === 'ROOM_LOCKED')   setIsLocked(true);
      if (event.type === 'ROOM_UNLOCKED') setIsLocked(false);
      if (event.type === 'ROOM_PUBLIC_TOGGLED') {
        setRoom(prev => ({ ...prev, is_public: event.payload.isPublic }));
      }
    },
  });

  // ── 경로 재계산 ──────────────────────────────────────────────────
  const triggerRouteRecalc = useCallback(() => {
    const allMarkers = [...markerMap.values()]
      .filter(m => m.id > 0)
      .sort((a, b) => a.day_number - b.day_number || a.order_index - b.order_index);

    if (allMarkers.length < 2) return;

    debouncer.current.schedule(
      {
        markers:     allMarkers.map(m => ({ lat: m.lat, lng: m.lng, name: m.name })),
        mode:        'DRIVING',
        countryCode: room.country_code,
      },
      (segments: RouteSegment[]) => {
        segments.forEach((seg, i) => {
          if (allMarkers[i + 1]) setRouteSegment(allMarkers[i + 1].id, seg);
        });
      },
    );
  }, [markerMap, room.country_code]);

  // route 세그먼트 변경은 제외하고 위치/순서 변경만 감지
  const markerPositionKey = useMemo(() => {
    return [...markerMap.values()]
      .filter(m => m.id > 0)
      .sort((a, b) => a.day_number - b.day_number || a.order_index - b.order_index)
      .map(m => `${m.id}:${m.order_index}:${m.lat}:${m.lng}`)
      .join('|');
  }, [markerMap]);

  useEffect(() => {
    triggerRouteRecalc();
  }, [markerPositionKey]);

  // ── 장소 추가 핸들러 ─────────────────────────────────────────────
  const handleAddPlace = useCallback(async (placeData: {
    name:      string;
    address:   string;
    lat:       number;
    lng:       number;
    category:  string;
    dayNumber: number;
    googlePlaceId?: string;
    kakaoPlaceId?:  string;
  }) => {
    if (isLocked) return;

    await addMarkerOptimistic({
      room_id:        room.id,
      day_number:     placeData.dayNumber,
      name:           placeData.name,
      address:        placeData.address,
      lat:            placeData.lat,
      lng:            placeData.lng,
      category:       placeData.category as any,
      stay_minutes:   60,
      visit_time:     null,
      memo:           null,
      booking_url:    null,
      image_url:      null,
      phone:          null,
      google_place_id: placeData.googlePlaceId ?? null,
      kakao_place_id:  placeData.kakaoPlaceId  ?? null,
      added_by_user:  currentMember?.user_id   ?? null,
      added_by_guest: null,
    });
  }, [isLocked, room.id, currentMember]);

  // ── 저장 상태 래퍼 ──────────────────────────────────────────────
  const showSaveStatus = useCallback((status: 'saving' | 'saved' | 'error') => {
    setSaveStatus(status);
    if (status !== 'saving') {
      clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => setSaveStatus('idle'), status === 'error' ? 3000 : 2000);
    }
  }, []);

  const handleRemoveMarker = useCallback(async (id: number) => {
    if (selectedId === id) setSelectedId(null);
    showSaveStatus('saving');
    try {
      await removeMarkerOptimistic(id);
      showSaveStatus('saved');
    } catch {
      showSaveStatus('error');
    }
  }, [removeMarkerOptimistic, selectedId, showSaveStatus]);

  const handleReorderMarker = useCallback(async (id: number, dayNumber: number, afterIdx: number | null) => {
    showSaveStatus('saving');
    try {
      await reorderMarkerOptimistic(id, dayNumber, afterIdx);
      showSaveStatus('saved');
    } catch {
      showSaveStatus('error');
    }
  }, [reorderMarkerOptimistic, showSaveStatus]);

  const handleUpdateMarker = useCallback(async (id: number, patch: Partial<MarkerWithRoute>) => {
    showSaveStatus('saving');
    try {
      await updateMarkerOptimistic(id, patch);
      showSaveStatus('saved');
      // Day 변경 시 해당 탭으로 자동 전환 → 패널이 닫히지 않고 이동된 위치에서 유지
      if (patch.day_number !== undefined) {
        setActiveDay(patch.day_number);
      }
    } catch (err) {
      showSaveStatus('error');
      throw err;  // PlaceEditPanel의 catch 블록으로 전파
    }
  }, [updateMarkerOptimistic, showSaveStatus]);

  // ── 제휴 링크 (구간별) ───────────────────────────────────────────
  const getRouteAffiliate = useCallback((routeIndex: number, durationMin: number) => {
    return getPrimaryAffiliate(
      { room, markers: [...markerMap.values()], routeIndex, durationMinutes: durationMin },
      'ROUTE_INFO_BANNER',
    );
  }, [room, markerMap]);

  // ── 여행 전체 일수 (startDate/endDate 기준, 없으면 nights+1) ────
  const totalDays = useMemo(() => {
    let fromConfig = 1;
    if (room.start_date && room.end_date) {
      const start = new Date(room.start_date);
      const end   = new Date(room.end_date);
      const diff  = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
      fromConfig = Math.max(1, diff + 1);
    } else if (room.nights > 0) {
      fromConfig = room.nights + 1;
    }
    // 실제 마커의 최대 day_number도 항상 반영 (날짜 설정과 무관하게)
    let maxMarkerDay = 1;
    markerMap.forEach(m => { if (m.id > 0 && m.day_number > maxMarkerDay) maxMarkerDay = m.day_number; });
    return Math.max(fromConfig, maxMarkerDay);
  }, [room.start_date, room.end_date, room.nights, markerMap]);

  const displayMarkers = useMemo<MarkerWithRoute[]>(() => {
    if (activeDay === 'all') {
      return [...markerMap.values()]
        .filter(m => m.id !== 0)
        .sort((a, b) => a.day_number - b.day_number || a.order_index - b.order_index);
    }
    return [...markerMap.values()]
      .filter(m => m.day_number === activeDay && m.id !== 0)
      .sort((a, b) => a.order_index - b.order_index);
  }, [activeDay, markerMap]);

  const selectedMarker = selectedId ? markerMap.get(selectedId) ?? null : null;
  const selectedIndex  = selectedMarker
    ? displayMarkers.findIndex(m => m.id === selectedMarker.id)
    : -1;

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50 font-sans">

      {/* ── 사이드바 (데스크톱: 항상 표시 / 모바일: list 뷰일 때만) ── */}
      <div className={`
        h-full
        md:block md:w-auto md:flex-shrink-0
        ${mobileView === 'list' ? 'block w-full' : 'hidden md:block'}
      `}>
        <Sidebar
          room={room}
          markers={displayMarkers}
          isLocked={isLocked}
          isOwner={isOwner}
          onlineCount={onlineUsers.size + 1}
          onAddPlace={handleAddPlace}
          onRemoveMarker={handleRemoveMarker}
          onReorderMarker={handleReorderMarker}
          onSelectMarker={setSelectedId}
          selectedMarkerId={selectedId}
          getRouteAffiliate={getRouteAffiliate}
          countryCode={room.country_code}
          activeDay={activeDay}
          totalDays={totalDays}
          startDate={room.start_date ?? null}
          onDayChange={setActiveDay}
          onPreviewPlace={setPreviewPlace}
          saveStatus={saveStatus}
          onShowMap={() => setMobileView('map')}
        />
      </div>

      {/* ── 지도 영역 (데스크톱: 항상 표시 / 모바일: map 뷰일 때만) ── */}
      <div className={`
        flex-1 relative overflow-hidden
        ${mobileView === 'map' ? 'block' : 'hidden md:block'}
      `}>
        <MapCanvas
          markers={displayMarkers}
          selectedId={selectedId}
          onSelectMarker={setSelectedId}
          mapConfig={mapConfig}
          centerLat={getDestinationCenter(room.destination ?? '', room.country_code ?? 'KR').lat}
          centerLng={getDestinationCenter(room.destination ?? '', room.country_code ?? 'KR').lng}
          onCursorMove={broadcastCursor}
          previewMarker={previewPlace}
        />

        {/* 장소 상세/편집 패널 */}
        <AnimatePresence>
          {selectedMarker && selectedIndex >= 0 && (
            <PlaceEditPanel
              key={selectedMarker.id}
              marker={selectedMarker}
              index={selectedIndex}
              room={room}
              totalDays={totalDays}
              isLocked={isLocked}
              isOwner={isOwner}
              mobileView={mobileView}
              onClose={() => setSelectedId(null)}
              onUpdate={handleUpdateMarker}
            />
          )}
        </AnimatePresence>

        {/* 모바일 지도 뷰 — 마커 정보 칩 */}
        <AnimatePresence>
          {mobileView === 'map' && selectedMarker && selectedIndex >= 0 && (
            <motion.div
              key={`chip-${selectedMarker.id}`}
              initial={{ opacity: 0, y: -10, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -6, scale: 0.96 }}
              transition={{ type: 'spring', damping: 25, stiffness: 350 }}
              className="md:hidden absolute top-3 left-3 right-3 z-[100]"
            >
              <div className="bg-white/96 backdrop-blur-sm rounded-[18px] px-3.5 py-3 shadow-[0_4px_20px_rgba(0,0,0,0.14)] border border-white/60 flex items-center gap-3">
                <div
                  style={{ background: `linear-gradient(135deg, ${PIN_COLORS[selectedIndex % PIN_COLORS.length]}, ${PIN_COLORS[selectedIndex % PIN_COLORS.length]}BB)` }}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-[12px] font-extrabold text-white shrink-0"
                >
                  {selectedIndex + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-extrabold text-slate-900 truncate leading-snug">
                    {selectedMarker.name}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-1 flex-wrap">
                    <span>{CATEGORY_LABELS[selectedMarker.category] ?? '기타'}</span>
                    <span>·</span>
                    <span>Day {selectedMarker.day_number}</span>
                    {selectedMarker.stay_minutes ? (
                      <><span>·</span><span>{fmtStay(selectedMarker.stay_minutes)}</span></>
                    ) : null}
                  </div>
                </div>
                <button
                  onClick={() => setMobileView('list')}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-violet-50 text-violet-600 text-[11px] font-bold shrink-0 hover:bg-violet-100 transition-colors"
                >
                  편집
                </button>
                <button
                  onClick={() => setSelectedId(null)}
                  className="w-7 h-7 flex items-center justify-center rounded-full bg-slate-100 text-slate-500 shrink-0"
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 모바일 — 목록 보기 버튼 */}
        <button
          onClick={() => setMobileView('list')}
          className="md:hidden absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2 px-5 py-3 rounded-full bg-white text-slate-800 font-bold text-sm shadow-[0_4px_20px_rgba(0,0,0,0.18)] z-10"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
          장소 목록
          {displayMarkers.length > 0 && (
            <span className="bg-indigo-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
              {displayMarkers.length}
            </span>
          )}
        </button>
      </div>

    </div>
  );
}
