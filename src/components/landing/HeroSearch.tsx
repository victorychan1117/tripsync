'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Navigation } from 'lucide-react';

export default function HeroSearch() {
  const [destination, setDestination] = useState('');
  const [focused, setFocused] = useState(false);
  const router = useRouter();

  const handleStart = () => {
    const q = destination.trim();
    router.push(q ? `/room/new?destination=${encodeURIComponent(q)}` : '/room/new');
  };

  return (
    <div className="w-full">
      {/* 검색창 */}
      <div
        className={[
          'search-box flex items-center bg-white rounded-[20px] border-2',
          'transition-all duration-300 overflow-hidden pl-4 pr-1.5 py-1.5 gap-3',
          focused
            ? 'border-violet-500 ring-4 ring-violet-500/20 shadow-lg'
            : 'border-slate-200 shadow-[0_4px_24px_rgba(0,0,0,0.08)]',
        ].join(' ')}
      >
        <Search
          size={20}
          color={focused ? '#8B5CF6' : '#94a3b8'}
          style={{ flexShrink: 0, transition: 'color 0.2s' }}
        />
        <input
          type="text"
          placeholder="어디로 떠나시나요? (예: 제주도, 오사카...)"
          value={destination}
          onChange={e => setDestination(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onKeyDown={e => e.key === 'Enter' && handleStart()}
          className="flex-1 border-none outline-none text-slate-900 bg-transparent min-w-0 py-2.5 text-sm md:text-base"
        />
        <button
          onClick={handleStart}
          className={[
            'search-btn inline-flex items-center gap-2 px-5 py-3',
            'bg-gradient-to-r from-violet-500 to-violet-600',
            'hover:from-violet-600 hover:to-violet-700',
            'text-white font-bold text-[15px] rounded-[14px]',
            'border-none cursor-pointer whitespace-nowrap flex-shrink-0',
            'shadow-md hover:shadow-lg hover:-translate-y-0.5',
            'transition-all duration-200',
          ].join(' ')}
        >
          <Navigation size={16} />
          <span className="search-btn-text">여행 시작하기</span>
        </button>
      </div>

      {/* 추천 검색어 */}
      <div className="flex gap-2 flex-wrap mt-3.5 justify-center md:justify-start">
        {['🗼 오사카', '🌊 제주도', '🏯 교토', '🗺️ 방콕', '🏔️ 삿포로'].map(tag => (
          <button
            key={tag}
            onClick={() => setDestination(tag.replace(/^.{2}/, '').trim())}
            className={[
              'px-3 py-1.5 rounded-full border border-slate-200 bg-white',
              'text-[13px] text-slate-500 font-medium cursor-pointer',
              'hover:border-violet-500 hover:text-violet-600 hover:bg-violet-50',
              'transition-all duration-150',
            ].join(' ')}
          >
            {tag}
          </button>
        ))}
      </div>

      <style>{`
        /* 480px 미만: 버튼 전체 폭으로 아래 분리 */
        @media (max-width: 480px) {
          .search-box {
            flex-wrap: wrap;
            padding: 12px 14px 14px !important;
            border-radius: 16px !important;
            gap: 10px !important;
          }
          .search-btn {
            width: 100% !important;
            justify-content: center !important;
            border-radius: 12px !important;
            padding: 13px 20px !important;
            flex-shrink: unset !important;
          }
        }
      `}</style>
    </div>
  );
}
