/** 배포 시 NEXT_PUBLIC_APP_URL을 실제 도메인으로 설정해야 OG/sitemap/canonical이 정상 동작합니다. */
export const APP_URL  = process.env.NEXT_PUBLIC_APP_URL ?? 'https://tripsync.app';
export const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME ?? 'TripSync';

export function absoluteUrl(path: string): string {
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  return `${APP_URL}${path.startsWith('/') ? path : `/${path}`}`;
}
