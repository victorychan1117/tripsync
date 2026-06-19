import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  const userClient = await createClient();
  const { data: { user } } = await userClient.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { roomId } = await req.json();
  if (!roomId) {
    return NextResponse.json({ error: 'roomId is required' }, { status: 400 });
  }

  const serviceClient = createServiceClient();

  // 방 존재 확인
  const { data: room } = await serviceClient
    .from('trip_rooms')
    .select('id')
    .eq('id', roomId)
    .maybeSingle();

  if (!room) {
    return NextResponse.json({ error: '방을 찾을 수 없습니다' }, { status: 404 });
  }

  // 유저 DB ID 조회
  const { data: dbUser } = await serviceClient
    .from('users')
    .select('id')
    .eq('auth_id', user.id)
    .maybeSingle();

  if (!dbUser) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  // 이미 멤버인지 확인
  const { data: existing } = await serviceClient
    .from('trip_members')
    .select('id')
    .eq('room_id', roomId)
    .eq('user_id', dbUser.id)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ ok: true });
  }

  // 멤버 추가
  const CURSOR_COLORS = ['#6366F1', '#EC4899', '#10B981', '#F97316', '#0EA5E9', '#8B5CF6'];
  const randomColor   = CURSOR_COLORS[Math.floor(Math.random() * CURSOR_COLORS.length)];

  const { error } = await serviceClient
    .from('trip_members')
    .insert({
      room_id:      roomId,
      user_id:      dbUser.id,
      role:         'editor',
      cursor_color: randomColor,
    });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
