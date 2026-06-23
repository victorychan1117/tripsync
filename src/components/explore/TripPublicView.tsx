'use client';

import Link from 'next/link';
import { useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MapPin, Calendar, ArrowLeft, Clock,
  ChevronLeft, ChevronRight, Eye, Heart, Copy,
  Loader2, Share2, ExternalLink,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { APP_NAME } from '@/lib/config/site';
import { createClient } from '@/lib/supabase/client';
import { getAffiliateInsertions } from '@/lib/affiliate/affiliateRules';
import { getCountryGradient } from '@/lib/trip/coverImage';
import type { TripRoom } from '@/lib/supabase/types';
import TripReactions from '@/components/trip/TripReactions';
import TripComments, { type TripCommentItem } from '@/components/trip/TripComments';
import type { ReactionCounts, ReactionType } from '@/lib/trip/reactions';
import { FLAG } from '@/lib/constants/flags';
import { trackEvent } from '@/lib/analytics/trackEvent';

const CATEGORY_ICON: Record<string, string> = {
  restaurant: '🍽', cafe: '☕', attraction: '🎯', lodging: '🏨',
  shopping:   '🛍', transport: '🚆', activity: '🏄', beach: '🏖',
  nature:     '🌿', culture: '🏛', etc: '📍',
};

const CATEGORY_LABEL: Record<string, string> = {
  restaurant: '맛집', cafe: '카페', attraction: '명소', lodging: '숙소',
  shopping:   '쇼핑', transport: '이동', activity: '액티비티', beach: '해변',
  nature:     '자연', culture: '문화', etc: '기타',
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
  return e && start !== end ? `${fmt(s)} ~ ${fmt(e)}` : fmt(s);
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
    <div className="flex items-center gap-1.5">
      {owner.avatar_url && (owner.avatar_url.startsWith('http://') || owner.avatar_url.startsWith('https://')) ? (
        <img src={owner.avatar_url} alt="" className="w-4 h-4 rounded-full object-cover border border-white/30" />
      ) : owner.avatar_url ? (
        <span style={{ fontSize: 14, lineHeight: 1 }}>{owner.avatar_url}</span>
      ) : (
        <div className="w-4 h-4 rounded-full bg-white/30 flex items-center justify-center text-white text-[9px] font-bold shrink-0">
          {initial}
        </div>
      )}
      <span className="text-white/70 text-[12px] font-medium">{owner.nickname}님의 여행</span>
    </div>
  );
  if (!onClick) return inner;
  return (
    <button onClick={onClick} className="hover:opacity-75 transition-opacity text-left" aria-label={`${owner.nickname}님 프로필 보기`}>
      {inner}
    </button>
  );
}

function Toast({ message }: { message: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 12 }}
      className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[200] md:bottom-8 bg-slate-900 text-white text-sm font-semibold px-5 py-3 rounded-2xl shadow-xl pointer-events-none whitespace-nowrap"
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
  const flag     = FLAG[trip.country_code] ?? '🌐';
  const dest     = trip.destination ?? '여행지';
  const [g1, g2] = getCountryGradient(trip.country_code);
  const days     = Array.from(new Set(markers.map(m => m.day_number))).sort((a, b) => a - b);
  const [activeDay, setActiveDay] = useState<number>(days[0] ?? 1);
  const activeMarkers = markers.filter(m => m.day_number === activeDay);
  const showArrows    = days.length > 3;

  const is_domestic  = trip.country_code === 'KR';
  const affiliateRoom = {
    nights: trip.nights, is_domestic,
    destination: trip.destination,
    start_date: trip.start_date, end_date: trip.end_date,
  } as TripRoom;

  const allInsertions = useMemo(
    () => getAffiliateInsertions({ room: affiliateRoom, markers: [] }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [trip.id],
  );

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
      else { showToast('저장을 취소했어요.'); trackEvent({ event: 'public_trip_unsaved', roomId: trip.id, userId }); }
    } else {
      const { error } = await supabase.from('saved_trips').insert({ user_id: userId, room_id: trip.id });
      if (error) { setIsSaved(false); showToast('저장에 실패했어요.'); }
      else { showToast('저장했어요. 저장함에서 확인할 수 있어요.'); trackEvent({ event: 'public_trip_saved', roomId: trip.id, userId }); }
    }
  }, [userId, isSaved, trip.id, showToast]);

  const handleClone = useCallback(async () => {
    if (!userId) { showToast('로그인 후 이 코스를 내 여행으로 담을 수 있어요.'); return; }
    setCloning(true);
    try {
      const supabase = createClient();
      const { data: newRoomId, error } = await supabase.rpc('clone_public_trip', { p_source_room_id: trip.id });
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
      if (navigator.share) { await navigator.share({ title: trip.title, text, url }); }
      else { await navigator.clipboard.writeText(url); showToast('링크를 복사했어요! 친구에게 공유해보세요.'); }
      trackEvent({ event: 'public_trip_shared', roomId: trip.id, userId });
    } catch {
      try { await navigator.clipboard.writeText(url); showToast('링크를 복사했어요!'); }
      catch { showToast('공유하기를 지원하지 않는 환경이에요.'); }
    }
  }, [trip, dest, userId, showToast]);

  const handleAffiliatePrep = useCallback((url: string, partner: string) => {
    fetch('/api/affiliate/click', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ partner, roomId: trip.id, destination: trip.destination }),
    }).catch(() => {});
    window.open(url, '_blank', 'noopener,noreferrer');
  }, [trip.id, trip.destination]);

  /* ────────────────────────────────────────────────
   * 공용 CTA 컴포넌트 (사이드바·하단 공통 사용)
   * ──────────────────────────────────────────────── */
  const CloneButton = ({ className }: { className?: string }) => (
    <motion.button
      onClick={handleClone}
      disabled={cloning}
      whileTap={{ scale: 0.97 }}
      className={cn(
        'w-full flex items-center justify-center gap-2 bg-gradient-to-r from-violet-500 to-indigo-500 hover:from-violet-600 hover:to-indigo-600 text-white text-sm font-bold py-3 rounded-2xl shadow-md shadow-violet-200/60 transition-colors disabled:opacity-60',
        className,
      )}
    >
      {cloning ? <Loader2 size={14} className="animate-spin" /> : <Copy size={14} />}
      {cloning ? '담는 중...' : '이 코스로 여행 짜기'}
    </motion.button>
  );

  /* ────────────────────────────────────────────────
   * 여행 준비하기 (제휴) 공용
   * ──────────────────────────────────────────────── */
  const PrepSection = ({ compact = false }: { compact?: boolean }) => {
    if (prepItems.length === 0) return null;
    return (
      <div className={cn('bg-white rounded-2xl border border-slate-100 shadow-sm', compact ? 'p-4' : 'p-5')}>
        <h3 className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider mb-3">
          이 여행을 준비한다면
        </h3>
        <div className={cn(compact ? 'space-y-0.5' : 'grid grid-cols-2 gap-2')}>
          {prepItems.map(item => (
            <button
              key={item.partner}
              onClick={() => handleAffiliatePrep(item.url, item.partner)}
              className={cn(
                'flex items-center gap-2.5 rounded-xl hover:bg-slate-50 transition-colors group text-left',
                compact ? 'p-2' : 'p-3 border border-slate-100 hover:border-violet-100 hover:shadow-sm',
              )}
            >
              <span className={cn('select-none shrink-0', compact ? 'text-xl' : 'text-2xl')}>{item.emoji}</span>
              <div className="flex-1 min-w-0">
                <p className={cn('font-bold text-slate-700 leading-tight group-hover:text-violet-700 transition-colors', compact ? 'text-[12px]' : 'text-[12px]')}>{item.label}</p>
                {!compact && <p className="text-[11px] text-slate-400 mt-0.5 truncate">{item.sublabel}</p>}
              </div>
              <ExternalLink size={10} className="text-slate-300 shrink-0 group-hover:text-violet-400 transition-colors" />
            </button>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen pb-20 md:pb-0">

      {/* ════════════════════════════════════════
          HERO — compact
          ════════════════════════════════════════ */}
      <div className="relative px-4 sm:px-6 lg:px-8 pt-4 pb-6 overflow-hidden">
        {trip.cover_image_url ? (
          <>
            <img src={trip.cover_image_url} alt="" className="absolute inset-0 w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/40 to-black/60" />
          </>
        ) : (
          <div className="absolute inset-0" style={{ background: `linear-gradient(135deg, ${g1}, ${g2})` }} />
        )}

        <div className="relative z-[1] max-w-5xl mx-auto">
          {/* 상단 네비 */}
          <div className="flex items-center justify-between mb-4 gap-2">
            <Link
              href="/explore"
              className="group inline-flex items-center gap-1.5 text-white/70 hover:text-white text-sm font-semibold transition-colors shrink-0"
            >
              <ArrowLeft size={13} className="group-hover:-translate-x-0.5 transition-transform" />
              여행 탐색
            </Link>

            <div className="flex items-center gap-1.5">
              {/* 공유 */}
              <motion.button
                onClick={handleShare}
                whileTap={{ scale: 0.8 }}
                className="w-8 h-8 rounded-xl flex items-center justify-center bg-white/20 backdrop-blur-sm text-white hover:bg-white/30 transition-colors"
                aria-label="공유하기"
              >
                <Share2 size={14} />
              </motion.button>

              {/* 나중에 보기 */}
              <motion.button
                onClick={handleToggleSave}
                whileTap={{ scale: 0.8 }}
                className={cn(
                  'w-8 h-8 rounded-xl flex items-center justify-center backdrop-blur-sm transition-all duration-200',
                  isSaved ? 'bg-red-500 text-white' : 'bg-white/20 text-white hover:bg-white/30',
                )}
                aria-label={isSaved ? '저장 취소' : '나중에 보기'}
              >
                <Heart size={14} fill={isSaved ? 'white' : 'none'} color="white" />
              </motion.button>

              {/* 이 코스로 여행 짜기 (데스크탑 Hero 우측, 모바일 숨김) */}
              <motion.button
                onClick={handleClone}
                disabled={cloning}
                whileTap={{ scale: 0.85 }}
                className="hidden sm:flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-[13px] font-bold bg-white text-violet-600 hover:bg-violet-50 transition-all duration-200 disabled:opacity-60 shadow-sm"
              >
                {cloning ? <Loader2 size={13} className="animate-spin" /> : <Copy size={13} />}
                {cloning ? '담는 중...' : '이 코스로 여행 짜기'}
              </motion.button>
            </div>
          </div>

          {/* 목적지 뱃지 — 국기 + 목적지 + 기간 */}
          <div className="inline-flex items-center gap-1.5 bg-black/20 backdrop-blur-sm text-white/85 text-[12px] font-semibold rounded-full px-2.5 py-1 mb-2.5">
            <span className="text-sm leading-none">{flag}</span>
            <span>{dest}</span>
            <span className="text-white/40">·</span>
            <span>{fmtNights(trip.nights)}</span>
          </div>

          {/* 제목 */}
          <h1 className="text-[22px] sm:text-[26px] font-black text-white tracking-tight leading-snug mb-2.5">
            {trip.title}
          </h1>

          {/* 메타 — 날짜, 장소수, 조회수 인라인 */}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-white/65 text-[11px]">
            <span className="flex items-center gap-1">
              <Calendar size={10} />{formatDateRange(trip.start_date, trip.end_date)}
            </span>
            <span className="flex items-center gap-1">
              <MapPin size={10} />장소 {trip.marker_count}곳
            </span>
            {trip.view_count > 0 && (
              <span className="flex items-center gap-1">
                <Eye size={10} />{trip.view_count.toLocaleString()}회 조회
              </span>
            )}
          </div>

          {/* 작성자 */}
          {trip.owner && (
            <div className="mt-2.5">
              <OwnerBadge
                owner={trip.owner}
                onClick={trip.owner.id ? () => router.push(`/u/${trip.owner!.id}`) : undefined}
              />
            </div>
          )}
        </div>
      </div>

      {/* ════════════════════════════════════════
          BODY — 데스크탑 2컬럼 / 모바일 단일컬럼
          ════════════════════════════════════════ */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:grid lg:grid-cols-[1fr_272px] lg:gap-8 lg:items-start">

        {/* ── 왼쪽: 일정 영역 ── */}
        <div className="min-w-0">

          {/* 반응 */}
          <div className="mb-5">
            <TripReactions
              roomId={trip.id} userId={userId}
              initialCounts={initialReactionCounts}
              initialUserReactions={initialUserReactions}
              onToast={showToast}
            />
          </div>

          {/* 일정이 없는 경우 */}
          {markers.length === 0 ? (
            <div className="bg-white rounded-3xl border-2 border-dashed border-slate-200 py-14 flex flex-col items-center text-center">
              <div className="text-4xl mb-3">🗺️</div>
              <p className="text-[14px] font-extrabold text-slate-600 mb-1">아직 추가된 장소가 없어요</p>
              <p className="text-[12px] text-slate-400">여행자가 장소를 추가하면 여기에 표시돼요.</p>
            </div>
          ) : (
            <>
              {/* Day 탭 */}
              <div className="flex items-center gap-2 mb-4">
                {showArrows && (
                  <button
                    onClick={() => hasPrev && setActiveDay(days[dayIdx - 1])}
                    disabled={!hasPrev}
                    className="w-7 h-7 rounded-full flex items-center justify-center bg-white border border-slate-200 text-slate-400 hover:text-violet-500 hover:border-violet-200 disabled:opacity-30 transition-colors shrink-0"
                  >
                    <ChevronLeft size={14} />
                  </button>
                )}
                <div className="flex gap-1.5 overflow-x-auto flex-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                  {days.map(day => {
                    const date   = getDayDate(trip.start_date, day);
                    const active = day === activeDay;
                    return (
                      <button
                        key={day}
                        onClick={() => setActiveDay(day)}
                        className={cn(
                          'flex-shrink-0 flex flex-col items-center px-3.5 py-2 rounded-xl border text-sm font-bold transition-all duration-200',
                          active
                            ? 'bg-violet-500 text-white border-violet-500 shadow-sm shadow-violet-200'
                            : 'bg-white text-slate-500 border-slate-200 hover:border-violet-300 hover:text-violet-500',
                        )}
                      >
                        <span className="text-[12px] font-extrabold leading-tight">Day {day}</span>
                        {date && (
                          <span className={cn('text-[10px] font-medium mt-0.5', active ? 'text-violet-200' : 'text-slate-400')}>
                            {date}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
                {showArrows && (
                  <button
                    onClick={() => hasNext && setActiveDay(days[dayIdx + 1])}
                    disabled={!hasNext}
                    className="w-7 h-7 rounded-full flex items-center justify-center bg-white border border-slate-200 text-slate-400 hover:text-violet-500 hover:border-violet-200 disabled:opacity-30 transition-colors shrink-0"
                  >
                    <ChevronRight size={14} />
                  </button>
                )}
              </div>

              {/* 타임라인 마커 목록 */}
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeDay}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.16 }}
                >
                  {activeMarkers.length === 0 ? (
                    <div className="bg-white rounded-2xl border border-dashed border-slate-200 py-8 text-center">
                      <p className="text-[12px] text-slate-400">이 날은 아직 장소가 없어요</p>
                    </div>
                  ) : (
                    <div className="space-y-0">
                      {activeMarkers.map((m, i) => {
                        const icon  = CATEGORY_ICON[m.category] ?? '📍';
                        const label = CATEGORY_LABEL[m.category] ?? '기타';
                        const stay  = fmtStay(m.stay_minutes);
                        const isLast = i === activeMarkers.length - 1;
                        return (
                          <motion.div
                            key={m.id}
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.04 }}
                            className="relative flex gap-3 items-start"
                          >
                            {/* 타임라인 선 + 번호 */}
                            <div className="flex flex-col items-center shrink-0 pt-3.5">
                              <div className="w-6 h-6 rounded-full bg-violet-500 text-white text-[10px] font-extrabold flex items-center justify-center z-[1] shadow-sm">
                                {i + 1}
                              </div>
                              {!isLast && (
                                <div className="w-px flex-1 bg-slate-150 mt-1 min-h-[20px]" style={{ background: '#e2e8f0' }} />
                              )}
                            </div>

                            {/* 카드 */}
                            <div className={cn('flex-1 min-w-0 bg-white rounded-2xl border border-slate-100 shadow-sm p-3.5', isLast ? 'mb-0' : 'mb-3')}>
                              {/* 장소명 + 카테고리 */}
                              <div className="flex items-start justify-between gap-2 mb-1">
                                <div className="flex items-center gap-1.5 min-w-0">
                                  <span className="text-base leading-none select-none shrink-0">{icon}</span>
                                  <span className="text-[14px] font-extrabold text-slate-900 leading-snug">{m.name}</span>
                                </div>
                                <span className="text-[10px] font-semibold text-slate-400 bg-slate-50 rounded-full px-2 py-0.5 shrink-0 whitespace-nowrap">
                                  {label}
                                </span>
                              </div>
                              {/* 주소 */}
                              {m.address && (
                                <p className="text-[11px] text-slate-400 leading-snug mt-0.5 truncate">{m.address}</p>
                              )}
                              {/* 체류 시간 */}
                              {stay && (
                                <div className="flex items-center gap-1 mt-1.5">
                                  <Clock size={10} className="text-slate-300 shrink-0" />
                                  <span className="text-[11px] text-slate-400">{stay} 체류 예정</span>
                                </div>
                              )}
                              {/* 메모 */}
                              {m.memo && (
                                <p className="text-[12px] text-slate-600 mt-2 leading-relaxed line-clamp-3 bg-slate-50 rounded-xl px-3 py-2">
                                  {m.memo}
                                </p>
                              )}
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>
            </>
          )}

          {/* 여행 준비하기 (모바일 + 데스크탑 왼쪽 — 사이드바 없을 때) */}
          {prepItems.length > 0 && (
            <div className="mt-6 lg:hidden">
              <PrepSection />
            </div>
          )}

          {/* 댓글 */}
          <div className="mt-6">
            <TripComments
              roomId={trip.id} userId={userId}
              initialComments={initialComments}
              onToast={showToast}
            />
          </div>

          {/* 하단 CTA 카드 — 일정을 다 본 사용자용 */}
          <div className="mt-6 bg-gradient-to-br from-violet-50 to-indigo-50 border border-violet-100 rounded-3xl p-5">
            <p className="text-[15px] font-extrabold text-slate-800 mb-1">이 일정이 마음에 드나요? ✈️</p>
            <p className="text-[13px] text-slate-500 mb-4">내 여행으로 담아서 친구와 함께 수정해보세요.</p>
            <CloneButton />
          </div>
        </div>

        {/* ── 오른쪽: sticky 사이드바 (데스크탑만) ── */}
        <div className="hidden lg:block">
          <div className="sticky top-20 space-y-3">

            {/* 여행 요약 카드 */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 space-y-2.5">
              <div className="flex items-center gap-2 text-[12px] text-slate-600">
                <Calendar size={12} className="text-slate-400 shrink-0" />
                <span className="font-semibold">{fmtNights(trip.nights)}</span>
                <span className="text-slate-400">·</span>
                <span className="text-slate-400">{formatDateRange(trip.start_date, trip.end_date)}</span>
              </div>
              <div className="flex items-center gap-2 text-[12px] text-slate-600">
                <MapPin size={12} className="text-slate-400 shrink-0" />
                <span>장소 <span className="font-semibold">{trip.marker_count}곳</span></span>
              </div>
              {trip.view_count > 0 && (
                <div className="flex items-center gap-2 text-[12px] text-slate-600">
                  <Eye size={12} className="text-slate-400 shrink-0" />
                  <span><span className="font-semibold">{trip.view_count.toLocaleString()}</span>회 조회</span>
                </div>
              )}
              {(trip.save_count > 0 || trip.fork_count > 0) && (
                <div className="flex gap-2 text-[11px] text-slate-500 pt-1 border-t border-slate-50">
                  {trip.save_count > 0 && <span className="flex items-center gap-1"><Heart size={10} className="text-red-400" />{trip.save_count}명 저장</span>}
                  {trip.fork_count > 0 && <span className="flex items-center gap-1"><Copy size={10} className="text-violet-400" />{trip.fork_count}명 담기</span>}
                </div>
              )}
            </div>

            {/* CTA */}
            <div className="space-y-2">
              <CloneButton />
              <div className="flex gap-2">
                <motion.button
                  onClick={handleToggleSave}
                  whileTap={{ scale: 0.85 }}
                  className={cn(
                    'flex-1 h-10 rounded-xl border-2 flex items-center justify-center gap-1.5 text-[12px] font-bold transition-colors',
                    isSaved
                      ? 'border-red-200 bg-red-50 text-red-500'
                      : 'border-slate-200 bg-white text-slate-600 hover:border-violet-200',
                  )}
                >
                  <Heart size={13} fill={isSaved ? '#EF4444' : 'none'} color={isSaved ? '#EF4444' : '#94a3b8'} />
                  {isSaved ? '저장됨' : '저장'}
                </motion.button>
                <motion.button
                  onClick={handleShare}
                  whileTap={{ scale: 0.85 }}
                  className="flex-1 h-10 rounded-xl border-2 border-slate-200 bg-white flex items-center justify-center gap-1.5 text-[12px] font-bold text-slate-600 hover:border-violet-200 transition-colors"
                >
                  <Share2 size={13} className="text-slate-400" />
                  공유
                </motion.button>
              </div>
            </div>

            {/* 여행 준비하기 (사이드바) */}
            {prepItems.length > 0 && <PrepSection compact />}
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
