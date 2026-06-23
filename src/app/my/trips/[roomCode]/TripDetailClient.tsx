'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MapPin, Calendar, Users, ArrowLeft, Copy, Check, Clock,
  Lock, Map, Plus, Navigation, GripVertical, UserCircle2,
  Plane, Trash2, LogOut, ChevronDown, Loader2, Info, Globe, EyeOff,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';
import { getPrimaryAffiliate } from '@/lib/affiliate/affiliateRules';
import { getCountryGradient } from '@/lib/trip/coverImage';
import { APP_URL } from '@/lib/config/site';
import type { TripRoom } from '@/lib/supabase/types';
import AffiliateBanner from '@/components/affiliate/AffiliateBanner';
import CompletionModal from '@/components/affiliate/CompletionModal';
import CoverImageUpload from '@/components/trip/CoverImageUpload';
import { FLAG } from '@/lib/constants/flags';

const CATEGORY_ICON: Record<string, string> = {
  restaurant:'🍽', cafe:'☕', attraction:'🎯', lodging:'🏨',
  shopping:'🛍', transport:'🚆', activity:'🏄', beach:'🏖',
  nature:'🌿', culture:'🏛', etc:'📍',
};

const ROLE_CFG: Record<string, { label: string; cls: string }> = {
  owner:  { label: '여행장',      cls: 'bg-violet-100 text-violet-700' },
  editor: { label: '여행 파트너', cls: 'bg-emerald-100 text-emerald-700' },
  viewer: { label: '동행',        cls: 'bg-sky-100 text-sky-600' },
};

// ─── 타입 ────────────────────────────────────────────────────────────
interface Marker {
  id: number; name: string; address: string | null; category: string;
  day_number: number; stay_minutes: number; memo: string | null;
}

interface Member {
  id: number; role: string; joined_at: string;
  users: { nickname: string; avatar_url: string | null } | null;
}

interface Room {
  id: string; title: string; destination: string | null;
  country_code: string; start_date: string | null; end_date: string | null;
  is_locked: boolean; is_public: boolean;
  marker_count: number; member_count: number;
  cover_image_url: string | null;
  created_at: string; trip_members: Member[];
}

// ─── 헬퍼 ────────────────────────────────────────────────────────────
function cleanDest(dest: string | null): string | null {
  if (!dest) return null;
  return dest.replace(/^[^\s]+\s/, '') || dest;
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

function getDday(startDate: string | null): { label: string; soon: boolean } | null {
  if (!startDate) return null;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const start = new Date(startDate); start.setHours(0, 0, 0, 0);
  const diff = Math.round((start.getTime() - today.getTime()) / 86_400_000);
  if (diff === 0) return { label: 'D-Day', soon: true };
  if (diff > 0 && diff <= 365) return { label: `D-${diff}`, soon: diff <= 14 };
  return null;
}

// ─── MarkerCard ──────────────────────────────────────────────────────
function MarkerCard({ marker, index }: { marker: Marker; index: number }) {
  const icon = CATEGORY_ICON[marker.category] ?? '📍';

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, delay: index * 0.05, ease: 'easeOut' }}
      className="group relative bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex items-start gap-3"
    >
      <div className="absolute left-3 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
        <GripVertical size={14} className="text-slate-300" />
      </div>
      <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-violet-50 to-indigo-50 flex items-center justify-center text-lg shrink-0 ml-1">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-violet-500 text-white text-[10px] font-extrabold shrink-0">
            {index + 1}
          </span>
          <span className="text-[14px] font-extrabold text-slate-900 truncate">
            {marker.name}
          </span>
        </div>
        {marker.address && (
          <p className="text-[11px] text-slate-400 truncate mt-0.5 ml-7">{marker.address}</p>
        )}
        {marker.stay_minutes > 0 && (
          <span className="inline-flex items-center gap-1 text-[11px] text-slate-500 mt-1.5 ml-7">
            <Clock size={10} className="text-slate-400" />
            {marker.stay_minutes >= 60
              ? `${Math.floor(marker.stay_minutes / 60)}시간${marker.stay_minutes % 60 ? ` ${marker.stay_minutes % 60}분` : ''}`
              : `${marker.stay_minutes}분`} 체류
          </span>
        )}
      </div>
    </motion.div>
  );
}

// ─── DayTabs ─────────────────────────────────────────────────────────
function DayTabs({ days, activeDay, startDate, onSelect }: {
  days: number[]; activeDay: number; startDate: string | null;
  onSelect: (day: number) => void;
}) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [-webkit-overflow-scrolling:touch]">
      {days.map(day => {
        const date   = getDayDate(startDate, day);
        const active = day === activeDay;
        return (
          <button
            key={day}
            onClick={() => onSelect(day)}
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
  );
}

// ─── MemberCard ──────────────────────────────────────────────────────
function MemberCard({ member }: { member: Member }) {
  const nick    = member.users?.nickname ?? '알 수 없음';
  const initial = nick.charAt(0).toUpperCase();
  const role    = ROLE_CFG[member.role] ?? { label: member.role, cls: 'bg-slate-100 text-slate-500' };

  return (
    <div className="flex items-center gap-3 bg-white rounded-2xl border border-slate-100 p-3">
      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-violet-400 to-indigo-500 flex items-center justify-center text-sm font-extrabold text-white shrink-0">
        {initial}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-bold text-slate-800 truncate">{nick}</p>
        <p className="text-[10px] text-slate-400">
          {new Date(member.joined_at).toLocaleDateString('ko-KR')} 참여
        </p>
      </div>
      <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0', role.cls)}>
        {role.label}
      </span>
    </div>
  );
}

// ─── 확인 다이얼로그 ──────────────────────────────────────────────────
function ConfirmDialog({
  icon, title, desc, confirmLabel, confirmCls,
  loading, onCancel, onConfirm,
}: {
  icon: React.ReactNode; title: string; desc: string;
  confirmLabel: string; confirmCls: string;
  loading: boolean; onCancel: () => void; onConfirm: () => void;
}) {
  return (
    <div
      className="fixed inset-0 bg-black/50 z-[600] flex items-end sm:items-center justify-center p-4"
      onClick={onCancel}
    >
      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 16, scale: 0.97 }}
        transition={{ type: 'spring', damping: 28, stiffness: 320 }}
        className="bg-white w-full sm:max-w-[360px] rounded-3xl p-6 shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="sm:hidden flex justify-center mb-4">
          <div className="w-10 h-1 bg-slate-200 rounded-full" />
        </div>
        <div className="w-12 h-12 rounded-2xl bg-red-50 flex items-center justify-center mb-4 mx-auto">
          {icon}
        </div>
        <div className="text-[16px] font-extrabold text-slate-900 mb-1.5 text-center">{title}</div>
        <p className="text-[13px] text-slate-500 mb-6 text-center leading-relaxed">{desc}</p>
        <div className="flex gap-2">
          <button
            onClick={onCancel}
            disabled={loading}
            className="flex-1 py-3 rounded-2xl text-sm font-bold bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors disabled:opacity-50"
          >
            취소
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className={cn('flex-1 py-3 rounded-2xl text-sm font-bold text-white transition-colors flex items-center justify-center gap-2 disabled:opacity-70', confirmCls)}
          >
            {loading && <Loader2 size={14} className="animate-spin" />}
            {confirmLabel}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ─── 토스트 ──────────────────────────────────────────────────────────
function Toast({ msg }: { msg: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 32 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 16 }}
      className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[700] bg-slate-900 text-white text-sm font-bold px-5 py-3 rounded-2xl shadow-xl"
    >
      {msg}
    </motion.div>
  );
}

// ─── TripDetailClient ─────────────────────────────────────────────────
export default function TripDetailClient({
  room, markers, myRole, myMemberId,
}: {
  room: Room; markers: Marker[]; myRole: string; myMemberId: number;
}) {
  const router = useRouter();

  const [copied,             setCopied]             = useState(false);
  const [showDeleteConfirm,  setShowDeleteConfirm]  = useState(false);
  const [showLeaveConfirm,   setShowLeaveConfirm]   = useState(false);
  const [showDangerZone,     setShowDangerZone]     = useState(false);
  const [actionLoading,      setActionLoading]      = useState(false);
  const [toastMsg,           setToastMsg]           = useState<string | null>(null);
  const [isPublic,           setIsPublic]           = useState(room.is_public);
  const [toggleLoading,      setToggleLoading]      = useState(false);
  const [coverImageUrl,      setCoverImageUrl]      = useState(room.cover_image_url);

  const flag     = FLAG[room.country_code] ?? '🌐';
  const [g1, g2] = getCountryGradient(room.country_code);
  const dest     = cleanDest(room.destination);
  const dday     = getDday(room.start_date);
  const days     = Array.from(new Set(markers.map(m => m.day_number))).sort((a, b) => a - b);
  const isOwner  = myRole === 'owner';

  const [activeDay, setActiveDay] = useState<number>(days[0] ?? 1);
  const activeMarkers = markers.filter(m => m.day_number === activeDay);

  const myRoleCfg = ROLE_CFG[myRole] ?? { label: myRole, cls: 'bg-slate-100 text-slate-500' };

  // 제휴 배너 — 해외여행(항공), 2박이상(숙소)
  const nights_val = room.start_date && room.end_date
    ? Math.round((new Date(room.end_date).getTime() - new Date(room.start_date).getTime()) / 86400000)
    : 0;
  const affiliateRoom = {
    nights: nights_val, is_domestic: room.country_code === 'KR',
    destination: room.destination,
    start_date: room.start_date, end_date: room.end_date,
  } as TripRoom;
  const headerBanner  = getPrimaryAffiliate({ room: affiliateRoom, markers: [] }, 'TRIP_HEADER_BANNER');
  const dividerBanner = getPrimaryAffiliate({ room: affiliateRoom, markers: [] }, 'DAY_DIVIDER_BANNER');
  const insuranceCTA  = getPrimaryAffiliate({ room: affiliateRoom, markers: [] }, 'COMPLETION_MODAL');
  const hasLodging    = markers.some(m => m.category === 'lodging');

  const handleCopy = async () => {
    await navigator.clipboard.writeText(
      `${APP_URL}/room/${room.id}`
    );
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 2500);
  };

  // ── 공개/비공개 토글 ───────────────────────────────────────────────
  const handleTogglePublic = async () => {
    setToggleLoading(true);
    try {
      const supabase = createClient();
      const next = !isPublic;
      const { data, error } = await supabase.rpc('set_trip_public', {
        p_room_id:   room.id,
        p_is_public: next,
      });
      if (error) throw error;
      const updated = data as boolean;
      setIsPublic(updated);
      showToast(updated ? '여행을 공개했어요. Explore에 노출돼요.' : '여행을 비공개로 변경했어요.');
    } catch {
      showToast('설정 변경에 실패했어요.');
    } finally {
      setToggleLoading(false);
    }
  };

  // ── 여행 삭제 ──────────────────────────────────────────────────────
  // markers / trip_members는 ON DELETE CASCADE이므로 trip_rooms 삭제 하나로 충분.
  // 명시적 선삭제는 is_locked=true 방에서 RLS에 막히므로 제거.
  const handleDeleteTrip = async () => {
    setActionLoading(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.rpc('delete_trip_room', { p_room_id: room.id });
      if (error) throw error;
      setShowDeleteConfirm(false);
      showToast('여행 일지를 삭제했어요.');
      setTimeout(() => router.push('/my/trips'), 1000);
    } catch {
      setActionLoading(false);
      showToast('여행 삭제에 실패했어요.');
    }
  };

  // ── 여행 나가기 ────────────────────────────────────────────────────
  const handleLeaveTrip = async () => {
    setActionLoading(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.from('trip_members').delete().eq('id', myMemberId);
      if (error) throw error;
      showToast('여행에서 나갔어요.');
      setTimeout(() => router.push('/my/trips'), 1000);
    } catch {
      setActionLoading(false);
      showToast('여행 나가기에 실패했어요.');
    }
  };

  return (
    <div className="min-h-screen bg-[#F6F4FF]">

      {/* ── 헤더 ─────────────────────────────────────────────── */}
      <div className="relative px-4 sm:px-6 lg:px-8 pt-5 pb-6 overflow-hidden">
        {coverImageUrl ? (
          <>
            <img src={coverImageUrl} alt="" className="absolute inset-0 w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-b from-black/55 via-black/45 to-black/65" />
          </>
        ) : (
          <div
            className="absolute inset-0"
            style={{ background: `linear-gradient(135deg, ${g1}, ${g2})` }}
          />
        )}
        <div className="relative z-[1] max-w-5xl mx-auto">
          <div className="flex items-center justify-between gap-3 mb-5">
            <Link
              href="/my/trips"
              className="group inline-flex items-center gap-1.5 text-white/70 hover:text-white text-sm font-semibold transition-colors duration-150"
            >
              <ArrowLeft size={14} className="group-hover:-translate-x-0.5 transition-transform duration-150" />
              내 여행 일지
            </Link>
            {isOwner && (
              <CoverImageUpload
                roomId={room.id}
                onSuccess={url => {
                  setCoverImageUrl(url);
                  showToast('커버 이미지가 변경됐어요.');
                }}
                onError={msg => showToast(msg)}
              />
            )}
          </div>

          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="flex items-start gap-4">
              <div className="text-4xl leading-none mt-0.5 select-none">{flag}</div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h1 className="text-[22px] sm:text-2xl font-black text-white tracking-tight leading-snug">
                    {room.title}
                  </h1>
                  {room.is_locked && <Lock size={14} className="text-white/60 shrink-0 mt-0.5" />}
                  {isPublic && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/20 text-white/90 shrink-0">
                      공개
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
                  {dest && (
                    <span className="flex items-center gap-1.5 text-white/75 text-[13px]">
                      <MapPin size={12} />{dest}
                    </span>
                  )}
                  <span className="flex items-center gap-1.5 text-white/75 text-[13px]">
                    <Calendar size={12} />{formatDateRange(room.start_date, room.end_date)}
                  </span>
                  <span className="flex items-center gap-1.5 text-white/75 text-[13px]">
                    <Users size={12} />{room.member_count}명
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {dday && (
                <div className={cn(
                  'flex flex-col items-center px-3.5 py-2 rounded-2xl text-center',
                  dday.soon ? 'bg-white text-violet-600' : 'bg-white/20 text-white',
                )}>
                  <span className={cn('text-lg font-black leading-none', dday.soon ? 'text-violet-600' : 'text-white')}>
                    {dday.label}
                  </span>
                  <span className={cn('text-[10px] font-semibold mt-0.5', dday.soon ? 'text-violet-400' : 'text-white/60')}>
                    여행까지
                  </span>
                </div>
              )}
              <div className="flex flex-col items-center px-3.5 py-2 rounded-2xl bg-white/20 text-white text-center">
                <span className="text-lg font-black leading-none">{room.marker_count}</span>
                <span className="text-[10px] font-semibold mt-0.5 text-white/70">개 장소</span>
              </div>
              <div className="flex flex-col items-center px-3.5 py-2 rounded-2xl bg-white/20 text-white text-center">
                <span className="text-lg font-black leading-none">{room.member_count}</span>
                <span className="text-[10px] font-semibold mt-0.5 text-white/70">명 함께</span>
              </div>
              <span className={cn('text-[11px] font-bold px-3 py-1.5 rounded-full self-center', myRoleCfg.cls)}>
                {myRoleCfg.label}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── 제휴 배너: 항공권 (해외 여행만) ── */}
      {headerBanner && (
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-5">
          <AffiliateBanner
            insertion={headerBanner}
            roomId={room.id}
            destination={room.destination}
            variant="header"
          />
        </div>
      )}

      {/* ── 본문 ─────────────────────────────────────────────── */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6">

        {/* 보기 전용 배너 */}
        {!isOwner && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-3 bg-sky-50 border border-sky-100 rounded-2xl px-4 py-3 mb-5"
          >
            <Info size={15} className="text-sky-500 shrink-0" />
            <p className="text-[13px] text-sky-700 font-semibold">
              동행으로 참여 중이에요. 일정은 여행장만 수정할 수 있어요.
            </p>
          </motion.div>
        )}

        {/* 액션 버튼 */}
        <div className="flex flex-wrap gap-2.5 mb-7">
          {isOwner ? (
            <>
              <Link
                href={`/room/${room.id}/edit`}
                className="inline-flex items-center gap-2 bg-gradient-to-r from-violet-500 to-indigo-500 hover:from-violet-600 hover:to-indigo-600 text-white text-sm font-bold px-4 py-2.5 rounded-2xl shadow-md shadow-violet-200 transition-colors"
              >
                <Plus size={15} />
                장소 추가
              </Link>
              <Link
                href={`/room/${room.id}/edit`}
                className="inline-flex items-center gap-2 bg-white hover:bg-slate-50 text-slate-700 text-sm font-bold px-4 py-2.5 rounded-2xl border border-slate-200 shadow-sm transition-colors"
              >
                <Map size={15} className="text-violet-400" />
                지도에서 편집
              </Link>
              <button
                onClick={handleCopy}
                className={cn(
                  'inline-flex items-center gap-2 text-sm font-bold px-4 py-2.5 rounded-2xl border shadow-sm transition-all duration-200',
                  copied
                    ? 'bg-emerald-500 text-white border-emerald-500'
                    : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200',
                )}
              >
                {copied ? <><Check size={15} />복사됨!</> : <><Copy size={15} />초대 링크 복사</>}
              </button>
            </>
          ) : (
            <Link
              href={`/room/${room.id}/edit`}
              className="inline-flex items-center gap-2 bg-white hover:bg-slate-50 text-slate-700 text-sm font-bold px-4 py-2.5 rounded-2xl border border-slate-200 shadow-sm transition-colors"
            >
              <Map size={15} className="text-violet-400" />
              일정 지도 보기
            </Link>
          )}
        </div>

        {/* 2-column grid */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_264px] gap-5">

          {/* ── 왼쪽: 일정 목록 ─────────────────────────────── */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-[15px] font-extrabold text-slate-800 flex items-center gap-2">
                <Plane size={15} className="text-violet-400" />
                여행 일정
                <span className="text-[12px] font-semibold text-slate-400 ml-0.5">
                  ({markers.length}개 장소)
                </span>
              </h2>
            </div>

            {markers.length === 0 ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-white rounded-3xl border-2 border-dashed border-slate-200 py-14 flex flex-col items-center text-center"
              >
                <div className="w-16 h-16 rounded-2xl bg-violet-50 flex items-center justify-center mb-4">
                  <Navigation size={26} className="text-violet-300" />
                </div>
                <p className="text-[15px] font-extrabold text-slate-600 mb-1.5">
                  아직 추가된 장소가 없어요
                </p>
                <p className="text-sm text-slate-400 mb-5">
                  {isOwner ? '지도 편집 화면에서 장소를 추가해보세요.' : '여행장이 장소를 추가하면 여기에 표시돼요.'}
                </p>
                {isOwner && (
                  <Link
                    href={`/room/${room.id}/edit`}
                    className="inline-flex items-center gap-2 bg-violet-500 hover:bg-violet-600 text-white text-sm font-bold px-4 py-2.5 rounded-2xl shadow-md shadow-violet-200 transition-colors"
                  >
                    <Plus size={15} />
                    첫 장소 추가하기
                  </Link>
                )}
              </motion.div>
            ) : (
              <>
                {days.length > 0 && (
                  <div className="mb-4">
                    <DayTabs days={days} activeDay={activeDay} startDate={room.start_date} onSelect={setActiveDay} />
                  </div>
                )}
                <AnimatePresence mode="wait">
                  <motion.div
                    key={activeDay}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="flex flex-col gap-2.5"
                  >
                    {activeMarkers.length > 0 ? (
                      activeMarkers.map((m, i) => (
                        <MarkerCard key={m.id} marker={m} index={i} />
                      ))
                    ) : (
                      <div className="bg-white rounded-2xl border border-dashed border-slate-200 py-10 flex flex-col items-center text-center">
                        <p className="text-sm text-slate-400 mb-3">이 날은 아직 장소가 없어요</p>
                        {isOwner && (
                          <Link
                            href={`/room/${room.id}/edit`}
                            className="text-xs font-bold text-violet-500 hover:text-violet-700 transition-colors"
                          >
                            + 장소 추가하기
                          </Link>
                        )}
                      </div>
                    )}
                  </motion.div>
                </AnimatePresence>

                {/* ── 제휴 배너: 숙소 (2박 이상만) ── */}
                {dividerBanner && (
                  <AffiliateBanner
                    insertion={dividerBanner}
                    roomId={room.id}
                    destination={room.destination}
                    variant="divider"
                    className="mt-4"
                  />
                )}
              </>
            )}
          </section>

          {/* ── 오른쪽: 멤버 사이드바 ──────────────────────── */}
          <aside className="lg:sticky lg:top-6 lg:self-start flex flex-col gap-4">

            {/* 멤버 목록 */}
            <div className="bg-white/70 rounded-3xl border border-slate-100 p-4 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-[14px] font-extrabold text-slate-800 flex items-center gap-1.5">
                  <UserCircle2 size={14} className="text-violet-400" />
                  멤버
                  <span className="text-[11px] font-semibold text-slate-400">({room.trip_members.length}명)</span>
                </h3>
              </div>
              <div className="flex flex-col gap-2">
                {room.trip_members.map(member => (
                  <MemberCard key={member.id} member={member} />
                ))}
              </div>

              {/* 초대 링크: 여행장만 */}
              {isOwner && (
                <button
                  onClick={handleCopy}
                  className={cn(
                    'mt-3 w-full inline-flex items-center justify-center gap-2 text-sm font-bold px-4 py-2.5 rounded-2xl border transition-all duration-200',
                    copied
                      ? 'bg-emerald-500 text-white border-emerald-500'
                      : 'bg-violet-50 text-violet-600 border-violet-200 hover:bg-violet-100',
                  )}
                >
                  {copied ? <><Check size={14} />복사됨!</> : <><Copy size={14} />초대 링크 복사</>}
                </button>
              )}
            </div>

            {/* ── 여행장: 위험한 설정 영역 ── */}
            {isOwner && (
              <div className="bg-white/70 rounded-3xl border border-slate-100 p-4 shadow-sm">
                <button
                  onClick={() => setShowDangerZone(v => !v)}
                  className="w-full flex items-center justify-between text-[13px] font-bold text-slate-500 hover:text-slate-700 transition-colors"
                >
                  <span>여행 설정</span>
                  <ChevronDown
                    size={15}
                    className={cn('transition-transform duration-200', showDangerZone && 'rotate-180')}
                  />
                </button>
                <AnimatePresence>
                  {showDangerZone && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="pt-3 mt-3 border-t border-slate-100 space-y-3">
                        {/* 커버 이미지 */}
                        <div>
                          <p className="text-[12px] font-bold text-slate-700 mb-2">커버 이미지</p>
                          {coverImageUrl && (
                            <img
                              src={coverImageUrl}
                              alt="커버 미리보기"
                              className="w-full aspect-video object-cover rounded-xl mb-2 border border-slate-100"
                            />
                          )}
                          <CoverImageUpload
                            variant="settings"
                            roomId={room.id}
                            onSuccess={url => {
                              setCoverImageUrl(url);
                              showToast('커버 이미지가 변경됐어요.');
                            }}
                            onError={msg => showToast(msg)}
                          />
                        </div>

                        {/* 공개/비공개 토글 */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {isPublic
                              ? <Globe size={14} className="text-violet-500" />
                              : <EyeOff size={14} className="text-slate-400" />
                            }
                            <div>
                              <p className="text-[12px] font-bold text-slate-700">
                                {isPublic ? '공개 여행' : '비공개 여행'}
                              </p>
                              <p className="text-[10px] text-slate-400 leading-tight">
                                {isPublic ? 'Explore 페이지에 노출돼요' : '나와 동행만 볼 수 있어요'}
                              </p>
                            </div>
                          </div>
                          <button
                            onClick={handleTogglePublic}
                            disabled={toggleLoading}
                            className={cn(
                              'w-10 h-[22px] rounded-full relative transition-colors duration-200 shrink-0 disabled:opacity-60',
                              isPublic ? 'bg-violet-500' : 'bg-slate-200',
                            )}
                          >
                            <span className={cn(
                              'absolute top-[3px] w-4 h-4 rounded-full bg-white shadow-sm transition-transform duration-200',
                              isPublic ? 'translate-x-5' : 'translate-x-[3px]',
                            )} />
                          </button>
                        </div>

                        {/* 공개된 경우 — Explore 링크 */}
                        {isPublic && (
                          <Link
                            href={`/t/${room.id}`}
                            target="_blank"
                            className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl text-[11px] font-bold text-violet-600 bg-violet-50 hover:bg-violet-100 transition-colors"
                          >
                            <Globe size={11} />
                            공개 일정 보기 →
                          </Link>
                        )}

                        <div className="border-t border-slate-100 pt-3">
                          <p className="text-[11px] text-slate-400 mb-2.5 leading-relaxed">
                            여행 일지를 삭제하면 모든 장소와 멤버 정보가 영구적으로 사라져요.
                          </p>
                          <button
                            onClick={() => setShowDeleteConfirm(true)}
                            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-2xl text-sm font-bold text-red-500 border border-red-200 bg-red-50 hover:bg-red-100 transition-colors"
                          >
                            <Trash2 size={14} />
                            여행 삭제하기
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}

            {/* ── 동행: 여행 나가기 ── */}
            {!isOwner && (
              <div className="bg-white/70 rounded-3xl border border-slate-100 p-4 shadow-sm">
                <button
                  onClick={() => setShowLeaveConfirm(true)}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-2xl text-sm font-bold text-slate-500 border border-slate-200 hover:bg-slate-50 transition-colors"
                >
                  <LogOut size={14} />
                  여행 나가기
                </button>
              </div>
            )}

          </aside>
        </div>
      </div>

      {/* ── 여행 완성 체크리스트 모달 (owner + 장소 3개+) ── */}
      {isOwner && markers.length >= 3 && insuranceCTA && (
        <CompletionModal
          roomId={room.id}
          destination={room.destination}
          markerCount={markers.length}
          hasLodging={hasLodging}
          insuranceCTA={insuranceCTA}
          lodgingUrl={dividerBanner?.url ?? null}
        />
      )}

      {/* ── 다이얼로그들 ────────────────────────────────────── */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <ConfirmDialog
            icon={<Trash2 size={22} className="text-red-500" />}
            title="여행 일지를 삭제할까요?"
            desc="삭제하면 모든 장소, 멤버, 일정이 영구적으로 사라져요. 되돌릴 수 없어요."
            confirmLabel="삭제하기"
            confirmCls="bg-red-500 hover:bg-red-600"
            loading={actionLoading}
            onCancel={() => { if (!actionLoading) setShowDeleteConfirm(false); }}
            onConfirm={handleDeleteTrip}
          />
        )}
        {showLeaveConfirm && (
          <ConfirmDialog
            icon={<LogOut size={22} className="text-slate-500" />}
            title="여행에서 나갈까요?"
            desc="나가면 더 이상 이 여행 일지를 볼 수 없어요. 다시 참여하려면 초대 링크가 필요해요."
            confirmLabel="나가기"
            confirmCls="bg-slate-700 hover:bg-slate-800"
            loading={actionLoading}
            onCancel={() => { if (!actionLoading) setShowLeaveConfirm(false); }}
            onConfirm={handleLeaveTrip}
          />
        )}
        {toastMsg && <Toast key="toast" msg={toastMsg} />}
      </AnimatePresence>
    </div>
  );
}
