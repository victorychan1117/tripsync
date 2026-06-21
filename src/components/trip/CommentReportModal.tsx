'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Flag, Loader2, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';
import { REPORT_REASONS, type ReportReason } from '@/lib/trip/reportReasons';
import { getReportErrorMessage } from '@/lib/trip/commentErrors';

interface CommentReportModalProps {
  commentId: number;
  onClose: () => void;
  onSuccess: (commentId: number) => void;
  onToast: (msg: string) => void;
}

export default function CommentReportModal({
  commentId,
  onClose,
  onSuccess,
  onToast,
}: CommentReportModalProps) {
  const [reason, setReason] = useState<ReportReason>('spam');
  const [detail, setDetail] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (reason === 'other' && !detail.trim()) {
      onToast('기타 사유를 입력해주세요.');
      return;
    }
    setSubmitting(true);
    const supabase = createClient();
    const { data, error } = await supabase.rpc('report_trip_comment', {
      p_comment_id: commentId,
      p_reason:     reason,
      p_detail:     detail.trim() || null,
    });

    if (error) {
      onToast(getReportErrorMessage(error, '신고를 접수하지 못했어요.'));
      setSubmitting(false);
      return;
    }

    if (data === true) {
      onSuccess(commentId);
    }
    onToast('신고가 접수됐어요.');
    onClose();
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 z-[600] flex items-end sm:items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 16, scale: 0.97 }}
        transition={{ type: 'spring', damping: 28, stiffness: 320 }}
        className="bg-white w-full sm:max-w-[400px] rounded-3xl p-6 shadow-2xl max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="sm:hidden flex justify-center mb-4">
          <div className="w-10 h-1 bg-slate-200 rounded-full" />
        </div>

        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center">
              <Flag size={16} className="text-amber-600" />
            </div>
            <h3 className="text-[16px] font-extrabold text-slate-900">댓글 신고</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:bg-slate-100 transition-colors"
            aria-label="닫기"
          >
            <X size={18} />
          </button>
        </div>

        <p className="text-[13px] text-slate-500 mb-4 leading-relaxed">
          신고 사유를 선택해주세요. 검토 후 필요 시 댓글이 숨겨질 수 있어요.
        </p>

        <div className="flex flex-col gap-2 mb-4">
          {REPORT_REASONS.map(r => (
            <label
              key={r.value}
              className={cn(
                'flex items-center gap-3 px-4 py-3 rounded-2xl border cursor-pointer transition-all',
                reason === r.value
                  ? 'border-violet-300 bg-violet-50'
                  : 'border-slate-100 bg-slate-50 hover:border-slate-200',
              )}
            >
              <input
                type="radio"
                name="report-reason"
                value={r.value}
                checked={reason === r.value}
                onChange={() => setReason(r.value)}
                className="accent-violet-500"
              />
              <span className="text-[13px] font-semibold text-slate-700">{r.label}</span>
            </label>
          ))}
        </div>

        {reason === 'other' && (
          <textarea
            value={detail}
            onChange={e => setDetail(e.target.value.slice(0, 200))}
            placeholder="신고 사유를 입력해주세요"
            rows={3}
            className="w-full resize-none rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800 placeholder:text-slate-400 outline-none focus:border-violet-300 focus:ring-2 focus:ring-violet-100 mb-4"
          />
        )}

        <div className="flex gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="flex-1 py-3 rounded-2xl text-sm font-bold bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors disabled:opacity-50"
          >
            취소
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting}
            className="flex-1 py-3 rounded-2xl text-sm font-bold text-white bg-violet-500 hover:bg-violet-600 transition-colors flex items-center justify-center gap-2 disabled:opacity-70"
          >
            {submitting && <Loader2 size={14} className="animate-spin" />}
            신고하기
          </button>
        </div>
      </motion.div>
    </div>
  );
}
