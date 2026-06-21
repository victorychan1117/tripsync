// sitemap.xml은 app/sitemap.ts (Next.js native)가 /sitemap.xml로 제공합니다.
// 이 엔드포인트는 /api/sitemap.xml 경로로 들어오는 구버전 요청을 표준 경로로 리다이렉트합니다.
import { NextResponse } from 'next/server';
import { APP_URL } from '@/lib/config/site';

export function GET() {
  return NextResponse.redirect(
    new URL('/sitemap.xml', APP_URL),
    { status: 301 },
  );
}
