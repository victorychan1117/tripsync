import type { Metadata } from 'next';
import LegalDocLayout from '@/components/legal/LegalDocLayout';

export const metadata: Metadata = {
  title:       '문의하기',
  description: '여행 일지 서비스 문의',
  robots:      { index: false, follow: true },
};

export default function ContactPage() {
  return (
    <LegalDocLayout title="문의하기">
      <section>
        <h2 className="text-[16px] font-bold text-slate-800 mb-2">서비스 이용 문의</h2>
        <p>
          버그 신고, 계정·로그인 문제, 기능 제안, 제휴 문의 등은 아래 방법으로 연락해주세요.
        </p>
      </section>
      <section className="rounded-2xl bg-white border border-slate-100 p-5 space-y-3">
        <div>
          <p className="text-[12px] font-bold text-slate-400 mb-1">이메일</p>
          <a
            href="mailto:support@tripsync.app"
            className="text-[15px] font-semibold text-violet-600 hover:underline"
          >
            support@tripsync.app
          </a>
        </div>
        <p className="text-[13px] text-slate-500 leading-relaxed">
          답변에는 영업일 기준 1~3일이 소요될 수 있습니다.
          긴급한 개인정보·삭제 요청은 <a href="/report" className="text-violet-600 font-semibold hover:underline">신고·삭제 요청</a> 페이지를 이용해주세요.
        </p>
      </section>
      <section>
        <h2 className="text-[16px] font-bold text-slate-800 mb-2">자주 묻는 내용</h2>
        <ul className="list-disc pl-5 space-y-2">
          <li>비밀번호 재설정: 로그인 화면에서 Supabase 이메일 인증 절차를 이용해주세요.</li>
          <li>여행 삭제: 내 여행 상세 → 설정에서 삭제할 수 있습니다.</li>
          <li>공개 여행 숨기기: 여행 상세에서 공개 토글을 OFF로 변경해주세요.</li>
        </ul>
      </section>
    </LegalDocLayout>
  );
}
