/** 프로덕션: https://gabojago.app — Vercel `NEXT_PUBLIC_APP_URL`·Supabase Auth Site URL과 동일하게 */
export const APP_URL    = process.env.NEXT_PUBLIC_APP_URL ?? 'https://gabojago.app';
export const APP_NAME   = process.env.NEXT_PUBLIC_APP_NAME ?? '가보자고';
export const APP_DOMAIN = 'gabojago.app';
export const SUPPORT_EMAIL = `support@${APP_DOMAIN}`;
export const REPORT_EMAIL  = `report@${APP_DOMAIN}`;

export function absoluteUrl(path: string): string {
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  return `${APP_URL}${path.startsWith('/') ? path : `/${path}`}`;
}
