import Link from 'next/link';
import { Navigation, MapPin, Users, ArrowRight, Star } from 'lucide-react';
import Navbar from '@/components/landing/Navbar';
import ScrollFeature from '@/components/landing/ScrollFeature';
import { createClient } from '@/lib/supabase/server';

export default async function HomePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const isLoggedIn = !!user;

  return (
    <main style={{ background: '#ffffff', overflowX: 'hidden' }}>

      {/* ── 네비게이션 바 ── */}
      <Navbar />

      {/* ── Hero ── */}
      <section
        className="hero-section"
        style={{
          minHeight:   '100vh',
          display:     'flex',
          alignItems:  'center',
          position:    'relative',
          overflow:    'hidden',
          background:  'linear-gradient(135deg, #f8faff 0%, #fdf4ff 100%)',
          paddingTop:  64,
        }}
      >
        {/* 배경 블러 오브 */}
        <div style={{
          position: 'absolute', top: '-10%', right: '-5%',
          width: 'clamp(300px, 35vw, 600px)', height: 'clamp(300px, 35vw, 600px)',
          borderRadius: '50%',
          background: 'radial-gradient(circle, #6366F125, transparent 70%)',
          pointerEvents: 'none',
        }} />
        <div style={{
          position: 'absolute', bottom: '-8%', left: '25%',
          width: 'clamp(240px, 28vw, 500px)', height: 'clamp(240px, 28vw, 500px)',
          borderRadius: '50%',
          background: 'radial-gradient(circle, #8B5CF620, transparent 70%)',
          pointerEvents: 'none',
        }} />

        {/* 콘텐츠 max-width 래퍼 */}
        <div
          className="hero-inner"
          style={{
            maxWidth:   1440,
            margin:     '0 auto',
            width:      '100%',
            padding:    'clamp(32px, 5vw, 80px) clamp(20px, 5vw, 80px) 0',
            display:    'flex',
            alignItems: 'center',
            gap:        'clamp(24px, 4vw, 80px)',
            position:   'relative',
            zIndex:     1,
          }}
        >
          {/* ── 왼쪽: 텍스트 ── */}
          <div
            className="hero-text"
            style={{
              flex:          '0 0 50%',
              maxWidth:      600,
              paddingBottom: 'clamp(32px, 5vh, 80px)',
            }}
          >
            {/* 뱃지 */}
            <div style={{
              display:      'inline-flex',
              alignItems:   'center',
              gap:          6,
              background:   '#ffffff',
              border:       '1px solid #e0e7ff',
              borderRadius: 999,
              padding:      '6px 14px',
              marginBottom: 'clamp(16px, 2vh, 28px)',
              boxShadow:    '0 2px 8px rgba(99,102,241,0.1)',
            }}>
              <span style={{
                width: 7, height: 7, borderRadius: '50%',
                background: '#22c55e', display: 'inline-block',
                animation: 'pulse 2s infinite',
              }} />
              <span style={{ fontSize: 'clamp(11px, 1vw, 13px)', fontWeight: 600, color: '#6366F1' }}>
                실시간 협업 여행 플래너
              </span>
            </div>

            {/* 메인 카피 */}
            <h1 style={{
              fontSize:      'clamp(32px, 4.5vw, 64px)',
              fontWeight:    900,
              color:         '#0f172a',
              lineHeight:    1.12,
              marginBottom:  'clamp(14px, 1.5vh, 20px)',
              letterSpacing: '-0.03em',
            }}>
              여행 일정,<br />
              <span style={{
                backgroundImage:      'linear-gradient(135deg, #6366F1, #8B5CF6)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor:  'transparent',
              }}>
                함께 만들어요
              </span>
            </h1>

            <p style={{
              fontSize:     'clamp(14px, 1.2vw, 18px)',
              color:        '#475569',
              lineHeight:   1.75,
              marginBottom: 'clamp(24px, 3vh, 40px)',
              maxWidth:     460,
            }}>
              지도 위에 장소를 추가하고, 팀원과 실시간으로 편집하세요.
              소요 시간과 경로가 자동으로 계산됩니다.
            </p>

            {/* CTA 버튼 */}
            <div className="hero-cta" style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 'clamp(28px, 4vh, 52px)' }}>
              <Link
                href="/room/new"
                style={{
                  display:        'inline-flex',
                  alignItems:     'center',
                  gap:            8,
                  padding:        'clamp(12px, 1.2vh, 16px) clamp(20px, 2vw, 32px)',
                  background:     'linear-gradient(135deg, #6366F1, #8B5CF6)',
                  color:          '#ffffff',
                  fontWeight:     700,
                  fontSize:       'clamp(13px, 1vw, 16px)',
                  borderRadius:   16,
                  textDecoration: 'none',
                  boxShadow:      '0 6px 24px rgba(99,102,241,0.40)',
                  whiteSpace:     'nowrap',
                }}
              >
                <Navigation size={18} />
                여행 시작
                <ArrowRight size={16} />
              </Link>

              {isLoggedIn ? (
                <Link
                  href="/my/trips"
                  style={{
                    display:        'inline-flex',
                    alignItems:     'center',
                    gap:            8,
                    padding:        'clamp(12px, 1.2vh, 16px) clamp(20px, 2vw, 32px)',
                    background:     '#ffffff',
                    color:          '#374151',
                    fontWeight:     700,
                    fontSize:       'clamp(13px, 1vw, 16px)',
                    borderRadius:   16,
                    textDecoration: 'none',
                    border:         '1.5px solid #e2e8f0',
                    whiteSpace:     'nowrap',
                  }}
                >
                  <MapPin size={18} />
                  여행 일지
                  <ArrowRight size={16} />
                </Link>
              ) : (
                <Link
                  href="/signup"
                  style={{
                    display:        'inline-flex',
                    alignItems:     'center',
                    gap:            8,
                    padding:        'clamp(12px, 1.2vh, 16px) clamp(20px, 2vw, 32px)',
                    background:     '#ffffff',
                    color:          '#374151',
                    fontWeight:     700,
                    fontSize:       'clamp(13px, 1vw, 16px)',
                    borderRadius:   16,
                    textDecoration: 'none',
                    border:         '1.5px solid #e2e8f0',
                    whiteSpace:     'nowrap',
                  }}
                >
                  <Users size={18} />
                  회원가입
                  <ArrowRight size={16} />
                </Link>
              )}
            </div>

            {/* 소셜 프루프 */}
            <div className="hero-social" style={{ display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ display: 'flex' }}>
                  {['#6366F1','#EC4899','#10B981','#F97316'].map((c, i) => (
                    <div key={i} style={{
                      width: 28, height: 28, borderRadius: '50%',
                      background: c, border: '2px solid #fff',
                      marginLeft: i === 0 ? 0 : -8, fontSize: 10,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: '#fff', fontWeight: 700,
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

              <div className="hero-social-divider" style={{ width: 1, height: 28, background: '#e2e8f0' }} />

              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ display: 'flex', gap: 1 }}>
                  {[1,2,3,4,5].map(i => (
                    <Star key={i} size={13} fill="#FBBF24" color="#FBBF24" />
                  ))}
                </div>
                <div>
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>4.9 </span>
                  <span style={{ fontSize: 11, color: '#94a3b8' }}>평점</span>
                </div>
              </div>

              <div className="hero-social-divider" style={{ width: 1, height: 28, background: '#e2e8f0' }} />

              <div>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>50+ </span>
                <span style={{ fontSize: 11, color: '#94a3b8' }}>여행지 지원</span>
              </div>
            </div>
          </div>

          {/* ── 오른쪽: 이미지 ── */}
          <div
            className="hero-image-wrap"
            style={{
              flex:           1,
              position:       'relative',
              display:        'flex',
              justifyContent: 'center',
              alignItems:     'flex-end',
              minHeight:      'clamp(380px, 65vh, 700px)',
              alignSelf:      'flex-end',
            }}
          >
            {/* 메인 이미지 */}
            <div style={{
              borderRadius: '24px 24px 0 0',
              overflow:     'hidden',
              width:        '100%',
              maxWidth:     'clamp(320px, 42vw, 620px)',
              height:       'clamp(320px, 60vh, 680px)',
              position:     'relative',
              boxShadow:    '0 32px 80px rgba(0,0,0,0.16)',
            }}>
              <img
                src="/landing/hero.png"
                alt="여행을 계획하는 사람"
                style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center' }}
              />
              <div style={{
                position:   'absolute',
                bottom:     0, left: 0, right: 0,
                height:     140,
                background: 'linear-gradient(to top, rgba(0,0,0,0.28), transparent)',
              }} />
            </div>

            {/* 플로팅 카드 1 */}
            <div className="hero-floating" style={{
              position:   'absolute',
              top:        '10%',
              left:       'clamp(-20px, -2vw, -8px)',
              background: '#ffffff',
              borderRadius: 16,
              padding:    '12px 16px',
              boxShadow:  '0 8px 32px rgba(0,0,0,0.12)',
              display:    'flex',
              alignItems: 'center',
              gap:        10,
              minWidth:   'clamp(140px, 14vw, 180px)',
            }}>
              <div style={{ width: 34, height: 34, borderRadius: 10, background: 'linear-gradient(135deg, #6366F1, #8B5CF6)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Users size={15} color="white" />
              </div>
              <div>
                <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 1 }}>지금 편집 중</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>3명 접속 중</div>
              </div>
              <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#22c55e', marginLeft: 'auto' }} />
            </div>

            {/* 플로팅 카드 2 */}
            <div className="hero-floating" style={{
              position:     'absolute',
              bottom:       '20%',
              right:        'clamp(-16px, -1.5vw, -8px)',
              background:   '#ffffff',
              borderRadius: 16,
              padding:      '12px 16px',
              boxShadow:    '0 8px 32px rgba(0,0,0,0.12)',
              minWidth:     'clamp(160px, 16vw, 200px)',
            }}>
              <div style={{ fontSize: 10, color: '#94a3b8', marginBottom: 3 }}>📍 방금 추가됨</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', marginBottom: 2 }}>성산일출봉</div>
              <div style={{ fontSize: 11, color: '#6366F1', fontWeight: 600 }}>도보 12분 · 제주도</div>
            </div>

            {/* 플로팅 카드 3 */}
            <div className="hero-floating" style={{
              position:       'absolute',
              top:            '36%',
              right:          'clamp(-10px, -1vw, -4px)',
              background:     'rgba(255,255,255,0.95)',
              borderRadius:   14,
              padding:        '10px 14px',
              boxShadow:      '0 8px 24px rgba(0,0,0,0.10)',
              backdropFilter: 'blur(8px)',
            }}>
              <div style={{ fontSize: 10, color: '#94a3b8' }}>제주도 현재</div>
              <div style={{ fontSize: 'clamp(16px, 1.5vw, 22px)', fontWeight: 800, color: '#0f172a' }}>☀️ 24°C</div>
            </div>
          </div>
        </div>
      </section>

      {/* ── 피처 섹션 ── */}
      <ScrollFeature />

      {/* ── CTA ── */}
      <section style={{
        padding:    'clamp(60px, 8vh, 100px) 5vw',
        textAlign:  'center',
        background: 'linear-gradient(135deg, #f0f0ff, #fdf4ff)',
      }}>
        <h2 style={{
          fontSize:     'clamp(24px, 3.5vw, 44px)',
          fontWeight:   800,
          color:        '#0f172a',
          marginBottom: 12,
          letterSpacing: '-0.02em',
        }}>
          지금 바로 시작해보세요
        </h2>
        <p style={{ fontSize: 'clamp(14px, 1.1vw, 17px)', color: '#64748b', marginBottom: 36, lineHeight: 1.7 }}>
          링크 하나로 팀원을 초대하고,<br />함께 완벽한 여행을 계획하세요.
        </p>
        <Link
          href="/room/new"
          style={{
            display:        'inline-flex',
            alignItems:     'center',
            gap:            8,
            padding:        'clamp(14px, 1.5vh, 18px) clamp(28px, 3vw, 44px)',
            background:     'linear-gradient(135deg, #6366F1, #8B5CF6)',
            color:          '#ffffff',
            fontWeight:     700,
            fontSize:       'clamp(14px, 1.1vw, 17px)',
            borderRadius:   18,
            textDecoration: 'none',
            boxShadow:      '0 6px 24px rgba(99,102,241,0.40)',
          }}
        >
          <Navigation size={20} />
          무료로 시작하기
        </Link>
      </section>

    </main>
  );
}
