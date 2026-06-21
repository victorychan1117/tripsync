/** Supabase/Postgres 에러에서 HINT 또는 message 추출 */
export function getCommentErrorMessage(error: unknown, fallback: string): string {
  if (error && typeof error === 'object') {
    const e = error as { hint?: string; message?: string; code?: string };
    if (e.hint) return e.hint;
    if (e.message?.includes('rate_limit') || e.message?.includes('duplicate')) {
      return '댓글을 너무 빠르게 작성하고 있어요. 잠시 후 다시 시도해주세요.';
    }
  }
  return fallback;
}

export function getReportErrorMessage(error: unknown, fallback: string): string {
  if (error && typeof error === 'object') {
    const e = error as { hint?: string; message?: string };
    if (e.hint) return e.hint;
    if (e.message?.includes('comment_reports_unique') || e.message?.includes('duplicate')) {
      return '이미 신고한 댓글이에요.';
    }
  }
  return fallback;
}
