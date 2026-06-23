'use client';
import { useEffect, useRef, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Marker, TripRoom, PresenceUser } from '@/lib/supabase/types';

// ── 이벤트 타입 ───────────────────────────────────────────────────
export type MarkerEvent =
  | { type: 'MARKER_ADDED';     payload: Marker }
  | { type: 'MARKER_UPDATED';   payload: Marker }
  | { type: 'MARKER_DELETED';   payload: { id: number } }
  | { type: 'MARKER_REORDERED'; payload: { id: number; day_number: number; order_index: number } };

export type PresenceEvent =
  | { type: 'MEMBER_JOINED';  payload: PresenceUser }
  | { type: 'MEMBER_LEFT';    payload: { userId: string } }
  | { type: 'CURSOR_MOVED';   payload: { userId: string; lat: number; lng: number } };

export type RoomEvent =
  | { type: 'ROOM_LOCKED' }
  | { type: 'ROOM_UNLOCKED' }
  | { type: 'ROOM_PUBLIC_TOGGLED'; payload: { isPublic: boolean } };

interface UseRoomSyncOptions {
  currentUserId:   string | null;
  currentNickname: string;
  currentColor:    string;
  onMarkerEvent:   (e: MarkerEvent) => void;
  onPresenceEvent: (e: PresenceEvent) => void;
  onRoomEvent:     (e: RoomEvent) => void;
  // 하위 호환 유지용 — 현재 useRoomSync 내부에서 사용하지 않음
  // markerStore의 낙관적 업데이트와 applyRealtimeEvent가 idempotent하게 처리함
  pendingTempIds?: React.RefObject<Set<string>>;
}

// ── throttle 유틸 ─────────────────────────────────────────────────
function throttle<T extends (...args: any[]) => void>(fn: T, ms: number): T {
  let lastCall = 0;
  return ((...args: any[]) => {
    const now = Date.now();
    if (now - lastCall >= ms) {
      lastCall = now;
      fn(...args);
    }
  }) as T;
}

// ════════════════════════════════════════════════════════════════════
export function useRoomSync(roomId: string, options: UseRoomSyncOptions) {
  const supabase   = createClient();
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // ── stale closure 방지: 콜백을 ref로 보관 ──────────────────────
  // useEffect deps에 콜백 함수를 넣으면 매번 재구독이 발생하므로,
  // ref로 최신 값을 유지하고 effect 내부에서는 ref를 호출한다.
  const callbacksRef = useRef(options);
  useEffect(() => {
    callbacksRef.current = options;
  });

  // ── broadcastCursor: throttle 인스턴스를 ref로 안정화 ──────────
  // useCallback 안에서 throttle()을 생성하면 deps 변경 시 throttle
  // 상태(lastCall)가 초기화되므로, ref에 인스턴스를 고정한다.
  const throttledSendRef = useRef(
    throttle((userId: string | null, lat: number, lng: number) => {
      channelRef.current?.send({
        type:    'broadcast',
        event:   'cursor_move',
        payload: { userId, lat, lng },
      });
    }, 100),
  );

  const broadcastCursor = useCallback((lat: number, lng: number) => {
    throttledSendRef.current(callbacksRef.current.currentUserId, lat, lng);
  }, []);

  useEffect(() => {
    if (!roomId) return;

    const { currentUserId, currentNickname, currentColor } = callbacksRef.current;

    const channel = supabase.channel(`room:${roomId}`, {
      config: {
        broadcast: { self: false },
        presence:  { key: currentUserId ?? 'guest' },
      },
    });

    // ── markers INSERT ───────────────────────────────────────────
    channel.on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'markers', filter: `room_id=eq.${roomId}` },
      (payload: any) => {
        // applyRealtimeEvent는 idempotent — 이미 낙관적으로 추가된 마커도
        // 실제 DB 값으로 덮어쓰기만 하므로 dedup 없이 항상 처리한다.
        callbacksRef.current.onMarkerEvent({ type: 'MARKER_ADDED', payload: payload.new as Marker });
      },
    );

    // ── markers UPDATE ───────────────────────────────────────────
    channel.on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'markers', filter: `room_id=eq.${roomId}` },
      (payload: any) => {
        const newM = payload.new as Marker;
        const oldM = payload.old as Partial<Marker>;

        const isReorder = (
          oldM.order_index !== newM.order_index ||
          oldM.day_number  !== newM.day_number
        ) && oldM.name === newM.name;

        if (isReorder) {
          callbacksRef.current.onMarkerEvent({
            type: 'MARKER_REORDERED',
            payload: { id: newM.id, day_number: newM.day_number, order_index: newM.order_index },
          });
        } else {
          callbacksRef.current.onMarkerEvent({ type: 'MARKER_UPDATED', payload: newM });
        }
      },
    );

    // ── markers DELETE ───────────────────────────────────────────
    channel.on(
      'postgres_changes',
      { event: 'DELETE', schema: 'public', table: 'markers', filter: `room_id=eq.${roomId}` },
      (payload: any) => {
        const old = payload.old as Partial<Marker>;
        if (old.id) {
          callbacksRef.current.onMarkerEvent({ type: 'MARKER_DELETED', payload: { id: old.id } });
        }
      },
    );

    // ── trip_rooms UPDATE ────────────────────────────────────────
    channel.on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'trip_rooms', filter: `id=eq.${roomId}` },
      (payload: any) => {
        const newR = payload.new as TripRoom;
        const oldR = payload.old as Partial<TripRoom>;

        if (newR.is_locked && !oldR.is_locked)  callbacksRef.current.onRoomEvent({ type: 'ROOM_LOCKED' });
        if (!newR.is_locked && oldR.is_locked)  callbacksRef.current.onRoomEvent({ type: 'ROOM_UNLOCKED' });
        if (newR.is_public !== oldR.is_public) {
          callbacksRef.current.onRoomEvent({ type: 'ROOM_PUBLIC_TOGGLED', payload: { isPublic: newR.is_public } });
        }
      },
    );

    // ── Presence ─────────────────────────────────────────────────
    channel.on('presence', { event: 'sync' }, () => {
      const state = (channel as any).presenceState() as Record<string, PresenceUser[]>;
      Object.values(state).flat().forEach(user =>
        callbacksRef.current.onPresenceEvent({ type: 'MEMBER_JOINED', payload: user })
      );
    });

    channel.on('presence', { event: 'join' }, ({ newPresences }: any) => {
      (newPresences as PresenceUser[]).forEach(p =>
        callbacksRef.current.onPresenceEvent({ type: 'MEMBER_JOINED', payload: p })
      );
    });

    channel.on('presence', { event: 'leave' }, ({ leftPresences }: any) => {
      (leftPresences as PresenceUser[]).forEach(p =>
        callbacksRef.current.onPresenceEvent({ type: 'MEMBER_LEFT', payload: { userId: p.userId } })
      );
    });

    channel.on('broadcast', { event: 'cursor_move' }, ({ payload }: any) => {
      callbacksRef.current.onPresenceEvent({ type: 'CURSOR_MOVED', payload });
    });

    channel.subscribe(async (status: any) => {
      if (status === 'SUBSCRIBED') {
        const { currentUserId: uid, currentNickname: nick, currentColor: color } = callbacksRef.current;
        await channel.track({
          userId:   uid ?? `guest-${Date.now()}`,
          nickname: nick,
          color,
          joinedAt: new Date().toISOString(),
        } satisfies PresenceUser);
      }
    });

    channelRef.current = channel;

    return () => {
      channel.untrack();
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  // roomId가 바뀔 때만 재구독. currentUserId 변경은 재구독 불필요
  // (presence track은 subscribe 콜백 안에서 callbacksRef로 최신값 참조)
  }, [roomId]); // eslint-disable-line react-hooks/exhaustive-deps

  return { broadcastCursor };
}
