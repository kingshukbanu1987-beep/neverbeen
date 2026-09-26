export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

/** Whole days between now and an ISO date (negative = in the past). */
export function daysUntil(iso: string): number {
  return Math.ceil((Date.parse(iso) - Date.now()) / 86_400_000);
}

export const CLASS_TONE: Record<string, string> = {
  PII: 'danger',
  Sensitive: 'warn',
  Internal: 'info',
  Public: 'ok',
  'Quasi-identifier': 'violet',
  'User content': '',
};
