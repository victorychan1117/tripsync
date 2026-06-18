import { NextRequest, NextResponse } from 'next/server';

// POST /api/route-calculate
// Google Routes API 또는 Kakao Mobility API 서버사이드 프록시
// (API 키를 클라이언트에 노출하지 않기 위함)
export async function POST(req: NextRequest) {
  const body = await req.json();

  // ── Kakao Mobility ────────────────────────────────────────────
  if (body.provider === 'kakao') {
    const { origin, destination } = body;

    const params = new URLSearchParams({ origin, destination, summary: 'true' });
    const res = await fetch(
      `https://apis-navi.kakaomobility.com/v1/directions?${params}`,
      {
        headers: {
          Authorization: `KakaoAK ${process.env.KAKAO_REST_API_KEY}`,
        },
      },
    );

    if (!res.ok) {
      return NextResponse.json(
        { error: 'Kakao Mobility API failed', status: res.status },
        { status: 502 },
      );
    }

    const data = await res.json();
    return NextResponse.json(data);
  }

  // ── Google Routes API (기본) ──────────────────────────────────
  const res = await fetch(
    'https://routes.googleapis.com/directions/v2:computeRoutes',
    {
      method:  'POST',
      headers: {
        'Content-Type':     'application/json',
        'X-Goog-Api-Key':   process.env.GOOGLE_MAPS_SERVER_KEY!,
        'X-Goog-FieldMask': [
          'routes.legs.duration',
          'routes.legs.distanceMeters',
          'routes.legs.polyline.encodedPolyline',
          'routes.legs.startLocation',
          'routes.legs.endLocation',
        ].join(','),
      },
      body: JSON.stringify({
        ...body,
        computeAlternativeRoutes: false,
        languageCode:             'ko',
        units:                    'METRIC',
      }),
    },
  );

  if (!res.ok) {
    const err = await res.text();
    return NextResponse.json(
      { error: 'Google Routes API failed', detail: err },
      { status: 502 },
    );
  }

  const data = await res.json();
  return NextResponse.json(data);
}
