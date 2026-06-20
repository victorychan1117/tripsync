'use client';
import { Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, useMotionValue, useTransform, animate } from 'framer-motion';
import type { MarkerWithRoute } from '@/lib/supabase/types';

const CATEGORY_CONFIG = {
  attraction: { label: '관광지',   color: '#7C3AED', bg: '#EDE9FE' },
  beach:      { label: '해수욕장', color: '#0284C7', bg: '#E0F2FE' },
  restaurant: { label: '맛집',     color: '#EA580C', bg: '#FFF7ED' },
  cafe:       { label: '카페',     color: '#B45309', bg: '#FEFCE8' },
  nature:     { label: '자연',     color: '#16A34A', bg: '#F0FDF4' },
  culture:    { label: '문화',     color: '#CA8A04', bg: '#FEFCE8' },
  lodging:    { label: '숙소',     color: '#DC2626', bg: '#FEF2F2' },
  shopping:   { label: '쇼핑',     color: '#DB2777', bg: '#FDF2F8' },
  activity:   { label: '액티비티', color: '#0891B2', bg: '#ECFEFF' },
  transport:  { label: '교통',     color: '#475569', bg: '#F1F5F9' },
  etc:        { label: '기타',     color: '#64748B', bg: '#F8FAFC' },
};

interface Props {
  marker:     MarkerWithRoute;
  index:      number;
  color:      string;
  isSelected: boolean;
  isLocked:   boolean;
  isOwner?:   boolean;
  onSelect:   () => void;
  onRemove:   () => void;
}

function formatStay(min: number): string | null {
  if (!min || min === 0) return null;
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h > 0) return m > 0 ? `${h}시간 ${m}분` : `${h}시간`;
  return `${m}분`;
}

export default function PlaceCard({ marker, index, color, isSelected, isLocked, isOwner = true, onSelect, onRemove }: Props) {
  const cat       = CATEGORY_CONFIG[marker.category as keyof typeof CATEGORY_CONFIG] ?? CATEGORY_CONFIG.etc;
  const isPending = marker.id < 0;
  const stayText  = formatStay(marker.stay_minutes ?? 0);
  const swipeable = !isLocked && !isPending && isOwner;

  // 좌 스와이프 삭제 제스처
  const x             = useMotionValue(0);
  const deleteOpacity = useTransform(x, [-80, -20], [1, 0]);

  const handleDragEnd = (_: any, info: { offset: { x: number }; velocity: { x: number } }) => {
    if (swipeable && (info.offset.x < -70 || info.velocity.x < -400)) {
      onRemove(); // → handleDeleteRequest → 확인 다이얼로그
    }
    animate(x, 0, { type: 'spring', stiffness: 500, damping: 35 });
  };

  const cardStyle = {
    background: isPending ? '#F8FAFC' : isSelected ? `${color}0D` : 'white',
    border:     `1.5px solid ${isPending ? '#E2E8F0' : isSelected ? color + '60' : '#F1F5F9'}`,
    boxShadow:  isSelected ? `0 0 0 3px ${color}22, 0 4px 16px ${color}18` : '0 1px 4px rgba(0,0,0,0.05)',
    opacity:    isPending ? 0.6 : 1,
    x,
  };

  return (
    <div className="relative overflow-hidden rounded-2xl">
      {/* 스와이프 시 노출되는 삭제 배경 */}
      {swipeable && (
        <motion.div
          style={{ opacity: deleteOpacity }}
          className="absolute inset-0 bg-red-500 flex items-center justify-end rounded-2xl pr-4 pointer-events-none"
        >
          <Trash2 size={18} className="text-white" />
        </motion.div>
      )}

      <motion.div
        onClick={isPending ? undefined : onSelect}
        style={cardStyle}
        drag={swipeable ? 'x' : false}
        dragConstraints={{ left: -80, right: 0 }}
        dragElastic={{ left: 0.08, right: 0 }}
        dragMomentum={false}
        onDragEnd={handleDragEnd}
        className={cn(
          'relative rounded-2xl transition-[border,box-shadow] duration-200 animate-card-in',
          isPending ? 'cursor-default' : 'cursor-pointer',
          'p-2.5 md:p-[13px]',
        )}
      >
        <div className="flex items-start gap-2 md:gap-2.5">

          {/* 번호 뱃지 */}
          <div
            style={{
              background: isSelected ? `linear-gradient(135deg, ${color}, ${color}CC)` : `${color}18`,
              border:     `2px solid ${color}`,
              color:      isSelected ? 'white' : color,
            }}
            className="min-w-[28px] h-7 md:min-w-8 md:h-8 rounded-full flex items-center justify-center text-[11px] md:text-[13px] font-extrabold shrink-0 transition-all duration-200"
          >
            {index + 1}
          </div>

          {/* 내용 */}
          <div className="flex-1 min-w-0">
            <div className="text-[13px] md:text-sm font-bold text-slate-900 line-clamp-1 mb-0.5 md:mb-1">
              {marker.name}
            </div>
            <div className="flex items-center gap-1.5 flex-wrap mb-0.5 md:mb-1.5">
              <div
                style={{ background: cat.bg, color: cat.color }}
                className="inline-flex text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
              >
                {cat.label}
              </div>
              {stayText && (
                <span className="text-[10px] text-slate-400">· 약 {stayText}</span>
              )}
            </div>
            <div className="text-[10px] md:text-[11px] text-slate-400 line-clamp-1 md:line-clamp-2 break-all">
              {marker.address ?? '주소 없음'}
            </div>
            {marker.visit_time && (
              <div className="hidden md:block text-[11px] text-slate-500 mt-1">
                ⏱ {marker.visit_time} 방문
              </div>
            )}
          </div>

          {/* 삭제 버튼 (여행장에게만) */}
          {!isLocked && !isPending && isOwner && (
            <button
              onClick={e => { e.stopPropagation(); onRemove(); }}
              className="w-6 h-6 flex items-center justify-center rounded-lg text-slate-300 shrink-0 transition-all duration-150 hover:bg-red-50 hover:text-red-500"
            >
              <Trash2 size={13} />
            </button>
          )}
          {isPending && (
            <div className="w-6 h-6 flex items-center justify-center shrink-0">
              <svg className="animate-spin w-3.5 h-3.5 text-slate-400" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
              </svg>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
