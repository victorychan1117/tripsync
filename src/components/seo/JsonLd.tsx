import { stripUndefined, type JsonLdValue } from '@/lib/seo/jsonLd';

interface JsonLdProps {
  data: JsonLdValue;
}

/**
 * JSON-LD 구조화 데이터 삽입.
 * DB 문자열은 JSON.stringify로만 직렬화 — HTML 조합 없음.
 */
export default function JsonLd({ data }: JsonLdProps) {
  const items = Array.isArray(data) ? data : [data];

  return (
    <>
      {items.map((item, index) => (
        <script
          key={index}
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(stripUndefined(item)),
          }}
        />
      ))}
    </>
  );
}
