import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default:  'TripSync — 실시간 협업 여행 플래너',
    template: '%s | TripSync',
  },
  description:
    '여행 일정을 팀과 함께 실시간으로 만들어보세요. '
    + '지도 위에 마커를 찍고 경로와 소요 시간을 즉시 확인합니다.',
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? 'https://tripsync.com'),
  openGraph: {
    siteName: 'TripSync',
    locale:   'ko_KR',
    type:     'website',
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
