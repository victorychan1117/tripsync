import Link from 'next/link';
import { Navigation, MapPin, Users, ArrowRight, Star } from 'lucide-react';
import Navbar from '@/components/landing/Navbar';
import ScrollFeature from '@/components/landing/ScrollFeature';

export default function HomePage() {
  return (
    <main style={{ background: '#ffffff' }}>

      {/* ── 네비게이션 바 ── */}
      <Navbar />

      {/* ── Hero ── */}
      <section
        style={{
          minHeight:      '100vh',
          paddingTop:     64,
          display:        'flex',
          alignItems:     'center',
          padding:        '64px 5vw 0',
          gap:            '4vw',
          overflow:       'hidden',
          position:       'relative',
          background:     'linear-gradient(135deg, #f8faff 0%, #fdf4ff 100%)',
        }}
      >
        {/* 배경 블러 오브 */}
        <div style={{
          position: 'absolute', top: -100, right: -100,
          width: 500, height: 500, borderRadius: '50%',
          background: 'radial-gradient(circle, #6366F125, transparent 70%)',
          pointerEvents: 'none',
        }} />
        <div style={{
          position: 'absolute', bottom: -80, left: '30%',
          width: 400, height: 400, borderRadius: '50%',
          background: 'radial-gradient(circle, #8B5CF620, transparent 70%)',
          pointerEvents: 'none',
        }} />

        {/* 왼쪽: 텍스트 */}
        <div style={{ flex: '0 0 52%', maxWidth: 560, paddingBottom: 60, position: 'relative', zIndex: 1 }}>

          {/* 뱃지 */}
          <div style={{
            display:      'inline-flex',
            alignItems:   'center',
            gap:          6,
            background:   '#ffffff',
            border:       '1px solid #e0e7ff',
            borderRadius: 999,
            padding:      '6px 14px',
            marginBottom: 28,
            boxShadow:    '0 2px 8px rgba(99,102,241,0.1)',
          }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#22c55e', display: 'inline-block', animation: 'pulse 2s infinite' }} />
            <span style={{ fontSize: 13, fontWeight: 600, color: '#6366F1' }}>실시간 협업 여행 플래너</span>
          </div>

          {/* 메인 카피 */}
          <h1 style={{ fontSize: 'clamp(36px, 5vw, 60px)', fontWeight: 900, color: '#0f172a', lineHeight: 1.15, marginBottom: 20, letterSpacing: '-0.03em' }}>
            여행 일정,<br />
            <span style={{
              backgroundImage:      'linear-gradient(135deg, #6366F1, #8B5CF6)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor:  'transparent',
            }}>
              함께 만들어요
            </span>
          </h1>

          <p style={{ fontSize: 17, color: '#475569', lineHeight: 1.75, marginBottom: 36, maxWidth: 440 }}>
            지도 위에 장소를 추가하고, 팀원과 실시간으로 편집하세요.
            소요 시간과 경로가 자동으로 계산됩니다.
          </p>

          {/* CTA 버튼 */}
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 48 }}>
            <Link
              href="/room/new"
              style={{
                display:        'inline-flex',
                alignItems:     'center',
                gap:            8,
                padding:        '14px 28px',
                background:     'linear-gradient(135deg, #6366F1, #8B5CF6)',
                color:          '#ffffff',
                fontWeight:     700,
                fontSize:       15,
                borderRadius:   16,
                textDecoration: 'none',
                boxShadow:      '0 6px 24px rgba(99,102,241,0.40)',
                transition:     'transform 0.2s, box-shadow 0.2s',
              }}
            >
              <Navigation size={18} />
              여행 시작
              <ArrowRight size={16} />
            </Link>
            <Link
              href="/explore/jeju"
              style={{
                display:        'inline-flex',
                alignItems:     'center',
                gap:            8,
                padding:        '14px 24px',
                background:     '#ffffff',
                color:          '#374151',
                fontWeight:     600,
                fontSize:       15,
                borderRadius:   16,
                textDecoration: 'none',
                border:         '1.5px solid #e2e8f0',
                transition:     'border-color 0.2s, background 0.2s',
              }}
            >
              <MapPin size={18} />
              일정 둘러보기
            </Link>
          </div>

          {/* 소셜 프루프 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap' }}>
            {/* 아바타 더미 */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ display: 'flex' }}>
                {['#6366F1','#EC4899','#10B981','#F97316'].map((c, i) => (
                  <div key={i} style={{
                    width: 30, height: 30, borderRadius: '50%',
                    background: c, border: '2px solid #fff',
                    marginLeft: i === 0 ? 0 : -8, fontSize: 11,
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

            <div style={{ width: 1, height: 32, background: '#e2e8f0' }} />

            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ display: 'flex', gap: 2 }}>
                {[1,2,3,4,5].map(i => (
                  <Star key={i} size={14} fill="#FBBF24" color="#FBBF24" />
                ))}
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>4.9</div>
                <div style={{ fontSize: 11, color: '#94a3b8' }}>평점</div>
              </div>
            </div>

            <div style={{ width: 1, height: 32, background: '#e2e8f0' }} />

            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>50+</div>
              <div style={{ fontSize: 11, color: '#94a3b8' }}>여행지 지원</div>
            </div>
          </div>
        </div>

        {/* 오른쪽: 이미지 카드 */}
        <div style={{ flex: 1, position: 'relative', zIndex: 1, display: 'flex', justifyContent: 'center', alignItems: 'flex-end', minHeight: '80vh' }}>

          {/* 메인 이미지 */}
          <div style={{
            borderRadius: '28px 28px 0 0',
            overflow:     'hidden',
            width:        '100%',
            maxWidth:     560,
            height:       '75vh',
            position:     'relative',
            boxShadow:    '0 32px 80px rgba(0,0,0,0.18)',
          }}>
            <img
              src="/landing/hero.png"
              alt="여행을 계획하는 사람"
              style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center' }}
            />
            {/* 이미지 하단 그라디언트 */}
            <div style={{
              position:   'absolute',
              bottom:     0, left: 0, right: 0,
              height:     120,
              background: 'linear-gradient(to top, rgba(0,0,0,0.3), transparent)',
            }} />
          </div>

          {/* 플로팅 카드 1 — 현재 참여 중 */}
          <div style={{
            position:     'absolute',
            top:          '12%',
            left:         -20,
            background:   '#ffffff',
            borderRadius: 16,
            padding:      '12px 16px',
            boxShadow:    '0 8px 32px rgba(0,0,0,0.12)',
            display:      'flex',
            alignItems:   'center',
            gap:          10,
            minWidth:     160,
          }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg, #6366F1, #8B5CF6)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Users size={16} color="white" />
            </div>
            <div>
              <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 1 }}>지금 편집 중</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>3명 접속 중</div>
            </div>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#22c55e', marginLeft: 'auto' }} />
          </div>

          {/* 플로팅 카드 2 — 장소 추가됨 */}
          <div style={{
            position:     'absolute',
            bottom:       '18%',
            right:        -16,
            background:   '#ffffff',
            borderRadius: 16,
            padding:      '12px 16px',
            boxShadow:    '0 8px 32px rgba(0,0,0,0.12)',
            minWidth:     180,
          }}>
            <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 4 }}>📍 방금 추가됨</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', marginBottom: 2 }}>성산일출봉</div>
            <div style={{ fontSize: 12, color: '#6366F1', fontWeight: 600 }}>도보 12분 · 제주도</div>
          </div>

          {/* 플로팅 카드 3 — 날씨 */}
          <div style={{
            position:     'absolute',
            top:          '38%',
            right:        -8,
            background:   'rgba(255,255,255,0.95)',
            borderRadius: 16,
            padding:      '10px 14px',
            boxShadow:    '0 8px 24px rgba(0,0,0,0.10)',
            backdropFilter: 'blur(8px)',
          }}>
            <div style={{ fontSize: 11, color: '#94a3b8' }}>제주도 현재</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: '#0f172a' }}>☀️ 24°C</div>
          </div>
        </div>
      </section>

      {/* ── 피처 섹션 ── */}
      <ScrollFeature />

      {/* ── CTA ── */}
      <section style={{
        padding:    '80px 5vw',
        textAlign:  'center',
        background: 'linear-gradient(135deg, #f0f0ff, #fdf4ff)',
      }}>
        <h2 style={{ fontSize: 'clamp(26px, 4vw, 40px)', fontWeight: 800, color: '#0f172a', marginBottom: 12 }}>
          지금 바로 시작해보세요
        </h2>
        <p style={{ fontSize: 16, color: '#64748b', marginBottom: 36, lineHeight: 1.7 }}>
          링크 하나로 팀원을 초대하고,<br />함께 완벽한 여행을 계획하세요.
        </p>
        <Link
          href="/room/new"
          style={{
            display:        'inline-flex',
            alignItems:     'center',
            gap:            8,
            padding:        '16px 36px',
            background:     'linear-gradient(135deg, #6366F1, #8B5CF6)',
            color:          '#ffffff',
            fontWeight:     700,
            fontSize:       16,
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
