import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// POST /api/rooms — 팀 방 생성
export async function POST(req: NextRequest) {
  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const { title, destination, countryCode, startDate, endDate } = body;

  if (!title) {
    return NextResponse.json({ error: 'title is required' }, { status: 400 });
  }

  // DB 함수로 충돌 없는 방 코드 생성
  const { data: codeData } = await supabase.rpc('generate_room_code');
  const roomCode = codeData as string;

  // 유저 DB ID 조회
  const { data: dbUser } = await supabase
    .from('users')
    .select('id')
    .eq('auth_id', user.id)
    .single();

  if (!dbUser) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  // 방 생성
  const { data: room, error: roomError } = await supabase
    .from('trip_rooms')
    .insert({
      id:           roomCode,
      owner_id:     dbUser.id,
      title,
      destination:  destination ?? null,
      country_code: countryCode ?? 'KR',
      start_date:   startDate   ?? null,
      end_date:     endDate     ?? null,
    })
    .select()
    .single();

  if (roomError) {
    return NextResponse.json({ error: roomError.message }, { status: 500 });
  }

  // 방장 멤버 자동 추가
  await supabase.from('trip_members').insert({
    room_id:  roomCode,
    user_id:  dbUser.id,
    role:     'owner',
    cursor_color: '#6366F1',
  });

  return NextResponse.json({ room }, { status: 201 });
}

// GET /api/rooms?roomId=TRP-XXXX — 방 정보 조회
export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const roomId   = req.nextUrl.searchParams.get('roomId');

  if (!roomId) {
    return NextResponse.json({ error: 'roomId is required' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('trip_rooms')
    .select(`
      *,
      trip_members (
        id, user_id, guest_nickname, role, cursor_color, is_online,
        users ( nickname, avatar_url )
      )
    `)
    .eq('id', roomId)
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 404 });
  }

  return NextResponse.json({ room: data });
}
