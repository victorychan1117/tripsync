// 브라우저(클라이언트 컴포넌트)에서 사용하는 Supabase 클라이언트
import { createBrowserClient } from '@supabase/ssr';

let client: ReturnType<typeof createBrowserClient> | null = null;

export function createClient() {
  // 싱글톤 — 매 렌더마다 새 인스턴스 생성 방지
  if (client) return client;

  client = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );

  return client;
}
