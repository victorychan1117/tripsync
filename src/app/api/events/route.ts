import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';

const ALLOWED_EVENTS = new Set([
  'public_trip_viewed',
  'public_trip_saved',
  'public_trip_unsaved',
  'public_trip_cloned',
  'public_trip_shared',
  'affiliate_clicked',
  'explore_card_clicked',
]);

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { event, roomId, userId, meta } = body as {
      event:   string;
      roomId?: string;
      userId?: string | null;
      meta?:   Record<string, unknown>;
    };

    if (!event || !ALLOWED_EVENTS.has(event)) {
      return NextResponse.json({ ok: false }, { status: 400 });
    }

    const service = createServiceClient();
    await service.from('events').insert({
      event_name: event,
      room_id:    roomId  ?? null,
      user_id:    userId  ?? null,
      metadata:   meta    ?? null,
    });
  } catch (err) {
    if (process.env.NODE_ENV === 'development') {
      console.error('[events]', err);
    }
  }

  return NextResponse.json({ ok: true });
}
