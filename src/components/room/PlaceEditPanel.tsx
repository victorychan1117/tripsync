'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence, useDragControls } from 'framer-motion';
import {
  X, MapPin, Clock, MessageSquare, Tag, Calendar,
  Check, AlertCircle, Loader2, ExternalLink,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { MarkerWithRoute, TripRoom, MarkerCategory } from '@/lib/supabase/types';
import { trackAffiliateClick } from '@/lib/affiliate/affiliateRules';

const CATEGORY_OPTIONS: { value: MarkerCategory; label: string; emoji: string }[] = [
  { value: 'attraction', label: '관광지',   emoji: '🏛️' },
  { value: 'restaurant', label: '맛집',     emoji: '🍽️' },
  { value: 'cafe',       label: '카페',     emoji: '☕'  },
  { value: 'lodging',    label: '숙소',     emoji: '🏨' },
  { value: 'shopping',   label: '쇼핑',     emoji: '🛍️' },
  { value: 'activity',   label: '액티비티', emoji: '🎢' },
  { value: 'beach',      label: '해변',     emoji: '🏖️' },
  { value: 'nature',     label: '자연',     emoji: '🌿' },
  { value: 'culture',    label: '문화',     emoji: '🎭' },
  { value: 'transport',  label: '교통',     emoji: '🚌' },
  { value: 'etc',        label: '기타',     emoji: '📍' },
];

const PIN_COLORS = ['#6366F1', '#8B5CF6', '#EC4899', '#F97316', '#EAB308', '#10B981', '#0EA5E9'];

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

interface Props {
  marker:     MarkerWithRoute;
  index:      number;
  room:       TripRoom;
  totalDays:  number;
  isLocked:   boolean;
  isOwner?:   boolean;
  mobileView: 'map' | 'list';
  onClose:    () => void;
  onUpdate:   (id: number, patch: Partial<MarkerWithRoute>) => Promise<void>;
}

export default function PlaceEditPanel({ marker, index, room, totalDays, isLocked, isOwner = true, mobileView, onClose, onUpdate }: Props) {
  const effectiveLocked = isLocked || !isOwner;
  const color           = PIN_COLORS[index % PIN_COLORS.length];
  const dragControls    = useDragControls();

  const [form, setForm] = useState({
    category:     marker.category,
    day_number:   marker.day_number,
    stay_minutes: marker.stay_minutes ?? 60,
    memo:         marker.memo ?? '',
  });
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const timerRef   = useRef<ReturnType<typeof setTimeout>>();
  const isDirtyRef = useRef(false);

  useEffect(() => {
    setForm({
      category:     marker.category,
      day_number:   marker.day_number,
      stay_minutes: marker.stay_minutes ?? 60,
      memo:         marker.memo ?? '',
    });
    setSaveStatus('idle');
    isDirtyRef.current = false;
  }, [marker.id]);

  const setField = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) => {
    setForm(prev => ({ ...prev, [key]: value }));
    isDirtyRef.current = true;
  };

  const handleSave = useCallback(async () => {
    if (!isDirtyRef.current) return;
    setSaveStatus('saving');
    try {
      await onUpdate(marker.id, {
        category:     form.category,
        day_number:   form.day_number,
        stay_minutes: form.stay_minutes,
        memo:         form.memo || null,
      });
      setSaveStatus('saved');
      isDirtyRef.current = false;
      clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setSaveStatus('idle'), 2000);
    } catch {
      setSaveStatus('error');
      clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setSaveStatus('idle'), 3000);
    }
  }, [form, marker.id, onUpdate]);

  const stayH = Math.floor(form.stay_minutes / 60);
  const stayM = form.stay_minutes % 60;

  const saveBtnClass = cn(
    'w-full py-3 rounded-2xl text-sm font-bold transition-all duration-200 flex items-center justify-center gap-2',
    saveStatus === 'saved'  ? 'bg-emerald-500 text-white' :
    saveStatus === 'error'  ? 'bg-red-500 text-white' :
    saveStatus === 'saving' ? 'bg-violet-300 text-white cursor-not-allowed' :
    'bg-violet-500 hover:bg-violet-600 text-white',
  );
  const saveBtnLabel =
    saveStatus === 'saving' ? '저장 중...' :
    saveStatus === 'saved'  ? '방금 저장됨' :
    saveStatus === 'error'  ? '저장 실패 · 다시 시도' : '저장하기';

  const affiliateBtns = [
    {
      label: '아고다 최저가로 예약하기', sub: '근처 숙소 예약', emoji: '🏨',
      bg: 'linear-gradient(135deg, #E8532A, #FF7043)', shadow: '0 4px 12px rgba(232,83,42,0.3)',
      partner: 'AGODA' as const,
      url: `https://www.agoda.com/search?city=${encodeURIComponent(room.destination ?? '')}&affiliateId=${process.env.NEXT_PUBLIC_AGODA_AFFILIATE_ID ?? ''}`,
    },
    {
      label: '클룩 할인 투어 예약하기', sub: '액티비티 · 투어', emoji: '🎫',
      bg: 'linear-gradient(135deg, #FF5722, #FF8A65)', shadow: '0 4px 12px rgba(255,87,34,0.3)',
      partner: 'KLOOK' as const,
      url: `https://www.klook.com/search/?query=${encodeURIComponent(marker.name)}`,
    },
  ];

  // ── 공유 폼 섹션 (데스크톱/모바일 공통) ───────────────────────────
  const FormFields = (
    <div className="px-5 py-4 flex flex-col gap-4">
      {/* 카테고리 */}
      <div>
        <label className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500 mb-2">
          <Tag size={11} /> 카테고리
        </label>
        {effectiveLocked ? (
          <span className="text-sm font-semibold text-slate-700">
            {CATEGORY_OPTIONS.find(c => c.value === form.category)?.emoji}{' '}
            {CATEGORY_OPTIONS.find(c => c.value === form.category)?.label}
          </span>
        ) : (
          <div className="grid grid-cols-3 gap-1.5">
            {CATEGORY_OPTIONS.map(cat => (
              <button
                key={cat.value}
                onClick={() => setField('category', cat.value)}
                className={cn(
                  'py-1.5 px-2 rounded-xl text-[11px] font-semibold transition-all duration-150 border',
                  form.category === cat.value
                    ? 'bg-violet-500 text-white border-violet-500'
                    : 'bg-slate-50 text-slate-600 border-slate-100 hover:border-violet-200 hover:bg-violet-50',
                )}
              >
                {cat.emoji} {cat.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Day */}
      <div>
        <label className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500 mb-2">
          <Calendar size={11} /> Day
        </label>
        {effectiveLocked ? (
          <span className="text-sm font-semibold text-slate-700">Day {form.day_number}</span>
        ) : (
          <div className="flex gap-1.5 flex-wrap">
            {Array.from({ length: totalDays }, (_, i) => i + 1).map(day => (
              <button
                key={day}
                onClick={() => setField('day_number', day)}
                className={cn(
                  'w-9 h-9 rounded-xl text-[13px] font-bold transition-all duration-150 border',
                  form.day_number === day
                    ? 'bg-violet-500 text-white border-violet-500'
                    : 'bg-slate-50 text-slate-600 border-slate-100 hover:border-violet-200',
                )}
              >
                {day}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 체류 시간 */}
      <div>
        <label className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500 mb-2">
          <Clock size={11} /> 체류 시간
        </label>
        {effectiveLocked ? (
          <span className="text-sm font-semibold text-slate-700">
            {stayH > 0 ? `${stayH}시간 ` : ''}{stayM > 0 || stayH === 0 ? `${stayM}분` : ''}
          </span>
        ) : (
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <input
                type="number" min={0} max={23} value={stayH}
                onChange={e => setField('stay_minutes', Math.max(0, Math.min(23, Number(e.target.value))) * 60 + stayM)}
                className="w-14 text-center bg-slate-50 border border-slate-200 rounded-xl py-2 text-sm font-bold text-slate-700 focus:outline-none focus:border-violet-400"
              />
              <span className="text-xs text-slate-500">시간</span>
            </div>
            <div className="flex items-center gap-1.5">
              <input
                type="number" min={0} max={59} step={15} value={stayM}
                onChange={e => setField('stay_minutes', stayH * 60 + Math.max(0, Math.min(59, Number(e.target.value))))}
                className="w-14 text-center bg-slate-50 border border-slate-200 rounded-xl py-2 text-sm font-bold text-slate-700 focus:outline-none focus:border-violet-400"
              />
              <span className="text-xs text-slate-500">분</span>
            </div>
          </div>
        )}
      </div>

      {/* 메모 */}
      <div>
        <label className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500 mb-2">
          <MessageSquare size={11} /> 메모
        </label>
        {effectiveLocked ? (
          form.memo
            ? <p className="text-[12.5px] text-slate-600 leading-relaxed bg-slate-50 rounded-xl p-3">{form.memo}</p>
            : <span className="text-xs text-slate-400">메모 없음</span>
        ) : (
          <textarea
            value={form.memo}
            onChange={e => setField('memo', e.target.value)}
            placeholder="장소에 대한 메모를 입력하세요..."
            rows={3}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-[12.5px] text-slate-700 placeholder:text-slate-300 resize-none focus:outline-none focus:border-violet-400 leading-relaxed"
          />
        )}
      </div>

      {!effectiveLocked && (
        <button onClick={handleSave} disabled={saveStatus === 'saving'} className={saveBtnClass}>
          {saveStatus === 'saving' && <Loader2 size={15} className="animate-spin" />}
          {saveStatus === 'saved'  && <Check size={15} />}
          {saveStatus === 'error'  && <AlertCircle size={15} />}
          {saveBtnLabel}
        </button>
      )}
    </div>
  );

  // ── 제휴 버튼 ────────────────────────────────────────────────────
  const AffiliateSection = (
    <>
      <div className="border-t border-slate-100 mx-5" />
      <div className="px-5 py-4 pb-5 flex flex-col gap-2">
        {affiliateBtns.map(btn => (
          <a
            key={btn.partner}
            href={btn.url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => trackAffiliateClick(btn.partner, room.id, room.destination ?? '', marker.id)}
            style={{ background: btn.bg, boxShadow: btn.shadow }}
            className="flex items-center justify-between px-4 py-[13px] rounded-[14px] text-white no-underline transition-all duration-150 hover:-translate-y-0.5"
          >
            <div className="flex items-center gap-2.5">
              <span className="text-lg">{btn.emoji}</span>
              <div>
                <div className="text-[10px] opacity-85 mb-0.5">{btn.sub}</div>
                <div className="text-[13px] font-bold">{btn.label}</div>
              </div>
            </div>
            <ExternalLink size={14} className="opacity-80 shrink-0" />
          </a>
        ))}
        <a
          href={`https://www.booking.com/searchresults.html?ss=${encodeURIComponent(room.destination ?? '')}&aid=${process.env.NEXT_PUBLIC_BOOKING_AFFILIATE_ID ?? ''}`}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => trackAffiliateClick('BOOKING_COM', room.id, room.destination ?? '', marker.id)}
          className="flex items-center justify-between px-4 py-[11px] rounded-[14px] bg-slate-50 border-[1.5px] border-slate-200 text-blue-700 no-underline transition-all duration-150 hover:bg-blue-50 hover:border-blue-300"
        >
          <div className="flex items-center gap-2.5">
            <span className="text-base">🏨</span>
            <div>
              <div className="text-[10px] text-slate-400 mb-0.5">호텔 · 리조트</div>
              <div className="text-xs font-bold">Booking.com 가격 비교</div>
            </div>
          </div>
          <ExternalLink size={13} className="opacity-50" />
        </a>
      </div>
    </>
  );

  return (
    <>
      {/* ════════════════════════════════════════════════════════
          데스크톱: 오른쪽 사이드 패널 (항상 표시)
      ════════════════════════════════════════════════════════ */}
      <motion.div
        key={`desktop-${marker.id}`}
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 28, stiffness: 260 }}
        className="hidden md:flex flex-col absolute top-0 right-0 h-full w-[340px] bg-white shadow-[-4px_0_32px_rgba(0,0,0,0.12)] z-[200] overflow-hidden"
      >
        <div
          style={{ background: `linear-gradient(145deg, ${color}, ${color}BB)` }}
          className="relative shrink-0 px-5 pt-5 pb-4"
        >
          <button
            onClick={onClose}
            className="absolute top-3.5 right-3.5 w-7 h-7 bg-white/20 rounded-full flex items-center justify-center text-white hover:bg-white/35 transition-colors"
          >
            <X size={14} />
          </button>
          <div className="w-9 h-9 bg-white/25 border-2 border-white/50 rounded-full flex items-center justify-center text-sm font-extrabold text-white mb-2.5">
            {index + 1}
          </div>
          <div className="text-[17px] font-extrabold text-white mb-1 pr-8 leading-tight">{marker.name}</div>
          <div className="flex items-center gap-1 text-[11px] text-white/75">
            <MapPin size={10} />
            <span className="truncate">{marker.address ?? '주소 없음'}</span>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {FormFields}
          {AffiliateSection}
        </div>
      </motion.div>

      {/* ════════════════════════════════════════════════════════
          모바일: 바텀시트 (list 뷰에서만 표시)
          — 드래그 핸들로 스와이프 다운 닫기 지원
      ════════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {mobileView === 'list' && (
          <motion.div
            key={`mobile-${marker.id}`}
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 260 }}
            drag="y"
            dragControls={dragControls}
            dragListener={false}
            dragConstraints={{ top: 0 }}
            dragElastic={{ top: 0, bottom: 0.35 }}
            dragMomentum={false}
            onDragEnd={(_, info) => {
              if (info.offset.y > 80 || info.velocity.y > 500) {
                onClose();
              }
            }}
            className="md:hidden absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl shadow-[0_-8px_40px_rgba(0,0,0,0.18)] z-[200] max-h-[72vh] flex flex-col overflow-hidden"
          >
            {/* 드래그 핸들 — 이 영역만 드래그 제스처 시작 */}
            <div
              className="flex justify-center pt-3 pb-0.5 shrink-0 cursor-grab active:cursor-grabbing touch-none select-none"
              onPointerDown={e => { e.preventDefault(); dragControls.start(e); }}
            >
              <div className="w-10 h-1.5 bg-slate-200 rounded-full" />
            </div>

            {/* 헤더 */}
            <div className="flex items-start gap-3 px-5 py-3 border-b border-slate-100 shrink-0">
              <div
                style={{ background: `linear-gradient(135deg, ${color}, ${color}BB)` }}
                className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-extrabold text-white shrink-0"
              >
                {index + 1}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[15px] font-extrabold text-slate-900 leading-tight truncate">{marker.name}</div>
                <div className="text-[11px] text-slate-400 mt-0.5 truncate">{marker.address ?? '주소 없음'}</div>
              </div>
              <button
                onClick={onClose}
                className="w-7 h-7 flex items-center justify-center rounded-full bg-slate-100 text-slate-500 shrink-0"
              >
                <X size={14} />
              </button>
            </div>

            {/* 스크롤 본문 */}
            <div className="flex-1 overflow-y-auto">
              {FormFields}
              {AffiliateSection}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
