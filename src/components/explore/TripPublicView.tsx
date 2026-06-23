'use client';

import Link from 'next/link';
import { useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MapPin, Calendar, Users, ArrowLeft, Clock,
  ChevronLeft, ChevronRight, Eye, Heart, Copy,
  Loader2, Share2, ExternalLink,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { APP_NAME } from '@/lib/config/site';
import { createClient } from '@/lib/supabase/client';
import { getAffiliateInsertions } from '@/lib/affiliate/affiliateRules';
import { getCountryGradient } from '@/lib/trip/coverImage';
import type { TripRoom } from '@/lib/supabase/types';
import AffiliateBanner from '@/components/affiliate/AffiliateBanner';
import TripReactions from '@/components/trip/TripReactions';
import TripComments, { type TripCommentItem } from '@/components/trip/TripComments';
import type { ReactionCounts, ReactionType } from '@/lib/trip/reactions';
import { FLAG } from '@/lib/constants/flags';
import { trackEvent } from '@/lib/analytics/trackEvent';

const CATEGORY_ICON: Record<string, string> = {
  restaurant:'🍽', cafe:'☕', attraction:'🎯', lodging:'🏨',
  shopping:'🛍', transport:'🚆', activity:'🏄', beach:'🏖',
  nature:'🌿', culture:'🏛', etc:'📍',
};

interface Owner { id?: string; nickname: string; avatar_url: string | null }

export interface Trip {
  id: string; title: string; destination: string | null;
  country_code: string; start_date: string | null; end_date: string | null;
  nights: number; marker_count: number; member_count: number;
  view_count: number; fork_count: number; save_count: number; comment_count: number;
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

function fmtNights(nights: number): string {
  if (nights === 0) return '당일치기';
  return `${nights}박 ${nights + 1}일`;
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
      className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[200] md:bottom-6 bg-slate-900 text-white text-sm font-semibold px-5 py-3 rounded-2xl shadow-xl pointer-events-none whitespace-nowrap"
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

  const is_domestic = trip.country_code === 'KR';
  const affiliateRoom = {
    nights: trip.nights, is_domestic,
    destination: trip.destination,
    start_date: trip.start_date, end_date: trip.end_date,
  } as TripRoom;

  // 헤더 배너 (항공권), Day 구분 배너 (숙소)
  const allInsertions = useMemo(
    () => getAffiliateInsertions({ room: affiliateRoom, markers: [] }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [trip.id],
  );
  const headerBanner  = allInsertions.find(i => i.insertionPoint === 'TRIP_HEADER_BANNER') ?? null;
  const dividerBanner = allInsertions.find(i => i.insertionPoint === 'DAY_DIVIDER_BANNER') ?? null;

  // 여행 준비 섹션 — 파트너별 중복 제거 후 최대 4개
  const prepItems = useMemo(() => {
    const seen = new Set<string>();
    return allInsertions
      .filter(i => ['TRIP_HEADER_BANNER', 'DAY_DIVIDER_BANNER', 'COMPLETION_MODAL'].includes(i.insertionPoint))
      .filter(i => { if (seen.has(i.partner)) return false; seen.add(i.partner); return true; });
  }, [allInsertions]);

  const dayIdx  = days.indexOf(activeDay);
  const hasPrev = dayIdx > 0, hasNext = dayIdx < days.length - 1;
  const router  = useRouter();

  const [isSaved, setIsSaved] = useState(initialSaved);
  const [cloning, setCloning] = useState(false);
  const [toast,   setToast]   = useState<string | null>(null);

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
      else {
        showToast('저장을 취소했어요.');
        trackEvent({ event: 'public_trip_unsaved', roomId: trip.id, userId });
      }
    } else {
      const { error } = await supabase.from('saved_trips').insert({ user_id: userId, room_id: trip.id });
      if (error) { setIsSaved(false); showToast('저장에 실패했어요.'); }
      else {
        showToast('나중에 보기에 저장했어요. 저장함에서 확인할 수 있어요.');
        trackEvent({ event: 'public_trip_saved', roomId: trip.id, userId });
      }
    }
  }, [userId, isSaved, trip.id, showToast]);

  const handleClone = useCallback(async () => {
    if (!userId) {
      showToast('로그인 후 이 코스를 내 여행으로 담을 수 있어요.');
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
        showToast(hint === '공개된 여행만 담을 수 있어요.' ? hint : '여행을 담지 못했어요. 잠시 후 다시 시도해주세요.');
        return;
      }
      trackEvent({ event: 'public_trip_cloned', roomId: trip.id, userId });
      showToast('내 여행에 담았어요! 바로 수정할 수 있어요. 🎉');
      setTimeout(() => router.push(`/my/trips/${newRoomId}`), 900);
    } catch {
      showToast('여행을 담지 못했어요. 잠시 후 다시 시도해주세요.');
    } finally {
      setCloning(false);
    }
  }, [userId, trip.id, showToast, router]);

  const handleShare = useCallback(async () => {
    const url  = window.location.href;
    const text = `${dest} ${fmtNights(trip.nights)} 여행 일정을 ${APP_NAME}에서 확인해보세요!`;
    try {
      if (navigator.share) {
        await navigator.share({ title: trip.title, text, url });
      } else {
        await navigator.clipboard.writeText(url);
        showToast('링크를 복사했어요! 친구에게 공유해보세요.');
      }
      trackEvent({ event: 'public_trip_shared', roomId: trip.id, userId });
    } catch {
      try {
        await navigator.clipboard.writeText(url);
        showToast('링크를 복사했어요!');
      } catch {
        showToast('공유하기를 지원하지 않는 환경이에요.');
      }
    }
  }, [trip, dest, userId, showToast]);

  const handleAffiliatePrep = useCallback((url: string, partner: string) => {
    fetch('/api/affiliate/click', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ partner, roomId: trip.id, destination: trip.destination }),
    }).catch(() => {});
    window.open(url, '_blank', 'noopener,noreferrer');
  }, [trip.id, trip.destination]);

  return (
    <div className="min-h-screen pb-20 md:pb-0">
      {/* ── 헤더 배너 ── */}
      <div className="relative px-4 sm:px-6 lg:px-8 pt-6 pb-8 overflow-hidden">
        {trip.cover_image_url ? (
          <>
            <img src={trip.cover_image_url} alt="" className="absolute inset-0 w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-b from-black/55 via-black/45 to-black/65" />
          </>
        ) : (
          <div className="absolute inset-0" style={{ background: `linear-gradient(135deg, ${g1}, ${g2})` }} />
        )}
        <div className="relative z-[1] max-w-4xl mx-auto">
          {/* 상단 네비 */}
          <div className="flex items-center justify-between mb-5 gap-2">
            <Link href="/explore" className="group inline-flex items-center gap-1.5 text-white/70 hover:text-white text-sm font-semibold transition-colors shrink-0">
              <ArrowLeft size={14} className="group-hover:-translate-x-0.5 transition-transform" />
              여행 탐색
            </Link>

            <div className="flex items-center gap-2">
              {/* 공유하기 */}
              <motion.button
                onClick={handleShare}
                whileTap={{ scale: 0.8 }}
                className="w-9 h-9 rounded-2xl flex items-center justify-center bg-white/20 backdrop-blur-sm text-white hover:bg-white/30 transition-colors"
                aria-label="공유하기"
              >
                <Share2 size={15} />
              </motion.button>

              {/* 나중에 보기 */}
              <motion.button
                onClick={handleToggleSave}
                whileTap={{ scale: 0.8 }}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-2 rounded-2xl text-sm font-bold transition-all duration-200',
                  isSaved
                    ? 'bg-red-500 text-white shadow-lg shadow-red-500/30'
                    : 'bg-white/20 backdrop-blur-sm text-white hover:bg-white/30',
                )}
              >
                <Heart size={14} fill={isSaved ? 'white' : 'none'} color="white" className="shrink-0" />
                <span className="hidden sm:inline">{isSaved ? '저장됨' : '나중에 보기'}</span>
              </motion.button>

              {/* 이 코스로 여행 짜기 */}
              <motion.button
                onClick={handleClone}
                disabled={cloning}
                whileTap={{ scale: 0.85 }}
                className="flex items-center gap-1.5 px-3 py-2 rounded-2xl text-sm font-bold bg-white text-violet-600 hover:bg-violet-50 transition-all duration-200 disabled:opacity-60 shadow-sm"
              >
                {cloning
                  ? <Loader2 size={14} className="animate-spin shrink-0" />
                  : <Copy size={14} className="shrink-0" />}
                <span className="hidden sm:inline">{cloning ? '담는 중...' : '이 코스로 여행 짜기'}</span>
                <span className="sm:hidden">{cloning ? '...' : '담기'}</span>
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
              { value: fmtNights(trip.nights), label: '기간' },
              { value: trip.marker_count,      label: '개 장소' },
              ...(trip.save_count    > 0 ? [{ value: trip.save_count,    label: '명 저장' }] : []),
              ...(trip.fork_count    > 0 ? [{ value: trip.fork_count,    label: '명 담기' }] : []),
              ...(trip.comment_count > 0 ? [{ value: trip.comment_count, label: '개 댓글' }] : []),
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
          <AffiliateBanner insertion={headerBanner} roomId={trip.id} destination={trip.destination} variant="header" />
        </div>
      )}

      {/* ── 반응 ── */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-5">
        <TripReactions
          roomId={trip.id} userId={userId}
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
          <AffiliateBanner insertion={dividerBanner} roomId={trip.id} destination={trip.destination} variant="divider" className="mt-6" />
        )}

        {/* ── 여행 준비하기 ── */}
        {prepItems.length > 0 && (
          <div className="mt-8">
            <h3 className="text-[14px] font-extrabold text-slate-700 mb-3">여행 준비하기</h3>
            <div className="grid grid-cols-2 gap-2.5">
              {prepItems.map(item => (
                <button
                  key={item.partner}
                  onClick={() => handleAffiliatePrep(item.url, item.partner)}
                  className="flex items-center gap-3 bg-white border border-slate-100 rounded-2xl p-3.5 text-left hover:border-violet-200 hover:shadow-md transition-all duration-200 group"
                >
                  <span className="text-2xl shrink-0 select-none">{item.emoji}</span>
                  <div className="min-w-0">
                    <p className="text-[12px] font-extrabold text-slate-800 leading-tight group-hover:text-violet-700 transition-colors">{item.label}</p>
                    <p className="text-[11px] text-slate-400 mt-0.5 truncate">{item.sublabel}</p>
                  </div>
                  <ExternalLink size={11} className="text-slate-300 shrink-0 ml-auto group-hover:text-violet-400 transition-colors" />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── 댓글 ── */}
        <TripComments
          roomId={trip.id} userId={userId}
          initialComments={initialComments}
          onToast={showToast}
        />

        {/* ── 하단 CTA ── */}
        <div className="mt-8 bg-gradient-to-br from-violet-50 to-indigo-50 border border-violet-100 rounded-3xl p-6">
          <p className="text-[15px] font-extrabold text-slate-800 mb-1">이 일정으로 여행 가고 싶다면? ✈️</p>
          <p className="text-sm text-slate-500 mb-4">내 여행으로 담아서 친구와 함께 수정해보세요.</p>
          <div className="flex flex-col sm:flex-row gap-3">
            <motion.button
              onClick={handleClone}
              disabled={cloning}
              whileTap={{ scale: 0.97 }}
              className="flex-1 inline-flex items-center justify-center gap-2 bg-gradient-to-r from-violet-500 to-indigo-500 hover:from-violet-600 hover:to-indigo-600 text-white text-sm font-bold px-6 py-3 rounded-2xl shadow-md shadow-violet-200 transition-colors disabled:opacity-60"
            >
              {cloning ? <Loader2 size={14} className="animate-spin" /> : <Copy size={14} />}
              {cloning ? '담는 중...' : '이 코스로 여행 짜기'}
            </motion.button>
            <Link
              href="/room/new"
              className="flex-1 inline-flex items-center justify-center gap-2 bg-white border-2 border-violet-200 hover:border-violet-400 text-violet-600 text-sm font-bold px-6 py-3 rounded-2xl transition-colors text-center"
            >
              새 여행 만들기
            </Link>
          </div>
        </div>
      </div>

      {/* ── 모바일 하단 고정 CTA ── */}
      <div className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-white/97 backdrop-blur-md border-t border-slate-100 px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))]">
        <div className="flex items-center gap-2 max-w-lg mx-auto">
          <motion.button
            onClick={handleToggleSave}
            whileTap={{ scale: 0.85 }}
            className={cn(
              'w-11 h-11 rounded-2xl flex items-center justify-center border-2 transition-colors shrink-0',
              isSaved ? 'bg-red-50 border-red-200' : 'bg-white border-slate-200',
            )}
            aria-label={isSaved ? '저장 취소' : '나중에 보기'}
          >
            <Heart size={18} fill={isSaved ? '#EF4444' : 'none'} color={isSaved ? '#EF4444' : '#94a3b8'} />
          </motion.button>

          <motion.button
            onClick={handleShare}
            whileTap={{ scale: 0.85 }}
            className="w-11 h-11 rounded-2xl flex items-center justify-center border-2 border-slate-200 bg-white shrink-0 transition-colors hover:border-violet-200"
            aria-label="친구에게 공유"
          >
            <Share2 size={17} className="text-slate-500" />
          </motion.button>

          <motion.button
            onClick={handleClone}
            disabled={cloning}
            whileTap={{ scale: 0.97 }}
            className="flex-1 h-11 rounded-2xl flex items-center justify-center gap-2 bg-gradient-to-r from-violet-500 to-indigo-500 text-white text-[13px] font-bold shadow-md shadow-violet-200/60 disabled:opacity-60"
          >
            {cloning ? <Loader2 size={14} className="animate-spin" /> : <Copy size={14} />}
            {cloning ? '담는 중...' : '이 코스로 여행 짜기'}
          </motion.button>
        </div>
      </div>

      <AnimatePresence>
        {toast && <Toast key={toast + Date.now()} message={toast} />}
      </AnimatePresence>
    </div>
  );
}
