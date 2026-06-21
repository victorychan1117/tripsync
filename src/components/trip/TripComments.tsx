'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Trash2, Loader2, Flag, MoreHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';
import { MAX_COMMENT_LENGTH } from '@/lib/trip/reactions';
import { getCommentErrorMessage } from '@/lib/trip/commentErrors';
import { HIDDEN_COMMENT_MESSAGE } from '@/lib/trip/reportReasons';
import CommentDeleteDialog from '@/components/trip/CommentDeleteDialog';
import CommentReportModal from '@/components/trip/CommentReportModal';

export interface TripCommentItem {
  id: number;
  content: string;
  created_at: string;
  updated_at?: string;
  user_id: string;
  is_hidden: boolean;
  author: { nickname: string; avatar_url: string | null };
}

function CommentAvatar({ nickname, avatarUrl }: { nickname: string; avatarUrl: string | null }) {
  const initial = nickname.charAt(0).toUpperCase();
  if (avatarUrl && (avatarUrl.startsWith('http://') || avatarUrl.startsWith('https://'))) {
    return (
      <img
        src={avatarUrl}
        alt=""
        className="w-9 h-9 rounded-full object-cover border-2 border-white shadow-sm shrink-0"
      />
    );
  }
  if (avatarUrl) {
    return (
      <div className="w-9 h-9 rounded-full bg-white border-2 border-white shadow-sm flex items-center justify-center shrink-0 text-lg">
        {avatarUrl}
      </div>
    );
  }
  return (
    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-violet-400 to-indigo-500 flex items-center justify-center text-sm font-extrabold text-white shrink-0 shadow-sm">
      {initial}
    </div>
  );
}

function formatRelativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return '방금';
  if (mins < 60) return `${mins}분 전`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}시간 전`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}일 전`;
  return new Date(iso).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' });
}

function isEdited(createdAt: string, updatedAt?: string): boolean {
  if (!updatedAt) return false;
  return new Date(updatedAt).getTime() - new Date(createdAt).getTime() > 1000;
}

interface TripCommentsProps {
  roomId: string;
  userId: string | null;
  initialComments: TripCommentItem[];
  onToast: (msg: string) => void;
}

export default function TripComments({
  roomId,
  userId,
  initialComments,
  onToast,
}: TripCommentsProps) {
  const [comments, setComments] = useState(initialComments);
  const [text, setText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [deleteTargetId, setDeleteTargetId] = useState<number | null>(null);
  const [reportTargetId, setReportTargetId] = useState<number | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editText, setEditText] = useState('');
  const [editSaving, setEditSaving] = useState(false);
  const [menuOpenId, setMenuOpenId] = useState<number | null>(null);

  const handleSubmit = useCallback(async () => {
    const trimmed = text.trim();
    if (!userId) {
      onToast('로그인하면 댓글을 남길 수 있어요.');
      return;
    }
    if (!trimmed) return;
    if (trimmed.length > MAX_COMMENT_LENGTH) {
      onToast(`댓글은 ${MAX_COMMENT_LENGTH}자 이하로 작성해주세요.`);
      return;
    }

    setSubmitting(true);
    const supabase = createClient();
    const { data, error } = await supabase
      .from('trip_comments')
      .insert({ room_id: roomId, user_id: userId, content: trimmed })
      .select(`
        id, content, created_at, updated_at, user_id, is_hidden,
        users ( nickname, avatar_url )
      `)
      .single();

    if (error || !data) {
      onToast(getCommentErrorMessage(error, '댓글을 등록하지 못했어요.'));
      setSubmitting(false);
      return;
    }

    const raw = data.users as unknown;
    const user = Array.isArray(raw) ? (raw[0] ?? null) : raw;
    const author = user as { nickname: string; avatar_url: string | null } | null;

    setComments(prev => [...prev, {
      id:         data.id,
      content:    data.content,
      created_at: data.created_at,
      updated_at: data.updated_at,
      user_id:    data.user_id,
      is_hidden:  data.is_hidden ?? false,
      author:     author ?? { nickname: '여행자', avatar_url: null },
    }]);
    setText('');
    setSubmitting(false);
  }, [userId, text, roomId, onToast]);

  const startEdit = useCallback((c: TripCommentItem) => {
    setEditingId(c.id);
    setEditText(c.content);
    setMenuOpenId(null);
  }, []);

  const cancelEdit = useCallback(() => {
    setEditingId(null);
    setEditText('');
  }, []);

  const handleSaveEdit = useCallback(async (commentId: number) => {
    const trimmed = editText.trim();
    if (!userId) return;
    if (!trimmed) {
      onToast('댓글 내용을 입력해주세요.');
      return;
    }
    if (trimmed.length > MAX_COMMENT_LENGTH) {
      onToast(`댓글은 ${MAX_COMMENT_LENGTH}자 이하로 작성해주세요.`);
      return;
    }

    setEditSaving(true);
    const supabase = createClient();
    const { data, error } = await supabase
      .from('trip_comments')
      .update({ content: trimmed })
      .eq('id', commentId)
      .eq('user_id', userId)
      .select('id, content, updated_at')
      .single();

    if (error || !data) {
      onToast(getCommentErrorMessage(error, '댓글을 수정하지 못했어요.'));
      setEditSaving(false);
      return;
    }

    setComments(prev => prev.map(c =>
      c.id === commentId
        ? { ...c, content: data.content, updated_at: data.updated_at }
        : c,
    ));
    setEditingId(null);
    setEditText('');
    setEditSaving(false);
  }, [userId, editText, onToast]);

  const confirmDelete = useCallback(async () => {
    if (!userId || deleteTargetId === null) return;
    const commentId = deleteTargetId;
    setDeletingId(commentId);
    const prev = comments;
    setComments(c => c.filter(x => x.id !== commentId));

    const supabase = createClient();
    const { error } = await supabase
      .from('trip_comments')
      .delete()
      .eq('id', commentId)
      .eq('user_id', userId);

    if (error) {
      setComments(prev);
      onToast('댓글을 삭제하지 못했어요.');
    }
    setDeletingId(null);
    setDeleteTargetId(null);
  }, [userId, deleteTargetId, comments, onToast]);

  const handleReportSuccess = useCallback((commentId: number) => {
    setComments(prev => prev.map(c =>
      c.id === commentId ? { ...c, is_hidden: true, content: '' } : c,
    ));
  }, []);

  const remaining = MAX_COMMENT_LENGTH - text.length;
  const editRemaining = MAX_COMMENT_LENGTH - editText.length;

  return (
    <section id="comments" className="mt-8 scroll-mt-20">
      <div className="bg-gradient-to-br from-pink-50/80 via-violet-50/60 to-indigo-50/80 rounded-3xl border border-violet-100/80 p-5 sm:p-6 shadow-sm">
        <h2 className="text-[16px] font-extrabold text-slate-800 mb-4 flex items-center gap-2">
          <span className="text-lg">🌸</span>
          여행자들의 이야기
          {comments.length > 0 && (
            <span className="text-[12px] font-semibold text-violet-400">{comments.length}</span>
          )}
        </h2>

        {userId ? (
          <div className="mb-5">
            <div className="flex gap-2 items-end">
              <div className="flex-1 relative">
                <textarea
                  value={text}
                  onChange={e => setText(e.target.value.slice(0, MAX_COMMENT_LENGTH))}
                  placeholder="이 여행 일정에 대한 생각을 남겨보세요"
                  rows={2}
                  className="w-full resize-none rounded-2xl border border-violet-100 bg-white/90 px-4 py-3 text-sm text-slate-800 placeholder:text-slate-400 outline-none focus:border-violet-300 focus:ring-2 focus:ring-violet-100 transition-all"
                  onKeyDown={e => {
                    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleSubmit();
                  }}
                />
                <span className={cn(
                  'absolute bottom-2.5 right-3 text-[10px] font-semibold',
                  remaining < 30 ? 'text-amber-500' : 'text-slate-300',
                )}>
                  {remaining}
                </span>
              </div>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={submitting || !text.trim()}
                className="shrink-0 flex items-center justify-center w-11 h-11 rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-500 text-white shadow-md shadow-violet-200 hover:from-violet-600 hover:to-indigo-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label="댓글 등록"
              >
                {submitting
                  ? <Loader2 size={18} className="animate-spin" />
                  : <Send size={18} />}
              </button>
            </div>
          </div>
        ) : (
          <div className="mb-5 rounded-2xl bg-white/70 border border-dashed border-violet-200 px-4 py-3.5 text-center">
            <p className="text-sm text-slate-500 mb-2">로그인하면 댓글을 남길 수 있어요.</p>
            <Link
              href={`/login?redirect=/t/${roomId}`}
              className="inline-flex items-center gap-1.5 text-sm font-bold text-violet-600 hover:text-violet-700 transition-colors"
            >
              로그인하기 →
            </Link>
          </div>
        )}

        {comments.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-3xl mb-2">✨</p>
            <p className="text-sm font-semibold text-slate-500">
              아직 댓글이 없어요. 첫 이야기를 남겨보세요.
            </p>
          </div>
        ) : (
          <ul className="flex flex-col gap-3">
            <AnimatePresence initial={false}>
              {comments.map(c => {
                const isOwn = userId === c.user_id;
                const isEditing = editingId === c.id;
                const hidden = c.is_hidden;

                return (
                  <motion.li
                    key={c.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, height: 0 }}
                    className={cn(
                      'flex gap-3 rounded-2xl border p-3.5 shadow-sm',
                      hidden
                        ? 'bg-slate-50/90 border-slate-100'
                        : 'bg-white/80 border-white',
                    )}
                  >
                    {!hidden && (
                      <CommentAvatar nickname={c.author.nickname} avatarUrl={c.author.avatar_url} />
                    )}
                    <div className="flex-1 min-w-0">
                      {!hidden && (
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className="text-[13px] font-extrabold text-slate-800 truncate">
                            {c.author.nickname}
                          </span>
                          <span className="text-[10px] text-slate-400 shrink-0">
                            {formatRelativeTime(c.created_at)}
                          </span>
                          {isEdited(c.created_at, c.updated_at) && (
                            <span className="text-[10px] text-slate-400 shrink-0">(수정됨)</span>
                          )}
                        </div>
                      )}

                      {hidden ? (
                        <p className="text-[13px] text-slate-400 italic leading-relaxed">
                          {HIDDEN_COMMENT_MESSAGE}
                        </p>
                      ) : isEditing ? (
                        <div className="space-y-2">
                          <div className="relative">
                            <textarea
                              value={editText}
                              onChange={e => setEditText(e.target.value.slice(0, MAX_COMMENT_LENGTH))}
                              rows={3}
                              disabled={editSaving}
                              className="w-full resize-none rounded-xl border border-violet-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-violet-300 focus:ring-2 focus:ring-violet-100 disabled:opacity-60"
                            />
                            <span className={cn(
                              'absolute bottom-2 right-2 text-[10px] font-semibold',
                              editRemaining < 30 ? 'text-amber-500' : 'text-slate-300',
                            )}>
                              {editRemaining}
                            </span>
                          </div>
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={cancelEdit}
                              disabled={editSaving}
                              className="px-3 py-1.5 rounded-xl text-[12px] font-bold bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors disabled:opacity-50"
                            >
                              취소
                            </button>
                            <button
                              type="button"
                              onClick={() => handleSaveEdit(c.id)}
                              disabled={editSaving || !editText.trim()}
                              className="px-3 py-1.5 rounded-xl text-[12px] font-bold text-white bg-violet-500 hover:bg-violet-600 transition-colors flex items-center gap-1.5 disabled:opacity-50"
                            >
                              {editSaving && <Loader2 size={12} className="animate-spin" />}
                              저장
                            </button>
                          </div>
                        </div>
                      ) : (
                        <p className="text-[13px] text-slate-600 leading-relaxed whitespace-pre-wrap break-words">
                          {c.content}
                        </p>
                      )}
                    </div>

                    {!hidden && !isEditing && (
                      <div className="shrink-0 self-start flex items-center gap-0.5">
                        {isOwn ? (
                          <>
                            <button
                              type="button"
                              onClick={() => startEdit(c)}
                              className="px-2 py-1 rounded-lg text-[11px] font-bold text-slate-400 hover:text-violet-600 hover:bg-violet-50 transition-colors"
                            >
                              수정
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeleteTargetId(c.id)}
                              disabled={deletingId === c.id}
                              className="p-1.5 rounded-xl text-slate-300 hover:text-red-400 hover:bg-red-50 transition-colors disabled:opacity-50"
                              aria-label="댓글 삭제"
                            >
                              {deletingId === c.id
                                ? <Loader2 size={14} className="animate-spin" />
                                : <Trash2 size={14} />}
                            </button>
                          </>
                        ) : userId ? (
                          <div className="relative">
                            <button
                              type="button"
                              onClick={() => setMenuOpenId(menuOpenId === c.id ? null : c.id)}
                              className="p-1.5 rounded-xl text-slate-300 hover:text-slate-500 hover:bg-slate-100 transition-colors"
                              aria-label="더보기"
                            >
                              <MoreHorizontal size={14} />
                            </button>
                            {menuOpenId === c.id && (
                              <>
                                <div
                                  className="fixed inset-0 z-10"
                                  onClick={() => setMenuOpenId(null)}
                                />
                                <div className="absolute right-0 top-full mt-1 z-20 bg-white rounded-xl border border-slate-100 shadow-lg py-1 min-w-[100px]">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setMenuOpenId(null);
                                      setReportTargetId(c.id);
                                    }}
                                    className="w-full flex items-center gap-2 px-3 py-2 text-[12px] font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
                                  >
                                    <Flag size={12} className="text-amber-500" />
                                    신고
                                  </button>
                                </div>
                              </>
                            )}
                          </div>
                        ) : null}
                      </div>
                    )}
                  </motion.li>
                );
              })}
            </AnimatePresence>
          </ul>
        )}
      </div>

      <AnimatePresence>
        {deleteTargetId !== null && (
          <CommentDeleteDialog
            loading={deletingId === deleteTargetId}
            onCancel={() => setDeleteTargetId(null)}
            onConfirm={confirmDelete}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {reportTargetId !== null && (
          <CommentReportModal
            commentId={reportTargetId}
            onClose={() => setReportTargetId(null)}
            onSuccess={handleReportSuccess}
            onToast={onToast}
          />
        )}
      </AnimatePresence>
    </section>
  );
}
