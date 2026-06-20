'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Navigation, MapPin, Calendar, Users, Lock, Plus, Search, X,
  ChevronRight, Luggage, Plane, Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ─── 타입 ────────────────────────────────────────────────────────────
interface Trip {
  id:           string;
  title:        string;
  destination:  string | null;
  country_code: string;
  start_date:   string | null;
  end_date:     string | null;
  is_locked:    boolean;
  marker_count: number;
  member_count: number;
  created_at:   string;
  role:         string;
  joined_at:    string;
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

// 국가별 아이콘 배경 그라디언트 (파스텔)
const ICON_GRADIENT: Record<string, [string, string]> = {
  KR: ['#EDE9FE', '#F5F3FF'],
  JP: ['#FFE4E6', '#FFF1F2'],
  TH: ['#FEF3C7', '#FFFBEB'],
  VN: ['#D1FAE5', '#ECFDF5'],
  ID: ['#FFEDD5', '#FFF7ED'],
  SG: ['#DBEAFE', '#EFF6FF'],
  MY: ['#D1FAE5', '#ECFDF5'],
  PH: ['#FFEDD5', '#FFF7ED'],
  TW: ['#E0F2FE', '#F0F9FF'],
  HK: ['#FCE7F3', '#FDF2F8'],
  CN: ['#FFE4E6', '#FFF1F2'],
  FR: ['#DBEAFE', '#EFF6FF'],
  IT: ['#FFE4E6', '#FFF1F2'],
  ES: ['#FEF3C7', '#FFFBEB'],
  GB: ['#DBEAFE', '#EFF6FF'],
  DE: ['#D1FAE5', '#ECFDF5'],
  US: ['#DBEAFE', '#EFF6FF'],
  AU: ['#FEF3C7', '#FFFBEB'],
  GR: ['#E0F2FE', '#F0F9FF'],
  TR: ['#FFE4E6', '#FFF1F2'],
  MV: ['#CFFAFE', '#ECFEFF'],
};

const ROLE_CFG: Record<string, { label: string; cls: string }> = {
  owner:  { label: '여행장',      cls: 'bg-violet-100 text-violet-700' },
  editor: { label: '여행 파트너', cls: 'bg-emerald-100 text-emerald-700' },
  viewer: { label: '동행',        cls: 'bg-sky-100 text-sky-600' },
};

const MOOD: Record<string, string> = {
  KR: '따뜻한 국내 감성 여행',
  JP: '천천히 걷고 싶은 일본 여행',
  TH: '설레는 태국 휴양 여행',
  VN: '싱그러운 베트남 여행',
  ID: '여유로운 발리 휴양 여행',
  SG: '세련된 싱가포르 시티 트립',
  MY: '다채로운 말레이시아 여행',
  PH: '에메랄드빛 필리핀 여행',
  TW: '감성 넘치는 대만 여행',
  FR: '로맨틱한 파리 여행',
  IT: '예술과 맛의 이탈리아 여행',
  ES: '열정 가득한 스페인 여행',
  GB: '클래식한 영국 여행',
  US: '두근두근 미국 여행',
  GR: '그림 같은 그리스 여행',
  MV: '꿈의 몰디브 여행',
};

// ─── 헬퍼 함수 ───────────────────────────────────────────────────────
function formatDateRange(start: string | null, end: string | null): string {
  if (!start) return '날짜 미정 · 천천히 준비 중';
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

function getUpcomingTrip(trips: Trip[]): Trip | null {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const future = trips.filter(t => t.start_date && new Date(t.start_date) >= today);
  if (!future.length) return null;
  return future.sort((a, b) =>
    new Date(a.start_date!).getTime() - new Date(b.start_date!).getTime()
  )[0];
}

// destination에 남아있을 수 있는 이모지 prefix 제거
function cleanDestination(dest: string | null): string | null {
  if (!dest) return null;
  return dest.replace(/^[^\s]+\s/, '');
}

// ─── TripSearchBar ───────────────────────────────────────────────────
function TripSearchBar({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [focused, setFocused] = useState(false);
  return (
    <div className={cn(
      'flex items-center gap-3 bg-white rounded-2xl border px-4 py-3 transition-all duration-200 shadow-sm',
      focused
        ? 'border-violet-400 ring-2 ring-violet-100'
        : 'border-slate-200 hover:border-slate-300',
    )}>
      <Search size={15} className="text-slate-400 shrink-0" />
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholder="어떤 여행을 찾아볼까요?"
        className="flex-1 bg-transparent outline-none text-sm text-slate-700 placeholder:text-slate-400"
      />
      <AnimatePresence>
        {value && (
          <motion.button
            initial={{ opacity: 0, scale: 0.7 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.7 }}
            transition={{ duration: 0.15 }}
            onClick={() => onChange('')}
            className="text-slate-300 hover:text-slate-500 transition-colors"
            aria-label="검색어 지우기"
          >
            <X size={14} />
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── TripCard ────────────────────────────────────────────────────────
function TripCard({ trip, index }: { trip: Trip; index: number }) {
  const router   = useRouter();
  const flag     = FLAG[trip.country_code] ?? '🌐';
  const mood     = MOOD[trip.country_code] ?? '설레는 나만의 여행';
  const gradient = ICON_GRADIENT[trip.country_code] ?? ['#EDE9FE', '#F5F3FF'];
  const roleCfg  = ROLE_CFG[trip.role] ?? { label: trip.role, cls: 'bg-slate-100 text-slate-500' };
  const dest     = cleanDestination(trip.destination);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: index * 0.06, ease: 'easeOut' }}
      whileHover={{ y: -3, transition: { duration: 0.18 } }}
      onClick={() => router.push(`/my/trips/${trip.id}`)}
      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') router.push(`/my/trips/${trip.id}`); }}
      role="button"
      tabIndex={0}
      aria-label={`${trip.title} 여행 상세보기`}
      className="group relative bg-white rounded-3xl border border-slate-100 shadow-sm hover:shadow-xl hover:shadow-slate-200/60 transition-shadow duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 focus-visible:ring-offset-2"
    >
      {/* 잠금 표시 */}
      {trip.is_locked && (
        <div className="absolute top-4 right-14 text-slate-300">
          <Lock size={12} />
        </div>
      )}

      <div className="flex items-center gap-4 p-5">
        {/* 이모지 아이콘 */}
        <div
          className="w-14 h-14 rounded-2xl flex items-center justify-center text-[26px] shrink-0"
          style={{ background: `linear-gradient(140deg, ${gradient[0]}, ${gradient[1]})` }}
        >
          {flag}
        </div>

        {/* 콘텐츠 */}
        <div className="flex-1 min-w-0">
          <h2 className="text-[15px] font-extrabold text-slate-900 truncate leading-snug mb-0.5">
            {trip.title}
          </h2>
          <p className="text-[11px] font-semibold text-violet-400 mb-2.5 truncate">
            {mood}
          </p>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            {dest && (
              <span className="flex items-center gap-1 text-[11px] text-slate-500">
                <MapPin size={10} className="text-slate-400 shrink-0" />
                {dest}
              </span>
            )}
            <span className="flex items-center gap-1 text-[11px] text-slate-500">
              <Calendar size={10} className="text-slate-400 shrink-0" />
              {formatDateRange(trip.start_date, trip.end_date)}
            </span>
            <span className="flex items-center gap-1 text-[11px] text-slate-500">
              <Users size={10} className="text-slate-400 shrink-0" />
              {trip.member_count}명
            </span>
            <span className="flex items-center gap-1 text-[11px] text-slate-500">
              <Navigation size={10} className="text-slate-400 shrink-0" />
              {trip.marker_count}곳
            </span>
          </div>
        </div>

        {/* 역할 뱃지 + 화살표 */}
        <div className="flex items-center gap-2 shrink-0 pl-1">
          <span className={cn('text-[11px] font-bold px-2.5 py-1 rounded-full', roleCfg.cls)}>
            {roleCfg.label}
          </span>
          <ChevronRight
            size={16}
            className="text-slate-300 group-hover:text-violet-400 group-hover:translate-x-0.5 transition-all duration-200 shrink-0"
          />
        </div>
      </div>
    </motion.div>
  );
}

// ─── TripEmptyState ──────────────────────────────────────────────────
function TripEmptyState({ isSearching }: { isSearching: boolean }) {
  return (
    <motion.div
      key={isSearching ? 'search-empty' : 'no-trips'}
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
      className="flex flex-col items-center justify-center py-20 text-center"
    >
      <div className="w-20 h-20 rounded-3xl bg-violet-50 flex items-center justify-center mb-5">
        {isSearching
          ? <Search size={30} className="text-violet-300" />
          : <Luggage size={30} className="text-violet-300" />
        }
      </div>
      <h3 className="text-[17px] font-extrabold text-slate-700 mb-2">
        {isSearching ? '검색 결과가 없어요 🔍' : '아직 떠날 여행이 없어요 🧳'}
      </h3>
      <p className="text-sm text-slate-400 mb-6 leading-relaxed max-w-[220px]">
        {isSearching
          ? '다른 도시나 여행 이름으로\n찾아보세요.'
          : '새로운 여행을 만들고\n일정을 하나씩 채워보세요.'}
      </p>
      {!isSearching && (
        <motion.div whileHover={{ y: -2 }} whileTap={{ scale: 0.97 }}>
          <Link
            href="/room/new"
            className="inline-flex items-center gap-2 bg-gradient-to-r from-violet-500 to-violet-600 text-white text-sm font-bold px-5 py-2.5 rounded-2xl shadow-md shadow-violet-200 hover:shadow-lg transition-shadow"
          >
            <Plus size={15} />
            첫 여행 만들기
          </Link>
        </motion.div>
      )}
    </motion.div>
  );
}

// ─── TripSidebar ─────────────────────────────────────────────────────
function TripSidebar({ trips }: { trips: Trip[] }) {
  const upcoming      = getUpcomingTrip(trips);
  const dday          = getDday(upcoming?.start_date ?? null);
  const totalCount    = trips.length;
  const today         = new Date(); today.setHours(0, 0, 0, 0);
  const upcomingCount = trips.filter(t => t.start_date && new Date(t.start_date) >= today).length;
  const markedCount   = trips.filter(t => t.marker_count > 0).length;

  return (
    <aside className="flex flex-col gap-4">

      {/* ── 다가오는 여행 ── */}
      <motion.div
        initial={{ opacity: 0, x: 12 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.4, delay: 0.15 }}
        className="bg-gradient-to-br from-violet-50 via-purple-50 to-fuchsia-50 border border-violet-100 rounded-3xl p-5"
      >
        <div className="flex items-center gap-2 mb-4">
          <Plane size={14} className="text-violet-500" />
          <span className="text-[11px] font-extrabold text-violet-500 uppercase tracking-widest">
            다가오는 여행
          </span>
        </div>

        {upcoming ? (
          <>
            <div className="flex items-start justify-between gap-2 mb-2">
              <h3 className="text-[15px] font-extrabold text-slate-800 leading-snug truncate">
                {upcoming.title}
              </h3>
              {dday && (
                <span className="shrink-0 text-[11px] font-extrabold text-white bg-violet-500 px-2 py-0.5 rounded-full">
                  {dday}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mb-1">
              {formatDateRange(upcoming.start_date, upcoming.end_date)}
            </p>
            <p className="text-xs text-slate-400 mb-4">
              {FLAG[upcoming.country_code] ?? '🌐'} {cleanDestination(upcoming.destination) ?? '목적지 미정'}
            </p>
            <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-4">
              <Users size={11} className="text-slate-400" />
              <span>{upcoming.member_count}명과 함께 떠나요</span>
            </div>
            <Link
              href={`/my/trips/${upcoming.id}`}
              className="block text-center text-xs font-bold text-violet-600 bg-white hover:bg-violet-50 border border-violet-200 rounded-xl py-2 transition-colors"
            >
              일정 보기 →
            </Link>
          </>
        ) : (
          <div className="text-center py-4">
            <p className="text-sm text-slate-400 mb-3">예정된 여행이 없어요</p>
            <Link
              href="/room/new"
              className="text-xs font-bold text-violet-500 hover:text-violet-700 transition-colors"
            >
              + 새 여행 만들기
            </Link>
          </div>
        )}
      </motion.div>

      {/* ── 여행 요약 ── */}
      <motion.div
        initial={{ opacity: 0, x: 12 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.4, delay: 0.25 }}
        className="bg-gradient-to-br from-sky-50 to-blue-50 border border-sky-100 rounded-3xl p-5"
      >
        <div className="flex items-center gap-2 mb-4">
          <Luggage size={14} className="text-sky-500" />
          <span className="text-[11px] font-extrabold text-sky-500 uppercase tracking-widest">
            여행 요약
          </span>
        </div>
        <div className="grid grid-cols-3 gap-2 text-center">
          {[
            { value: totalCount,    label: '전체' },
            { value: upcomingCount, label: '예정' },
            { value: markedCount,   label: '장소 추가' },
          ].map(({ value, label }) => (
            <div key={label} className="bg-white/70 rounded-2xl py-3 px-1">
              <p className="text-2xl font-black text-slate-800 leading-none">{value}</p>
              <p className="text-[10px] text-slate-500 mt-1 font-semibold">{label}</p>
            </div>
          ))}
        </div>
      </motion.div>

      {/* ── 오늘의 여행 무드 ── */}
      <motion.div
        initial={{ opacity: 0, x: 12 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.4, delay: 0.35 }}
        className="bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-100 rounded-3xl p-5"
      >
        <div className="flex items-center gap-2 mb-3">
          <Sparkles size={14} className="text-emerald-500" />
          <span className="text-[11px] font-extrabold text-emerald-500 uppercase tracking-widest">
            오늘의 여행 무드
          </span>
        </div>
        <p className="text-[13px] font-bold text-slate-700 mb-1.5">
          🌿 따뜻한 바다가 끌린다면
        </p>
        <p className="text-xs text-slate-500 leading-relaxed">
          아직 일정이 비어있는 여행을 열고<br />장소를 하나씩 채워보세요.
        </p>
      </motion.div>

    </aside>
  );
}

// ─── SkeletonCard ────────────────────────────────────────────────────
function SkeletonCard() {
  return (
    <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-5 flex items-center gap-4 animate-pulse">
      <div className="w-14 h-14 rounded-2xl bg-slate-100 shrink-0" />
      <div className="flex-1 space-y-2.5">
        <div className="h-3.5 bg-slate-100 rounded-full w-2/3" />
        <div className="h-2.5 bg-slate-100 rounded-full w-1/3" />
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
      (t.destination ?? '').toLowerCase().includes(query.toLowerCase())
    ),
    [trips, query],
  );

  return (
    <div className="min-h-screen bg-[#F6F4FF]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">

        {/* ── 헤더 ──────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pt-10 pb-8"
        >
          <div>
            <p className="text-sm font-bold text-violet-500 mb-1.5">
              안녕하세요, {nickname}님 👋
            </p>
            <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
              내 여행 일지
            </h1>
            <p className="text-sm text-slate-400 mt-2">
              총 {trips.length}개의 여행
            </p>
          </div>

          <motion.div whileHover={{ y: -2 }} whileTap={{ scale: 0.97 }}>
            <Link
              href="/room/new"
              aria-label="새 여행 만들기"
              className="inline-flex items-center gap-2 bg-gradient-to-r from-violet-500 to-violet-600 hover:from-violet-600 hover:to-violet-700 text-white text-sm font-bold px-5 py-3 rounded-2xl shadow-lg shadow-violet-200 transition-colors w-full sm:w-auto justify-center"
            >
              <Plus size={16} />
              새 여행
            </Link>
          </motion.div>
        </motion.div>

        {/* ── 2-column body ──────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] xl:grid-cols-[1fr_320px] gap-6 xl:gap-8">

          {/* 왼쪽: 검색 + 카드 리스트 */}
          <section>
            <TripSearchBar value={query} onChange={setQuery} />

            <div className="mt-4 flex flex-col gap-3">
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
          <div className="lg:sticky lg:top-8 lg:self-start">
            {trips.length > 0 ? (
              <TripSidebar trips={trips} />
            ) : (
              /* 여행 없을 때 사이드바 플레이스홀더 */
              <div className="space-y-4">
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
