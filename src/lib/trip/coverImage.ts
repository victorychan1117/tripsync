import type { SupabaseClient } from '@supabase/supabase-js';
import { APP_URL } from '@/lib/config/site';

export const COVER_BUCKET = 'trip-covers';
export const MAX_COVER_SIZE_BYTES = 5 * 1024 * 1024;
export const ALLOWED_COVER_MIME = ['image/jpeg', 'image/png', 'image/webp'] as const;
export const DEFAULT_OG_IMAGE = '/landing/og-image.png';

export type CoverUploadError = 'invalid_type' | 'size_exceeded' | 'upload_failed' | 'db_failed';

/** 국가별 카드/헤더 그라디언트 */
export const COUNTRY_GRADIENT: Record<string, [string, string]> = {
  KR: ['#43B89C', '#3B82F6'], JP: ['#FF6B6B', '#FF8E53'],
  TH: ['#F59E0B', '#EF4444'], VN: ['#10B981', '#06B6D4'],
  ID: ['#F97316', '#EF4444'], SG: ['#0EA5E9', '#6366F1'],
  MY: ['#F59E0B', '#10B981'], PH: ['#3B82F6', '#06B6D4'],
  TW: ['#EC4899', '#8B5CF6'], HK: ['#EF4444', '#F97316'],
  CN: ['#EF4444', '#F59E0B'], FR: ['#6366F1', '#3B82F6'],
  IT: ['#EF4444', '#F97316'], ES: ['#F59E0B', '#EF4444'],
  GB: ['#3B82F6', '#6366F1'], DE: ['#64748B', '#3B82F6'],
  US: ['#3B82F6', '#EF4444'], AU: ['#F97316', '#FBBF24'],
  NZ: ['#10B981', '#3B82F6'], TR: ['#EF4444', '#F97316'],
  GR: ['#3B82F6', '#06B6D4'], CH: ['#EF4444', '#64748B'],
  MV: ['#06B6D4', '#3B82F6'], IN: ['#F97316', '#EF4444'],
  CA: ['#EF4444', '#3B82F6'], MX: ['#10B981', '#059669'],
  BR: ['#22C55E', '#EAB308'], AR: ['#3B82F6', '#06B6D4'],
};

/** 내 여행 목록용 파스텔 그라디언트 */
export const PASTEL_GRADIENT: Record<string, [string, string]> = {
  KR: ['#EDE9FE', '#F5F3FF'], JP: ['#FFE4E6', '#FFF1F2'],
  TH: ['#FEF3C7', '#FFFBEB'], VN: ['#D1FAE5', '#ECFDF5'],
  ID: ['#FFEDD5', '#FFF7ED'], SG: ['#DBEAFE', '#EFF6FF'],
  MY: ['#D1FAE5', '#ECFDF5'], PH: ['#FFEDD5', '#FFF7ED'],
  TW: ['#E0F2FE', '#F0F9FF'], HK: ['#FCE7F3', '#FDF2F8'],
  CN: ['#FFE4E6', '#FFF1F2'], FR: ['#DBEAFE', '#EFF6FF'],
  IT: ['#FFE4E6', '#FFF1F2'], ES: ['#FEF3C7', '#FFFBEB'],
  GB: ['#DBEAFE', '#EFF6FF'], DE: ['#D1FAE5', '#ECFDF5'],
  US: ['#DBEAFE', '#EFF6FF'], AU: ['#FEF3C7', '#FFFBEB'],
  GR: ['#E0F2FE', '#F0F9FF'], TR: ['#FFE4E6', '#FFF1F2'],
  MV: ['#CFFAFE', '#ECFEFF'],
};

export function getCountryGradient(code: string): [string, string] {
  return COUNTRY_GRADIENT[code] ?? ['#6366F1', '#8B5CF6'];
}

export function getPastelGradient(code: string): [string, string] {
  return PASTEL_GRADIENT[code] ?? ['#EDE9FE', '#F5F3FF'];
}

export function validateCoverFile(file: File): CoverUploadError | null {
  if (!ALLOWED_COVER_MIME.includes(file.type as typeof ALLOWED_COVER_MIME[number])) {
    return 'invalid_type';
  }
  if (file.size > MAX_COVER_SIZE_BYTES) {
    return 'size_exceeded';
  }
  return null;
}

function sanitizeExtension(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase() ?? 'jpg';
  if (ext === 'jpeg') return 'jpg';
  if (['jpg', 'png', 'webp'].includes(ext)) return ext;
  return 'jpg';
}

/** Supabase Storage에 업로드 후 trip_rooms.cover_image_url 갱신 */
export async function uploadTripCover(
  supabase: SupabaseClient,
  roomId: string,
  file: File,
): Promise<{ url: string | null; error: CoverUploadError | null }> {
  const validation = validateCoverFile(file);
  if (validation) return { url: null, error: validation };

  const ext  = sanitizeExtension(file.name);
  const path = `${roomId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from(COVER_BUCKET)
    .upload(path, file, { cacheControl: '3600', upsert: false });

  if (uploadError) return { url: null, error: 'upload_failed' };

  const { data: { publicUrl } } = supabase.storage.from(COVER_BUCKET).getPublicUrl(path);

  const { error: dbError } = await supabase
    .from('trip_rooms')
    .update({ cover_image_url: publicUrl })
    .eq('id', roomId);

  if (dbError) return { url: null, error: 'db_failed' };

  return { url: publicUrl, error: null };
}

/** OG/메타태그용 절대 URL */
export function resolveOgImageUrl(coverImageUrl: string | null | undefined): string {
  if (!coverImageUrl) return `${APP_URL}${DEFAULT_OG_IMAGE}`;
  if (coverImageUrl.startsWith('http://') || coverImageUrl.startsWith('https://')) {
    return coverImageUrl;
  }
  return `${APP_URL}${coverImageUrl.startsWith('/') ? '' : '/'}${coverImageUrl}`;
}
