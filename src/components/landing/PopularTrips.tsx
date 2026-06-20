'use client';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { Star, Eye, MapPin } from 'lucide-react';

const TRIPS = [
  {
    id: 1,
    title:    '3박 4일 오사카 먹방 투어',
    destination: '오사카, 일본',
    image:    '/images/osaka.png',
    imageAlt: '오사카 거리의 다채로운 음식 골목과 네온사인 야경',
    gradient: ['#FF6B6B', '#FF8E53'] as [string, string],
    tagColor: '#B91C1C',
    tags:     ['#3박4일', '#먹방여행', '#일본'],
    rating:   4.9,
    views:    2847,
    places:   18,
  },
  {
    id: 2,
    title:    '제주도 동쪽 해안도로 코스',
    destination: '제주도, 한국',
    image:    '/images/jeju.png',
    imageAlt: '제주도 에메랄드빛 바다와 해안 절벽 드라이브 코스',
    gradient: ['#43B89C', '#3B82F6'] as [string, string],
    tagColor: '#0F766E',
    tags:     ['#2박3일', '#드라이브', '#렌트카'],
    rating:   4.8,
    views:    1923,
    places:   12,
  },
  {
    id: 3,
    title:    '5일 방콕 + 파타야 완벽 가이드',
    destination: '방콕, 태국',
    image:    '/images/bangok.png',
    imageAlt: '방콕 왓 아룬 사원과 짜오프라야 강변 야경',
    gradient: ['#F59E0B', '#EF4444'] as [string, string],
    tagColor: '#B45309',
    tags:     ['#4박5일', '#가족여행', '#해외'],
    rating:   4.7,
    views:    3401,
    places:   24,
  },
  {
    id: 4,
    title:    '교토 단풍 시즌 감성 여행',
    destination: '교토, 일본',
    image:    '/images/kyoto.png',
    imageAlt: '교토 아라시야마 대나무 숲과 붉은 단풍이 어우러진 가을 풍경',
    gradient: ['#8B5CF6', '#EC4899'] as [string, string],
    tagColor: '#6D28D9',
    tags:     ['#3박4일', '#감성여행', '#가을'],
    rating:   4.9,
    views:    4102,
    places:   15,
  },
];

const cardVariants = {
  hidden:  { opacity: 0, y: 28 },
  visible: { opacity: 1, y: 0 },
  hover:   { y: -6, boxShadow: '0 20px 56px rgba(0,0,0,0.13)' },
};

const imgVariants = {
  visible: { scale: 1 },
  hover:   { scale: 1.06 },
};

function TripCard({ trip, index }: { trip: typeof TRIPS[number]; index: number }) {
  return (
    <motion.div
      variants={cardVariants}
      initial="hidden"
      whileInView="visible"
      whileHover="hover"
      viewport={{ once: true, amount: 0.1 }}
      transition={{ duration: 0.5, delay: index * 0.08 }}
      style={{
        borderRadius: 20,
        overflow:     'hidden',
        background:   '#ffffff',
        boxShadow:    '0 2px 16px rgba(0,0,0,0.07)',
        cursor:       'pointer',
        border:       '1px solid #f1f5f9',
      }}
    >
      {/* 썸네일 */}
      <div style={{ height: 200, position: 'relative', overflow: 'hidden', borderRadius: '20px 20px 0 0' }}>
        <motion.div
          variants={imgVariants}
          transition={{ duration: 0.5 }}
          style={{ position: 'absolute', inset: 0 }}
        >
          <Image
            src={trip.image}
            alt={trip.imageAlt}
            fill
            style={{ objectFit: 'cover', objectPosition: 'center' }}
          />
        </motion.div>

        {/* 그라데이션 오버레이 */}
        <div style={{
          position:      'absolute',
          bottom: 0, left: 0, right: 0,
          height:        '45%',
          background:    `linear-gradient(to top, ${trip.gradient[0]}80, transparent)`,
          pointerEvents: 'none',
        }} />

        {/* 장소 수 뱃지 */}
        <div style={{
          position:       'absolute',
          top:            12,
          right:          12,
          background:     'rgba(255,255,255,0.92)',
          backdropFilter: 'blur(8px)',
          borderRadius:   10,
          padding:        '5px 10px',
          display:        'flex',
          alignItems:     'center',
          gap:            5,
          fontSize:       12,
          fontWeight:     700,
          color:          '#374151',
          boxShadow:      '0 2px 8px rgba(0,0,0,0.10)',
        }}>
          <MapPin size={12} color={trip.gradient[0]} />
          {trip.places}개 장소
        </div>
      </div>

      {/* 콘텐츠 */}
      <div style={{ padding: '18px 20px 20px' }}>
        {/* 목적지 */}
        <div style={{
          display:      'flex',
          alignItems:   'center',
          gap:          5,
          fontSize:     12,
          color:        '#94a3b8',
          fontWeight:   600,
          marginBottom: 8,
        }}>
          <MapPin size={11} />
          {trip.destination}
        </div>

        {/* 타이틀 */}
        <h3 style={{
          fontSize:      16,
          fontWeight:    800,
          color:         '#0f172a',
          lineHeight:    1.4,
          marginBottom:  12,
          letterSpacing: '-0.01em',
        }}>
          {trip.title}
        </h3>

        {/* 태그 — 배경 대비 진한 텍스트 */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
          {trip.tags.map(tag => (
            <span key={tag} style={{
              fontSize:     12,
              fontWeight:   700,
              color:        trip.tagColor,
              background:   `${trip.gradient[0]}18`,
              padding:      '3px 10px',
              borderRadius: 999,
            }}>
              {tag}
            </span>
          ))}
        </div>

        {/* 하단: 평점 + 조회수 */}
        <div style={{
          display:        'flex',
          alignItems:     'center',
          justifyContent: 'space-between',
          paddingTop:     12,
          borderTop:      '1px solid #f1f5f9',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            {[1,2,3,4,5].map(i => (
              <Star
                key={i}
                size={13}
                fill={i <= Math.round(trip.rating) ? '#FBBF24' : 'none'}
                color={i <= Math.round(trip.rating) ? '#FBBF24' : '#e2e8f0'}
              />
            ))}
            <span style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', marginLeft: 4 }}>
              {trip.rating}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: '#64748b', fontWeight: 600 }}>
            <Eye size={13} />
            {trip.views.toLocaleString()}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export default function PopularTrips() {
  return (
    <section className="popular-section" style={{
      padding:    'clamp(48px, 8vh, 100px) clamp(20px, 5vw, 80px) clamp(48px, 8vh, 120px)',
      background: '#f8fafc',
    }}>
      {/* 헤더 */}
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.2 }}
        transition={{ duration: 0.6 }}
        style={{ textAlign: 'center', marginBottom: 'clamp(36px, 5vh, 56px)' }}
      >
        <span style={{
          display:       'inline-block',
          fontSize:      12,
          fontWeight:    700,
          letterSpacing: '0.16em',
          textTransform: 'uppercase' as const,
          color:         '#6366F1',
          background:    '#6366F115',
          padding:       '6px 16px',
          borderRadius:  999,
          marginBottom:  16,
        }}>
          Popular Trips
        </span>
        <h2 style={{
          fontSize:      'clamp(24px, 3vw, 42px)',
          fontWeight:    800,
          color:         '#0f172a',
          lineHeight:    1.2,
          marginBottom:  12,
          letterSpacing: '-0.02em',
        }}>
          인기 여행 일정을 참고해보세요
        </h2>
        <p style={{
          fontSize:   'clamp(13px, 1vw, 16px)',
          color:      '#64748b',
          lineHeight: 1.7,
          maxWidth:   480,
          margin:     '0 auto',
        }}>
          다른 여행자들이 만든 일정을 보고, 바로 내 여행으로 가져오세요.
        </p>
      </motion.div>

      {/* 카드 그리드 */}
      <div style={{
        display:             'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(clamp(260px, 22vw, 300px), 1fr))',
        gap:                 'clamp(16px, 2vw, 24px)',
        maxWidth:            1280,
        margin:              '0 auto',
      }}>
        {TRIPS.map((trip, i) => (
          <TripCard key={trip.id} trip={trip} index={i} />
        ))}
      </div>

      <style>{`
        /* 모바일: 섹션 패딩 축소 + 카드 1열 보장 */
        @media (max-width: 640px) {
          .popular-section { padding: 40px 16px 48px !important; }
        }
        @media (max-width: 480px) {
          .popular-section { padding: 36px 16px 44px !important; }
        }
      `}</style>

      {/* 더보기 */}
      <motion.div
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.4, delay: 0.3 }}
        style={{ textAlign: 'center', marginTop: 'clamp(32px, 4vh, 48px)' }}
      >
        <motion.button
          whileHover={{ y: -1, borderColor: '#6366F1', color: '#6366F1' }}
          transition={{ duration: 0.15 }}
          style={{
            padding:      '12px 32px',
            borderRadius: 14,
            border:       '1.5px solid #e2e8f0',
            background:   '#ffffff',
            fontSize:     14,
            fontWeight:   700,
            color:        '#374151',
            cursor:       'pointer',
            boxShadow:    '0 2px 8px rgba(0,0,0,0.05)',
          }}
        >
          더 많은 일정 보기 →
        </motion.button>
      </motion.div>
    </section>
  );
}
