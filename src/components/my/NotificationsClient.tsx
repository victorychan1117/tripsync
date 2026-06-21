'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, CheckCheck, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';
import {
  NOTIFICATION_ICONS,
  formatRelativeTime,
  type NotificationType,
} from '@/lib/notifications/constants';
import { dispatchNotificationsUpdated } from '@/hooks/useUnreadNotificationCount';

export interface NotificationItem {
  id: number;
  type: NotificationType;
  title: string;
  message: string | null;
  link_url: string | null;
  is_read: boolean;
  created_at: string;
  actor: { nickname: string; avatar_url: string | null } | null;
  trip_title: string | null;
}

function ActorAvatar({ nickname, avatarUrl }: { nickname: string; avatarUrl: string | null }) {
  const initial = nickname.charAt(0).toUpperCase();
  if (avatarUrl && (avatarUrl.startsWith('http://') || avatarUrl.startsWith('https://'))) {
    return (
      <img
        src={avatarUrl}
        alt=""
        className="w-10 h-10 rounded-full object-cover border-2 border-white shadow-sm shrink-0"
      />
    );
  }
  if (avatarUrl) {
    return (
      <div className="w-10 h-10 rounded-full bg-white border-2 border-white shadow-sm flex items-center justify-center shrink-0 text-lg">
        {avatarUrl}
      </div>
    );
  }
  return (
    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-400 to-indigo-500 flex items-center justify-center text-sm font-extrabold text-white shrink-0 shadow-sm">
      {initial}
    </div>
  );
}

interface NotificationsClientProps {
  initialNotifications: NotificationItem[];
}

export default function NotificationsClient({
  initialNotifications,
}: NotificationsClientProps) {
  const router = useRouter();
  const [items, setItems] = useState(initialNotifications);
  const [markingAll, setMarkingAll] = useState(false);
  const [markingId, setMarkingId] = useState<number | null>(null);

  const unreadCount = items.filter(n => !n.is_read).length;

  const markRead = useCallback(async (id: number) => {
    const prev = items;
    setItems(cur => cur.map(n => n.id === id ? { ...n, is_read: true } : n));
    const supabase = createClient();
    const { error } = await supabase.from('notifications').update({ is_read: true }).eq('id', id);
    if (error) {
      setItems(prev);
      return;
    }
    dispatchNotificationsUpdated();
  }, [items]);

  const handleClick = useCallback(async (item: NotificationItem) => {
    setMarkingId(item.id);
    if (!item.is_read) await markRead(item.id);
    setMarkingId(null);
    if (item.link_url) router.push(item.link_url);
  }, [markRead, router]);

  const handleMarkAllRead = useCallback(async () => {
    if (unreadCount === 0) return;
    const prev = items;
    setMarkingAll(true);
    setItems(cur => cur.map(n => ({ ...n, is_read: true })));

    const supabase = createClient();
    const { error } = await supabase.rpc('mark_all_notifications_read');
    if (error) setItems(prev);
    else dispatchNotificationsUpdated();
    setMarkingAll(false);
  }, [unreadCount, items]);

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-white border-b border-slate-100">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
          <div className="flex items-start justify-between gap-4">
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
              <div className="flex items-center gap-3 mb-1.5">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-500 flex items-center justify-center shadow-md shadow-violet-200">
                  <Bell size={17} color="white" />
                </div>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">알림</h1>
              </div>
              <p className="text-slate-500 text-sm ml-12">
                내 여행에 생긴 소식을 모아봤어요.
              </p>
            </motion.div>

            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllRead}
                disabled={markingAll}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-violet-600 bg-violet-50 hover:bg-violet-100 border border-violet-100 px-3 py-2 rounded-xl transition-colors disabled:opacity-50 shrink-0 mt-1"
              >
                {markingAll
                  ? <Loader2 size={14} className="animate-spin" />
                  : <CheckCheck size={14} />}
                모두 읽음
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
        {items.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center py-24 text-center"
          >
            <div className="w-24 h-24 rounded-full bg-violet-50 flex items-center justify-center mb-5">
              <Bell size={40} className="text-violet-200" />
            </div>
            <h3 className="text-lg font-extrabold text-slate-800 mb-2">아직 알림이 없어요</h3>
            <p className="text-slate-400 text-sm max-w-xs leading-relaxed">
              내 여행에 새로운 소식이 생기면 알려드릴게요.
            </p>
            <Link
              href="/my/trips"
              className="mt-6 text-sm font-bold text-violet-600 hover:text-violet-700 transition-colors"
            >
              내 여행 일지 보기 →
            </Link>
          </motion.div>
        ) : (
          <ul className="flex flex-col gap-2.5">
            <AnimatePresence initial={false}>
              {items.map((item, i) => {
                const icon = NOTIFICATION_ICONS[item.type] ?? '🔔';
                const actorName = item.actor?.nickname ?? '누군가';
                return (
                  <motion.li
                    key={item.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(i * 0.03, 0.2) }}
                  >
                    <button
                      type="button"
                      onClick={() => handleClick(item)}
                      disabled={markingId === item.id}
                      className={cn(
                        'w-full text-left flex gap-3 p-4 rounded-2xl border transition-all duration-200',
                        item.is_read
                          ? 'bg-white border-slate-100 hover:border-violet-100 hover:shadow-sm'
                          : 'bg-violet-50/80 border-violet-200 shadow-sm hover:shadow-md',
                      )}
                    >
                      {item.actor ? (
                        <ActorAvatar nickname={item.actor.nickname} avatarUrl={item.actor.avatar_url} />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-lg shrink-0">
                          {icon}
                        </div>
                      )}

                      <div className="flex-1 min-w-0">
                        <div className="flex items-start gap-2 mb-0.5">
                          <p className={cn(
                            'text-[13px] leading-snug flex-1',
                            item.is_read ? 'font-semibold text-slate-700' : 'font-extrabold text-slate-900',
                          )}>
                            {item.title}
                          </p>
                          {!item.is_read && (
                            <span className="w-2 h-2 rounded-full bg-violet-500 shrink-0 mt-1.5" />
                          )}
                        </div>
                        {item.message && (
                          <p className="text-[12px] text-slate-500 line-clamp-2 mb-1">{item.message}</p>
                        )}
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px] text-slate-400 font-semibold">
                          <span>{formatRelativeTime(item.created_at)}</span>
                          {item.trip_title && (
                            <>
                              <span>·</span>
                              <span className="truncate max-w-[160px]">{item.trip_title}</span>
                            </>
                          )}
                          {item.type === 'trip_saved' && !item.actor && (
                            <>
                              <span>·</span>
                              <span>{actorName}</span>
                            </>
                          )}
                        </div>
                      </div>

                      {markingId === item.id && (
                        <Loader2 size={16} className="animate-spin text-violet-400 shrink-0 self-center" />
                      )}
                    </button>
                  </motion.li>
                );
              })}
            </AnimatePresence>
          </ul>
        )}
      </div>
    </div>
  );
}
