import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';

// POST /api/route-cache — 경로 캐시 저장 (service role)
export async function POST(req: NextRequest) {
  const supabase = createServiceClient();
  const body     = await req.json();

  const {
    origin_lat, origin_lng, dest_lat, dest_lng,
    mode, duration_sec, distance_m, polyline, api_provider,
  } = body;

  const { error } = await supabase
    .from('route_cache')
    .upsert({
      origin_lat, origin_lng, dest_lat, dest_lng,
      mode, duration_sec, distance_m,
      polyline:     polyline ?? null,
      api_provider: api_provider ?? 'google',
      cached_at:    new Date().toISOString(),
      expires_at:   new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    }, {
      onConflict: 'origin_lat,origin_lng,dest_lat,dest_lng,mode',
    });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true }, { status: 201 });
}
