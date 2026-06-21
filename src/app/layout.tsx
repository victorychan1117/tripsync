import type { Metadata } from 'next';
import './globals.css';
import { APP_URL, APP_NAME } from '@/lib/config/site';

const OG_IMAGE = { url: '/landing/hero.png', width: 1672, height: 941, alt: `${APP_NAME} — 함께 만드는 여행 일정` };

export const metadata: Metadata = {
  title: {
    default:  `${APP_NAME} | 함께 만드는 여행 일정`,
    template: `%s | ${APP_NAME}`,
  },
  description: '여행 일정을 만들고, 동행과 공유하고, 다른 사람의 공개 여행을 참고해보세요.',
  keywords: ['여행 일정', '여행 계획', '가보자고', 'gabojago', '여행 코스', '일본 여행', '국내 여행', '여행 공유', '여행 플래너'],
  metadataBase: new URL(APP_URL),
  openGraph: {
    siteName:    APP_NAME,
    locale:      'ko_KR',
    type:        'website',
    title:       `${APP_NAME} | 함께 만드는 여행 일정`,
    description: '여행 일정을 만들고, 동행과 공유하고, 다른 사람의 공개 여행을 참고해보세요.',
    images:      [OG_IMAGE],
  },
  twitter: {
    card:        'summary_large_image',
    title:       `${APP_NAME} | 함께 만드는 여행 일정`,
    description: '여행 일정을 만들고, 동행과 공유하고, 다른 사람의 공개 여행을 참고해보세요.',
    images:      ['/landing/hero.png'],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <head>
        {/* Kakao Maps SDK는 각 페이지에서 필요 시 동적 로드 */}
      </head>
      <body className="font-sans antialiased bg-gray-50">
        {children}
      </body>
    </html>
  );
}
