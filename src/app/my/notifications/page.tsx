import { redirect } from 'next/navigation';
import Navbar from '@/components/landing/Navbar';
import NotificationsClient, { type NotificationItem } from '@/components/my/NotificationsClient';
import { createClient } from '@/lib/supabase/server';
import type { NotificationType } from '@/lib/notifications/constants';

export const metadata = {
  title:  '알림',
  robots: { index: false, follow: false },
};

export default async function NotificationsPage() {
  const supabase = await createClient();

  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) redirect('/login?redirect=/my/notifications');
  const user = session.user;

  const { data: dbUser } = await supabase
    .from('users')
    .select('id')
    .eq('auth_id', user.id)
    .single();

  if (!dbUser) redirect('/login');

  const { data: rows } = await supabase
    .from('notifications')
    .select(`
      id, type, title, message, link_url, is_read, created_at,
      actor:users!actor_id(nickname, avatar_url),
      trip_rooms(title)
    `)
    .eq('user_id', dbUser.id)
    .order('created_at', { ascending: false })
    .limit(80);

  const notifications: NotificationItem[] = (rows ?? []).map(row => {
    const rawActor = row.actor as unknown;
    const actor = Array.isArray(rawActor) ? (rawActor[0] ?? null) : rawActor;
    const rawTrip = row.trip_rooms as unknown;
    const trip = Array.isArray(rawTrip) ? (rawTrip[0] ?? null) : rawTrip;
    return {
      id:         row.id,
      type:       row.type as NotificationType,
      title:      row.title,
      message:    row.message,
      link_url:   row.link_url,
      is_read:    row.is_read,
      created_at: row.created_at,
      actor:      actor as NotificationItem['actor'],
      trip_title: (trip as { title?: string } | null)?.title ?? null,
    };
  });

  return (
    <main className="min-h-screen bg-slate-50">
      <Navbar />
      <NotificationsClient
        initialNotifications={notifications}
      />
    </main>
  );
}
