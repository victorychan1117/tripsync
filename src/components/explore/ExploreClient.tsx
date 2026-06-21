'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MapPin, Eye, Search, X, Sparkles, Compass, Clock, Heart, Copy,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import TripCoverBanner from '@/components/trip/TripCoverBanner';

// ─── Types ──────────────────────────────────────────────────────────────
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
  fork_count: number;
  cover_image_url: string | null;
  created_at: string;
  owner: { id: string; nickname: string; avatar_url: string | null } | null;
}

// ─── Constants ───────────────────────────────────────────────────────────
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

// 고정 국가 순서 (DB에 해당 그룹 여행이 없으면 자동 숨김)
const COUNTRY_ORDER = ['한국','일본','태국','베트남','유럽','기타'] as const;
const COUNTRY_FLAG: Record<string, string> = {
  '한국':'🇰🇷', '일본':'🇯🇵', '태국':'🇹🇭', '베트남':'🇻🇳', '유럽':'🌍', '기타':'🌐',
};

// 기간 필터: 당일치기/1박2일/2박3일/3박이상
const DURATIONS = [
  { label: '전체',    value: 'all' },
  { label: '당일치기', value: '0' },
  { label: '1박 2일', value: '1' },
  { label: '2박 3일', value: '2' },
  { label: '3박 이상', value: '3+' },
] as const;
type DurationFilter = typeof DURATIONS[number]['value'];

// 정렬 옵션
const SORTS = [
  { label: '인기순', value: 'popular' },
  { label: '최신순', value: 'latest' },
  { label: '담기순', value: 'forked' },
] as const;
type SortOption = typeof SORTS[number]['value'];

// ─── Helpers ─────────────────────────────────────────────────────────────
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
function matchesDuration(nights: number, dur: DurationFilter): boolean {
  if (dur === 'all') return true;
  if (dur === '0')  return nights === 0;
  if (dur === '1')  return nights === 1;
  if (dur === '2')  return nights === 2;
  if (dur === '3+') return nights >= 3;
  return true;
}

// ─── OwnerBadge ──────────────────────────────────────────────────────────
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

// ─── Toast ───────────────────────────────────────────────────────────────
function Toast({ message }: { message: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 12 }}
      className="fixed bottom-safe left-1/2 -translate-x-1/2 z-[200] bg-slate-900 text-white text-sm font-semibold px-5 py-3 rounded-2xl shadow-xl pointer-events-none whitespace-nowrap"
    >
      {message}
    </motion.div>
  );
}

// ─── FilterPill ──────────────────────────────────────────────────────────
function FilterPill({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={[
        'px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all duration-150',
        active
          ? 'bg-violet-500 text-white shadow-sm'
          : 'bg-slate-100 text-slate-600 hover:bg-slate-200',
      ].join(' ')}
    >
      {label}
    </button>
  );
}

// ─── TripCard ────────────────────────────────────────────────────────────
function TripCard({
  trip, index, isSaved, onToggleSave,
}: {
  trip: PublicTrip; index: number; isSaved: boolean;
  onToggleSave: (e: React.MouseEvent, id: string) => void;
}) {
  const router = useRouter();
  const [g1, g2] = getGradient(trip.country_code);
  const flag = FLAG[trip.country_code] ?? '🌐';
  const dest = trip.destination ?? '여행지';

  const handleAuthorClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (trip.owner?.id) router.push(`/u/${trip.owner.id}`);
  };

  return (
    <Link href={`/t/${trip.id}`}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        whileHover={{ y: -5, boxShadow: '0 20px 56px rgba(0,0,0,0.13)' }}
        transition={{ duration: 0.4, delay: Math.min(index * 0.04, 0.28) }}
        className="rounded-[20px] overflow-hidden bg-white border border-slate-100 cursor-pointer h-full"
        style={{ boxShadow: '0 2px 16px rgba(0,0,0,0.07)' }}
      >
        {/* 커버 / 그라디언트 헤더 */}
        <TripCoverBanner
          coverImageUrl={trip.cover_image_url}
          countryCode={trip.country_code}
          destination={dest}
          flag={flag}
          heightClass="h-[160px]"
          overlay={trip.cover_image_url ? 'card' : 'none'}
        >
          {/* 기간 칩 */}
          <div className="absolute top-3 left-3 bg-white/20 backdrop-blur-sm rounded-[10px] px-2 py-1 text-[11px] font-bold text-white">
            {fmtNights(trip.nights)}
          </div>
          {/* 장소 수 칩 */}
          <div
            className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm rounded-[10px] px-2.5 py-1 flex items-center gap-1 text-xs font-bold text-slate-700"
            style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.10)' }}
          >
            <MapPin size={11} color={g1} />
            {trip.marker_count}곳
          </div>
          {/* 하트 저장 버튼 */}
          <motion.button
            onClick={e => onToggleSave(e, trip.id)}
            whileTap={{ scale: 0.75 }}
            className="absolute bottom-3 right-3 w-8 h-8 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center shadow-md transition-colors hover:bg-white"
            aria-label={isSaved ? '저장 취소' : '저장하기'}
          >
            <Heart size={15} fill={isSaved ? '#EF4444' : 'none'} color={isSaved ? '#EF4444' : '#94a3b8'} className="transition-colors" />
          </motion.button>
        </TripCoverBanner>

        {/* 콘텐츠 */}
        <div className="p-4">
          <div className="flex items-center gap-1 text-xs text-slate-400 font-semibold mb-1.5">
            <MapPin size={11} />{dest}
          </div>
          <h3 className="text-[14px] font-extrabold text-slate-900 leading-snug mb-3 tracking-tight line-clamp-2">
            {trip.title}
          </h3>
          {/* 통계 행: 기간 · 조회수 · 담기수 */}
          <div className="flex items-center gap-3 pt-3 border-t border-slate-100">
            <div className="flex items-center gap-1 text-[12px] text-slate-500 font-semibold">
              <Clock size={11} className="text-slate-400" />
              {fmtNights(trip.nights)}
            </div>
            <div className="flex items-center gap-1 text-[11px] text-slate-400 font-medium">
              <Eye size={11} />
              {trip.view_count.toLocaleString()}
            </div>
            {trip.fork_count > 0 && (
              <div className="flex items-center gap-1 text-[11px] text-slate-400 font-medium">
                <Copy size={11} />
                {trip.fork_count}
              </div>
            )}
          </div>
          {/* 작성자 — 클릭 시 /u/[id] 이동 */}
          {trip.owner && (
            <div
              className="mt-2 pt-2 border-t border-slate-100 cursor-pointer hover:opacity-70 transition-opacity"
              onClick={handleAuthorClick}
            >
              <OwnerBadge nickname={trip.owner.nickname} avatarUrl={trip.owner.avatar_url} />
            </div>
          )}
        </div>
      </motion.div>
    </Link>
  );
}

// ─── EmptyState ──────────────────────────────────────────────────────────
function EmptyState({ hasFilters, onReset }: { hasFilters: boolean; onReset: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center py-28 text-center"
    >
      <div className="relative mb-6">
        <div className="w-28 h-28 rounded-full bg-violet-50 flex items-center justify-center">
          <Compass size={48} className="text-violet-300" />
        </div>
        <span className="absolute -top-1 -right-1 text-3xl">🔍</span>
      </div>
      {hasFilters ? (
        <>
          <h3 className="text-xl font-extrabold text-slate-800 mb-2">검색 결과가 없어요</h3>
          <p className="text-slate-400 text-sm mb-8 max-w-xs leading-relaxed">
            다른 도시나 여행 이름으로 찾아보거나<br />필터를 초기화해보세요.
          </p>
          <motion.button
            whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
            onClick={onReset}
            className="px-6 py-2.5 bg-gradient-to-r from-violet-500 to-violet-600 hover:from-violet-600 hover:to-violet-700 text-white text-sm font-semibold rounded-xl shadow-md transition-all"
          >
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

// ─── Main ────────────────────────────────────────────────────────────────
export default function ExploreClient({
  trips, isLoggedIn, userId, initialSavedIds,
}: {
  trips: PublicTrip[];
  isLoggedIn: boolean;
  userId: string | null;
  initialSavedIds: string[];
}) {
  const sp       = useSearchParams();
  const router   = useRouter();
  const pathname = usePathname();

  // URL query에서 초기 상태 읽기
  const [searchTerm,    setSearchTerm]    = useState(sp.get('q')       ?? '');
  const [countryFilter, setCountryFilter] = useState(sp.get('country') ?? '전체');
  const [duration,      setDuration]      = useState<DurationFilter>((sp.get('dur') ?? 'all') as DurationFilter);
  const [sort,          setSort]          = useState<SortOption>((sp.get('sort') ?? 'popular') as SortOption);
  const [savedSet,      setSavedSet]      = useState<Set<string>>(() => new Set(initialSavedIds));
  const [toast,         setToast]         = useState<string | null>(null);

  // ── URL 동기화 (검색어는 300ms debounce) ────────────────────────────
  useEffect(() => {
    const timer = setTimeout(() => {
      const params = new URLSearchParams();
      if (searchTerm.trim()) params.set('q', searchTerm.trim());
      if (countryFilter !== '전체') params.set('country', countryFilter);
      if (duration !== 'all') params.set('dur', duration);
      if (sort !== 'popular') params.set('sort', sort);
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    }, 300);
    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm, countryFilter, duration, sort]);

  // ── 저장/해제 ────────────────────────────────────────────────────────
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
    setSavedSet(prev => {
      const next = new Set(prev);
      if (wasSaved) next.delete(tripId); else next.add(tripId);
      return next;
    });
    if (wasSaved) {
      const { error } = await supabase.from('saved_trips').delete().eq('user_id', userId).eq('room_id', tripId);
      if (error) {
        setSavedSet(prev => { const next = new Set(prev); next.add(tripId); return next; });
        showToast('저장 해제에 실패했어요.');
      } else showToast('저장을 취소했어요.');
    } else {
      const { error } = await supabase.from('saved_trips').insert({ user_id: userId, room_id: tripId });
      if (error) {
        setSavedSet(prev => { const next = new Set(prev); next.delete(tripId); return next; });
        showToast('저장에 실패했어요.');
      } else showToast('여행 일지를 저장했어요. 폴더는 저장함에서 정리할 수 있어요.');
    }
  }, [isLoggedIn, userId, savedSet, showToast]);

  // ── 필터/정렬 ────────────────────────────────────────────────────────

  // DB에 실제 있는 국가 그룹만, 고정 순서로 표시
  const countryGroups = useMemo(() => {
    const groups = new Set(trips.map(t => getCountryGroup(t.country_code)));
    return COUNTRY_ORDER.filter(c => groups.has(c));
  }, [trips]);

  const hasFilters  = countryFilter !== '전체' || duration !== 'all' || searchTerm.trim() !== '';
  const hasAnyChange = hasFilters || sort !== 'popular';

  const filtered = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    let result = trips.filter(trip => {
      if (countryFilter !== '전체' && getCountryGroup(trip.country_code) !== countryFilter) return false;
      if (!matchesDuration(trip.nights, duration)) return false;
      if (q) {
        // 제목 + 목적지 + 작성자 닉네임 검색
        const haystack = [
          trip.title,
          trip.destination ?? '',
          trip.owner?.nickname ?? '',
        ].join(' ').toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });

    // 정렬
    if (sort === 'popular') result = [...result].sort((a, b) => b.view_count - a.view_count);
    else if (sort === 'latest') result = [...result].sort((a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
    else if (sort === 'forked') result = [...result].sort((a, b) => b.fork_count - a.fork_count);

    return result;
  }, [trips, countryFilter, duration, searchTerm, sort]);

  const featured = useMemo(
    () => [...trips].sort((a, b) => b.view_count - a.view_count).slice(0, 3),
    [trips],
  );
  const showFeatured = !hasFilters && sort === 'popular' && featured.length > 0;

  const resetFilters = () => {
    setSearchTerm('');
    setCountryFilter('전체');
    setDuration('all');
    setSort('popular');
  };

  return (
    <div className="min-h-screen bg-slate-50">

      {/* ── 페이지 헤더 ─────────────────────────────────────────────── */}
      <div className="bg-white border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight mb-1.5">여행 탐색</h1>
            <p className="text-slate-500 text-sm">
              {trips.length > 0
                ? `${trips.length}개의 공개 여행 일정을 탐색해보세요`
                : '공개된 여행 일정이 아직 없어요'}
            </p>
          </motion.div>
        </div>
      </div>

      {/* ── 추천 섹션 (필터 없고 인기순일 때만) ────────────────────── */}
      <AnimatePresence>
        {showFeatured && (
          <motion.section
            key="featured"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="bg-white border-b border-slate-100"
          >
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

      {/* ── Sticky 필터바 ────────────────────────────────────────────── */}
      <div className="sticky top-16 z-40 bg-white/90 backdrop-blur-md border-b border-slate-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 space-y-2.5">

          {/* 검색창 */}
          <div className="relative">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              type="text"
              placeholder="어떤 여행을 찾아볼까요? (도시, 이름, 작성자)"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-8 py-2.5 text-sm bg-slate-100 rounded-xl border-0 outline-none focus:bg-white focus:ring-2 focus:ring-violet-500/30 transition-all text-slate-800 placeholder:text-slate-400"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* 필터 + 정렬 가로 스크롤 */}
          <div className="flex items-center gap-3 overflow-x-auto pb-0.5 [scrollbar-width:none] [-webkit-overflow-scrolling:touch]">

            {/* 여행지 */}
            <div className="flex items-center gap-1.5 shrink-0">
              <span className="text-[11px] font-bold text-slate-400 shrink-0">여행지</span>
              <FilterPill label="전체" active={countryFilter === '전체'} onClick={() => setCountryFilter('전체')} />
              {countryGroups.map(c => (
                <FilterPill
                  key={c}
                  label={`${COUNTRY_FLAG[c] ?? ''} ${c}`}
                  active={countryFilter === c}
                  onClick={() => setCountryFilter(c)}
                />
              ))}
            </div>

            <div className="w-px h-4 bg-slate-200 shrink-0" />

            {/* 기간 */}
            <div className="flex items-center gap-1.5 shrink-0">
              <span className="text-[11px] font-bold text-slate-400 shrink-0">기간</span>
              {DURATIONS.map(d => (
                <FilterPill
                  key={d.value}
                  label={d.label}
                  active={duration === d.value}
                  onClick={() => setDuration(d.value)}
                />
              ))}
            </div>

            <div className="w-px h-4 bg-slate-200 shrink-0" />

            {/* 정렬 */}
            <div className="flex items-center gap-1.5 shrink-0">
              <span className="text-[11px] font-bold text-slate-400 shrink-0">정렬</span>
              {SORTS.map(s => (
                <FilterPill
                  key={s.value}
                  label={s.label}
                  active={sort === s.value}
                  onClick={() => setSort(s.value)}
                />
              ))}
            </div>
          </div>

          {/* 활성 필터 요약 + 초기화 */}
          <AnimatePresence>
            {hasAnyChange && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="flex items-center justify-between overflow-hidden"
              >
                <span className="text-xs text-slate-500">
                  <span className="font-bold text-violet-600">{filtered.length}개</span> 일정
                </span>
                <button
                  onClick={resetFilters}
                  className="text-xs font-semibold text-slate-400 hover:text-violet-500 flex items-center gap-1 transition-colors"
                >
                  <X size={11} />전체 초기화
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* ── 결과 그리드 ──────────────────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {!hasAnyChange && trips.length > 0 && (
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-extrabold text-slate-900">모든 공개 여행</h2>
            <span className="text-sm text-slate-400">총 {trips.length}개</span>
          </div>
        )}
        <AnimatePresence mode="wait">
          {filtered.length > 0 ? (
            <motion.div
              key="grid"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5"
            >
              {filtered.map((trip, i) => (
                <TripCard
                  key={trip.id}
                  trip={trip}
                  index={i}
                  isSaved={savedSet.has(trip.id)}
                  onToggleSave={handleToggleSave}
                />
              ))}
            </motion.div>
          ) : (
            <EmptyState key="empty" hasFilters={hasAnyChange} onReset={resetFilters} />
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {toast && <Toast key={toast + Date.now()} message={toast} />}
      </AnimatePresence>
    </div>
  );
}
