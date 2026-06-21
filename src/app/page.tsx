import Image from 'next/image';
import { Star } from 'lucide-react';
import { APP_NAME } from '@/lib/config/site';
import Navbar from '@/components/landing/Navbar';
import PopularTrips from '@/components/landing/PopularTrips';
import FeaturesSection from '@/components/landing/FeaturesSection';
import HeroSearch from '@/components/landing/HeroSearch';
import CtaSection from '@/components/landing/CtaSection';
import SiteFooter from '@/components/landing/SiteFooter';
import { createClient } from '@/lib/supabase/server';

export default async function HomePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const isLoggedIn = !!user;

  return (
    <main style={{ background: '#ffffff' }}>

      <Navbar />

      {/* ── Hero: 좌우 분할 ── */}
      <section
        className="hero-section"
        style={{
          minHeight:  '100vh',
          display:    'flex',
          alignItems: 'stretch',
          position:   'relative',
          overflow:   'hidden',
          background: 'linear-gradient(160deg, #f8faff 0%, #fdf4ff 55%, #f0f4ff 100%)',
        }}
      >
        {/* 배경 블러 오브 */}
        <div style={{
          position:      'absolute', top: '10%', left: '5%',
          width:         'clamp(200px, 28vw, 480px)', height: 'clamp(200px, 28vw, 480px)',
          borderRadius:  '50%',
          background:    'radial-gradient(circle, #6366F118, transparent 70%)',
          pointerEvents: 'none',
        }} />
        <div style={{
          position:      'absolute', bottom: '5%', left: '20%',
          width:         'clamp(160px, 20vw, 360px)', height: 'clamp(160px, 20vw, 360px)',
          borderRadius:  '50%',
          background:    'radial-gradient(circle, #8B5CF614, transparent 70%)',
          pointerEvents: 'none',
        }} />

        {/* 내부 래퍼 */}
        <div
          className="hero-inner"
          style={{
            maxWidth:   1400,
            margin:     '0 auto',
            width:      '100%',
            padding:    '0 clamp(20px, 5vw, 80px)',
            display:    'flex',
            alignItems: 'center',
            gap:        'clamp(24px, 5vw, 80px)',
            position:   'relative',
            zIndex:     1,
          }}
        >
          {/* ── 좌측: 텍스트 + 검색창 ── */}
          <div
            className="hero-left"
            style={{
              flex:          '0 0 50%',
              maxWidth:      580,
              padding:       'clamp(48px, 7vh, 100px) 0',
              display:       'flex',
              flexDirection: 'column',
            }}
          >
            {/* 뱃지 */}
            <div className="hero-badge" style={{
              display:      'inline-flex',
              alignItems:   'center',
              gap:          7,
              background:   '#ffffff',
              border:       '1px solid #e0e7ff',
              borderRadius: 999,
              padding:      '7px 16px',
              marginBottom: 'clamp(16px, 2.5vh, 28px)',
              boxShadow:    '0 2px 12px rgba(99,102,241,0.12)',
              alignSelf:    'flex-start',
            }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#22c55e', display: 'inline-block' }} />
              <span style={{ fontSize: 13, fontWeight: 600, color: '#6366F1' }}>실시간 협업 여행 플래너</span>
            </div>

            {/* 메인 카피 — h1 단 1개 */}
            <h1 style={{
              fontSize:      'clamp(30px, 4.5vw, 64px)',
              fontWeight:    900,
              color:         '#0f172a',
              lineHeight:    1.1,
              marginBottom:  'clamp(12px, 1.8vh, 22px)',
              letterSpacing: '-0.03em',
              wordBreak:     'keep-all',
            }}>
              여행 일정,
              <br />
              <span style={{
                backgroundImage:      'linear-gradient(135deg, #6366F1, #8B5CF6)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor:  'transparent',
              }}>
                함께 만들어요
              </span>
            </h1>

            {/* 서브 카피 */}
            <p className="hero-subtext" style={{
              fontSize:     'clamp(14px, 1.1vw, 17px)',
              color:        '#475569',
              lineHeight:   1.8,
              marginBottom: 'clamp(24px, 4vh, 44px)',
              maxWidth:     460,
              wordBreak:    'keep-all',
            }}>
              지도 위에 장소를 추가하고, 팀원과 실시간으로 편집하세요.
              소요 시간과 경로가 자동으로 계산됩니다.
            </p>

            {/* 검색창 */}
            <div style={{ marginBottom: 'clamp(24px, 4vh, 44px)' }}>
              <HeroSearch />
            </div>

            {/* 소셜 프루프 */}
            <div className="hero-social" style={{ display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ display: 'flex' }}>
                  {['#6366F1','#EC4899','#10B981','#F97316'].map((c, i) => (
                    <div key={i} style={{
                      width: 28, height: 28, borderRadius: '50%', background: c,
                      border: '2px solid #fff', marginLeft: i === 0 ? 0 : -8,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: '#fff', fontWeight: 700, fontSize: 10,
                    }}>
                      {['K','J','M','S'][i]}
                    </div>
                  ))}
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>12,000+</div>
                  <div style={{ fontSize: 11, color: '#94a3b8' }}>여행 팀</div>
                </div>
              </div>

              <div className="hero-divider" style={{ width: 1, height: 28, background: '#e2e8f0' }} />

              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ display: 'flex', gap: 1 }}>
                  {[1,2,3,4,5].map(i => <Star key={i} size={13} fill="#FBBF24" color="#FBBF24" />)}
                </div>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>4.9</span>
                <span style={{ fontSize: 11, color: '#94a3b8' }}>평점</span>
              </div>

              <div className="hero-divider" style={{ width: 1, height: 28, background: '#e2e8f0' }} />

              <div>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>50+ </span>
                <span style={{ fontSize: 11, color: '#94a3b8' }}>여행지 지원</span>
              </div>
            </div>
          </div>

          {/* ── 우측: 메인 이미지 ── */}
          <div
            className="hero-right"
            style={{
              flex:           1,
              alignSelf:      'stretch',
              position:       'relative',
              display:        'flex',
              alignItems:     'flex-end',
              justifyContent: 'center',
              minHeight:      'clamp(420px, 70vh, 780px)',
            }}
          >
            <div className="hero-img-box border border-white/50" style={{
              width:        '100%',
              maxWidth:     'clamp(320px, 42vw, 640px)',
              height:       'clamp(420px, 65vh, 740px)',
              position:     'relative',
              borderRadius: '28px 28px 0 0',
              overflow:     'hidden',
              boxShadow:    '0 -8px 60px rgba(139,92,246,0.18), 0 32px 80px rgba(0,0,0,0.14), 0 0 0 1px rgba(139,92,246,0.08)',
              alignSelf:    'flex-end',
            }}>
              <Image
                src="/landing/hero.png"
                alt={`지도 위에 여행 장소가 핀으로 표시된 ${APP_NAME} 협업 플래너 화면`}
                fill
                priority
                sizes="(max-width: 768px) 100vw, 50vw"
                style={{ objectFit: 'cover', objectPosition: 'center top' }}
              />
              <div style={{
                position:      'absolute', bottom: 0, left: 0, right: 0,
                height:        120,
                background:    'linear-gradient(to top, rgba(248,250,255,0.6), transparent)',
                pointerEvents: 'none',
              }} />
            </div>

            {/* 플로팅 카드 1 */}
            <div className="hero-floating" style={{
              position:   'absolute', top: '12%', left: 'clamp(-12px, -2vw, 0px)',
              background: '#ffffff', borderRadius: 16, padding: '12px 16px',
              boxShadow:  '0 8px 32px rgba(0,0,0,0.12)',
              display:    'flex', alignItems: 'center', gap: 10, minWidth: 160,
              animation:  'floatY 3s ease-in-out infinite',
            }}>
              <div style={{ width: 34, height: 34, borderRadius: 10, background: 'linear-gradient(135deg, #6366F1, #8B5CF6)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <span style={{ fontSize: 16 }}>👥</span>
              </div>
              <div>
                <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 1 }}>지금 편집 중</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>3명 접속 중</div>
              </div>
              <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#22c55e', marginLeft: 'auto' }} />
            </div>

            {/* 플로팅 카드 2 */}
            <div className="hero-floating" style={{
              position:   'absolute', bottom: '22%', right: 'clamp(-12px, -1.5vw, 0px)',
              background: '#ffffff', borderRadius: 16, padding: '12px 16px',
              boxShadow:  '0 8px 32px rgba(0,0,0,0.12)', minWidth: 172,
              animation:  'floatY 3.5s ease-in-out infinite 0.8s',
            }}>
              <div style={{ fontSize: 10, color: '#94a3b8', marginBottom: 3 }}>📍 방금 추가됨</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', marginBottom: 2 }}>성산일출봉</div>
              <div style={{ fontSize: 11, color: '#6366F1', fontWeight: 600 }}>도보 12분 · 제주도</div>
            </div>

            {/* 플로팅 카드 3 */}
            <div className="hero-floating" style={{
              position:       'absolute', top: '38%', right: 'clamp(-8px, -1vw, 4px)',
              background:     'rgba(255,255,255,0.92)', backdropFilter: 'blur(10px)',
              borderRadius:   14, padding: '10px 14px',
              boxShadow:      '0 8px 24px rgba(0,0,0,0.10)',
              animation:      'floatY 4s ease-in-out infinite 1.5s',
            }}>
              <div style={{ fontSize: 10, color: '#94a3b8' }}>제주도 현재</div>
              <div style={{ fontSize: 'clamp(18px, 1.6vw, 24px)', fontWeight: 800, color: '#0f172a' }}>☀️ 24°C</div>
            </div>
          </div>
        </div>

        <style dangerouslySetInnerHTML={{ __html: `
          @keyframes floatY {
            0%, 100% { transform: translateY(0); }
            50%       { transform: translateY(-8px); }
          }

          /* 태블릿 (1024px 미만): 플로팅 카드 숨김 */
          @media (max-width: 1024px) {
            .hero-floating { display: none !important; }
          }

          /* 모바일 (768px 미만): 세로 스택 + 텍스트 중앙 정렬 */
          @media (max-width: 768px) {
            .hero-section { min-height: auto !important; }
            .hero-inner {
              flex-direction: column !important;
              gap: 32px !important;
              padding: 0 16px !important;
            }
            .hero-left {
              flex: none !important;
              max-width: 100% !important;
              width: 100% !important;
              padding: 32px 0 20px !important;
              align-items: center !important;
              text-align: center !important;
            }
            .hero-left h1 {
              font-size: clamp(24px, 7.5vw, 30px) !important;
              text-align: center !important;
            }
            .hero-subtext {
              max-width: 100% !important;
              text-align: center !important;
            }
            .hero-badge { align-self: center !important; }
            .hero-right {
              width: 100% !important;
              min-height: auto !important;
              max-height: none !important;
              align-self: auto !important;
              align-items: center !important;
              justify-content: center !important;
            }
            .hero-img-box {
              max-width: 100% !important;
              height: 400px !important;
              border-radius: 20px !important;
              align-self: auto !important;
            }
            .hero-divider { display: none !important; }
            .hero-social {
              gap: 12px !important;
              justify-content: center !important;
              flex-wrap: wrap !important;
            }
          }

          /* 소형 모바일 (480px 미만) */
          @media (max-width: 480px) {
            .hero-inner { padding: 0 16px !important; }
            .hero-left { padding: 24px 0 16px !important; }
            .hero-left h1 { font-size: 24px !important; }
            .hero-img-box { height: 280px !important; border-radius: 16px !important; }
            .hero-social { gap: 8px !important; font-size: 12px; }
          }
        ` }} />
      </section>

      {/* ── 서비스 특징 섹션 ── */}
      <FeaturesSection />

      {/* ── 인기 여행 일정 ── */}
      <PopularTrips />

      {/* ── CTA ── */}
      <CtaSection isLoggedIn={isLoggedIn} />

      <SiteFooter />
    </main>
  );
}
