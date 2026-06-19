// 앱 레이아웃 (인증 필요 섹션)
// 미들웨어에서 auth guard 처리하므로 레이아웃은 단순 래퍼
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ height: '100dvh', overflow: 'hidden' }}>
      {children}
    </div>
  );
}
