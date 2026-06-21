import type { Metadata } from 'next';
import LegalDocLayout from '@/components/legal/LegalDocLayout';
import { APP_NAME } from '@/lib/config/site';

export const metadata: Metadata = {
  title:       '개인정보처리방침',
  description: `${APP_NAME} 서비스 개인정보처리방침`,
  alternates:  { canonical: '/privacy' },
};

export default function PrivacyPage() {
  return (
    <LegalDocLayout title="개인정보처리방침">
      <section>
        <h2 className="text-[16px] font-bold text-slate-800 mb-2">1. 수집하는 개인정보</h2>
        <p>
          회원가입 및 서비스 이용 과정에서 이메일, 닉네임, 프로필 이미지, OAuth 제공자 정보,
          여행 일정·댓글·저장·알림 등 서비스 이용 기록을 수집할 수 있습니다.
        </p>
      </section>
      <section>
        <h2 className="text-[16px] font-bold text-slate-800 mb-2">2. 이용 목적</h2>
        <ul className="list-disc pl-5 space-y-1">
          <li>회원 식별 및 로그인, 여행 일정 제공</li>
          <li>공개 여행 탐색, 댓글·반응·알림 등 소셜 기능</li>
          <li>서비스 개선, 오류 대응, 부정 이용 방지</li>
        </ul>
      </section>
      <section>
        <h2 className="text-[16px] font-bold text-slate-800 mb-2">3. 보관 및 파기</h2>
        <p>
          회원 탈퇴 또는 목적 달성 시 지체 없이 파기합니다. 법령에 따라 보관이 필요한 경우 해당 기간 동안 보관할 수 있습니다.
        </p>
      </section>
      <section>
        <h2 className="text-[16px] font-bold text-slate-800 mb-2">4. 제3자 제공</h2>
        <p>
          원칙적으로 이용자의 개인정보를 외부에 제공하지 않습니다. 다만 법령에 따른 요청이 있는 경우 예외로 합니다.
        </p>
      </section>
      <section>
        <h2 className="text-[16px] font-bold text-slate-800 mb-2">5. 이용자 권리</h2>
        <p>
          프로필 수정·여행 삭제·저장 해제·문의를 통해 열람·수정·삭제를 요청할 수 있습니다.
          자세한 문의는 <a href="/contact" className="text-violet-600 font-semibold hover:underline">문의하기</a>를 이용해주세요.
        </p>
      </section>
      <section>
        <h2 className="text-[16px] font-bold text-slate-800 mb-2">6. 문의</h2>
        <p>
          개인정보 관련 문의·삭제 요청은 <a href="/contact" className="text-violet-600 font-semibold hover:underline">문의하기</a> 또는
          {' '}<a href="/report" className="text-violet-600 font-semibold hover:underline">신고·삭제 요청</a> 페이지를 이용해주세요.
        </p>
      </section>
      <p className="text-[12px] text-slate-400 pt-4 border-t border-slate-100">
        본 방침은 서비스 정책 변경에 따라 업데이트될 수 있습니다.
      </p>
    </LegalDocLayout>
  );
}
