import type { Metadata } from 'next';
import LegalDocLayout from '@/components/legal/LegalDocLayout';

export const metadata: Metadata = {
  title:       '이용약관',
  description: '여행 일지 서비스 이용약관',
  alternates:  { canonical: '/terms' },
};

export default function TermsPage() {
  return (
    <LegalDocLayout title="이용약관">
      <section>
        <h2 className="text-[16px] font-bold text-slate-800 mb-2">1. 서비스 개요</h2>
        <p>
          본 약관은 여행 일정 작성·공유 서비스(이하 &quot;서비스&quot;) 이용과 관련한 기본 조건을 정합니다.
        </p>
      </section>
      <section>
        <h2 className="text-[16px] font-bold text-slate-800 mb-2">2. 회원의 의무</h2>
        <ul className="list-disc pl-5 space-y-1">
          <li>타인의 권리를 침해하거나 불법·음란·혐오 콘텐츠를 게시하지 않습니다.</li>
          <li>공개 여행·댓글·프로필에 개인정보(연락처, 주소 등)를 무단 노출하지 않습니다.</li>
          <li>서비스의 정상 운영을 방해하는 행위(도배, 자동화 남용 등)를 하지 않습니다.</li>
        </ul>
      </section>
      <section>
        <h2 className="text-[16px] font-bold text-slate-800 mb-2">3. 공개 콘텐츠</h2>
        <p>
          이용자가 공개로 설정한 여행 일정·댓글·프로필은 다른 이용자에게 노출될 수 있습니다.
          공개 범위는 이용자가 직접 설정·변경할 수 있습니다.
        </p>
      </section>
      <section>
        <h2 className="text-[16px] font-bold text-slate-800 mb-2">4. 저작권</h2>
        <p>
          이용자가 작성한 콘텐츠의 저작권은 이용자에게 귀속됩니다. 서비스 운영·노출·개선을 위해
          필요한 범위 내에서 비독점적으로 이용할 수 있습니다.
        </p>
      </section>
      <section>
        <h2 className="text-[16px] font-bold text-slate-800 mb-2">5. 서비스 변경·중단</h2>
        <p>
          운영상·기술상 필요에 따라 서비스의 전부 또는 일부를 변경·중단할 수 있으며,
          중요한 변경은 사전에 안내합니다.
        </p>
      </section>
      <section>
        <h2 className="text-[16px] font-bold text-slate-800 mb-2">6. 면책</h2>
        <p>
          서비스는 이용자 간 공유된 여행 정보의 정확성·안전성을 보증하지 않습니다.
          실제 여행 결정은 이용자 본인의 책임입니다.
        </p>
      </section>
      <section>
        <h2 className="text-[16px] font-bold text-slate-800 mb-2">7. 문의</h2>
        <p>
          약관 관련 문의는 <a href="/contact" className="text-violet-600 font-semibold hover:underline">문의하기</a>를 이용해주세요.
        </p>
      </section>
    </LegalDocLayout>
  );
}
