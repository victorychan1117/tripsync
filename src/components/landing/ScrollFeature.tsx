'use client';
import { useRef, useEffect, useState } from 'react';

const SLIDES = [
  {
    id: 1,
    title: '여행의 모든 순간',
    highlight: '더 특별하게',
    desc: '나에게 꼭 맞는 여행을 찾고 더 쉽게 계획하세요.',
    image: '/landing/slide1.png',
    from: '#6366F1', to: '#8B5CF6',
    size: 'large',
  },
  {
    id: 2,
    title: '내 취향에 맞는 여행',
    highlight: '더 쉽게 찾기',
    desc: '도시 여행부터 힐링 코스까지 추천해드려요.',
    image: '/landing/slide2.png',
    from: '#0EA5E9', to: '#6366F1',
    size: 'normal',
  },
  {
    id: 3,
    title: '여행지의 지금 정보',
    highlight: '한눈에 확인',
    desc: '날씨, 인기 스팟, 현지 분위기를 빠르게 살펴보세요.',
    image: '/landing/slide3.png',
    from: '#10B981', to: '#0EA5E9',
    size: 'normal',
  },
  {
    id: 4,
    title: '한국 여행의 감성',
    highlight: '더 깊이 즐기기',
    desc: '한옥 골목, 감성 카페, 야경 명소까지.',
    image: '/landing/slide4.png',
    from: '#F97316', to: '#EC4899',
    size: 'normal',
  },
  {
    id: 5,
    title: '베트남 여행의 감성',
    highlight: '더 깊이 즐기기',
    desc: '올드타운 골목, 로컬 맛집, 야경까지.',
    image: '/landing/slide5.png',
    from: '#EC4899', to: '#F97316',
    size: 'normal',
  },
  {
    id: 6,
    title: '일본 여행의 감성',
    highlight: '더 깊이 만나기',
    desc: '골목, 맛집, 카페, 온천까지.',
    image: '/landing/slide6.png',
    from: '#8B5CF6', to: '#EC4899',
    size: 'normal',
  },
  {
    id: 7,
    title: '유럽 여행의 감성',
    highlight: '더 깊이 즐기기',
    desc: '낭만적인 도시, 로컬 맛집, 감성 카페까지.',
    image: '/landing/slide7.png',
    from: '#6366F1', to: '#0EA5E9',
    size: 'large',
  },
] as const;

function useInView(threshold = 0.12) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) setVisible(true); },
      { threshold }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return { ref, visible };
}

function DestinationCard({
  slide,
  index,
  large = false,
}: {
  slide: typeof SLIDES[number];
  index: number;
  large?: boolean;
}) {
  const { ref, visible } = useInView();

  return (
    <div
      ref={ref}
      style={{
        opacity:    visible ? 1 : 0,
        transform:  visible ? 'translateY(0)' : 'translateY(32px)',
        transition: `opacity 0.55s ease ${index * 0.07}s, transform 0.55s ease ${index * 0.07}s, box-shadow 0.25s ease`,
        borderRadius: 'clamp(16px, 1.5vw, 24px)',
        overflow:     'hidden',
        background:   '#ffffff',
        boxShadow:    '0 2px 20px rgba(0,0,0,0.06)',
        cursor:       'pointer',
        gridColumn:   large ? 'span 2' : 'span 1',
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLElement).style.transform = 'translateY(-5px)';
        (e.currentTarget as HTMLElement).style.boxShadow = '0 16px 48px rgba(0,0,0,0.12)';
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
        (e.currentTarget as HTMLElement).style.boxShadow = '0 2px 20px rgba(0,0,0,0.06)';
      }}
    >
      {/* 이미지 영역 — aspect-ratio 기반으로 화면 크기에 자동 대응 */}
      <div
        className={large ? 'dest-card-img-large' : 'dest-card-img'}
        style={{
          width:       '100%',
          aspectRatio: large ? '16/7' : '4/3',
          overflow:    'hidden',
          position:    'relative',
          background:  `linear-gradient(135deg, ${slide.from}18, ${slide.to}18)`,
          flexShrink:  0,
        }}
      >
        <img
          src={slide.image}
          alt={slide.title}
          style={{
            width:          '100%',
            height:         '100%',
            objectFit:      'contain',
            objectPosition: 'center',
            transition:     'transform 0.4s ease',
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLImageElement).style.transform = 'scale(1.05)'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLImageElement).style.transform = 'scale(1)'; }}
        />
        <div style={{
          position:      'absolute',
          bottom:        0, left: 0, right: 0,
          height:        '28%',
          background:    `linear-gradient(to top, ${slide.from}20, transparent)`,
          pointerEvents: 'none',
        }} />
      </div>

      {/* 텍스트 영역 */}
      <div style={{ padding: 'clamp(14px, 1.4vw, 24px)' }}>
        <span style={{
          display:       'inline-block',
          fontSize:      'clamp(10px, 0.75vw, 12px)',
          fontWeight:    700,
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          color:         slide.from,
          background:    `${slide.from}18`,
          padding:       '4px 10px',
          borderRadius:  999,
          marginBottom:  'clamp(8px, 0.7vw, 12px)',
        }}>
          {String(index + 1).padStart(2, '0')}
        </span>
        <h3 style={{
          fontSize:     'clamp(14px, 1.1vw, 18px)',
          fontWeight:   800,
          color:        '#0f172a',
          marginBottom: 4,
          lineHeight:   1.3,
        }}>
          {slide.title}
        </h3>
        <p style={{
          fontSize:             'clamp(13px, 0.95vw, 15px)',
          fontWeight:           700,
          backgroundImage:      `linear-gradient(135deg, ${slide.from}, ${slide.to})`,
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor:  'transparent',
          marginBottom:         8,
        }}>
          {slide.highlight}
        </p>
        <p style={{
          fontSize:   'clamp(11px, 0.85vw, 13px)',
          color:      '#94a3b8',
          lineHeight: 1.65,
        }}>
          {slide.desc}
        </p>
      </div>
    </div>
  );
}

export default function ScrollFeature() {
  const { ref: headerRef, visible: headerVisible } = useInView(0.25);

  return (
    <section style={{
      padding:    'clamp(60px, 8vh, 100px) 5vw clamp(60px, 8vh, 120px)',
      background: '#f8fafc',
    }}>
      {/* 섹션 헤더 */}
      <div
        ref={headerRef}
        style={{
          textAlign:    'center',
          marginBottom: 'clamp(36px, 5vh, 60px)',
          opacity:      headerVisible ? 1 : 0,
          transform:    headerVisible ? 'translateY(0)' : 'translateY(24px)',
          transition:   'opacity 0.6s ease, transform 0.6s ease',
        }}
      >
        <span style={{
          display:       'inline-block',
          fontSize:      'clamp(10px, 0.8vw, 12px)',
          fontWeight:    700,
          letterSpacing: '0.18em',
          textTransform: 'uppercase',
          color:         '#6366F1',
          background:    '#6366F118',
          padding:       '6px 16px',
          borderRadius:  999,
          marginBottom:  'clamp(12px, 1.5vh, 18px)',
        }}>
          Destinations
        </span>
        <h2 style={{
          fontSize:      'clamp(24px, 3vw, 44px)',
          fontWeight:    800,
          color:         '#0f172a',
          lineHeight:    1.2,
          marginBottom:  12,
          letterSpacing: '-0.02em',
        }}>
          어디로 떠나고 싶으세요?
        </h2>
        <p style={{
          fontSize:   'clamp(13px, 1vw, 16px)',
          color:      '#64748b',
          lineHeight: 1.7,
          maxWidth:   520,
          margin:     '0 auto',
        }}>
          국내부터 해외까지, 취향에 맞는 여행지를 골라 팀원과 함께 계획해보세요.
        </p>
      </div>

      {/* 카드 그리드 */}
      <div
        className="dest-grid"
        style={{
          display:             'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap:                 'clamp(16px, 1.8vw, 28px)',
          maxWidth:            'clamp(900px, 85vw, 1280px)',
          margin:              '0 auto',
        }}
      >
        {SLIDES.map((slide, i) => (
          <DestinationCard
            key={slide.id}
            slide={slide}
            index={i}
            large={slide.size === 'large'}
          />
        ))}
      </div>
    </section>
  );
}
