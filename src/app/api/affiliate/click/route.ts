import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { createClient } from '@/lib/supabase/server';
import crypto from 'crypto';

// POST /api/affiliate/click — 제휴 클릭 이벤트 기록 후 리다이렉트
export async function POST(req: NextRequest) {
  const serviceClient = createServiceClient();
  const supabase      = await createClient();
  const body          = await req.json();

  const { partner, roomId, destination, markerId } = body;

  // 유저 ID (선택)
  const { data: { user } } = await supabase.auth.getUser();
  let dbUserId: string | null = null;
  if (user) {
    const { data: dbUser } = await serviceClient
      .from('users').select('id').eq('auth_id', user.id).maybeSingle();
    dbUserId = dbUser?.id ?? null;
  }

  // IP 해시 (개인정보 보호)
  const ip     = req.headers.get('x-forwarded-for') ?? req.headers.get('x-real-ip') ?? 'unknown';
  const ipHash = crypto.createHash('sha256').update(ip).digest('hex').slice(0, 16);

  await serviceClient.from('affiliate_clicks').insert({
    partner,
    room_id:     roomId    ?? null,
    marker_id:   markerId  ?? null,
    destination: destination ?? null,
    user_id:     dbUserId,
    session_id:  req.cookies.get('session_id')?.value ?? null,
    ip_hash:     ipHash,
  });

  return NextResponse.json({ success: true });
}
