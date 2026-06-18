'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Navigation, Loader2, Search } from 'lucide-react';
import { cn } from '@/lib/utils';

const DOMESTIC = [
  '제주도','서울','부산','경주','전주','강릉','여수','속초','제천','인천',
  '대구','광주','대전','춘천','통영','거제','남해','포항','울산','수원',
];

const INTERNATIONAL: { flag: string; region: string; places: string[]; code: string }[] = [
  { flag: '🇯🇵', region: '일본',     code: 'JP', places: ['도쿄','오사카','교토','후쿠오카','삿포로','나고야','나라','오키나와'] },
  { flag: '🇹🇭', region: '태국',     code: 'TH', places: ['방콕','치앙마이','푸켓','파타야','크라비'] },
  { flag: '🇻🇳', region: '베트남',   code: 'VN', places: ['하노이','호치민','다낭','나트랑','호이안','푸꾸옥','달랏'] },
  { flag: '🇮🇩', region: '인도네시아', code: 'ID', places: ['발리','자카르타','롬복'] },
  { flag: '🇸🇬', region: '싱가포르', code: 'SG', places: ['싱가포르'] },
  { flag: '🇲🇾', region: '말레이시아', code: 'MY', places: ['쿠알라룸푸르','페낭','코타키나발루','랑카위'] },
  { flag: '🇵🇭', region: '필리핀',   code: 'PH', places: ['마닐라','세부','보라카이','팔라완'] },
  { flag: '🇹🇼', region: '대만',     code: 'TW', places: ['타이페이','타이중','가오슝','화롄'] },
  { flag: '🇭🇰', region: '홍콩',     code: 'HK', places: ['홍콩'] },
  { flag: '🇨🇳', region: '중국',     code: 'CN', places: ['상하이','베이징','청두','시안','하이난'] },
  { flag: '🇫🇷', region: '프랑스',   code: 'FR', places: ['파리','니스','리옹'] },
  { flag: '🇮🇹', region: '이탈리아', code: 'IT', places: ['로마','밀라노','피렌체','베네치아','나폴리'] },
  { flag: '🇪🇸', region: '스페인',   code: 'ES', places: ['바르셀로나','마드리드','세비야','그라나다'] },
  { flag: '🇬🇧', region: '영국',     code: 'GB', places: ['런던','에든버러'] },
  { flag: '🇩🇪', region: '독일',     code: 'DE', places: ['베를린','뮌헨','프랑크푸르트'] },
  { flag: '🇺🇸', region: '미국',     code: 'US', places: ['뉴욕','로스앤젤레스','라스베가스','하와이','샌프란시스코','시카고'] },
  { flag: '🇦🇺', region: '호주',     code: 'AU', places: ['시드니','멜버른','골드코스트','케언즈'] },
  { flag: '🇳🇿', region: '뉴질랜드', code: 'NZ', places: ['오클랜드','퀸즈타운','크라이스트처치'] },
  { flag: '🇹🇷', region: '터키',     code: 'TR', places: ['이스탄불','카파도키아','안탈리아'] },
  { flag: '🇬🇷', region: '그리스',   code: 'GR', places: ['아테네','산토리니','미코노스'] },
  { flag: '🇨🇭', region: '스위스',   code: 'CH', places: ['취리히','제네바','인터라켄'] },
  { flag: '🇦🇹', region: '오스트리아', code: 'AT', places: ['빈','잘츠부르크'] },
  { flag: '🇳🇱', region: '네덜란드', code: 'NL', places: ['암스테르담'] },
  { flag: '🇵🇹', region: '포르투갈', code: 'PT', places: ['리스본','포르투'] },
  { flag: '🇲🇦', region: '모로코',   code: 'MA', places: ['마라케시','페스','카사블랑카'] },
  { flag: '🇲🇻', region: '몰디브',   code: 'MV', places: ['몰디브'] },
  { flag: '🇮🇳', region: '인도',     code: 'IN', places: ['뭄바이','뉴델리','고아','자이푸르'] },
  { flag: '🇳🇵', region: '네팔',     code: 'NP', places: ['카트만두','포카라'] },
  { flag: '🇧🇷', region: '브라질',   code: 'BR', places: ['리우데자네이루','상파울루'] },
  { flag: '🇦🇷', region: '아르헨티나', code: 'AR', places: ['부에노스아이레스'] },
  { flag: '🇲🇽', region: '멕시코',   code: 'MX', places: ['멕시코시티','칸쿤'] },
  { flag: '🇨🇦', region: '캐나다',   code: 'CA', places: ['밴쿠버','토론토','퀘벡'] },
];

export default function NewRoomPage() {
  const router        = useRouter();
  const [tab,          setTab]          = useState<'KR' | 'INTL'>('KR');
  const [searchQuery,  setSearchQuery]  = useState('');
  const [destination,  setDestination]  = useState('');
  const [countryCode,  setCountryCode]  = useState('KR');
  const [nights,       setNights]       = useState(2);
  const [startDate,    setStartDate]    = useState('');
  const [loading,      setLoading]      = useState(false);
  const [error,        setError]        = useState('');

  const handleSelect = (name: string, code: string) => {
    setDestination(name);
    setCountryCode(code);
    setSearchQuery('');
  };

  const filteredDomestic = DOMESTIC.filter(name =>
    name.includes(searchQuery)
  );

  const filteredInternational = INTERNATIONAL.map(region => ({
    ...region,
    places: region.places.filter(name => name.includes(searchQuery)),
  })).filter(region => region.places.length > 0 || region.region.includes(searchQuery));

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
          title:       `${destination} ${nights}박 ${nights + 1}일`,
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
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-violet-50 flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-lg bg-white rounded-[28px] shadow-[0_24px_64px_rgba(0,0,0,0.12)] overflow-hidden">

        {/* 헤더 */}
        <div className="bg-gradient-to-br from-brand-500 to-violet-500 px-8 pt-7 pb-7">
          <div className="flex items-center gap-2.5 mb-3">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
              <Navigation size={20} className="text-white" />
            </div>
            <span className="text-xl font-extrabold text-white">새 여행 만들기</span>
          </div>
          <p className="text-white/75 text-sm">목적지를 선택하고 팀원들과 일정을 짜보세요</p>
        </div>

        <form onSubmit={handleSubmit} className="px-8 py-7 flex flex-col gap-5">

          {/* 여행지 탭 */}
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-2">
              여행지 <span className="text-red-500">*</span>
            </label>

            {/* 국내/해외 탭 */}
            <div className="flex gap-2 mb-3">
              {[
                { key: 'KR',   label: '🇰🇷 국내' },
                { key: 'INTL', label: '🌏 해외' },
              ].map(t => (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => setTab(t.key as 'KR' | 'INTL')}
                  className={cn(
                    'flex-1 py-2 rounded-xl text-sm font-semibold transition-all',
                    tab === t.key
                      ? 'bg-brand-50 border-2 border-brand-300 text-brand-700'
                      : 'bg-slate-50 border-2 border-slate-200 text-slate-500',
                  )}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {/* 검색창 */}
            <div className="relative mb-2">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder={tab === 'KR' ? '국내 여행지 검색 (예: 제주)' : '해외 여행지 검색 (예: 나트랑)'}
                className="w-full pl-9 pr-4 py-2.5 rounded-xl border-2 border-slate-200 focus:border-brand-400 text-sm outline-none transition-colors"
              />
            </div>

            {/* 국내 목록 */}
            {tab === 'KR' && (
              <div className="h-40 overflow-y-auto rounded-2xl border border-slate-200 p-3">
                {filteredDomestic.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {filteredDomestic.map(name => (
                      <button
                        key={name}
                        type="button"
                        onClick={() => handleSelect(name, 'KR')}
                        className={cn(
                          'px-3 py-1.5 rounded-xl text-xs font-semibold transition-all',
                          destination === name
                            ? 'bg-brand-500 text-white'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200',
                        )}
                      >
                        🇰🇷 {name}
                      </button>
                    ))}
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleSelect(searchQuery, 'KR')}
                    className="w-full px-3 py-2 rounded-xl text-xs font-semibold bg-brand-50 text-brand-600 hover:bg-brand-100 transition-all"
                  >
                    🇰🇷 &quot;{searchQuery}&quot; 으로 만들기
                  </button>
                )}
              </div>
            )}

            {/* 해외 목록 */}
            {tab === 'INTL' && (
              <div className="h-40 overflow-y-auto rounded-2xl border border-slate-200 p-3 flex flex-col gap-3">
                {filteredInternational.length > 0 ? filteredInternational.map(region => (
                  <div key={region.region}>
                    <p className="text-xs font-bold text-slate-400 mb-1.5">
                      {region.flag} {region.region}
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {region.places.map(name => (
                        <button
                          key={name}
                          type="button"
                          onClick={() => handleSelect(name, region.code)}
                          className={cn(
                            'px-3 py-1.5 rounded-xl text-xs font-semibold transition-all',
                            destination === name
                              ? 'bg-brand-500 text-white'
                              : 'bg-slate-100 text-slate-600 hover:bg-slate-200',
                          )}
                        >
                          {name}
                        </button>
                      ))}
                    </div>
                  </div>
                )) : (
                  <button
                    type="button"
                    onClick={() => handleSelect(searchQuery, 'INTL')}
                    className="w-full px-3 py-2 rounded-xl text-xs font-semibold bg-brand-50 text-brand-600 hover:bg-brand-100 transition-all"
                  >
                    🌏 &quot;{searchQuery}&quot; 으로 만들기
                  </button>
                )}
              </div>
            )}

            {destination && (
              <p className="text-xs text-slate-400 mt-1.5 pl-1">
                선택됨: <span className="font-semibold text-brand-600">{destination}</span>
                {countryCode !== 'KR' ? ' · 🌏 구글 지도' : ' · 🇰🇷 카카오 지도'}
              </p>
            )}
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
