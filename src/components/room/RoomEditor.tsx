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
import { getDestinationCenter } from '@/lib/maps/destinationCoords';
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
