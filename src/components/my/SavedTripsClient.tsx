'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MapPin, Clock, Eye, Heart, Bookmark, Plus, Pencil, Trash2,
  MoreHorizontal, FolderInput, ExternalLink, Copy, Loader2,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import TripCoverBanner from '@/components/trip/TripCoverBanner';
import FolderChipBar from '@/components/my/saved/FolderChipBar';
import FolderFormModal from '@/components/my/saved/FolderFormModal';
import FolderDeleteDialog from '@/components/my/saved/FolderDeleteDialog';
import MoveToFolderModal from '@/components/my/saved/MoveToFolderModal';
import {
  type FolderFilter,
  type SavedTripFolder,
  getFolderErrorMessage,
} from '@/lib/saved/folders';
import { FLAG } from '@/lib/constants/flags';

export interface SavedTrip {
  savedTripId: number;
  folderId:    number | null;
  id:          string;
  title:       string;
  destination: string | null;
  country_code: string;
  nights:      number;
  marker_count: number;
  view_count:  number;
  cover_image_url: string | null;
  owner: { nickname: string; avatar_url: string | null } | null;
}

function fmtNights(nights: number): string {
  if (nights === 0) return '당일치기';
  return `${nights}박 ${nights + 1}일`;
}

function OwnerBadge({ nickname, avatarUrl }: { nickname: string; avatarUrl: string | null }) {
  const initial = nickname.charAt(0).toUpperCase();
  return (
    <div className="flex items-center gap-1.5">
      {avatarUrl && (avatarUrl.startsWith('http://') || avatarUrl.startsWith('https://')) ? (
        <img src={avatarUrl} alt="" className="w-4 h-4 rounded-full object-cover" />
      ) : avatarUrl ? (
        <span style={{ fontSize: 13, lineHeight: 1 }}>{avatarUrl}</span>
      ) : (
        <div
          className="w-4 h-4 rounded-full flex items-center justify-center text-white shrink-0"
          style={{ background: 'linear-gradient(135deg,#6366F1,#8B5CF6)', fontSize: 8, fontWeight: 800 }}
        >
          {initial}
        </div>
      )}
      <span className="text-[11px] text-slate-400 font-semibold truncate">{nickname}님의 여행</span>
    </div>
  );
}

function Toast({ message }: { message: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 12 }}
      className="fixed bottom-safe left-1/2 -translate-x-1/2 z-[200] bg-slate-900 text-white text-sm font-semibold px-5 py-3 rounded-2xl shadow-xl pointer-events-none whitespace-nowrap max-w-[90vw] text-center"
    >
      {message}
    </motion.div>
  );
}

export default function SavedTripsClient({
  trips: initialTrips,
  folders: initialFolders,
  userId,
}: {
  trips: SavedTrip[];
  folders: SavedTripFolder[];
  userId: string;
}) {
  const router = useRouter();
  const [trips, setTrips] = useState(initialTrips);
  const [folders, setFolders] = useState(initialFolders);
  const [filter, setFilter] = useState<FolderFilter>('all');
  const [toast, setToast] = useState<string | null>(null);
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [moveTarget, setMoveTarget] = useState<SavedTrip | null>(null);
  const [folderForm, setFolderForm] = useState<'create' | 'edit' | null>(null);
  const [deleteFolderTarget, setDeleteFolderTarget] = useState<SavedTripFolder | null>(null);
  const [folderLoading, setFolderLoading] = useState(false);
  const [moveLoading, setMoveLoading] = useState(false);
  const [cloningId, setCloningId] = useState<string | null>(null);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  }, []);

  const counts = useMemo(() => {
    const byFolder: Record<number, number> = {};
    let uncategorized = 0;
    for (const t of trips) {
      if (t.folderId == null) uncategorized++;
      else byFolder[t.folderId] = (byFolder[t.folderId] ?? 0) + 1;
    }
    return { all: trips.length, uncategorized, byFolder };
  }, [trips]);

  const filteredTrips = useMemo(() => {
    if (filter === 'all') return trips;
    if (filter === 'uncategorized') return trips.filter(t => t.folderId == null);
    return trips.filter(t => t.folderId === filter);
  }, [trips, filter]);

  const selectedFolder = typeof filter === 'number'
    ? folders.find(f => f.id === filter) ?? null
    : null;

  const handleUnsave = useCallback(async (trip: SavedTrip) => {
    setMenuOpenId(null);
    const prev = trips;
    setTrips(p => p.filter(t => t.id !== trip.id));
    const supabase = createClient();
    const { error } = await supabase
      .from('saved_trips')
      .delete()
      .eq('user_id', userId)
      .eq('room_id', trip.id);
    if (error) {
      setTrips(prev);
      showToast('저장 해제에 실패했어요.');
    } else {
      showToast('저장을 취소했어요.');
    }
  }, [userId, trips, showToast]);

  const handleMove = useCallback(async (folderId: number | null) => {
    if (!moveTarget) return;
    setMoveLoading(true);
    const supabase = createClient();
    const { error } = await supabase.rpc('move_saved_trip_to_folder', {
      p_saved_trip_id: moveTarget.savedTripId,
      p_folder_id:     folderId,
    });
    if (error) {
      showToast(getFolderErrorMessage(error, '폴더 이동에 실패했어요.'));
      setMoveLoading(false);
      return;
    }
    setTrips(prev => prev.map(t =>
      t.savedTripId === moveTarget.savedTripId ? { ...t, folderId } : t,
    ));
    setMoveTarget(null);
    setMoveLoading(false);
    showToast('폴더를 옮겼어요.');
  }, [moveTarget, showToast]);

  const handleCreateFolder = useCallback(async (name: string, emoji: string) => {
    setFolderLoading(true);
    const supabase = createClient();
    const { data, error } = await supabase.rpc('create_saved_trip_folder', {
      p_name:  name,
      p_emoji: emoji,
    });
    if (error || data == null) {
      showToast(getFolderErrorMessage(error, '폴더를 만들지 못했어요.'));
      setFolderLoading(false);
      return;
    }
    setFolders(prev => [...prev, { id: data as number, name, emoji, sort_order: prev.length }]);
    setFolderForm(null);
    setFolderLoading(false);
    showToast('폴더를 만들었어요.');
  }, [showToast]);

  const handleEditFolder = useCallback(async (name: string, emoji: string) => {
    if (!selectedFolder) return;
    setFolderLoading(true);
    const supabase = createClient();
    const { error } = await supabase.rpc('rename_saved_trip_folder', {
      p_folder_id: selectedFolder.id,
      p_name:      name,
      p_emoji:     emoji,
    });
    if (error) {
      showToast(getFolderErrorMessage(error, '폴더를 수정하지 못했어요.'));
      setFolderLoading(false);
      return;
    }
    setFolders(prev => prev.map(f =>
      f.id === selectedFolder.id ? { ...f, name, emoji } : f,
    ));
    setFolderForm(null);
    setFolderLoading(false);
    showToast('폴더를 수정했어요.');
  }, [selectedFolder, showToast]);

  const handleDeleteFolder = useCallback(async () => {
    if (!deleteFolderTarget) return;
    setFolderLoading(true);
    const folderId = deleteFolderTarget.id;
    const supabase = createClient();
    const { error } = await supabase
      .from('saved_trip_folders')
      .delete()
      .eq('id', folderId)
      .eq('user_id', userId);
    if (error) {
      showToast('폴더를 삭제하지 못했어요.');
      setFolderLoading(false);
      return;
    }
    setFolders(prev => prev.filter(f => f.id !== folderId));
    setTrips(prev => prev.map(t =>
      t.folderId === folderId ? { ...t, folderId: null } : t,
    ));
    if (filter === folderId) setFilter('all');
    setDeleteFolderTarget(null);
    setFolderLoading(false);
    showToast('폴더를 삭제했어요.');
  }, [deleteFolderTarget, userId, filter, showToast]);

  const handleClone = useCallback(async (tripId: string) => {
    setMenuOpenId(null);
    setCloningId(tripId);
    try {
      const supabase = createClient();
      const { data: newRoomId, error } = await supabase.rpc('clone_public_trip', {
        p_source_room_id: tripId,
      });
      if (error) {
        showToast('여행을 담지 못했어요. 잠시 후 다시 시도해주세요.');
        return;
      }
      showToast('내 여행에 담았어요. 🎉');
      setTimeout(() => router.push(`/my/trips/${newRoomId}`), 900);
    } catch {
      showToast('여행을 담지 못했어요. 잠시 후 다시 시도해주세요.');
    } finally {
      setCloningId(null);
    }
  }, [router, showToast]);

  const emptyMessage = useMemo(() => {
    if (trips.length === 0) {
      return {
        title: '아직 저장한 여행이 없어요',
        desc:  'Explore에서 마음에 드는 여행을 저장해보세요.',
        cta:   true,
      };
    }
    if (filter === 'uncategorized') {
      return {
        title: '미분류 여행이 없어요',
        desc:  '저장한 여행을 폴더로 정리해보세요.',
        cta:   false,
      };
    }
    if (typeof filter === 'number') {
      return {
        title: '이 폴더에는 아직 여행이 없어요',
        desc:  '저장한 여행을 이 폴더로 옮겨보세요.',
        cta:   false,
      };
    }
    return null;
  }, [trips.length, filter]);

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-white border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-4">
              <div>
                <div className="flex items-center gap-3 mb-1.5">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-red-400 to-pink-500 flex items-center justify-center shadow-md shadow-red-200">
                    <Bookmark size={17} color="white" fill="white" />
                  </div>
                  <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">저장한 여행</h1>
                </div>
                <p className="text-slate-500 text-sm ml-0 sm:ml-12">
                  마음에 드는 여행 일지를 모아봤어요.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setFolderForm('create')}
                className="shrink-0 inline-flex items-center gap-1.5 px-4 py-2.5 rounded-2xl text-sm font-bold text-violet-600 bg-violet-50 hover:bg-violet-100 border border-violet-100 transition-colors self-start sm:self-auto"
              >
                <Plus size={16} />
                폴더 만들기
              </button>
            </div>

            {(trips.length > 0 || folders.length > 0) && (
              <div className="mt-4 space-y-3">
                <FolderChipBar
                  filter={filter}
                  folders={folders}
                  counts={counts}
                  onFilterChange={setFilter}
                />
                {selectedFolder && (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setFolderForm('edit')}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-[12px] font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors"
                    >
                      <Pencil size={12} />
                      수정
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteFolderTarget(selectedFolder)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-[12px] font-bold text-red-600 bg-red-50 hover:bg-red-100 transition-colors"
                    >
                      <Trash2 size={12} />
                      삭제
                    </button>
                  </div>
                )}
              </div>
            )}
          </motion.div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <AnimatePresence mode="wait">
          {filteredTrips.length === 0 ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center justify-center py-28 text-center"
            >
              <div className="w-28 h-28 rounded-full bg-pink-50 flex items-center justify-center mb-6">
                <Heart size={48} className="text-pink-200" />
              </div>
              <h3 className="text-xl font-extrabold text-slate-800 mb-2">
                {emptyMessage?.title ?? '저장한 여행이 없어요'}
              </h3>
              <p className="text-slate-400 text-sm mb-8 max-w-xs leading-relaxed">
                {emptyMessage?.desc ?? 'Explore에서 마음에 드는 여행을 저장해보세요.'}
              </p>
              {emptyMessage?.cta && (
                <Link
                  href="/explore"
                  className="px-6 py-3 bg-gradient-to-r from-violet-500 to-indigo-500 text-white text-sm font-bold rounded-2xl shadow-md shadow-violet-200 hover:from-violet-600 hover:to-indigo-600 transition-colors"
                >
                  여행 탐색하러 가기
                </Link>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="grid"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5"
            >
              <AnimatePresence>
                {filteredTrips.map((trip, i) => {
                  const flag = FLAG[trip.country_code] ?? '🌐';
                  const dest = trip.destination ?? '여행지';
                  const isCloning = cloningId === trip.id;
                  return (
                    <motion.div
                      key={trip.savedTripId}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.92 }}
                      transition={{ duration: 0.3, delay: i * 0.04 }}
                      className="relative"
                    >
                      <Link href={`/t/${trip.id}`}>
                        <motion.div
                          whileHover={{ y: -5, boxShadow: '0 20px 56px rgba(0,0,0,0.13)' }}
                          className="rounded-[20px] overflow-hidden bg-white border border-slate-100 cursor-pointer"
                          style={{ boxShadow: '0 2px 16px rgba(0,0,0,0.07)' }}
                        >
                          <TripCoverBanner
                            coverImageUrl={trip.cover_image_url}
                            countryCode={trip.country_code}
                            destination={dest}
                            flag={flag}
                            heightClass="h-[150px]"
                            overlay={trip.cover_image_url ? 'card' : 'none'}
                          >
                            <div className="absolute top-3 left-3 bg-white/20 backdrop-blur-sm rounded-[10px] px-2 py-1 text-[11px] font-bold text-white">
                              {fmtNights(trip.nights)}
                            </div>
                          </TripCoverBanner>

                          <div className="p-4">
                            <div className="flex items-center gap-1 text-xs text-slate-400 font-semibold mb-1.5">
                              <MapPin size={11} />{dest}
                            </div>
                            <h3 className="text-[14px] font-extrabold text-slate-900 leading-snug mb-3 tracking-tight line-clamp-2">
                              {trip.title}
                            </h3>
                            <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                              <div className="flex items-center gap-1 text-[12px] text-slate-500 font-semibold">
                                <Clock size={12} className="text-slate-400" />
                                {fmtNights(trip.nights)}
                              </div>
                              <div className="flex items-center gap-1 text-xs text-slate-400 font-semibold">
                                <Eye size={12} />
                                {trip.view_count.toLocaleString()}
                              </div>
                            </div>
                            {trip.owner && (
                              <div className="mt-2 pt-2 border-t border-slate-100">
                                <OwnerBadge nickname={trip.owner.nickname} avatarUrl={trip.owner.avatar_url} />
                              </div>
                            )}
                          </div>
                        </motion.div>
                      </Link>

                      {/* 카드 메뉴 */}
                      <div className="absolute top-3 right-3 z-10">
                        <button
                          type="button"
                          onClick={e => {
                            e.preventDefault();
                            e.stopPropagation();
                            setMenuOpenId(menuOpenId === trip.id ? null : trip.id);
                          }}
                          className="w-8 h-8 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center shadow-md text-slate-500 hover:text-slate-800 transition-colors"
                          aria-label="메뉴"
                        >
                          {isCloning
                            ? <Loader2 size={14} className="animate-spin" />
                            : <MoreHorizontal size={16} />}
                        </button>
                        {menuOpenId === trip.id && (
                          <>
                            <div
                              className="fixed inset-0 z-20"
                              onClick={() => setMenuOpenId(null)}
                            />
                            <div className="absolute right-0 top-full mt-1 z-30 bg-white rounded-xl border border-slate-100 shadow-lg py-1 min-w-[160px]">
                              <button
                                type="button"
                                onClick={e => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  setMenuOpenId(null);
                                  setMoveTarget(trip);
                                }}
                                className="w-full flex items-center gap-2 px-3 py-2.5 text-[12px] font-semibold text-slate-600 hover:bg-slate-50"
                              >
                                <FolderInput size={14} className="text-violet-500" />
                                폴더 이동
                              </button>
                              <button
                                type="button"
                                onClick={e => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  handleUnsave(trip);
                                }}
                                className="w-full flex items-center gap-2 px-3 py-2.5 text-[12px] font-semibold text-slate-600 hover:bg-slate-50"
                              >
                                <Heart size={14} className="text-red-400" />
                                저장 해제
                              </button>
                              <Link
                                href={`/t/${trip.id}`}
                                onClick={() => setMenuOpenId(null)}
                                className="w-full flex items-center gap-2 px-3 py-2.5 text-[12px] font-semibold text-slate-600 hover:bg-slate-50"
                              >
                                <ExternalLink size={14} className="text-slate-400" />
                                공개 여행 보기
                              </Link>
                              <button
                                type="button"
                                disabled={isCloning}
                                onClick={e => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  handleClone(trip.id);
                                }}
                                className="w-full flex items-center gap-2 px-3 py-2.5 text-[12px] font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                              >
                                <Copy size={14} className="text-indigo-500" />
                                내 여행으로 담기
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {folderForm === 'create' && (
          <FolderFormModal
            mode="create"
            loading={folderLoading}
            onClose={() => setFolderForm(null)}
            onSubmit={handleCreateFolder}
          />
        )}
        {folderForm === 'edit' && selectedFolder && (
          <FolderFormModal
            mode="edit"
            folder={selectedFolder}
            loading={folderLoading}
            onClose={() => setFolderForm(null)}
            onSubmit={handleEditFolder}
          />
        )}
        {deleteFolderTarget && (
          <FolderDeleteDialog
            folderName={deleteFolderTarget.name}
            loading={folderLoading}
            onCancel={() => setDeleteFolderTarget(null)}
            onConfirm={handleDeleteFolder}
          />
        )}
        {moveTarget && (
          <MoveToFolderModal
            folders={folders}
            currentFolderId={moveTarget.folderId}
            loading={moveLoading}
            onClose={() => !moveLoading && setMoveTarget(null)}
            onSelect={handleMove}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {toast && <Toast key={toast} message={toast} />}
      </AnimatePresence>
    </div>
  );
}
