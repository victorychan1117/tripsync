import Link from 'next/link';
import Navbar from '@/components/landing/Navbar';
import SiteFooter from '@/components/landing/SiteFooter';

interface LegalDocLayoutProps {
  title: string;
  children: React.ReactNode;
}

export default function LegalDocLayout({ title, children }: LegalDocLayoutProps) {
  return (
    <main className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar />
      <article className="flex-1 max-w-2xl mx-auto w-full px-4 sm:px-6 py-10 sm:py-14">
        <Link
          href="/"
          className="inline-block text-[13px] font-semibold text-violet-600 hover:text-violet-700 mb-6"
        >
          ← 홈으로
        </Link>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mb-2">
          {title}
        </h1>
        <p className="text-[13px] text-slate-400 mb-8">
          최종 업데이트: {new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
        <div className="prose prose-slate prose-sm max-w-none space-y-5 text-[14px] leading-relaxed text-slate-600">
          {children}
        </div>
      </article>
      <SiteFooter />
    </main>
  );
}
