'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Navigation, MapPin, Calendar, Users, Lock, Plus, Search, X,
  ChevronRight, Luggage, Plane, Sparkles, Bookmark, Compass,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { getCountryGradient } from '@/lib/trip/coverImage';

// ─── 타입 ────────────────────────────────────────────────────────────
interface Trip {
  id:              string;
  title:           string;
  destination:     string | null;
  country_code:    string;
  start_date:      string | null;
  end_date:        string | null;
  is_locked:       boolean;
  marker_count:    number;
  member_count:    number;
  cover_image_url: string | null;
  created_at:      string;
  role:            string;
  joined_at:       string;
}

// ─── 상수 ────────────────────────────────────────────────────────────
const FLAG: Record<string, string> = {
  KR:'🇰🇷', JP:'🇯🇵', TH:'🇹🇭', VN:'🇻🇳', ID:'🇮🇩', SG:'🇸🇬',
  MY:'🇲🇾', PH:'🇵🇭', TW:'🇹🇼', HK:'🇭🇰', CN:'🇨🇳', FR:'🇫🇷',
  IT:'🇮🇹', ES:'🇪🇸', GB:'🇬🇧', DE:'🇩🇪', US:'🇺🇸', AU:'🇦🇺',
  NZ:'🇳🇿', TR:'🇹🇷', GR:'🇬🇷', CH:'🇨🇭', AT:'🇦🇹', NL:'🇳🇱',
  PT:'🇵🇹', MA:'🇲🇦', MV:'🇲🇻', IN:'🇮🇳', NP:'🇳🇵', BR:'🇧🇷',
  AR:'🇦🇷', MX:'🇲🇽', CA:'🇨🇦',
};

const ROLE_CFG: Record<string, { label: string; cls: string }> = {
  owner:  { label: '여행장',    cls: 'bg-violet-100 text-violet-600' },
  editor: { label: '파트너',    cls: 'bg-emerald-100 text-emerald-600' },
  viewer: { label: '동행',      cls: 'bg-sky-100 text-sky-600' },
};

const NAV_TABS = [
  { label: '내 여행',     href: '/my/trips', icon: Luggage  },
  { label: '둘러보기',   href: '/explore',   icon: Compass  },
  { label: '저장한 여행', href: '/my/saved',  icon: Bookmark },
] as const;

// ─── 헬퍼 함수 ───────────────────────────────────────────────────────
function formatDateRange(start: string | null, end: string | null): string {
  if (!start) return '날짜 미정';
  const s = new Date(start);
  const e = end ? new Date(end) : null;
  const fmt = (d: Date) => `${d.getMonth() + 1}월 ${d.getDate()}일`;
  return e ? `${fmt(s)} ~ ${fmt(e)}` : fmt(s);
}

function getDday(startDate: string | null): string | null {
  if (!startDate) return null;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const start = new Date(startDate); start.setHours(0, 0, 0, 0);
  const diff = Math.round((start.getTime() - today.getTime()) / 86_400_000);
  if (diff === 0) return 'D-Day';
  if (diff > 0 && diff <= 365) return `D-${diff}`;
  return null;
}

function getTripStatus(trip: Trip): 'upcoming' | 'ongoing' | 'past' | 'undated' {
  if (!trip.start_date) return 'undated';
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const start = new Date(trip.start_date); start.setHours(0, 0, 0, 0);
  const end = trip.end_date ? new Date(trip.end_date) : new Date(trip.start_date);
  end.setHours(0, 0, 0, 0);
  if (start > today) return 'upcoming';
  if (end < today) return 'past';
  return 'ongoing';
}

function getUpcomingTrip(trips: Trip[]): Trip | null {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const future = trips.filter(t => t.start_date && new Date(t.start_date) >= today);
  if (!future.length) return null;
  return future.sort(
    (a, b) => new Date(a.start_date!).getTime() - new Date(b.start_date!).getTime(),
  )[0];
}

function cleanDestination(dest: string | null): string | null {
  if (!dest) return null;
  return dest.replace(/^[^\s]+\s/, '');
}

// ─── MyNavTabs ───────────────────────────────────────────────────────
function MyNavTabs() {
  const pathname = usePathname();
  return (
    <div className="sticky top-16 z-40 border-b border-slate-200 bg-white/85 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <nav className="flex gap-0 overflow-x-auto" style={{ scrollbarWidth: 'none' }} role="tablist">
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

// ─── TripThumbnail ───────────────────────────────────────────────────
function TripThumbnail({ trip, flag }: { trip: Trip; flag: string }) {
  const [imgError, setImgError] = useState(false);
  const [g1, g2] = getCountryGradient(trip.country_code);
  const hasCover = !!trip.cover_image_url && !imgError;

  return (
    <div
      className="relative shrink-0 w-[88px] sm:w-[104px] self-stretch rounded-l-2xl overflow-hidden"
      style={hasCover ? undefined : { background: `linear-gradient(135deg, ${g1}, ${g2})` }}
    >
      {hasCover ? (
        <>
          <img
            src={trip.cover_image_url!}
            alt=""
            className="absolute inset-0 w-full h-full object-cover"
            onError={() => setImgError(true)}
          />
          {/* 이미지 위 옅은 오버레이 + flag 아이콘 */}
          <div className="absolute inset-0 bg-black/15" />
          <span className="absolute bottom-1.5 left-1.5 text-sm drop-shadow">{flag}</span>
        </>
      ) : (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 px-1">
          <span className="text-2xl drop-shadow">{flag}</span>
          <span className="text-white/80 text-[9px] font-bold leading-tight tracking-wide text-center truncate w-full px-1">
            {cleanDestination(trip.destination) ?? trip.country_code}
          </span>
        </div>
      )}
    </div>
  );
}

// ─── TripStatusBadge ─────────────────────────────────────────────────
function TripStatusBadge({ trip }: { trip: Trip }) {
  const status = getTripStatus(trip);
  const dday   = getDday(trip.start_date);

  if (status === 'ongoing') {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500 text-white shrink-0">
        <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
        여행 중
      </span>
    );
  }
  if (status === 'upcoming' && dday) {
    return (
      <span className="inline-flex text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-violet-500 text-white shrink-0">
        {dday}
      </span>
    );
  }
  if (status === 'past') {
    return (
      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-400 shrink-0">
        다녀온 여행
      </span>
    );
  }
  return null;
}

// ─── TripCard ────────────────────────────────────────────────────────
function TripCard({ trip, index }: { trip: Trip; index: number }) {
  const router  = useRouter();
  const flag    = FLAG[trip.country_code] ?? '🌐';
  const roleCfg = ROLE_CFG[trip.role] ?? { label: trip.role, cls: 'bg-slate-100 text-slate-500' };
  const dest    = cleanDestination(trip.destination);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, delay: index * 0.04, ease: 'easeOut' }}
      whileHover={{ y: -2, transition: { duration: 0.14 } }}
      onClick={() => router.push(`/my/trips/${trip.id}`)}
      onKeyDown={e => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          router.push(`/my/trips/${trip.id}`);
        }
      }}
      role="button"
      tabIndex={0}
      aria-label={`${trip.title} 여행 상세보기`}
      className="group relative bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md hover:border-violet-100 transition-all duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 focus-visible:ring-offset-2 overflow-hidden flex"
      style={{ minHeight: 108 }}
    >
      {/* 왼쪽 썸네일 */}
      <TripThumbnail trip={trip} flag={flag} />

      {/* 콘텐츠 영역 */}
      <div className="flex-1 min-w-0 flex flex-col justify-between p-3 sm:p-3.5">

        {/* 상단: 제목 + 상태 배지 */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h2 className="text-[14px] sm:text-[15px] font-extrabold text-slate-900 truncate leading-snug">
              {trip.title}
            </h2>
            {dest && (
              <p className="flex items-center gap-1 text-[11px] text-slate-500 mt-0.5 truncate">
                <MapPin size={9} className="shrink-0 text-slate-400" />
                {dest}
              </p>
            )}
          </div>
          <TripStatusBadge trip={trip} />
        </div>

        {/* 하단: 날짜/인원/장소 + 역할 + 화살표 */}
        <div className="flex items-end justify-between gap-2 mt-2">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5">
            <span className="flex items-center gap-1 text-[11px] font-semibold text-slate-700">
              <Calendar size={10} className="text-violet-400 shrink-0" />
              {formatDateRange(trip.start_date, trip.end_date)}
            </span>
            <span className="flex items-center gap-1 text-[11px] text-slate-400">
              <Users size={10} className="shrink-0" />
              {trip.member_count}명
            </span>
            {trip.marker_count > 0 && (
              <span className="flex items-center gap-1 text-[11px] text-slate-400">
                <Navigation size={10} className="shrink-0" />
                {trip.marker_count}곳
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {trip.is_locked && <Lock size={10} className="text-slate-300" />}
            {trip.role !== 'owner' && (
              <span className={cn('text-[10px] font-semibold px-1.5 py-0.5 rounded-full', roleCfg.cls)}>
                {roleCfg.label}
              </span>
            )}
            <ChevronRight
              size={15}
              className="text-slate-200 group-hover:text-violet-400 group-hover:translate-x-0.5 transition-all duration-200"
            />
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ─── ActionBar ───────────────────────────────────────────────────────
function ActionBar({
  query,
  onChange,
  totalCount,
}: {
  query: string;
  onChange: (v: string) => void;
  totalCount: number;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <div className="flex items-center gap-2">
      <div
        className={cn(
          'flex flex-1 items-center gap-2 bg-white rounded-xl border px-3.5 py-2.5 transition-all duration-200 shadow-sm',
          focused
            ? 'border-violet-400 ring-2 ring-violet-100'
            : 'border-slate-200 hover:border-slate-300',
        )}
      >
        <Search size={14} className="text-slate-400 shrink-0" />
        <input
          type="text"
          value={query}
          onChange={e => onChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder={totalCount > 0 ? `여행 ${totalCount}개 검색` : '어떤 여행을 찾아볼까요?'}
          className="flex-1 bg-transparent outline-none text-sm text-slate-700 placeholder:text-slate-400 min-w-0"
        />
        <AnimatePresence>
          {query && (
            <motion.button
              initial={{ opacity: 0, scale: 0.75 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.75 }}
              transition={{ duration: 0.12 }}
              onClick={() => onChange('')}
              className="text-slate-300 hover:text-slate-500 transition-colors"
              aria-label="검색어 지우기"
            >
              <X size={13} />
            </motion.button>
          )}
        </AnimatePresence>
      </div>

      <Link
        href="/room/new"
        aria-label="새 여행 만들기"
        className="inline-flex items-center gap-1.5 bg-violet-600 hover:bg-violet-700 active:bg-violet-800 text-white text-sm font-bold px-4 py-2.5 rounded-xl shadow-sm shadow-violet-200 transition-colors whitespace-nowrap shrink-0"
      >
        <Plus size={14} />
        <span className="hidden sm:inline">새 여행</span>
        <span className="sm:hidden">추가</span>
      </Link>
    </div>
  );
}

// ─── TripEmptyState ──────────────────────────────────────────────────
function TripEmptyState({ isSearching }: { isSearching: boolean }) {
  return (
    <motion.div
      key={isSearching ? 'search-empty' : 'no-trips'}
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.25 }}
      className="flex flex-col items-center justify-center py-16 text-center"
    >
      <div className="w-16 h-16 rounded-2xl bg-violet-50 flex items-center justify-center mb-4">
        {isSearching
          ? <Search size={24} className="text-violet-300" />
          : <Luggage size={24} className="text-violet-300" />
        }
      </div>
      <h3 className="text-[15px] font-extrabold text-slate-700 mb-2">
        {isSearching ? '검색 결과가 없어요' : '아직 여행이 없어요'}
      </h3>
      <p className="text-[13px] text-slate-400 mb-5 leading-relaxed max-w-[200px]">
        {isSearching
          ? '다른 도시나 여행 이름으로 찾아보세요.'
          : '새로운 여행을 만들고 일정을 채워보세요.'}
      </p>
      {!isSearching && (
        <Link
          href="/room/new"
          className="inline-flex items-center gap-2 bg-violet-600 hover:bg-violet-700 text-white text-sm font-bold px-5 py-2.5 rounded-xl shadow-md shadow-violet-200 transition-colors"
        >
          <Plus size={14} />
          첫 여행 만들기
        </Link>
      )}
    </motion.div>
  );
}

// ─── TripSidebar ─────────────────────────────────────────────────────
function TripSidebar({ trips }: { trips: Trip[] }) {
  const upcoming      = getUpcomingTrip(trips);
  const dday          = getDday(upcoming?.start_date ?? null);
  const today         = new Date(); today.setHours(0, 0, 0, 0);
  const totalCount    = trips.length;
  const upcomingCount = trips.filter(t => getTripStatus(t) === 'upcoming').length;
  const ongoingCount  = trips.filter(t => getTripStatus(t) === 'ongoing').length;
  const pastCount     = trips.filter(t => getTripStatus(t) === 'past').length;

  return (
    <aside className="flex flex-col gap-4">

      {/* 다가오는 여행 */}
      <motion.div
        initial={{ opacity: 0, x: 10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.35, delay: 0.15 }}
        className="bg-gradient-to-br from-violet-50 via-purple-50 to-fuchsia-50 border border-violet-100 rounded-2xl p-5"
      >
        <div className="flex items-center gap-2 mb-3">
          <Plane size={13} className="text-violet-500" />
          <span className="text-[11px] font-extrabold text-violet-500 uppercase tracking-widest">
            다가오는 여행
          </span>
        </div>

        {upcoming ? (
          <>
            <div className="flex items-start justify-between gap-2 mb-1.5">
              <h3 className="text-[14px] font-extrabold text-slate-800 leading-snug line-clamp-2 flex-1 min-w-0">
                {upcoming.title}
              </h3>
              {dday && (
                <span className="shrink-0 text-[11px] font-extrabold text-white bg-violet-500 px-2.5 py-0.5 rounded-full">
                  {dday}
                </span>
              )}
            </div>
            <p className="text-[12px] font-semibold text-violet-600 mb-1">
              {formatDateRange(upcoming.start_date, upcoming.end_date)}
            </p>
            <p className="text-[11px] text-slate-400 mb-3.5">
              {FLAG[upcoming.country_code] ?? '🌐'} {cleanDestination(upcoming.destination) ?? '목적지 미정'} · {upcoming.member_count}명
            </p>
            <Link
              href={`/my/trips/${upcoming.id}`}
              className="block text-center text-[12px] font-bold text-violet-600 bg-white hover:bg-violet-50 border border-violet-200 rounded-lg py-2 transition-colors"
            >
              일정 보기 →
            </Link>
          </>
        ) : (
          <div className="text-center py-3">
            <p className="text-[13px] text-slate-400 mb-2.5">예정된 여행이 없어요</p>
            <Link
              href="/room/new"
              className="text-[12px] font-bold text-violet-500 hover:text-violet-700 transition-colors"
            >
              + 새 여행 만들기
            </Link>
          </div>
        )}
      </motion.div>

      {/* 여행 현황 */}
      <motion.div
        initial={{ opacity: 0, x: 10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.35, delay: 0.25 }}
        className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm"
      >
        <div className="flex items-center gap-2 mb-3">
          <Luggage size={13} className="text-slate-500" />
          <span className="text-[11px] font-extrabold text-slate-500 uppercase tracking-widest">
            여행 현황
          </span>
        </div>
        <div className="divide-y divide-slate-50">
          {[
            { value: totalCount,    label: '전체 여행',     color: 'text-violet-600' },
            { value: upcomingCount, label: '다가오는 여행',  color: 'text-blue-600' },
            { value: ongoingCount,  label: '지금 여행 중',  color: 'text-emerald-600' },
            { value: pastCount,     label: '다녀온 여행',   color: 'text-slate-400' },
          ].map(({ value, label, color }) => (
            <div key={label} className="flex items-center justify-between py-2 first:pt-0 last:pb-0">
              <span className="text-[12px] text-slate-500">{label}</span>
              <span className={cn('text-[15px] font-black tabular-nums', color)}>{value}개</span>
            </div>
          ))}
        </div>
      </motion.div>

      {/* 오늘의 여행 무드 */}
      <motion.div
        initial={{ opacity: 0, x: 10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.35, delay: 0.35 }}
        className="bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-100 rounded-2xl p-5"
      >
        <div className="flex items-center gap-2 mb-2.5">
          <Sparkles size={13} className="text-emerald-500" />
          <span className="text-[11px] font-extrabold text-emerald-500 uppercase tracking-widest">
            오늘의 여행 무드
          </span>
        </div>
        <p className="text-[13px] font-bold text-slate-700 mb-1">
          🌿 따뜻한 바다가 끌린다면
        </p>
        <p className="text-[12px] text-slate-500 leading-relaxed">
          아직 일정이 비어있는 여행을 열고<br />장소를 하나씩 채워보세요.
        </p>
      </motion.div>

    </aside>
  );
}

// ─── SkeletonCard ────────────────────────────────────────────────────
function SkeletonCard() {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm flex overflow-hidden animate-pulse" style={{ minHeight: 108 }}>
      <div className="w-[88px] sm:w-[104px] bg-slate-100 shrink-0" />
      <div className="flex-1 p-3.5 flex flex-col justify-between">
        <div className="space-y-2">
          <div className="h-3.5 bg-slate-100 rounded-full w-2/3" />
          <div className="h-2.5 bg-slate-100 rounded-full w-1/4" />
        </div>
        <div className="h-2.5 bg-slate-100 rounded-full w-1/2" />
      </div>
    </div>
  );
}

// ─── TripsClient (main) ──────────────────────────────────────────────
export default function TripsClient({
  trips,
  nickname,
}: {
  trips: Trip[];
  nickname: string;
}) {
  const [query, setQuery] = useState('');

  const filtered = useMemo(
    () => trips.filter(t =>
      t.title.toLowerCase().includes(query.toLowerCase()) ||
      (t.destination ?? '').toLowerCase().includes(query.toLowerCase()),
    ),
    [trips, query],
  );

  return (
    <div className="min-h-screen bg-[#F6F4FF]">
      {/* 탭 네비게이션 */}
      <MyNavTabs />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">

        {/* 헤더 */}
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="pt-7 pb-5"
        >
          <p className="text-[13px] font-semibold text-violet-500 mb-1">
            안녕하세요, {nickname}님 👋
          </p>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            내 여행 목록
          </h1>
        </motion.div>

        {/* 2-column body */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_276px] xl:grid-cols-[1fr_296px] gap-5 xl:gap-7">

          {/* 왼쪽: 액션바 + 카드 리스트 */}
          <section>
            <ActionBar query={query} onChange={setQuery} totalCount={trips.length} />

            <div className="mt-3 flex flex-col gap-2">
              <AnimatePresence mode="popLayout">
                {filtered.length === 0 ? (
                  <TripEmptyState key="empty" isSearching={!!query} />
                ) : (
                  filtered.map((trip, i) => (
                    <TripCard key={trip.id} trip={trip} index={i} />
                  ))
                )}
              </AnimatePresence>
            </div>
          </section>

          {/* 오른쪽: 사이드바 */}
          <div className="lg:sticky lg:top-[108px] lg:self-start">
            {trips.length > 0 ? (
              <TripSidebar trips={trips} />
            ) : (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <SkeletonCard key={i} />
                ))}
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
