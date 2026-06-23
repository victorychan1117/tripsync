import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';

// GET /api/markers?roomId=TRP-XXXX — 방의 마커 전체 조회
export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const roomId   = req.nextUrl.searchParams.get('roomId');

  if (!roomId) {
    return NextResponse.json({ error: 'roomId required' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('markers')
    .select('*')
    .eq('room_id', roomId)
    .order('day_number')
    .order('order_index');

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ markers: data ?? [] });
}

// ── 내부 헬퍼: 방 잠금 여부 + 현재 유저 권한 검증 ─────────────────────
// role이 owner 또는 editor인 경우에만 쓰기 허용
async function authorizeWrite(
  markerId: number,
): Promise<
  | { ok: true; roomId: string }
  | { ok: false; status: number; error: string }
> {
  const supabase = await createClient();

  // 현재 로그인 사용자 확인
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, status: 401, error: '로그인이 필요합니다.' };
  }

  // 마커에서 room_id 조회
  const { data: marker } = await supabase
    .from('markers')
    .select('room_id')
    .eq('id', markerId)
    .single();

  if (!marker) {
    return { ok: false, status: 404, error: '마커를 찾을 수 없습니다.' };
  }

  const roomId = marker.room_id as string;

  // 방 잠금 여부 확인 (service client — RLS 우회하여 정확한 값 읽기)
  const service = createServiceClient();
  const { data: room } = await service
    .from('trip_rooms')
    .select('is_locked')
    .eq('id', roomId)
    .single();

  if (room?.is_locked) {
    return { ok: false, status: 403, error: '잠긴 여행은 수정할 수 없습니다.' };
  }

  // DB users 테이블 id 조회
  const { data: dbUser } = await service
    .from('users')
    .select('id')
    .eq('auth_id', user.id)
    .single();

  if (!dbUser) {
    return { ok: false, status: 401, error: '사용자 정보를 찾을 수 없습니다.' };
  }

  // 권한 확인: owner 또는 editor만 허용
  const { data: member } = await service
    .from('trip_members')
    .select('role')
    .eq('room_id', roomId)
    .eq('user_id', dbUser.id)
    .single();

  if (!member || member.role === 'viewer') {
    return { ok: false, status: 403, error: '수정 권한이 없습니다.' };
  }

  return { ok: true, roomId };
}

// POST /api/markers — 마커 추가
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const body     = await req.json();

  const { roomId, name, address, lat, lng, category, dayNumber, stayMinutes, memo, googlePlaceId, kakaoPlaceId, guestSession } = body;

  if (!roomId || !name || lat === undefined || lng === undefined) {
    return NextResponse.json({ error: 'roomId, name, lat, lng are required' }, { status: 400 });
  }

  // 잠긴 방 체크
  const { data: room } = await supabase
    .from('trip_rooms')
    .select('is_locked')
    .eq('id', roomId)
    .single();

  if (room?.is_locked) {
    return NextResponse.json({ error: '잠긴 여행은 수정할 수 없습니다.' }, { status: 403 });
  }

  // DB 함수로 order_index 계산
  const { data: orderIndex } = await supabase.rpc('get_next_order_index', {
    p_room_id:    roomId,
    p_day_number: dayNumber ?? 1,
    p_after_idx:  null,
  });

  // 유저 ID 조회
  const { data: { user } } = await supabase.auth.getUser();
  let dbUserId: string | null = null;
  if (user) {
    const { data: dbUser } = await supabase
      .from('users').select('id').eq('auth_id', user.id).single();
    dbUserId = dbUser?.id ?? null;
  }

  const { data, error } = await supabase
    .from('markers')
    .insert({
      room_id:        roomId,
      day_number:     dayNumber      ?? 1,
      order_index:    orderIndex     ?? 1.0,
      name,
      address:        address        ?? null,
      lat,
      lng,
      category:       category       ?? 'etc',
      stay_minutes:   stayMinutes    ?? 60,
      memo:           memo           ?? null,
      google_place_id: googlePlaceId ?? null,
      kakao_place_id:  kakaoPlaceId  ?? null,
      added_by_user:  dbUserId,
      added_by_guest: !dbUserId ? (guestSession ?? null) : null,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ marker: data }, { status: 201 });
}

// PATCH /api/markers — 마커 수정 (reorder 포함)
export async function PATCH(req: NextRequest) {
  const supabase = await createClient();
  const body     = await req.json();
  const { id, ...patch } = body;

  if (!id) {
    return NextResponse.json({ error: 'id required' }, { status: 400 });
  }

  const auth = await authorizeWrite(Number(id));
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  // order_index 재계산이 필요한 경우 (day 변경 or 순서 변경)
  if (patch.afterOrderIndex !== undefined) {
    const { data: newIdx } = await supabase.rpc('get_next_order_index', {
      p_room_id:    patch.roomId ?? auth.roomId,
      p_day_number: patch.day_number,
      p_after_idx:  patch.afterOrderIndex,
    });
    patch.order_index = newIdx;
    delete patch.afterOrderIndex;
    delete patch.roomId;
  }

  const { data, error } = await supabase
    .from('markers')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ marker: data });
}

// DELETE /api/markers?id=123
export async function DELETE(req: NextRequest) {
  const supabase = await createClient();
  const id       = req.nextUrl.searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'id required' }, { status: 400 });
  }

  const auth = await authorizeWrite(Number(id));
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { error } = await supabase
    .from('markers')
    .delete()
    .eq('id', Number(id));

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
