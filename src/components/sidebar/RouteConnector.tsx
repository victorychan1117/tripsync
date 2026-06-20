'use client';
import { Car } from 'lucide-react';
import { trackAffiliateClick } from '@/lib/affiliate/affiliateRules';
import type { RouteSegment } from '@/lib/supabase/types';
import type { AffiliateInsertion } from '@/lib/affiliate/affiliateRules';

interface Props {
  segment:   RouteSegment;
  index:     number;
  affiliate: AffiliateInsertion | null;
}

export default function RouteConnector({ segment, index, affiliate }: Props) {
  if (segment.durationSec === 0 && segment.distanceM === 0) return null;
  const handleAffiliateClick = () => {
    if (affiliate) {
      trackAffiliateClick(affiliate.partner, '', '', undefined);
    }
  };

  return (
    <div className="flex flex-col items-center py-0.5">
      {/* 점선 위 */}
      <div className="flex flex-col items-center gap-0.5 my-0.5">
        {[0,1,2].map(i => <div key={i} className="w-0.5 h-1 bg-slate-200 rounded" />)}
      </div>

      {/* 구간 정보 박스 */}
      <div className="w-full bg-slate-50 border border-slate-100 rounded-xl px-3 py-[7px] flex items-center gap-2 my-0.5">
        <Car size={13} className="text-slate-400 shrink-0" />
        <span className="text-xs font-semibold text-slate-600">
          차로 {segment.durationText}
        </span>
        <span className="text-[11px] text-slate-400">
          · {segment.distanceText}
        </span>

        {/* 제휴 배너 (짝수 구간) */}
        {affiliate && (
          <a
            href={affiliate.url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={handleAffiliateClick}
            style={{ background: affiliate.bgGradient }}
            className="ml-auto flex items-center gap-1 px-2.5 py-1 rounded-lg text-white text-[10px] font-bold shrink-0 transition-all duration-150 hover:opacity-85 hover:scale-[1.03]"
          >
            {affiliate.emoji} {affiliate.label}
          </a>
        )}
      </div>

      {/* 점선 아래 */}
      <div className="flex flex-col items-center gap-0.5 my-0.5">
        {[0,1,2].map(i => <div key={i} className="w-0.5 h-1 bg-slate-200 rounded" />)}
      </div>
    </div>
  );
}
