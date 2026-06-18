import { type NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

// ── 인증이 필요한 경로 패턴 ────────────────────────────────────────
const PROTECTED_PREFIXES = ['/my/'];
const AUTH_ROUTES        = ['/login', '/auth/callback'];

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  // Supabase SSR 쿠키 기반 클라이언트
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll()  { return request.cookies.getAll(); },
        setAll(cs) {
          cs.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cs.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    },
  );

  // 세션 갱신 (refresh token 자동 갱신)
  const { data: { user } } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  // 인증 필요 경로 → 미로그인 시 로그인 페이지로 리다이렉트
  if (PROTECTED_PREFIXES.some(p => pathname.startsWith(p))) {
    if (!user) {
      const loginUrl = request.nextUrl.clone();
      loginUrl.pathname = '/login';
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  // 이미 로그인 상태에서 로그인 페이지 접근 → 홈으로
  if (AUTH_ROUTES.includes(pathname) && user) {
    const homeUrl = request.nextUrl.clone();
    homeUrl.pathname = '/';
    return NextResponse.redirect(homeUrl);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|api/|.*\\.(?:svg|png|jpg|ico|css|js)$).*)',
  ],
};
