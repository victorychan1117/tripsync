'use client';
import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Navigation, Mail, Lock, Loader2, Eye, EyeOff } from 'lucide-react';
import Link from 'next/link';

function LoginForm() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const redirect     = searchParams.get('redirect') ?? '/';
  const supabase     = createClient();

  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [showPw,   setShowPw]   = useState(false);
  const [loading,  setLoading]  = useState<'google' | 'email' | null>(null);
  const [error,    setError]    = useState('');

  const handleGoogleLogin = async () => {
    setLoading('google');
    setError('');
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options:  { redirectTo: `${window.location.origin}/auth/callback?redirect=${encodeURIComponent(redirect)}` },
    });
    if (error) { setError(error.message); setLoading(null); }
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) { setError('이메일과 비밀번호를 입력해주세요'); return; }
    setLoading('email');
    setError('');

    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (error) {
      const msg =
        error.message === 'Invalid login credentials'
          ? '이메일 또는 비밀번호가 올바르지 않습니다'
          : error.message === 'Email not confirmed'
          ? '이메일 인증이 필요합니다. 받은 메일함을 확인해주세요.'
          : error.message;
      setError(msg);
      setLoading(null);
    } else {
      router.push(redirect);
      router.refresh();
    }
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

        <div className="px-8 py-7 flex flex-col gap-3">

          {/* 소셜 로그인 */}
          <button
            onClick={handleGoogleLogin}
            disabled={!!loading}
            className="w-full flex items-center justify-center gap-3 py-3.5 rounded-2xl border-2 border-slate-200 font-semibold text-sm text-slate-700 hover:border-slate-300 hover:bg-slate-50 disabled:opacity-50 transition-all"
          >
            {loading === 'google'
              ? <Loader2 size={18} className="animate-spin" />
              : <svg width="18" height="18" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
            }
            Google로 계속하기
          </button>

          {/* 구분선 */}
          <div className="flex items-center gap-3 my-1">
            <div className="flex-1 h-px bg-slate-100" />
            <span className="text-xs text-slate-400">또는 이메일</span>
            <div className="flex-1 h-px bg-slate-100" />
          </div>

          {/* 이메일/비밀번호 로그인 */}
          <form onSubmit={handleEmailLogin} className="flex flex-col gap-2.5">
            <div className="flex items-center border-2 border-slate-200 rounded-xl overflow-hidden focus-within:border-brand-400 transition-colors">
              <Mail size={15} className="ml-3.5 text-slate-400 shrink-0" />
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="이메일 주소"
                autoComplete="email"
                className="flex-1 px-3 py-3 text-sm outline-none bg-transparent"
              />
            </div>

            <div className="flex items-center border-2 border-slate-200 rounded-xl overflow-hidden focus-within:border-brand-400 transition-colors">
              <Lock size={15} className="ml-3.5 text-slate-400 shrink-0" />
              <input
                type={showPw ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="비밀번호"
                autoComplete="current-password"
                className="flex-1 px-3 py-3 text-sm outline-none bg-transparent"
              />
              <button
                type="button"
                onClick={() => setShowPw(v => !v)}
                className="mr-3 text-slate-400 hover:text-slate-600"
                tabIndex={-1}
              >
                {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>

            {error && (
              <p className="text-xs text-red-500 bg-red-50 rounded-xl px-3 py-2">{error}</p>
            )}

            <button
              type="submit"
              disabled={!!loading}
              className="w-full py-3.5 rounded-2xl bg-brand-500 text-white font-bold text-sm hover:bg-brand-600 disabled:opacity-50 transition-colors flex items-center justify-center gap-2 mt-0.5"
            >
              {loading === 'email' ? <Loader2 size={16} className="animate-spin" /> : null}
              로그인
            </button>
          </form>

          {/* 회원가입 링크 */}
          <p className="text-sm text-center text-slate-500 mt-1">
            계정이 없으신가요?{' '}
            <Link
              href={`/signup${redirect !== '/' ? `?redirect=${encodeURIComponent(redirect)}` : ''}`}
              className="font-semibold text-brand-600 hover:underline"
            >
              회원가입
            </Link>
          </p>

          <p className="text-[11px] text-slate-400 text-center leading-relaxed">
            로그인 시{' '}
            <Link href="/terms" className="underline hover:text-slate-600">이용약관</Link>
            과{' '}
            <Link href="/privacy" className="underline hover:text-slate-600">개인정보처리방침</Link>
            에 동의합니다
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
