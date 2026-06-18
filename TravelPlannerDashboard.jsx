'use client';

import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';

// ═══════════════════════════════════════════════════════════════════════
// INLINE SVG ICONS (lucide-react 미설치 환경 대비 자체 포함)
// ═══════════════════════════════════════════════════════════════════════
const IC = {
  MapPin: (p) => (
    <svg {...p} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/>
      <circle cx="12" cy="10" r="3"/>
    </svg>
  ),
  Users: (p) => (
    <svg {...p} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
      <circle cx="9" cy="7" r="4"/>
      <path d="M22 21v-2a4 4 0 0 0-3-3.87"/>
      <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>
  ),
  User: (p) => (
    <svg {...p} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
      <circle cx="12" cy="7" r="4"/>
    </svg>
  ),
  Copy: (p) => (
    <svg {...p} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="14" height="14" x="8" y="8" rx="2" ry="2"/>
      <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>
    </svg>
  ),
  Plus: (p) => (
    <svg {...p} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12h14"/><path d="M12 5v14"/>
    </svg>
  ),
  Car: (p) => (
    <svg {...p} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 17H5v-1a7 7 0 0 1 14 0v1Z"/>
      <path d="m3 17 1.5-5h15L21 17"/>
      <circle cx="7.5" cy="17.5" r="1.5"/>
      <circle cx="16.5" cy="17.5" r="1.5"/>
    </svg>
  ),
  X: (p) => (
    <svg {...p} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
    </svg>
  ),
  ExternalLink: (p) => (
    <svg {...p} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M15 3h6v6"/><path d="M10 14 21 3"/>
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
    </svg>
  ),
  Star: (p) => (
    <svg {...p} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"
      fill="currentColor" stroke="none">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
    </svg>
  ),
  Check: (p) => (
    <svg {...p} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12"/>
    </svg>
  ),
  Trash2: (p) => (
    <svg {...p} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 6h18"/>
      <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/>
      <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
    </svg>
  ),
  Navigation: (p) => (
    <svg {...p} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="3 11 22 2 13 21 11 13 3 11"/>
    </svg>
  ),
  Bus: (p) => (
    <svg {...p} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 6v6"/><path d="M15 6v6"/>
      <path d="M2 12h19.6"/><path d="M18 18h3s.5-1.7.8-2.8c.1-.4.2-.8.2-1.2 0-.4-.1-.8-.2-1.2l-1.4-5C20.1 6.8 19.1 6 18 6H4a2 2 0 0 0-2 2v10h3"/>
      <circle cx="7" cy="18" r="2"/><circle cx="15" cy="18" r="2"/>
    </svg>
  ),
  Walk: (p) => (
    <svg {...p} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="13" cy="4" r="1"/>
      <path d="m7 21 1-3 3 1 2-4"/>
      <path d="m7 11 1-1 3 3 2-3 3 3"/>
      <path d="M10 8.5 8 12l4 1 3-5"/>
    </svg>
  ),
  Hotel: (p) => (
    <svg {...p} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2Z"/>
      <path d="m9 22 .01-4c0-.55.45-1 1-1h4c.55 0 1 .45 1 1V22"/>
      <path d="M9 7h1"/><path d="M9 11h1"/>
      <path d="M14 7h1"/><path d="M14 11h1"/>
    </svg>
  ),
  Ticket: (p) => (
    <svg {...p} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z"/>
      <path d="M13 5v2"/><path d="M13 17v2"/>
      <path d="M13 11v2"/>
    </svg>
  ),
};

// ═══════════════════════════════════════════════════════════════════════
// DATA
// ═══════════════════════════════════════════════════════════════════════

const PLACE_POOL = [
  {
    name: '성산일출봉',
    address: '서귀포시 성산읍 일출로 284-12',
    category: 'attraction',
    x: 76, y: 38,
    emoji: '🌋',
    rating: 4.8,
    reviewCount: 12847,
    description: '유네스코 세계자연유산. 제주를 대표하는 화산 분화구로, 일출 명소로 유명합니다.',
  },
  {
    name: '협재 해수욕장',
    address: '제주시 한림읍 협재리 2497',
    category: 'beach',
    x: 11, y: 44,
    emoji: '🏖️',
    rating: 4.7,
    reviewCount: 8234,
    description: '에메랄드빛 바다와 하얀 모래사장이 펼쳐진 제주 서쪽의 대표 해변.',
  },
  {
    name: '흑돼지 거리',
    address: '제주시 연동 312-1번지',
    category: 'restaurant',
    x: 27, y: 27,
    emoji: '🍖',
    rating: 4.6,
    reviewCount: 6521,
    description: '제주 흑돼지를 맛볼 수 있는 제주시 최대 음식거리. 현지인 단골 맛집이 밀집.',
  },
  {
    name: '천지연 폭포',
    address: '서귀포시 천지동 667-7',
    category: 'attraction',
    x: 45, y: 72,
    emoji: '💧',
    rating: 4.5,
    reviewCount: 9103,
    description: '높이 22m, 너비 12m의 웅장한 폭포. 서귀포의 야경 명소로도 유명.',
  },
  {
    name: '한라산 영실 코스',
    address: '서귀포시 색달동 산 1-1',
    category: 'nature',
    x: 44, y: 50,
    emoji: '⛰️',
    rating: 4.9,
    reviewCount: 15632,
    description: '제주의 상징 한라산. 영실 코스는 왕복 약 5.8km, 3시간 소요.',
  },
  {
    name: '우도 해수욕장',
    address: '제주시 우도면 연평리',
    category: 'beach',
    x: 87, y: 30,
    emoji: '🏝️',
    rating: 4.7,
    reviewCount: 7841,
    description: '배를 타고 가는 우도의 홍조단괴 해수욕장. 투명한 바닷물이 인상적.',
  },
  {
    name: '제주 민속촌',
    address: '서귀포시 표선면 표선리 40-1',
    category: 'culture',
    x: 64, y: 60,
    emoji: '🏘️',
    rating: 4.3,
    reviewCount: 4209,
    description: '제주 전통 가옥과 민속 문화를 체험할 수 있는 야외 박물관.',
  },
  {
    name: '이호테우 해변',
    address: '제주시 이호일동 1210',
    category: 'beach',
    x: 22, y: 18,
    emoji: '🐴',
    rating: 4.4,
    reviewCount: 3876,
    description: '빨간 말·하얀 말 등대로 유명한 제주시 북서쪽 해변. 일몰 명소.',
  },
];

const CATEGORY_CONFIG = {
  attraction: { label: '관광지', color: '#7C3AED', bg: '#EDE9FE' },
  beach:      { label: '해수욕장', color: '#0284C7', bg: '#E0F2FE' },
  restaurant: { label: '맛집',    color: '#EA580C', bg: '#FFF7ED' },
  nature:     { label: '자연',    color: '#16A34A', bg: '#F0FDF4' },
  culture:    { label: '문화',    color: '#CA8A04', bg: '#FEFCE8' },
};

const PIN_COLORS = [
  '#6366F1', '#8B5CF6', '#EC4899',
  '#F97316', '#EAB308', '#10B981', '#0EA5E9', '#6366F1',
];

// ═══════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════

function genRoute(x1, y1, x2, y2) {
  const d = Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
  const km  = +(d * 0.92 + 8  + Math.random() * 5).toFixed(1);
  const min = Math.round(km * 1.85 + 4 + Math.random() * 6);
  return { km, min };
}

function genCode() {
  const c = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return 'TRP-' + Array.from({ length: 4 }, () =>
    c[Math.floor(Math.random() * c.length)]
  ).join('');
}

// ═══════════════════════════════════════════════════════════════════════
// CSS ANIMATIONS (주입용 문자열)
// ═══════════════════════════════════════════════════════════════════════

const GLOBAL_STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');

  * { box-sizing: border-box; margin: 0; padding: 0; }

  @keyframes popIn {
    0%   { transform: translate(-50%,-100%) scale(0.3); opacity: 0; }
    70%  { transform: translate(-50%,-100%) scale(1.12); opacity: 1; }
    100% { transform: translate(-50%,-100%) scale(1);   opacity: 1; }
  }
  @keyframes popInSelected {
    0%   { transform: translate(-50%,-100%) scale(0.8); }
    60%  { transform: translate(-50%,-100%) scale(1.18); }
    100% { transform: translate(-50%,-100%) scale(1.15); }
  }
  @keyframes drawPath {
    from { stroke-dashoffset: 200; opacity: 0; }
    20%  { opacity: 1; }
    to   { stroke-dashoffset: 0;   opacity: 1; }
  }
  @keyframes slideUp {
    from { transform: translateY(12px); opacity: 0; }
    to   { transform: translateY(0);   opacity: 1; }
  }
  @keyframes slideInRight {
    from { transform: translateX(16px) scale(0.97); opacity: 0; }
    to   { transform: translateX(0)    scale(1);    opacity: 1; }
  }
  @keyframes cardIn {
    from { transform: translateY(8px); opacity: 0; }
    to   { transform: translateY(0);   opacity: 1; }
  }
  @keyframes pulse {
    0%,100% { box-shadow: 0 0 0 0 rgba(99,102,241,0.4); }
    50%      { box-shadow: 0 0 0 8px rgba(99,102,241,0); }
  }
  @keyframes shimmer {
    0%   { background-position: -200% 0; }
    100% { background-position:  200% 0; }
  }

  ::-webkit-scrollbar { width: 4px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: #E2E8F0; border-radius: 99px; }
  ::-webkit-scrollbar-thumb:hover { background: #CBD5E1; }
`;

// ═══════════════════════════════════════════════════════════════════════
// PLACE CARD
// ═══════════════════════════════════════════════════════════════════════

function PlaceCard({ place, index, isSelected, onSelect, onRemove, animDelay }) {
  const color   = PIN_COLORS[index % PIN_COLORS.length];
  const catConf = CATEGORY_CONFIG[place.category] ?? CATEGORY_CONFIG.attraction;

  return (
    <div
      onClick={() => onSelect(place)}
      style={{
        background: isSelected
          ? `linear-gradient(135deg, ${color}0D, ${color}06)`
          : 'white',
        border: `1.5px solid ${isSelected ? color + '60' : '#F1F5F9'}`,
        borderRadius: 16,
        padding: '13px 14px',
        cursor: 'pointer',
        transition: 'border-color 0.2s, box-shadow 0.2s, background 0.2s',
        boxShadow: isSelected
          ? `0 0 0 3px ${color}22, 0 4px 16px ${color}18`
          : '0 1px 4px rgba(0,0,0,0.05)',
        animation: `cardIn 0.35s ease ${animDelay}s both`,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>

        {/* 번호 뱃지 */}
        <div style={{
          minWidth: 32, height: 32, borderRadius: '50%',
          background: isSelected
            ? `linear-gradient(135deg, ${color}, ${color}CC)`
            : color + '18',
          border: `2px solid ${color}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: isSelected ? 'white' : color,
          fontSize: 13, fontWeight: 800, flexShrink: 0,
          transition: 'all 0.2s',
        }}>
          {index + 1}
        </div>

        {/* 본문 */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
            <span style={{
              fontSize: 14, fontWeight: 700,
              color: '#0F172A',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {place.emoji} {place.name}
            </span>
          </div>

          <div style={{
            display: 'inline-flex', alignItems: 'center',
            background: catConf.bg, color: catConf.color,
            fontSize: 10, fontWeight: 600,
            padding: '2px 8px', borderRadius: 20,
            marginBottom: 6,
          }}>
            {catConf.label}
          </div>

          <div style={{ fontSize: 11, color: '#94A3B8', marginBottom: 5,
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {place.address}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
            <IC.Star width={11} height={11} style={{ color: '#F59E0B' }} />
            <span style={{ fontSize: 12, fontWeight: 700, color: '#334155' }}>
              {place.rating}
            </span>
            <span style={{ fontSize: 11, color: '#94A3B8' }}>
              ({place.reviewCount.toLocaleString()})
            </span>
          </div>
        </div>

        {/* 삭제 버튼 */}
        <button
          onClick={e => { e.stopPropagation(); onRemove(place.id); }}
          title="삭제"
          style={{
            width: 26, height: 26, border: 'none', background: 'none',
            cursor: 'pointer', color: '#CBD5E1', borderRadius: 8,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0, transition: 'all 0.15s',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background = '#FEE2E2';
            e.currentTarget.style.color      = '#EF4444';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = 'none';
            e.currentTarget.style.color      = '#CBD5E1';
          }}
        >
          <IC.Trash2 width={13} height={13} />
        </button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// ROUTE CONNECTOR (카드 사이 구간 정보 + 제휴 배너)
// ═══════════════════════════════════════════════════════════════════════

function RouteConnector({ route, idx }) {
  if (!route) return null;
  const showBanner = idx % 2 === 0;

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      padding: '3px 0', gap: 0,
    }}>
      {/* 점선 */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
        {[0,1,2].map(i => (
          <div key={i} style={{
            width: 2, height: 4,
            background: i === 1 ? '#CBD5E1' : '#E2E8F0',
            borderRadius: 1,
          }}/>
        ))}
      </div>

      {/* 구간 정보 박스 */}
      <div style={{
        width: '100%',
        background: '#FAFBFC',
        border: '1px solid #F1F5F9',
        borderRadius: 12,
        padding: '7px 12px',
        margin: '3px 0',
        display: 'flex', alignItems: 'center', gap: 8,
      }}>
        <IC.Car width={13} height={13} style={{ color: '#64748B', flexShrink: 0 }} />
        <span style={{ fontSize: 12, fontWeight: 600, color: '#334155' }}>
          차로 {route.min}분
        </span>
        <span style={{ fontSize: 11, color: '#94A3B8' }}>
          · {route.km}km
        </span>

        {showBanner && (
          <a
            href="#"
            onClick={e => e.preventDefault()}
            title="렌터카 최저가 확인"
            style={{
              marginLeft: 'auto',
              display: 'flex', alignItems: 'center', gap: 4,
              background: 'linear-gradient(135deg, #6366F1, #8B5CF6)',
              color: 'white',
              padding: '4px 10px', borderRadius: 8,
              fontSize: 10, fontWeight: 700,
              textDecoration: 'none', flexShrink: 0,
              transition: 'opacity 0.15s, transform 0.15s',
              whiteSpace: 'nowrap',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.opacity   = '0.85';
              e.currentTarget.style.transform = 'scale(1.03)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.opacity   = '1';
              e.currentTarget.style.transform = 'scale(1)';
            }}
          >
            🚗 렌터카 최저가
          </a>
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
        {[0,1,2].map(i => (
          <div key={i} style={{
            width: 2, height: 4,
            background: i === 1 ? '#CBD5E1' : '#E2E8F0',
            borderRadius: 1,
          }}/>
        ))}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// INFO WINDOW (마커 클릭 시 팝업)
// ═══════════════════════════════════════════════════════════════════════

function InfoWindow({ place, index, onClose }) {
  const color = PIN_COLORS[index % PIN_COLORS.length];

  return (
    <div style={{
      position:   'absolute',
      top: 20, right: 20,
      width: 308,
      background: 'white',
      borderRadius: 22,
      boxShadow:  '0 24px 64px rgba(0,0,0,0.16), 0 4px 16px rgba(0,0,0,0.08)',
      overflow:   'hidden',
      zIndex:     200,
      animation:  'slideInRight 0.28s cubic-bezier(0.34,1.56,0.64,1) both',
    }}>

      {/* 컬러 헤더 */}
      <div style={{
        background:    `linear-gradient(145deg, ${color}, ${color}BB)`,
        padding:       '18px 18px 16px',
        position:      'relative',
      }}>
        <button
          onClick={onClose}
          style={{
            position: 'absolute', top: 14, right: 14,
            width: 30, height: 30,
            background: 'rgba(255,255,255,0.2)',
            border: 'none', borderRadius: '50%',
            cursor: 'pointer', color: 'white',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'background 0.15s',
          }}
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.35)'}
          onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.2)'}
        >
          <IC.X width={14} height={14} />
        </button>

        {/* 번호 뱃지 */}
        <div style={{
          width: 34, height: 34,
          background: 'rgba(255,255,255,0.25)',
          borderRadius: '50%', border: '2px solid rgba(255,255,255,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 14, fontWeight: 800, color: 'white',
          marginBottom: 10,
        }}>
          {index + 1}
        </div>

        <div style={{ fontSize: 22, marginBottom: 5 }}>{place.emoji}</div>
        <div style={{ fontSize: 17, fontWeight: 800, color: 'white', marginBottom: 4 }}>
          {place.name}
        </div>
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.75)', lineHeight: 1.4 }}>
          {place.address}
        </div>
      </div>

      {/* 본문 */}
      <div style={{ padding: '16px 18px 18px' }}>

        {/* 별점 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 10 }}>
          <div style={{ display: 'flex', gap: 2 }}>
            {[1,2,3,4,5].map(i => (
              <IC.Star key={i} width={13} height={13}
                style={{ color: i <= Math.round(place.rating) ? '#F59E0B' : '#E2E8F0' }} />
            ))}
          </div>
          <span style={{ fontSize: 13, fontWeight: 800, color: '#0F172A' }}>
            {place.rating}
          </span>
          <span style={{ fontSize: 11, color: '#94A3B8' }}>
            ({place.reviewCount.toLocaleString()}명 리뷰)
          </span>
        </div>

        {/* 설명 */}
        <p style={{
          fontSize: 12.5, color: '#475569',
          lineHeight: 1.65, marginBottom: 14,
        }}>
          {place.description}
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>

          {/* 아고다 버튼 */}
          <a
            href="https://www.agoda.com"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display:        'flex',
              alignItems:     'center',
              justifyContent: 'space-between',
              padding:        '13px 16px',
              background:     'linear-gradient(135deg, #E8532A, #FF7043)',
              borderRadius:   14,
              textDecoration: 'none',
              color:          'white',
              transition:     'transform 0.15s, box-shadow 0.15s',
              boxShadow:      '0 4px 12px rgba(232,83,42,0.3)',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.transform  = 'translateY(-2px)';
              e.currentTarget.style.boxShadow  = '0 6px 18px rgba(232,83,42,0.4)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.transform  = 'translateY(0)';
              e.currentTarget.style.boxShadow  = '0 4px 12px rgba(232,83,42,0.3)';
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <IC.Hotel width={16} height={16} style={{ opacity: 0.9 }} />
              <div>
                <div style={{ fontSize: 10, opacity: 0.85, marginBottom: 1 }}>근처 숙소 예약</div>
                <div style={{ fontSize: 13, fontWeight: 700 }}>아고다 최저가로 예약하기</div>
              </div>
            </div>
            <IC.ExternalLink width={14} height={14} style={{ opacity: 0.8, flexShrink: 0 }} />
          </a>

          {/* 클룩 버튼 */}
          <a
            href="https://www.klook.com"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display:        'flex',
              alignItems:     'center',
              justifyContent: 'space-between',
              padding:        '13px 16px',
              background:     'linear-gradient(135deg, #FF5722, #FF8A65)',
              borderRadius:   14,
              textDecoration: 'none',
              color:          'white',
              transition:     'transform 0.15s, box-shadow 0.15s',
              boxShadow:      '0 4px 12px rgba(255,87,34,0.3)',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 6px 18px rgba(255,87,34,0.4)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(255,87,34,0.3)';
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <IC.Ticket width={16} height={16} style={{ opacity: 0.9 }} />
              <div>
                <div style={{ fontSize: 10, opacity: 0.85, marginBottom: 1 }}>액티비티 · 투어</div>
                <div style={{ fontSize: 13, fontWeight: 700 }}>클룩 할인 투어 예약하기</div>
              </div>
            </div>
            <IC.ExternalLink width={14} height={14} style={{ opacity: 0.8, flexShrink: 0 }} />
          </a>

          {/* 부킹닷컴 버튼 */}
          <a
            href="https://www.booking.com"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display:        'flex',
              alignItems:     'center',
              justifyContent: 'space-between',
              padding:        '11px 16px',
              background:     '#F8FAFC',
              border:         '1.5px solid #E2E8F0',
              borderRadius:   14,
              textDecoration: 'none',
              color:          '#1A56DB',
              transition:     'all 0.15s',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background   = '#EFF6FF';
              e.currentTarget.style.borderColor  = '#93C5FD';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background   = '#F8FAFC';
              e.currentTarget.style.borderColor  = '#E2E8F0';
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 16 }}>🏨</span>
              <div>
                <div style={{ fontSize: 10, color: '#94A3B8', marginBottom: 1 }}>호텔 · 리조트</div>
                <div style={{ fontSize: 12, fontWeight: 700 }}>Booking.com 가격 비교</div>
              </div>
            </div>
            <IC.ExternalLink width={13} height={13} style={{ opacity: 0.5 }} />
          </a>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// MOCK MAP
// ═══════════════════════════════════════════════════════════════════════

function MockMap({ places, selected, onSelect }) {
  const [lineKey, setLineKey] = useState(0);
  const prevCount = useRef(places.length);

  useEffect(() => {
    if (places.length !== prevCount.current) {
      setLineKey(k => k + 1);
      prevCount.current = places.length;
    }
  }, [places.length]);

  // SVG 베지어 경로 계산 (결정론적 제어점)
  const paths = useMemo(() => places.slice(0, -1).map((p, i) => {
    const n  = places[i + 1];
    const cx = (p.x + n.x) / 2;
    const cy = (p.y + n.y) / 2 - Math.abs(n.x - p.x) * 0.18;
    return { d: `M ${p.x} ${p.y} Q ${cx} ${cy} ${n.x} ${n.y}`, color: PIN_COLORS[i % PIN_COLORS.length] };
  }), [places]);

  return (
    <div style={{
      position: 'relative',
      width: '100%', height: '100%',
      background: 'linear-gradient(150deg, #E4EFF6 0%, #D5E8E0 30%, #CCDFD7 60%, #C8DCD3 100%)',
      overflow: 'hidden',
    }}>

      {/* 지도 배경 (격자 + 도로 패턴) */}
      <svg
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.35 }}
        viewBox="0 0 100 100" preserveAspectRatio="none"
      >
        {/* 섬 윤곽 */}
        <ellipse cx="50" cy="56" rx="46" ry="28" fill="none"
          stroke="#7AAD9A" strokeWidth="0.8" strokeDasharray="2 1"/>
        <ellipse cx="84" cy="34" rx="9" ry="7" fill="none"
          stroke="#7AAD9A" strokeWidth="0.5" strokeDasharray="1.5 1"/>
        {/* 주요 도로 */}
        <path d="M 8 50 Q 50 46 92 50" stroke="#B0CCBE" strokeWidth="0.7" fill="none"/>
        <path d="M 15 35 Q 45 40 80 35" stroke="#B0CCBE" strokeWidth="0.5" fill="none"/>
        <path d="M 20 65 Q 50 62 80 65" stroke="#B0CCBE" strokeWidth="0.5" fill="none"/>
        <path d="M 46 10 L 46 88"        stroke="#B0CCBE" strokeWidth="0.5"/>
        <path d="M 22 20 L 75 72"        stroke="#B0CCBE" strokeWidth="0.3" strokeDasharray="2 2"/>
        {/* 격자 */}
        {[15,30,45,60,75].map(v => (
          <React.Fragment key={v}>
            <line x1={v} y1="0" x2={v} y2="100" stroke="#A8C4B8" strokeWidth="0.15" strokeDasharray="1 4"/>
            <line x1="0" y1={v} x2="100" y2={v} stroke="#A8C4B8" strokeWidth="0.15" strokeDasharray="1 4"/>
          </React.Fragment>
        ))}
      </svg>

      {/* 경로 연결선 SVG */}
      <svg
        key={lineKey}
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}
        viewBox="0 0 100 100" preserveAspectRatio="none"
      >
        <defs>
          <filter id="glow" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="0.6" result="blur"/>
            <feMerge>
              <feMergeNode in="blur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>

        {paths.map((path, i) => (
          <g key={i}>
            {/* 흰 외곽선 */}
            <path d={path.d} stroke="white" strokeWidth="1.6" fill="none" strokeOpacity="0.7"
              strokeLinecap="round"/>
            {/* 메인 컬러 경로 */}
            <path
              d={path.d}
              stroke={path.color}
              strokeWidth="0.9"
              fill="none"
              strokeLinecap="round"
              strokeDasharray="2.5 1.2"
              filter="url(#glow)"
              style={{
                strokeDashoffset: 200,
                animation: `drawPath 0.9s cubic-bezier(0.4,0,0.2,1) ${i * 0.18}s forwards`,
              }}
            />
          </g>
        ))}
      </svg>

      {/* 마커 핀들 */}
      {places.map((place, i) => {
        const color      = PIN_COLORS[i % PIN_COLORS.length];
        const isSel      = selected?.id === place.id;

        return (
          <div
            key={place.id}
            onClick={() => onSelect(place)}
            title={place.name}
            style={{
              position:  'absolute',
              left:      `${place.x}%`,
              top:       `${place.y}%`,
              transform: `translate(-50%, -100%)`,
              cursor:    'pointer',
              zIndex:    isSel ? 30 : 10,
              animation: `popIn 0.45s cubic-bezier(0.34,1.56,0.64,1) ${i * 0.12}s both`,
            }}
          >
            {/* 레이블 (선택 시) */}
            {isSel && (
              <div style={{
                position:      'absolute',
                bottom:        '108%',
                left:          '50%',
                transform:     'translateX(-50%)',
                background:    'rgba(15,23,42,0.88)',
                color:         'white',
                padding:       '5px 10px',
                borderRadius:  8,
                fontSize:      11.5,
                fontWeight:    600,
                whiteSpace:    'nowrap',
                pointerEvents: 'none',
                backdropFilter:'blur(4px)',
                boxShadow:     '0 4px 12px rgba(0,0,0,0.2)',
              }}>
                {place.emoji} {place.name}
                {/* 말풍선 꼬리 */}
                <div style={{
                  position:   'absolute',
                  top:        '100%', left: '50%',
                  transform:  'translateX(-50%)',
                  width: 0, height: 0,
                  borderLeft: '5px solid transparent',
                  borderRight:'5px solid transparent',
                  borderTop:  '5px solid rgba(15,23,42,0.88)',
                }}/>
              </div>
            )}

            {/* 핀 본체 */}
            <div style={{
              display:    'flex',
              flexDirection: 'column',
              alignItems: 'center',
              transition: 'transform 0.2s cubic-bezier(0.34,1.56,0.64,1)',
              transform:  isSel ? 'scale(1.22)' : 'scale(1)',
            }}>
              {/* 다이아몬드 핀 */}
              <div style={{
                width:     isSel ? 36 : 32,
                height:    isSel ? 36 : 32,
                borderRadius: '50% 50% 50% 0',
                transform: 'rotate(-45deg)',
                background: isSel
                  ? `linear-gradient(135deg, ${color}, ${color}BB)`
                  : 'white',
                border:    `3px solid ${color}`,
                display:   'flex',
                alignItems:'center',
                justifyContent: 'center',
                boxShadow: isSel
                  ? `0 6px 20px ${color}55`
                  : `0 3px 10px rgba(0,0,0,0.18)`,
                transition: 'all 0.2s',
                animation:  isSel ? `pulse 1.8s ease-in-out infinite` : 'none',
              }}>
                <span style={{
                  transform: 'rotate(45deg)',
                  fontSize:  isSel ? 13 : 12,
                  fontWeight: 800,
                  color:     isSel ? 'white' : color,
                }}>
                  {i + 1}
                </span>
              </div>
              {/* 그림자 점 */}
              <div style={{
                width:      isSel ? 10 : 8,
                height:     isSel ? 5 : 4,
                background: 'rgba(0,0,0,0.12)',
                borderRadius: '50%',
                marginTop:  -1,
                transition: 'all 0.2s',
              }}/>
            </div>
          </div>
        );
      })}

      {/* 빈 상태 */}
      {places.length === 0 && (
        <div style={{
          position:      'absolute', inset: 0,
          display:       'flex', flexDirection: 'column',
          alignItems:    'center', justifyContent: 'center',
          gap: 12, color: '#94A3B8',
          animation:     'slideUp 0.4s ease',
        }}>
          <IC.MapPin width={44} height={44} style={{ opacity: 0.3 }} />
          <p style={{ fontSize: 14, fontWeight: 500, textAlign: 'center', lineHeight: 1.6 }}>
            왼쪽 사이드바에서<br/>장소를 추가해보세요
          </p>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// SIDEBAR
// ═══════════════════════════════════════════════════════════════════════

function Sidebar({ mode, setMode, places, code, copied, onCopy, onAdd, onRemove, onSelect, selected }) {
  const totalMin = places.reduce((s, p) => s + (p.route?.min ?? 0), 0);
  const totalKm  = places.reduce((s, p) => s + (p.route?.km  ?? 0), 0);

  return (
    <div style={{
      width:    340, minWidth: 340, height: '100%',
      background: 'white',
      borderRight: '1px solid #F1F5F9',
      display:  'flex', flexDirection: 'column',
      boxShadow: '4px 0 24px rgba(0,0,0,0.04)',
      zIndex:   10,
    }}>

      {/* ── 헤더 ── */}
      <div style={{ padding: '18px 18px 14px', borderBottom: '1px solid #F8FAFC' }}>

        {/* 앱 타이틀 + 요약 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
          <div style={{
            width: 40, height: 40, borderRadius: 12,
            background: 'linear-gradient(135deg, #6366F1, #8B5CF6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 14px rgba(99,102,241,0.4)',
          }}>
            <IC.Navigation width={19} height={19} style={{ color: 'white' }} />
          </div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 800, color: '#0F172A' }}>
              제주도 3박 4일
            </div>
            <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 1 }}>
              {places.length}개 장소 ·&nbsp;
              {Math.floor(totalMin / 60) > 0 ? `${Math.floor(totalMin / 60)}시간 ` : ''}
              {totalMin % 60}분 · {totalKm.toFixed(1)}km
            </div>
          </div>
        </div>

        {/* 모드 토글 */}
        <div style={{
          display:    'flex',
          background: '#F8FAFC',
          borderRadius: 12,
          padding:    4,
          gap:        4,
          marginBottom: mode === 'team' ? 12 : 0,
        }}>
          {[
            { key: 'personal', label: '개인 모드', Icon: IC.User },
            { key: 'team',     label: '팀 모드',   Icon: IC.Users },
          ].map(({ key, label, Icon }) => {
            const active = mode === key;
            return (
              <button
                key={key}
                onClick={() => setMode(key)}
                style={{
                  flex: 1,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  padding:   '8px 0',
                  background: active ? 'white' : 'transparent',
                  border:    'none',
                  borderRadius: 9,
                  fontSize:  13, fontWeight: active ? 700 : 400,
                  color:     active ? '#6366F1' : '#94A3B8',
                  cursor:    'pointer',
                  boxShadow: active ? '0 1px 6px rgba(0,0,0,0.08)' : 'none',
                  transition: 'all 0.2s',
                }}
              >
                <Icon width={14} height={14} />
                {label}
              </button>
            );
          })}
        </div>

        {/* 팀 모드: 초대 코드 */}
        {mode === 'team' && (
          <div style={{
            background:   'linear-gradient(135deg, #EEF2FF, #F5F3FF)',
            border:       '1px solid #E0E7FF',
            borderRadius: 14,
            padding:      '12px 14px',
            display:      'flex', alignItems: 'center', gap: 10,
            animation:    'slideUp 0.3s ease',
          }}>
            <div style={{ flex: 1 }}>
              <div style={{
                fontSize: 9, color: '#6366F1', fontWeight: 700,
                letterSpacing: '0.08em', marginBottom: 4, textTransform: 'uppercase',
              }}>
                초대 코드
              </div>
              <div style={{
                fontSize: 18, fontWeight: 900, color: '#3730A3',
                letterSpacing: '0.12em', fontFamily: 'monospace',
              }}>
                {code}
              </div>
            </div>
            <button
              onClick={onCopy}
              style={{
                display:    'flex', alignItems: 'center', gap: 6,
                padding:    '9px 16px',
                background: copied
                  ? 'linear-gradient(135deg, #10B981, #059669)'
                  : 'linear-gradient(135deg, #6366F1, #8B5CF6)',
                border:     'none', borderRadius: 11,
                color:      'white', fontSize: 12, fontWeight: 700,
                cursor:     'pointer',
                boxShadow:  copied
                  ? '0 4px 14px rgba(16,185,129,0.4)'
                  : '0 4px 14px rgba(99,102,241,0.4)',
                transition: 'all 0.2s',
                whiteSpace: 'nowrap',
              }}
            >
              {copied
                ? <><IC.Check width={13} height={13} />복사됨!</>
                : <><IC.Copy  width={13} height={13} />복사</>
              }
            </button>
          </div>
        )}
      </div>

      {/* ── 장소 리스트 ── */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '14px 16px 8px' }}>
        {places.length === 0 ? (
          <div style={{
            height:        '100%',
            display:       'flex', flexDirection: 'column',
            alignItems:    'center', justifyContent: 'center',
            gap: 12, color: '#94A3B8', padding: '32px 0',
          }}>
            <IC.MapPin width={36} height={36} style={{ opacity: 0.3 }} />
            <p style={{ fontSize: 13, textAlign: 'center', lineHeight: 1.7 }}>
              아래 버튼으로<br/>첫 장소를 추가해보세요
            </p>
          </div>
        ) : (
          places.map((place, i) => (
            <div key={place.id}>
              <PlaceCard
                place={place}
                index={i}
                isSelected={selected?.id === place.id}
                onSelect={onSelect}
                onRemove={onRemove}
                animDelay={0}
              />
              {i < places.length - 1 && (
                <RouteConnector route={places[i + 1].route} idx={i} />
              )}
            </div>
          ))
        )}
      </div>

      {/* ── 하단 장소 추가 버튼 ── */}
      <div style={{ padding: '12px 16px 20px', borderTop: '1px solid #F8FAFC' }}>
        <button
          onClick={onAdd}
          style={{
            width:         '100%',
            display:       'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            padding:       '13px',
            background:    'linear-gradient(135deg, #6366F1, #8B5CF6)',
            border:        'none', borderRadius: 14,
            color:         'white', fontSize: 14, fontWeight: 700,
            cursor:        'pointer',
            boxShadow:     '0 4px 18px rgba(99,102,241,0.45)',
            transition:    'all 0.2s cubic-bezier(0.34,1.56,0.64,1)',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.transform  = 'translateY(-2px)';
            e.currentTarget.style.boxShadow  = '0 8px 24px rgba(99,102,241,0.55)';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.transform  = 'translateY(0)';
            e.currentTarget.style.boxShadow  = '0 4px 18px rgba(99,102,241,0.45)';
          }}
        >
          <IC.Plus width={18} height={18} />
          장소 추가하기
        </button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// MAP AREA
// ═══════════════════════════════════════════════════════════════════════

const TRANSPORT_MODES = [
  { label: '자동차', icon: IC.Car },
  { label: '대중교통', icon: IC.Bus },
  { label: '도보',   icon: IC.Walk },
];

function MapArea({ places, selected, onSelect, onClose }) {
  const [tMode, setTMode] = useState(0);
  const totalMin = places.reduce((s, p) => s + (p.route?.min ?? 0), 0);
  const totalKm  = places.reduce((s, p) => s + (p.route?.km  ?? 0), 0);

  return (
    <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>

      {/* 이동수단 토글 (지도 위 오버레이) */}
      <div style={{
        position:  'absolute', top: 16, left: 16, zIndex: 50,
        display:   'flex', gap: 6,
      }}>
        {TRANSPORT_MODES.map(({ label, icon: MIcon }, i) => (
          <button
            key={i}
            onClick={() => setTMode(i)}
            style={{
              display:    'flex', alignItems: 'center', gap: 5,
              padding:    '7px 14px',
              background: i === tMode ? 'white' : 'rgba(255,255,255,0.7)',
              border:     i === tMode ? '2px solid #6366F1' : '1.5px solid rgba(255,255,255,0.6)',
              borderRadius: 20,
              fontSize:   12, fontWeight: i === tMode ? 700 : 400,
              color:      i === tMode ? '#6366F1' : '#64748B',
              cursor:     'pointer',
              backdropFilter: 'blur(8px)',
              boxShadow:  '0 2px 10px rgba(0,0,0,0.08)',
              transition: 'all 0.2s',
            }}
          >
            <MIcon width={13} height={13} />
            {label}
          </button>
        ))}
      </div>

      {/* 지도 본체 */}
      <MockMap
        places={places}
        selected={selected}
        onSelect={onSelect}
      />

      {/* 인포윈도우 */}
      {selected && (
        <InfoWindow
          place={selected}
          index={places.findIndex(p => p.id === selected.id)}
          onClose={onClose}
        />
      )}

      {/* 하단 통계 바 */}
      <div style={{
        position:       'absolute',
        bottom: 20, left: '50%',
        transform:      'translateX(-50%)',
        background:     'rgba(255,255,255,0.94)',
        backdropFilter: 'blur(14px)',
        borderRadius:   18,
        padding:        '11px 28px',
        display:        'flex', gap: 28, alignItems: 'center',
        boxShadow:      '0 4px 28px rgba(0,0,0,0.10)',
        border:         '1px solid rgba(255,255,255,0.9)',
        animation:      'slideUp 0.5s ease',
      }}>
        {[
          { label: '총 장소',   value: `${places.length}곳` },
          { label: '총 거리',   value: `${totalKm.toFixed(1)}km` },
          { label: '이동 시간', value: totalMin >= 60
              ? `${Math.floor(totalMin/60)}h ${totalMin%60}m`
              : `${totalMin}분` },
        ].map(({ label, value }) => (
          <div key={label} style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 10, color: '#94A3B8', marginBottom: 2, fontWeight: 500 }}>
              {label}
            </div>
            <div style={{ fontSize: 15, fontWeight: 800, color: '#0F172A' }}>
              {value}
            </div>
          </div>
        ))}

        {/* 구분선 */}
        <div style={{ width: 1, height: 32, background: '#E2E8F0', margin: '0 4px' }}/>

        {/* 전체 공유 버튼 */}
        <button
          style={{
            display:    'flex', alignItems: 'center', gap: 6,
            padding:    '8px 16px',
            background: 'linear-gradient(135deg, #6366F1, #8B5CF6)',
            border:     'none', borderRadius: 12,
            color:      'white', fontSize: 12, fontWeight: 700,
            cursor:     'pointer',
            boxShadow:  '0 3px 12px rgba(99,102,241,0.4)',
            transition: 'all 0.2s',
          }}
          onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.04)'}
          onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
          onClick={() => alert('🔗 일정 공유 링크가 복사되었습니다!\nhttps://tripsync.com/trips/jeju/3nights-4days/t8xK2m')}
        >
          <IC.Copy width={13} height={13} />
          공유하기
        </button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// ROOT
// ═══════════════════════════════════════════════════════════════════════

export default function TravelPlannerDashboard() {
  const [mode,     setMode]     = useState('personal');
  const [selected, setSelected] = useState(null);
  const [code]                  = useState(genCode);
  const [copied,   setCopied]   = useState(false);
  const poolIdx = useRef(3);

  const [places, setPlaces] = useState(() => [
    { ...PLACE_POOL[0], id: 1, route: null },
    { ...PLACE_POOL[1], id: 2, route: genRoute(PLACE_POOL[0].x, PLACE_POOL[0].y, PLACE_POOL[1].x, PLACE_POOL[1].y) },
    { ...PLACE_POOL[2], id: 3, route: genRoute(PLACE_POOL[1].x, PLACE_POOL[1].y, PLACE_POOL[2].x, PLACE_POOL[2].y) },
  ]);

  const addPlace = useCallback(() => {
    if (poolIdx.current >= PLACE_POOL.length) poolIdx.current = 3;
    const np = PLACE_POOL[poolIdx.current++];
    setPlaces(prev => {
      const last = prev[prev.length - 1];
      return [
        ...prev,
        { ...np, id: prev.length + 1, route: genRoute(last.x, last.y, np.x, np.y) },
      ];
    });
  }, []);

  const removePlace = useCallback((id) => {
    setPlaces(prev => {
      const filtered = prev.filter(p => p.id !== id);
      return filtered.map((p, i) => ({
        ...p,
        id:    i + 1,
        route: i === 0
          ? null
          : genRoute(filtered[i - 1].x, filtered[i - 1].y, p.x, p.y),
      }));
    });
    setSelected(s => s?.id === id ? null : s);
  }, []);

  const copyCode = useCallback(() => {
    try {
      navigator.clipboard.writeText(`https://tripsync.com/room/${code}`);
    } catch {}
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [code]);

  return (
    <>
      <style>{GLOBAL_STYLES}</style>
      <div style={{
        display:    'flex',
        height:     '100vh',
        background: '#F8FAFC',
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        overflow:   'hidden',
      }}>
        <Sidebar
          mode={mode}       setMode={setMode}
          places={places}   code={code}
          copied={copied}   onCopy={copyCode}
          onAdd={addPlace}  onRemove={removePlace}
          onSelect={setSelected} selected={selected}
        />
        <MapArea
          places={places}   selected={selected}
          onSelect={setSelected}
          onClose={() => setSelected(null)}
        />
      </div>
    </>
  );
}
