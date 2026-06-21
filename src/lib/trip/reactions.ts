export const REACTION_TYPES = ['like', 'bookmark', 'want_to_go', 'beautiful'] as const;
export type ReactionType = typeof REACTION_TYPES[number];

export const REACTION_DEFS: {
  type: ReactionType;
  emoji: string;
  label: string;
}[] = [
  { type: 'like',       emoji: '❤️', label: '좋아요' },
  { type: 'bookmark',   emoji: '📌', label: '참고할게요' },
  { type: 'want_to_go', emoji: '✈️', label: '가고 싶어요' },
  { type: 'beautiful',  emoji: '🌸', label: '예뻐요' },
];

export type ReactionCounts = Record<ReactionType, number>;

export const EMPTY_REACTION_COUNTS: ReactionCounts = {
  like:       0,
  bookmark:   0,
  want_to_go: 0,
  beautiful:  0,
};

export function aggregateReactions(
  rows: { reaction_type: string }[],
): ReactionCounts {
  const counts = { ...EMPTY_REACTION_COUNTS };
  for (const row of rows) {
    const t = row.reaction_type as ReactionType;
    if (t in counts) counts[t]++;
  }
  return counts;
}

export const MAX_COMMENT_LENGTH = 500;
