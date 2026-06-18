import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

// Tailwind 클래스 병합 유틸
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// 방 초대 코드 생성 (클라이언트 사이드용 — DB 함수와 동일 로직)
export function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const rand  = () => chars[Math.floor(Math.random() * chars.length)];
  return `TRP-${rand()}${rand()}${rand()}${rand()}`;
}

// 초 → "N시간 M분" 변환
export function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h === 0) return `${m}분`;
  if (m === 0) return `${h}시간`;
  return `${h}시간 ${m}분`;
}

// 미터 → "N.Nkm" / "Nm" 변환
export function formatDistance(meters: number): string {
  if (meters >= 1000) return `${(meters / 1000).toFixed(1)}km`;
  return `${meters}m`;
}

// order_index 중간값 계산 (DB get_next_order_index 함수의 클라이언트 미러)
export function calcMidOrderIndex(prev: number | null, next: number | null): number {
  if (prev === null && next === null) return 1.0;
  if (prev === null) return (next! / 2);
  if (next === null) return prev + 1.0;
  return (prev + next) / 2;
}

// 좌표 소수점 4자리 반올림 (캐시 키용)
export function roundCoord(val: number): number {
  return Math.round(val * 10000) / 10000;
}

// 날짜 포맷 (YYYY-MM-DD → MM월 DD일)
export function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getMonth() + 1}월 ${d.getDate()}일`;
}

// 숫자 천단위 구분 (12847 → "12,847")
export function formatCount(n: number): string {
  return n.toLocaleString('ko-KR');
}

// URL slug 생성
export function slugify(str: string): string {
  return str
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}
