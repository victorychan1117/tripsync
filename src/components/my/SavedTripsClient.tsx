'use client';

import Link from 'next/link';
import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, Clock, Eye, Heart, Bookmark } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

const FLAG: Record<string, string> = {
  KR:'🇰🇷', JP:'🇯🇵', TH:'🇹🇭', VN:'🇻🇳', ID:'🇮🇩', SG:'🇸🇬',
  MY:'🇲🇾', PH:'🇵🇭', TW:'🇹🇼', HK:'🇭🇰', CN:'🇨🇳', FR:'🇫🇷',
  IT:'🇮🇹', ES:'🇪🇸', GB:'🇬🇧', DE:'🇩🇪', US:'🇺🇸', AU:'🇦🇺',
  NZ:'🇳🇿', TR:'🇹🇷', GR:'🇬🇷', CH:'🇨🇭', MV:'🇲🇻', IN:'🇮🇳', CA:'🇨🇦',
};

const GRADIENT: Record<string, [string, string]> = {
  KR: ['#43B89C', '#3B82F6'], JP: ['#FF6B6B', '#FF8E53'],
  TH: ['#F59E0B', '#EF4444'], VN: ['#10B981', '#06B6D4'],
  ID: ['#F97316', '#EF4444'], SG: ['#0EA5E9', '#6366F1'],
  MY: ['#F59E0B', '#10B981'], PH: ['#3B82F6', '#06B6D4'],
  TW: ['#EC4899', '#8B5CF6'], HK: ['#EF4444', '#F97316'],
  CN: ['#EF4444', '#F59E0B'], FR: ['#6366F1', '#3B82F6'],
};

export interface SavedTrip {
  id: string;
  title: string;
  destination: string | null;
  country_code: string;
  nights: number;
  marker_count: number;
  view_count: number;
}

function fmtNights(nights: number): string {
  if (nights === 0) return '당일치기';
  return `${nights}박 ${nights + 1}일`;
}

function getGradient(code: string): [string, string] {
  return GRADIENT[code] ?? ['#6366F1', '#8B5CF6'];
}

function Toast({ message }: { message: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 12 }}
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[200] bg-slate-900 text-white text-sm font-semibold px-5 py-3 rounded-2xl shadow-xl pointer-events-none whitespace-nowrap"
    >
      {message}
    </motion.div>
  );
}

export default function SavedTripsClient({
  trips: initialTrips,
  userId,
}: {
  trips: SavedTrip[];
  userId: string;
}) {
  const [trips, setTrips] = useState<SavedTrip[]>(initialTrips);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  }, []);

  const handleUnsave = useCallback(async (e: React.MouseEvent, tripId: string) => {
    e.preventDefault();
    e.stopPropagation();

    // 낙관적 제거
    setTrips(prev => prev.filter(t => t.id !== tripId));

    const supabase = createClient();
    const { error } = await supabase
      .from('saved_trips')
      .delete()
      .eq('user_id', userId)
      .eq('room_id', tripId);

    if (error) {
      // 롤백
      setTrips(initialTrips);
      showToast('저장 해제에 실패했어요.');
    } else {
      showToast('저장을 취소했어요.');
    }
  }, [userId, initialTrips, showToast]);

  return (
    <div className="min-h-screen bg-slate-50">
      {/* 헤더 */}
      <div className="bg-white border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <div className="flex items-center gap-3 mb-1.5">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-red-400 to-pink-500 flex items-center justify-center shadow-md shadow-red-200">
                <Bookmark size={17} color="white" fill="white" />
              </div>
              <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
                저장한 여행
              </h1>
            </div>
            <p className="text-slate-500 text-sm ml-12">
              {trips.length > 0
                ? `총 ${trips.length}개의 여행을 저장했어요`
                : '아직 저장한 여행이 없어요'}
            </p>
          </motion.div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <AnimatePresence mode="wait">
          {trips.length === 0 ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center justify-center py-28 text-center"
            >
              <div className="w-28 h-28 rounded-full bg-pink-50 flex items-center justify-center mb-6">
                <Heart size={48} className="text-pink-200" />
              </div>
              <h3 className="text-xl font-extrabold text-slate-800 mb-2">저장한 여행이 없어요</h3>
              <p className="text-slate-400 text-sm mb-8 max-w-xs leading-relaxed">
                Explore에서 마음에 드는 여행을 발견하고 하트를 눌러 저장해보세요.
              </p>
              <Link
                href="/explore"
                className="px-6 py-3 bg-gradient-to-r from-violet-500 to-indigo-500 text-white text-sm font-bold rounded-2xl shadow-md shadow-violet-200 hover:from-violet-600 hover:to-indigo-600 transition-colors"
              >
                여행 탐색하러 가기
              </Link>
            </motion.div>
          ) : (
            <motion.div
              key="grid"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5"
            >
              <AnimatePresence>
                {trips.map((trip, i) => {
                  const [g1, g2] = getGradient(trip.country_code);
                  const flag     = FLAG[trip.country_code] ?? '🌐';
                  const dest     = trip.destination ?? '여행지';

                  return (
                    <motion.div
                      key={trip.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.92 }}
                      transition={{ duration: 0.3, delay: i * 0.04 }}
                    >
                      <Link href={`/t/${trip.id}`}>
                        <motion.div
                          whileHover={{ y: -5, boxShadow: '0 20px 56px rgba(0,0,0,0.13)' }}
                          className="rounded-[20px] overflow-hidden bg-white border border-slate-100 cursor-pointer"
                          style={{ boxShadow: '0 2px 16px rgba(0,0,0,0.07)' }}
                        >
                          {/* 그라디언트 헤더 */}
                          <div
                            className="h-[150px] relative flex items-center justify-center"
                            style={{ background: `linear-gradient(135deg, ${g1}, ${g2})` }}
                          >
                            <div className="text-center">
                              <div className="text-5xl mb-2 drop-shadow">{flag}</div>
                              <div className="text-white/90 text-[13px] font-bold drop-shadow">{dest}</div>
                            </div>
                            <div className="absolute top-3 left-3 bg-white/20 backdrop-blur-sm rounded-[10px] px-2 py-1 text-[11px] font-bold text-white">
                              {fmtNights(trip.nights)}
                            </div>

                            {/* 저장 해제 버튼 */}
                            <motion.button
                              onClick={e => handleUnsave(e, trip.id)}
                              whileTap={{ scale: 0.75 }}
                              className="absolute bottom-3 right-3 w-8 h-8 rounded-full bg-red-500 flex items-center justify-center shadow-md"
                              title="저장 취소"
                            >
                              <Heart size={14} fill="white" color="white" />
                            </motion.button>
                          </div>

                          {/* 콘텐츠 */}
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
                          </div>
                        </motion.div>
                      </Link>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {toast && <Toast key={toast + Date.now()} message={toast} />}
      </AnimatePresence>
    </div>
  );
}
