'use client';
import { useState, useCallback, useRef } from 'react';
import {
  Navigation, User, Users, Copy, Check,
  Plus, Lock, Search, X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import PlaceCard      from './PlaceCard';
import RouteConnector from './RouteConnector';
import type { TripRoom, MarkerWithRoute } from '@/lib/supabase/types';
import type { AffiliateInsertion } from '@/lib/affiliate/affiliateRules';

interface Props {
  room:             TripRoom;
  mode:             'personal' | 'team';
  setMode:          (m: 'personal' | 'team') => void;
  markers:          MarkerWithRoute[];
  isLocked:         boolean;
  onlineCount:      number;
  onAddPlace:       (data: any) => Promise<void>;
  onRemoveMarker:   (id: number) => Promise<void>;
  onReorderMarker:  (id: number, day: number, afterIdx: number | null) => Promise<void>;
  onSelectMarker:   (id: number | null) => void;
  selectedMarkerId: number | null;
  getRouteAffiliate:(idx: number, min: number) => AffiliateInsertion | null;
  countryCode:      string;
}

const PIN_COLORS = ['#6366F1','#8B5CF6','#EC4899','#F97316','#EAB308','#10B981','#0EA5E9'];

export default function Sidebar({
  room, mode, setMode, markers, isLocked, onlineCount,
  onAddPlace, onRemoveMarker, onSelectMarker, selectedMarkerId,
  getRouteAffiliate,
}: Props) {
  const [copied,      setCopied]      = useState(false);
  const [showSearch,  setShowSearch]  = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching,   setSearching]   = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const totalMin = markers.reduce((s, m) => s + (m.route?.durationSec ? Math.round(m.route.durationSec / 60) : 0), 0);
  const totalKm  = markers.reduce((s, m) => s + (m.route?.distanceM  ? m.route.distanceM / 1000 : 0), 0);

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
      const res = await fetch(`/api/places?q=${encodeURIComponent(searchQuery)}&country=${room.country_code}`);
      const data = await res.json();
      setSearchResults(data.places ?? []);
    } catch {
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  }, [searchQuery, room.country_code]);

  const handleSelectPlace = useCallback(async (place: any) => {
    if (isLocked) return;
    const categoryMap: Record<string, string> = {
      'FD6': 'restaurant', 'CE7': 'cafe', 'AT4': 'attraction',
      'AC5': 'lodging',    'CS2': 'shopping', 'CT1': 'culture',
    };
    const category = categoryMap[place.category_group_code] ?? 'etc';
    await onAddPlace({
      name:     place.place_name,
      address:  place.road_address_name || place.address_name,
      lat:      parseFloat(place.y),
      lng:      parseFloat(place.x),
      category,
      dayNumber: 1,
      kakaoPlaceId: place.id,
    });
    setShowSearch(false);
    setSearchQuery('');
    setSearchResults([]);
  }, [isLocked, onAddPlace]);

  return (
    <aside className="w-[340px] min-w-[340px] h-full bg-white border-r border-slate-100 flex flex-col shadow-[4px_0_24px_rgba(0,0,0,0.04)] z-10">

      {/* ── 헤더 ── */}
      <div className="px-[18px] pt-[18px] pb-3 border-b border-slate-50">

        {/* 타이틀 */}
        <div className="flex items-center gap-2.5 mb-3.5">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-500 to-violet-500 flex items-center justify-center shadow-brand-sm">
            <Navigation size={19} className="text-white" />
          </div>
          <div>
            <div className="text-[15px] font-extrabold text-slate-900 leading-tight">
              {room.title}
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">
              {markers.length}개 장소 · {totalMin >= 60 ? `${Math.floor(totalMin/60)}시간 ${totalMin%60}분` : `${totalMin}분`} · {totalKm.toFixed(1)}km
            </div>
          </div>
        </div>

        {/* 개인/팀 모드 토글 */}
        <div className="flex bg-slate-50 rounded-xl p-1 gap-1 mb-3">
          {([
            { key: 'personal', label: '개인 모드', Icon: User  },
            { key: 'team',     label: '팀 모드',   Icon: Users },
          ] as const).map(({ key, label, Icon }) => (
            <button
              key={key}
              onClick={() => setMode(key)}
              className={cn(
                'flex-1 flex items-center justify-center gap-1.5 py-2 rounded-[9px] text-[13px] transition-all duration-200',
                mode === key
                  ? 'bg-white font-bold text-brand-500 shadow-card'
                  : 'font-normal text-slate-400 hover:text-slate-600',
              )}
            >
              <Icon size={14} />
              {label}
            </button>
          ))}
        </div>

        {/* 팀 모드: 초대 코드 */}
        {mode === 'team' && (
          <div className="bg-gradient-to-br from-brand-50 to-violet-50 border border-brand-100 rounded-[14px] px-3.5 py-3 flex items-center gap-2.5 animate-slide-up">
            <div className="flex-1">
              <div className="text-[9px] text-brand-500 font-bold tracking-widest uppercase mb-1">
                초대 코드
              </div>
              <div className="text-[18px] font-black text-indigo-800 tracking-widest font-mono">
                {room.id}
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">
                {onlineCount}명 접속 중
              </div>
            </div>
            <button
              onClick={handleCopyCode}
              className={cn(
                'flex items-center gap-1.5 px-4 py-2 rounded-[11px] text-white text-xs font-bold transition-all duration-200',
                copied
                  ? 'bg-gradient-to-br from-emerald-500 to-green-600 shadow-[0_4px_14px_rgba(16,185,129,0.4)]'
                  : 'bg-gradient-to-br from-brand-500 to-violet-500 shadow-brand-sm',
              )}
            >
              {copied ? <><Check size={13} />복사됨!</> : <><Copy size={13} />복사</>}
            </button>
          </div>
        )}

        {/* 잠금 상태 배너 */}
        {isLocked && (
          <div className="mt-2 flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
            <Lock size={13} className="text-amber-600" />
            <span className="text-xs font-semibold text-amber-700">
              방장이 일정을 확정했습니다 (편집 잠금)
            </span>
          </div>
        )}
      </div>

      {/* ── 장소 리스트 ── */}
      <div className="flex-1 overflow-y-auto px-4 pt-3.5 pb-2">
        {markers.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center gap-3 text-slate-400 py-8">
            <Navigation size={36} className="opacity-30" />
            <p className="text-[13px] text-center leading-relaxed">
              아래 버튼으로<br/>첫 장소를 추가해보세요
            </p>
          </div>
        ) : (
          markers.map((marker, i) => (
            <div key={marker.id}>
              <PlaceCard
                marker={marker}
                index={i}
                color={PIN_COLORS[i % PIN_COLORS.length]}
                isSelected={selectedMarkerId === marker.id}
                isLocked={isLocked}
                onSelect={() => onSelectMarker(marker.id)}
                onRemove={() => onRemoveMarker(marker.id)}
              />
              {i < markers.length - 1 && markers[i + 1].route && (
                <RouteConnector
                  segment={markers[i + 1].route!}
                  index={i}
                  affiliate={getRouteAffiliate(i, Math.round((markers[i + 1].route?.durationSec ?? 0) / 60))}
                />
              )}
            </div>
          ))
        )}
      </div>

      {/* ── 장소 검색 패널 ── */}
      {showSearch && (
        <div className="px-4 pt-3 pb-2 border-t border-slate-50">
          <div className="flex gap-2 mb-2">
            <div className="flex-1 flex items-center border-2 border-slate-200 rounded-xl overflow-hidden focus-within:border-indigo-400 transition-colors">
              <Search size={15} className="ml-3 text-slate-400 shrink-0" />
              <input
                ref={inputRef}
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSearch()}
                placeholder="장소 검색..."
                className="flex-1 px-2 py-2.5 text-sm outline-none bg-transparent"
                autoFocus
              />
            </div>
            <button
              onClick={handleSearch}
              className="px-3 py-2 bg-indigo-500 text-white rounded-xl text-sm font-bold hover:bg-indigo-600 transition-colors"
            >
              검색
            </button>
            <button
              onClick={() => { setShowSearch(false); setSearchResults([]); setSearchQuery(''); }}
              className="px-2 py-2 text-slate-400 hover:text-slate-600 transition-colors"
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
                  className="w-full text-left px-3 py-2.5 rounded-xl bg-slate-50 hover:bg-indigo-50 hover:border-indigo-200 border border-transparent transition-all"
                >
                  <div className="text-sm font-bold text-slate-900 truncate">{place.place_name}</div>
                  <div className="text-[11px] text-slate-400 truncate mt-0.5">
                    {place.category_group_name && (
                      <span className="text-indigo-500 font-medium mr-1">{place.category_group_name} ·</span>
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

      {/* ── 장소 추가 버튼 ── */}
      {!showSearch && (
        <div className="px-4 pt-3 pb-5 border-t border-slate-50">
          <button
            onClick={() => { setShowSearch(true); setSearchResults([]); }}
            disabled={isLocked}
            className={cn(
              'w-full flex items-center justify-center gap-2 py-[13px] rounded-[14px]',
              'text-white text-sm font-bold transition-all duration-200',
              'bg-gradient-to-br from-brand-500 to-violet-500 shadow-brand-sm',
              'hover:-translate-y-0.5 hover:shadow-brand-md',
              'disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none',
            )}
          >
            <Plus size={18} />
            {isLocked ? '잠금 상태 (편집 불가)' : '장소 추가하기'}
          </button>
        </div>
      )}
    </aside>
  );
}
