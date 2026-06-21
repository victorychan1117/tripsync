export const MAX_FOLDER_NAME_LENGTH = 20;

export const FOLDER_EMOJI_PRESETS = [
  '📁', '🇯🇵', '🇰🇷', '🏖', '👨‍👩‍👧', '✈️', '🌸', '🗼', '🏔', '🍜', '💼', '❤️',
] as const;

export type FolderFilter = 'all' | 'uncategorized' | number;

export interface SavedTripFolder {
  id:         number;
  name:       string;
  emoji:      string;
  sort_order: number;
}

export function folderFilterLabel(
  filter: FolderFilter,
  folders: SavedTripFolder[],
): string {
  if (filter === 'all') return '전체';
  if (filter === 'uncategorized') return '미분류';
  const f = folders.find(x => x.id === filter);
  return f ? `${f.emoji} ${f.name}` : '폴더';
}

export function getFolderErrorMessage(error: unknown, fallback: string): string {
  if (error && typeof error === 'object') {
    const e = error as { hint?: string; message?: string };
    if (e.hint) return e.hint;
    if (e.message?.includes('saved_trip_folders_unique_name') || e.message?.includes('duplicate')) {
      return '같은 이름의 폴더가 이미 있어요.';
    }
  }
  return fallback;
}
