import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const query       = req.nextUrl.searchParams.get('q');
  const countryCode = req.nextUrl.searchParams.get('country') ?? 'KR';

  if (!query) return NextResponse.json({ places: [] });

  if (countryCode === 'KR') {
    // 국내 — 카카오 로컬 API
    const res = await fetch(
      `https://dapi.kakao.com/v2/local/search/keyword.json?query=${encodeURIComponent(query)}&size=8`,
      { headers: { Authorization: `KakaoAK ${process.env.KAKAO_REST_API_KEY}` } }
    );
    if (!res.ok) {
      const errText = await res.text();
      console.error('Kakao API error:', res.status, errText);
      return NextResponse.json({ places: [], error: errText });
    }
    const data = await res.json();
    return NextResponse.json({ places: data.documents ?? [] });
  }

  // 해외 — Google Places Text Search API (위치 바이어스 포함)
  const lat = req.nextUrl.searchParams.get('lat');
  const lng = req.nextUrl.searchParams.get('lng');
  const locationParam = lat && lng ? `&location=${lat},${lng}&radius=50000` : '';
  const res = await fetch(
    `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(query)}${locationParam}&language=ko&key=${process.env.GOOGLE_MAPS_SERVER_KEY}`,
  );
  if (!res.ok) {
    const errText = await res.text();
    console.error('Google Places API error:', res.status, errText);
    return NextResponse.json({ places: [], error: errText });
  }
  const data = await res.json();

  // Google 결과를 카카오 형태와 통일
  const places = (data.results ?? []).slice(0, 8).map((p: any) => ({
    id:           p.place_id,
    place_name:   p.name,
    address_name: p.formatted_address,
    road_address_name: p.formatted_address,
    x: String(p.geometry?.location?.lng ?? ''),
    y: String(p.geometry?.location?.lat ?? ''),
    category_group_name: p.types?.[0] ?? '',
    phone: '',
  }));

  return NextResponse.json({ places });
}
