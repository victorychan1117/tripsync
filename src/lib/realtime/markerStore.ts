'use client';
// ════════════════════════════════════════════════════════════════════
// markerStore — Zustand 전역 상태 (낙관적 업데이트 + 실시간 동기화)
// ════════════════════════════════════════════════════════════════════
import { create } from 'zustand';
import { createClient } from '@/lib/supabase/client';
import { calcMidOrderIndex } from '@/lib/utils';
import type { Marker, MarkerInsert, MarkerWithRoute, RouteSegment } from '@/lib/supabase/types';
import type { MarkerEvent } from './useRoomSync';

interface MarkerStore {
  // 상태
  markers:        Map<number, MarkerWithRoute>;
  pendingTempIds: Set<string>;

  // 초기 로드
  loadMarkers:    (roomId: string) => Promise<void>;

  // 낙관적 CRUD
  addMarkerOptimistic:    (insert: Omit<MarkerInsert, 'order_index'>) => Promise<void>;
  updateMarkerOptimistic: (id: number, patch: Partial<Marker>) => Promise<void>;
  removeMarkerOptimistic: (id: number) => Promise<void>;
  reorderMarkerOptimistic:(id: number, newDayNumber: number, afterOrderIndex: number | null) => Promise<void>;

  // 실시간 이벤트 적용
  applyRealtimeEvent: (event: MarkerEvent) => void;

  // 경로 정보 업데이트
  setRouteSegment: (fromId: number, segment: RouteSegment) => void;

  // 셀렉터
  getMarkersByDay: (dayNumber: number) => MarkerWithRoute[];
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
    (data ?? []).forEach(m => map.set(m.id, m));
    set({ markers: map });
  },

  // ── 낙관적 추가 ─────────────────────────────────────────────────
  addMarkerOptimistic: async (insert) => {
    const { markers } = get();
    const tempId      = Date.now();           // 임시 음수 ID

    // 현재 day의 마커들 중 최대 order_index 뒤에 추가
    const dayMarkers  = [...markers.values()]
      .filter(m => m.day_number === insert.day_number)
      .sort((a, b) => a.order_index - b.order_index);
    const lastOrder   = dayMarkers.at(-1)?.order_index ?? 0;
    const orderIndex  = lastOrder + 1.0;

    const optimistic: MarkerWithRoute = {
      ...(insert as any),
      id:          -tempId,
      order_index: orderIndex,
      vote_up:     0, vote_down: 0,
      created_at:  new Date().toISOString(),
      updated_at:  new Date().toISOString(),
    };

    // 낙관적으로 즉시 UI 반영
    set(state => ({
      markers:        new Map(state.markers).set(-tempId, optimistic),
      pendingTempIds: new Set(state.pendingTempIds).add(`temp-${insert.added_by_user}`),
    }));

    // DB 실제 저장
    const { data, error } = await supabase
      .from('markers')
      .insert({ ...insert, order_index: orderIndex })
      .select()
      .single();

    if (error) {
      // 롤백
      set(state => {
        const newMap = new Map(state.markers);
        newMap.delete(-tempId);
        return { markers: newMap };
      });
      console.error('addMarker error:', error);
      return;
    }

    // 임시 ID → 실제 ID로 교체
    set(state => {
      const newMap = new Map(state.markers);
      newMap.delete(-tempId);
      newMap.set(data.id, data);
      const newPending = new Set(state.pendingTempIds);
      newPending.delete(`temp-${insert.added_by_user}`);
      return { markers: newMap, pendingTempIds: newPending };
    });
  },

  // ── 낙관적 수정 ─────────────────────────────────────────────────
  updateMarkerOptimistic: async (id, patch) => {
    const prev = get().markers.get(id);
    if (!prev) return;

    // 즉시 UI 반영
    set(state => ({
      markers: new Map(state.markers).set(id, { ...prev, ...patch }),
    }));

    const { error } = await supabase
      .from('markers')
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) {
      // 롤백
      set(state => ({
        markers: new Map(state.markers).set(id, prev),
      }));
      console.error('updateMarker error:', error);
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
      // 롤백
      set(state => ({
        markers: new Map(state.markers).set(id, prev),
      }));
      console.error('removeMarker error:', error);
    }
  },

  // ── 낙관적 재정렬 ───────────────────────────────────────────────
  reorderMarkerOptimistic: async (id, newDayNumber, afterOrderIndex) => {
    const { markers } = get();
    const marker = markers.get(id);
    if (!marker) return;

    // 새 day의 마커들로 중간값 계산
    const dayMarkers = [...markers.values()]
      .filter(m => m.day_number === newDayNumber && m.id !== id)
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
    }
  },

  // ── 실시간 이벤트 적용 ──────────────────────────────────────────
  applyRealtimeEvent: (event) => {
    set(state => {
      const newMap = new Map(state.markers);

      switch (event.type) {
        case 'MARKER_ADDED':
          newMap.set(event.payload.id, event.payload);
          break;
        case 'MARKER_UPDATED':
          newMap.set(event.payload.id, { ...newMap.get(event.payload.id), ...event.payload });
          break;
        case 'MARKER_DELETED':
          newMap.delete(event.payload.id);
          break;
        case 'MARKER_REORDERED':
          const m = newMap.get(event.payload.id);
          if (m) newMap.set(event.payload.id, {
            ...m,
            day_number:  event.payload.day_number,
            order_index: event.payload.order_index,
          });
          break;
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
