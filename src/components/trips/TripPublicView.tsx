'use client';
import Link from 'next/link';
import { Navigation, Users, Clock, MapPin, Copy, Check } from 'lucide-react';
import { useState } from 'react';
import { getAffiliateInsertions } from '@/lib/affiliate/affiliateRules';
import type { TripRoom, Marker } from '@/lib/supabase/types';

const PIN_COLORS = ['#6366F1','#8B5CF6','#EC4899','#F97316','#EAB308','#10B981','#0EA5E9'];

const CATEGORY_LABEL: Record<string, string> = {
  attraction: '관광지', beach: '해수욕장', restaurant: '맛집', cafe: '카페',
  nature: '자연', culture: '문화', lodging: '숙소', shopping: '쇼핑',
  activity: '액티비티', transport: '교통', etc: '기타',
};

interface Props {
  room:       TripRoom;
  markers:    Marker[];
  authorName: string;
}

// Day별 마커 그룹핑
function groupByDay(markers: Marker[]): Map<number, Marker[]> {
  const map = new Map<number, Marker[]>();
  markers.forEach(m => {
    const arr = map.get(m.day_number) ?? [];
    arr.push(m);
    map.set(m.day_number, arr);
  });
  return map;
}

export default function TripPublicView({ room, markers, authorName }: Props) {
  const [copied, setCopied] = useState(false);

  const days        = groupByDay(markers);
  const dayKeys     = [...days.keys()].sort((a, b) => a - b);
  const totalPlaces = markers.length;

  const affiliates = getAffiliateInsertions({ room, markers });
  const headerAffiliate = affiliates.find(a => a.insertionPoint === 'TRIP_HEADER_BANNER');
  const hotelAffiliate  = affiliates.find(a => a.insertionPoint === 'DAY_DIVIDER_BANNER' && a.partner === 'AGODA');

  const handleCopy = async () => {
    await navigator.clipboard.writeText(typeof window !== 'undefined' ? window.location.href : '');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">

      {/* ── 헤더 ── */}
      <header className="bg-white border-b border-slate-100 sticky top-0 z-10 backdrop-blur-sm bg-white/80">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-brand-500 font-extrabold">
            <Navigation size={18} />
            <span>TripSync</span>
          </Link>
          <div className="flex items-center gap-3">
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:border-brand-300 hover:text-brand-600 transition-colors"
            >
              {copied ? <><Check size={13} />복사됨!</> : <><Copy size={13} />링크 복사</>}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8">

        {/* ── 여행 타이틀 카드 ── */}
        <div className="bg-gradient-to-br from-brand-500 to-violet-500 rounded-3xl px-8 py-8 mb-8 text-white">
          <div className="flex flex-wrap gap-3 mb-4">
            <span className="bg-white/20 px-3 py-1 rounded-full text-xs font-semibold">
              📍 {room.destination}
            </span>
            {room.nights > 0 && (
              <span className="bg-white/20 px-3 py-1 rounded-full text-xs font-semibold">
                🌙 {room.nights}박 {room.nights + 1}일
              </span>
            )}
            <span className="bg-white/20 px-3 py-1 rounded-full text-xs font-semibold">
              📌 {totalPlaces}개 장소
            </span>
          </div>

          <h1 className="text-2xl font-extrabold mb-2 leading-tight">
            {room.seo_title ?? room.title}
          </h1>

          {room.seo_description && (
            <p className="text-white/80 text-sm leading-relaxed mb-4">
              {room.seo_description}
            </p>
          )}

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-white/70 text-sm">
              <Users size={14} />
              <span>작성자: {authorName}</span>
            </div>
            {room.view_count > 0 && (
              <span className="text-white/60 text-xs">조회 {room.view_count.toLocaleString()}</span>
            )}
          </div>
        </div>

        {/* ── 항공 제휴 배너 ── */}
        {headerAffiliate && (
          <a
            href={headerAffiliate.url}
            target="_blank"
            rel="noopener noreferrer"
            style={{ background: headerAffiliate.bgGradient }}
            className="flex items-center justify-between px-6 py-4 rounded-2xl text-white mb-6 no-underline hover:opacity-90 transition-opacity"
          >
            <div>
              <div className="text-xs opacity-80 mb-0.5">{headerAffiliate.sublabel}</div>
              <div className="font-bold">{headerAffiliate.emoji} {headerAffiliate.label}</div>
            </div>
            <span className="text-xl">→</span>
          </a>
        )}

        {/* ── Day별 일정 ── */}
        {dayKeys.map((dayNum) => {
          const dayMarkers = days.get(dayNum) ?? [];
          return (
            <section key={dayNum} className="mb-10">
              {/* Day 헤더 */}
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-500 to-violet-500 flex items-center justify-center text-white font-black text-sm">
                  D{dayNum}
                </div>
                <div>
                  <h2 className="text-base font-extrabold text-slate-900">
                    Day {dayNum}
                  </h2>
                  <p className="text-xs text-slate-400">{dayMarkers.length}개 장소</p>
                </div>

                {/* 숙소 제휴 */}
                {hotelAffiliate && dayNum < dayKeys.length && (
                  <a
                    href={hotelAffiliate.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ background: hotelAffiliate.bgGradient }}
                    className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-white text-xs font-bold no-underline hover:opacity-85 transition-opacity"
                  >
                    {hotelAffiliate.emoji} 오늘 숙소 예약
                  </a>
                )}
              </div>

              {/* 장소 리스트 */}
              <div className="flex flex-col gap-3">
                {dayMarkers.map((marker, i) => {
                  const color = PIN_COLORS[i % PIN_COLORS.length];
                  return (
                    <div
                      key={marker.id}
                      className="bg-white rounded-2xl border border-slate-100 p-4 shadow-card hover:shadow-card-hover transition-shadow"
                    >
                      <div className="flex items-start gap-3">
                        {/* 번호 */}
                        <div
                          style={{ background: `${color}18`, border: `2px solid ${color}`, color }}
                          className="min-w-8 h-8 rounded-full flex items-center justify-center text-sm font-extrabold shrink-0"
                        >
                          {i + 1}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="font-bold text-slate-900 mb-1">{marker.name}</div>

                          <div
                            style={{
                              background: `${color}15`,
                              color,
                            }}
                            className="inline-flex text-[10px] font-semibold px-2 py-0.5 rounded-full mb-2"
                          >
                            {CATEGORY_LABEL[marker.category] ?? '기타'}
                          </div>

                          {marker.address && (
                            <div className="flex items-start gap-1 text-xs text-slate-400 mb-1">
                              <MapPin size={11} className="mt-0.5 shrink-0" />
                              <span>{marker.address}</span>
                            </div>
                          )}

                          <div className="flex items-center gap-1 text-xs text-slate-500">
                            <Clock size={11} />
                            <span>약 {marker.stay_minutes}분 체류</span>
                            {marker.visit_time && <span>· {marker.visit_time} 방문</span>}
                          </div>

                          {marker.memo && (
                            <p className="mt-2 text-xs text-slate-500 leading-relaxed bg-slate-50 rounded-xl p-2.5">
                              {marker.memo}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          );
        })}

        {/* ── 일정 복사 CTA ── */}
        <div className="text-center py-8 border-t border-slate-100">
          <p className="text-slate-500 text-sm mb-4">
            이 여행 일정이 마음에 드셨나요?<br/>
            직접 편집하거나 팀원과 함께 계획을 세워보세요!
          </p>
          <Link
            href="/room/new"
            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-br from-brand-500 to-violet-500 text-white font-bold rounded-2xl shadow-brand-sm hover:-translate-y-0.5 hover:shadow-brand-md transition-all duration-200"
          >
            <Navigation size={16} />
            내 여행 만들기
          </Link>
        </div>
      </main>
    </div>
  );
}
