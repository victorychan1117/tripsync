'use client';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Users, Navigation, ArrowRight, Loader2 } from 'lucide-react';

interface Props {
  roomId:      string;
  roomTitle:   string;
  memberCount: number;
}

export default function RoomLobby({ roomId, roomTitle, memberCount }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState('');

  const handleJoin = async () => {
    setError('');

    const res = await fetch('/api/rooms/join', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ roomId }),
    });

    if (res.ok) {
      startTransition(() => router.push(`/room/${roomId}/edit`));
    } else {
      setError('입장에 실패했습니다. 다시 시도해주세요.');
    }
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
        <div className="px-7 pb-8 pt-6">
          <p className="text-[13px] text-slate-500 mb-5 leading-relaxed">
            이 여행에 초대받으셨어요.<br />아래 버튼을 눌러 참여하세요.
          </p>

          {error && (
            <p className="text-xs text-red-500 bg-red-50 rounded-xl px-3 py-2 mb-4">{error}</p>
          )}

          <button
            onClick={handleJoin}
            disabled={isPending}
            className="w-full flex items-center justify-between px-5 py-[14px] bg-brand-500 text-white rounded-2xl font-bold text-sm hover:bg-brand-600 transition-colors disabled:opacity-60"
          >
            <span>이 여행에 참여하기</span>
            {isPending
              ? <Loader2 size={16} className="animate-spin" />
              : <ArrowRight size={16} />
            }
          </button>
        </div>
      </div>
    </div>
  );
}
