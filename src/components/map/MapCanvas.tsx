'use client';
// ════════════════════════════════════════════════════════════════════
// MapCanvas — 실제 Kakao/Google 지도 렌더러
// SDK 로드 후 지도 초기화, 마커 생성, 경로선 그리기
// ════════════════════════════════════════════════════════════════════
import { useEffect, useRef, useCallback } from 'react';
import {
  initKakaoMap, initGoogleMap,
  createKakaoMarker, createGoogleMarker,
  drawKakaoPolyline, drawGooglePolyline,
  isSdkLoaded,
} from '@/lib/maps/mapEngineSelector';
import type { MapConfig } from '@/lib/maps/mapEngineSelector';
import type { MarkerWithRoute } from '@/lib/supabase/types';

const PIN_COLORS = ['#6366F1','#8B5CF6','#EC4899','#F97316','#EAB308','#10B981','#0EA5E9'];

interface Props {
  markers:        MarkerWithRoute[];
  selectedId:     number | null;
  onSelectMarker: (id: number) => void;
  mapConfig:      MapConfig;
  centerLat:      number;
  centerLng:      number;
  onCursorMove?:  (lat: number, lng: number) => void;
}

export default function MapCanvas({
  markers, selectedId, onSelectMarker,
  mapConfig, centerLat, centerLng, onCursorMove,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef       = useRef<any>(null);
  const markerRefs   = useRef<Map<number, any>>(new Map());
  const polylineRefs = useRef<any[]>([]);

  // ── 지도 초기화 ─────────────────────────────────────────────────
  useEffect(() => {
    if (!containerRef.current) return;

    const initMap = () => {
      if (mapConfig.renderer === 'KAKAO') {
        const kakao = (window as any).kakao;
        if (!kakao?.maps) return;
        mapRef.current = initKakaoMap(containerRef.current!, {
          lat: centerLat, lng: centerLng, level: 7,
        });

        // 커서 이동 브로드캐스트
        if (onCursorMove) {
          kakao.maps.event.addListener(mapRef.current, 'mousemove', (e: any) => {
            onCursorMove(e.latLng.getLat(), e.latLng.getLng());
          });
        }
      } else {
        const google = (window as any).google;
        if (!google?.maps) return;
        mapRef.current = initGoogleMap(containerRef.current!, {
          lat: centerLat, lng: centerLng, zoom: 13,
        });

        if (onCursorMove) {
          mapRef.current.addListener('mousemove', (e: any) => {
            onCursorMove(e.latLng.lat(), e.latLng.lng());
          });
        }
      }
    };

    // SDK 로드 완료 후 초기화 (loadedSdks 기준으로 체크)
    const checkSdk = setInterval(() => {
      if (isSdkLoaded(mapConfig.renderer)) {
        clearInterval(checkSdk);
        initMap();
      }
    }, 200);

    return () => clearInterval(checkSdk);
  }, [mapConfig.renderer, centerLat, centerLng]);

  // ── 마커 동기화 ─────────────────────────────────────────────────
  useEffect(() => {
    if (!mapRef.current) return;

    // 기존 마커 제거
    markerRefs.current.forEach(m => {
      if (mapConfig.renderer === 'KAKAO') m.setMap(null);
      else m.map = null;
    });
    markerRefs.current.clear();

    // 기존 폴리라인 제거
    polylineRefs.current.forEach(p => {
      if (mapConfig.renderer === 'KAKAO') p.setMap(null);
      else p.setMap(null);
    });
    polylineRefs.current = [];

    // 마커 생성
    markers.forEach((marker, i) => {
      const color = PIN_COLORS[i % PIN_COLORS.length];
      const label = String(i + 1);

      let mapMarker: any;

      if (mapConfig.renderer === 'KAKAO') {
        mapMarker = createKakaoMarker(
          mapRef.current, marker.lat, marker.lng, label, color
        );
        const kakao = (window as any).kakao;
        kakao.maps.event.addListener(mapMarker, 'click', () => {
          onSelectMarker(marker.id);
        });
      } else {
        mapMarker = createGoogleMarker(
          mapRef.current, marker.lat, marker.lng, label, color
        );
        mapMarker.addListener?.('click', () => {
          onSelectMarker(marker.id);
        });
      }

      markerRefs.current.set(marker.id, mapMarker);

      // 경로선 (다음 마커와 연결)
      if (i < markers.length - 1 && marker.route?.polyline) {
        let polyline: any;
        if (mapConfig.renderer === 'KAKAO') {
          // Kakao는 인코딩된 polyline 미지원 → 직선으로 대체
          const next = markers[i + 1];
          polyline = drawKakaoPolyline(
            mapRef.current,
            [{ lat: marker.lat, lng: marker.lng }, { lat: next.lat, lng: next.lng }],
            color,
          );
        } else {
          polyline = drawGooglePolyline(
            mapRef.current, marker.route.polyline, color
          );
        }
        polylineRefs.current.push(polyline);
      }
    });
  }, [markers, mapConfig.renderer]);

  // ── 선택 마커 강조 ───────────────────────────────────────────────
  useEffect(() => {
    if (!mapRef.current || !selectedId) return;
    const marker = markers.find(m => m.id === selectedId);
    if (!marker) return;

    if (mapConfig.renderer === 'KAKAO') {
      const kakao = (window as any).kakao;
      if (kakao?.maps) {
        mapRef.current.panTo(new kakao.maps.LatLng(marker.lat, marker.lng));
      }
    } else {
      const google = (window as any).google;
      if (google?.maps) {
        mapRef.current.panTo({ lat: marker.lat, lng: marker.lng });
      }
    }
  }, [selectedId]);

  return (
    <div
      ref={containerRef}
      id={mapConfig.renderer === 'KAKAO' ? 'kakao-map' : 'google-map'}
      className="w-full h-full"
    />
  );
}
