'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Navigation, MapPin, Calendar, Users,
  Lock, Plus, Search, ChevronRight,
} from 'lucide-react';

const FLAG: Record<string, string> = {
  KR:'🇰🇷', JP:'🇯🇵', TH:'🇹🇭', VN:'🇻🇳', ID:'🇮🇩', SG:'🇸🇬',
  MY:'🇲🇾', PH:'🇵🇭', TW:'🇹🇼', HK:'🇭🇰', CN:'🇨🇳', FR:'🇫🇷',
  IT:'🇮🇹', ES:'🇪🇸', GB:'🇬🇧', DE:'🇩🇪', US:'🇺🇸', AU:'🇦🇺',
  NZ:'🇳🇿', TR:'🇹🇷', GR:'🇬🇷', CH:'🇨🇭', AT:'🇦🇹', NL:'🇳🇱',
  PT:'🇵🇹', MA:'🇲🇦', MV:'🇲🇻', IN:'🇮🇳', NP:'🇳🇵', BR:'🇧🇷',
  AR:'🇦🇷', MX:'🇲🇽', CA:'🇨🇦',
};

const ROLE_LABEL: Record<string, string> = {
  owner:  '방장',
  editor: '편집자',
  viewer: '뷰어',
};

const ROLE_COLOR: Record<string, string> = {
  owner:  '#6366F1',
  editor: '#10B981',
  viewer: '#94a3b8',
};

interface Trip {
  id:           string;
  title:        string;
  destination:  string | null;
  country_code: string;
  start_date:   string | null;
  end_date:     string | null;
  is_locked:    boolean;
  marker_count: number;
  member_count: number;
  created_at:   string;
  role:         string;
  joined_at:    string;
}

function TripCard({ trip }: { trip: Trip }) {
  const router  = useRouter();
  const flag    = FLAG[trip.country_code] ?? '🌐';
  const role    = ROLE_LABEL[trip.role] ?? trip.role;
  const roleClr = ROLE_COLOR[trip.role] ?? '#94a3b8';

  const dateStr = trip.start_date
    ? (() => {
        const s = new Date(trip.start_date);
        const e = trip.end_date ? new Date(trip.end_date) : null;
        const fmt = (d: Date) => `${d.getMonth()+1}/${d.getDate()}`;
        return e ? `${fmt(s)} ~ ${fmt(e)}` : fmt(s);
      })()
    : '날짜 미정';

  return (
    <div
      onClick={() => router.push(`/my/trips/${trip.id}`)}
      style={{
        background:   '#ffffff',
        borderRadius: 20,
        padding:      '20px 22px',
        boxShadow:    '0 2px 16px rgba(0,0,0,0.06)',
        border:       '1.5px solid #f1f5f9',
        cursor:       'pointer',
        transition:   'transform 0.18s, box-shadow 0.18s',
        display:      'flex',
        alignItems:   'center',
        gap:          16,
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)';
        (e.currentTarget as HTMLElement).style.boxShadow = '0 8px 32px rgba(0,0,0,0.10)';
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
        (e.currentTarget as HTMLElement).style.boxShadow = '0 2px 16px rgba(0,0,0,0.06)';
      }}
    >
      {/* 이모지 아이콘 */}
      <div style={{
        width: 52, height: 52, borderRadius: 16,
        background: 'linear-gradient(135deg, #f0f0ff, #fdf4ff)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 26, flexShrink: 0,
      }}>
        {flag}
      </div>

      {/* 내용 */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <span style={{ fontSize: 15, fontWeight: 800, color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {trip.title}
          </span>
          {trip.is_locked && <Lock size={12} color="#94a3b8" />}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: '#64748b' }}>
            <MapPin size={11} />
            {trip.destination ?? '목적지 미정'}
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: '#64748b' }}>
            <Calendar size={11} />
            {dateStr}
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: '#64748b' }}>
            <Users size={11} />
            {trip.member_count}명
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: '#64748b' }}>
            <Navigation size={11} />
            {trip.marker_count}개 장소
          </span>
        </div>
      </div>

      {/* 역할 배지 + 화살표 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
        <span style={{
          fontSize: 11, fontWeight: 700, color: roleClr,
          background: `${roleClr}15`, padding: '3px 9px', borderRadius: 999,
        }}>
          {role}
        </span>
        <ChevronRight size={16} color="#cbd5e1" />
      </div>
    </div>
  );
}

export default function TripsClient({ trips, nickname }: { trips: Trip[]; nickname: string }) {
  const [query, setQuery] = useState('');

  const filtered = trips.filter(t =>
    t.title.includes(query) || (t.destination ?? '').includes(query)
  );

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', padding: '0 5vw 60px' }}>
      {/* 헤더 */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        paddingTop: 48, paddingBottom: 32,
      }}>
        <div>
          <p style={{ fontSize: 13, color: '#6366F1', fontWeight: 700, marginBottom: 6 }}>
            안녕하세요, {nickname}님 👋
          </p>
          <h1 style={{ fontSize: 28, fontWeight: 900, color: '#0f172a', letterSpacing: '-0.03em' }}>
            내 여행 일지
          </h1>
          <p style={{ fontSize: 14, color: '#94a3b8', marginTop: 4 }}>
            총 {trips.length}개의 여행
          </p>
        </div>
        <Link
          href="/room/new"
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            padding: '12px 20px', borderRadius: 14,
            background: 'linear-gradient(135deg, #6366F1, #8B5CF6)',
            color: '#fff', fontWeight: 700, fontSize: 14,
            textDecoration: 'none',
            boxShadow: '0 4px 16px rgba(99,102,241,0.35)',
          }}
        >
          <Plus size={16} />
          새 여행
        </Link>
      </div>

      {/* 검색 */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        background: '#fff', border: '1.5px solid #e2e8f0',
        borderRadius: 14, padding: '10px 16px', marginBottom: 20,
        maxWidth: 480,
      }}>
        <Search size={15} color="#94a3b8" />
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="여행 이름 또는 목적지 검색..."
          style={{ flex: 1, border: 'none', outline: 'none', fontSize: 14, color: '#374151', background: 'transparent' }}
        />
      </div>

      {/* 여행 목록 */}
      {filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '80px 0', color: '#94a3b8' }}>
          <Navigation size={48} style={{ opacity: 0.2, margin: '0 auto 16px' }} />
          <p style={{ fontSize: 15, fontWeight: 600, marginBottom: 8 }}>
            {query ? '검색 결과가 없어요' : '아직 여행이 없어요'}
          </p>
          {!query && (
            <Link
              href="/room/new"
              style={{ fontSize: 14, color: '#6366F1', fontWeight: 700, textDecoration: 'none' }}
            >
              첫 여행 만들기 →
            </Link>
          )}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 720 }}>
          {filtered.map(trip => (
            <TripCard key={trip.id} trip={trip} />
          ))}
        </div>
      )}
    </div>
  );
}
