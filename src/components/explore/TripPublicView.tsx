'use client';

import Link from 'next/link';
import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, Calendar, Users, ArrowLeft, Clock, ChevronLeft, ChevronRight, Eye, Heart, Copy, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { APP_NAME } from '@/lib/config/site';
import { createClient } from '@/lib/supabase/client';
import { getPrimaryAffiliate } from '@/lib/affiliate/affiliateRules';
import { getCountryGradient } from '@/lib/trip/coverImage';
import type { TripRoom } from '@/lib/supabase/types';
import AffiliateBanner from '@/components/affiliate/AffiliateBanner';
import TripReactions from '@/components/trip/TripReactions';
import TripComments, { type TripCommentItem } from '@/components/trip/TripComments';
import type { ReactionCounts, ReactionType } from '@/lib/trip/reactions';
import { FLAG } from '@/lib/constants/flags';

const CATEGORY_ICON: Record<string, string> = {
  restaurant:'🍽', cafe:'☕', attraction:'🎯', lodging:'🏨',
  shopping:'🛍', transport:'🚆', activity:'🏄', beach:'🏖',
  nature:'🌿', culture:'🏛', etc:'📍',
};

interface Owner { id?: string; nickname: string; avatar_url: string | null }

export interface Trip {
  id: string; title: string; destination: string | null;
  country_code: string; start_date: string | null; end_date: string | null;
  nights: number; marker_count: number; member_count: number; view_count: number;
  cover_image_url: string | null;
  owner: Owner | null;
}

interface Marker {
  id: number; name: string; address: string | null;
  category: string; day_number: number; stay_minutes: number; memo: string | null;
}

function formatDateRange(start: string | null, end: string | null): string {
  if (!start) return '날짜 미정';
  const s = new Date(start), e = end ? new Date(end) : null;
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

function OwnerBadge({ owner, onClick }: { owner: Owner; onClick?: () => void }) {
  const initial = owner.nickname.charAt(0).toUpperCase();
  const inner = (
    <div className="flex items-center gap-2">
      {owner.avatar_url && (owner.avatar_url.startsWith('http://') || owner.avatar_url.startsWith('https://')) ? (
        <img src={owner.avatar_url} alt="" className="w-5 h-5 rounded-full object-cover border border-white/30" />
      ) : owner.avatar_url ? (
        <span style={{ fontSize: 16, lineHeight: 1 }}>{owner.avatar_url}</span>
      ) : (
        <div className="w-5 h-5 rounded-full bg-white/30 flex items-center justify-center text-white text-[10px] font-bold shrink-0">
          {initial}
        </div>
      )}
      <span className="text-white/80 text-[13px] font-semibold">{owner.nickname}님의 여행</span>
    </div>
  );
  if (!onClick) return inner;
  return (
    <button
      onClick={onClick}
      className="hover:opacity-75 transition-opacity text-left"
      aria-label={`${owner.nickname}님 프로필 보기`}
    >
      {inner}
    </button>
  );
}

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

export default function TripPublicView({
  trip, markers, userId, initialSaved,
  initialReactionCounts, initialUserReactions, initialComments,
}: {
  trip: Trip; markers: Marker[]; userId: string | null; initialSaved: boolean;
  initialReactionCounts: ReactionCounts;
  initialUserReactions: ReactionType[];
  initialComments: TripCommentItem[];
}) {
  const flag      = FLAG[trip.country_code] ?? '🌐';
  const dest      = trip.destination ?? '여행지';
  const [g1, g2]  = getCountryGradient(trip.country_code);
  const days      = Array.from(new Set(markers.map(m => m.day_number))).sort((a, b) => a - b);
  const [activeDay, setActiveDay] = useState<number>(days[0] ?? 1);
  const activeMarkers = markers.filter(m => m.day_number === activeDay);

  // 제휴 배너 — 해외여행(TRIP_HEADER_BANNER), 2박이상(DAY_DIVIDER_BANNER)
  const is_domestic = trip.country_code === 'KR';
  const affiliateRoom = {
    nights: trip.nights, is_domestic,
    destination: trip.destination,
    start_date: trip.start_date, end_date: trip.end_date,
  } as TripRoom;
  const headerBanner  = getPrimaryAffiliate({ room: affiliateRoom, markers: [] }, 'TRIP_HEADER_BANNER');
  const dividerBanner = getPrimaryAffiliate({ room: affiliateRoom, markers: [] }, 'DAY_DIVIDER_BANNER');
  const dayIdx  = days.indexOf(activeDay);
  const hasPrev = dayIdx > 0, hasNext = dayIdx < days.length - 1;

  const router = useRouter();

  const [isSaved, setIsSaved] = useState(initialSaved);
  const [cloning, setCloning] = useState(false);
  const [toast, setToast]     = useState<string | null>(null);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2800);
  }, []);

  const handleToggleSave = useCallback(async () => {
    if (!userId) { showToast('로그인 후 여행을 저장할 수 있어요.'); return; }
    const supabase = createClient();
    const wasSaved = isSaved;
    setIsSaved(!wasSaved);
    if (wasSaved) {
      const { error } = await supabase.from('saved_trips').delete().eq('user_id', userId).eq('room_id', trip.id);
      if (error) { setIsSaved(true); showToast('저장 해제에 실패했어요.'); }
      else showToast('저장을 취소했어요.');
    } else {
      const { error } = await supabase.from('saved_trips').insert({ user_id: userId, room_id: trip.id });
      if (error) { setIsSaved(false); showToast('저장에 실패했어요.'); }
      else showToast('여행 일지를 저장했어요. 폴더는 저장함에서 정리할 수 있어요.');
    }
  }, [userId, isSaved, trip.id, showToast]);

  const handleClone = useCallback(async () => {
    if (!userId) {
      showToast('로그인 후 내 여행으로 담을 수 있어요.');
      return;
    }
    setCloning(true);
    try {
      const supabase = createClient();
      const { data: newRoomId, error } = await supabase.rpc('clone_public_trip', {
        p_source_room_id: trip.id,
      });
      if (error) {
        const hint = (error as unknown as { hint?: string }).hint;
        if (hint === '공개된 여행만 담을 수 있어요.') {
          showToast('공개된 여행만 담을 수 있어요.');
        } else {
          showToast('여행을 담지 못했어요. 잠시 후 다시 시도해주세요.');
        }
        return;
      }
      showToast('내 여행에 담았어요. 🎉');
      setTimeout(() => router.push(`/my/trips/${newRoomId}`), 900);
    } catch {
      showToast('여행을 담지 못했어요. 잠시 후 다시 시도해주세요.');
    } finally {
      setCloning(false);
    }
  }, [userId, trip.id, showToast, router]);

  return (
    <div className="min-h-screen">
      {/* ── 헤더 배너 ── */}
      <div className="relative px-4 sm:px-6 lg:px-8 pt-6 pb-8 overflow-hidden">
        {trip.cover_image_url ? (
          <>
            <img src={trip.cover_image_url} alt="" className="absolute inset-0 w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-b from-black/55 via-black/45 to-black/65" />
          </>
        ) : (
          <div
            className="absolute inset-0"
            style={{ background: `linear-gradient(135deg, ${g1}, ${g2})` }}
          />
        )}
        <div className="relative z-[1] max-w-4xl mx-auto">
          {/* 상단 네비 */}
          <div className="flex items-center justify-between mb-5 gap-2">
            <Link href="/explore" className="group inline-flex items-center gap-1.5 text-white/70 hover:text-white text-sm font-semibold transition-colors shrink-0">
              <ArrowLeft size={14} className="group-hover:-translate-x-0.5 transition-transform" />
              여행 탐색
            </Link>

            <div className="flex items-center gap-2">
              {/* 저장하기 */}
              <motion.button
                onClick={handleToggleSave}
                whileTap={{ scale: 0.8 }}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-2 rounded-2xl text-sm font-bold transition-all duration-200',
                  isSaved ? 'bg-red-500 text-white shadow-lg shadow-red-500/30' : 'bg-white/20 backdrop-blur-sm text-white hover:bg-white/30',
                )}
              >
                <Heart size={14} fill={isSaved ? 'white' : 'none'} color="white" className="transition-all shrink-0" />
                <span className="hidden sm:inline">{isSaved ? '저장됨' : '저장하기'}</span>
              </motion.button>

              {/* 내 여행에 담기 */}
              <motion.button
                onClick={handleClone}
                disabled={cloning}
                whileTap={{ scale: 0.85 }}
                className="flex items-center gap-1.5 px-3 py-2 rounded-2xl text-sm font-bold bg-white text-violet-600 hover:bg-violet-50 transition-all duration-200 disabled:opacity-60 shadow-sm"
              >
                {cloning
                  ? <Loader2 size={14} className="animate-spin shrink-0" />
                  : <Copy size={14} className="shrink-0" />}
                <span className="hidden sm:inline">{cloning ? '담는 중...' : '내 여행에 담기'}</span>
                <span className="sm:hidden">{cloning ? '담기' : '담기'}</span>
              </motion.button>
            </div>
          </div>

          {/* 제목 및 메타 */}
          <div className="flex items-start gap-4">
            <div className="text-5xl leading-none mt-1 select-none drop-shadow">{flag}</div>
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight leading-snug mb-2">{trip.title}</h1>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
                {trip.destination && (
                  <span className="flex items-center gap-1.5 text-white/80 text-[13px]"><MapPin size={12} />{dest}</span>
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
              {/* 작성자 */}
              {trip.owner && (
                <div className="mt-3">
                  <OwnerBadge
                    owner={trip.owner}
                    onClick={trip.owner.id ? () => router.push(`/u/${trip.owner!.id}`) : undefined}
                  />
                </div>
              )}
            </div>
          </div>

          {/* 통계 칩 */}
          <div className="flex gap-2 mt-5 flex-wrap">
            {[
              { value: `${trip.nights}박 ${trip.nights + 1}일`, label: '여행 기간' },
              { value: trip.marker_count, label: '개 장소' },
              { value: days.length, label: '일 일정' },
            ].map(({ value, label }) => (
              <div key={label} className="bg-white/20 text-white rounded-xl px-3.5 py-2 text-center">
                <div className="text-lg font-black leading-none">{value}</div>
                <div className="text-[10px] text-white/70 mt-0.5">{label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── 제휴 배너: 항공권 (해외 여행만) ── */}
      {headerBanner && (
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-5">
          <AffiliateBanner
            insertion={headerBanner}
            roomId={trip.id}
            destination={trip.destination}
            variant="header"
          />
        </div>
      )}

      {/* ── 반응 ── */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-5">
        <TripReactions
          roomId={trip.id}
          userId={userId}
          initialCounts={initialReactionCounts}
          initialUserReactions={initialUserReactions}
          onToast={showToast}
        />
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
            {/* Day 탭 */}
            <div className="flex items-center gap-3 mb-6">
              <button onClick={() => hasPrev && setActiveDay(days[dayIdx - 1])} disabled={!hasPrev}
                className="w-8 h-8 rounded-full flex items-center justify-center bg-white border border-slate-200 text-slate-400 hover:text-violet-500 hover:border-violet-200 disabled:opacity-30 transition-colors shrink-0">
                <ChevronLeft size={16} />
              </button>
              <div className="flex gap-2 overflow-x-auto flex-1 [scrollbar-width:none]">
                {days.map(day => {
                  const date = getDayDate(trip.start_date, day), active = day === activeDay;
                  return (
                    <button key={day} onClick={() => setActiveDay(day)}
                      className={cn('flex-shrink-0 flex flex-col items-center px-4 py-2.5 rounded-2xl border text-sm font-bold transition-all duration-200',
                        active ? 'bg-violet-500 text-white border-violet-500 shadow-md shadow-violet-200' : 'bg-white text-slate-500 border-slate-200 hover:border-violet-300 hover:text-violet-500')}>
                      <span className="text-[13px] font-extrabold leading-tight">Day {day}</span>
                      {date && <span className={cn('text-[10px] font-semibold mt-0.5', active ? 'text-violet-200' : 'text-slate-400')}>{date}</span>}
                    </button>
                  );
                })}
              </div>
              <button onClick={() => hasNext && setActiveDay(days[dayIdx + 1])} disabled={!hasNext}
                className="w-8 h-8 rounded-full flex items-center justify-center bg-white border border-slate-200 text-slate-400 hover:text-violet-500 hover:border-violet-200 disabled:opacity-30 transition-colors shrink-0">
                <ChevronRight size={16} />
              </button>
            </div>

            {/* 마커 목록 */}
            <AnimatePresence mode="wait">
              <motion.div key={activeDay} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }} className="flex flex-col gap-3">
                {activeMarkers.length === 0 ? (
                  <div className="bg-white rounded-2xl border border-dashed border-slate-200 py-10 text-center">
                    <p className="text-sm text-slate-400">이 날은 아직 장소가 없어요</p>
                  </div>
                ) : activeMarkers.map((m, i) => {
                  const icon = CATEGORY_ICON[m.category] ?? '📍', stay = fmtStay(m.stay_minutes);
                  return (
                    <motion.div key={m.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                      className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex items-start gap-3">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-50 to-indigo-50 flex items-center justify-center text-lg shrink-0">{icon}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-violet-500 text-white text-[10px] font-extrabold shrink-0">{i + 1}</span>
                          <span className="text-[14px] font-extrabold text-slate-900 truncate">{m.name}</span>
                        </div>
                        {m.address && <p className="text-[11px] text-slate-400 truncate ml-7">{m.address}</p>}
                        {stay && (
                          <span className="inline-flex items-center gap-1 text-[11px] text-slate-500 mt-1 ml-7">
                            <Clock size={10} className="text-slate-400" />{stay} 체류
                          </span>
                        )}
                        {m.memo && <p className="text-[11px] text-slate-500 mt-1.5 ml-7 line-clamp-2 leading-relaxed">{m.memo}</p>}
                      </div>
                    </motion.div>
                  );
                })}
              </motion.div>
            </AnimatePresence>
          </>
        )}

        {/* ── 제휴 배너: 숙소 (2박 이상만) ── */}
        {dividerBanner && markers.length > 0 && (
          <AffiliateBanner
            insertion={dividerBanner}
            roomId={trip.id}
            destination={trip.destination}
            variant="divider"
            className="mt-6"
          />
        )}

        {/* ── 댓글 ── */}
        <TripComments
          roomId={trip.id}
          userId={userId}
          initialComments={initialComments}
          onToast={showToast}
        />

        {/* CTA */}
        <div className="mt-8 bg-gradient-to-br from-violet-50 to-indigo-50 border border-violet-100 rounded-3xl p-6 text-center">
          <p className="text-[15px] font-extrabold text-slate-800 mb-1.5">이런 여행 일정 나도 만들어볼까요? ✈️</p>
          <p className="text-sm text-slate-500 mb-4">{APP_NAME}로 친구들과 함께 여행 일정을 만들어보세요.</p>
          <Link href="/room/new" className="inline-flex items-center gap-2 bg-gradient-to-r from-violet-500 to-indigo-500 hover:from-violet-600 hover:to-indigo-600 text-white text-sm font-bold px-6 py-3 rounded-2xl shadow-md shadow-violet-200 transition-colors">
            새 여행 만들기
          </Link>
        </div>
      </div>

      <AnimatePresence>
        {toast && <Toast key={toast + Date.now()} message={toast} />}
      </AnimatePresence>
    </div>
  );
}
