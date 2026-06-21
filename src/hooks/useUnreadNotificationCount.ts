'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';

/** Navbar 등에서 unread count 조회 */
export function useUnreadNotificationCount(enabled: boolean) {
  const [count, setCount] = useState(0);

  const refresh = useCallback(async () => {
    if (!enabled) {
      setCount(0);
      return;
    }
    const supabase = createClient();
    const { count: unread, error } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('is_read', false);

    if (!error) setCount(unread ?? 0);
  }, [enabled]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    if (!enabled) return;
    const onUpdate = () => { refresh(); };
    window.addEventListener('notifications-updated', onUpdate);
    return () => window.removeEventListener('notifications-updated', onUpdate);
  }, [enabled, refresh]);

  return { count, refresh };
}

export function dispatchNotificationsUpdated() {
  window.dispatchEvent(new Event('notifications-updated'));
}
