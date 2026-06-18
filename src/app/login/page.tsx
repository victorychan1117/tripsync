'use client';
import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Navigation, Mail, Loader2 } from 'lucide-react';

function LoginForm() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const redirect     = searchParams.get('redirect') ?? '/';
  const supabase     = createClient();

  const [email,     setEmail]     = useState('');
  const [loading,   setLoading]   = useState<'google' | 'kakao' | 'magic' | null>(null);
  const [magicSent, setMagicSent] = useState(false);
  const [error,     setError]     = useState('');

  const handleGoogleLogin = async () => {
    setLoading('google');
    setError('');
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options:  { redirectTo: `${window.location.origin}/auth/callback?redirect=${encodeURIComponent(redirect)}` },
    });
    if (error) { setError(error.message); setLoading(null); }
  };

  const handleKakaoLogin = async () => {
    setLoading('kakao');
    setError('');
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'kakao',
      options:  { redirectTo: `${window.location.origin}/auth/callback?redirect=${encodeURIComponent(redirect)}` },
    });
    if (error) { setError(error.message); setLoading(null); }
  };

  const handleMagicLink = async () => {
    if (!email.trim()) { setError('이메일을 입력해주세요'); return; }
    setLoading('magic');
    setError('');
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback?redirect=${encodeURIComponent(redirect)}` },
    });
    if (error) { setError(error.message); }
    else       { setMagicSent(true); }
    setLoading(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-violet-50 flex items-center justify-center px-4">
      <div className="w-full max-w-sm bg-white rounded-[28px] shadow-[0_24px_64px_rgba(0,0,0,0.12)] overflow-hidden">

        {/* 헤더 */}
        <div className="bg-gradient-to-br from-brand-500 to-violet-500 px-8 pt-8 pb-8 text-center">
          <div className="flex items-center justify-center gap-2.5 mb-2">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
              <Navigation size={20} className="text-white" />
            </div>
            <span className="text-2xl font-extrabold text-white">TripSync</span>
          </div>
          <p className="text-white/75 text-sm">실시간 협업 여행 플래너</p>
        </div>

        <div className="px-8 py-7">
          {magicSent ? (
            <div className="text-center py-4">
              <div className="text-3xl mb-3">📬</div>
              <p className="font-bold text-slate-900 mb-2">이메일을 확인해주세요!</p>
              <p className="text-sm text-slate-500 leading-relaxed">
                <strong>{email}</strong>로<br/>로그인 링크를 보냈습니다.
              </p>
            </div>
          ) : (
            <>
              {/* 소셜 로그인 */}
              <button
                onClick={handleGoogleLogin}
                disabled={!!loading}
                className="w-full flex items-center justify-center gap-3 py-3.5 rounded-2xl border-2 border-slate-200 font-semibold text-sm text-slate-700 mb-3 hover:border-slate-300 hover:bg-slate-50 disabled:opacity-50 transition-all"
              >
                {loading === 'google'
                  ? <Loader2 size={18} className="animate-spin" />
                  : <svg width="18" height="18" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
                }
                Google로 계속하기
              </button>

              <button
                onClick={handleKakaoLogin}
                disabled={!!loading}
                className="w-full flex items-center justify-center gap-3 py-3.5 rounded-2xl bg-[#FEE500] font-semibold text-sm text-[#3C1E1E] mb-5 hover:bg-[#f5dc00] disabled:opacity-50 transition-colors"
              >
                {loading === 'kakao'
                  ? <Loader2 size={18} className="animate-spin" />
                  : <span className="text-base">💬</span>
                }
                카카오로 계속하기
              </button>

              {/* 구분선 */}
              <div className="flex items-center gap-3 mb-5">
                <div className="flex-1 h-px bg-slate-100" />
                <span className="text-xs text-slate-400">또는 이메일</span>
                <div className="flex-1 h-px bg-slate-100" />
              </div>

              {/* 매직 링크 */}
              <div className="flex flex-col gap-2">
                <div className="flex items-center border-2 border-slate-200 rounded-xl overflow-hidden focus-within:border-brand-400 transition-colors">
                  <Mail size={16} className="ml-3.5 text-slate-400 shrink-0" />
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleMagicLink()}
                    placeholder="이메일 주소"
                    className="flex-1 px-3 py-3.5 text-sm outline-none bg-transparent"
                  />
                </div>
                <button
                  onClick={handleMagicLink}
                  disabled={!!loading}
                  className="w-full py-3.5 rounded-2xl bg-slate-100 text-slate-700 font-semibold text-sm hover:bg-slate-200 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
                >
                  {loading === 'magic' ? <Loader2 size={16} className="animate-spin" /> : null}
                  로그인 링크 받기
                </button>
              </div>

              {error && (
                <p className="text-xs text-red-500 text-center mt-3">{error}</p>
              )}
            </>
          )}

          <p className="text-[11px] text-slate-400 text-center mt-6 leading-relaxed">
            로그인 시 <span className="underline">이용약관</span>과{' '}
            <span className="underline">개인정보처리방침</span>에 동의합니다
          </p>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
