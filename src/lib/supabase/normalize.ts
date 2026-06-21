/** PostgREST embedded join — 단일 객체 또는 배열로 올 수 있음 */
export function normalizeEmbed<T>(value: T | T[] | null | undefined): T | null {
  if (value == null) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}
