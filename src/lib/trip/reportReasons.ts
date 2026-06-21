export const REPORT_REASONS = [
  { value: 'spam',           label: '스팸/홍보' },
  { value: 'abuse',          label: '욕설/비방' },
  { value: 'privacy',        label: '개인정보 노출' },
  { value: 'inappropriate',  label: '부적절한 내용' },
  { value: 'other',          label: '기타' },
] as const;

export type ReportReason = typeof REPORT_REASONS[number]['value'];

export const HIDDEN_COMMENT_MESSAGE = '신고 누적으로 숨겨진 댓글이에요.';
