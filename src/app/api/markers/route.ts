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
    return NextResponse.json({ error: 'Room is locked' }, { status: 403 });
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

  // order_index 재계산이 필요한 경우 (day 변경 or 순서 변경)
  if (patch.afterOrderIndex !== undefined) {
    const { data: newIdx } = await supabase.rpc('get_next_order_index', {
      p_room_id:    patch.roomId,
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

  const { error } = await supabase
    .from('markers')
    .delete()
    .eq('id', Number(id));

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
