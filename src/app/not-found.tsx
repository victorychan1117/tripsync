import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center bg-slate-50">
      <p className="text-7xl font-extrabold text-indigo-200 mb-4">404</p>
      <h2 className="text-2xl font-extrabold text-slate-900 mb-2">페이지를 찾을 수 없습니다</h2>
      <p className="text-slate-500 text-sm mb-8">요청하신 페이지가 존재하지 않거나 이동되었습니다.</p>
      <Link
        href="/"
        className="px-6 py-3 bg-indigo-500 text-white rounded-xl font-semibold text-sm hover:bg-indigo-600 transition-colors"
      >
        홈으로 돌아가기
      </Link>
    </div>
  );
}
