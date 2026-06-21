import type { Metadata } from 'next';
import LegalDocLayout from '@/components/legal/LegalDocLayout';
import { REPORT_EMAIL, APP_NAME } from '@/lib/config/site';

export const metadata: Metadata = {
  title:       '신고·삭제 요청',
  description: `${APP_NAME} 부적절 콘텐츠 신고 및 삭제 요청 안내`,
  robots:      { index: false, follow: true },
};

export default function ReportPage() {
  return (
    <LegalDocLayout title="신고·삭제 요청">
      <section>
        <h2 className="text-[16px] font-bold text-slate-800 mb-2">댓글 신고 (앱 내)</h2>
        <p>
          공개 여행 상세 페이지의 댓글에서 <strong>신고</strong> 버튼을 이용하면
          스팸·욕설·개인정보 노출 등을 접수할 수 있습니다.
          신고가 누적되면 해당 댓글은 자동으로 숨김 처리될 수 있습니다.
        </p>
      </section>
      <section>
        <h2 className="text-[16px] font-bold text-slate-800 mb-2">여행·프로필 삭제 요청</h2>
        <p>
          본인이 작성한 공개 여행·댓글은 각 화면에서 직접 삭제할 수 있습니다.
          타인의 콘텐츠로 인해 권리가 침해된 경우 아래로 요청해주세요.
        </p>
        <ul className="list-disc pl-5 space-y-1 mt-2">
          <li>저작권·초상권 침해</li>
          <li>개인정보 무단 노출</li>
          <li>불법·유해 콘텐츠</li>
        </ul>
      </section>
      <section className="rounded-2xl bg-white border border-slate-100 p-5">
        <p className="text-[12px] font-bold text-slate-400 mb-1">삭제·신고 요청 이메일</p>
        <a
          href={`mailto:${REPORT_EMAIL}`}
          className="text-[15px] font-semibold text-violet-600 hover:underline"
        >
          {REPORT_EMAIL}
        </a>
        <p className="text-[13px] text-slate-500 mt-3 leading-relaxed">
          요청 시 URL(예: /t/여행ID), 사유, 필요 시 증빙 자료를 함께 보내주세요.
        </p>
      </section>
      <section>
        <h2 className="text-[16px] font-bold text-slate-800 mb-2">계정·개인정보</h2>
        <p>
          계정 탈퇴·개인정보 열람·삭제 요청은 <a href="/contact" className="text-violet-600 font-semibold hover:underline">문의하기</a>를
          이용해주세요. <a href="/privacy" className="text-violet-600 font-semibold hover:underline">개인정보처리방침</a>도 참고해주세요.
        </p>
      </section>
    </LegalDocLayout>
  );
}
