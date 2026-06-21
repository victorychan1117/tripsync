'use client';

import { getCountryGradient } from '@/lib/trip/coverImage';
import { cn } from '@/lib/utils';

interface TripCoverBannerProps {
  coverImageUrl?: string | null;
  countryCode: string;
  destination?: string | null;
  flag?: string;
  heightClass?: string;
  className?: string;
  /** detail 헤더용 어두운 오버레이 */
  overlay?: 'none' | 'dark' | 'card';
  showFlagFallback?: boolean;
  children?: React.ReactNode;
}

export default function TripCoverBanner({
  coverImageUrl,
  countryCode,
  destination,
  flag = '🌐',
  heightClass = 'h-[160px]',
  className,
  overlay = 'none',
  showFlagFallback = true,
  children,
}: TripCoverBannerProps) {
  const [g1, g2] = getCountryGradient(countryCode);
  const dest = destination ?? '여행지';
  const hasCover = !!coverImageUrl;

  return (
    <div
      className={cn('relative overflow-hidden flex items-center justify-center', heightClass, className)}
      style={hasCover ? undefined : { background: `linear-gradient(135deg, ${g1}, ${g2})` }}
    >
      {hasCover && (
        <>
          <img
            src={coverImageUrl}
            alt=""
            className="absolute inset-0 w-full h-full object-cover"
          />
          {overlay === 'dark' && (
            <div className="absolute inset-0 bg-gradient-to-b from-black/55 via-black/45 to-black/60" />
          )}
          {overlay === 'card' && (
            <div className="absolute inset-0 bg-black/25" />
          )}
        </>
      )}

      {showFlagFallback && !hasCover && (
        <div className="text-center select-none relative z-[1]">
          <div className="text-5xl mb-2 drop-shadow">{flag}</div>
          <div className="text-white/90 text-[13px] font-bold drop-shadow">{dest}</div>
        </div>
      )}

      {children && (
        <div className="absolute inset-0 z-[2]">{children}</div>
      )}
    </div>
  );
}
