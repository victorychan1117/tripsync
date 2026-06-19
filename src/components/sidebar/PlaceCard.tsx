'use client';
import { Star, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
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
  onSelect:   () => void;
  onRemove:   () => void;
}

export default function PlaceCard({ marker, index, color, isSelected, isLocked, onSelect, onRemove }: Props) {
  const cat = CATEGORY_CONFIG[marker.category as keyof typeof CATEGORY_CONFIG] ?? CATEGORY_CONFIG.etc;

  return (
    <div
      onClick={onSelect}
      style={{
        background:  isSelected ? `${color}0D` : 'white',
        border:      `1.5px solid ${isSelected ? color + '60' : '#F1F5F9'}`,
        boxShadow:   isSelected ? `0 0 0 3px ${color}22, 0 4px 16px ${color}18` : '0 1px 4px rgba(0,0,0,0.05)',
      }}
      className="rounded-2xl p-[13px] cursor-pointer transition-all duration-200 animate-card-in"
    >
      <div className="flex items-start gap-2.5">

        {/* 번호 뱃지 */}
        <div
          style={{
            background: isSelected ? `linear-gradient(135deg, ${color}, ${color}CC)` : `${color}18`,
            border:     `2px solid ${color}`,
            color:      isSelected ? 'white' : color,
          }}
          className="min-w-8 h-8 rounded-full flex items-center justify-center text-[13px] font-extrabold shrink-0 transition-all duration-200"
        >
          {index + 1}
        </div>

        {/* 내용 */}
        <div className="flex-1 min-w-0">
          <div className="text-sm font-bold text-slate-900 line-clamp-2 mb-1">
            {marker.name}
          </div>
          <div
            style={{ background: cat.bg, color: cat.color }}
            className="inline-flex text-[10px] font-semibold px-2 py-0.5 rounded-full mb-1.5"
          >
            {cat.label}
          </div>
          <div className="text-[11px] text-slate-400 mb-1.5 line-clamp-2 break-all">
            {marker.address ?? '주소 없음'}
          </div>
          {/* 체류 시간 */}
          <div className="text-[11px] text-slate-500">
            ⏱ 약 {marker.stay_minutes}분 체류
            {marker.visit_time && ` · ${marker.visit_time} 방문`}
          </div>
        </div>

        {/* 삭제 버튼 */}
        {!isLocked && (
          <button
            onClick={e => { e.stopPropagation(); onRemove(); }}
            className="w-6 h-6 flex items-center justify-center rounded-lg text-slate-300 shrink-0 transition-all duration-150 hover:bg-red-50 hover:text-red-500"
          >
            <Trash2 size={13} />
          </button>
        )}
      </div>
    </div>
  );
}
