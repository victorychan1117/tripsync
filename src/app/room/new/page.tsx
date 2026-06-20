'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Navigation, Loader2, Search, ChevronLeft, ChevronRight,
  CalendarDays, Copy, Check, ArrowRight, ArrowLeft, Users, Link2, X,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

// ─── 여행지 데이터 ────────────────────────────────────────────────
const DOMESTIC = [
  '제주도','서울','부산','경주','전주','강릉','여수','속초','제천','인천',
  '대구','광주','대전','춘천','통영','거제','남해','포항','울산','수원',
];

const INTERNATIONAL: { flag: string; region: string; places: string[]; code: string }[] = [
  { flag: '🇯🇵', region: '일본',       code: 'JP', places: ['도쿄','오사카','교토','후쿠오카','삿포로','나고야','나라','오키나와'] },
  { flag: '🇹🇭', region: '태국',       code: 'TH', places: ['방콕','치앙마이','푸켓','파타야','크라비'] },
  { flag: '🇻🇳', region: '베트남',     code: 'VN', places: ['하노이','호치민','다낭','나트랑','호이안','푸꾸옥','달랏'] },
  { flag: '🇮🇩', region: '인도네시아', code: 'ID', places: ['발리','자카르타','롬복'] },
  { flag: '🇸🇬', region: '싱가포르',   code: 'SG', places: ['싱가포르'] },
  { flag: '🇲🇾', region: '말레이시아', code: 'MY', places: ['쿠알라룸푸르','페낭','코타키나발루','랑카위'] },
  { flag: '🇵🇭', region: '필리핀',     code: 'PH', places: ['마닐라','세부','보라카이','팔라완'] },
  { flag: '🇹🇼', region: '대만',       code: 'TW', places: ['타이페이','타이중','가오슝','화롄'] },
  { flag: '🇭🇰', region: '홍콩',       code: 'HK', places: ['홍콩'] },
  { flag: '🇨🇳', region: '중국',       code: 'CN', places: ['상하이','베이징','청두','시안','하이난'] },
  { flag: '🇫🇷', region: '프랑스',     code: 'FR', places: ['파리','니스','리옹'] },
  { flag: '🇮🇹', region: '이탈리아',   code: 'IT', places: ['로마','밀라노','피렌체','베네치아','나폴리'] },
  { flag: '🇪🇸', region: '스페인',     code: 'ES', places: ['바르셀로나','마드리드','세비야','그라나다'] },
  { flag: '🇬🇧', region: '영국',       code: 'GB', places: ['런던','에든버러'] },
  { flag: '🇩🇪', region: '독일',       code: 'DE', places: ['베를린','뮌헨','프랑크푸르트'] },
  { flag: '🇺🇸', region: '미국',       code: 'US', places: ['뉴욕','로스앤젤레스','라스베가스','하와이','샌프란시스코','시카고'] },
  { flag: '🇦🇺', region: '호주',       code: 'AU', places: ['시드니','멜버른','골드코스트','케언즈'] },
  { flag: '🇳🇿', region: '뉴질랜드',   code: 'NZ', places: ['오클랜드','퀸즈타운','크라이스트처치'] },
  { flag: '🇹🇷', region: '터키',       code: 'TR', places: ['이스탄불','카파도키아','안탈리아'] },
  { flag: '🇬🇷', region: '그리스',     code: 'GR', places: ['아테네','산토리니','미코노스'] },
  { flag: '🇨🇭', region: '스위스',     code: 'CH', places: ['취리히','제네바','인터라켄'] },
  { flag: '🇲🇻', region: '몰디브',     code: 'MV', places: ['몰디브'] },
  { flag: '🇮🇳', region: '인도',       code: 'IN', places: ['뭄바이','뉴델리','고아','자이푸르'] },
  { flag: '🇲🇦', region: '모로코',     code: 'MA', places: ['마라케시','페스','카사블랑카'] },
  { flag: '🇧🇷', region: '브라질',     code: 'BR', places: ['리우데자네이루','상파울루'] },
  { flag: '🇲🇽', region: '멕시코',     code: 'MX', places: ['멕시코시티','칸쿤'] },
  { flag: '🇨🇦', region: '캐나다',     code: 'CA', places: ['밴쿠버','토론토','퀘벡'] },
];

// ─── 날짜 유틸 ────────────────────────────────────────────────────
const WEEKDAYS = ['일','월','화','수','목','금','토'];
const MONTHS   = ['1월','2월','3월','4월','5월','6월','7월','8월','9월','10월','11월','12월'];
const AVATAR_COLORS = ['#6366F1','#EC4899','#10B981','#F97316'];

function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();
}

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function calendarCells(year: number, month: number): Array<Date | null> {
  const firstWd = new Date(year, month, 1).getDay();
  const days    = new Date(year, month + 1, 0).getDate();
  return [
    ...Array<null>(firstWd).fill(null),
    ...Array.from({ length: days }, (_, i) => new Date(year, month, i + 1)),
  ];
}

function toYMD(d: Date) { return d.toISOString().split('T')[0]; }

function nightsLabel(s: Date, e: Date) {
  const n = Math.round((e.getTime() - s.getTime()) / 86400000);
  return n === 0 ? '당일치기' : `${n}박 ${n + 1}일`;
}

function dateLabel(s: Date | null, e: Date | null) {
  if (!s) return null;
  const fmt = (d: Date) => `${d.getMonth() + 1}월 ${d.getDate()}일 (${WEEKDAYS[d.getDay()]})`;
  if (!e) return `${fmt(s)} →`;
  return `${fmt(s)} → ${fmt(e)}  ·  ${nightsLabel(s, e)}`;
}

// ─── Calendar 컴포넌트 ────────────────────────────────────────────
interface CalendarProps {
  startDate:  Date | null;
  endDate:    Date | null;
  hoverDate:  Date | null;
  month:      Date;
  onDayClick: (d: Date) => void;
  onHover:    (d: Date | null) => void;
  onPrev:     () => void;
  onNext:     () => void;
}

function Calendar({ startDate, endDate, hoverDate, month, onDayClick, onHover, onPrev, onNext }: CalendarProps) {
  const today    = startOfDay(new Date());
  const cells    = calendarCells(month.getFullYear(), month.getMonth());
  const effectiveEnd = endDate || hoverDate;

  const dayClass = (date: Date | null) => {
    if (!date) return '';
    const d     = startOfDay(date);
    const past  = d < today;
    const isS   = !!startDate && sameDay(d, startDate);
    const isE   = !!endDate   && sameDay(d, endDate);
    const isH   = !!hoverDate && !endDate && sameDay(d, hoverDate);
    const range = startDate && effectiveEnd &&
      d > startOfDay(startDate) && d < startOfDay(effectiveEnd);

    return cn(
      'relative flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium transition-all select-none mx-auto',
      past  ? 'text-slate-300 cursor-default' : 'cursor-pointer',
      !past && !isS && !isE && !isH && 'hover:bg-violet-50 hover:text-violet-600',
      (isS || isE) && 'bg-violet-500 text-white font-bold shadow-sm',
      isH    && 'bg-violet-100 text-violet-700',
      range  && 'bg-violet-50 text-violet-700 rounded-none',
    );
  };

  const rangeWrapClass = (date: Date | null) => {
    if (!date || !startDate || !effectiveEnd) return '';
    const d   = startOfDay(date);
    const s   = startOfDay(startDate);
    const e   = startOfDay(effectiveEnd);
    const isS = sameDay(d, s);
    const isE = sameDay(d, e);
    if (isS && isE) return '';
    if (isS) return 'bg-violet-50 rounded-l-full';
    if (isE) return 'bg-violet-50 rounded-r-full';
    if (d > s && d < e) return 'bg-violet-50';
    return '';
  };

  return (
    <div className="p-4">
      {/* 월 네비게이션 */}
      <div className="flex items-center justify-between mb-4">
        <button type="button" onClick={onPrev}
          className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 transition-colors">
          <ChevronLeft size={16} className="text-slate-500" />
        </button>
        <span className="text-sm font-bold text-slate-800">
          {month.getFullYear()}년 {MONTHS[month.getMonth()]}
        </span>
        <button type="button" onClick={onNext}
          className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 transition-colors">
          <ChevronRight size={16} className="text-slate-500" />
        </button>
      </div>

      {/* 요일 헤더 */}
      <div className="grid grid-cols-7 mb-1">
        {WEEKDAYS.map((wd, i) => (
          <div key={wd} className={cn(
            'text-center text-[11px] font-semibold py-1',
            i === 0 ? 'text-red-400' : i === 6 ? 'text-blue-400' : 'text-slate-400',
          )}>
            {wd}
          </div>
        ))}
      </div>

      {/* 날짜 그리드 */}
      <div className="grid grid-cols-7">
        {cells.map((date, idx) => (
          <div key={idx} className={cn('py-0.5', date ? rangeWrapClass(date) : '')}>
            {date ? (
              <div
                className={dayClass(date)}
                onClick={() => {
                  const d = startOfDay(date);
                  if (d < today) return;
                  onDayClick(d);
                }}
                onMouseEnter={() => onHover(startOfDay(date))}
                onMouseLeave={() => onHover(null)}
              >
                {date.getDate()}
                {sameDay(date, today) && !startDate && (
                  <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-violet-400" />
                )}
              </div>
            ) : (
              <div className="w-8 h-8 mx-auto" />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Types ───────────────────────────────────────────────────────
type Step = 'form' | 'success';
interface CreatedRoom { id: string; title: string; destination: string; startDate: Date | null; endDate: Date | null; }

// ─── Page ────────────────────────────────────────────────────────
export default function NewRoomPage() {
  const router = useRouter();

  // Step
  const [step,        setStep]       = useState<Step>('form');

  // 여행 이름
  const [tripName,    setTripName]   = useState('');

  // 여행지
  const [tab,         setTab]        = useState<'KR' | 'INTL'>('KR');
  const [query,       setQuery]      = useState('');
  const [destination, setDest]       = useState('');
  const [countryCode, setCCode]      = useState('KR');
  const [showList,    setShowList]   = useState(false);

  // 날짜
  const [startDate,   setStartDate]  = useState<Date | null>(null);
  const [endDate,     setEndDate]    = useState<Date | null>(null);
  const [hoverDate,   setHoverDate]  = useState<Date | null>(null);
  const [showCal,     setShowCal]    = useState(false);
  const [calMonth,    setCalMonth]   = useState(() => { const d = new Date(); d.setDate(1); return d; });

  // Submit
  const [loading,     setLoading]    = useState(false);
  const [error,       setError]      = useState('');

  // Success
  const [room,        setRoom]       = useState<CreatedRoom | null>(null);
  const [copied,      setCopied]     = useState(false);

  // Refs
  const searchRef   = useRef<HTMLDivElement>(null);
  const calRef      = useRef<HTMLDivElement>(null);

  // Click-outside
  useEffect(() => {
    function down(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) setShowList(false);
      if (calRef.current   && !calRef.current.contains(e.target as Node))   setShowCal(false);
    }
    document.addEventListener('mousedown', down);
    return () => document.removeEventListener('mousedown', down);
  }, []);

  // 여행지 선택
  const handleSelect = useCallback((name: string, code: string) => {
    setDest(name); setCCode(code); setShowList(false); setQuery('');
    if (!tripName) setTripName(`${name} 여행`);
  }, [tripName]);

  // 탭 전환
  const handleTab = (t: 'KR' | 'INTL') => {
    setTab(t); setQuery(''); setDest(''); setShowList(false);
  };

  // 달력 날짜 클릭
  const handleDayClick = (date: Date) => {
    if (!startDate || (startDate && endDate)) {
      setStartDate(date); setEndDate(null);
    } else {
      if (date < startDate) { setStartDate(date); setEndDate(null); }
      else { setEndDate(date); setShowCal(false); setHoverDate(null); }
    }
  };

  // 월 이동
  const prevMonth = () => setCalMonth(m => new Date(m.getFullYear(), m.getMonth() - 1, 1));
  const nextMonth = () => setCalMonth(m => new Date(m.getFullYear(), m.getMonth() + 1, 1));

  // 필터링된 도시 목록 (캐러셀)
  const carousel: { label: string; code: string }[] =
    tab === 'KR'
      ? DOMESTIC.filter(n => n.includes(query)).map(n => ({ label: `🇰🇷 ${n}`, code: 'KR' }))
      : INTERNATIONAL.flatMap(r =>
          r.places
            .filter(p => p.includes(query) || r.region.includes(query))
            .map(p => ({ label: `${r.flag} ${p}`, code: r.code }))
        );

  // 초대 URL
  const inviteUrl = room
    ? `${typeof window !== 'undefined' ? window.location.origin : ''}/room/${room.id}`
    : '';

  const handleCopy = async () => {
    try { await navigator.clipboard.writeText(inviteUrl); } catch { /* fallback */ }
    setCopied(true); setTimeout(() => setCopied(false), 2500);
  };

  // 제출
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!destination.trim()) { setError('여행지를 선택해주세요'); return; }
    const finalTitle = tripName.trim() || `${destination} 여행`;
    setLoading(true); setError('');
    try {
      const res = await fetch('/api/rooms', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          title:       finalTitle,
          destination: destination.trim(),
          countryCode,
          startDate:   startDate ? toYMD(startDate) : null,
          endDate:     endDate   ? toYMD(endDate)   : null,
        }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error ?? '방 생성 실패'); }
      const { room: r } = await res.json();
      setRoom({ id: r.id, title: finalTitle, destination, startDate, endDate });
      setStep('success');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '알 수 없는 오류');
    } finally { setLoading(false); }
  };

  const label     = dateLabel(startDate, endDate);
  const nightsTxt = startDate && endDate ? nightsLabel(startDate, endDate) : null;

  // ──────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 via-white to-indigo-50 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-[440px]">
        {/* 뒤로가기 — form 단계에서만 표시 */}
        <AnimatePresence>
          {step === 'form' && (
            <motion.div
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -6 }}
              transition={{ duration: 0.2 }}
              className="mb-4"
            >
              <Link
                href="/my/trips"
                className="group inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-violet-500 transition-colors duration-200"
              >
                <ArrowLeft
                  size={15}
                  className="group-hover:-translate-x-0.5 transition-transform duration-200"
                />
                내 여행 일지로
              </Link>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence mode="wait">

          {/* ══════════════════════════ STEP: FORM ══════ */}
          {step === 'form' && (
            <motion.div
              key="form"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              className="bg-white rounded-[28px] shadow-[0_24px_64px_rgba(99,102,241,0.13)] overflow-hidden"
            >
              {/* 헤더 */}
              <div className="bg-gradient-to-br from-violet-500 to-indigo-500 px-8 pt-7 pb-6">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                    <Navigation size={20} className="text-white" />
                  </div>
                  <span className="text-xl font-extrabold text-white tracking-tight">새 여행 만들기</span>
                </div>
                <p className="text-white/65 text-sm">링크 하나로 팀원을 즉시 초대할 수 있어요</p>
              </div>

              <form onSubmit={handleSubmit} className="px-8 py-8 flex flex-col gap-7">

                {/* ── [1] 여행 이름 ─────────────────────────────── */}
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-2 tracking-wide uppercase">
                    여행 이름
                  </label>
                  <input
                    type="text"
                    value={tripName}
                    onChange={e => setTripName(e.target.value)}
                    placeholder="예: 즐거운 오사카 먹방 여행"
                    maxLength={40}
                    className="w-full px-4 py-3.5 rounded-2xl border-2 border-slate-200 focus:border-violet-400 focus:ring-4 focus:ring-violet-500/10 text-sm text-slate-800 placeholder:text-slate-300 outline-none transition-all"
                  />
                </div>

                {/* ── [2] 여행지 ───────────────────────────────── */}
                <div ref={searchRef}>
                  <label className="block text-xs font-bold text-slate-500 mb-2 tracking-wide uppercase">
                    여행지 <span className="text-red-400 ml-0.5">*</span>
                  </label>

                  {/* 탭 */}
                  <div className="flex gap-2 mb-3">
                    {[{ key: 'KR', label: '🇰🇷 국내' }, { key: 'INTL', label: '🌏 해외' }].map(t => (
                      <button
                        key={t.key}
                        type="button"
                        onClick={() => handleTab(t.key as 'KR' | 'INTL')}
                        className={cn(
                          'flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all',
                          tab === t.key
                            ? 'bg-violet-500 text-white shadow-sm'
                            : 'bg-slate-100 text-slate-500 hover:bg-slate-200',
                        )}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>

                  {/* 검색창 */}
                  <div className="relative">
                    <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    <input
                      type="text"
                      value={query}
                      onChange={e => {
                        const q = e.target.value;
                        setQuery(q);
                        // 입력어가 해외 국가명 또는 도시명과 일치하면 해외 탭으로 자동 전환
                        if (q && tab === 'KR') {
                          const hitsIntl = INTERNATIONAL.some(
                            r => r.region.includes(q) || r.places.some(p => p.includes(q))
                          );
                          if (hitsIntl) setTab('INTL');
                        }
                        // 입력어가 국내 도시명과 일치하면 국내 탭으로 자동 전환
                        if (q && tab === 'INTL') {
                          const hitsDom = DOMESTIC.some(n => n.includes(q));
                          if (hitsDom) setTab('KR');
                        }
                      }}
                      onFocus={() => setShowList(true)}
                      placeholder={tab === 'KR' ? '국내 여행지 검색 (예: 제주도)' : '해외 여행지 검색 (예: 오사카)'}
                      className="w-full pl-9 pr-9 py-3 rounded-xl border-2 border-slate-200 focus:border-violet-400 focus:ring-4 focus:ring-violet-500/10 text-sm outline-none transition-all text-slate-700 placeholder:text-slate-300"
                    />
                    {query && (
                      <button type="button" onClick={() => setQuery('')}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500 transition-colors">
                        <X size={14} />
                      </button>
                    )}
                  </div>

                  {/* 도시 캐러셀 — 검색 포커스 시 슬라이드 */}
                  <AnimatePresence>
                    {showList && (
                      <motion.div
                        initial={{ opacity: 0, y: -6, height: 0 }}
                        animate={{ opacity: 1, y: 0, height: 'auto' }}
                        exit={{ opacity: 0, y: -6, height: 0 }}
                        transition={{ duration: 0.2, ease: 'easeOut' }}
                        className="overflow-hidden"
                      >
                        <div className="mt-2 flex gap-2 overflow-x-auto pb-2 [scrollbar-width:none] [-webkit-overflow-scrolling:touch]">
                          {carousel.length > 0 ? (
                            carousel.map(({ label: cityLabel, code }) => {
                              const name = cityLabel.replace(/^[^\s]+\s/, '');
                              return (
                                <button
                                  key={cityLabel}
                                  type="button"
                                  onClick={() => handleSelect(name, code)}
                                  className={cn(
                                    'flex-shrink-0 px-3.5 py-2 rounded-xl text-[13px] font-semibold border transition-all whitespace-nowrap',
                                    destination === name
                                      ? 'bg-violet-500 text-white border-violet-500 shadow-sm'
                                      : 'bg-white text-slate-600 border-slate-200 hover:border-violet-300 hover:text-violet-600',
                                  )}
                                >
                                  {cityLabel}
                                </button>
                              );
                            })
                          ) : (
                            <button
                              type="button"
                              onClick={() => { if (query) handleSelect(query, tab === 'KR' ? 'KR' : 'INTL'); }}
                              className="flex-shrink-0 px-4 py-2 rounded-xl text-[13px] font-semibold bg-violet-50 text-violet-600 border border-violet-200 hover:bg-violet-100 transition-all whitespace-nowrap"
                            >
                              &ldquo;{query}&rdquo; 으로 만들기
                            </button>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* 선택된 여행지 표시 */}
                  {destination && !showList && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="mt-2 flex items-center gap-2"
                    >
                      <span className="text-xs font-semibold text-violet-600 bg-violet-50 border border-violet-100 px-2.5 py-1 rounded-full">
                        ✓ {destination} {countryCode !== 'KR' ? '· 구글 지도' : '· 카카오 지도'}
                      </span>
                      <button type="button" onClick={() => { setDest(''); setShowList(true); }}
                        className="text-xs text-slate-400 hover:text-slate-600 transition-colors">
                        변경
                      </button>
                    </motion.div>
                  )}
                </div>

                {/* ── [3] 여행 기간 — Date Range Picker ───────── */}
                <div ref={calRef}>
                  <label className="block text-xs font-bold text-slate-500 mb-2 tracking-wide uppercase">
                    여행 기간
                  </label>

                  {/* 날짜 표시 필드 */}
                  <button
                    type="button"
                    onClick={() => setShowCal(v => !v)}
                    className={cn(
                      'w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl border-2 text-sm text-left transition-all',
                      showCal
                        ? 'border-violet-400 ring-4 ring-violet-500/10 bg-white'
                        : 'border-slate-200 bg-white hover:border-slate-300',
                    )}
                  >
                    <CalendarDays
                      size={16}
                      className={showCal ? 'text-violet-500' : 'text-slate-400'}
                    />
                    <span className={label ? 'text-slate-800 font-medium' : 'text-slate-300'}>
                      {label ?? '여행 날짜를 선택해주세요'}
                    </span>
                    {(startDate || endDate) && (
                      <button
                        type="button"
                        onClick={e => { e.stopPropagation(); setStartDate(null); setEndDate(null); setShowCal(false); }}
                        className="ml-auto text-slate-300 hover:text-slate-500 transition-colors"
                      >
                        <X size={14} />
                      </button>
                    )}
                  </button>

                  {/* 달력 팝업 */}
                  <AnimatePresence>
                    {showCal && (
                      <motion.div
                        initial={{ opacity: 0, y: -8, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -8, scale: 0.98 }}
                        transition={{ duration: 0.18, ease: 'easeOut' }}
                        className="mt-2 bg-white border border-slate-200 rounded-2xl shadow-[0_12px_40px_rgba(0,0,0,0.10)] overflow-hidden"
                      >
                        {/* 선택 가이드 */}
                        <div className="px-4 pt-3 pb-0 flex items-center gap-2">
                          <div className={cn('flex-1 text-center text-xs font-semibold py-1.5 rounded-lg transition-colors',
                            startDate && !endDate ? 'bg-violet-500 text-white' : 'bg-slate-100 text-slate-400')}>
                            {startDate ? `${startDate.getMonth() + 1}월 ${startDate.getDate()}일` : '출발일'}
                          </div>
                          <ChevronRight size={14} className="text-slate-300 flex-shrink-0" />
                          <div className={cn('flex-1 text-center text-xs font-semibold py-1.5 rounded-lg transition-colors',
                            endDate ? 'bg-violet-500 text-white' : 'bg-slate-100 text-slate-400')}>
                            {endDate ? `${endDate.getMonth() + 1}월 ${endDate.getDate()}일` : '귀국일'}
                          </div>
                          {nightsTxt && (
                            <span className="text-[11px] font-bold text-violet-600 bg-violet-50 px-2 py-1 rounded-lg flex-shrink-0">
                              {nightsTxt}
                            </span>
                          )}
                        </div>

                        <Calendar
                          startDate={startDate}
                          endDate={endDate}
                          hoverDate={hoverDate}
                          month={calMonth}
                          onDayClick={handleDayClick}
                          onHover={setHoverDate}
                          onPrev={prevMonth}
                          onNext={nextMonth}
                        />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* 에러 */}
                <AnimatePresence>
                  {error && (
                    <motion.p
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="text-xs text-red-500 bg-red-50 border border-red-100 rounded-xl px-4 py-2.5"
                    >
                      ⚠️ {error}
                    </motion.p>
                  )}
                </AnimatePresence>

                {/* 제출 */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-4 rounded-2xl bg-gradient-to-r from-violet-500 to-indigo-500 hover:from-violet-600 hover:to-indigo-600 text-white font-bold text-sm shadow-[0_4px_20px_rgba(99,102,241,0.35)] hover:shadow-[0_8px_28px_rgba(99,102,241,0.45)] hover:-translate-y-0.5 transition-all duration-200 disabled:opacity-60 disabled:translate-y-0 flex items-center justify-center gap-2"
                >
                  {loading
                    ? <><Loader2 size={17} className="animate-spin" />생성 중...</>
                    : <><Navigation size={17} />여행 시작하기</>}
                </button>
              </form>
            </motion.div>
          )}

          {/* ════════════════════════ STEP: SUCCESS ══════ */}
          {step === 'success' && room && (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.96, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
              className="bg-white rounded-[28px] shadow-[0_24px_64px_rgba(99,102,241,0.14)] overflow-hidden"
            >
              <div className="bg-gradient-to-br from-violet-500 to-indigo-500 px-8 pt-8 pb-8 text-center">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.15, type: 'spring', stiffness: 260, damping: 18 }}
                  className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-4"
                >
                  <span className="text-3xl">✈️</span>
                </motion.div>
                <h2 className="text-xl font-extrabold text-white mb-1">여행이 생성되었어요!</h2>
                <p className="text-white/70 text-sm">{room.title}</p>
              </div>

              <div className="px-8 py-7 flex flex-col gap-5">
                <div className="flex gap-3">
                  <div className="flex-1 bg-violet-50 rounded-2xl p-4 text-center">
                    <div className="text-lg font-extrabold text-violet-600">{room.destination}</div>
                    <div className="text-xs text-slate-400 mt-0.5">여행지</div>
                  </div>
                  {room.startDate && room.endDate && (
                    <div className="flex-1 bg-indigo-50 rounded-2xl p-4 text-center">
                      <div className="text-lg font-extrabold text-indigo-600">
                        {nightsLabel(room.startDate, room.endDate)}
                      </div>
                      <div className="text-xs text-slate-400 mt-0.5">일정</div>
                    </div>
                  )}
                </div>

                <div>
                  <div className="flex items-center gap-1.5 mb-2">
                    <Link2 size={13} className="text-slate-400" />
                    <span className="text-xs font-bold text-slate-600">팀원 초대 링크</span>
                  </div>
                  <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3">
                    <span className="flex-1 text-xs text-slate-500 truncate font-mono">{inviteUrl}</span>
                    <motion.button
                      whileTap={{ scale: 0.92 }}
                      type="button"
                      onClick={handleCopy}
                      className={cn(
                        'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex-shrink-0',
                        copied ? 'bg-green-500 text-white' : 'bg-violet-500 hover:bg-violet-600 text-white',
                      )}
                    >
                      {copied ? <><Check size={13} />복사됨</> : <><Copy size={13} />복사</>}
                    </motion.button>
                  </div>
                </div>

                <div className="bg-gradient-to-r from-violet-50 to-indigo-50 rounded-2xl p-4 border border-violet-100">
                  <div className="flex items-center gap-2 mb-2">
                    <Users size={14} className="text-violet-500" />
                    <span className="text-xs font-bold text-violet-700">실시간 협업 준비 완료</span>
                    <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse ml-auto" />
                  </div>
                  <div className="flex items-center gap-1">
                    {AVATAR_COLORS.map((color, i) => (
                      <motion.div
                        key={i}
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: i === 0 ? 1 : 0.35 }}
                        transition={{ delay: 0.4 + i * 0.08, type: 'spring' }}
                        className="w-7 h-7 rounded-full border-2 border-white flex items-center justify-center text-white text-[10px] font-bold"
                        style={{ background: color, marginLeft: i === 0 ? 0 : -8 }}
                      >
                        {i === 0 ? 'ME' : '?'}
                      </motion.div>
                    ))}
                    <span className="text-xs text-slate-400 ml-2">팀원을 초대해보세요</span>
                  </div>
                </div>

                <div className="flex flex-col gap-2.5">
                  <motion.button
                    whileHover={{ y: -1 }}
                    whileTap={{ scale: 0.98 }}
                    type="button"
                    onClick={() => router.push(`/room/${room.id}/edit`)}
                    className="w-full py-4 rounded-2xl bg-gradient-to-r from-violet-500 to-indigo-500 hover:from-violet-600 hover:to-indigo-600 text-white font-bold text-sm shadow-[0_4px_20px_rgba(99,102,241,0.35)] transition-all flex items-center justify-center gap-2"
                  >
                    방 입장하기 <ArrowRight size={17} />
                  </motion.button>
                  <button
                    type="button"
                    onClick={handleCopy}
                    className="w-full py-3 rounded-2xl border-2 border-slate-200 hover:border-violet-300 hover:text-violet-600 text-slate-600 font-semibold text-sm transition-all flex items-center justify-center gap-2"
                  >
                    <Copy size={15} />초대 링크 공유하기
                  </button>
                </div>
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  );
}
