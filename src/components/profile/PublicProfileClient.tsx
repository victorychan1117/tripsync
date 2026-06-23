'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, Eye, Clock, Heart, Copy, ArrowLeft, Globe } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import TripCoverBanner from '@/components/trip/TripCoverBanner';
import { FLAG } from '@/lib/constants/flags';

// ─── Types ───────────────────────────────────────────────────────────────
export interface ProfileUser {
  id: string;
  nickname: string;
  avatar_url: string | null;
}

export interface ProfileTrip {
  id: string;
  title: string;
  destination: string | null;
  country_code: string;
  nights: number;
  marker_count: number;
  view_count: number;
  fork_count: number;
  cover_image_url: string | null;
  created_at: string;
}

// ─── Constants ───────────────────────────────────────────────────────────

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

function getGradient(code: string): [string, string] {
  return GRADIENT[code] ?? ['#6366F1', '#8B5CF6'];
}
function fmtNights(nights: number): string {
  if (nights === 0) return '당일치기';
  return `${nights}박 ${nights + 1}일`;
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

// ─── ProfileAvatar ────────────────────────────────────────────────────────
function ProfileAvatar({ nickname, avatarUrl, size = 80 }: { nickname: string; avatarUrl: string | null; size?: number }) {
  const initial = nickname.charAt(0).toUpperCase();
  if (avatarUrl && (avatarUrl.startsWith('http://') || avatarUrl.startsWith('https://'))) {
    return (
      <img
        src={avatarUrl}
        alt={nickname}
        className="rounded-full object-cover border-4 border-white shadow-lg"
        style={{ width: size, height: size }}
      />
    );
  }
  if (avatarUrl) {
    return (
      <div
        className="rounded-full bg-white border-4 border-white shadow-lg flex items-center justify-center"
        style={{ width: size, height: size, fontSize: size * 0.45, lineHeight: 1 }}
      >
        {avatarUrl}
      </div>
    );
  }
  return (
    <div
      className="rounded-full border-4 border-white shadow-lg flex items-center justify-center text-white font-black select-none"
      style={{
        width: size, height: size,
        background: 'linear-gradient(135deg, #6366F1, #8B5CF6)',
        fontSize: size * 0.4,
      }}
    >
      {initial}
    </div>
  );
}

// ─── ProfileTripCard ──────────────────────────────────────────────────────
function ProfileTripCard({
  trip, index, isSaved, onToggleSave,
}: {
  trip: ProfileTrip; index: number; isSaved: boolean;
  onToggleSave: (e: React.MouseEvent, id: string) => void;
}) {
  const [g1, g2] = getGradient(trip.country_code);
  const flag = FLAG[trip.country_code] ?? '🌐';
  const dest = trip.destination ?? '여행지';

  return (
    <Link href={`/t/${trip.id}`}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        whileHover={{ y: -5, boxShadow: '0 20px 56px rgba(0,0,0,0.13)' }}
        transition={{ duration: 0.4, delay: Math.min(index * 0.05, 0.3) }}
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
        </div>
      </motion.div>
    </Link>
  );
}

// ─── Main ────────────────────────────────────────────────────────────────
export default function PublicProfileClient({
  profile, trips, isLoggedIn, viewerUserId, initialSavedIds,
}: {
  profile: ProfileUser;
  trips: ProfileTrip[];
  isLoggedIn: boolean;
  viewerUserId: string | null;
  initialSavedIds: string[];
}) {
  const [savedSet, setSavedSet] = useState<Set<string>>(() => new Set(initialSavedIds));
  const [toast, setToast] = useState<string | null>(null);

  const totalViews = trips.reduce((acc, t) => acc + (t.view_count ?? 0), 0);
  const totalForks = trips.reduce((acc, t) => acc + (t.fork_count ?? 0), 0);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  }, []);

  const handleToggleSave = useCallback(async (e: React.MouseEvent, tripId: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isLoggedIn || !viewerUserId) { showToast('로그인 후 여행을 저장할 수 있어요.'); return; }
    const supabase = createClient();
    const wasSaved = savedSet.has(tripId);
    setSavedSet(prev => {
      const next = new Set(prev);
      if (wasSaved) next.delete(tripId); else next.add(tripId);
      return next;
    });
    if (wasSaved) {
      const { error } = await supabase.from('saved_trips').delete().eq('user_id', viewerUserId).eq('room_id', tripId);
      if (error) {
        setSavedSet(prev => { const next = new Set(prev); next.add(tripId); return next; });
        showToast('저장 해제에 실패했어요.');
      } else showToast('저장을 취소했어요.');
    } else {
      const { error } = await supabase.from('saved_trips').insert({ user_id: viewerUserId, room_id: tripId });
      if (error) {
        setSavedSet(prev => { const next = new Set(prev); next.delete(tripId); return next; });
        showToast('저장에 실패했어요.');
      } else showToast('여행 일지를 저장했어요.');
    }
  }, [isLoggedIn, viewerUserId, savedSet, showToast]);

  return (
    <div className="min-h-screen bg-slate-50">

      {/* ── 프로필 헤더 ──────────────────────────────────────────────── */}
      <div className="bg-white border-b border-slate-100">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* 뒤로 가기 */}
          <div className="pt-6 pb-2">
            <Link
              href="/explore"
              className="inline-flex items-center gap-1.5 text-slate-400 hover:text-violet-500 text-sm font-semibold transition-colors"
            >
              <ArrowLeft size={14} />
              여행 탐색으로
            </Link>
          </div>

          {/* 프로필 카드 */}
          <div className="py-8 flex flex-col sm:flex-row items-center sm:items-start gap-6">
            <ProfileAvatar nickname={profile.nickname} avatarUrl={profile.avatar_url} size={88} />

            <div className="flex-1 text-center sm:text-left">
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight mb-1.5">
                🌏 {profile.nickname}님의 여행 일지
              </h1>

              {/* 통계 칩 */}
              <div className="flex flex-wrap justify-center sm:justify-start gap-2 mt-3">
                <div className="flex items-center gap-1.5 bg-violet-50 border border-violet-100 rounded-full px-3.5 py-1.5">
                  <Globe size={13} className="text-violet-500" />
                  <span className="text-xs font-bold text-violet-700">공개한 여행 {trips.length}개</span>
                </div>
                {totalViews > 0 && (
                  <div className="flex items-center gap-1.5 bg-slate-100 rounded-full px-3.5 py-1.5">
                    <Eye size={13} className="text-slate-400" />
                    <span className="text-xs font-bold text-slate-600">총 {totalViews.toLocaleString()}회 조회</span>
                  </div>
                )}
                {totalForks > 0 && (
                  <div className="flex items-center gap-1.5 bg-slate-100 rounded-full px-3.5 py-1.5">
                    <Copy size={13} className="text-slate-400" />
                    <span className="text-xs font-bold text-slate-600">{totalForks}번 담김</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── 여행 목록 ─────────────────────────────────────────────────── */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {trips.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center py-28 text-center"
          >
            <div className="w-28 h-28 rounded-full bg-violet-50 flex items-center justify-center mb-6">
              <Globe size={48} className="text-violet-300" />
            </div>
            <h3 className="text-xl font-extrabold text-slate-800 mb-2">
              아직 공개한 여행이 없어요
            </h3>
            <p className="text-slate-400 text-sm max-w-xs leading-relaxed">
              공개된 여행 일지가 생기면 여기에 표시돼요.
            </p>
          </motion.div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-extrabold text-slate-900">공개 여행 일정</h2>
              <span className="text-sm text-slate-400">총 {trips.length}개</span>
            </div>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.2 }}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5"
            >
              {trips.map((trip, i) => (
                <ProfileTripCard
                  key={trip.id}
                  trip={trip}
                  index={i}
                  isSaved={savedSet.has(trip.id)}
                  onToggleSave={handleToggleSave}
                />
              ))}
            </motion.div>
          </>
        )}
      </div>

      <AnimatePresence>
        {toast && <Toast key={toast + Date.now()} message={toast} />}
      </AnimatePresence>
    </div>
  );
}
