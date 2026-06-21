'use client';

import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';
import {
  REACTION_DEFS,
  type ReactionType,
  type ReactionCounts,
  EMPTY_REACTION_COUNTS,
} from '@/lib/trip/reactions';

interface TripReactionsProps {
  roomId: string;
  userId: string | null;
  initialCounts: ReactionCounts;
  initialUserReactions: ReactionType[];
  onToast: (msg: string) => void;
}

export default function TripReactions({
  roomId,
  userId,
  initialCounts,
  initialUserReactions,
  onToast,
}: TripReactionsProps) {
  const [counts, setCounts] = useState(initialCounts);
  const [mine, setMine] = useState<Set<ReactionType>>(
    () => new Set(initialUserReactions),
  );
  const [pending, setPending] = useState<ReactionType | null>(null);

  const toggle = useCallback(async (type: ReactionType) => {
    if (!userId) {
      onToast('로그인 후 반응을 남길 수 있어요.');
      return;
    }
    if (pending) return;

    const wasActive = mine.has(type);
    const prevCounts = { ...counts };
    const prevMine = new Set(mine);

    // 낙관적 업데이트
    setPending(type);
    setMine(prev => {
      const next = new Set(prev);
      if (wasActive) next.delete(type); else next.add(type);
      return next;
    });
    setCounts(prev => ({
      ...prev,
      [type]: Math.max(0, prev[type] + (wasActive ? -1 : 1)),
    }));

    const supabase = createClient();
    if (wasActive) {
      const { error } = await supabase
        .from('trip_reactions')
        .delete()
        .eq('room_id', roomId)
        .eq('user_id', userId)
        .eq('reaction_type', type);
      if (error) {
        setCounts(prevCounts);
        setMine(prevMine);
        onToast('반응을 취소하지 못했어요.');
      }
    } else {
      const { error } = await supabase
        .from('trip_reactions')
        .insert({ room_id: roomId, user_id: userId, reaction_type: type });
      if (error) {
        setCounts(prevCounts);
        setMine(prevMine);
        onToast('반응을 남기지 못했어요.');
      }
    }
    setPending(null);
  }, [userId, roomId, mine, counts, pending, onToast]);

  const total = Object.values(counts).reduce((a, b) => a + b, 0);

  return (
    <div className="bg-white/80 backdrop-blur-sm rounded-3xl border border-violet-100 shadow-sm p-4 sm:p-5">
      <p className="text-[13px] font-extrabold text-slate-700 mb-3 flex items-center gap-2">
        <span className="text-base">💬</span>
        이 여행, 어떠셨나요?
        {total > 0 && (
          <span className="text-[11px] font-semibold text-violet-400 ml-auto">
            {total}개의 반응
          </span>
        )}
      </p>
      <div className="flex flex-wrap gap-2">
        {REACTION_DEFS.map(({ type, emoji, label }) => {
          const active = mine.has(type);
          const count = counts[type] ?? 0;
          const loading = pending === type;
          return (
            <motion.button
              key={type}
              type="button"
              onClick={() => toggle(type)}
              disabled={!!pending}
              whileTap={{ scale: 0.92 }}
              className={cn(
                'inline-flex items-center gap-1.5 px-3.5 py-2 rounded-2xl text-sm font-bold border transition-all duration-200',
                active
                  ? 'bg-violet-100 border-violet-300 text-violet-700 shadow-sm shadow-violet-100'
                  : 'bg-slate-50 border-slate-100 text-slate-600 hover:bg-violet-50 hover:border-violet-200 hover:text-violet-600',
                loading && 'opacity-60',
              )}
            >
              <span className="text-base leading-none">{emoji}</span>
              <span className="text-[12px]">{label}</span>
              {count > 0 && (
                <span className={cn(
                  'text-[11px] font-extrabold px-1.5 py-0.5 rounded-full min-w-[20px] text-center',
                  active ? 'bg-violet-200 text-violet-700' : 'bg-white text-slate-500',
                )}>
                  {count}
                </span>
              )}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}

export { EMPTY_REACTION_COUNTS };
