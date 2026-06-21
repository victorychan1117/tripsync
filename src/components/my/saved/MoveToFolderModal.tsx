'use client';

import { motion } from 'framer-motion';
import { Loader2, X, FolderOpen } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { SavedTripFolder } from '@/lib/saved/folders';

interface MoveToFolderModalProps {
  folders: SavedTripFolder[];
  currentFolderId: number | null;
  loading: boolean;
  onClose: () => void;
  onSelect: (folderId: number | null) => void;
}

export default function MoveToFolderModal({
  folders,
  currentFolderId,
  loading,
  onClose,
  onSelect,
}: MoveToFolderModalProps) {
  return (
    <div
      className="fixed inset-0 bg-black/50 z-[600] flex items-end sm:items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 16, scale: 0.97 }}
        className="bg-white w-full sm:max-w-[400px] rounded-3xl p-6 shadow-2xl max-h-[80vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="sm:hidden flex justify-center mb-4">
          <div className="w-10 h-1 bg-slate-200 rounded-full" />
        </div>

        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-violet-50 flex items-center justify-center">
              <FolderOpen size={16} className="text-violet-600" />
            </div>
            <h3 className="text-[16px] font-extrabold text-slate-900">폴더 이동</h3>
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

        <div className="flex flex-col gap-2">
          <button
            type="button"
            disabled={loading || currentFolderId === null}
            onClick={() => onSelect(null)}
            className={cn(
              'flex items-center gap-3 px-4 py-3.5 rounded-2xl border text-left transition-all disabled:opacity-50',
              currentFolderId === null
                ? 'border-violet-200 bg-violet-50'
                : 'border-slate-100 bg-slate-50 hover:border-slate-200',
            )}
          >
            <span className="text-lg">📂</span>
            <span className="text-[13px] font-semibold text-slate-700">미분류</span>
            {currentFolderId === null && (
              <span className="ml-auto text-[11px] font-bold text-violet-500">현재</span>
            )}
          </button>

          {folders.map(f => (
            <button
              key={f.id}
              type="button"
              disabled={loading || currentFolderId === f.id}
              onClick={() => onSelect(f.id)}
              className={cn(
                'flex items-center gap-3 px-4 py-3.5 rounded-2xl border text-left transition-all disabled:opacity-50',
                currentFolderId === f.id
                  ? 'border-violet-200 bg-violet-50'
                  : 'border-slate-100 bg-slate-50 hover:border-slate-200',
              )}
            >
              <span className="text-lg">{f.emoji}</span>
              <span className="text-[13px] font-semibold text-slate-700">{f.name}</span>
              {currentFolderId === f.id && (
                <span className="ml-auto text-[11px] font-bold text-violet-500">현재</span>
              )}
            </button>
          ))}
        </div>

        {loading && (
          <div className="flex items-center justify-center gap-2 mt-4 text-sm text-slate-500">
            <Loader2 size={14} className="animate-spin" />
            이동 중...
          </div>
        )}
      </motion.div>
    </div>
  );
}
