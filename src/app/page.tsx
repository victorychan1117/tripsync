import Link from 'next/link';

// 홈 랜딩 페이지 (정적 생성)
export default function HomePage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50 flex flex-col items-center justify-center px-4">
      <div className="max-w-2xl w-full text-center">
        <div className="inline-flex items-center gap-2 bg-white border border-indigo-100 rounded-full px-4 py-2 text-sm text-indigo-600 font-semibold mb-6 shadow-sm">
          <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          실시간 협업 여행 플래너
        </div>

        <h1 className="text-5xl font-extrabold text-slate-900 leading-tight mb-4">
          여행 일정,<br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 to-violet-500">
            함께 만들어요
          </span>
        </h1>

        <p className="text-lg text-slate-500 leading-relaxed mb-8">
          지도 위에 장소를 추가하고, 팀원과 실시간으로 일정을 편집하세요.
          소요 시간과 경로가 자동으로 계산됩니다.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/room/new"
            className="px-8 py-3.5 bg-gradient-to-br from-indigo-500 to-violet-500 text-white font-bold rounded-2xl shadow-[0_4px_18px_rgba(99,102,241,0.45)] hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(99,102,241,0.55)] transition-all duration-200 text-center"
          >
            팀 방 만들기
          </Link>
          <Link
            href="/explore/jeju"
            className="px-8 py-3.5 bg-white border-2 border-indigo-100 text-indigo-600 font-bold rounded-2xl hover:border-indigo-300 transition-all duration-200 text-center"
          >
            여행 일정 둘러보기
          </Link>
        </div>
      </div>
    </main>
  );
}
