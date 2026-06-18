'use client';
// ════════════════════════════════════════════════════════════════════
// useRoomSync — Supabase Realtime 구독 훅
// markers/trip_rooms 테이블 변경 감지 + Presence (온라인 멤버)
// ════════════════════════════════════════════════════════════════════
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
  currentUserId:    string | null;
  currentNickname:  string;
  currentColor:     string;
  onMarkerEvent:    (e: MarkerEvent) => void;
  onPresenceEvent:  (e: PresenceEvent) => void;
  onRoomEvent:      (e: RoomEvent) => void;
  // 낙관적 업데이트와 실시간 이벤트 중복 방지용
  pendingTempIds:   React.RefObject<Set<string>>;
}

// ── 온라인 멤버 목록 동기화 헬퍼 ─────────────────────────────────
function syncOnlineMembers(
  state: Record<string, PresenceUser[]>,
  onPresenceEvent: (e: PresenceEvent) => void,
) {
  // Presence state 전체를 현재 온라인 멤버로 갱신
  const online = Object.values(state).flat();
  // 편의상 JOIN 이벤트로 전체 갱신 알림
  online.forEach(user =>
    onPresenceEvent({ type: 'MEMBER_JOINED', payload: user })
  );
}

// ════════════════════════════════════════════════════════════════════
export function useRoomSync(roomId: string, options: UseRoomSyncOptions) {
  const supabase   = createClient();
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const {
    currentUserId, currentNickname, currentColor,
    onMarkerEvent, onPresenceEvent, onRoomEvent, pendingTempIds,
  } = options;

  // ── 커서 위치 브로드캐스트 (throttle: 100ms) ──────────────────
  const broadcastCursor = useCallback(
    throttle((lat: number, lng: number) => {
      channelRef.current?.send({
        type:    'broadcast',
        event:   'cursor_move',
        payload: { userId: currentUserId, lat, lng },
      });
    }, 100),
    [currentUserId],
  );

  useEffect(() => {
    if (!roomId) return;

    // ── 채널 생성 ────────────────────────────────────────────────
    const channel = supabase.channel(`room:${roomId}`, {
      config: {
        broadcast: { self: false },       // 내 이벤트는 수신 안 함
        presence:  { key: currentUserId ?? 'guest' },
      },
    });

    // ── markers INSERT ───────────────────────────────────────────
    channel.on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'markers', filter: `room_id=eq.${roomId}` },
      (payload) => {
        const marker = payload.new as Marker;
        // 낙관적 업데이트 중인 항목은 무시 (중복 방지)
        if (pendingTempIds.current?.has(`temp-${marker.added_by_user}`)) return;
        onMarkerEvent({ type: 'MARKER_ADDED', payload: marker });
      },
    );

    // ── markers UPDATE ───────────────────────────────────────────
    channel.on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'markers', filter: `room_id=eq.${roomId}` },
      (payload) => {
        const newM = payload.new as Marker;
        const oldM = payload.old as Partial<Marker>;

        // order_index / day_number만 변경된 경우 → REORDER
        const isReorder = (
          oldM.order_index !== newM.order_index ||
          oldM.day_number  !== newM.day_number
        ) && oldM.name === newM.name;

        if (isReorder) {
          onMarkerEvent({
            type: 'MARKER_REORDERED',
            payload: { id: newM.id, day_number: newM.day_number, order_index: newM.order_index },
          });
        } else {
          onMarkerEvent({ type: 'MARKER_UPDATED', payload: newM });
        }
      },
    );

    // ── markers DELETE ───────────────────────────────────────────
    channel.on(
      'postgres_changes',
      { event: 'DELETE', schema: 'public', table: 'markers', filter: `room_id=eq.${roomId}` },
      (payload) => {
        const old = payload.old as Partial<Marker>;
        if (old.id) onMarkerEvent({ type: 'MARKER_DELETED', payload: { id: old.id } });
      },
    );

    // ── trip_rooms UPDATE (잠금 / 공개 상태 변경) ────────────────
    channel.on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'trip_rooms', filter: `id=eq.${roomId}` },
      (payload) => {
        const newR = payload.new as TripRoom;
        const oldR = payload.old as Partial<TripRoom>;

        if (newR.is_locked && !oldR.is_locked)  onRoomEvent({ type: 'ROOM_LOCKED' });
        if (!newR.is_locked && oldR.is_locked)  onRoomEvent({ type: 'ROOM_UNLOCKED' });
        if (newR.is_public !== oldR.is_public)  {
          onRoomEvent({ type: 'ROOM_PUBLIC_TOGGLED', payload: { isPublic: newR.is_public } });
        }
      },
    );

    // ── Presence — 온라인 멤버 전체 동기화 ──────────────────────
    channel.on('presence', { event: 'sync' }, () => {
      const state = channel.presenceState<PresenceUser>();
      syncOnlineMembers(state, onPresenceEvent);
    });

    channel.on('presence', { event: 'join' }, ({ newPresences }) => {
      (newPresences as PresenceUser[]).forEach(p =>
        onPresenceEvent({ type: 'MEMBER_JOINED', payload: p })
      );
    });

    channel.on('presence', { event: 'leave' }, ({ leftPresences }) => {
      (leftPresences as PresenceUser[]).forEach(p =>
        onPresenceEvent({ type: 'MEMBER_LEFT', payload: { userId: p.userId } })
      );
    });

    // ── Broadcast — 커서 이동 (DB 저장 불필요, 고빈도) ──────────
    channel.on('broadcast', { event: 'cursor_move' }, ({ payload }) => {
      onPresenceEvent({ type: 'CURSOR_MOVED', payload });
    });

    // ── 구독 시작 + Presence 등록 ────────────────────────────────
    channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await channel.track({
          userId:   currentUserId ?? `guest-${Date.now()}`,
          nickname: currentNickname,
          color:    currentColor,
          joinedAt: new Date().toISOString(),
        } satisfies PresenceUser);
      }
    });

    channelRef.current = channel;

    // ── 클린업 ───────────────────────────────────────────────────
    return () => {
      channel.untrack();
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [roomId, currentUserId]);

  return { broadcastCursor };
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
