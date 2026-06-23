'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MapPin, Eye, Search, X, Sparkles, Compass, Clock, Heart, Copy,
  Luggage, Bookmark, Plus,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';
import { FLAG } from '@/lib/constants/flags';

// ─── Types ────────────────────────────────────────────────────────────────
export interface PublicTrip {
  id:              string;
  title:           string;
  destination:     string | null;
  country_code:    string;
  is_domestic:     boolean;
  nights:          number;
  start_date:      string | null;
  end_date:        string | null;
  marker_count:    number;
  member_count:    number;
  view_count:      number;
  fork_count:      number;
  cover_image_url: string | null;
  created_at:      string;
  owner: { id: string; nickname: string; avatar_url: string | null } | null;
}

// ─── Constants ────────────────────────────────────────────────────────────

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
  MV: ['#06B6D4', '#3B82F6'],
};

const EUROPE_CODES = new Set(['FR','IT','ES','GB','DE','AT','NL','PT','CH','GR','TR']);

const COUNTRY_ORDER = ['한국','일본','태국','베트남','유럽','기타'] as const;
const COUNTRY_FLAG: Record<string, string> = {
  '한국':'🇰🇷', '일본':'🇯🇵', '태국':'🇹🇭', '베트남':'🇻🇳', '유럽':'🌍', '기타':'🌐',
};

const DURATIONS = [
  { label: '전체',     value: 'all' },
  { label: '당일치기', value: '0' },
  { label: '1박 2일', value: '1' },
  { label: '2박 3일', value: '2' },
  { label: '3박 이상', value: '3+' },
] as const;
type DurationFilter = typeof DURATIONS[number]['value'];

const SORTS = [
  { label: '인기순', value: 'popular' },
  { label: '최신순', value: 'latest' },
  { label: '담기순', value: 'forked' },
] as const;
type SortOption = typeof SORTS[number]['value'];

const NAV_TABS = [
  { label: '내 여행',    href: '/my/trips', icon: Luggage  },
  { label: '여행 탐색', href: '/explore',   icon: Compass  },
  { label: '저장한 여행', href: '/my/saved', icon: Bookmark },
] as const;

// 인기 섹션 표시 최소 여행 수
const FEATURED_MIN_COUNT = 6;

// ─── Helpers ──────────────────────────────────────────────────────────────
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
  if (dur === '0')   return nights === 0;
  if (dur === '1')   return nights === 1;
  if (dur === '2')   return nights === 2;
  if (dur === '3+')  return nights >= 3;
  return true;
}
function cleanDest(dest: string | null): string | null {
  if (!dest) return null;
  return dest.replace(/^[^\s]+\s/, '');
}

// ─── ExploreNavTabs ───────────────────────────────────────────────────────
function ExploreNavTabs() {
  const pathname = usePathname();
  return (
    <div className="sticky top-16 z-40 border-b border-slate-200 bg-white/85 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <nav className="flex overflow-x-auto" style={{ scrollbarWidth: 'none' }} role="tablist">
          {NAV_TABS.map(({ label, href, icon: Icon }) => {
            const isActive =
              href === '/explore'
                ? pathname === href
                : pathname === href || pathname.startsWith(href + '/');
            return (
              <Link
                key={href}
                href={href}
                role="tab"
                aria-selected={isActive}
                className={cn(
                  'flex items-center gap-1.5 px-4 py-3.5 text-[13px] font-semibold whitespace-nowrap border-b-2 transition-colors duration-150',
                  isActive
                    ? 'border-violet-500 text-violet-600'
                    : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-200',
                )}
              >
                <Icon size={13} />
                {label}
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}

// ─── FallbackThumbnail ────────────────────────────────────────────────────
function FallbackThumbnail({
  countryCode, destination, flag,
}: { countryCode: string; destination: string | null; flag: string }) {
  const [g1, g2] = getGradient(countryCode);
  const dest = cleanDest(destination);
  return (
    <div
      className="absolute inset-0 overflow-hidden"
      style={{ background: `linear-gradient(140deg, ${g1} 0%, ${g2} 100%)` }}
    >
      {/* 배경 워터마크 텍스트 */}
      {dest && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none" aria-hidden>
          <span className="text-[72px] font-black text-white/[0.08] leading-none text-center px-4 select-none">
            {dest}
          </span>
        </div>
      )}
      {/* 중앙 콘텐츠 */}
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
        <span className="text-4xl drop-shadow-lg">{flag}</span>
        {dest && (
          <span className="text-white/90 text-sm font-bold drop-shadow text-center px-6 line-clamp-2 leading-snug">
            {dest}
          </span>
        )}
      </div>
    </div>
  );
}

// ─── OwnerBadge ───────────────────────────────────────────────────────────
function OwnerBadge({ nickname, avatarUrl }: { nickname: string; avatarUrl: string | null }) {
  const initial = nickname.charAt(0).toUpperCase();
  return (
    <div className="flex items-center gap-1.5 min-w-0">
      {avatarUrl && avatarUrl.startsWith('http') ? (
        <img src={avatarUrl} alt="" className="w-4 h-4 rounded-full object-cover shrink-0" />
      ) : avatarUrl ? (
        <span className="text-[13px] leading-none shrink-0">{avatarUrl}</span>
      ) : (
        <div
          className="w-4 h-4 rounded-full flex items-center justify-center text-white shrink-0"
          style={{ background: 'linear-gradient(135deg,#6366F1,#8B5CF6)', fontSize: 8, fontWeight: 800 }}
        >
          {initial}
        </div>
      )}
      <span className="text-[11px] text-slate-400 font-medium truncate">{nickname}님의 여행</span>
    </div>
  );
}

// ─── Toast ────────────────────────────────────────────────────────────────
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

// ─── FilterPill ───────────────────────────────────────────────────────────
function FilterPill({
  label, active, onClick,
}: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'px-3 py-1.5 rounded-full text-[12px] font-semibold whitespace-nowrap transition-all duration-150 shrink-0',
        active
          ? 'bg-violet-500 text-white shadow-sm shadow-violet-200'
          : 'bg-slate-100 text-slate-600 hover:bg-slate-200',
      )}
    >
      {label}
    </button>
  );
}

// ─── TripCard ─────────────────────────────────────────────────────────────
function TripCard({
  trip, index, isSaved, onToggleSave,
}: {
  trip: PublicTrip;
  index: number;
  isSaved: boolean;
  onToggleSave: (e: React.MouseEvent, id: string) => void;
}) {
  const router = useRouter();
  const flag   = FLAG[trip.country_code] ?? '🌐';
  const dest   = cleanDest(trip.destination);
  const [imgError, setImgError] = useState(false);
  const showCover = !!trip.cover_image_url && !imgError;

  const handleAuthorClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (trip.owner?.id) router.push(`/u/${trip.owner.id}`);
  };

  return (
    <Link
      href={`/t/${trip.id}`}
      className="group block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 focus-visible:ring-offset-2 rounded-[18px]"
    >
      <motion.article
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.28, delay: Math.min(index * 0.04, 0.22) }}
        className="bg-white border border-slate-100 rounded-[18px] overflow-hidden shadow-sm group-hover:shadow-md group-hover:border-violet-100 group-hover:-translate-y-0.5 transition-all duration-200 h-full flex flex-col"
      >
        {/* 썸네일 */}
        <div className="relative h-[140px] shrink-0 overflow-hidden bg-slate-100">
          {showCover ? (
            <img
              src={trip.cover_image_url!}
              alt=""
              className="absolute inset-0 w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-300"
              onError={() => setImgError(true)}
            />
          ) : (
            <FallbackThumbnail
              countryCode={trip.country_code}
              destination={trip.destination}
              flag={flag}
            />
          )}

          {/* 커버 이미지 위 얇은 오버레이 */}
          {showCover && <div className="absolute inset-0 bg-black/10" />}

          {/* 하트 저장 버튼 */}
          <motion.button
            onClick={e => onToggleSave(e, trip.id)}
            whileTap={{ scale: 0.75 }}
            className="absolute top-2.5 right-2.5 w-8 h-8 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center shadow-md hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 transition-colors"
            aria-label={isSaved ? '저장 취소' : '저장하기'}
          >
            <Heart
              size={14}
              fill={isSaved ? '#EF4444' : 'none'}
              color={isSaved ? '#EF4444' : '#94a3b8'}
              className="transition-colors"
            />
          </motion.button>
        </div>

        {/* 카드 본문 */}
        <div className="flex-1 flex flex-col p-4">

          {/* 목적지 */}
          {dest && (
            <div className="flex items-center gap-1 text-[11px] text-slate-400 font-medium mb-1.5">
              <MapPin size={9} className="shrink-0" />
              {dest}
            </div>
          )}

          {/* 제목 */}
          <h3 className="text-[14px] font-extrabold text-slate-900 leading-snug line-clamp-2 mb-2.5 group-hover:text-violet-700 transition-colors">
            {trip.title}
          </h3>

          {/* 배지: 기간 + 장소 수 */}
          <div className="flex items-center flex-wrap gap-1.5 mb-auto pb-3">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 text-[11px] font-semibold text-slate-600">
              <Clock size={9} />
              {fmtNights(trip.nights)}
            </span>
            {trip.marker_count > 0 && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 text-[11px] font-semibold text-slate-600">
                <MapPin size={9} />
                장소 {trip.marker_count}곳
              </span>
            )}
          </div>

          {/* 하단: 통계 + 작성자 */}
          <div className="flex items-center justify-between gap-2 pt-2.5 border-t border-slate-100">
            <div className="flex items-center gap-2.5 text-[11px] text-slate-400">
              <span className="flex items-center gap-1">
                <Eye size={10} />
                조회 {trip.view_count.toLocaleString()}
              </span>
              {trip.fork_count > 0 && (
                <span className="flex items-center gap-1">
                  <Copy size={10} />
                  담기 {trip.fork_count}
                </span>
              )}
            </div>
            {trip.owner && (
              <div
                onClick={handleAuthorClick}
                className="cursor-pointer hover:opacity-70 transition-opacity min-w-0"
              >
                <OwnerBadge nickname={trip.owner.nickname} avatarUrl={trip.owner.avatar_url} />
              </div>
            )}
          </div>
        </div>
      </motion.article>
    </Link>
  );
}

// ─── EmptyState ───────────────────────────────────────────────────────────
function EmptyState({ hasFilters, onReset }: { hasFilters: boolean; onReset: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center py-24 text-center"
    >
      <div className="w-20 h-20 rounded-3xl bg-violet-50 flex items-center justify-center mb-5">
        <Compass size={34} className="text-violet-300" />
      </div>
      {hasFilters ? (
        <>
          <h3 className="text-[17px] font-extrabold text-slate-800 mb-2">검색 결과가 없어요</h3>
          <p className="text-slate-400 text-sm mb-6 max-w-[220px] leading-relaxed">
            다른 도시나 여행 이름으로 찾아보거나<br />필터를 초기화해보세요.
          </p>
          <button
            onClick={onReset}
            className="px-5 py-2.5 bg-violet-600 hover:bg-violet-700 text-white text-sm font-bold rounded-xl shadow-md transition-colors"
          >
            필터 초기화
          </button>
        </>
      ) : (
        <>
          <h3 className="text-[17px] font-extrabold text-slate-800 mb-2">아직 공개된 여행이 없어요</h3>
          <p className="text-slate-400 text-sm mb-6 max-w-[220px] leading-relaxed">
            여행을 만들고 공개 설정하면 여기에 표시돼요.
          </p>
          <Link
            href="/room/new"
            className="inline-flex items-center gap-2 bg-violet-600 hover:bg-violet-700 text-white text-sm font-bold px-5 py-2.5 rounded-xl shadow-md transition-colors"
          >
            <Plus size={14} />
            내 여행 만들기
          </Link>
        </>
      )}
    </motion.div>
  );
}

// ─── LowContentNotice ─────────────────────────────────────────────────────
function LowContentNotice() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-6 bg-violet-50 border border-violet-100 rounded-2xl p-4 flex items-start gap-3"
    >
      <Sparkles size={16} className="text-violet-400 shrink-0 mt-0.5" />
      <div>
        <p className="text-[13px] font-bold text-violet-700 mb-0.5">아직 공개 여행이 많지 않아요</p>
        <p className="text-[12px] text-violet-500 leading-relaxed">
          마음에 드는 여행을 저장하거나, 내 여행을 공개해보세요.
        </p>
      </div>
    </motion.div>
  );
}

// ─── ExploreClient (main) ─────────────────────────────────────────────────
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

  const [searchTerm,    setSearchTerm]    = useState(sp.get('q')       ?? '');
  const [countryFilter, setCountryFilter] = useState(sp.get('country') ?? '전체');
  const [duration,      setDuration]      = useState<DurationFilter>((sp.get('dur')  ?? 'all')     as DurationFilter);
  const [sort,          setSort]          = useState<SortOption>(     (sp.get('sort') ?? 'popular') as SortOption);
  const [savedSet,      setSavedSet]      = useState<Set<string>>(() => new Set(initialSavedIds));
  const [toast,         setToast]         = useState<string | null>(null);
  const [searchFocused, setSearchFocused] = useState(false);

  // URL 동기화 (300ms debounce)
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

  // 저장/해제
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

  // 국가 그룹 (실제 데이터에 있는 것만, 고정 순서)
  const countryGroups = useMemo(() => {
    const groups = new Set(trips.map(t => getCountryGroup(t.country_code)));
    return COUNTRY_ORDER.filter(c => groups.has(c));
  }, [trips]);

  const hasFilters   = countryFilter !== '전체' || duration !== 'all' || searchTerm.trim() !== '';
  const hasAnyChange = hasFilters || sort !== 'popular';

  const filtered = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    let result = trips.filter(trip => {
      if (countryFilter !== '전체' && getCountryGroup(trip.country_code) !== countryFilter) return false;
      if (!matchesDuration(trip.nights, duration)) return false;
      if (q) {
        const haystack = [trip.title, trip.destination ?? '', trip.owner?.nickname ?? ''].join(' ').toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
    if (sort === 'popular')     result = [...result].sort((a, b) => b.view_count - a.view_count);
    else if (sort === 'latest') result = [...result].sort((a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
    else if (sort === 'forked') result = [...result].sort((a, b) => b.fork_count - a.fork_count);
    return result;
  }, [trips, countryFilter, duration, searchTerm, sort]);

  // 인기 상위 3개 (여행 수 충분하고 필터 없을 때만)
  const featured = useMemo(
    () => [...trips].sort((a, b) => b.view_count - a.view_count).slice(0, 3),
    [trips],
  );
  const showFeatured   = !hasFilters && sort === 'popular' && trips.length >= FEATURED_MIN_COUNT;
  const featuredIds    = useMemo(() => new Set(featured.map(t => t.id)), [featured]);
  // featured 표시 시 메인 그리드에서 중복 제거
  const mainTrips      = showFeatured ? filtered.filter(t => !featuredIds.has(t.id)) : filtered;
  const showLowContent = !hasAnyChange && trips.length > 0 && trips.length < FEATURED_MIN_COUNT;

  const resetFilters = () => {
    setSearchTerm('');
    setCountryFilter('전체');
    setDuration('all');
    setSort('popular');
  };

  return (
    <div className="min-h-screen bg-[#F6F4FF]">

      {/* 탭 네비게이션 */}
      <ExploreNavTabs />

      {/* ── 컴팩트 헤더 (non-sticky) ─────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-3">
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight mb-0.5">
            여행 탐색
          </h1>
          <p className="text-[13px] text-slate-400">
            {trips.length > 0
              ? `${trips.length}개의 공개 여행 일정을 탐색해보세요`
              : '아직 공개된 여행 일정이 없어요'}
          </p>
        </motion.div>
      </div>

      {/* ── Sticky 검색 + 필터 바 ────────────────────────────────── */}
      <div className="sticky top-[108px] z-30 bg-white/95 backdrop-blur-md border-b border-slate-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 space-y-2">

          {/* 검색창 */}
          <div className={cn(
            'flex items-center gap-2 bg-white border rounded-xl px-3.5 py-2.5 transition-all duration-200',
            searchFocused
              ? 'border-violet-400 ring-2 ring-violet-100'
              : 'border-slate-200 hover:border-slate-300',
          )}>
            <Search size={14} className="text-slate-400 shrink-0" />
            <input
              type="text"
              placeholder="도시, 여행 이름, 작성자 검색"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
              className="flex-1 bg-transparent outline-none text-sm text-slate-800 placeholder:text-slate-400 min-w-0"
            />
            <AnimatePresence>
              {searchTerm && (
                <motion.button
                  initial={{ opacity: 0, scale: 0.75 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.75 }}
                  transition={{ duration: 0.12 }}
                  onClick={() => setSearchTerm('')}
                  className="text-slate-300 hover:text-slate-500 transition-colors"
                  aria-label="검색어 지우기"
                >
                  <X size={13} />
                </motion.button>
              )}
            </AnimatePresence>
          </div>

          {/* 필터 칩 행 */}
          <div
            className="flex items-center gap-2 overflow-x-auto pb-0.5"
            style={{ scrollbarWidth: 'none' }}
          >
            {/* 여행지 */}
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

            <div className="w-px h-4 bg-slate-200 shrink-0 mx-0.5" />

            {/* 기간 */}
            <span className="text-[11px] font-bold text-slate-400 shrink-0">기간</span>
            {DURATIONS.map(d => (
              <FilterPill
                key={d.value}
                label={d.label}
                active={duration === d.value}
                onClick={() => setDuration(d.value)}
              />
            ))}

            <div className="w-px h-4 bg-slate-200 shrink-0 mx-0.5" />

            {/* 정렬 */}
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

          {/* 활성 필터 요약 + 초기화 */}
          <AnimatePresence>
            {hasAnyChange && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="flex items-center justify-between overflow-hidden"
              >
                <span className="text-[12px] text-slate-500">
                  <span className="font-bold text-violet-600">{filtered.length}개</span> 일정
                </span>
                <button
                  onClick={resetFilters}
                  className="text-[12px] font-semibold text-slate-400 hover:text-violet-500 flex items-center gap-1 transition-colors"
                >
                  <X size={11} />전체 초기화
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* ── 본문 ─────────────────────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">

        {/* 인기 여행 (trips.length >= 6 이고 필터 없을 때만) */}
        <AnimatePresence>
          {showFeatured && (
            <motion.section
              key="featured"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="mb-8"
            >
              <div className="flex items-center gap-2 mb-4">
                <Sparkles size={14} className="text-violet-500" />
                <h2 className="text-[15px] font-extrabold text-slate-800">지금 인기 있는 여행</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {featured.map((trip, i) => (
                  <TripCard
                    key={trip.id}
                    trip={trip}
                    index={i}
                    isSaved={savedSet.has(trip.id)}
                    onToggleSave={handleToggleSave}
                  />
                ))}
              </div>
            </motion.section>
          )}
        </AnimatePresence>

        {/* 콘텐츠 부족 안내 */}
        {showLowContent && <LowContentNotice />}

        {/* 전체 그리드 헤더 */}
        {mainTrips.length > 0 && (
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[15px] font-extrabold text-slate-800">
              {hasAnyChange ? '검색 결과' : showFeatured ? '모든 공개 여행' : '공개 여행'}
            </h2>
            <span className="text-[12px] text-slate-400">총 {mainTrips.length}개</span>
          </div>
        )}

        {/* 카드 그리드 */}
        <AnimatePresence mode="wait">
          {filtered.length > 0 ? (
            <motion.div
              key="grid"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
            >
              {mainTrips.map((trip, i) => (
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
