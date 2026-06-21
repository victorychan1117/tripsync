export const NOTIFICATION_TYPES = [
  'trip_comment',
  'trip_reaction',
  'trip_saved',
  'trip_cloned',
] as const;

export type NotificationType = typeof NOTIFICATION_TYPES[number];

export const NOTIFICATION_ICONS: Record<NotificationType, string> = {
  trip_comment:  '💬',
  trip_reaction: '✨',
  trip_saved:    '❤️',
  trip_cloned:   '📋',
};

export function formatRelativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return '방금';
  if (mins < 60) return `${mins}분 전`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}시간 전`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}일 전`;
  return new Date(iso).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' });
}
