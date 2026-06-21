import Link from 'next/link';
import { APP_NAME } from '@/lib/config/site';

const LINKS = [
  { href: '/privacy', label: '개인정보처리방침' },
  { href: '/terms',   label: '이용약관' },
  { href: '/contact', label: '문의하기' },
  { href: '/report',  label: '신고·삭제 요청' },
] as const;

export default function SiteFooter() {
  return (
    <footer className="border-t border-slate-100 bg-white">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
        <p className="text-[12px] text-slate-400 font-medium">
          © {new Date().getFullYear()} {APP_NAME}. All rights reserved.
        </p>
        <nav className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
          {LINKS.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className="text-[12px] font-semibold text-slate-500 hover:text-violet-600 transition-colors"
            >
              {label}
            </Link>
          ))}
        </nav>
      </div>
    </footer>
  );
}
