'use client';
// ════════════════════════════════════════════════════════════════════
// RoomEditor — 실시간 협업 편집 메인 컴포넌트
// Supabase Realtime + 낙관적 업데이트 + 하이브리드 지도 연동
// ════════════════════════════════════════════════════════════════════
import { useEffect, useRef, useState, useCallback } from 'react';
import { useMarkerStore }     from '@/lib/realtime/markerStore';
import { useRoomSync }        from '@/lib/realtime/useRoomSync';
import { RouteDebouncer }     from '@/lib/maps/routeCalculator';
import { getMapConfig, loadMapSdk } from '@/lib/maps/mapEngineSelector';
import { getPrimaryAffiliate } from '@/lib/affiliate/affiliateRules';
import type { TripRoom, Marker, TripMember, RouteSegment } from '@/lib/supabase/types';
import Sidebar   from '@/components/sidebar/Sidebar';
import MapCanvas from '@/components/map/MapCanvas';
import InfoWindow from '@/components/InfoWindow';

interface Props {
  initialRoom:    TripRoom & { trip_members: any[] };
  initialMarkers: Marker[];
  currentMember:  TripMember | null;
}

// 팀원 커서 색상 풀
const CURSOR_COLORS = ['#6366F1','#EC4899','#10B981','#F97316','#0EA5E9','#8B5CF6'];

export default function RoomEditor({ initialRoom, initialMarkers, currentMember }: Props) {
  const [room,        setRoom]        = useState(initialRoom);
  const [selectedId,  setSelectedId]  = useState<number | null>(null);
  const [isLocked,    setIsLocked]    = useState(initialRoom.is_locked);
  const [onlineUsers, setOnlineUsers] = useState<Map<string, any>>(new Map());
  const [mode,        setMode]        = useState<'personal' | 'team'>(
    initialRoom.trip_members.length > 1 ? 'team' : 'personal'
  );

  const mapConfig     = getMapConfig(room.country_code);
  const pendingTempIds = useRef(new Set<string>());
  const debouncer      = useRef(new RouteDebouncer(1500));

  const {
    markers: markerMap,
    loadMarkers,
    addMarkerOptimistic,
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
    currentNickname: (currentMember as any)?.users?.nickname ?? currentMember?.guest_nickname ?? '게스트',
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
          if (allMarkers[i]) setRouteSegment(allMarkers[i].id, seg);
        });
      },
    );
  }, [markerMap, room.country_code]);

  useEffect(() => {
    triggerRouteRecalc();
  }, [markerMap.size]);

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
      added_by_guest: !currentMember?.user_id
        ? (currentMember?.guest_nickname ?? null) : null,
    });
  }, [isLocked, room.id, currentMember]);

  // ── 제휴 링크 (구간별) ───────────────────────────────────────────
  const getRouteAffiliate = useCallback((routeIndex: number, durationMin: number) => {
    return getPrimaryAffiliate(
      { room, markers: [...markerMap.values()], routeIndex, durationMinutes: durationMin },
      'ROUTE_INFO_BANNER',
    );
  }, [room, markerMap]);

  const day1Markers = getMarkersByDay(1);
  const selectedMarker = selectedId ? markerMap.get(selectedId) ?? null : null;
  const selectedIndex  = selectedMarker
    ? day1Markers.findIndex(m => m.id === selectedMarker.id)
    : -1;

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50 font-sans">
      {/* ── 사이드바 ── */}
      <Sidebar
        room={room}
        mode={mode}
        setMode={setMode}
        markers={day1Markers}
        isLocked={isLocked}
        onlineCount={onlineUsers.size + 1}
        onAddPlace={handleAddPlace}
        onRemoveMarker={removeMarkerOptimistic}
        onReorderMarker={reorderMarkerOptimistic}
        onSelectMarker={setSelectedId}
        selectedMarkerId={selectedId}
        getRouteAffiliate={getRouteAffiliate}
        countryCode={room.country_code}
      />

      {/* ── 지도 영역 ── */}
      <div className="flex-1 relative overflow-hidden">
        <MapCanvas
          markers={day1Markers}
          selectedId={selectedId}
          onSelectMarker={setSelectedId}
          mapConfig={mapConfig}
          centerLat={room.is_domestic ? 33.499 : 35.676}
          centerLng={room.is_domestic ? 126.531 : 139.650}
          onCursorMove={broadcastCursor}
        />

        {/* 인포윈도우 */}
        {selectedMarker && selectedIndex >= 0 && (
          <InfoWindow
            marker={selectedMarker}
            index={selectedIndex}
            room={room}
            onClose={() => setSelectedId(null)}
          />
        )}
      </div>
    </div>
  );
}
