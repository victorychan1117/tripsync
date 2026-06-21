'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Loader2, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  FOLDER_EMOJI_PRESETS,
  MAX_FOLDER_NAME_LENGTH,
  type SavedTripFolder,
} from '@/lib/saved/folders';

interface FolderFormModalProps {
  mode: 'create' | 'edit';
  folder?: SavedTripFolder;
  loading: boolean;
  onClose: () => void;
  onSubmit: (name: string, emoji: string) => void;
}

export default function FolderFormModal({
  mode,
  folder,
  loading,
  onClose,
  onSubmit,
}: FolderFormModalProps) {
  const [name, setName] = useState(folder?.name ?? '');
  const [emoji, setEmoji] = useState(folder?.emoji ?? '📁');

  return (
    <div
      className="fixed inset-0 bg-black/50 z-[600] flex items-end sm:items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 16, scale: 0.97 }}
        className="bg-white w-full sm:max-w-[400px] rounded-3xl p-6 shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="sm:hidden flex justify-center mb-4">
          <div className="w-10 h-1 bg-slate-200 rounded-full" />
        </div>

        <div className="flex items-center justify-between mb-5">
          <h3 className="text-[16px] font-extrabold text-slate-900">
            {mode === 'create' ? '폴더 만들기' : '폴더 수정'}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:bg-slate-100 transition-colors"
            aria-label="닫기"
          >
            <X size={18} />
          </button>
        </div>

        <label className="block text-[12px] font-bold text-slate-500 mb-2">폴더 이름</label>
        <input
          value={name}
          onChange={e => setName(e.target.value.slice(0, MAX_FOLDER_NAME_LENGTH))}
          placeholder="예: 일본 여행"
          className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800 outline-none focus:border-violet-300 focus:ring-2 focus:ring-violet-100 mb-4"
        />

        <label className="block text-[12px] font-bold text-slate-500 mb-2">이모지</label>
        <div className="flex flex-wrap gap-2 mb-3">
          {FOLDER_EMOJI_PRESETS.map(e => (
            <button
              key={e}
              type="button"
              onClick={() => setEmoji(e)}
              className={cn(
                'w-10 h-10 rounded-xl text-lg flex items-center justify-center border transition-all',
                emoji === e
                  ? 'border-violet-300 bg-violet-50 scale-105'
                  : 'border-slate-100 bg-slate-50 hover:border-slate-200',
              )}
            >
              {e}
            </button>
          ))}
        </div>
        <input
          value={emoji}
          onChange={e => setEmoji(e.target.value.slice(0, 8))}
          placeholder="이모지 직접 입력"
          className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-800 outline-none focus:border-violet-300 focus:ring-2 focus:ring-violet-100 mb-5"
        />

        <div className="flex gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="flex-1 py-3 rounded-2xl text-sm font-bold bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors disabled:opacity-50"
          >
            취소
          </button>
          <button
            type="button"
            onClick={() => onSubmit(name.trim(), emoji.trim() || '📁')}
            disabled={loading || !name.trim()}
            className="flex-1 py-3 rounded-2xl text-sm font-bold text-white bg-violet-500 hover:bg-violet-600 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading && <Loader2 size={14} className="animate-spin" />}
            {mode === 'create' ? '만들기' : '저장'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
