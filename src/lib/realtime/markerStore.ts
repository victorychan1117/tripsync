'use client';
import { create } from 'zustand';
import { createClient } from '@/lib/supabase/client';
import { calcMidOrderIndex } from '@/lib/utils';
import type { Marker, MarkerInsert, MarkerWithRoute, RouteSegment } from '@/lib/supabase/types';
import type { MarkerEvent } from './useRoomSync';

interface MarkerStore {
  markers:        Map<number, MarkerWithRoute>;
  // 낙관적 추가 중인 tempId 목록 (실제 DB id로 교체 전까지 유지)
  // key: tempId (음수 숫자 문자열) — userId 기반이 아닌 요청별 고유값 사용
  pendingTempIds: Set<string>;

  loadMarkers:             (roomId: string) => Promise<void>;
  addMarkerOptimistic:     (insert: Omit<MarkerInsert, 'order_index'>) => Promise<void>;
  updateMarkerOptimistic:  (id: number, patch: Partial<Marker>) => Promise<void>;
  removeMarkerOptimistic:  (id: number) => Promise<void>;
  reorderMarkerOptimistic: (id: number, newDayNumber: number, afterOrderIndex: number | null) => Promise<void>;
  applyRealtimeEvent:      (event: MarkerEvent) => void;
  setRouteSegment:         (fromId: number, segment: RouteSegment) => void;
  getMarkersByDay:         (dayNumber: number) => MarkerWithRoute[];
}

const supabase = createClient();

export const useMarkerStore = create<MarkerStore>((set, get) => ({
  markers:        new Map(),
  pendingTempIds: new Set(),

  // ── 초기 로드 ───────────────────────────────────────────────────
  loadMarkers: async (roomId) => {
    const { data, error } = await supabase
      .from('markers')
      .select('*')
      .eq('room_id', roomId)
      .order('day_number')
      .order('order_index');

    if (error) { console.error('loadMarkers error:', error); return; }

    const map = new Map<number, MarkerWithRoute>();
    (data ?? []).forEach((m: any) => map.set(m.id, m));
    set({ markers: map });
  },

  // ── 낙관적 추가 ─────────────────────────────────────────────────
  addMarkerOptimistic: async (insert) => {
    const { markers } = get();

    // tempId는 요청별 고유 음수값 — 같은 사용자가 연속 추가해도 겹치지 않음
    const tempId     = -(Date.now() * 1000 + Math.floor(Math.random() * 1000));
    const tempKey    = String(tempId);

    const dayMarkers = [...markers.values()]
      .filter(m => m.day_number === insert.day_number && m.id > 0)
      .sort((a, b) => a.order_index - b.order_index);
    const lastOrder  = dayMarkers.at(-1)?.order_index ?? 0;
    const orderIndex = lastOrder + 1.0;

    const optimistic: MarkerWithRoute = {
      ...(insert as any),
      id:          tempId,
      order_index: orderIndex,
      vote_up:     0, vote_down: 0,
      created_at:  new Date().toISOString(),
      updated_at:  new Date().toISOString(),
    };

    set(state => ({
      markers:        new Map(state.markers).set(tempId, optimistic),
      pendingTempIds: new Set(state.pendingTempIds).add(tempKey),
    }));

    const { data, error } = await supabase
      .from('markers')
      .insert({ ...insert, order_index: orderIndex })
      .select()
      .single();

    if (error) {
      set(state => {
        const newMap = new Map(state.markers);
        newMap.delete(tempId);
        const newPending = new Set(state.pendingTempIds);
        newPending.delete(tempKey);
        return { markers: newMap, pendingTempIds: newPending };
      });
      console.error('addMarker error:', error);
      return;
    }

    // 임시 ID → 실제 DB ID 교체
    // useRoomSync에서는 이 실제 ID가 pendingTempIds에 없으므로 중복 처리 안 됨
    set(state => {
      const newMap = new Map(state.markers);
      newMap.delete(tempId);
      newMap.set(data.id, data);
      const newPending = new Set(state.pendingTempIds);
      newPending.delete(tempKey);
      return { markers: newMap, pendingTempIds: newPending };
    });
  },

  // ── 낙관적 수정 ─────────────────────────────────────────────────
  updateMarkerOptimistic: async (id, patch) => {
    const prev = get().markers.get(id);
    if (!prev) return;

    set(state => ({
      markers: new Map(state.markers).set(id, { ...prev, ...patch }),
    }));

    const { error } = await supabase
      .from('markers')
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) {
      set(state => ({
        markers: new Map(state.markers).set(id, prev),
      }));
      console.error('updateMarker error:', error);
      throw error;
    }
  },

  // ── 낙관적 삭제 ─────────────────────────────────────────────────
  removeMarkerOptimistic: async (id) => {
    const prev = get().markers.get(id);
    if (!prev) return;

    set(state => {
      const newMap = new Map(state.markers);
      newMap.delete(id);
      return { markers: newMap };
    });

    const { error } = await supabase
      .from('markers')
      .delete()
      .eq('id', id);

    if (error) {
      set(state => ({
        markers: new Map(state.markers).set(id, prev),
      }));
      console.error('removeMarker error:', error);
      throw error;
    }
  },

  // ── 낙관적 재정렬 ───────────────────────────────────────────────
  reorderMarkerOptimistic: async (id, newDayNumber, afterOrderIndex) => {
    const { markers } = get();
    const marker = markers.get(id);
    if (!marker) return;

    const dayMarkers = [...markers.values()]
      .filter(m => m.day_number === newDayNumber && m.id !== id && m.id > 0)
      .sort((a, b) => a.order_index - b.order_index);

    const prevIdx  = afterOrderIndex;
    const afterIdx = dayMarkers.find(m => m.order_index > (afterOrderIndex ?? 0))?.order_index ?? null;
    const newOrder = calcMidOrderIndex(prevIdx, afterIdx);

    const prev = { ...marker };

    set(state => ({
      markers: new Map(state.markers).set(id, {
        ...marker, day_number: newDayNumber, order_index: newOrder,
      }),
    }));

    const { error } = await supabase
      .from('markers')
      .update({ day_number: newDayNumber, order_index: newOrder })
      .eq('id', id);

    if (error) {
      set(state => ({ markers: new Map(state.markers).set(id, prev) }));
      console.error('reorderMarker error:', error);
      throw error;
    }
  },

  // ── 실시간 이벤트 적용 ──────────────────────────────────────────
  applyRealtimeEvent: (event) => {
    set(state => {
      const newMap = new Map(state.markers);

      switch (event.type) {
        case 'MARKER_ADDED':
          // 이미 낙관적으로 추가된 실제 id면 덮어쓰기 (DB 확정값으로 갱신)
          newMap.set(event.payload.id, event.payload);
          break;
        case 'MARKER_UPDATED':
          newMap.set(event.payload.id, { ...newMap.get(event.payload.id), ...event.payload });
          break;
        case 'MARKER_DELETED':
          newMap.delete(event.payload.id);
          break;
        case 'MARKER_REORDERED': {
          const m = newMap.get(event.payload.id);
          if (m) newMap.set(event.payload.id, {
            ...m,
            day_number:  event.payload.day_number,
            order_index: event.payload.order_index,
          });
          break;
        }
      }
      return { markers: newMap };
    });
  },

  // ── 경로 세그먼트 저장 ──────────────────────────────────────────
  setRouteSegment: (fromId, segment) => {
    set(state => {
      const marker = state.markers.get(fromId);
      if (!marker) return state;
      return {
        markers: new Map(state.markers).set(fromId, { ...marker, route: segment }),
      };
    });
  },

  // ── 셀렉터: Day별 정렬된 마커 배열 ─────────────────────────────
  getMarkersByDay: (dayNumber) => {
    return [...get().markers.values()]
      .filter(m => m.day_number === dayNumber && m.id > 0)
      .sort((a, b) => a.order_index - b.order_index);
  },
}));
