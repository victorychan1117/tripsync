'use client';

import { motion } from 'framer-motion';
import { Trash2, Loader2 } from 'lucide-react';

interface CommentDeleteDialogProps {
  loading: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

export default function CommentDeleteDialog({
  loading,
  onCancel,
  onConfirm,
}: CommentDeleteDialogProps) {
  return (
    <div
      className="fixed inset-0 bg-black/50 z-[600] flex items-end sm:items-center justify-center p-4"
      onClick={onCancel}
    >
      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 16, scale: 0.97 }}
        transition={{ type: 'spring', damping: 28, stiffness: 320 }}
        className="bg-white w-full sm:max-w-[360px] rounded-3xl p-6 shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="sm:hidden flex justify-center mb-4">
          <div className="w-10 h-1 bg-slate-200 rounded-full" />
        </div>
        <div className="w-12 h-12 rounded-2xl bg-red-50 flex items-center justify-center mb-4 mx-auto">
          <Trash2 size={22} className="text-red-500" />
        </div>
        <div className="text-[16px] font-extrabold text-slate-900 mb-1.5 text-center">
          댓글을 삭제할까요?
        </div>
        <p className="text-[13px] text-slate-500 mb-6 text-center leading-relaxed">
          삭제한 댓글은 되돌릴 수 없어요.
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="flex-1 py-3 rounded-2xl text-sm font-bold bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors disabled:opacity-50"
          >
            취소
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 py-3 rounded-2xl text-sm font-bold text-white bg-red-500 hover:bg-red-600 transition-colors flex items-center justify-center gap-2 disabled:opacity-70"
          >
            {loading && <Loader2 size={14} className="animate-spin" />}
            삭제하기
          </button>
        </div>
      </motion.div>
    </div>
  );
}
