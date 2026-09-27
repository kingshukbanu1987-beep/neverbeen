/** 25 MB profile storage. Data URLs are measured; remote photos use a stable estimate. */

export const STORAGE_LIMIT_BYTES = 25 * 1024 * 1024;
export const STORAGE_WARN_RATIO = 0.9;
const REMOTE_IMAGE_BYTES = 180 * 1024;

export interface StorageSlice {
  id: string;
  label: string;
  bytes: number;
  color: string;
}

export interface StorageReport {
  limit: number;
  used: number;
  remaining: number;
  ratio: number;
  slices: StorageSlice[];
  blocked: boolean;
  warning: boolean;
}

export function utf8Bytes(value: string | null | undefined): number {
  if (!value) return 0;
  return new TextEncoder().encode(value).length;
}

export function imageBytes(url: string | null | undefined): number {
  if (!url) return 0;
  if (url.startsWith('data:')) {
    const comma = url.indexOf(',');
    const payload = comma >= 0 ? url.slice(comma + 1) : '';
    return Math.floor((payload.length * 3) / 4);
  }
  if (url.startsWith('blob:') || url.startsWith('http') || url.startsWith('/')) return REMOTE_IMAGE_BYTES;
  return utf8Bytes(url);
}

export function formatStorage(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function buildStorageReport(slices: StorageSlice[]): StorageReport {
  const used = slices.reduce((sum, slice) => sum + slice.bytes, 0);
  const ratio = used / STORAGE_LIMIT_BYTES;
  return {
    limit: STORAGE_LIMIT_BYTES,
    used,
    remaining: Math.max(0, STORAGE_LIMIT_BYTES - used),
    ratio,
    slices: slices.filter((slice) => slice.bytes > 0),
    blocked: used >= STORAGE_LIMIT_BYTES,
    warning: ratio >= STORAGE_WARN_RATIO,
  };
}

export function storagePie(report: StorageReport): string {
  if (report.used <= 0) return 'conic-gradient(#e2e8f0 0 100%)';
  let cursor = 0;
  const stops: string[] = [];
  for (const slice of report.slices) {
    const start = cursor;
    cursor += (slice.bytes / STORAGE_LIMIT_BYTES) * 100;
    stops.push(`${slice.color} ${start.toFixed(2)}% ${Math.min(cursor, 100).toFixed(2)}%`);
  }
  if (cursor < 100) stops.push(`#e2e8f0 ${cursor.toFixed(2)}% 100%`);
  return `conic-gradient(${stops.join(', ')})`;
}
