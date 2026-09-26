/* Shared helpers for Admin Mail (Inbox, Sent, Compose). Pure functions — easy to test. */

export const MB = 1024 * 1024;

/** Attachment rules shown in Compose and enforced when files are added. */
export const ATTACH_RULES = {
  maxFiles: 10,
  maxFileBytes: 10 * MB,
  maxTotalBytes: 25 * MB,
  /** File contents above this size are kept only for the current session (browser storage is small). */
  maxStoredBytes: 1.5 * MB,
  accept:
    'image/*,.pdf,.doc,.docx,.xls,.xlsx,.csv,.ppt,.pptx,.txt,.md,.rtf,.odt,.ods,.zip,application/pdf,text/plain,text/csv',
  label: 'Images, PDF, Word, Excel, PowerPoint, CSV, text or ZIP · up to 10 MB each · 25 MB in total',
};

const EXT_OK = /\.(png|jpe?g|gif|webp|svg|heic|bmp|pdf|docx?|xlsx?|csv|pptx?|txt|md|rtf|odt|ods|zip)$/i;

export function isAllowedFile(name: string, mime: string): boolean {
  return mime.startsWith('image/') || EXT_OK.test(name);
}

export function isImage(mime: string, name = ''): boolean {
  return mime.startsWith('image/') || /\.(png|jpe?g|gif|webp|svg|bmp)$/i.test(name);
}

export function isPdf(mime: string, name = ''): boolean {
  return mime === 'application/pdf' || /\.pdf$/i.test(name);
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < MB) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / MB).toFixed(bytes < 10 * MB ? 1 : 0)} MB`;
}

/** Icon + accent colour for a file card. */
export function fileKind(mime: string, name: string): { icon: string; label: string; color: string } {
  const ext = (name.split('.').pop() ?? '').toLowerCase();
  if (isImage(mime, name)) return { icon: '🖼️', label: 'Image', color: '#8b5cf6' };
  if (isPdf(mime, name)) return { icon: '📕', label: 'PDF', color: '#dc2626' };
  if (['doc', 'docx', 'odt', 'rtf'].includes(ext)) return { icon: '📘', label: 'Word', color: '#2563eb' };
  if (['xls', 'xlsx', 'ods', 'csv'].includes(ext)) return { icon: '📗', label: ext === 'csv' ? 'CSV' : 'Excel', color: '#16a34a' };
  if (['ppt', 'pptx'].includes(ext)) return { icon: '📙', label: 'PowerPoint', color: '#ea580c' };
  if (ext === 'zip') return { icon: '🗜️', label: 'ZIP', color: '#64748b' };
  return { icon: '📄', label: ext ? ext.toUpperCase() : 'File', color: '#475569' };
}

/** "10:42", "Yesterday", "Mon", "12 Sep" or "12 Sep 2025" — the compact time used in message lists. */
export function listTime(iso: string, now = new Date()): string {
  const d = new Date(iso);
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const t = d.getTime();
  if (t >= startOfToday) return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  if (t >= startOfToday - 86_400_000) return 'Yesterday';
  if (t >= startOfToday - 6 * 86_400_000) return d.toLocaleDateString('en-GB', { weekday: 'short' });
  if (d.getFullYear() === now.getFullYear()) return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

/** Group heading for the message list. */
export function dateGroup(iso: string, now = new Date()): string {
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const t = new Date(iso).getTime();
  if (t >= startOfToday) return 'Today';
  if (t >= startOfToday - 86_400_000) return 'Yesterday';
  if (t >= startOfToday - 6 * 86_400_000) return 'This week';
  if (t >= startOfToday - 29 * 86_400_000) return 'This month';
  return 'Older';
}

export function fullDate(iso: string): string {
  return new Date(iso).toLocaleString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function inline(s: string): string {
  return s
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[\s(])_(.+?)_(?=[\s).,!?]|$)/g, '$1<em>$2</em>')
    .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>')
    .replace(/(^|[\s(])(https?:\/\/[^\s<)]+)/g, '$1<a href="$2" target="_blank" rel="noopener">$2</a>');
}

/**
 * Renders the light formatting used by Compose (**bold**, _italic_, "- " bullets, "1. " lists,
 * "> " quotes, [links](https://…) and bare URLs) into safe HTML. Input is escaped first, so
 * message text can never inject markup.
 */
export function renderMessage(text: string): string {
  const lines = escapeHtml(text.replace(/\r\n?/g, '\n')).split('\n');
  const out: string[] = [];
  let list: 'ul' | 'ol' | null = null;
  let quote: string[] = [];
  let para: string[] = [];
  const flushPara = () => {
    if (para.length) out.push(`<p>${para.map(inline).join('<br>')}</p>`);
    para = [];
  };
  const flushList = () => {
    if (list) out.push(`</${list}>`);
    list = null;
  };
  const flushQuote = () => {
    if (quote.length) out.push(`<blockquote>${quote.map(inline).join('<br>')}</blockquote>`);
    quote = [];
  };
  for (const raw of lines) {
    const line = raw.trimEnd();
    const bullet = /^\s*[-•]\s+(.*)$/.exec(line);
    const num = /^\s*\d+[.)]\s+(.*)$/.exec(line);
    const q = /^&gt;\s?(.*)$/.exec(line);
    if (q) {
      flushPara();
      flushList();
      quote.push(q[1]);
      continue;
    }
    flushQuote();
    if (bullet || num) {
      flushPara();
      const kind = bullet ? 'ul' : 'ol';
      if (list !== kind) {
        flushList();
        out.push(`<${kind}>`);
        list = kind;
      }
      out.push(`<li>${inline((bullet ?? num)![1])}</li>`);
      continue;
    }
    flushList();
    if (!line.trim()) {
      flushPara();
      continue;
    }
    para.push(line);
  }
  flushPara();
  flushList();
  flushQuote();
  return out.join('');
}

/** Plain one-line preview for message lists. */
export function snippet(text: string, max = 140): string {
  const plain = text
    .split('\n')
    .filter((l) => !l.startsWith('>'))
    .join(' ')
    .replace(/\*\*|__|\[([^\]]+)\]\([^)]+\)/g, (m, label) => label ?? '')
    .replace(/\s+/g, ' ')
    .trim();
  return plain.length > max ? plain.slice(0, max - 1) + '…' : plain;
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? '') + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase();
}

/* ------------------------------ sample files ------------------------------ */

function b64(s: string): string {
  return typeof btoa === 'function' ? btoa(unescape(encodeURIComponent(s))) : '';
}

export function textDataUrl(text: string, mime = 'text/plain'): string {
  return `data:${mime};charset=utf-8;base64,${b64(text)}`;
}

/** A tiny but valid one-page PDF (Helvetica text), so sample PDF attachments preview and download. */
export function makePdf(title: string, lines: string[]): string {
  const esc = (s: string) => s.replace(/[\\()]/g, (c) => '\\' + c).replace(/[^\x20-\x7e]/g, '-');
  const text = [
    'BT /F1 20 Tf 56 770 Td (' + esc(title) + ') Tj ET',
    'BT /F1 9 Tf 56 752 Td (NeverBeen Admin - internal document) Tj ET',
    ...lines.map((l, i) => `BT /F1 11 Tf 56 ${720 - i * 18} Td (${esc(l)}) Tj ET`),
  ].join('\n');
  const objs = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>',
    `<< /Length ${text.length} >>\nstream\n${text}\nendstream`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
  ];
  let pdf = '%PDF-1.4\n';
  const offsets: number[] = [];
  objs.forEach((o, i) => {
    offsets.push(pdf.length);
    pdf += `${i + 1} 0 obj\n${o}\nendobj\n`;
  });
  const xref = pdf.length;
  pdf += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n`;
  pdf += offsets.map((o) => String(o).padStart(10, '0') + ' 00000 n \n').join('');
  pdf += `trailer\n<< /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return `data:application/pdf;base64,${b64(pdf)}`;
}

/** Illustrative SVG "picture" used for sample image attachments (mockups, screenshots, photos). */
export function sampleImage(title: string, subtitle: string, from: string, to: string, kind: 'mockup' | 'photo' | 'screenshot' | 'chart'): string {
  const w = 960;
  const h = 600;
  let art = '';
  if (kind === 'mockup') {
    art = `<rect x="80" y="150" width="800" height="120" rx="18" fill="rgba(255,255,255,.18)"/>
      <circle cx="170" cy="270" r="62" fill="#fff" opacity=".9"/><rect x="260" y="290" width="300" height="22" rx="11" fill="#fff" opacity=".85"/>
      <rect x="260" y="325" width="200" height="16" rx="8" fill="#fff" opacity=".55"/>
      <rect x="80" y="390" width="250" height="150" rx="16" fill="rgba(255,255,255,.2)"/><rect x="355" y="390" width="250" height="150" rx="16" fill="rgba(255,255,255,.2)"/><rect x="630" y="390" width="250" height="150" rx="16" fill="rgba(255,255,255,.2)"/>`;
  } else if (kind === 'photo') {
    art = `<circle cx="760" cy="150" r="60" fill="#fde68a" opacity=".9"/>
      <path d="M0 470 L220 280 L380 420 L560 230 L960 520 L960 600 L0 600 Z" fill="rgba(15,23,42,.35)"/>
      <path d="M0 520 L300 380 L520 500 L760 360 L960 480 L960 600 L0 600 Z" fill="rgba(15,23,42,.5)"/>`;
  } else if (kind === 'chart') {
    art = [0, 1, 2, 3, 4, 5, 6, 7]
      .map((i) => {
        const bh = 90 + ((i * 53) % 230);
        return `<rect x="${110 + i * 95}" y="${540 - bh}" width="58" height="${bh}" rx="8" fill="#fff" opacity="${0.45 + (i % 3) * 0.2}"/>`;
      })
      .join('');
  } else {
    art = `<rect x="80" y="150" width="800" height="400" rx="14" fill="#fff" opacity=".95"/>
      <rect x="80" y="150" width="800" height="44" rx="14" fill="#e2e8f0"/>
      <circle cx="110" cy="172" r="7" fill="#f87171"/><circle cx="132" cy="172" r="7" fill="#fbbf24"/><circle cx="154" cy="172" r="7" fill="#34d399"/>
      ${[0, 1, 2, 3, 4].map((i) => `<rect x="120" y="${225 + i * 60}" width="${520 - i * 60}" height="18" rx="9" fill="#cbd5e1"/><rect x="120" y="${250 + i * 60}" width="${360 + i * 30}" height="12" rx="6" fill="#e2e8f0"/>`).join('')}
      <rect x="600" y="230" width="240" height="46" rx="10" fill="#fee2e2"/><text x="620" y="260" font-size="18" font-family="Arial" fill="#b91c1c">Reported ×3</text>`;
  }
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
    <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${from}"/><stop offset="1" stop-color="${to}"/></linearGradient></defs>
    <rect width="${w}" height="${h}" fill="url(#g)"/>${art}
    <text x="80" y="92" font-size="40" font-weight="700" font-family="Arial, sans-serif" fill="#fff">${title}</text>
    <text x="80" y="128" font-size="20" font-family="Arial, sans-serif" fill="#fff" opacity=".85">${subtitle}</text></svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

/** Approximate decoded size of a data: URL. */
export function dataUrlBytes(url: string): number {
  const i = url.indexOf(',');
  const body = url.slice(i + 1);
  return url.slice(0, i).includes(';base64') ? Math.floor((body.length * 3) / 4) : decodeURIComponent(body).length;
}
