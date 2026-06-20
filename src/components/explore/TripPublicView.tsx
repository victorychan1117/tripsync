'use client';

import Link from 'next/link';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, Calendar, Users, ArrowLeft, Clock, ChevronLeft, ChevronRight, Eye } from 'lucide-react';
import { cn } from '@/lib/utils';

const FLAG: Record<string, string> = {
  KR:'🇰🇷', JP:'🇯🇵', TH:'🇹🇭', VN:'🇻🇳', ID:'🇮🇩', SG:'🇸🇬',
  MY:'🇲🇾', PH:'🇵🇭', TW:'🇹🇼', HK:'🇭🇰', CN:'🇨🇳', FR:'🇫🇷',
  IT:'🇮🇹', ES:'🇪🇸', GB:'🇬🇧', DE:'🇩🇪', US:'🇺🇸', AU:'🇦🇺',
  NZ:'🇳🇿', TR:'🇹🇷', GR:'🇬🇷', CH:'🇨🇭', MV:'🇲🇻', IN:'🇮🇳', CA:'🇨🇦',
};

const CATEGORY_ICON: Record<string, string> = {
  restaurant:'🍽', cafe:'☕', attraction:'🎯', lodging:'🏨',
  shopping:'🛍', transport:'🚆', activity:'🏄', beach:'🏖',
  nature:'🌿', culture:'🏛', etc:'📍',
};

const GRADIENT: Record<string, [string, string]> = {
  KR: ['#43B89C', '#3B82F6'], JP: ['#FF6B6B', '#FF8E53'],
  TH: ['#F59E0B', '#EF4444'], VN: ['#10B981', '#06B6D4'],
};

interface Trip {
  id: string; title: string; destination: string | null;
  country_code: string; start_date: string | null; end_date: string | null;
  nights: number; marker_count: number; member_count: number; view_count: number;
}

interface Marker {
  id: number; name: string; address: string | null;
  category: string; day_number: number; stay_minutes: number; memo: string | null;
}

function formatDateRange(start: string | null, end: string | null): string {
  if (!start) return '날짜 미정';
  const s = new Date(start);
  const e = end ? new Date(end) : null;
  const fmt = (d: Date) => d.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' });
  return e ? `${fmt(s)} ~ ${fmt(e)}` : fmt(s);
}

function getDayDate(startDate: string | null, dayNumber: number): string | null {
  if (!startDate) return null;
  const d = new Date(startDate);
  d.setDate(d.getDate() + (dayNumber - 1));
  return d.toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric' });
}

function fmtStay(min: number): string | null {
  if (!min) return null;
  const h = Math.floor(min / 60), m = min % 60;
  return h > 0 ? (m > 0 ? `${h}시간 ${m}분` : `${h}시간`) : `${m}분`;
}

export default function TripPublicView({ trip, markers }: { trip: Trip; markers: Marker[] }) {
  const flag    = FLAG[trip.country_code] ?? '🌐';
  const dest    = trip.destination ?? '여행지';
  const [g1, g2] = GRADIENT[trip.country_code] ?? ['#6366F1', '#8B5CF6'];
  const days    = Array.from(new Set(markers.map(m => m.day_number))).sort((a, b) => a - b);
  const [activeDay, setActiveDay] = useState<number>(days[0] ?? 1);
  const activeMarkers = markers.filter(m => m.day_number === activeDay);

  const dayIdx     = days.indexOf(activeDay);
  const hasPrev    = dayIdx > 0;
  const hasNext    = dayIdx < days.length - 1;

  return (
    <div className="min-h-screen">
      {/* ── 헤더 배너 ── */}
      <div
        className="px-4 sm:px-6 lg:px-8 pt-6 pb-8"
        style={{ background: `linear-gradient(135deg, ${g1}, ${g2})` }}
      >
        <div className="max-w-4xl mx-auto">
          <Link
            href="/explore"
            className="group inline-flex items-center gap-1.5 text-white/70 hover:text-white text-sm font-semibold mb-5 transition-colors"
          >
            <ArrowLeft size={14} className="group-hover:-translate-x-0.5 transition-transform" />
            여행 탐색
          </Link>

          <div className="flex items-start gap-4">
            <div className="text-5xl leading-none mt-1 select-none drop-shadow">{flag}</div>
            <div className="flex-1">
              <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight leading-snug mb-2">
                {trip.title}
              </h1>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
                {trip.destination && (
                  <span className="flex items-center gap-1.5 text-white/80 text-[13px]">
                    <MapPin size={12} />{dest}
                  </span>
                )}
                <span className="flex items-center gap-1.5 text-white/80 text-[13px]">
                  <Calendar size={12} />{formatDateRange(trip.start_date, trip.end_date)}
                </span>
                <span className="flex items-center gap-1.5 text-white/80 text-[13px]">
                  <Users size={12} />{trip.member_count}명 함께
                </span>
                <span className="flex items-center gap-1.5 text-white/80 text-[13px]">
                  <Eye size={12} />{trip.view_count.toLocaleString()}회
                </span>
              </div>
            </div>
          </div>

          {/* 통계 칩 */}
          <div className="flex gap-2 mt-5 flex-wrap">
            <div className="bg-white/20 text-white rounded-xl px-3.5 py-2 text-center">
              <div className="text-lg font-black leading-none">{trip.nights}박 {trip.nights + 1}일</div>
              <div className="text-[10px] text-white/70 mt-0.5">여행 기간</div>
            </div>
            <div className="bg-white/20 text-white rounded-xl px-3.5 py-2 text-center">
              <div className="text-lg font-black leading-none">{trip.marker_count}</div>
              <div className="text-[10px] text-white/70 mt-0.5">개 장소</div>
            </div>
            <div className="bg-white/20 text-white rounded-xl px-3.5 py-2 text-center">
              <div className="text-lg font-black leading-none">{days.length}</div>
              <div className="text-[10px] text-white/70 mt-0.5">일 일정</div>
            </div>
          </div>
        </div>
      </div>

      {/* ── 본문 ── */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {markers.length === 0 ? (
          <div className="bg-white rounded-3xl border-2 border-dashed border-slate-200 py-16 flex flex-col items-center text-center">
            <div className="text-5xl mb-4">🗺️</div>
            <p className="text-[15px] font-extrabold text-slate-600 mb-1.5">아직 추가된 장소가 없어요</p>
            <p className="text-sm text-slate-400">여행자가 장소를 추가하면 여기에 표시돼요.</p>
          </div>
        ) : (
          <>
            {/* Day 탭 + 이전/다음 */}
            <div className="flex items-center gap-3 mb-6">
              <button
                onClick={() => hasPrev && setActiveDay(days[dayIdx - 1])}
                disabled={!hasPrev}
                className="w-8 h-8 rounded-full flex items-center justify-center bg-white border border-slate-200 text-slate-400 hover:text-violet-500 hover:border-violet-200 disabled:opacity-30 transition-colors shrink-0"
              >
                <ChevronLeft size={16} />
              </button>

              <div className="flex gap-2 overflow-x-auto flex-1 [scrollbar-width:none]">
                {days.map(day => {
                  const date   = getDayDate(trip.start_date, day);
                  const active = day === activeDay;
                  return (
                    <button
                      key={day}
                      onClick={() => setActiveDay(day)}
                      className={cn(
                        'flex-shrink-0 flex flex-col items-center px-4 py-2.5 rounded-2xl border text-sm font-bold transition-all duration-200',
                        active
                          ? 'bg-violet-500 text-white border-violet-500 shadow-md shadow-violet-200'
                          : 'bg-white text-slate-500 border-slate-200 hover:border-violet-300 hover:text-violet-500',
                      )}
                    >
                      <span className="text-[13px] font-extrabold leading-tight">Day {day}</span>
                      {date && (
                        <span className={cn('text-[10px] font-semibold mt-0.5', active ? 'text-violet-200' : 'text-slate-400')}>
                          {date}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              <button
                onClick={() => hasNext && setActiveDay(days[dayIdx + 1])}
                disabled={!hasNext}
                className="w-8 h-8 rounded-full flex items-center justify-center bg-white border border-slate-200 text-slate-400 hover:text-violet-500 hover:border-violet-200 disabled:opacity-30 transition-colors shrink-0"
              >
                <ChevronRight size={16} />
              </button>
            </div>

            {/* 마커 목록 */}
            <AnimatePresence mode="wait">
              <motion.div
                key={activeDay}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.18 }}
                className="flex flex-col gap-3"
              >
                {activeMarkers.length === 0 ? (
                  <div className="bg-white rounded-2xl border border-dashed border-slate-200 py-10 text-center">
                    <p className="text-sm text-slate-400">이 날은 아직 장소가 없어요</p>
                  </div>
                ) : activeMarkers.map((m, i) => {
                  const icon  = CATEGORY_ICON[m.category] ?? '📍';
                  const stay  = fmtStay(m.stay_minutes);
                  return (
                    <motion.div
                      key={m.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex items-start gap-3"
                    >
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-50 to-indigo-50 flex items-center justify-center text-lg shrink-0">
                        {icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-violet-500 text-white text-[10px] font-extrabold shrink-0">
                            {i + 1}
                          </span>
                          <span className="text-[14px] font-extrabold text-slate-900 truncate">{m.name}</span>
                        </div>
                        {m.address && (
                          <p className="text-[11px] text-slate-400 truncate ml-7">{m.address}</p>
                        )}
                        {stay && (
                          <span className="inline-flex items-center gap-1 text-[11px] text-slate-500 mt-1 ml-7">
                            <Clock size={10} className="text-slate-400" />
                            {stay} 체류
                          </span>
                        )}
                        {m.memo && (
                          <p className="text-[11px] text-slate-500 mt-1.5 ml-7 line-clamp-2 leading-relaxed">{m.memo}</p>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </motion.div>
            </AnimatePresence>
          </>
        )}

        {/* 나도 만들기 CTA */}
        <div className="mt-10 bg-gradient-to-br from-violet-50 to-indigo-50 border border-violet-100 rounded-3xl p-6 text-center">
          <p className="text-[15px] font-extrabold text-slate-800 mb-1.5">
            이런 여행 일정 나도 만들어볼까요? ✈️
          </p>
          <p className="text-sm text-slate-500 mb-4">
            TripSync로 친구들과 함께 여행 일정을 만들어보세요.
          </p>
          <Link
            href="/room/new"
            className="inline-flex items-center gap-2 bg-gradient-to-r from-violet-500 to-indigo-500 hover:from-violet-600 hover:to-indigo-600 text-white text-sm font-bold px-6 py-3 rounded-2xl shadow-md shadow-violet-200 transition-colors"
          >
            새 여행 만들기
          </Link>
        </div>
      </div>
    </div>
  );
}
