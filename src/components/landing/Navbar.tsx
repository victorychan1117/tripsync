'use client';
import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import BrandLogo from '@/components/brand/BrandLogo';
import { LogOut, User, Mail, Calendar, X, BookOpen, Heart, Bell } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { APP_NAME } from '@/lib/config/site';
import { useUnreadNotificationCount } from '@/hooks/useUnreadNotificationCount';
import type { User as SupabaseUser } from '@supabase/supabase-js';

// ── 내 정보 모달 ──────────────────────────────────────────────────
function ProfileModal({ user, onClose }: { user: SupabaseUser; onClose: () => void }) {
  const name      = user.user_metadata?.full_name ?? user.email?.split('@')[0] ?? '사용자';
  const email     = user.email ?? '';
  const joinedAt  = new Date(user.created_at).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' });
  const initial   = name.charAt(0).toUpperCase();

  return (
    <div
      style={{
        position:       'fixed',
        inset:          0,
        zIndex:         200,
        display:        'flex',
        alignItems:     'center',
        justifyContent: 'center',
        background:     'rgba(15,23,42,0.45)',
        backdropFilter: 'blur(4px)',
      }}
      onClick={onClose}
    >
      <div
        style={{
          background:   '#ffffff',
          borderRadius: 28,
          padding:      '40px 36px',
          width:        '100%',
          maxWidth:     400,
          boxShadow:    '0 32px 80px rgba(0,0,0,0.2)',
          position:     'relative',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* 닫기 */}
        <button
          onClick={onClose}
          style={{
            position:   'absolute',
            top:        16,
            right:      16,
            background: '#f1f5f9',
            border:     'none',
            borderRadius: 10,
            width:      32,
            height:     32,
            display:    'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor:     'pointer',
            color:      '#64748b',
          }}
        >
          <X size={16} />
        </button>

        {/* 아바타 */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 32 }}>
          <div style={{
            width:          80,
            height:         80,
            borderRadius:   '50%',
            background:     'linear-gradient(135deg, #6366F1, #8B5CF6)',
            display:        'flex',
            alignItems:     'center',
            justifyContent: 'center',
            fontSize:       32,
            fontWeight:     800,
            color:          '#ffffff',
            marginBottom:   16,
            boxShadow:      '0 8px 24px rgba(99,102,241,0.35)',
          }}>
            {initial}
          </div>
          <h2 style={{ fontSize: 22, fontWeight: 800, color: '#0f172a', marginBottom: 4 }}>{name}</h2>
          <span style={{
            fontSize:   12,
            fontWeight: 600,
            color:      '#6366F1',
            background: '#6366F115',
            padding:    '3px 10px',
            borderRadius: 999,
          }}>
            {APP_NAME} 멤버
          </span>
        </div>

        {/* 정보 목록 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{
            display:    'flex',
            alignItems: 'center',
            gap:        12,
            padding:    '14px 16px',
            background: '#f8fafc',
            borderRadius: 14,
          }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: '#e0e7ff',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <User size={16} color="#6366F1" />
            </div>
            <div>
              <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 2 }}>닉네임</div>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#0f172a' }}>{name}</div>
            </div>
          </div>

          <div style={{
            display:    'flex',
            alignItems: 'center',
            gap:        12,
            padding:    '14px 16px',
            background: '#f8fafc',
            borderRadius: 14,
          }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: '#e0e7ff',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Mail size={16} color="#6366F1" />
            </div>
            <div>
              <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 2 }}>이메일</div>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#0f172a' }}>{email}</div>
            </div>
          </div>

          <div style={{
            display:    'flex',
            alignItems: 'center',
            gap:        12,
            padding:    '14px 16px',
            background: '#f8fafc',
            borderRadius: 14,
          }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: '#e0e7ff',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Calendar size={16} color="#6366F1" />
            </div>
            <div>
              <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 2 }}>가입일</div>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#0f172a' }}>{joinedAt}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── 네비바 ────────────────────────────────────────────────────────
export default function Navbar() {
  const router = useRouter();
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [scrolled,      setScrolled]      = useState(false);
  const [user,          setUser]          = useState<SupabaseUser | null>(null);
  const [loading,       setLoading]       = useState(true);
  const [dropdownOpen,  setDropdownOpen]  = useState(false);
  const [profileOpen,   setProfileOpen]   = useState(false);

  const { count: unreadCount } = useUnreadNotificationCount(!!user);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handler, { passive: true });
    return () => window.removeEventListener('scroll', handler);
  }, []);

  useEffect(() => {
    const supabase = createClient();

    // onAuthStateChange fires with INITIAL_SESSION immediately (cookie read, no network call)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event: string, session: { user: SupabaseUser } | null) => {
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  // 드롭다운 바깥 클릭 닫기
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    setDropdownOpen(false);
    router.refresh();
  };

  const name    = user?.user_metadata?.full_name ?? user?.email?.split('@')[0] ?? '사용자';
  const initial = name.charAt(0).toUpperCase();

  return (
    <>
      <header
        style={{
          position:       'sticky',
          top:            0,
          zIndex:         100,
          padding:        '0 5vw',
          height:         64,
          display:        'flex',
          alignItems:     'center',
          justifyContent: 'space-between',
          backdropFilter: scrolled ? 'blur(16px)' : 'blur(8px)',
          background:     scrolled ? 'rgba(255,255,255,0.92)' : 'rgba(255,255,255,0.75)',
          borderBottom:   '1px solid rgba(0,0,0,0.06)',
          transition:     'background 0.3s ease, backdrop-filter 0.3s ease',
        }}
      >
        {/* 로고 */}
        <Link href="/" className="group text-decoration-none" style={{ textDecoration: 'none' }}>
          <BrandLogo size="sm" />
        </Link>

        {/* 우측 */}
        {!loading && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {user ? (
              <>
                {/* 알림 */}
                <Link
                  href="/my/notifications"
                  aria-label="알림"
                  style={{
                    position:       'relative',
                    width:          40,
                    height:         40,
                    borderRadius:   '50%',
                    background:     '#f8fafc',
                    border:         '1px solid #e2e8f0',
                    display:        'flex',
                    alignItems:     'center',
                    justifyContent: 'center',
                    textDecoration: 'none',
                    transition:     'background 0.15s, transform 0.15s',
                  }}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLElement).style.background = '#f1f5f9';
                    (e.currentTarget as HTMLElement).style.transform = 'scale(1.05)';
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLElement).style.background = '#f8fafc';
                    (e.currentTarget as HTMLElement).style.transform = 'scale(1)';
                  }}
                >
                  <Bell size={18} color="#6366F1" />
                  {unreadCount > 0 && (
                    <span style={{
                      position:        'absolute',
                      top:               -2,
                      right:             -2,
                      minWidth:          18,
                      height:            18,
                      padding:           '0 5px',
                      borderRadius:      999,
                      background:        '#ef4444',
                      color:             '#ffffff',
                      fontSize:          10,
                      fontWeight:        800,
                      display:           'flex',
                      alignItems:        'center',
                      justifyContent:    'center',
                      border:            '2px solid #ffffff',
                      boxShadow:         '0 2px 6px rgba(239,68,68,0.4)',
                    }}>
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                  )}
                </Link>

                {/* 아바타 드롭다운 */}
              <div ref={dropdownRef} style={{ position: 'relative' }}>
                <button
                  onClick={() => setDropdownOpen(v => !v)}
                  style={{
                    width:          40,
                    height:         40,
                    borderRadius:   '50%',
                    background:     'linear-gradient(135deg, #6366F1, #8B5CF6)',
                    border:         dropdownOpen ? '2.5px solid #6366F1' : '2.5px solid transparent',
                    display:        'flex',
                    alignItems:     'center',
                    justifyContent: 'center',
                    cursor:         'pointer',
                    fontSize:       16,
                    fontWeight:     800,
                    color:          '#ffffff',
                    boxShadow:      '0 2px 10px rgba(99,102,241,0.35)',
                    transition:     'transform 0.15s, box-shadow 0.15s',
                  }}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLElement).style.transform = 'scale(1.08)';
                    (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 16px rgba(99,102,241,0.45)';
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLElement).style.transform = 'scale(1)';
                    (e.currentTarget as HTMLElement).style.boxShadow = '0 2px 10px rgba(99,102,241,0.35)';
                  }}
                >
                  <User size={18} color="white" />
                </button>

                {/* 드롭다운 */}
                {dropdownOpen && (
                  <div className="nav-dropdown" style={{
                    position:     'absolute',
                    top:          'calc(100% + 10px)',
                    right:        0,
                    background:   '#ffffff',
                    borderRadius: 18,
                    boxShadow:    '0 16px 48px rgba(0,0,0,0.14)',
                    border:       '1px solid #f1f5f9',
                    overflow:     'hidden',
                    minWidth:     200,
                    animation:    'dropdownIn 0.18s ease',
                  }}>
                    {/* 유저 헤더 */}
                    <div style={{
                      padding:    '16px 18px 12px',
                      borderBottom: '1px solid #f1f5f9',
                    }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>{name}</div>
                      <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>{user.email}</div>
                    </div>

                    {/* 알림 */}
                    <Link
                      href="/my/notifications"
                      onClick={() => setDropdownOpen(false)}
                      style={{
                        width:      '100%',
                        display:    'flex',
                        alignItems: 'center',
                        gap:        10,
                        padding:    '12px 18px',
                        fontSize:   14,
                        fontWeight: 600,
                        color:      '#374151',
                        textDecoration: 'none',
                        transition: 'background 0.15s',
                      }}
                      onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = '#f8fafc')}
                      onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = 'transparent')}
                    >
                      <Bell size={16} color="#6366F1" />
                      알림
                      {unreadCount > 0 && (
                        <span style={{
                          marginLeft: 'auto',
                          fontSize: 11,
                          fontWeight: 800,
                          color: '#ef4444',
                          background: '#fef2f2',
                          padding: '2px 8px',
                          borderRadius: 999,
                        }}>
                          {unreadCount}
                        </span>
                      )}
                    </Link>

                    {/* 내 여행 */}
                    <Link
                      href="/my/trips"
                      onClick={() => setDropdownOpen(false)}
                      style={{
                        width:      '100%',
                        display:    'flex',
                        alignItems: 'center',
                        gap:        10,
                        padding:    '12px 18px',
                        fontSize:   14,
                        fontWeight: 600,
                        color:      '#374151',
                        textDecoration: 'none',
                        transition: 'background 0.15s',
                      }}
                      onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = '#f8fafc')}
                      onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = 'transparent')}
                    >
                      <BookOpen size={16} color="#6366F1" />
                      내 여행 일지
                    </Link>

                    {/* 저장한 여행 */}
                    <Link
                      href="/my/saved"
                      onClick={() => setDropdownOpen(false)}
                      style={{
                        width:      '100%',
                        display:    'flex',
                        alignItems: 'center',
                        gap:        10,
                        padding:    '12px 18px',
                        fontSize:   14,
                        fontWeight: 600,
                        color:      '#374151',
                        textDecoration: 'none',
                        transition: 'background 0.15s',
                      }}
                      onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = '#f8fafc')}
                      onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = 'transparent')}
                    >
                      <Heart size={16} color="#EF4444" />
                      저장한 여행
                    </Link>

                    {/* 내 프로필 */}
                    <Link
                      href="/my/profile"
                      onClick={() => setDropdownOpen(false)}
                      style={{
                        width:      '100%',
                        display:    'flex',
                        alignItems: 'center',
                        gap:        10,
                        padding:    '12px 18px',
                        fontSize:   14,
                        fontWeight: 600,
                        color:      '#374151',
                        textDecoration: 'none',
                        transition: 'background 0.15s',
                      }}
                      onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = '#f8fafc')}
                      onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = 'transparent')}
                    >
                      <User size={16} color="#6366F1" />
                      내 프로필
                    </Link>

                    {/* 로그아웃 */}
                    <button
                      onClick={handleLogout}
                      style={{
                        width:      '100%',
                        display:    'flex',
                        alignItems: 'center',
                        gap:        10,
                        padding:    '12px 18px 14px',
                        background: 'transparent',
                        border:     'none',
                        cursor:     'pointer',
                        fontSize:   14,
                        fontWeight: 600,
                        color:      '#ef4444',
                        textAlign:  'left',
                        transition: 'background 0.15s',
                      }}
                      onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = '#fff5f5')}
                      onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = 'transparent')}
                    >
                      <LogOut size={16} />
                      로그아웃
                    </button>
                  </div>
                )}
              </div>
              </>
            ) : (
              /* 비로그인 상태 */
              <>
                <Link
                  href="/login"
                  style={{
                    padding: '8px 18px', fontSize: 14, fontWeight: 600,
                    color: '#374151', textDecoration: 'none', borderRadius: 12,
                    transition: 'background 0.2s',
                  }}
                  onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = '#f1f5f9')}
                  onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = 'transparent')}
                >
                  로그인
                </Link>
                <Link
                  href="/signup"
                  style={{
                    padding: '8px 18px', fontSize: 14, fontWeight: 700,
                    color: '#ffffff', textDecoration: 'none', borderRadius: 12,
                    background: 'linear-gradient(135deg, #6366F1, #8B5CF6)',
                    boxShadow: '0 2px 10px rgba(99,102,241,0.35)',
                    transition: 'transform 0.2s, box-shadow 0.2s',
                  }}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)';
                    (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 16px rgba(99,102,241,0.45)';
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
                    (e.currentTarget as HTMLElement).style.boxShadow = '0 2px 10px rgba(99,102,241,0.35)';
                  }}
                >
                  회원가입
                </Link>
              </>
            )}
          </div>
        )}
      </header>

      {/* 내 정보 모달 */}
      {profileOpen && user && (
        <ProfileModal user={user} onClose={() => setProfileOpen(false)} />
      )}

      {/* 드롭다운 애니메이션 */}
      <style>{`
        @keyframes dropdownIn {
          from { opacity: 0; transform: translateY(-6px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </>
  );
}
