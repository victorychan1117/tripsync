'use client';
import { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import {
  Navigation, UserPlus, Check, Loader2, AlertCircle,
  Plus, Lock, Search, X, ChevronLeft, MapPin, Map as MapIcon, Info,
} from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import PlaceCard      from './PlaceCard';
import RouteConnector from './RouteConnector';
import {
  DndContext, closestCenter, PointerSensor, useSensor, useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext, verticalListSortingStrategy,
  useSortable, arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { TripRoom, MarkerWithRoute } from '@/lib/supabase/types';
import type { AffiliateInsertion } from '@/lib/affiliate/affiliateRules';

interface Props {
  room:             TripRoom;
  markers:          MarkerWithRoute[];
  isLocked:         boolean;
  isOwner?:         boolean;
  onlineCount:      number;
  onAddPlace:       (data: any) => Promise<void>;
  onRemoveMarker:   (id: number) => Promise<void>;
  onReorderMarker:  (id: number, day: number, afterIdx: number | null) => Promise<void>;
  onSelectMarker:   (id: number | null) => void;
  selectedMarkerId: number | null;
  getRouteAffiliate:(idx: number, min: number) => AffiliateInsertion | null;
  countryCode:      string;
  // Day 탭 관련
  activeDay:       number | 'all';
  totalDays:       number;
  startDate:       string | null;
  onDayChange:     (day: number | 'all') => void;
  onPreviewPlace:  (place: { lat: number; lng: number; name: string } | null) => void;
  saveStatus?:     'idle' | 'saving' | 'saved' | 'error';
  onShowMap?:      () => void;
}

const PIN_COLORS = ['#6366F1','#8B5CF6','#EC4899','#F97316','#EAB308','#10B981','#0EA5E9'];

// ── 헬퍼 ─────────────────────────────────────────────────────────────
function HighlightText({ text, query }: { text: string; query: string }) {
  if (!query.trim()) return <>{text}</>;
  const lText  = text.toLowerCase();
  const lQuery = query.toLowerCase().trim();
  const idx    = lText.indexOf(lQuery);
  if (idx === -1) return <>{text}</>;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="bg-violet-100 text-violet-700 not-italic rounded-[3px] font-extrabold">
        {text.slice(idx, idx + lQuery.length)}
      </mark>
      {text.slice(idx + lQuery.length)}
    </>
  );
}

function getDayDate(startDate: string | null, dayNumber: number): string | null {
  if (!startDate) return null;
  const d = new Date(startDate);
  d.setDate(d.getDate() + (dayNumber - 1));
  return d.toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric' });
}

function formatMin(min: number): string {
  if (min === 0) return '';
  if (min >= 60) {
    const h = Math.floor(min / 60);
    const m = min % 60;
    return m > 0 ? `${h}시간 ${m}분` : `${h}시간`;
  }
  return `${min}분`;
}

// ── SortablePlaceCard ─────────────────────────────────────────────────
function SortablePlaceCard({ marker, index, color, isSelected, isLocked, isOwner, onSelect, onRemove, route, routeIndex, getRouteAffiliate }: any) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: marker.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} data-marker-id={marker.id}>
      <div className="flex items-start gap-1">
        {!isLocked && isOwner && marker.id > 0 && (
          <button
            {...attributes}
            {...listeners}
            className="mt-3 p-1 text-slate-300 hover:text-slate-500 cursor-grab active:cursor-grabbing"
            aria-label="장소 순서 변경"
          >
            <svg width="12" height="16" viewBox="0 0 12 16" fill="currentColor">
              <circle cx="4" cy="3" r="1.5"/><circle cx="8" cy="3" r="1.5"/>
              <circle cx="4" cy="8" r="1.5"/><circle cx="8" cy="8" r="1.5"/>
              <circle cx="4" cy="13" r="1.5"/><circle cx="8" cy="13" r="1.5"/>
            </svg>
          </button>
        )}
        <div className="flex-1">
          <PlaceCard
            marker={marker}
            index={index}
            color={color}
            isSelected={isSelected}
            isLocked={isLocked}
            isOwner={isOwner}
            onSelect={onSelect}
            onRemove={onRemove}
          />
          {route && (
            <RouteConnector
              segment={route}
              index={routeIndex}
              affiliate={getRouteAffiliate(routeIndex, Math.round((route.durationSec ?? 0) / 60))}
            />
          )}
        </div>
      </div>
    </div>
  );
}

// ── Sidebar ───────────────────────────────────────────────────────────
export default function Sidebar({
  room, markers, isLocked, isOwner = true, onlineCount,
  onAddPlace, onRemoveMarker, onReorderMarker, onSelectMarker, selectedMarkerId,
  getRouteAffiliate,
  activeDay, totalDays, startDate, onDayChange, onPreviewPlace,
  saveStatus = 'idle', onShowMap,
}: Props) {
  const canEdit = isOwner && !isLocked;
  const [copied,        setCopied]        = useState(false);
  const [showSearch,    setShowSearch]    = useState(false);
  const [searchQuery,   setSearchQuery]   = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching,     setSearching]     = useState(false);
  const inputRef  = useRef<HTMLInputElement>(null);
  const listRef   = useRef<HTMLDivElement>(null);
  const sensors   = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));
  const [pendingDeleteId, setPendingDeleteId] = useState<number | null>(null);

  const handleDeleteRequest = useCallback((id: number) => {
    setPendingDeleteId(id);
  }, []);

  // 지도 마커 클릭 시 해당 카드로 자동 스크롤
  useEffect(() => {
    if (!selectedMarkerId || !listRef.current) return;
    const el = listRef.current.querySelector(`[data-marker-id="${selectedMarkerId}"]`);
    el?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [selectedMarkerId]);

  // totalDays로 Day 탭 목록 생성 (마커 유무와 무관하게 고정)
  const dayTabs = useMemo(() => Array.from({ length: totalDays }, (_, i) => i + 1), [totalDays]);

  // "전체" 탭용 Day별 마커 그룹핑
  const markersByDay = useMemo(() => {
    const map = new Map<number, MarkerWithRoute[]>();
    markers.forEach(m => {
      if (!map.has(m.day_number)) map.set(m.day_number, []);
      map.get(m.day_number)!.push(m);
    });
    return map;
  }, [markers]);

  // DnD 핸들러 (특정 마커 리스트 기준)
  const handleDragEndWith = useCallback((list: MarkerWithRoute[]) => (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = list.findIndex(m => m.id === active.id);
    const newIndex = list.findIndex(m => m.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    const afterOrderIndex = newIndex > 0 ? list[newIndex - 1].order_index : null;
    onReorderMarker(Number(active.id), list[oldIndex].day_number, afterOrderIndex);
  }, [onReorderMarker]);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    handleDragEndWith(markers)(event);
  }, [markers, handleDragEndWith]);

  // ── 통계 (현재 표시 중인 마커 기준) ────────────────────────────
  const totalMovMin  = markers.reduce((s, m) => s + (m.route?.durationSec ? Math.round(m.route.durationSec / 60) : 0), 0);
  const totalKm      = markers.reduce((s, m) => s + (m.route?.distanceM   ? m.route.distanceM / 1000 : 0), 0);
  const totalStayMin = markers.reduce((s, m) => s + (m.stay_minutes ?? 0), 0);

  const handleCopyCode = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(`${process.env.NEXT_PUBLIC_APP_URL}/room/${room.id}`);
    } catch {}
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [room.id]);

  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim()) return;
    setSearching(true);
    try {
      const dest = room.destination ?? '';
      const COORDS: Record<string, { lat: number; lng: number }> = {
        '푸꾸옥': { lat: 10.289, lng: 103.984 }, '나트랑': { lat: 12.238, lng: 109.197 },
        '다낭':   { lat: 16.047, lng: 108.206 }, '호치민': { lat: 10.823, lng: 106.630 },
        '하노이': { lat: 21.028, lng: 105.834 }, '방콕':   { lat: 13.736, lng: 100.523 },
        '도쿄':   { lat: 35.676, lng: 139.650 }, '오사카': { lat: 34.693, lng: 135.502 },
        '발리':   { lat: -8.340, lng: 115.092 }, '싱가포르': { lat: 1.352, lng: 103.820 },
        '파리':   { lat: 48.857, lng: 2.347   }, '런던':   { lat: 51.507, lng: -0.128  },
      };
      const coord = COORDS[dest];
      const locParam = coord ? `&lat=${coord.lat}&lng=${coord.lng}` : '';
      const res = await fetch(`/api/places?q=${encodeURIComponent(searchQuery)}&country=${room.country_code}${locParam}`);
      const data = await res.json();
      setSearchResults(data.places ?? []);
    } catch {
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  }, [searchQuery, room.country_code, room.destination]);

  const handleSelectPlace = useCallback(async (place: any) => {
    if (!canEdit) return;
    const categoryMap: Record<string, string> = {
      'FD6': 'restaurant', 'CE7': 'cafe', 'AT4': 'attraction',
      'AC5': 'lodging',    'CS2': 'shopping', 'CT1': 'culture',
    };
    const category = categoryMap[place.category_group_code] ?? 'etc';
    // 현재 선택된 Day에 추가, 전체 탭이면 Day 1에 추가
    const dayNumber = activeDay === 'all' ? 1 : activeDay;
    await onAddPlace({
      name:     place.place_name,
      address:  place.road_address_name || place.address_name,
      lat:      parseFloat(place.y),
      lng:      parseFloat(place.x),
      category,
      dayNumber,
      kakaoPlaceId: place.id,
    });
    setShowSearch(false);
    setSearchQuery('');
    setSearchResults([]);
  }, [isLocked, onAddPlace, activeDay]);

  // ── 통계 문구 ────────────────────────────────────────────────────
  const statParts: string[] = [`${markers.length}개 장소`];
  if (totalMovMin > 0) statParts.push(`이동 ${formatMin(totalMovMin)}`);
  if (totalKm > 0)     statParts.push(`총 ${totalKm.toFixed(1)}km`);
  if (totalStayMin > 0) statParts.push(`체류 ${formatMin(totalStayMin)}`);
  const statText = statParts.join(' · ');

  return (
    <aside className="w-[400px] min-w-[400px] h-full bg-white border-r border-slate-100 flex flex-col shadow-[4px_0_24px_rgba(0,0,0,0.04)] z-10">

      {/* ── 헤더 ──────────────────────────────────────────────── */}
      <div className="px-[18px] pt-[14px] pb-3 border-b border-slate-100">

        {/* 뒤로가기 */}
        <Link
          href="/my/trips"
          className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-slate-400 hover:text-violet-500 transition-colors mb-3"
        >
          <ChevronLeft size={14} />
          여행 일지
        </Link>

        {/* 타이틀 + 초대 버튼 */}
        <div className="flex items-center gap-2.5 mb-2.5">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-500 flex items-center justify-center shadow-sm shrink-0">
            <Navigation size={19} className="text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[15px] font-extrabold text-slate-900 leading-tight truncate">
              {room.title}
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5 truncate">
              {statText}
            </div>
          </div>
          {isOwner && (
            <button
              onClick={handleCopyCode}
              aria-label="초대 링크 복사"
              className={cn(
                'flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all duration-200 shrink-0',
                copied
                  ? 'bg-emerald-500 text-white shadow-sm'
                  : 'bg-gradient-to-br from-violet-500 to-indigo-500 text-white shadow-sm hover:-translate-y-0.5',
              )}
            >
              {copied
                ? <><Check size={13} />복사됨!</>
                : <><UserPlus size={13} />초대</>
              }
            </button>
          )}
        </div>

        {/* 저장 상태 표시 */}
        {saveStatus !== 'idle' && (
          <div className={cn(
            'flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1.5 rounded-xl mb-1',
            saveStatus === 'saving' ? 'bg-violet-50 text-violet-500' :
            saveStatus === 'saved'  ? 'bg-emerald-50 text-emerald-600' :
            'bg-red-50 text-red-500',
          )}>
            {saveStatus === 'saving' && <Loader2 size={11} className="animate-spin" />}
            {saveStatus === 'saved'  && <Check size={11} />}
            {saveStatus === 'error'  && <AlertCircle size={11} />}
            {saveStatus === 'saving' ? '저장 중...' :
             saveStatus === 'saved'  ? '방금 저장됨' :
             '저장 실패, 다시 시도해주세요'}
          </div>
        )}

        {/* 잠금 배너 */}
        {isLocked && (
          <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 mb-1">
            <Lock size={13} className="text-amber-600" />
            <span className="text-xs font-semibold text-amber-700">
              여행장이 일정을 확정했어요 (편집 잠금)
            </span>
          </div>
        )}
        {/* 보기 전용 배너 */}
        {!isOwner && !isLocked && (
          <div className="flex items-center gap-2 bg-sky-50 border border-sky-100 rounded-xl px-3 py-2 mb-1">
            <Info size={13} className="text-sky-500 shrink-0" />
            <span className="text-xs font-semibold text-sky-700">
              동행으로 참여 중이에요. 일정은 여행장만 수정할 수 있어요.
            </span>
          </div>
        )}
      </div>

      {/* ── Day 탭 ────────────────────────────────────────────── */}
      <div className="relative">
        <div className="flex gap-1.5 overflow-x-auto [scrollbar-width:none] [-webkit-overflow-scrolling:touch] px-4 py-2.5 border-b border-slate-50">
          {/* 전체 탭 */}
          <button
            onClick={() => onDayChange('all')}
            className={cn(
              'flex-shrink-0 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all duration-150',
              activeDay === 'all'
                ? 'bg-violet-500 text-white shadow-sm'
                : 'bg-slate-100 text-slate-400 hover:bg-violet-50 hover:text-violet-500',
            )}
          >
            전체
          </button>

          {/* Day별 탭 (startDate/endDate 기준으로 고정 생성) */}
          {dayTabs.map(day => {
            const date   = getDayDate(startDate, day);
            const active = activeDay === day;
            const count  = markersByDay.get(day)?.length ?? 0;
            return (
              <button
                key={day}
                onClick={() => onDayChange(day)}
                className={cn(
                  'flex-shrink-0 flex flex-col items-center px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all duration-150',
                  active
                    ? 'bg-violet-500 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-400 hover:bg-violet-50 hover:text-violet-500',
                )}
              >
                <span>Day {day}{count > 0 && !active && <span className="ml-1 text-[9px] opacity-60">{count}</span>}</span>
                {date && (
                  <span className={cn('text-[9px] font-semibold mt-0.5', active ? 'text-violet-200' : 'text-slate-400')}>
                    {date}
                  </span>
                )}
              </button>
            );
          })}
        </div>
        {/* 모바일: 오른쪽 그라디언트 페이드 — 스크롤 힌트 */}
        <div className="md:hidden pointer-events-none absolute right-0 top-0 bottom-[1px] w-10 bg-gradient-to-l from-white to-transparent" />
      </div>

      {/* ── 장소 리스트 ──────────────────────────────────────── */}
      <div ref={listRef} className="flex-1 overflow-y-auto px-4 pt-3.5 pb-2">
        {/* 전체 탭 — Day별 그룹 렌더링 */}
        {activeDay === 'all' ? (
          markers.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center py-12 gap-4">
              <div className="w-16 h-16 rounded-2xl bg-violet-50 flex items-center justify-center">
                <MapPin size={26} className="text-violet-300" />
              </div>
              <div>
                <p className="text-[14px] font-extrabold text-slate-600 mb-1.5">아직 추가된 장소가 없어요 📍</p>
                <p className="text-[12px] text-slate-400 leading-relaxed">
                  Day 탭을 선택해 장소를 추가해보세요.
                </p>
              </div>
              {canEdit && (
                <button
                  onClick={() => { setShowSearch(true); setSearchResults([]); }}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-violet-500 text-white text-xs font-bold shadow-sm hover:bg-violet-600 transition-colors"
                >
                  <Plus size={14} />
                  첫 장소 추가하기
                </button>
              )}
            </div>
          ) : (
            <div className="flex flex-col gap-4 pb-2">
              {dayTabs.map(day => {
                const dayMarkers = markersByDay.get(day) ?? [];
                const date = getDayDate(startDate, day);
                return (
                  <div key={day}>
                    {/* Day 그룹 헤더 */}
                    <div className="flex items-center gap-2 mb-2">
                      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-violet-50">
                        <span className="text-[11px] font-extrabold text-violet-600">Day {day}</span>
                        {date && <span className="text-[10px] font-semibold text-violet-400">{date}</span>}
                      </div>
                      <span className="text-[10px] text-slate-400 font-medium">{dayMarkers.length}개 장소</span>
                      {canEdit && (
                        <button
                          onClick={() => { onDayChange(day); setShowSearch(true); setSearchResults([]); }}
                          className="ml-auto text-[10px] font-bold text-violet-500 hover:text-violet-700 transition-colors flex items-center gap-0.5"
                        >
                          <Plus size={11} />
                          추가
                        </button>
                      )}
                    </div>

                    {dayMarkers.length === 0 ? (
                      <div className="px-3 py-3 rounded-xl border border-dashed border-slate-200 text-center">
                        <p className="text-[11px] text-slate-400">아직 장소가 없어요</p>
                      </div>
                    ) : (
                      <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragEnd={handleDragEndWith(dayMarkers)}
                      >
                        <SortableContext items={dayMarkers.map(m => m.id)} strategy={verticalListSortingStrategy}>
                          {dayMarkers.map((marker, i) => (
                            <SortablePlaceCard
                              key={marker.id}
                              marker={marker}
                              index={i}
                              color={PIN_COLORS[i % PIN_COLORS.length]}
                              isSelected={selectedMarkerId === marker.id}
                              isLocked={isLocked}
                              isOwner={isOwner}
                              onSelect={() => onSelectMarker(marker.id)}
                              onRemove={() => handleDeleteRequest(marker.id)}
                              route={i < dayMarkers.length - 1 ? dayMarkers[i + 1].route : null}
                              routeIndex={i}
                              getRouteAffiliate={getRouteAffiliate}
                            />
                          ))}
                        </SortableContext>
                      </DndContext>
                    )}
                  </div>
                );
              })}
            </div>
          )
        ) : (
          /* 특정 Day 탭 — 해당 Day 마커만 단일 DnD */
          markers.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center py-12 gap-4">
              <div className="w-16 h-16 rounded-2xl bg-violet-50 flex items-center justify-center">
                <MapPin size={26} className="text-violet-300" />
              </div>
              <div>
                <p className="text-[14px] font-extrabold text-slate-600 mb-1.5">
                  Day {activeDay}에 아직 장소가 없어요 📍
                </p>
                <p className="text-[12px] text-slate-400 leading-relaxed">
                  가고 싶은 장소를 하나씩 담아보세요.
                </p>
              </div>
              {canEdit && (
                <button
                  onClick={() => { setShowSearch(true); setSearchResults([]); }}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-violet-500 text-white text-xs font-bold shadow-sm hover:bg-violet-600 transition-colors"
                >
                  <Plus size={14} />
                  첫 장소 추가하기
                </button>
              )}
            </div>
          ) : (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={markers.map(m => m.id)} strategy={verticalListSortingStrategy}>
                {markers.map((marker, i) => (
                  <SortablePlaceCard
                    key={marker.id}
                    marker={marker}
                    index={i}
                    color={PIN_COLORS[i % PIN_COLORS.length]}
                    isSelected={selectedMarkerId === marker.id}
                    isLocked={isLocked}
                    isOwner={isOwner}
                    onSelect={() => onSelectMarker(marker.id)}
                    onRemove={() => handleDeleteRequest(marker.id)}
                    route={i < markers.length - 1 ? markers[i + 1].route : null}
                    routeIndex={i}
                    getRouteAffiliate={getRouteAffiliate}
                  />
                ))}
              </SortableContext>
            </DndContext>
          )
        )}
      </div>

      {/* ── 데스크톱: 장소 검색 패널 ────────────────────────── */}
      {showSearch && (
        <div className="hidden md:block px-4 pt-3 pb-2 border-t border-slate-100">
          <div className="flex gap-2 mb-2">
            <div className="flex-1 flex items-center border-2 border-slate-200 rounded-xl overflow-hidden focus-within:border-violet-400 transition-colors">
              <Search size={15} className="ml-3 text-slate-400 shrink-0" />
              <input
                ref={inputRef}
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSearch()}
                placeholder="장소 이름을 검색해보세요"
                className="flex-1 px-2 py-2.5 text-sm outline-none bg-transparent"
                autoFocus
              />
            </div>
            <button
              onClick={handleSearch}
              className="px-3 py-2 bg-violet-500 text-white rounded-xl text-sm font-bold hover:bg-violet-600 transition-colors"
            >
              검색
            </button>
            <button
              onClick={() => { setShowSearch(false); setSearchResults([]); setSearchQuery(''); }}
              className="px-2 py-2 text-slate-400 hover:text-slate-600 transition-colors"
              aria-label="검색 닫기"
            >
              <X size={16} />
            </button>
          </div>

          {searching && (
            <p className="text-xs text-slate-400 text-center py-2">검색 중...</p>
          )}

          {searchResults.length > 0 && (
            <div className="max-h-[280px] overflow-y-auto flex flex-col gap-1.5 pb-2">
              {searchResults.map(place => (
                <button
                  key={place.id}
                  onClick={() => handleSelectPlace(place)}
                  onMouseEnter={() => onPreviewPlace({
                    lat:  parseFloat(place.y),
                    lng:  parseFloat(place.x),
                    name: place.place_name,
                  })}
                  onMouseLeave={() => onPreviewPlace(null)}
                  className="w-full text-left px-3 py-2.5 rounded-xl bg-slate-50 hover:bg-violet-50 hover:border-violet-200 border border-transparent transition-all"
                >
                  <div className="text-sm font-bold text-slate-900 truncate">
                    <HighlightText text={place.place_name} query={searchQuery} />
                  </div>
                  <div className="text-[11px] text-slate-400 truncate mt-0.5">
                    {place.category_group_name && (
                      <span className="text-violet-500 font-medium mr-1">{place.category_group_name} ·</span>
                    )}
                    {place.road_address_name || place.address_name}
                  </div>
                </button>
              ))}
            </div>
          )}

          {!searching && searchResults.length === 0 && searchQuery && (
            <p className="text-xs text-slate-400 text-center py-2">검색 결과가 없어요</p>
          )}
        </div>
      )}

      {/* ── 데스크톱: 장소 추가 버튼 ────────────────────────── */}
      {!showSearch && (
        <div className="hidden md:block px-4 pt-3 pb-5 border-t border-slate-50">
          {canEdit ? (
            <button
              onClick={() => { setShowSearch(true); setSearchResults([]); }}
              className={cn(
                'w-full flex items-center justify-center gap-2 py-[13px] rounded-[14px]',
                'text-white text-sm font-bold transition-all duration-200',
                'bg-gradient-to-br from-violet-500 to-indigo-500 shadow-sm',
                'hover:-translate-y-0.5 hover:shadow-md',
              )}
            >
              <Plus size={18} />
              {activeDay === 'all' ? '장소 추가하기' : `Day ${activeDay}에 장소 추가하기`}
            </button>
          ) : (
            <div className={cn(
              'w-full flex items-center justify-center gap-2 py-[13px] rounded-[14px]',
              'text-sm font-bold',
              isLocked
                ? 'bg-amber-50 text-amber-600 border border-amber-200'
                : 'bg-sky-50 text-sky-600 border border-sky-100',
            )}>
              {isLocked ? '잠금 상태 (편집 불가)' : '보기 전용 모드'}
            </div>
          )}
        </div>
      )}

      {/* ── 모바일: 하단 액션 영역 ──────────────────────────── */}
      <div className="md:hidden shrink-0 border-t border-slate-100">
        {showSearch ? (
          /* 검색 모드 */
          <div
            className="px-4 pt-3"
            style={{ paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}
          >
            <div className="flex gap-2 mb-2">
              <div className="flex-1 flex items-center border-2 border-slate-200 rounded-xl overflow-hidden focus-within:border-violet-400 transition-colors">
                <Search size={15} className="ml-3 text-slate-400 shrink-0" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSearch()}
                  placeholder="장소를 검색해보세요"
                  className="flex-1 px-2 py-2.5 text-sm outline-none bg-transparent"
                  autoFocus
                />
              </div>
              <button
                onClick={handleSearch}
                className="px-3 py-2 bg-violet-500 text-white rounded-xl text-sm font-bold"
              >
                검색
              </button>
              <button
                onClick={() => { setShowSearch(false); setSearchResults([]); setSearchQuery(''); }}
                className="px-2 py-2 text-slate-400"
                aria-label="검색 닫기"
              >
                <X size={16} />
              </button>
            </div>

            {searching && <p className="text-xs text-slate-400 text-center py-2">검색 중...</p>}

            {searchResults.length > 0 && (
              <div className="max-h-[38vh] overflow-y-auto flex flex-col gap-1.5 pb-2">
                {searchResults.map(place => (
                  <button
                    key={place.id}
                    onClick={() => handleSelectPlace(place)}
                    className="w-full text-left px-3 py-2.5 rounded-xl bg-slate-50 hover:bg-violet-50 border border-transparent hover:border-violet-200 transition-all"
                  >
                    <div className="text-sm font-bold text-slate-900 truncate">
                    <HighlightText text={place.place_name} query={searchQuery} />
                  </div>
                    <div className="text-[11px] text-slate-400 truncate mt-0.5">
                      {place.category_group_name && (
                        <span className="text-violet-500 font-medium mr-1">{place.category_group_name} ·</span>
                      )}
                      {place.road_address_name || place.address_name}
                    </div>
                  </button>
                ))}
              </div>
            )}

            {!searching && searchResults.length === 0 && searchQuery && (
              <p className="text-xs text-slate-400 text-center py-2">검색 결과가 없어요</p>
            )}
          </div>
        ) : (
          /* 기본 모드: 장소 추가 + 지도 보기 */
          <div
            className="flex gap-2 px-4 pt-3"
            style={{ paddingBottom: 'max(20px, env(safe-area-inset-bottom))' }}
          >
            {canEdit ? (
              <button
                onClick={() => { setShowSearch(true); setSearchResults([]); }}
                className="flex-1 flex items-center justify-center gap-1.5 min-h-[48px] rounded-2xl text-sm font-bold bg-gradient-to-r from-violet-500 to-indigo-500 text-white shadow-sm transition-all duration-200"
              >
                <Plus size={16} />
                {activeDay === 'all' ? '장소 추가' : `Day ${activeDay}에 추가`}
              </button>
            ) : (
              <div className={cn(
                'flex-1 flex items-center justify-center gap-1.5 min-h-[48px] rounded-2xl text-sm font-bold',
                isLocked
                  ? 'bg-amber-50 text-amber-600 border border-amber-200'
                  : 'bg-sky-50 text-sky-600 border border-sky-100',
              )}>
                {isLocked ? '잠금 상태' : '보기 전용'}
              </div>
            )}
            {onShowMap && (
              <button
                onClick={onShowMap}
                className="flex items-center gap-1.5 min-h-[48px] px-4 rounded-2xl bg-slate-100 text-slate-700 text-sm font-bold hover:bg-slate-200 transition-colors"
              >
                <MapIcon size={16} />
                지도
              </button>
            )}
          </div>
        )}
      </div>

      {/* ── 삭제 확인 다이얼로그 ─────────────────────────────── */}
      {pendingDeleteId !== null && (
        <div
          className="fixed inset-0 bg-black/50 z-[500] flex items-end md:items-center justify-center"
          onClick={() => setPendingDeleteId(null)}
        >
          <div
            className="bg-white w-full md:w-[360px] rounded-t-3xl md:rounded-2xl p-6 shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="md:hidden flex justify-center mb-4">
              <div className="w-10 h-1 bg-slate-200 rounded-full" />
            </div>
            <div className="text-[16px] font-extrabold text-slate-900 mb-1.5">
              이 장소를 삭제할까요?
            </div>
            <p className="text-[13px] text-slate-500 mb-5">
              삭제하면 일정에서 제거돼요.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPendingDeleteId(null)}
                className="flex-1 py-3 rounded-2xl text-sm font-bold bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
              >
                취소
              </button>
              <button
                onClick={() => {
                  if (pendingDeleteId !== null) onRemoveMarker(pendingDeleteId);
                  setPendingDeleteId(null);
                }}
                className="flex-1 py-3 rounded-2xl text-sm font-bold bg-red-500 text-white hover:bg-red-600 transition-colors"
              >
                삭제하기
              </button>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
