'use client';
import { useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import BrandLogo from '@/components/brand/BrandLogo';
import { Mail, Lock, User, Loader2, Eye, EyeOff } from 'lucide-react';
import Link from 'next/link';

function SignupForm() {
  const searchParams = useSearchParams();
  const redirect     = searchParams.get('redirect') ?? '/';
  const supabase     = createClient();

  const [nickname,   setNickname]   = useState('');
  const [email,      setEmail]      = useState('');
  const [password,   setPassword]   = useState('');
  const [confirmPw,  setConfirmPw]  = useState('');
  const [showPw,     setShowPw]     = useState(false);
  const [showCpw,    setShowCpw]    = useState(false);
  const [loading,    setLoading]    = useState(false);
  const [error,      setError]      = useState('');
  const [submitted,  setSubmitted]  = useState(false);

  const validate = () => {
    if (!nickname.trim() || nickname.trim().length < 2)
      return '닉네임을 2자 이상 입력해주세요';
    if (!email.trim())
      return '이메일 주소를 입력해주세요';
    if (password.length < 8)
      return '비밀번호는 8자 이상이어야 합니다';
    if (password !== confirmPw)
      return '비밀번호가 일치하지 않습니다';
    return '';
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    const validationError = validate();
    if (validationError) { setError(validationError); return; }

    setLoading(true);
    setError('');

    const { error } = await supabase.auth.signUp({
      email:    email.trim(),
      password,
      options:  {
        data:            { full_name: nickname.trim() },
        emailRedirectTo: `${window.location.origin}/auth/callback?redirect=${encodeURIComponent(redirect)}`,
      },
    });

    if (error) {
      const msg =
        error.message === 'User already registered'
          ? '이미 가입된 이메일입니다. 로그인해주세요.'
          : error.message;
      setError(msg);
      setLoading(false);
    } else {
      setSubmitted(true);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-violet-50 flex items-center justify-center px-4">
        <div className="w-full max-w-sm bg-white rounded-[28px] shadow-[0_24px_64px_rgba(0,0,0,0.12)] p-10 text-center">
          <div className="text-5xl mb-4">📬</div>
          <h2 className="text-xl font-extrabold text-slate-900 mb-2">이메일을 확인해주세요</h2>
          <p className="text-sm text-slate-500 leading-relaxed mb-6">
            <strong className="text-slate-700">{email}</strong>로<br />
            인증 링크를 보냈습니다.<br />
            메일의 링크를 클릭하면 가입이 완료됩니다.
          </p>
          <p className="text-xs text-slate-400">
            메일이 보이지 않으면 스팸함을 확인해주세요.
          </p>
          <Link
            href="/login"
            className="block mt-6 text-sm font-semibold text-brand-600 hover:underline"
          >
            로그인 페이지로 돌아가기
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-violet-50 flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-sm bg-white rounded-[28px] shadow-[0_24px_64px_rgba(0,0,0,0.12)] overflow-hidden">

        {/* 헤더 */}
        <div className="bg-gradient-to-br from-brand-500 to-violet-500 px-8 pt-8 pb-8 text-center">
          <div className="mb-2 flex justify-center">
            <BrandLogo size="md" variant="on-gradient" />
          </div>
          <p className="text-white/75 text-sm">회원가입</p>
        </div>

        <form onSubmit={handleSignup} className="px-8 py-7 flex flex-col gap-2.5">

          {/* 닉네임 */}
          <div className="flex items-center border-2 border-slate-200 rounded-xl overflow-hidden focus-within:border-brand-400 transition-colors">
            <User size={15} className="ml-3.5 text-slate-400 shrink-0" />
            <input
              type="text"
              value={nickname}
              onChange={e => setNickname(e.target.value)}
              placeholder="닉네임 (2자 이상)"
              maxLength={20}
              autoComplete="nickname"
              className="flex-1 px-3 py-3 text-sm outline-none bg-transparent"
            />
          </div>

          {/* 이메일 */}
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

          {/* 비밀번호 */}
          <div className="flex items-center border-2 border-slate-200 rounded-xl overflow-hidden focus-within:border-brand-400 transition-colors">
            <Lock size={15} className="ml-3.5 text-slate-400 shrink-0" />
            <input
              type={showPw ? 'text' : 'password'}
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="비밀번호 (8자 이상)"
              autoComplete="new-password"
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

          {/* 비밀번호 확인 */}
          <div className="flex items-center border-2 border-slate-200 rounded-xl overflow-hidden focus-within:border-brand-400 transition-colors">
            <Lock size={15} className="ml-3.5 text-slate-400 shrink-0" />
            <input
              type={showCpw ? 'text' : 'password'}
              value={confirmPw}
              onChange={e => setConfirmPw(e.target.value)}
              placeholder="비밀번호 확인"
              autoComplete="new-password"
              className="flex-1 px-3 py-3 text-sm outline-none bg-transparent"
            />
            <button
              type="button"
              onClick={() => setShowCpw(v => !v)}
              className="mr-3 text-slate-400 hover:text-slate-600"
              tabIndex={-1}
            >
              {showCpw ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>

          {/* 비밀번호 강도 힌트 */}
          {password.length > 0 && (
            <div className="flex gap-1 px-1">
              {[...Array(4)].map((_, i) => (
                <div
                  key={i}
                  className={`h-1 flex-1 rounded-full transition-colors ${
                    password.length >= [4, 6, 8, 12][i]
                      ? ['bg-red-400', 'bg-orange-400', 'bg-yellow-400', 'bg-green-500'][i]
                      : 'bg-slate-200'
                  }`}
                />
              ))}
            </div>
          )}

          {error && (
            <p className="text-xs text-red-500 bg-red-50 rounded-xl px-3 py-2">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 rounded-2xl bg-brand-500 text-white font-bold text-sm hover:bg-brand-600 disabled:opacity-50 transition-colors flex items-center justify-center gap-2 mt-1"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : null}
            가입하기
          </button>

          <p className="text-sm text-center text-slate-500 mt-1">
            이미 계정이 있으신가요?{' '}
            <Link href="/login" className="font-semibold text-brand-600 hover:underline">
              로그인
            </Link>
          </p>

          <p className="text-[11px] text-slate-400 text-center leading-relaxed">
            가입 시{' '}
            <Link href="/terms" className="underline hover:text-slate-600">이용약관</Link>
            과{' '}
            <Link href="/privacy" className="underline hover:text-slate-600">개인정보처리방침</Link>
            에 동의합니다
          </p>
        </form>
      </div>
    </div>
  );
}

export default function SignupPage() {
  return (
    <Suspense>
      <SignupForm />
    </Suspense>
  );
}
