import { STORAGE_QUOTA } from '../shared/admin-data-ops.service';
import {
  Bucket,
  DeviceFilter,
  Granularity,
  HealthDataService,
  METRIC_META,
  MetricKey,
  Metrics,
  RangeKey,
  formatMetric,
  pctChange,
} from './health-data.service';
import { XlsxSheet, buildXlsx } from './xlsx';

export type ReportSection = 'summary' | 'risks' | 'traffic' | 'activity' | 'storage' | 'performance';

export const REPORT_SECTIONS: { key: ReportSection; label: string; icon: string; hint: string }[] = [
  { key: 'summary', label: 'Executive summary', icon: '🧭', hint: 'Health score & headline KPIs vs previous period' },
  { key: 'risks', label: 'Risks & bottlenecks', icon: '🚨', hint: 'Detected issues with recommended actions' },
  { key: 'traffic', label: 'Traffic', icon: '📈', hint: 'Visits over time, top pages, sources, devices, countries' },
  { key: 'activity', label: 'User activity', icon: '👥', hint: 'Active members, engagement, funnel, retention' },
  { key: 'storage', label: 'Storage', icon: '💽', hint: 'Usage, growth, runway and largest datasets' },
  { key: 'performance', label: 'Performance', icon: '⚡', hint: 'Load times, Web Vitals, errors and resources' },
];

export interface ReportSpec {
  id: string;
  title: string;
  preparedBy: string;
  notes: string;
  sections: ReportSection[];
  range: RangeKey;
  from?: string;
  to?: string;
  granularity: Granularity;
  device: DeviceFilter;
  country: string;
  compare: boolean;
  includeCharts: boolean;
  includeTables: boolean;
  includeRecommendations: boolean;
  orientation: 'portrait' | 'landscape';
  confidentiality: 'Internal' | 'Confidential' | 'Public';
  createdUtc: string;
}

export const REPORT_SPEC_KEY = 'neverbeen_health_report_spec';

export function saveSpec(spec: ReportSpec): void {
  try {
    localStorage.setItem(REPORT_SPEC_KEY, JSON.stringify(spec));
  } catch {
    /* ignore */
  }
}

export function loadSpec(): ReportSpec | null {
  try {
    const raw = localStorage.getItem(REPORT_SPEC_KEY);
    return raw ? (JSON.parse(raw) as ReportSpec) : null;
  } catch {
    return null;
  }
}

export const SUMMARY_METRICS: MetricKey[] = ['pageViews', 'visitors', 'sessions', 'bounceRate', 'avgSessionSec', 'registrations', 'posts', 'errors', 'avgLoadMs', 'p95LoadMs'];

/** Everything a report needs, computed once from the spec. */
export function buildReportData(data: HealthDataService, spec: ReportSpec) {
  const q = { range: spec.range, from: spec.from, to: spec.to, granularity: spec.granularity, device: spec.device, country: spec.country };
  const win = data.window(q);
  const allowed = data.granularities(win);
  const granularity = allowed.includes(spec.granularity) ? spec.granularity : allowed[allowed.length > 1 ? 1 : 0];
  const prevWin = data.previousWindow(win);
  const buckets = data.daySeries(win.start, win.end, { ...q, granularity });
  const prevBuckets = data.daySeries(prevWin.start, prevWin.end, { ...q, granularity });
  const totals = data.totals(buckets);
  const prevTotals = data.totals(prevBuckets);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const recent = data.daySeries(today.getTime() - 29 * 86_400_000, Date.now(), { ...q, granularity: 'day', range: '30d' });
  const risks = data.risks(totals, prevTotals, recent);
  return {
    q: { ...q, granularity },
    win,
    prevWin,
    buckets,
    prevBuckets,
    totals,
    prevTotals,
    risks,
    score: data.score(risks),
    pages: data.pages(win.start, win.end, totals, q),
    referrers: data.shares('referrers', totals.sessions, win.start),
    devices: data.shares('devices', totals.sessions, win.start),
    browsers: data.shares('browsers', totals.sessions, win.start),
    countries: data.shares('countries', totals.visitors, win.start),
    active: data.activeUsers(),
    funnel: data.funnel(totals),
    cohorts: data.cohorts(),
    storageKeys: data.storageKeys(),
    storageUsed: data.storageUsed(),
    storagePct: data.storagePct(),
    runway: data.storageRunway(),
    estimate: data.storageEstimate(),
    vitals: data.realVitals(),
    resources: data.resources(),
    topMembers: data.topMembers().slice(0, 15),
  };
}

export type ReportData = ReturnType<typeof buildReportData>;

export function describeWindow(win: { start: number; end: number }): string {
  const f = (t: number) => new Date(t).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
  return `${f(win.start)} – ${f(win.end)}`;
}

export function deltaText(key: MetricKey, cur: number, prev: number): string {
  const p = pctChange(cur, prev);
  if (p === null) return '—';
  return `${p >= 0 ? '+' : ''}${p.toFixed(1)}%`;
}

export function kpiRows(d: ReportData): { key: MetricKey; label: string; cur: string; prev: string; delta: string; good: boolean | null }[] {
  return SUMMARY_METRICS.map((k) => {
    const cur = d.totals[k];
    const prev = d.prevTotals[k];
    const p = pctChange(cur, prev);
    const good = p === null ? null : METRIC_META[k].better === 'up' ? p >= 0 : p <= 0;
    return { key: k, label: METRIC_META[k].label, cur: formatMetric(k, cur), prev: formatMetric(k, prev), delta: deltaText(k, cur, prev), good };
  });
}

/* ------------------------------------------------------------------ Excel */

const round = (v: number, n = 1) => Math.round(v * 10 ** n) / 10 ** n;

export function buildExcel(d: ReportData, spec: ReportSpec): Blob {
  const period = describeWindow(d.win);
  const sub = `${period} · generated ${new Date().toLocaleString()} · ${spec.confidentiality}${spec.device !== 'all' ? ' · device: ' + spec.device : ''}${spec.country !== 'all' ? ' · country: ' + spec.country : ''}`;
  const sheets: XlsxSheet[] = [];
  const has = (s: ReportSection) => spec.sections.includes(s);

  if (has('summary')) {
    sheets.push({
      name: 'Summary',
      title: `${spec.title} — Executive summary`,
      subtitle: sub,
      columns: [
        { header: 'Metric', width: 28 },
        { header: 'This period', width: 18, format: 'dec' },
        { header: 'Previous period', width: 18, format: 'dec' },
        { header: 'Change %', width: 14, format: 'dec' },
        { header: 'Formatted', width: 18 },
      ],
      rows: [
        ['Health score (0–100)', d.score, null, null, `${d.score}/100`],
        ...SUMMARY_METRICS.map((k) => [METRIC_META[k].label, round(d.totals[k], 2), round(d.prevTotals[k], 2), (() => {
          const p = pctChange(d.totals[k], d.prevTotals[k]);
          return p === null ? null : round(p, 1);
        })(), formatMetric(k, d.totals[k])]),
        ['Daily active members', d.active.dau, null, null, String(d.active.dau)],
        ['Monthly active members', d.active.mau, null, null, String(d.active.mau)],
        ['Storage used (KB)', round(d.storageUsed / 1024, 1), null, null, `${d.storagePct}% of quota`],
      ],
    });
  }
  if (has('risks')) {
    sheets.push({
      name: 'Risks',
      title: 'Risks & bottlenecks',
      subtitle: sub,
      columns: [
        { header: 'Severity', width: 12 },
        { header: 'Area', width: 16 },
        { header: 'Issue', width: 40 },
        { header: 'Detail', width: 70 },
        { header: 'Metric', width: 14 },
        { header: 'Recommended action', width: 60 },
      ],
      rows: d.risks.map((r) => [r.severity.toUpperCase(), r.area, r.title, r.detail, r.metric, r.action]),
    });
  }
  if (has('traffic')) {
    sheets.push({
      name: 'Traffic',
      title: 'Traffic over time',
      subtitle: sub,
      columns: [
        { header: 'Period', width: 16 },
        { header: 'Page views', format: 'int' },
        { header: 'Unique visitors', format: 'int' },
        { header: 'Sessions', format: 'int' },
        { header: 'New visitors', format: 'int' },
        { header: 'Bounce rate %', format: 'dec' },
        { header: 'Avg session (s)', format: 'int' },
      ],
      rows: d.buckets.map((b) => [b.key, b.m.pageViews, b.m.visitors, b.m.sessions, b.m.newUsers, round(b.m.bounceRate), b.m.avgSessionSec]),
    });
    sheets.push({
      name: 'Top pages',
      title: 'Top pages',
      subtitle: sub,
      columns: [
        { header: 'Path', width: 32 },
        { header: 'Page', width: 34 },
        { header: 'Views', format: 'int' },
        { header: 'Visitors', format: 'int' },
        { header: 'Avg time (s)', format: 'int' },
        { header: 'Bounce %', format: 'dec' },
        { header: 'p95 load (ms)', format: 'int' },
        { header: 'Tracked in this browser', format: 'int', width: 22 },
      ],
      rows: d.pages.map((p) => [p.path, p.title, p.views, p.visitors, p.avgTimeSec, round(p.bounceRate), p.p95LoadMs, p.realViews]),
    });
    const src = (label: string, arr: { label: string; value: number }[]) => {
      const tot = arr.reduce((a, x) => a + x.value, 0) || 1;
      return arr.map((x) => [label, x.label, x.value, round((x.value / tot) * 100)]);
    };
    sheets.push({
      name: 'Sources & devices',
      title: 'Traffic sources, devices, browsers & countries',
      subtitle: sub,
      columns: [{ header: 'Dimension', width: 16 }, { header: 'Value', width: 26 }, { header: 'Count', format: 'int' }, { header: 'Share %', format: 'dec' }],
      rows: [...src('Referrer', d.referrers), ...src('Device', d.devices), ...src('Browser', d.browsers), ...src('Country', d.countries)],
    });
  }
  if (has('activity')) {
    sheets.push({
      name: 'User activity',
      title: 'User activity over time',
      subtitle: `${sub} · DAU ${d.active.dau} · WAU ${d.active.wau} · MAU ${d.active.mau} · stickiness ${d.active.stickiness}%`,
      columns: [
        { header: 'Period', width: 16 },
        { header: 'Sign-ins', format: 'int' },
        { header: 'Registrations', format: 'int' },
        { header: 'Journey posts', format: 'int' },
        { header: 'Comments', format: 'int' },
      ],
      rows: d.buckets.map((b) => [b.key, b.m.signIns, b.m.registrations, b.m.posts, b.m.comments]),
    });
    sheets.push({
      name: 'Funnel & retention',
      title: 'Engagement funnel & weekly retention',
      subtitle: sub,
      columns: [{ header: 'Step / cohort', width: 22 }, { header: 'Users', format: 'int' }, ...Array.from({ length: 8 }, (_, i) => ({ header: `Week ${i} %`, format: 'dec' as const }))],
      rows: [
        ...d.funnel.map((f) => [f.label, f.value]),
        [],
        ...d.cohorts.map((c) => [`Cohort ${c.label}`, c.size, ...c.values.map((v) => (v === null ? null : v))]),
      ],
    });
  }
  if (has('storage')) {
    sheets.push({
      name: 'Storage',
      title: 'Storage usage by key',
      subtitle: `${sub} · ${round(d.storageUsed / 1024)} KB of ${STORAGE_QUOTA / 1024} KB (${d.storagePct}%) · growth ${d.runway.slopeKbPerDay} KB/day · runway ${d.runway.days ?? '∞'} days`,
      columns: [{ header: 'Key', width: 34 }, { header: 'Dataset', width: 34 }, { header: 'Records', format: 'int' }, { header: 'Size (KB)', format: 'dec2' }, { header: 'Share %', format: 'dec' }],
      rows: d.storageKeys.map((k) => [k.key, k.label, k.records, round(k.bytes / 1024, 2), round(k.share)]),
    });
  }
  if (has('performance')) {
    sheets.push({
      name: 'Performance',
      title: 'Performance over time',
      subtitle: sub,
      columns: [{ header: 'Period', width: 16 }, { header: 'Avg load (ms)', format: 'int' }, { header: 'p95 load (ms)', format: 'int' }, { header: 'JS errors', format: 'int' }, { header: 'Errors / 1k views', format: 'dec2' }],
      rows: d.buckets.map((b) => [b.key, b.m.avgLoadMs, b.m.p95LoadMs, b.m.errors, b.m.pageViews ? round((b.m.errors / b.m.pageViews) * 1000, 2) : 0]),
    });
    sheets.push({
      name: 'Web vitals & resources',
      title: 'Measured Web Vitals & largest resources (this browser)',
      subtitle: sub,
      columns: [{ header: 'Item', width: 50 }, { header: 'Type / unit', width: 16 }, { header: 'Value', format: 'dec' }, { header: 'Duration (ms)', format: 'int' }, { header: 'Rating', width: 18 }],
      rows: [
        ...d.vitals.map((v) => [v.label, v.unit || 'score', v.value === null ? null : round(v.value, v.unit === '' ? 3 : 0), null, v.value === null ? 'n/a' : v.value <= v.good ? 'Good' : v.value <= v.poor ? 'Needs improvement' : 'Poor']),
        [],
        ...d.resources.largest.map((r) => [r.name, r.type, r.sizeKb, r.durationMs, 'KB transferred']),
      ],
    });
  }
  return buildXlsx(sheets, { title: spec.title, author: spec.preparedBy || 'NeverBeen Admin' });
}

export function seriesValues(buckets: Bucket[], key: keyof Metrics): number[] {
  return buckets.map((b) => Math.round(b.m[key] * 10) / 10);
}
