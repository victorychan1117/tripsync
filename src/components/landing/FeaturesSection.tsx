'use client';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { APP_NAME } from '@/lib/config/site';

const FEATURES = [
  {
    image:    '/images/feature1.png',
    imageAlt: '낯선 여행지의 골목을 혼자 걸으며 새로운 나를 발견하는 여행자 일러스트',
    title:    '새로운 곳에서 나를 발견하는 여행',
    sub:      '낯선 풍경과 경험이 당신의 일상을 더욱 풍요롭게 만들어줘요.',
    gradient: ['#6366F1', '#8B5CF6'] as [string, string],
    accent:   '#6366F115',
  },
  {
    image:    '/images/feature2.png',
    imageAlt: '스마트폰으로 여행 일정을 손쉽게 계획하는 모습을 담은 일러스트',
    title:    '계획부터 추억까지, 여행을 더 쉽고 편하게',
    sub:      '복잡한 여행 준비는 줄이고, 설레는 순간에 더 집중하세요.',
    gradient: ['#0EA5E9', '#6366F1'] as [string, string],
    accent:   '#0EA5E915',
  },
  {
    image:    '/images/feature3.png',
    imageAlt: '취향에 맞는 여행지를 추천해주는 맞춤형 여행 서비스 일러스트',
    title:    '당신의 여행 스타일에 딱 맞는 맞춤 추천',
    sub:      '취향과 목적에 맞는 여행지를 추천받고 완벽한 여행을 만들어보세요.',
    gradient: ['#10B981', '#0EA5E9'] as [string, string],
    accent:   '#10B98115',
  },
] as const;

const circleVariants = {
  visible: { scale: 1 },
  hover:   { scale: 1.07 },
};

function FeatureCard({ feature, index }: { feature: typeof FEATURES[number]; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 32 }}
      whileInView={{ opacity: 1, y: 0 }}
      whileHover="hover"
      viewport={{ once: true, amount: 0.1 }}
      transition={{ duration: 0.6, delay: index * 0.12 }}
      style={{
        display:       'flex',
        flexDirection: 'column',
        alignItems:    'center',
        textAlign:     'center',
      }}
    >
      {/* 원형 이미지 */}
      <motion.div
        variants={{
          visible: { boxShadow: `0 6px 24px rgba(0,0,0,0.08), 0 0 0 3px ${feature.gradient[0]}14` },
          hover:   { boxShadow: `0 20px 48px rgba(0,0,0,0.14), 0 0 0 6px ${feature.gradient[0]}22`, y: -5 },
        }}
        transition={{ duration: 0.3 }}
        className="feature-circle"
        style={{
          borderRadius: '50%',
          overflow:     'hidden',
          position:     'relative',
          marginBottom: 'clamp(20px, 2.8vh, 36px)',
          flexShrink:   0,
          border:       `3px solid ${feature.gradient[0]}28`,
          background:   feature.accent,
        }}
      >
        <motion.div
          variants={circleVariants}
          transition={{ duration: 0.5 }}
          style={{ position: 'absolute', inset: 0 }}
        >
          <Image
            src={feature.image}
            alt={feature.imageAlt}
            fill
            style={{ objectFit: 'cover', objectPosition: 'center' }}
          />
        </motion.div>
      </motion.div>

      {/* 텍스트 */}
      <div style={{ padding: '0 clamp(4px, 1.5vw, 20px)' }}>
        <span style={{
          display:       'inline-block',
          fontSize:      11,
          fontWeight:    700,
          letterSpacing: '0.14em',
          color:         feature.gradient[0],
          background:    feature.accent,
          padding:       '4px 12px',
          borderRadius:  999,
          marginBottom:  10,
        }}>
          0{index + 1}
        </span>

        <h3 style={{
          fontSize:      'clamp(14px, 1.2vw, 19px)',
          fontWeight:    800,
          color:         '#0f172a',
          lineHeight:    1.4,
          marginBottom:  8,
          letterSpacing: '-0.01em',
          wordBreak:     'keep-all',
        }}>
          {feature.title}
        </h3>

        <p style={{
          fontSize:   'clamp(12px, 0.9vw, 14px)',
          color:      '#64748b',
          lineHeight: 1.75,
          wordBreak:  'keep-all',
        }}>
          {feature.sub}
        </p>
      </div>
    </motion.div>
  );
}

export default function FeaturesSection() {
  return (
    <section className="features-section" style={{
      padding:    'clamp(56px, 9vh, 110px) clamp(20px, 5vw, 80px)',
      background: '#ffffff',
    }}>
      {/* 헤더 */}
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.2 }}
        transition={{ duration: 0.6 }}
        style={{ textAlign: 'center', marginBottom: 'clamp(36px, 6vh, 72px)' }}
      >
        <span style={{
          display:       'inline-block',
          fontSize:      11,
          fontWeight:    700,
          letterSpacing: '0.18em',
          textTransform: 'uppercase' as const,
          color:         '#6366F1',
          background:    '#6366F115',
          padding:       '6px 16px',
          borderRadius:  999,
          marginBottom:  16,
        }}>
          Why {APP_NAME}
        </span>
        <h2 style={{
          fontSize:      'clamp(22px, 3vw, 42px)',
          fontWeight:    800,
          color:         '#0f172a',
          lineHeight:    1.2,
          letterSpacing: '-0.02em',
          wordBreak:     'keep-all',
        }}>
          여행이 더 특별해지는 이유
        </h2>
      </motion.div>

      {/* 3열 그리드 */}
      <div className="features-grid" style={{ maxWidth: 1100, margin: '0 auto' }}>
        {FEATURES.map((f, i) => (
          <FeatureCard key={i} feature={f} index={i} />
        ))}
      </div>

      <style>{`
        .features-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: clamp(24px, 4vw, 64px);
        }
        .feature-circle {
          width: clamp(180px, 20vw, 280px);
          height: clamp(180px, 20vw, 280px);
        }

        /* 태블릿 (900px 미만): 원형 약간 축소 */
        @media (max-width: 900px) {
          .feature-circle {
            width: clamp(130px, 16vw, 200px) !important;
            height: clamp(130px, 16vw, 200px) !important;
          }
        }

        /* 모바일 (640px 미만): 1열 + 섹션 패딩 축소 */
        @media (max-width: 640px) {
          .features-section {
            padding: 40px 16px 48px !important;
          }
          .features-grid {
            grid-template-columns: 1fr !important;
            gap: 32px !important;
          }
          .feature-circle {
            width: 180px !important;
            height: 180px !important;
          }
        }

        /* 소형 모바일 (480px 미만) */
        @media (max-width: 480px) {
          .features-section { padding: 36px 16px 44px !important; }
          .feature-circle { width: 160px !important; height: 160px !important; }
        }
      `}</style>
    </section>
  );
}
