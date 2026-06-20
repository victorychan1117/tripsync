'use client';
import Link from 'next/link';
import { Users } from 'lucide-react';

export default function CtaSection({ isLoggedIn }: { isLoggedIn: boolean }) {
  return (
    <section className="cta-section" style={{
      padding:    'clamp(56px, 10vh, 120px) clamp(20px, 5vw, 80px)',
      textAlign:  'center',
      background: 'linear-gradient(160deg, #f0f0ff 0%, #fdf4ff 50%, #f0f4ff 100%)',
      position:   'relative',
      overflow:   'hidden',
    }}>
      <div style={{
        position:      'absolute', top: '-20%', left: '50%', transform: 'translateX(-50%)',
        width: '60vw', height: '60vw', maxWidth: 700, maxHeight: 700,
        borderRadius:  '50%',
        background:    'radial-gradient(circle, #6366F110, transparent 70%)',
        pointerEvents: 'none',
      }} />

      <div style={{ position: 'relative', zIndex: 1, maxWidth: 560, margin: '0 auto' }}>
        <div style={{
          width: 56, height: 56, borderRadius: 16,
          background:     'linear-gradient(135deg, #6366F1, #8B5CF6)',
          display:        'flex', alignItems: 'center', justifyContent: 'center',
          margin:         '0 auto 20px',
          boxShadow:      '0 8px 24px rgba(99,102,241,0.35)',
          fontSize:       24,
        }}>
          ✈️
        </div>

        <h2 style={{
          fontSize:      'clamp(24px, 3.5vw, 48px)',
          fontWeight:    800,
          color:         '#0f172a',
          marginBottom:  14,
          letterSpacing: '-0.02em',
          lineHeight:    1.2,
          wordBreak:     'keep-all',
        }}>
          지금 바로 시작해보세요
        </h2>
        <p style={{
          fontSize:     'clamp(14px, 1.1vw, 17px)',
          color:        '#64748b',
          marginBottom: 'clamp(28px, 4vh, 40px)',
          lineHeight:   1.75,
          wordBreak:    'keep-all',
        }}>
          링크 하나로 팀원을 초대하고,
          <br />
          완벽한 여행을 함께 계획하세요.
        </p>

        <div className="cta-buttons" style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link
            href="/room/new"
            className="cta-primary"
            style={{
              display:        'inline-flex',
              alignItems:     'center',
              gap:            8,
              padding:        'clamp(14px, 1.6vh, 18px) clamp(24px, 3vw, 44px)',
              background:     'linear-gradient(135deg, #6366F1, #8B5CF6)',
              color:          '#ffffff',
              fontWeight:     700,
              fontSize:       'clamp(14px, 1.1vw, 17px)',
              borderRadius:   18,
              textDecoration: 'none',
              boxShadow:      '0 8px 28px rgba(99,102,241,0.42)',
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)';
              (e.currentTarget as HTMLElement).style.boxShadow = '0 12px 36px rgba(99,102,241,0.52)';
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
              (e.currentTarget as HTMLElement).style.boxShadow = '0 8px 28px rgba(99,102,241,0.42)';
            }}
          >
            🚀 무료로 시작하기
          </Link>

          {!isLoggedIn && (
            <Link
              href="/login"
              className="cta-secondary"
              style={{
                display:        'inline-flex',
                alignItems:     'center',
                gap:            8,
                padding:        'clamp(14px, 1.6vh, 18px) clamp(24px, 3vw, 44px)',
                background:     '#ffffff',
                color:          '#374151',
                fontWeight:     700,
                fontSize:       'clamp(14px, 1.1vw, 17px)',
                borderRadius:   18,
                textDecoration: 'none',
                border:         '1.5px solid #e2e8f0',
                boxShadow:      '0 2px 8px rgba(0,0,0,0.05)',
              }}
            >
              <Users size={18} />
              로그인
            </Link>
          )}
        </div>

        <p style={{ fontSize: 13, color: '#94a3b8', marginTop: 20 }}>
          💳 신용카드 불필요 · ⚡ 가입 후 즉시 사용 가능
        </p>
      </div>

      <style>{`
        /* 모바일: 섹션 패딩 축소 */
        @media (max-width: 640px) {
          .cta-section { padding: 48px 16px 56px !important; }
        }
        @media (max-width: 480px) {
          .cta-section { padding: 40px 16px 48px !important; }
          .cta-buttons { flex-direction: column !important; align-items: stretch !important; }
          .cta-primary, .cta-secondary {
            justify-content: center !important;
            width: 100% !important;
          }
        }
      `}</style>
    </section>
  );
}
