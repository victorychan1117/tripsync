import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const query = req.nextUrl.searchParams.get('q');
  if (!query) return NextResponse.json({ places: [] });

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
