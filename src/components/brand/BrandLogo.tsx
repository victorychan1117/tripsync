import { Navigation } from 'lucide-react';
import { APP_NAME } from '@/lib/config/site';

type BrandLogoSize = 'sm' | 'md';
type BrandLogoVariant = 'default' | 'on-gradient';

interface BrandLogoProps {
  size?: BrandLogoSize;
  variant?: BrandLogoVariant;
  className?: string;
}

const SIZE = {
  sm: { box: 'h-[34px] w-[34px] rounded-[11px]', icon: 17, text: 'text-[17px] sm:text-[18px]', gap: 'gap-2.5' },
  md: { box: 'h-10 w-10 rounded-xl', icon: 20, text: 'text-2xl', gap: 'gap-3' },
} as const;

function BrandWordmark({ size, variant }: { size: BrandLogoSize; variant: BrandLogoVariant }) {
  const prefix = APP_NAME.slice(0, -1);
  const suffix = APP_NAME.slice(-1);
  const textClass = `${SIZE[size].text} font-extrabold leading-none tracking-[-0.04em]`;

  if (variant === 'on-gradient') {
    return (
      <span className={textClass} aria-label={APP_NAME}>
        <span className="text-white">{prefix}</span>
        <span className="text-white/85">{suffix}</span>
      </span>
    );
  }

  return (
    <span className={textClass} aria-label={APP_NAME}>
      <span className="text-slate-900">{prefix}</span>
      <span className="bg-gradient-to-br from-brand-500 to-violet-500 bg-clip-text text-transparent">
        {suffix}
      </span>
    </span>
  );
}

export default function BrandLogo({ size = 'sm', variant = 'default', className = '' }: BrandLogoProps) {
  const cfg = SIZE[size];

  const iconBox =
    variant === 'on-gradient'
      ? 'bg-white/20 shadow-none'
      : 'bg-gradient-to-br from-brand-500 to-violet-500 shadow-[0_4px_14px_rgba(99,102,241,0.35)] group-hover:shadow-[0_6px_18px_rgba(99,102,241,0.45)]';

  return (
    <span
      className={`group inline-flex items-center ${cfg.gap} select-none transition-opacity duration-200 hover:opacity-90 ${className}`}
    >
      <span
        className={`relative flex shrink-0 items-center justify-center transition-transform duration-200 ease-out group-hover:-translate-y-px group-hover:-rotate-[6deg] ${cfg.box} ${iconBox}`}
      >
        <Navigation size={cfg.icon} className="text-white" strokeWidth={2.25} aria-hidden />
      </span>
      <BrandWordmark size={size} variant={variant} />
    </span>
  );
}
