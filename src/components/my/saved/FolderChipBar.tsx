'use client';

import { cn } from '@/lib/utils';
import type { FolderFilter, SavedTripFolder } from '@/lib/saved/folders';

interface FolderChipBarProps {
  filter: FolderFilter;
  folders: SavedTripFolder[];
  counts: { all: number; uncategorized: number; byFolder: Record<number, number> };
  onFilterChange: (filter: FolderFilter) => void;
}

export default function FolderChipBar({
  filter,
  folders,
  counts,
  onFilterChange,
}: FolderChipBarProps) {
  const chips: { key: FolderFilter; label: string }[] = [
    { key: 'all', label: `전체${counts.all > 0 ? ` (${counts.all})` : ''}` },
    { key: 'uncategorized', label: `미분류${counts.uncategorized > 0 ? ` (${counts.uncategorized})` : ''}` },
    ...folders.map(f => ({
      key: f.id as FolderFilter,
      label: `${f.emoji} ${f.name}${counts.byFolder[f.id] ? ` (${counts.byFolder[f.id]})` : ''}`,
    })),
  ];

  return (
    <div className="overflow-x-auto -mx-1 px-1 pb-1 scrollbar-hide">
      <div className="flex gap-2 min-w-max">
        {chips.map(chip => {
          const active = filter === chip.key;
          return (
            <button
              key={String(chip.key)}
              type="button"
              onClick={() => onFilterChange(chip.key)}
              className={cn(
                'shrink-0 px-3.5 py-2 rounded-full text-[12px] font-bold transition-all whitespace-nowrap',
                active
                  ? 'bg-gradient-to-r from-violet-500 to-indigo-500 text-white shadow-md shadow-violet-200'
                  : 'bg-white text-slate-600 border border-slate-200 hover:border-violet-200 hover:bg-violet-50/50',
              )}
            >
              {chip.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
