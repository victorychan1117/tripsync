import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createServiceClient } from '@/lib/supabase/server';
import { generateExploreMeta } from '@/lib/seo/generateTripMeta';
import { APP_NAME } from '@/lib/config/site';
import { Navigation, MapPin, Star, Users } from 'lucide-react';

interface Props {
  params: Promise<{ destination: string }>;
}

// 프로그래매틱 SEO: 목적지별 공개 일정 허브 페이지
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { destination } = await params;
  const decodedDest     = decodeURIComponent(destination.replace(/-/g, ' '));
  return generateExploreMeta(decodedDest);
}

export const revalidate = 3600;

export default async function ExplorePage({ params }: Props) {
  const { destination } = await params;
  const decodedDest     = decodeURIComponent(destination.replace(/-/g, ' '));
  const supabase        = createServiceClient();

  // 해당 목적지의 공개 일정 조회
  const { data: rooms } = await supabase
    .from('trip_rooms')
    .select('id, title, destination, nights, marker_count, view_count, fork_count, seo_title, created_at, users!owner_id(nickname)')
    .eq('is_public', true)
    .ilike('destination', `%${decodedDest}%`)
    .order('view_count', { ascending: false })
    .limit(24);

  if (!rooms || rooms.length === 0) {
    // 일정이 없어도 SEO 허브 페이지는 표시 (TBD 메시지)
  }

  // 목적지 정보
  const { data: destInfo } = await supabase
    .from('destinations')
    .select('*')
    .ilike('name_ko', `%${decodedDest}%`)
    .maybeSingle();

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">

      {/* 헤더 */}
      <header className="bg-white border-b border-slate-100">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center gap-3">
          <Link href="/" className="flex items-center gap-2 text-brand-500 font-extrabold">
            <Navigation size={18} />
            {APP_NAME}
          </Link>
          <span className="text-slate-200">/</span>
          <span className="text-slate-600 text-sm">여행 일정 탐색</span>
          <span className="text-slate-200">/</span>
          <span className="text-slate-900 font-semibold text-sm">{decodedDest}</span>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-10">

        {/* 히어로 */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 bg-brand-50 border border-brand-100 text-brand-600 text-xs font-semibold rounded-full px-4 py-1.5 mb-4">
            <MapPin size={13} />
            {decodedDest} 여행 일정
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900 mb-3">
            {decodedDest} 여행 일정 모음
          </h1>
          <p className="text-slate-500 text-base max-w-xl mx-auto">
            다른 여행자들이 공유한 {decodedDest} 일정을 참고하거나,
            직접 나만의 일정을 만들어보세요.
          </p>
        </div>

        {/* 일정 그리드 */}
        {rooms && rooms.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 mb-12">
            {rooms.map((room: any, i: number) => (
              <Link
                key={room.id}
                href={`/t/${room.id}`}
                className="group bg-white rounded-2xl border border-slate-100 p-5 shadow-card hover:shadow-card-hover hover:-translate-y-0.5 transition-all duration-200 no-underline"
              >
                {/* 색상 바 */}
                <div
                  className="h-1.5 rounded-full mb-4"
                  style={{
                    background: `linear-gradient(90deg, ${['#6366F1','#EC4899','#F97316','#10B981'][i % 4]}, ${['#8B5CF6','#F97316','#EAB308','#0EA5E9'][i % 4]})`,
                  }}
                />

                <div className="text-xs text-slate-400 mb-1.5 flex items-center gap-2">
                  <span>📍 {room.destination}</span>
                  {room.nights > 0 && <span>🌙 {room.nights}박</span>}
                </div>

                <h3 className="font-bold text-slate-900 mb-2 text-sm leading-snug line-clamp-2">
                  {room.seo_title ?? room.title}
                </h3>

                <div className="flex items-center gap-3 text-xs text-slate-400 mt-3 pt-3 border-t border-slate-50">
                  <span className="flex items-center gap-1">
                    <MapPin size={11} /> {room.marker_count}곳
                  </span>
                  <span className="flex items-center gap-1">
                    <Users size={11} /> {(room as any).users?.nickname ?? '여행자'}
                  </span>
                  <span className="ml-auto flex items-center gap-1">
                    <Star size={11} /> {room.view_count}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-center py-16 text-slate-400">
            <Navigation size={40} className="mx-auto mb-4 opacity-30" />
            <p>아직 공유된 {decodedDest} 일정이 없어요.<br/>첫 번째 일정을 만들어보세요!</p>
          </div>
        )}

        {/* 일정 만들기 CTA */}
        <div className="text-center border-t border-slate-100 pt-10">
          <h2 className="text-xl font-extrabold text-slate-900 mb-3">
            {decodedDest} 여행을 계획 중이신가요?
          </h2>
          <p className="text-slate-500 text-sm mb-6">
            팀원들과 실시간으로 일정을 편집하고, 경로와 소요시간을 자동으로 계산해보세요.
          </p>
          <Link
            href="/room/new"
            className="inline-flex items-center gap-2 px-7 py-3.5 bg-gradient-to-br from-brand-500 to-violet-500 text-white font-bold rounded-2xl shadow-brand-sm hover:-translate-y-0.5 hover:shadow-brand-md transition-all duration-200"
          >
            <Navigation size={16} />
            {decodedDest} 여행 일정 만들기
          </Link>
        </div>
      </main>
    </div>
  );
}
