'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Navigation, Globe, MapPin, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

// 자주 찾는 여행지 목록
const POPULAR_DESTINATIONS = [
  { name: '제주도',   code: 'KR' },
  { name: '부산',     code: 'KR' },
  { name: '서울',     code: 'KR' },
  { name: '도쿄',     code: 'JP' },
  { name: '방콕',     code: 'TH' },
  { name: '오사카',   code: 'JP' },
  { name: '싱가포르', code: 'SG' },
  { name: '파리',     code: 'FR' },
];

export default function NewRoomPage() {
  const router       = useRouter();
  const [title,       setTitle]       = useState('');
  const [destination, setDestination] = useState('');
  const [countryCode, setCountryCode] = useState('KR');
  const [nights,      setNights]      = useState(2);
  const [startDate,   setStartDate]   = useState('');
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!destination.trim()) { setError('여행지를 입력해주세요'); return; }
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/rooms', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title:       title.trim() || `${destination} ${nights}박 ${nights + 1}일`,
          destination: destination.trim(),
          countryCode,
          startDate:   startDate || null,
          endDate:     startDate
            ? new Date(new Date(startDate).getTime() + nights * 86400000)
                .toISOString().split('T')[0]
            : null,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? '방 생성 실패');
      }

      const { room } = await res.json();
      router.push(`/room/${room.id}/edit`);
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-violet-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-white rounded-[28px] shadow-[0_24px_64px_rgba(0,0,0,0.12)] overflow-hidden">

        {/* 헤더 */}
        <div className="bg-gradient-to-br from-brand-500 to-violet-500 px-8 pt-7 pb-7">
          <div className="flex items-center gap-2.5 mb-3">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
              <Navigation size={20} className="text-white" />
            </div>
            <span className="text-xl font-extrabold text-white">새 여행 만들기</span>
          </div>
          <p className="text-white/75 text-sm">목적지를 입력하고 팀원들과 일정을 짜보세요</p>
        </div>

        <form onSubmit={handleSubmit} className="px-8 py-7 flex flex-col gap-5">

          {/* 여행지 */}
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1.5">
              여행지 <span className="text-red-500">*</span>
            </label>
            <div className="flex gap-2 mb-2">
              {POPULAR_DESTINATIONS.map(d => (
                <button
                  key={d.name}
                  type="button"
                  onClick={() => { setDestination(d.name); setCountryCode(d.code); }}
                  className={cn(
                    'px-3 py-1.5 rounded-xl text-xs font-semibold transition-all',
                    destination === d.name
                      ? 'bg-brand-500 text-white shadow-brand-sm'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200',
                  )}
                >
                  {d.name}
                </button>
              ))}
            </div>
            <input
              type="text"
              value={destination}
              onChange={e => setDestination(e.target.value)}
              placeholder="직접 입력 (예: 나트랑)"
              className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-brand-400 text-sm outline-none transition-colors"
            />
          </div>

          {/* 국내/해외 */}
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1.5">지역</label>
            <div className="flex gap-2">
              {[
                { code: 'KR', label: '🇰🇷 국내' },
                { code: 'INTL', label: '🌏 해외' },
              ].map(({ code, label }) => (
                <button
                  key={code}
                  type="button"
                  onClick={() => setCountryCode(code === 'INTL' ? 'JP' : 'KR')}
                  className={cn(
                    'flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all',
                    (countryCode === 'KR') === (code === 'KR')
                      ? 'bg-brand-50 border-2 border-brand-300 text-brand-700'
                      : 'bg-slate-50 border-2 border-slate-200 text-slate-600',
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* 기간 */}
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1.5">여행 기간</label>
            <div className="flex items-center gap-3">
              <input
                type="date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                className="flex-1 px-3 py-3 rounded-xl border-2 border-slate-200 focus:border-brand-400 text-sm outline-none transition-colors"
              />
              <div className="flex items-center gap-2 bg-slate-50 rounded-xl px-3 py-2 border border-slate-200">
                <button type="button" onClick={() => setNights(Math.max(1, nights - 1))} className="w-6 h-6 rounded-full bg-slate-200 text-slate-700 font-bold text-sm">−</button>
                <span className="text-sm font-semibold text-slate-800 w-14 text-center">{nights}박 {nights + 1}일</span>
                <button type="button" onClick={() => setNights(Math.min(14, nights + 1))} className="w-6 h-6 rounded-full bg-slate-200 text-slate-700 font-bold text-sm">+</button>
              </div>
            </div>
          </div>

          {/* 일정 제목 (선택) */}
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1.5">
              일정 제목 <span className="text-slate-400 font-normal">(선택)</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder={`${destination || '여행지'} ${nights}박 ${nights + 1}일`}
              className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-brand-400 text-sm outline-none transition-colors"
            />
          </div>

          {error && (
            <p className="text-xs text-red-500 bg-red-50 rounded-xl px-3 py-2">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 rounded-2xl bg-gradient-to-br from-brand-500 to-violet-500 text-white font-bold text-sm shadow-brand-sm hover:shadow-brand-md hover:-translate-y-0.5 transition-all duration-200 disabled:opacity-60 disabled:transform-none flex items-center justify-center gap-2"
          >
            {loading
              ? <><Loader2 size={18} className="animate-spin" />생성 중...</>
              : <><Navigation size={18} />여행 시작하기</>
            }
          </button>
        </form>
      </div>
    </div>
  );
}
