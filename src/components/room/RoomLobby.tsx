'use client';
import { useState, useTransition } from 'react';
import { useRouter }  from 'next/navigation';
import { Users, Navigation, ArrowRight, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  roomId:          string;
  roomTitle:       string;
  memberCount:     number;
  isAuthenticated: boolean;
}

export default function RoomLobby({ roomId, roomTitle, memberCount, isAuthenticated }: Props) {
  const router        = useRouter();
  const [isPending, startTransition] = useTransition();
  const [nickname,  setNickname]  = useState('');
  const [error,     setError]     = useState('');

  const handleJoinAsGuest = async () => {
    if (!nickname.trim() || nickname.trim().length < 2) {
      setError('닉네임을 2자 이상 입력해주세요');
      return;
    }
    setError('');

    // 게스트 세션 ID 생성 후 API로 멤버 등록
    const guestSession = `guest-${Date.now()}-${Math.random().toString(36).slice(2)}`;

    const res = await fetch('/api/markers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'join_guest', roomId, nickname: nickname.trim(), guestSession }),
    });

    if (res.ok) {
      // 쿠키에 게스트 세션 저장
      document.cookie = `guest_session=${guestSession};path=/;max-age=86400`;
      startTransition(() => router.push(`/room/${roomId}/edit`));
    } else {
      setError('입장에 실패했습니다. 다시 시도해주세요.');
    }
  };

  const handleLoginJoin = () => {
    router.push(`/login?redirect=/room/${roomId}/edit`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-violet-50 flex items-center justify-center px-4">
      <div className="w-full max-w-sm bg-white rounded-[28px] shadow-[0_24px_64px_rgba(0,0,0,0.12)] overflow-hidden">

        {/* 헤더 */}
        <div className="bg-gradient-to-br from-brand-500 to-violet-500 px-7 pt-8 pb-7">
          <div className="w-12 h-12 bg-white/20 border-2 border-white/40 rounded-2xl flex items-center justify-center mb-4">
            <Navigation size={22} className="text-white" />
          </div>
          <div className="text-[11px] text-white/70 font-semibold uppercase tracking-widest mb-1">
            초대받은 여행
          </div>
          <div className="text-[20px] font-extrabold text-white mb-2 leading-snug">
            {roomTitle}
          </div>
          <div className="flex items-center gap-2 text-white/75 text-sm">
            <Users size={14} />
            <span>{memberCount}명 참여 중</span>
          </div>
        </div>

        {/* 본문 */}
        <div className="px-7 pb-7 pt-6">
          <p className="text-[13px] text-slate-500 mb-5 leading-relaxed">
            {isAuthenticated
              ? '계정으로 입장하거나, 게스트로 참여할 수 있어요.'
              : '닉네임을 입력하면 게스트로 바로 참여할 수 있어요.'}
          </p>

          {/* 로그인 입장 버튼 */}
          {!isAuthenticated && (
            <button
              onClick={handleLoginJoin}
              className="w-full flex items-center justify-between px-5 py-[13px] bg-brand-500 text-white rounded-2xl font-bold text-sm mb-3 hover:bg-brand-600 transition-colors"
            >
              <span>로그인하고 입장하기</span>
              <ArrowRight size={16} />
            </button>
          )}

          {/* 구분선 */}
          <div className="flex items-center gap-3 mb-4">
            <div className="flex-1 h-px bg-slate-100" />
            <span className="text-xs text-slate-400">또는</span>
            <div className="flex-1 h-px bg-slate-100" />
          </div>

          {/* 게스트 입장 */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-semibold text-slate-600">
              게스트 닉네임
            </label>
            <input
              type="text"
              value={nickname}
              onChange={e => setNickname(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleJoinAsGuest()}
              placeholder="예: 여행왕 김씨"
              maxLength={20}
              className={cn(
                'w-full px-4 py-3 rounded-xl border-2 text-sm outline-none transition-all',
                error
                  ? 'border-red-300 bg-red-50'
                  : 'border-slate-200 focus:border-brand-400 bg-slate-50',
              )}
            />
            {error && (
              <p className="text-xs text-red-500">{error}</p>
            )}
            <button
              onClick={handleJoinAsGuest}
              disabled={isPending || !nickname.trim()}
              className="w-full flex items-center justify-center gap-2 py-[13px] rounded-2xl bg-slate-100 text-slate-700 font-bold text-sm mt-1 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-200 transition-colors"
            >
              {isPending ? <Loader2 size={16} className="animate-spin" /> : <Users size={16} />}
              게스트로 입장하기
            </button>
          </div>

          <p className="text-[11px] text-slate-400 text-center mt-4 leading-relaxed">
            게스트로 참여 시 24시간 후 세션이 만료됩니다
          </p>
        </div>
      </div>
    </div>
  );
}
