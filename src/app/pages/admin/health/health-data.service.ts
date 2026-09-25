import { Injectable, computed, inject, signal } from '@angular/core';
import { AdminInsightsService, seeded } from '../shared/admin-insights.service';
import { AdminDataOpsService, STORAGE_QUOTA } from '../shared/admin-data-ops.service';
import { AdminIdentityService } from '../shared/admin-identity.service';
import { CommunityService } from '../../../services/community.service';
import { SiteAnalyticsService } from '../../../services/site-analytics.service';

/* ================================================================== */
/*  Types                                                              */
/* ================================================================== */

export type RangeKey = '24h' | '7d' | '30d' | '90d' | '12m' | 'custom';
export type Granularity = 'hour' | 'day' | 'week' | 'month';
export type DeviceFilter = 'all' | 'desktop' | 'tablet' | 'mobile';

export interface HealthQuery {
  range: RangeKey;
  from?: string; // yyyy-mm-dd (custom)
  to?: string; // yyyy-mm-dd (custom)
  granularity: Granularity;
  device: DeviceFilter;
  country: string; // 'all' or a country name
}

export interface Metrics {
  pageViews: number;
  visitors: number;
  sessions: number;
  bounceRate: number; // %
  avgSessionSec: number;
  newUsers: number;
  signIns: number;
  registrations: number;
  posts: number;
  comments: number;
  errors: number;
  avgLoadMs: number;
  p95LoadMs: number;
  storageKb: number;
}

export type MetricKey = keyof Metrics;

export interface Bucket {
  key: string;
  label: string;
  start: number;
  end: number;
  m: Metrics;
}

export interface Share {
  label: string;
  value: number;
  color?: string;
}

export interface PageRow {
  path: string;
  title: string;
  views: number;
  visitors: number;
  avgTimeSec: number;
  bounceRate: number;
  p95LoadMs: number;
  trend: number[];
  realViews: number;
}

export type RiskSeverity = 'critical' | 'warning' | 'info';
export type RiskArea = 'Traffic' | 'User activity' | 'Storage' | 'Performance' | 'Operations';

export interface RiskAlert {
  id: string;
  severity: RiskSeverity;
  area: RiskArea;
  title: string;
  detail: string;
  metric: string;
  action: string;
}

export interface VitalReading {
  key: string;
  label: string;
  value: number | null;
  unit: 'ms' | '' | 'MB';
  good: number;
  poor: number;
  hint: string;
}

export interface ResourceRow {
  name: string;
  type: string;
  sizeKb: number;
  durationMs: number;
}

export interface StorageKeyRow {
  key: string;
  label: string;
  records: number | null;
  bytes: number;
  share: number;
}

export const METRIC_META: Record<MetricKey, { label: string; unit: '' | '%' | 's' | 'ms' | 'KB'; agg: 'sum' | 'avg' | 'last'; color: string; better: 'up' | 'down' }> = {
  pageViews: { label: 'Page views', unit: '', agg: 'sum', color: '#6366f1', better: 'up' },
  visitors: { label: 'Unique visitors', unit: '', agg: 'sum', color: '#10b981', better: 'up' },
  sessions: { label: 'Sessions', unit: '', agg: 'sum', color: '#0ea5e9', better: 'up' },
  bounceRate: { label: 'Bounce rate', unit: '%', agg: 'avg', color: '#f59e0b', better: 'down' },
  avgSessionSec: { label: 'Avg. session', unit: 's', agg: 'avg', color: '#8b5cf6', better: 'up' },
  newUsers: { label: 'New visitors', unit: '', agg: 'sum', color: '#14b8a6', better: 'up' },
  signIns: { label: 'Community sign-ins', unit: '', agg: 'sum', color: '#0ea5e9', better: 'up' },
  registrations: { label: 'Registrations', unit: '', agg: 'sum', color: '#10b981', better: 'up' },
  posts: { label: 'Journey posts', unit: '', agg: 'sum', color: '#f43f5e', better: 'up' },
  comments: { label: 'Comments', unit: '', agg: 'sum', color: '#8b5cf6', better: 'up' },
  errors: { label: 'JS errors', unit: '', agg: 'sum', color: '#ef4444', better: 'down' },
  avgLoadMs: { label: 'Avg. page load', unit: 'ms', agg: 'avg', color: '#0ea5e9', better: 'down' },
  p95LoadMs: { label: 'p95 page load', unit: 'ms', agg: 'avg', color: '#f43f5e', better: 'down' },
  storageKb: { label: 'Stored data', unit: 'KB', agg: 'last', color: '#6366f1', better: 'down' },
};

export const RANGE_OPTIONS: { key: RangeKey; label: string }[] = [
  { key: '24h', label: '24 hours' },
  { key: '7d', label: '7 days' },
  { key: '30d', label: '30 days' },
  { key: '90d', label: '90 days' },
  { key: '12m', label: '12 months' },
  { key: 'custom', label: 'Custom' },
];

const DAY = 86_400_000;
const HOUR = 3_600_000;
const PALETTE = ['#6366f1', '#10b981', '#f59e0b', '#0ea5e9', '#f43f5e', '#8b5cf6', '#14b8a6', '#94a3b8'];

/** Share of daily traffic per local hour (sums to 1). */
const HOUR_SHAPE = (() => {
  const raw = Array.from({ length: 24 }, (_, h) => 0.18 + Math.exp(-((h - 13) ** 2) / 10) * 0.9 + Math.exp(-((h - 21) ** 2) / 6) * 1.1 + Math.exp(-((h - 9) ** 2) / 5) * 0.45);
  const sum = raw.reduce((a, b) => a + b, 0);
  return raw.map((v) => v / sum);
})();
const WEEKDAY = [1.22, 0.92, 0.95, 0.97, 1.0, 1.08, 1.25]; // Sun..Sat

const DEVICE_SHARE: Record<Exclude<DeviceFilter, 'all'>, number> = { desktop: 0.52, mobile: 0.38, tablet: 0.1 };

const PAGES: { path: string; title: string; weight: number; time: number; bounce: number; load: number }[] = [
  { path: '/', title: 'Home', weight: 0.31, time: 96, bounce: 41, load: 1.0 },
  { path: '/community', title: 'Community — Connect', weight: 0.14, time: 74, bounce: 33, load: 1.1 },
  { path: '/community/profile', title: 'Community — Member profile', weight: 0.12, time: 312, bounce: 18, load: 1.55 },
  { path: '/collection', title: 'NeverBeen Collection', weight: 0.09, time: 128, bounce: 36, load: 1.35 },
  { path: '/travel-feeds', title: 'Live travel feeds', weight: 0.07, time: 142, bounce: 29, load: 1.7 },
  { path: '/destinations/machu-picchu', title: 'Destination — Machu Picchu', weight: 0.05, time: 88, bounce: 44, load: 1.25 },
  { path: '/audience', title: 'Audience', weight: 0.045, time: 64, bounce: 47, load: 0.95 },
  { path: '/founder', title: 'Know the Founder', weight: 0.04, time: 81, bounce: 39, load: 0.9 },
  { path: '/community/message-book', title: 'Community — MessageBook', weight: 0.035, time: 204, bounce: 22, load: 1.45 },
  { path: '/feedback', title: 'Feedback', weight: 0.025, time: 58, bounce: 51, load: 0.85 },
  { path: '/help', title: 'Help Centre', weight: 0.02, time: 73, bounce: 48, load: 0.8 },
  { path: '/privacy', title: 'Privacy', weight: 0.012, time: 45, bounce: 62, load: 0.75 },
  { path: '/terms', title: 'Terms & Conditions', weight: 0.01, time: 41, bounce: 64, load: 0.75 },
  { path: '/community/register', title: 'Community — Register', weight: 0.018, time: 166, bounce: 27, load: 1.2 },
];

const REFERRERS: [string, number][] = [
  ['Direct', 34],
  ['Google', 28],
  ['Instagram', 14],
  ['Facebook', 9],
  ['WhatsApp', 6],
  ['Pinterest', 4],
  ['X (Twitter)', 3],
  ['Other', 2],
];
const BROWSERS: [string, number][] = [
  ['Chrome', 63],
  ['Safari', 21],
  ['Edge', 7],
  ['Firefox', 5],
  ['Samsung Internet', 3],
  ['Other', 1],
];

/* ================================================================== */
/*  Helpers                                                            */
/* ================================================================== */

function emptyMetrics(): Metrics {
  return { pageViews: 0, visitors: 0, sessions: 0, bounceRate: 0, avgSessionSec: 0, newUsers: 0, signIns: 0, registrations: 0, posts: 0, comments: 0, errors: 0, avgLoadMs: 0, p95LoadMs: 0, storageKb: 0 };
}

export function startOfDay(ms: number): number {
  const d = new Date(ms);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function dayKey(ms: number): string {
  const d = new Date(ms);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function formatMetric(key: MetricKey, v: number): string {
  const u = METRIC_META[key].unit;
  if (u === '%') return `${v.toFixed(1)}%`;
  if (u === 's') return `${Math.floor(v / 60)}m ${String(Math.round(v % 60)).padStart(2, '0')}s`;
  if (u === 'ms') return v >= 1000 ? `${(v / 1000).toFixed(2)} s` : `${Math.round(v)} ms`;
  if (u === 'KB') return v >= 1024 ? `${(v / 1024).toFixed(2)} MB` : `${Math.round(v)} KB`;
  return Math.round(v).toLocaleString();
}

export function pctChange(cur: number, prev: number): number | null {
  if (!prev) return null;
  return ((cur - prev) / prev) * 100;
}

function hashStr(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

/* ================================================================== */
/*  Service                                                            */
/* ================================================================== */

/**
 * Data engine behind Admin → Health. Traffic is modelled from a deterministic
 * baseline (so charts are stable between visits) and blended with REAL signals
 * gathered in this browser: tracked page views & JS errors, Navigation/Resource
 * Timing, Web Vitals, localStorage usage, the browser storage estimate and the
 * community's registrations, posts and activity.
 */
@Injectable({ providedIn: 'root' })
export class HealthDataService {
  private readonly insights = inject(AdminInsightsService);
  private readonly dataOps = inject(AdminDataOpsService);
  private readonly identity = inject(AdminIdentityService);
  private readonly community = inject(CommunityService);
  private readonly analytics = inject(SiteAnalyticsService);

  /** Bumped by "Refresh" / auto-refresh so real browser metrics are re-read. */
  readonly tick = signal(0);

  // ------------------------------------------------------------------ real browser signals
  readonly vitals = signal<{ lcp: number | null; cls: number | null; fcp: number | null }>({ lcp: null, cls: null, fcp: null });
  readonly storageEstimate = signal<{ usage: number; quota: number } | null>(null);

  constructor() {
    this.observeVitals();
    void this.refreshEstimate();
  }

  refresh(): void {
    this.dataOps.refreshStorage();
    void this.refreshEstimate();
    this.tick.update((n) => n + 1);
  }

  private async refreshEstimate(): Promise<void> {
    try {
      const est = await navigator.storage?.estimate?.();
      if (est && typeof est.usage === 'number' && typeof est.quota === 'number') this.storageEstimate.set({ usage: est.usage, quota: est.quota });
    } catch {
      /* unsupported */
    }
  }

  private observeVitals(): void {
    if (typeof PerformanceObserver === 'undefined' || typeof performance === 'undefined') return;
    try {
      const fcp = performance.getEntriesByType('paint').find((e) => e.name === 'first-contentful-paint');
      if (fcp) this.vitals.update((v) => ({ ...v, fcp: fcp.startTime }));
    } catch {
      /* ignore */
    }
    const observe = (type: string, cb: (list: PerformanceObserverEntryList) => void) => {
      try {
        const po = new PerformanceObserver(cb);
        po.observe({ type, buffered: true } as PerformanceObserverInit);
      } catch {
        /* unsupported entry type */
      }
    };
    observe('largest-contentful-paint', (list) => {
      const last = list.getEntries().at(-1);
      if (last) this.vitals.update((v) => ({ ...v, lcp: last.startTime }));
    });
    let cls = 0;
    observe('layout-shift', (list) => {
      for (const e of list.getEntries() as (PerformanceEntry & { value: number; hadRecentInput: boolean })[]) if (!e.hadRecentInput) cls += e.value;
      this.vitals.update((v) => ({ ...v, cls: Math.round(cls * 1000) / 1000 }));
    });
    observe('paint', (list) => {
      const e = list.getEntries().find((x) => x.name === 'first-contentful-paint');
      if (e) this.vitals.update((v) => ({ ...v, fcp: e.startTime }));
    });
  }

  /** Real vitals of this Admin session (Navigation Timing + Web Vitals). */
  readonly realVitals = computed<VitalReading[]>(() => {
    this.tick();
    const v = this.vitals();
    let nav: PerformanceNavigationTiming | undefined;
    try {
      nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;
    } catch {
      nav = undefined;
    }
    const heap = (performance as unknown as { memory?: { usedJSHeapSize: number } }).memory?.usedJSHeapSize;
    return [
      { key: 'ttfb', label: 'Time to first byte', value: nav ? nav.responseStart - nav.startTime : null, unit: 'ms', good: 800, poor: 1800, hint: 'Server / CDN responsiveness' },
      { key: 'fcp', label: 'First contentful paint', value: v.fcp, unit: 'ms', good: 1800, poor: 3000, hint: 'First pixels on screen' },
      { key: 'lcp', label: 'Largest contentful paint', value: v.lcp, unit: 'ms', good: 2500, poor: 4000, hint: 'Main content visible (Core Web Vital)' },
      { key: 'cls', label: 'Cumulative layout shift', value: v.cls, unit: '', good: 0.1, poor: 0.25, hint: 'Visual stability (Core Web Vital)' },
      { key: 'dcl', label: 'DOM ready', value: nav ? nav.domContentLoadedEventEnd - nav.startTime : null, unit: 'ms', good: 2000, poor: 4000, hint: 'HTML parsed & scripts run' },
      { key: 'load', label: 'Full page load', value: nav && nav.loadEventEnd > 0 ? nav.loadEventEnd - nav.startTime : null, unit: 'ms', good: 3000, poor: 6000, hint: 'All resources loaded' },
      { key: 'heap', label: 'JS memory in use', value: heap ? Math.round((heap / 1048576) * 10) / 10 : null, unit: 'MB', good: 60, poor: 150, hint: 'Chrome only' },
    ];
  });

  readonly resources = computed<{ byType: Share[]; sizeByType: Share[]; largest: ResourceRow[]; totalKb: number; count: number }>(() => {
    this.tick();
    let entries: PerformanceResourceTiming[] = [];
    try {
      entries = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
    } catch {
      entries = [];
    }
    const typeOf = (e: PerformanceResourceTiming) => {
      const n = e.name.split('?')[0];
      if (/\.(js|mjs)$/.test(n) || e.initiatorType === 'script') return 'Script';
      if (/\.css$/.test(n) || e.initiatorType === 'css' && /\.css/.test(n)) return 'Stylesheet';
      if (/\.(png|jpe?g|gif|webp|svg|avif|ico)$/i.test(n) || e.initiatorType === 'img') return 'Image';
      if (/\.(woff2?|ttf|otf)$/i.test(n)) return 'Font';
      if (e.initiatorType === 'fetch' || e.initiatorType === 'xmlhttprequest') return 'API / fetch';
      return 'Other';
    };
    const count = new Map<string, number>();
    const size = new Map<string, number>();
    const rows: ResourceRow[] = [];
    for (const e of entries) {
      const t = typeOf(e);
      const kb = (e.transferSize || e.encodedBodySize || 0) / 1024;
      count.set(t, (count.get(t) ?? 0) + 1);
      size.set(t, (size.get(t) ?? 0) + kb);
      rows.push({ name: e.name.replace(location.origin, '') || e.name, type: t, sizeKb: Math.round(kb * 10) / 10, durationMs: Math.round(e.duration) });
    }
    const toShares = (m: Map<string, number>) => [...m.entries()].sort((a, b) => b[1] - a[1]).map(([label, value], i) => ({ label, value: Math.round(value * 10) / 10, color: PALETTE[i % PALETTE.length] }));
    return {
      byType: toShares(count),
      sizeByType: toShares(size),
      largest: rows.sort((a, b) => b.sizeKb - a.sizeKb || b.durationMs - a.durationMs).slice(0, 25),
      totalKb: Math.round([...size.values()].reduce((a, b) => a + b, 0)),
      count: entries.length,
    };
  });

  // ------------------------------------------------------------------ storage (real)
  readonly storageUsed = computed(() => {
    this.tick();
    return this.dataOps.storageUsed();
  });
  readonly storagePct = computed(() => Math.round((this.storageUsed() / STORAGE_QUOTA) * 1000) / 10);

  readonly storageKeys = computed<StorageKeyRow[]>(() => {
    this.tick();
    this.dataOps.datasets();
    if (typeof localStorage === 'undefined') return [];
    const labels = new Map(this.dataOps.datasets().map((d) => [d.key, d]));
    const rows: StorageKeyRow[] = [];
    let total = 0;
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key) continue;
      const bytes = key.length + (localStorage.getItem(key)?.length ?? 0);
      total += bytes;
      const ds = labels.get(key);
      rows.push({ key, label: ds?.label ?? this.guessLabel(key), records: ds ? ds.records : null, bytes, share: 0 });
    }
    return rows.map((r) => ({ ...r, share: total ? (r.bytes / total) * 100 : 0 })).sort((a, b) => b.bytes - a.bytes);
  });

  private guessLabel(key: string): string {
    const known: Record<string, string> = {
      neverbeen_site_config: 'Website configuration',
      neverbeen_maintenance: 'Site downtime settings',
      neverbeen_site_analytics: 'Site analytics (page views & errors)',
      neverbeen_admin_audit_log: 'Admin audit log',
    };
    return known[key] ?? key.replace(/^neverbeen_/, '').replace(/_/g, ' ');
  }

  /** Days until localStorage is full at the recent growth rate (null = not growing). */
  readonly storageRunway = computed(() => {
    const series = this.daySeries(startOfDay(Date.now()) - 29 * DAY, startOfDay(Date.now()) + DAY - 1, { granularity: 'day', device: 'all', country: 'all', range: '30d' });
    const pts = series.map((b, i) => [i, b.m.storageKb] as const);
    const n = pts.length;
    const sx = pts.reduce((a, p) => a + p[0], 0);
    const sy = pts.reduce((a, p) => a + p[1], 0);
    const sxy = pts.reduce((a, p) => a + p[0] * p[1], 0);
    const sxx = pts.reduce((a, p) => a + p[0] * p[0], 0);
    const slope = (n * sxy - sx * sy) / (n * sxx - sx * sx || 1); // KB per day
    const remainingKb = (STORAGE_QUOTA - this.storageUsed()) / 1024;
    return { slopeKbPerDay: Math.round(slope * 10) / 10, days: slope > 0.01 ? Math.round(remainingKb / slope) : null };
  });

  // ------------------------------------------------------------------ community (real)
  private readonly countryShares = computed<Share[]>(() => {
    const m = new Map<string, number>();
    for (const x of this.insights.members()) if (x.country) m.set(x.country, (m.get(x.country) ?? 0) + 1);
    const total = [...m.values()].reduce((a, b) => a + b, 0) || 1;
    return [...m.entries()].sort((a, b) => b[1] - a[1]).map(([label, v], i) => ({ label, value: v / total, color: PALETTE[i % PALETTE.length] }));
  });

  readonly countries = computed(() => this.countryShares().map((c) => c.label));

  readonly activeUsers = computed(() => {
    const now = Date.now();
    const members = this.insights.members();
    const within = (d: number) => members.filter((m) => now - Date.parse(m.lastActiveUtc) <= d * DAY).length;
    const dau = within(1);
    const wau = within(7);
    const mau = within(30);
    return { dau, wau, mau, online: this.insights.onlineMembers().length, total: members.length, stickiness: mau ? Math.round((dau / mau) * 1000) / 10 : 0 };
  });

  /** Real registration / post / comment timestamps (ms). */
  private readonly realEvents = computed(() => {
    const reg = this.insights.members().map((m) => Date.parse(m.registeredAtUtc)).filter((n) => !Number.isNaN(n));
    const posts: number[] = [];
    const comments: number[] = [];
    for (const p of this.community.journeyPosts()) {
      const t = Date.parse(p.createdAtUtc);
      if (!Number.isNaN(t)) posts.push(t);
      for (const c of p.comments ?? []) {
        const ct = Date.parse((c as { createdAtUtc?: string }).createdAtUtc ?? '');
        if (!Number.isNaN(ct)) comments.push(ct);
      }
    }
    return { reg, posts, comments };
  });

  readonly topMembers = computed(() =>
    this.insights
      .members()
      .slice()
      .sort((a, b) => b.postCount * 3 + b.commentCount - (a.postCount * 3 + a.commentCount))
      .slice(0, 50)
      .map((m) => ({ id: m.id, name: m.fullName, photo: m.photo, country: m.country, posts: m.postCount, comments: m.commentCount, likes: m.likesReceived, lastActiveUtc: m.lastActiveUtc, online: m.isOnline })),
  );

  // ------------------------------------------------------------------ time window
  window(q: Pick<HealthQuery, 'range' | 'from' | 'to'>): { start: number; end: number } {
    const now = Date.now();
    const today = startOfDay(now);
    switch (q.range) {
      case '24h':
        return { start: Math.floor(now / HOUR) * HOUR - 23 * HOUR, end: now };
      case '7d':
        return { start: today - 6 * DAY, end: now };
      case '30d':
        return { start: today - 29 * DAY, end: now };
      case '90d':
        return { start: today - 89 * DAY, end: now };
      case '12m':
        return { start: today - 364 * DAY, end: now };
      case 'custom': {
        const a = q.from ? new Date(q.from + 'T00:00:00').getTime() : today - 29 * DAY;
        const b = q.to ? new Date(q.to + 'T23:59:59.999').getTime() : now;
        const start = Math.min(a, b);
        return { start: Math.max(start, today - 730 * DAY), end: Math.min(Math.max(a, b), now) };
      }
    }
  }

  previousWindow(w: { start: number; end: number }): { start: number; end: number } {
    const len = w.end - w.start;
    return { start: w.start - len - 1, end: w.start - 1 };
  }

  /** Allowed granularities for a window length. */
  granularities(w: { start: number; end: number }): Granularity[] {
    const days = (w.end - w.start) / DAY;
    const out: Granularity[] = [];
    if (days <= 8) out.push('hour');
    if (days >= 1.5) out.push('day');
    if (days >= 14) out.push('week');
    if (days >= 60) out.push('month');
    return out.length ? out : ['day'];
  }

  // ------------------------------------------------------------------ baseline model
  private dayModel(dayStart: number): Metrics {
    const idx = Math.floor((dayStart + 12 * HOUR) / DAY);
    const rnd = seeded(idx * 7919 + 17);
    const t = idx - Math.floor(Date.now() / DAY) + 420; // ≈ days since model start
    const date = new Date(dayStart);
    const growth = 1 + 0.0019 * t;
    const weekly = WEEKDAY[date.getDay()];
    const doy = Math.floor((dayStart - new Date(date.getFullYear(), 0, 1).getTime()) / DAY);
    const seasonal = 1 + 0.12 * Math.sin((2 * Math.PI * (doy - 80)) / 365);
    const h = hashStr(`d${idx}`);
    const spike = h % 37 === 0 ? 1.85 : h % 23 === 0 ? 1.35 : 1;
    const incident = h % 53 === 0;
    const visitors = 420 * growth * weekly * seasonal * spike * (0.9 + 0.2 * rnd());
    const sessions = visitors * (1.22 + 0.12 * rnd());
    const pageViews = sessions * (2.5 + 0.9 * rnd());
    const newUsers = visitors * (0.3 + 0.1 * rnd()) * (spike > 1 ? 1.25 : 1);
    const load = 1180 + 320 * rnd() + (visitors / 1000) * 260 + (incident ? 900 : 0);
    return {
      pageViews,
      visitors,
      sessions,
      bounceRate: 36 + 9 * rnd() - (spike > 1.5 ? 4 : 0) + (incident ? 7 : 0),
      avgSessionSec: 140 + 70 * rnd(),
      newUsers,
      signIns: visitors * (0.14 + 0.05 * rnd()),
      registrations: newUsers * (0.045 + 0.02 * rnd()),
      posts: visitors * (0.022 + 0.012 * rnd()),
      comments: visitors * (0.05 + 0.03 * rnd()),
      errors: pageViews * (0.0007 + 0.0006 * rnd()) * (incident ? 7 : 1),
      avgLoadMs: load,
      p95LoadMs: load * (1.85 + 0.35 * rnd()) * (incident ? 1.4 : 1),
      storageKb: 0,
    };
  }

  private filterFactor(q: Pick<HealthQuery, 'device' | 'country'>): number {
    let f = 1;
    if (q.device !== 'all') f *= DEVICE_SHARE[q.device];
    if (q.country !== 'all') f *= this.countryShares().find((c) => c.label === q.country)?.value ?? 0;
    return f;
  }

  /** Metrics for [start,end) built from day models, hour shape and real events. */
  private span(start: number, end: number, q: Pick<HealthQuery, 'device' | 'country'>): Metrics {
    const out = emptyMetrics();
    const f = this.filterFactor(q);
    let weight = 0;
    let loadW = 0;
    let bounceW = 0;
    let sessW = 0;
    let p95W = 0;
    let cursor = start;
    const now = Date.now();
    const stop = Math.min(end, now);
    while (cursor < stop) {
      const dayStart = startOfDay(cursor);
      const next = Math.min(dayStart + DAY, stop);
      const dm = this.dayModel(dayStart);
      // Fraction of the day's traffic inside [cursor,next) using the hour shape.
      const h0 = (cursor - dayStart) / HOUR;
      const h1 = (next - dayStart) / HOUR;
      let frac = 0;
      for (let h = Math.floor(h0); h < Math.ceil(h1); h++) {
        const a = Math.max(h, h0);
        const b = Math.min(h + 1, h1);
        if (b > a) frac += HOUR_SHAPE[h] * (b - a);
      }
      for (const k of ['pageViews', 'visitors', 'sessions', 'newUsers', 'signIns', 'registrations', 'posts', 'comments', 'errors'] as const) out[k] += dm[k] * frac * f;
      const w = dm.sessions * frac * f;
      weight += w;
      bounceW += dm.bounceRate * w;
      sessW += dm.avgSessionSec * w;
      const mobilePenalty = q.device === 'mobile' ? 1.28 : q.device === 'tablet' ? 1.12 : 1;
      loadW += dm.avgLoadMs * mobilePenalty * w;
      p95W += dm.p95LoadMs * mobilePenalty * w;
      cursor = next;
    }
    if (weight > 0) {
      out.bounceRate = bounceW / weight + (q.device === 'mobile' ? 4 : 0);
      out.avgSessionSec = sessW / weight;
      out.avgLoadMs = loadW / weight;
      out.p95LoadMs = p95W / weight;
    }
    // Real signals from this browser & the community data.
    const views = this.analytics.state().views;
    const realPv = views.filter((v) => {
      const t = Date.parse(v.t);
      return t >= start && t < end && (q.device === 'all' || v.d === q.device);
    }).length;
    out.pageViews += realPv;
    out.errors += this.analytics.state().errors.filter((e) => {
      const t = Date.parse(e.t);
      return t >= start && t < end;
    }).length;
    if (q.country === 'all' && q.device === 'all') {
      const ev = this.realEvents();
      const inR = (arr: number[]) => arr.filter((t) => t >= start && t < end).length;
      out.registrations = Math.max(out.registrations, inR(ev.reg));
      out.posts = Math.max(out.posts, inR(ev.posts));
      out.comments = Math.max(out.comments, inR(ev.comments));
    }
    out.storageKb = this.storageAt(Math.min(end, now));
    return out;
  }

  /** Modelled stored-data size at a point in time, ending at today's real usage. */
  private storageAt(t: number): number {
    const nowKb = Math.max(this.storageUsed() / 1024, 1);
    const daysAgo = Math.max(0, (Date.now() - t) / DAY);
    const rnd = seeded(Math.floor(t / DAY) + 5)();
    return Math.max(nowKb * 0.08, nowKb * (1 - daysAgo * 0.0021) * (0.985 + 0.03 * rnd));
  }

  /** Buckets for a window at a granularity. */
  daySeries(start: number, end: number, q: Pick<HealthQuery, 'granularity' | 'device' | 'country' | 'range'>): Bucket[] {
    this.tick();
    this.analytics.state();
    const buckets: Bucket[] = [];
    const g = q.granularity;
    let cursor = g === 'hour' ? Math.floor(start / HOUR) * HOUR : startOfDay(start);
    if (g === 'week') cursor = startOfDay(cursor - ((new Date(cursor).getDay() + 6) % 7) * DAY); // Monday
    if (g === 'month') cursor = new Date(new Date(cursor).getFullYear(), new Date(cursor).getMonth(), 1).getTime();
    let guard = 0;
    while (cursor <= end && guard++ < 2000) {
      let next: number;
      if (g === 'hour') next = cursor + HOUR;
      else if (g === 'day') next = startOfDay(cursor + DAY + 2 * HOUR);
      else if (g === 'week') next = startOfDay(cursor + 7 * DAY + 2 * HOUR);
      else {
        const d = new Date(cursor);
        next = new Date(d.getFullYear(), d.getMonth() + 1, 1).getTime();
      }
      const a = Math.max(cursor, start);
      const b = Math.min(next, end + 1);
      if (b > a) {
        const d = new Date(cursor);
        const label =
          g === 'hour'
            ? d.toLocaleString(undefined, { hour: 'numeric', ...(q.range === '24h' ? {} : { weekday: 'short' }) })
            : g === 'month'
              ? d.toLocaleDateString(undefined, { month: 'short', year: '2-digit' })
              : d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
        buckets.push({ key: g === 'hour' ? `${dayKey(cursor)} ${d.getHours()}h` : dayKey(cursor), label, start: a, end: b, m: this.span(a, b, q) });
      }
      cursor = next;
    }
    return buckets;
  }

  totals(buckets: Bucket[]): Metrics {
    const out = emptyMetrics();
    if (!buckets.length) return out;
    let w = 0;
    for (const b of buckets) {
      for (const k of Object.keys(METRIC_META) as MetricKey[]) {
        const agg = METRIC_META[k].agg;
        if (agg === 'sum') out[k] += b.m[k];
      }
      const bw = b.m.sessions || 1;
      w += bw;
      out.bounceRate += b.m.bounceRate * bw;
      out.avgSessionSec += b.m.avgSessionSec * bw;
      out.avgLoadMs += b.m.avgLoadMs * bw;
      out.p95LoadMs += b.m.p95LoadMs * bw;
    }
    out.bounceRate /= w;
    out.avgSessionSec /= w;
    out.avgLoadMs /= w;
    out.p95LoadMs /= w;
    out.storageKb = buckets[buckets.length - 1].m.storageKb;
    return out;
  }

  /** 7×24 matrix (Mon..Sun × hour) of visitors in the window. */
  heatmap(start: number, end: number, q: Pick<HealthQuery, 'device' | 'country'>): number[][] {
    const grid = Array.from({ length: 7 }, () => Array<number>(24).fill(0));
    const f = this.filterFactor(q);
    for (let d = startOfDay(start); d <= end; d = startOfDay(d + DAY + 2 * HOUR)) {
      const dm = this.dayModel(d);
      const row = (new Date(d).getDay() + 6) % 7;
      const rnd = seeded(Math.floor(d / DAY) + 99);
      for (let h = 0; h < 24; h++) {
        const t = d + h * HOUR;
        if (t < start - HOUR || t > end) continue;
        grid[row][h] += dm.visitors * HOUR_SHAPE[h] * f * (0.9 + 0.2 * rnd());
      }
    }
    return grid.map((r) => r.map((v) => Math.round(v)));
  }

  // ------------------------------------------------------------------ breakdowns
  pages(start: number, end: number, totals: Metrics, q: Pick<HealthQuery, 'device' | 'country'>): PageRow[] {
    const real = new Map<string, number>();
    for (const v of this.analytics.state().views) {
      const t = Date.parse(v.t);
      if (t >= start && t < end && (q.device === 'all' || v.d === q.device)) real.set(v.p, (real.get(v.p) ?? 0) + 1);
    }
    const seed = Math.floor(start / DAY);
    const rows = PAGES.map((p) => {
      const rnd = seeded(hashStr(p.path) + seed);
      const views = totals.pageViews * p.weight * (0.85 + 0.3 * rnd());
      const trendRnd = seeded(hashStr(p.path) * 3 + seed);
      const trend = Array.from({ length: 12 }, (_, i) => Math.round(views / 12 * (0.75 + 0.5 * trendRnd() + i * 0.02)));
      const r = real.get(p.path) ?? 0;
      real.delete(p.path);
      return {
        path: p.path,
        title: p.title,
        views: Math.round(views) + r,
        visitors: Math.round(views / (1.6 + 0.6 * rnd())),
        avgTimeSec: p.time * (0.85 + 0.3 * rnd()),
        bounceRate: p.bounce * (0.9 + 0.2 * rnd()),
        p95LoadMs: totals.p95LoadMs * p.load * (0.9 + 0.2 * rnd()),
        trend,
        realViews: r,
      };
    });
    // Real pages not in the catalogue (e.g. other destinations).
    for (const [path, n] of real) rows.push({ path, title: path, views: n, visitors: n, avgTimeSec: 0, bounceRate: 0, p95LoadMs: 0, trend: [], realViews: n });
    return rows.sort((a, b) => b.views - a.views);
  }

  shares(kind: 'referrers' | 'devices' | 'browsers' | 'countries', total: number, start: number): Share[] {
    const rnd = seeded(Math.floor(start / DAY) + kind.length * 31);
    let base: [string, number][];
    if (kind === 'referrers') base = REFERRERS;
    else if (kind === 'browsers') base = BROWSERS;
    else if (kind === 'devices') base = Object.entries(DEVICE_SHARE).map(([k, v]) => [k[0].toUpperCase() + k.slice(1), v * 100]);
    else base = this.countryShares().slice(0, 10).map((c) => [c.label, c.value * 100]);
    const jittered = base.map(([l, v]) => [l, v * (0.9 + 0.2 * rnd())] as [string, number]);
    const sum = jittered.reduce((a, [, v]) => a + v, 0) || 1;
    return jittered.map(([label, v], i) => ({ label, value: Math.round((v / sum) * total), color: PALETTE[i % PALETTE.length] }));
  }

  funnel(t: Metrics): Share[] {
    const community = t.visitors * 0.34;
    return [
      { label: 'Visitors', value: Math.round(t.visitors) },
      { label: 'Visited Community', value: Math.round(community) },
      { label: 'Signed in', value: Math.round(Math.min(community, t.signIns)) },
      { label: 'Registered', value: Math.round(Math.min(t.signIns, t.registrations)) },
      { label: 'Posted a journey', value: Math.round(Math.min(t.registrations, t.posts * 0.45)) },
    ];
  }

  /** Weekly retention cohorts: rows = cohorts (oldest first), cols = week 0..7 (%). */
  cohorts(): { label: string; size: number; values: (number | null)[] }[] {
    const today = startOfDay(Date.now());
    const monday = today - ((new Date(today).getDay() + 6) % 7) * DAY;
    const out: { label: string; size: number; values: (number | null)[] }[] = [];
    for (let c = 7; c >= 0; c--) {
      const start = monday - c * 7 * DAY;
      const rnd = seeded(Math.floor(start / DAY) + 1234);
      const size = Math.round(this.span(start, start + 7 * DAY, { device: 'all', country: 'all' }).newUsers * 0.06 + 20);
      const values: (number | null)[] = [];
      let v = 100;
      for (let w = 0; w < 8; w++) {
        if (w > c) {
          values.push(null);
          continue;
        }
        if (w > 0) v = v * (w === 1 ? 0.42 + 0.1 * rnd() : 0.8 + 0.1 * rnd());
        values.push(Math.round(v * 10) / 10);
      }
      out.push({ label: new Date(start).toLocaleDateString(undefined, { day: 'numeric', month: 'short' }), size, values });
    }
    return out;
  }

  // ------------------------------------------------------------------ risks
  risks(cur: Metrics, prev: Metrics, recent: Bucket[]): RiskAlert[] {
    const out: RiskAlert[] = [];
    const pct = this.storagePct();
    if (pct >= 80) out.push({ id: 'storage-high', severity: 'critical', area: 'Storage', title: 'Browser storage almost full', detail: `NeverBeen data uses ${pct}% of the 5 MB localStorage quota. New posts and settings may fail to save.`, metric: `${pct}%`, action: 'Run retention purges or archive old datasets in Data Management.' });
    else if (pct >= 60) out.push({ id: 'storage-high', severity: 'warning', area: 'Storage', title: 'Storage usage is high', detail: `NeverBeen data uses ${pct}% of the 5 MB localStorage quota.`, metric: `${pct}%`, action: 'Review the largest datasets and retention policies.' });
    const runway = this.storageRunway();
    if (runway.days !== null && runway.days < 120) out.push({ id: 'storage-runway', severity: runway.days < 30 ? 'critical' : 'warning', area: 'Storage', title: 'Storage runway is short', detail: `At ~${runway.slopeKbPerDay} KB/day growth the quota is reached in about ${runway.days} days.`, metric: `${runway.days} d`, action: 'Plan archiving or move media to server storage.' });

    if (cur.p95LoadMs > 4500) out.push({ id: 'p95', severity: 'critical', area: 'Performance', title: 'Page loads are very slow for 5% of visits', detail: `p95 page load is ${formatMetric('p95LoadMs', cur.p95LoadMs)} for the period.`, metric: formatMetric('p95LoadMs', cur.p95LoadMs), action: 'Optimise images and lazy-load heavy routes (profile, travel feeds).' });
    else if (cur.p95LoadMs > 3000) out.push({ id: 'p95', severity: 'warning', area: 'Performance', title: 'Slow tail latency (p95 > 3 s)', detail: `p95 page load is ${formatMetric('p95LoadMs', cur.p95LoadMs)} — the slowest 5% of visitors wait too long.`, metric: formatMetric('p95LoadMs', cur.p95LoadMs), action: 'Check the slowest pages below and compress large images/scripts.' });

    const slow = PAGES.map((p) => ({ p, v: cur.p95LoadMs * p.load })).sort((a, b) => b.v - a.v)[0];
    if (slow && slow.v > 3500) out.push({ id: 'bottleneck-page', severity: 'warning', area: 'Performance', title: `Bottleneck: ${slow.p.title}`, detail: `${slow.p.path} is the slowest page with an estimated p95 of ${formatMetric('p95LoadMs', slow.v)}.`, metric: formatMetric('p95LoadMs', slow.v), action: 'Split the page bundle and defer below-the-fold content.' });

    const errRate = cur.pageViews ? (cur.errors / cur.pageViews) * 1000 : 0;
    if (errRate > 2) out.push({ id: 'errors', severity: errRate > 4 ? 'critical' : 'warning', area: 'Performance', title: 'Elevated JavaScript error rate', detail: `${errRate.toFixed(2)} errors per 1,000 page views (${Math.round(cur.errors)} total).`, metric: `${errRate.toFixed(2)}‰`, action: 'Inspect recent errors and the last release.' });

    const bounceDelta = cur.bounceRate - prev.bounceRate;
    if (prev.bounceRate && bounceDelta > 3) out.push({ id: 'bounce', severity: bounceDelta > 7 ? 'warning' : 'info', area: 'Traffic', title: 'Bounce rate is rising', detail: `Bounce rate moved from ${prev.bounceRate.toFixed(1)}% to ${cur.bounceRate.toFixed(1)}% vs the previous period.`, metric: `+${bounceDelta.toFixed(1)} pts`, action: 'Review landing-page content and page speed on mobile.' });

    const tr = pctChange(cur.visitors, prev.visitors);
    if (tr !== null && tr < -15) out.push({ id: 'traffic-drop', severity: tr < -30 ? 'critical' : 'warning', area: 'Traffic', title: 'Traffic dropped', detail: `Unique visitors are down ${Math.abs(tr).toFixed(1)}% vs the previous period.`, metric: `${tr.toFixed(1)}%`, action: 'Check campaigns, SEO and whether any downtime occurred.' });
    if (recent.length >= 8) {
      const vals = recent.map((b) => b.m.visitors);
      const last = vals[vals.length - 2] ?? vals[vals.length - 1]; // last complete bucket
      const hist = vals.slice(0, -2);
      const mean = hist.reduce((a, b) => a + b, 0) / hist.length;
      const sd = Math.sqrt(hist.reduce((a, b) => a + (b - mean) ** 2, 0) / hist.length) || 1;
      const z = (last - mean) / sd;
      if (z > 2.2) out.push({ id: 'spike', severity: 'info', area: 'Traffic', title: 'Traffic spike detected', detail: `The last complete period had ${Math.round(last).toLocaleString()} visitors — ${z.toFixed(1)}σ above normal. Capacity and moderation load may increase.`, metric: `z=${z.toFixed(1)}`, action: 'Make sure moderators are available and watch error rates.' });
      if (z < -2.2) out.push({ id: 'dip', severity: 'warning', area: 'Traffic', title: 'Unusual traffic dip', detail: `The last complete period had only ${Math.round(last).toLocaleString()} visitors (${z.toFixed(1)}σ).`, metric: `z=${z.toFixed(1)}`, action: 'Verify the site is reachable and campaigns are running.' });
    }

    const act = this.activeUsers();
    if (act.stickiness < 12) out.push({ id: 'stickiness', severity: 'info', area: 'User activity', title: 'Low daily engagement', detail: `Only ${act.stickiness}% of monthly active members return daily (DAU/MAU).`, metric: `${act.stickiness}%`, action: 'Use notifications or MessageBook prompts to re-engage members.' });

    const pendingReports = this.insights.pendingReports().length;
    if (pendingReports > 5) out.push({ id: 'moderation', severity: pendingReports > 10 ? 'warning' : 'info', area: 'Operations', title: 'Moderation backlog', detail: `${pendingReports} abuse reports are waiting for review.`, metric: String(pendingReports), action: 'Review them in Dashboard → Abuse reports.' });
    const idq = this.identity.pending().length;
    if (idq > 3) out.push({ id: 'identity', severity: 'info', area: 'Operations', title: 'Identity checks waiting', detail: `${idq} identity submissions are pending review.`, metric: String(idq), action: 'Open Dashboard → Identity Check Verification.' });

    const v = this.vitals();
    if (v.lcp !== null && v.lcp > 2500) out.push({ id: 'lcp', severity: v.lcp > 4000 ? 'warning' : 'info', area: 'Performance', title: 'Largest Contentful Paint above target', detail: `LCP measured in this session is ${Math.round(v.lcp)} ms (target ≤ 2,500 ms).`, metric: `${Math.round(v.lcp)} ms`, action: 'Preload the hero image and reduce render-blocking CSS.' });
    if (v.cls !== null && v.cls > 0.1) out.push({ id: 'cls', severity: v.cls > 0.25 ? 'warning' : 'info', area: 'Performance', title: 'Layout shifts detected', detail: `CLS in this session is ${v.cls} (target ≤ 0.1).`, metric: String(v.cls), action: 'Reserve space for images and banners.' });
    const bigScript = this.resources().largest.find((r) => r.type === 'Script' && r.sizeKb > 400);
    if (bigScript) out.push({ id: 'bundle', severity: 'info', area: 'Performance', title: 'Large JavaScript bundle', detail: `${bigScript.name.split('/').pop()} transfers ${bigScript.sizeKb} KB.`, metric: `${bigScript.sizeKb} KB`, action: 'Code-split or lazy-load rarely used features.' });

    const order: Record<RiskSeverity, number> = { critical: 0, warning: 1, info: 2 };
    return out.sort((a, b) => order[a.severity] - order[b.severity]);
  }

  score(risks: RiskAlert[]): number {
    const penalty = risks.reduce((s, r) => s + (r.severity === 'critical' ? 18 : r.severity === 'warning' ? 8 : 2), 0);
    return Math.max(0, Math.min(100, 100 - penalty));
  }
}
