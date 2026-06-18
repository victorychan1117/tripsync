'use client';
import { X, ExternalLink, Star } from 'lucide-react';
import { trackAffiliateClick, getAffiliateInsertions } from '@/lib/affiliate/affiliateRules';
import type { Marker, TripRoom } from '@/lib/supabase/types';

const PIN_COLORS = ['#6366F1','#8B5CF6','#EC4899','#F97316','#EAB308','#10B981','#0EA5E9'];

interface Props {
  marker:  Marker;
  index:   number;
  room:    TripRoom;
  onClose: () => void;
}

export default function InfoWindow({ marker, index, room, onClose }: Props) {
  const color = PIN_COLORS[index % PIN_COLORS.length];

  const affiliates = getAffiliateInsertions({
    room,
    markers:  [marker],
    routeIndex: index,
  }).filter(a => a.insertionPoint === 'PLACE_CARD_CTA' || a.insertionPoint === 'DAY_DIVIDER_BANNER');

  // 항상 아고다 + 클룩 표시
  const buttons = [
    {
      label:      '아고다 최저가로 예약하기',
      sublabel:   '근처 숙소 예약',
      emoji:      '🏨',
      bg:         'linear-gradient(135deg, #E8532A, #FF7043)',
      shadow:     '0 4px 12px rgba(232,83,42,0.3)',
      partner:    'AGODA' as const,
      url:        `https://www.agoda.com/search?city=${encodeURIComponent(room.destination ?? '')}&affiliateId=${process.env.NEXT_PUBLIC_AGODA_AFFILIATE_ID ?? ''}`,
    },
    {
      label:      '클룩 할인 투어 예약하기',
      sublabel:   '액티비티 · 투어',
      emoji:      '🎫',
      bg:         'linear-gradient(135deg, #FF5722, #FF8A65)',
      shadow:     '0 4px 12px rgba(255,87,34,0.3)',
      partner:    'KLOOK' as const,
      url:        `https://www.klook.com/search/?query=${encodeURIComponent(marker.name)}`,
    },
  ];

  return (
    <div className="absolute top-5 right-5 w-[308px] bg-white rounded-[22px] shadow-[0_24px_64px_rgba(0,0,0,0.16),0_4px_16px_rgba(0,0,0,0.08)] overflow-hidden z-[200] animate-slide-in-right">

      {/* 컬러 헤더 */}
      <div style={{ background: `linear-gradient(145deg, ${color}, ${color}BB)` }}
           className="px-[18px] pt-[18px] pb-4 relative">

        <button
          onClick={onClose}
          className="absolute top-3.5 right-3.5 w-[30px] h-[30px] bg-white/20 rounded-full flex items-center justify-center text-white hover:bg-white/35 transition-colors"
        >
          <X size={14} />
        </button>

        {/* 번호 뱃지 */}
        <div className="w-[34px] h-[34px] bg-white/25 border-2 border-white/50 rounded-full flex items-center justify-center text-sm font-extrabold text-white mb-2.5">
          {index + 1}
        </div>

        <div className="text-[17px] font-extrabold text-white mb-1">
          {marker.name}
        </div>
        <div className="text-[11px] text-white/75 leading-snug">
          {marker.address ?? '주소 없음'}
        </div>
      </div>

      {/* 본문 */}
      <div className="px-[18px] pb-[18px] pt-4">

        {/* 체류 시간 & 메모 */}
        <div className="flex items-center gap-3 mb-3 text-xs text-slate-500">
          <span>⏱ {marker.stay_minutes}분 체류</span>
          {marker.visit_time && <span>🕐 {marker.visit_time}</span>}
        </div>

        {marker.memo && (
          <p className="text-[12.5px] text-slate-600 leading-relaxed mb-3 bg-slate-50 rounded-xl p-3">
            {marker.memo}
          </p>
        )}

        {/* 제휴 버튼 */}
        <div className="flex flex-col gap-2">
          {buttons.map(btn => (
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
                  <div className="text-[10px] opacity-85 mb-0.5">{btn.sublabel}</div>
                  <div className="text-[13px] font-bold">{btn.label}</div>
                </div>
              </div>
              <ExternalLink size={14} className="opacity-80 shrink-0" />
            </a>
          ))}

          {/* 부킹닷컴 (아웃라인 버튼) */}
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
      </div>
    </div>
  );
}
