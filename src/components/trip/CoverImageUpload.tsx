'use client';

import { useRef, useState } from 'react';
import { Camera, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';
import { uploadTripCover, type CoverUploadError } from '@/lib/trip/coverImage';

const ERROR_MSG: Record<CoverUploadError, string> = {
  invalid_type:   'jpg, png, webp 이미지만 업로드할 수 있어요.',
  size_exceeded:  '5MB 이하 이미지만 업로드할 수 있어요.',
  upload_failed:  '이미지를 업로드하지 못했어요.',
  db_failed:      '이미지를 업로드하지 못했어요.',
};

interface CoverImageUploadProps {
  roomId: string;
  onSuccess: (url: string) => void;
  onError: (message: string) => void;
  variant?: 'header' | 'settings';
  className?: string;
}

export default function CoverImageUpload({
  roomId,
  onSuccess,
  onError,
  variant = 'header',
  className,
}: CoverImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';

    const objectUrl = URL.createObjectURL(file);
    setPreview(objectUrl);
    setUploading(true);

    try {
      const supabase = createClient();
      const { url, error } = await uploadTripCover(supabase, roomId, file);
      if (error || !url) {
        onError(ERROR_MSG[error ?? 'upload_failed']);
        return;
      }
      onSuccess(url);
    } catch {
      onError(ERROR_MSG.upload_failed);
    } finally {
      URL.revokeObjectURL(objectUrl);
      setPreview(null);
      setUploading(false);
    }
  };

  const isHeader = variant === 'header';

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={handleFileChange}
        disabled={uploading}
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className={cn(
          'inline-flex items-center gap-1.5 text-sm font-bold transition-all disabled:opacity-60',
          isHeader
            ? 'px-3 py-2 rounded-2xl bg-white/20 backdrop-blur-sm text-white hover:bg-white/30 border border-white/25'
            : 'w-full py-2.5 rounded-2xl text-violet-600 bg-violet-50 border border-violet-200 hover:bg-violet-100',
          className,
        )}
      >
        {uploading ? (
          <Loader2 size={14} className="animate-spin shrink-0" />
        ) : (
          <Camera size={14} className="shrink-0" />
        )}
        {uploading ? '업로드 중…' : '커버 이미지 변경'}
      </button>

      {preview && uploading && (
        <div className="fixed inset-0 z-[800] bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-4 max-w-sm w-full shadow-2xl">
            <img src={preview} alt="미리보기" className="w-full aspect-video object-cover rounded-2xl mb-3" />
            <p className="text-sm text-slate-600 text-center font-semibold flex items-center justify-center gap-2">
              <Loader2 size={16} className="animate-spin text-violet-500" />
              이미지를 업로드하고 있어요…
            </p>
          </div>
        </div>
      )}
    </>
  );
}
