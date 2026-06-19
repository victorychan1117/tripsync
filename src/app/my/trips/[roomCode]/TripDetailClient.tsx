'use client';
import Link from 'next/link';
import { useState } from 'react';
import {
  Navigation, MapPin, Calendar, Users, ArrowLeft,
  Copy, Check, Clock, Lock, Map,
} from 'lucide-react';

const FLAG: Record<string, string> = {
  KR:'🇰🇷', JP:'🇯🇵', TH:'🇹🇭', VN:'🇻🇳', ID:'🇮🇩', SG:'🇸🇬',
  MY:'🇲🇾', PH:'🇵🇭', TW:'🇹🇼', HK:'🇭🇰', CN:'🇨🇳', FR:'🇫🇷',
  IT:'🇮🇹', ES:'🇪🇸', GB:'🇬🇧', DE:'🇩🇪', US:'🇺🇸', AU:'🇦🇺',
  NZ:'🇳🇿', TR:'🇹🇷', GR:'🇬🇷', CH:'🇨🇭', AT:'🇦🇹', NL:'🇳🇱',
  PT:'🇵🇹', MA:'🇲🇦', MV:'🇲🇻', IN:'🇮🇳', NP:'🇳🇵', CA:'🇨🇦',
};

const CATEGORY_ICON: Record<string, string> = {
  restaurant:'🍽', cafe:'☕', attraction:'🎯', lodging:'🏨',
  shopping:'🛍', transport:'🚆', activity:'🏄', beach:'🏖',
  nature:'🌿', culture:'🏛', etc:'📍',
};

const ROLE_LABEL: Record<string, string> = {
  owner:'방장', editor:'편집자', viewer:'뷰어',
};

interface Marker {
  id: number; name: string; address: string | null; category: string;
  day_number: number; stay_minutes: number; memo: string | null;
}

interface Member {
  id: number; role: string; joined_at: string;
  users: { nickname: string; avatar_url: string | null } | null;
}

interface Room {
  id: string; title: string; destination: string | null;
  country_code: string; start_date: string | null; end_date: string | null;
  is_locked: boolean; marker_count: number; member_count: number;
  created_at: string; trip_members: Member[];
}

export default function TripDetailClient({
  room, markers, myRole,
}: {
  room: Room; markers: Marker[]; myRole: string;
}) {
  const [copied, setCopied] = useState(false);
  const flag = FLAG[room.country_code] ?? '🌐';

  const days = Array.from(new Set(markers.map(m => m.day_number))).sort();

  const handleCopy = async () => {
    await navigator.clipboard.writeText(
      `${process.env.NEXT_PUBLIC_APP_URL}/room/${room.id}`
    );
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const dateStr = room.start_date
    ? (() => {
        const s = new Date(room.start_date);
        const e = room.end_date ? new Date(room.end_date) : null;
        const fmt = (d: Date) =>
          d.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' });
        return e ? `${fmt(s)} ~ ${fmt(e)}` : fmt(s);
      })()
    : '날짜 미정';

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc' }}>
      {/* 상단 헤더 */}
      <div style={{
        background: 'linear-gradient(135deg, #6366F1, #8B5CF6)',
        padding: '24px 5vw 32px',
      }}>
        <Link
          href="/my/trips"
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            color: 'rgba(255,255,255,0.75)', textDecoration: 'none',
            fontSize: 13, fontWeight: 600, marginBottom: 20,
          }}
        >
          <ArrowLeft size={14} /> 내 여행 일지
        </Link>

        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
          <div>
            <div style={{ fontSize: 36, marginBottom: 8 }}>{flag}</div>
            <h1 style={{ fontSize: 24, fontWeight: 900, color: '#fff', marginBottom: 6 }}>
              {room.title}
            </h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 5, color: 'rgba(255,255,255,0.8)', fontSize: 13 }}>
                <MapPin size={13} />{room.destination ?? '목적지 미정'}
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 5, color: 'rgba(255,255,255,0.8)', fontSize: 13 }}>
                <Calendar size={13} />{dateStr}
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 5, color: 'rgba(255,255,255,0.8)', fontSize: 13 }}>
                <Users size={13} />{room.member_count}명
              </span>
              {room.is_locked && (
                <span style={{ display: 'flex', alignItems: 'center', gap: 5, color: 'rgba(255,255,255,0.8)', fontSize: 13 }}>
                  <Lock size={13} />확정됨
                </span>
              )}
            </div>
          </div>

          {/* 내 역할 배지 */}
          <span style={{
            fontSize: 12, fontWeight: 700,
            background: 'rgba(255,255,255,0.2)', color: '#fff',
            padding: '5px 12px', borderRadius: 999,
            flexShrink: 0,
          }}>
            {ROLE_LABEL[myRole] ?? myRole}
          </span>
        </div>
      </div>

      {/* 본문 */}
      <div style={{ padding: '24px 5vw', maxWidth: 800, margin: '0 auto' }}>

        {/* 액션 버튼 */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 28, flexWrap: 'wrap' }}>
          <Link
            href={`/room/${room.id}/edit`}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              padding: '11px 20px', borderRadius: 14,
              background: 'linear-gradient(135deg, #6366F1, #8B5CF6)',
              color: '#fff', fontWeight: 700, fontSize: 14,
              textDecoration: 'none',
              boxShadow: '0 4px 16px rgba(99,102,241,0.35)',
            }}
          >
            <Map size={16} />
            지도에서 편집하기
          </Link>
          <button
            onClick={handleCopy}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              padding: '11px 20px', borderRadius: 14,
              background: copied ? '#10B981' : '#fff',
              color: copied ? '#fff' : '#374151',
              fontWeight: 700, fontSize: 14,
              border: '1.5px solid #e2e8f0',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
          >
            {copied ? <><Check size={16} />복사됨!</> : <><Copy size={16} />초대 링크 복사</>}
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 20 }}>

          {/* 장소 목록 */}
          <div>
            <h2 style={{ fontSize: 16, fontWeight: 800, color: '#0f172a', marginBottom: 14 }}>
              📍 장소 목록 <span style={{ color: '#94a3b8', fontWeight: 400, fontSize: 13 }}>({markers.length}개)</span>
            </h2>

            {markers.length === 0 ? (
              <div style={{
                background: '#fff', borderRadius: 16, padding: '32px',
                textAlign: 'center', color: '#94a3b8', border: '1.5px dashed #e2e8f0',
              }}>
                <Navigation size={28} style={{ opacity: 0.3, margin: '0 auto 8px' }} />
                <p style={{ fontSize: 13 }}>아직 추가된 장소가 없어요</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {days.map(day => (
                  <div key={day}>
                    <div style={{
                      fontSize: 11, fontWeight: 700, color: '#6366F1',
                      letterSpacing: '0.08em', textTransform: 'uppercase',
                      marginBottom: 8, marginTop: day > 1 ? 16 : 0,
                    }}>
                      Day {day}
                    </div>
                    {markers.filter(m => m.day_number === day).map((m, i) => (
                      <div key={m.id} style={{
                        background: '#fff', borderRadius: 14, padding: '14px 16px',
                        border: '1.5px solid #f1f5f9',
                        display: 'flex', alignItems: 'flex-start', gap: 12,
                        marginBottom: 8,
                      }}>
                        <div style={{
                          width: 32, height: 32, borderRadius: 10,
                          background: '#f0f0ff', display: 'flex',
                          alignItems: 'center', justifyContent: 'center',
                          fontSize: 16, flexShrink: 0,
                        }}>
                          {CATEGORY_ICON[m.category] ?? '📍'}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                            <span style={{
                              fontSize: 11, fontWeight: 700, color: '#6366F1',
                              background: '#6366F115', padding: '1px 7px', borderRadius: 999,
                            }}>
                              {i + 1}
                            </span>
                            <span style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {m.name}
                            </span>
                          </div>
                          {m.address && (
                            <p style={{ fontSize: 12, color: '#94a3b8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {m.address}
                            </p>
                          )}
                          {m.stay_minutes > 0 && (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 11, color: '#64748b', marginTop: 4 }}>
                              <Clock size={10} /> {m.stay_minutes}분 체류
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 멤버 목록 */}
          <div>
            <h2 style={{ fontSize: 16, fontWeight: 800, color: '#0f172a', marginBottom: 14 }}>
              👥 멤버 <span style={{ color: '#94a3b8', fontWeight: 400, fontSize: 13 }}>({room.trip_members.length}명)</span>
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {room.trip_members.map(member => {
                const nick = member.users?.nickname ?? '알 수 없음';
                const initial = nick.charAt(0).toUpperCase();
                const roleClr = member.role === 'owner' ? '#6366F1' : member.role === 'editor' ? '#10B981' : '#94a3b8';
                return (
                  <div key={member.id} style={{
                    background: '#fff', borderRadius: 14, padding: '12px 14px',
                    display: 'flex', alignItems: 'center', gap: 10,
                    border: '1.5px solid #f1f5f9',
                  }}>
                    <div style={{
                      width: 34, height: 34, borderRadius: '50%',
                      background: 'linear-gradient(135deg, #6366F1, #8B5CF6)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 13, fontWeight: 800, color: '#fff', flexShrink: 0,
                    }}>
                      {initial}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {nick}
                      </div>
                      <div style={{ fontSize: 11, color: '#94a3b8' }}>
                        {new Date(member.joined_at).toLocaleDateString('ko-KR')} 참여
                      </div>
                    </div>
                    <span style={{
                      fontSize: 10, fontWeight: 700, color: roleClr,
                      background: `${roleClr}15`, padding: '2px 8px', borderRadius: 999,
                    }}>
                      {ROLE_LABEL[member.role] ?? member.role}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
