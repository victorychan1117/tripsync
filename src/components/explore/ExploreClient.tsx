'use client';

import { useState, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, Eye, Search, X, Sparkles, Compass, Clock, Heart } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

// ─── Types ──────────────────────────────────────────────────────────────────
export interface PublicTrip {
  id: string;
  title: string;
  destination: string | null;
  country_code: string;
  is_domestic: boolean;
  nights: number;
  start_date: string | null;
  end_date: string | null;
  marker_count: number;
  member_count: number;
  view_count: number;
  owner: { nickname: string; avatar_url: string | null } | null;
}

// ─── Constants ───────────────────────────────────────────────────────────────
const FLAG: Record<string, string> = {
  KR:'🇰🇷', JP:'🇯🇵', TH:'🇹🇭', VN:'🇻🇳', ID:'🇮🇩', SG:'🇸🇬',
  MY:'🇲🇾', PH:'🇵🇭', TW:'🇹🇼', HK:'🇭🇰', CN:'🇨🇳', FR:'🇫🇷',
  IT:'🇮🇹', ES:'🇪🇸', GB:'🇬🇧', DE:'🇩🇪', US:'🇺🇸', AU:'🇦🇺',
  NZ:'🇳🇿', TR:'🇹🇷', GR:'🇬🇷', CH:'🇨🇭', AT:'🇦🇹', NL:'🇳🇱',
  PT:'🇵🇹', MA:'🇲🇦', MV:'🇲🇻', IN:'🇮🇳', NP:'🇳🇵', CA:'🇨🇦',
  MX:'🇲🇽', BR:'🇧🇷', AR:'🇦🇷',
};

const GRADIENT: Record<string, [string, string]> = {
  KR: ['#43B89C', '#3B82F6'], JP: ['#FF6B6B', '#FF8E53'],
  TH: ['#F59E0B', '#EF4444'], VN: ['#10B981', '#06B6D4'],
  ID: ['#F97316', '#EF4444'], SG: ['#0EA5E9', '#6366F1'],
  MY: ['#F59E0B', '#10B981'], PH: ['#3B82F6', '#06B6D4'],
  TW: ['#EC4899', '#8B5CF6'], HK: ['#EF4444', '#F97316'],
  CN: ['#EF4444', '#F59E0B'], FR: ['#6366F1', '#3B82F6'],
  IT: ['#EF4444', '#F97316'], ES: ['#F59E0B', '#EF4444'],
  GB: ['#3B82F6', '#6366F1'], DE: ['#64748B', '#3B82F6'],
  US: ['#3B82F6', '#EF4444'], AU: ['#F97316', '#FBBF24'],
  NZ: ['#10B981', '#3B82F6'], TR: ['#EF4444', '#F97316'],
  GR: ['#3B82F6', '#06B6D4'], CH: ['#EF4444', '#64748B'],
};

const EUROPE_CODES = new Set(['FR','IT','ES','GB','DE','AT','NL','PT','CH','GR','TR']);

const DURATIONS = [
  { label: '전체', value: 'all' },
  { label: '1~3일', value: '1-3' },
  { label: '4~5일', value: '4-5' },
  { label: '6~7일', value: '6-7' },
  { label: '8일+',  value: '8+' },
] as const;
type DurationFilter = typeof DURATIONS[number]['value'];

function getGradient(code: string): [string, string] {
  return GRADIENT[code] ?? ['#6366F1', '#8B5CF6'];
}
function getCountryGroup(code: string): string {
  if (code === 'KR') return '한국';
  if (code === 'JP') return '일본';
  if (code === 'TH') return '태국';
  if (code === 'VN') return '베트남';
  if (EUROPE_CODES.has(code)) return '유럽';
  return '기타';
}
function fmtNights(nights: number): string {
  if (nights === 0) return '당일치기';
  return `${nights}박 ${nights + 1}일`;
}

// ─── OwnerBadge ──────────────────────────────────────────────────────────────
function OwnerBadge({ nickname, avatarUrl }: { nickname: string; avatarUrl: string | null }) {
  const initial = nickname.charAt(0).toUpperCase();
  return (
    <div className="flex items-center gap-1.5">
      {avatarUrl && (avatarUrl.startsWith('http://') || avatarUrl.startsWith('https://')) ? (
        <img src={avatarUrl} alt="" className="w-4 h-4 rounded-full object-cover" />
      ) : avatarUrl ? (
        <span style={{ fontSize: 13, lineHeight: 1 }}>{avatarUrl}</span>
      ) : (
        <div
          className="w-4 h-4 rounded-full flex items-center justify-center text-white shrink-0"
          style={{ background: 'linear-gradient(135deg,#6366F1,#8B5CF6)', fontSize: 8, fontWeight: 800 }}
        >
          {initial}
        </div>
      )}
      <span className="text-[11px] text-slate-400 font-semibold truncate">{nickname}님의 여행</span>
    </div>
  );
}

// ─── Toast ───────────────────────────────────────────────────────────────────
function Toast({ message }: { message: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 12 }}
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[200] bg-slate-900 text-white text-sm font-semibold px-5 py-3 rounded-2xl shadow-xl pointer-events-none whitespace-nowrap"
    >
      {message}
    </motion.div>
  );
}

// ─── TripCard ────────────────────────────────────────────────────────────────
function TripCard({
  trip, index, isSaved, onToggleSave,
}: {
  trip: PublicTrip; index: number; isSaved: boolean;
  onToggleSave: (e: React.MouseEvent, id: string) => void;
}) {
  const [g1, g2] = getGradient(trip.country_code);
  const flag      = FLAG[trip.country_code] ?? '🌐';
  const dest      = trip.destination ?? '여행지';

  return (
    <Link href={`/t/${trip.id}`}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        whileHover={{ y: -5, boxShadow: '0 20px 56px rgba(0,0,0,0.13)' }}
        transition={{ duration: 0.4, delay: Math.min(index * 0.05, 0.3) }}
        className="rounded-[20px] overflow-hidden bg-white border border-slate-100 cursor-pointer"
        style={{ boxShadow: '0 2px 16px rgba(0,0,0,0.07)' }}
      >
        {/* 그라디언트 헤더 */}
        <div
          className="h-[160px] relative flex items-center justify-center"
          style={{ background: `linear-gradient(135deg, ${g1}, ${g2})` }}
        >
          <div className="text-center">
            <div className="text-5xl mb-2 drop-shadow">{flag}</div>
            <div className="text-white/90 text-[13px] font-bold drop-shadow">{dest}</div>
          </div>
          <div
            className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm rounded-[10px] px-2.5 py-1 flex items-center gap-1 text-xs font-bold text-slate-700"
            style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.10)' }}
          >
            <MapPin size={11} color={g1} />
            {trip.marker_count}개 장소
          </div>
          <div className="absolute top-3 left-3 bg-white/20 backdrop-blur-sm rounded-[10px] px-2 py-1 text-[11px] font-bold text-white">
            {fmtNights(trip.nights)}
          </div>
          <motion.button
            onClick={e => onToggleSave(e, trip.id)}
            whileTap={{ scale: 0.75 }}
            className="absolute bottom-3 right-3 w-8 h-8 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center shadow-md transition-colors hover:bg-white"
            aria-label={isSaved ? '저장 취소' : '저장하기'}
          >
            <Heart size={15} fill={isSaved ? '#EF4444' : 'none'} color={isSaved ? '#EF4444' : '#94a3b8'} className="transition-colors" />
          </motion.button>
        </div>

        {/* 콘텐츠 */}
        <div className="p-4">
          <div className="flex items-center gap-1 text-xs text-slate-400 font-semibold mb-1.5">
            <MapPin size={11} />{dest}
          </div>
          <h3 className="text-[14px] font-extrabold text-slate-900 leading-snug mb-3 tracking-tight line-clamp-2">
            {trip.title}
          </h3>
          <div className="flex items-center justify-between pt-3 border-t border-slate-100">
            <div className="flex items-center gap-1 text-[12px] text-slate-500 font-semibold">
              <Clock size={12} className="text-slate-400" />
              {fmtNights(trip.nights)}
            </div>
            <div className="flex items-center gap-1 text-xs text-slate-400 font-semibold">
              <Eye size={12} />
              {trip.view_count.toLocaleString()}
            </div>
          </div>
          {trip.owner && (
            <div className="mt-2 pt-2 border-t border-slate-100">
              <OwnerBadge nickname={trip.owner.nickname} avatarUrl={trip.owner.avatar_url} />
            </div>
          )}
        </div>
      </motion.div>
    </Link>
  );
}

// ─── FilterPill ──────────────────────────────────────────────────────────────
function FilterPill({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={[
        'px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-all duration-150',
        active ? 'bg-violet-500 text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200',
      ].join(' ')}
    >
      {label}
    </button>
  );
}

// ─── EmptyState ──────────────────────────────────────────────────────────────
function EmptyState({ hasFilters, onReset }: { hasFilters: boolean; onReset: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center py-28 text-center"
    >
      <div className="relative mb-6">
        <div className="w-28 h-28 rounded-full bg-violet-50 flex items-center justify-center">
          <Compass size={48} className="text-violet-300" />
        </div>
        <span className="absolute -top-1 -right-1 text-3xl">🌍</span>
      </div>
      {hasFilters ? (
        <>
          <h3 className="text-xl font-extrabold text-slate-800 mb-2">해당하는 여행이 없어요</h3>
          <p className="text-slate-400 text-sm mb-8 max-w-xs leading-relaxed">다른 필터 조합을 시도해보거나 필터를 초기화해보세요.</p>
          <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={onReset}
            className="px-6 py-2.5 bg-gradient-to-r from-violet-500 to-violet-600 hover:from-violet-600 hover:to-violet-700 text-white text-sm font-semibold rounded-xl shadow-md transition-all">
            필터 초기화
          </motion.button>
        </>
      ) : (
        <>
          <h3 className="text-xl font-extrabold text-slate-800 mb-2">아직 공개된 여행이 없어요</h3>
          <p className="text-slate-400 text-sm max-w-xs leading-relaxed">여행을 만들고 공개 설정하면 여기에 표시돼요.</p>
        </>
      )}
    </motion.div>
  );
}

// ─── Main ────────────────────────────────────────────────────────────────────
export default function ExploreClient({
  trips, isLoggedIn, userId, initialSavedIds,
}: {
  trips: PublicTrip[];
  isLoggedIn: boolean;
  userId: string | null;
  initialSavedIds: string[];
}) {
  const [countryFilter, setCountryFilter] = useState('전체');
  const [duration, setDuration]           = useState<DurationFilter>('all');
  const [search, setSearch]               = useState('');
  const [savedSet, setSavedSet]           = useState<Set<string>>(() => new Set(initialSavedIds));
  const [toast, setToast]                 = useState<string | null>(null);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  }, []);

  const handleToggleSave = useCallback(async (e: React.MouseEvent, tripId: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isLoggedIn || !userId) { showToast('로그인 후 여행을 저장할 수 있어요.'); return; }

    const supabase = createClient();
    const wasSaved = savedSet.has(tripId);
    setSavedSet(prev => { const next = new Set(prev); if (wasSaved) next.delete(tripId); else next.add(tripId); return next; });

    if (wasSaved) {
      const { error } = await supabase.from('saved_trips').delete().eq('user_id', userId).eq('room_id', tripId);
      if (error) { setSavedSet(prev => { const next = new Set(prev); next.add(tripId); return next; }); showToast('저장 해제에 실패했어요.'); }
      else showToast('저장을 취소했어요.');
    } else {
      const { error } = await supabase.from('saved_trips').insert({ user_id: userId, room_id: tripId });
      if (error) { setSavedSet(prev => { const next = new Set(prev); next.delete(tripId); return next; }); showToast('저장에 실패했어요.'); }
      else showToast('여행 일지를 저장했어요.');
    }
  }, [isLoggedIn, userId, savedSet, showToast]);

  const countryGroups = useMemo(() => {
    const groups = new Set(trips.map(t => getCountryGroup(t.country_code)));
    return ['전체', ...Array.from(groups).sort()];
  }, [trips]);

  const hasFilters = countryFilter !== '전체' || duration !== 'all' || search.trim() !== '';

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return trips.filter(trip => {
      if (countryFilter !== '전체' && getCountryGroup(trip.country_code) !== countryFilter) return false;
      const days = trip.nights + 1;
      if (duration === '1-3' && days > 3) return false;
      if (duration === '4-5' && (days < 4 || days > 5)) return false;
      if (duration === '6-7' && (days < 6 || days > 7)) return false;
      if (duration === '8+' && days < 8) return false;
      if (q) {
        const dest = (trip.destination ?? '').toLowerCase();
        if (!trip.title.toLowerCase().includes(q) && !dest.includes(q)) return false;
      }
      return true;
    });
  }, [trips, countryFilter, duration, search]);

  const featured = useMemo(() => trips.filter(t => t.view_count > 0).slice(0, 3), [trips]);
  const resetFilters = () => { setCountryFilter('전체'); setDuration('all'); setSearch(''); };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* 페이지 헤더 */}
      <div className="bg-white border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight mb-1.5">여행 탐색</h1>
            <p className="text-slate-500 text-sm">
              {trips.length > 0 ? `${trips.length}개의 공개 여행 일정을 탐색해보세요` : '공개된 여행 일정이 아직 없어요'}
            </p>
          </motion.div>
        </div>
      </div>

      {/* 추천 섹션 */}
      <AnimatePresence>
        {!hasFilters && featured.length > 0 && (
          <motion.section key="featured" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }} className="bg-white border-b border-slate-100">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
              <div className="flex items-center gap-2 mb-3">
                <div className="flex items-center gap-1.5 bg-violet-50 border border-violet-100 rounded-full px-3 py-1">
                  <Sparkles size={13} className="text-violet-500" />
                  <span className="text-xs font-bold text-violet-600">
                    {isLoggedIn ? '지금 인기 있는 여행' : '많이 본 공개 여행'}
                  </span>
                </div>
              </div>
              <h2 className="text-xl font-extrabold text-slate-900 mb-6">많은 분들이 즐겨 찾는 일정이에요</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {featured.map((trip, i) => (
                  <TripCard key={trip.id} trip={trip} index={i} isSaved={savedSet.has(trip.id)} onToggleSave={handleToggleSave} />
                ))}
              </div>
            </div>
          </motion.section>
        )}
      </AnimatePresence>

      {/* Sticky 필터바 */}
      <div className="sticky top-16 z-40 bg-white/80 backdrop-blur-md border-b border-slate-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 space-y-3">
          <div className="relative">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input type="text" placeholder="여행지, 제목으로 검색..." value={search} onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-8 py-2.5 text-sm bg-slate-100 rounded-xl border-0 outline-none focus:bg-white focus:ring-2 focus:ring-violet-500/30 transition-all text-slate-800 placeholder:text-slate-400" />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors">
                <X size={14} />
              </button>
            )}
          </div>
          <div className="flex items-center gap-4 overflow-x-auto pb-0.5 [scrollbar-width:none]">
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <span className="text-[11px] font-semibold text-slate-400 flex-shrink-0">여행지</span>
              {countryGroups.map(c => <FilterPill key={c} label={c} active={countryFilter === c} onClick={() => setCountryFilter(c)} />)}
            </div>
            <div className="w-px h-5 bg-slate-200 flex-shrink-0" />
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <span className="text-[11px] font-semibold text-slate-400 flex-shrink-0">기간</span>
              {DURATIONS.map(d => <FilterPill key={d.value} label={d.label} active={duration === d.value} onClick={() => setDuration(d.value)} />)}
            </div>
          </div>
          <AnimatePresence>
            {hasFilters && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                className="flex items-center justify-between overflow-hidden">
                <span className="text-xs text-slate-500"><span className="font-bold text-violet-600">{filtered.length}개</span>의 일정</span>
                <button onClick={resetFilters} className="text-xs font-semibold text-slate-400 hover:text-violet-500 flex items-center gap-1 transition-colors">
                  <X size={11} />초기화
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* 결과 그리드 */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {!hasFilters && trips.length > 0 && (
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-extrabold text-slate-900">모든 공개 여행</h2>
            <span className="text-sm text-slate-400">총 {trips.length}개</span>
          </div>
        )}
        <AnimatePresence mode="wait">
          {filtered.length > 0 ? (
            <motion.div key="grid" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filtered.map((trip, i) => (
                <TripCard key={trip.id} trip={trip} index={i} isSaved={savedSet.has(trip.id)} onToggleSave={handleToggleSave} />
              ))}
            </motion.div>
          ) : (
            <EmptyState key="empty" hasFilters={hasFilters} onReset={resetFilters} />
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {toast && <Toast key={toast + Date.now()} message={toast} />}
      </AnimatePresence>
    </div>
  );
}
