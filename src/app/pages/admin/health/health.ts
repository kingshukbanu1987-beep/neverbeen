import { Component, DestroyRef, WritableSignal, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import {
  Bucket,
  DeviceFilter,
  Granularity,
  HealthDataService,
  METRIC_META,
  MetricKey,
  RANGE_OPTIONS,
  RangeKey,
  RiskArea,
  RiskSeverity,
  formatMetric,
  pctChange,
  startOfDay,
} from './health-data.service';
import { ChartSeries, HcBars, HcChart, HcDonut, HcFunnel, HcGauge, HcHeatmap, HcSpark } from './health-charts';
import { HealthReportBuilder } from './health-report-builder';
import { downloadCsv, timeAgo } from '../shared/admin-insights.service';
import { STORAGE_QUOTA } from '../shared/admin-data-ops.service';
import { formatBytes } from '../data/format';
import { SelectValueSync } from '../../../shared/select-value-sync';
import { ManageUserButton } from '../shared/manage-user-button';

type HealthTab = 'traffic' | 'activity' | 'storage' | 'performance' | 'risks';
type ChartType = 'line' | 'area' | 'bar';
type SortDir = 1 | -1;

const ACK_KEY = 'neverbeen_health_ack';
const GRAN_LABEL: Record<Granularity, string> = { hour: 'Hourly', day: 'Daily', week: 'Weekly', month: 'Monthly' };

/**
 * Admin > Health — overall website health: traffic, user activity, storage
 * and performance with interactive charts, bottleneck & risk detection and
 * exportable PDF / Excel reports.
 */
@Component({
  selector: 'app-admin-health',
  imports: [SelectValueSync, ManageUserButton, HcChart, HcDonut, HcHeatmap, HcBars, HcGauge, HcSpark, HcFunnel, HealthReportBuilder],
  styleUrls: ['../shared/admin-grid.css', '../website/website.css', './health.css'],
  templateUrl: './health.html',
})
export class AdminHealth {
  protected readonly data = inject(HealthDataService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  protected readonly rangeOptions = RANGE_OPTIONS;
  protected readonly granLabel = GRAN_LABEL;
  protected readonly meta = METRIC_META;
  protected readonly fmt = formatMetric;
  protected readonly formatBytes = formatBytes;
  protected readonly timeAgo = timeAgo;
  protected readonly quotaKb = STORAGE_QUOTA / 1024;
  protected readonly tabs: { key: HealthTab; label: string; icon: string }[] = [
    { key: 'traffic', label: 'Traffic', icon: '📈' },
    { key: 'activity', label: 'User activity', icon: '👥' },
    { key: 'storage', label: 'Storage', icon: '💽' },
    { key: 'performance', label: 'Performance', icon: '⚡' },
    { key: 'risks', label: 'Risks & bottlenecks', icon: '🚨' },
  ];

  // ------------------------------------------------------------------ global controls
  private readonly queryTab = toSignal(this.route.queryParamMap.pipe(map((p) => p.get('tab'))), { initialValue: null });
  private readonly localTab = signal<HealthTab | null>(null);
  protected readonly tab = computed<HealthTab>(() => {
    const t = this.localTab() ?? this.queryTab();
    return this.tabs.some((x) => x.key === t) ? (t as HealthTab) : 'traffic';
  });

  protected readonly range = signal<RangeKey>('30d');
  protected readonly from = signal(this.isoDay(Date.now() - 29 * 86_400_000));
  protected readonly to = signal(this.isoDay(Date.now()));
  protected readonly granChoice = signal<Granularity | 'auto'>('auto');
  protected readonly compare = signal(true);
  protected readonly device = signal<DeviceFilter>('all');
  protected readonly country = signal('all');
  protected readonly autoRefresh = signal(false);
  protected readonly lastRefreshed = signal(Date.now());
  protected readonly reportOpen = signal(false);

  constructor() {
    const t = setInterval(() => {
      if (this.autoRefresh()) this.refresh();
    }, 30_000);
    inject(DestroyRef).onDestroy(() => clearInterval(t));
  }

  protected readonly win = computed(() => this.data.window({ range: this.range(), from: this.from(), to: this.to() }));
  protected readonly prevWin = computed(() => this.data.previousWindow(this.win()));
  protected readonly allowedGran = computed(() => this.data.granularities(this.win()));
  protected readonly granularity = computed<Granularity>(() => {
    const allowed = this.allowedGran();
    const c = this.granChoice();
    if (c !== 'auto' && allowed.includes(c)) return c;
    const days = (this.win().end - this.win().start) / 86_400_000;
    const pref: Granularity = days <= 2 ? 'hour' : days <= 100 ? 'day' : 'week';
    return allowed.includes(pref) ? pref : allowed[0];
  });
  private readonly q = computed(() => ({ range: this.range(), granularity: this.granularity(), device: this.device(), country: this.country() }));

  protected readonly buckets = computed(() => {
    this.lastRefreshed();
    return this.data.daySeries(this.win().start, this.win().end, this.q());
  });
  protected readonly prevBuckets = computed(() => {
    this.lastRefreshed();
    return this.data.daySeries(this.prevWin().start, this.prevWin().end, this.q());
  });
  protected readonly totals = computed(() => this.data.totals(this.buckets()));
  protected readonly prevTotals = computed(() => this.data.totals(this.prevBuckets()));
  protected readonly labels = computed(() => this.buckets().map((b) => b.label));

  private readonly recent = computed(() => {
    this.lastRefreshed();
    return this.data.daySeries(startOfDay(Date.now()) - 29 * 86_400_000, Date.now(), { range: '30d', granularity: 'day', device: this.device(), country: this.country() });
  });
  protected readonly risks = computed(() => this.data.risks(this.totals(), this.prevTotals(), this.recent()));
  protected readonly score = computed(() => this.data.score(this.risks()));
  protected readonly scoreText = computed(() => (this.score() >= 85 ? 'Excellent' : this.score() >= 70 ? 'Healthy' : this.score() >= 50 ? 'Needs attention' : 'At risk'));

  protected readonly periodText = computed(() => {
    const f = (t: number) => new Date(t).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
    return `${f(this.win().start)} – ${f(this.win().end)}`;
  });

  // ------------------------------------------------------------------ helpers
  protected isoDay(ms: number): string {
    const d = new Date(ms);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  protected setTab(t: HealthTab): void {
    this.localTab.set(t);
    this.router.navigate([], { relativeTo: this.route, queryParams: { tab: t === 'traffic' ? null : t }, replaceUrl: true });
  }

  protected setRange(r: RangeKey): void {
    this.range.set(r);
    this.granChoice.set('auto');
  }

  protected refresh(): void {
    this.data.refresh();
    this.lastRefreshed.set(Date.now());
  }

  protected delta(key: MetricKey): { text: string; good: boolean | null } {
    const p = pctChange(this.totals()[key], this.prevTotals()[key]);
    if (p === null) return { text: '—', good: null };
    const good = METRIC_META[key].better === 'up' ? p >= 0 : p <= 0;
    return { text: `${p >= 0 ? '▲' : '▼'} ${Math.abs(p).toFixed(1)}%`, good };
  }

  protected spark(key: MetricKey): number[] {
    return this.buckets().map((b) => b.m[key]);
  }

  private align(prev: Bucket[], n: number, key: MetricKey): number[] {
    const out = prev.map((b) => b.m[key]);
    while (out.length < n) out.push(0);
    return out.slice(-n);
  }

  private movingAvg(values: number[], w: number): number[] {
    return values.map((_, i) => {
      const a = values.slice(Math.max(0, i - w + 1), i + 1);
      return a.reduce((s, v) => s + v, 0) / a.length;
    });
  }

  private buildSeries(keys: MetricKey[], smooth: boolean): ChartSeries[] {
    const n = this.buckets().length;
    const w = n > 60 ? 7 : n > 20 ? 5 : 3;
    const out: ChartSeries[] = [];
    for (const k of keys) {
      let values = this.buckets().map((b) => Math.round(b.m[k] * 10) / 10);
      if (smooth) values = this.movingAvg(values, w);
      out.push({ key: k, label: METRIC_META[k].label, color: METRIC_META[k].color, values });
      if (this.compare()) {
        let prev = this.align(this.prevBuckets(), n, k);
        if (smooth) prev = this.movingAvg(prev, w);
        out.push({ key: `${k}-prev`, label: `${METRIC_META[k].label} (previous)`, color: METRIC_META[k].color, values: prev, dashed: true });
      }
    }
    return out;
  }

  protected readonly metricFormat = (k: MetricKey) => (v: number) => formatMetric(k, v);
  protected readonly countFormat = (v: number) => (Math.abs(v) >= 10000 ? `${(v / 1000).toFixed(0)}k` : Math.abs(v) >= 1000 ? `${(v / 1000).toFixed(1)}k` : `${Math.round(v)}`);
  protected readonly msFormat = (v: number) => (v >= 1000 ? `${(v / 1000).toFixed(1)}s` : `${Math.round(v)}ms`);
  protected readonly kbFormat = (v: number) => (v >= 1024 ? `${(v / 1024).toFixed(2)} MB` : `${Math.round(v)} KB`);

  // ------------------------------------------------------------------ Traffic tab
  protected readonly trafficKpis: MetricKey[] = ['pageViews', 'visitors', 'sessions', 'bounceRate', 'avgSessionSec', 'newUsers'];
  protected readonly trafficChoices: MetricKey[] = ['pageViews', 'visitors', 'sessions', 'newUsers'];
  protected readonly trafficMetrics = signal<Set<MetricKey>>(new Set(['pageViews', 'visitors']));
  protected readonly trafficType = signal<ChartType>('area');
  protected readonly trafficSmooth = signal(false);
  protected readonly trafficSeries = computed(() => this.buildSeries([...this.trafficMetrics()], this.trafficSmooth()));

  protected toggleMetric(set: WritableSignal<Set<MetricKey>>, k: MetricKey): void {
    set.update((s) => {
      const n = new Set(s);
      if (n.has(k)) {
        if (n.size > 1) n.delete(k);
      } else n.add(k);
      return n;
    });
  }

  protected readonly heatmap = computed(() => {
    this.lastRefreshed();
    return this.data.heatmap(this.win().start, this.win().end, { device: this.device(), country: this.country() });
  });
  protected readonly breakdown = signal<'referrers' | 'browsers' | 'devices'>('referrers');
  protected readonly breakdownData = computed(() => this.data.shares(this.breakdown(), this.totals().sessions, this.win().start));
  protected readonly countriesData = computed(() => this.data.shares('countries', this.totals().visitors, this.win().start));

  // pages grid
  protected readonly pageSearch = signal('');
  protected readonly pageSort = signal<{ key: 'views' | 'visitors' | 'avgTimeSec' | 'bounceRate' | 'p95LoadMs' | 'path'; dir: SortDir }>({ key: 'views', dir: -1 });
  protected readonly pagePage = signal(1);
  protected readonly pageSize = signal(8);
  protected readonly pages = computed(() => this.data.pages(this.win().start, this.win().end, this.totals(), { device: this.device(), country: this.country() }));
  protected readonly pagesFiltered = computed(() => {
    const q = this.pageSearch().trim().toLowerCase();
    const { key, dir } = this.pageSort();
    return this.pages()
      .filter((p) => !q || `${p.path} ${p.title}`.toLowerCase().includes(q))
      .slice()
      .sort((a, b) => (key === 'path' ? a.path.localeCompare(b.path) : (a[key] as number) - (b[key] as number)) * dir);
  });
  protected readonly pagesView = computed(() => this.pagesFiltered().slice((this.pagePage() - 1) * this.pageSize(), this.pagePage() * this.pageSize()));
  protected readonly pageCount = computed(() => Math.max(1, Math.ceil(this.pagesFiltered().length / this.pageSize())));

  protected sortPages(key: 'views' | 'visitors' | 'avgTimeSec' | 'bounceRate' | 'p95LoadMs' | 'path'): void {
    this.pageSort.update((s) => ({ key, dir: s.key === key ? ((-s.dir) as SortDir) : key === 'path' ? 1 : -1 }));
  }

  protected sortIcon(cur: { key: string; dir: SortDir }, key: string): string {
    return cur.key !== key ? '↕' : cur.dir === 1 ? '↑' : '↓';
  }

  protected exportPages(): void {
    downloadCsv(
      `neverbeen-top-pages-${this.isoDay(Date.now())}.csv`,
      ['Path', 'Page', 'Views', 'Visitors', 'Avg time (s)', 'Bounce %', 'p95 load (ms)'],
      this.pagesFiltered().map((p) => [p.path, p.title, p.views, p.visitors, Math.round(p.avgTimeSec), p.bounceRate.toFixed(1), Math.round(p.p95LoadMs)]),
    );
  }

  protected exportSeries(keys: MetricKey[], name: string): void {
    downloadCsv(
      `neverbeen-${name}-${this.isoDay(Date.now())}.csv`,
      ['Period', ...keys.map((k) => METRIC_META[k].label)],
      this.buckets().map((b) => [b.key, ...keys.map((k) => Math.round(b.m[k] * 100) / 100)]),
    );
  }

  // ------------------------------------------------------------------ Activity tab
  protected readonly active = computed(() => {
    this.lastRefreshed();
    return this.data.activeUsers();
  });
  protected readonly activityChoices: MetricKey[] = ['signIns', 'registrations', 'posts', 'comments'];
  protected readonly activityMetrics = signal<Set<MetricKey>>(new Set(['signIns', 'registrations', 'posts']));
  protected readonly activityType = signal<ChartType>('bar');
  protected readonly activitySeries = computed(() => this.buildSeries([...this.activityMetrics()], false));
  protected readonly funnel = computed(() => this.data.funnel(this.totals()));
  protected readonly cohorts = computed(() => this.data.cohorts());
  protected readonly memberSearch = signal('');
  protected readonly memberSort = signal<{ key: 'posts' | 'comments' | 'likes' | 'name'; dir: SortDir }>({ key: 'posts', dir: -1 });
  protected readonly memberPage = signal(1);
  protected readonly membersFiltered = computed(() => {
    const q = this.memberSearch().trim().toLowerCase();
    const { key, dir } = this.memberSort();
    return this.data
      .topMembers()
      .filter((m) => !q || `${m.name} ${m.country}`.toLowerCase().includes(q))
      .slice()
      .sort((a, b) => (key === 'name' ? a.name.localeCompare(b.name) : a[key] - b[key]) * dir);
  });
  protected readonly membersView = computed(() => this.membersFiltered().slice((this.memberPage() - 1) * 8, this.memberPage() * 8));
  protected readonly memberPages = computed(() => Math.max(1, Math.ceil(this.membersFiltered().length / 8)));

  protected sortMembers(key: 'posts' | 'comments' | 'likes' | 'name'): void {
    this.memberSort.update((s) => ({ key, dir: s.key === key ? ((-s.dir) as SortDir) : key === 'name' ? 1 : -1 }));
  }

  protected cohortColor(v: number | null): string {
    if (v === null) return 'transparent';
    const t = Math.min(1, v / 100);
    return `rgba(16, 185, 129, ${0.08 + t * 0.82})`;
  }

  // ------------------------------------------------------------------ Storage tab
  protected readonly storageKeys = computed(() => {
    this.lastRefreshed();
    return this.data.storageKeys();
  });
  protected readonly storageDonut = computed(() => {
    const keys = this.storageKeys();
    const top = keys.slice(0, 7).map((k) => ({ label: k.label, value: Math.round((k.bytes / 1024) * 10) / 10 }));
    const rest = keys.slice(7).reduce((a, k) => a + k.bytes, 0);
    return rest ? [...top, { label: 'Other', value: Math.round((rest / 1024) * 10) / 10 }] : top;
  });
  protected readonly storageSeries = computed<ChartSeries[]>(() => {
    const vals = this.buckets().map((b) => Math.round(b.m.storageKb * 10) / 10);
    return [{ key: 'storageKb', label: 'Stored data', color: METRIC_META.storageKb.color, values: vals }];
  });
  protected readonly storageSearch = signal('');
  protected readonly storageSort = signal<{ key: 'bytes' | 'key' | 'records'; dir: SortDir }>({ key: 'bytes', dir: -1 });
  protected readonly storageRows = computed(() => {
    const q = this.storageSearch().trim().toLowerCase();
    const { key, dir } = this.storageSort();
    return this.storageKeys()
      .filter((k) => !q || `${k.key} ${k.label}`.toLowerCase().includes(q))
      .slice()
      .sort((a, b) => (key === 'key' ? a.key.localeCompare(b.key) : ((a[key] ?? -1) as number) - ((b[key] ?? -1) as number)) * dir);
  });
  protected readonly estimatePct = computed(() => {
    const e = this.data.storageEstimate();
    return e && e.quota ? Math.round((e.usage / e.quota) * 10000) / 100 : null;
  });
  protected readonly storageTips = computed(() => {
    const tips: string[] = [];
    const big = this.storageKeys()[0];
    if (big) tips.push(`“${big.label}” is the largest dataset (${formatBytes(big.bytes)}, ${big.share.toFixed(1)}% of stored data).`);
    const run = this.data.storageRunway();
    tips.push(run.days === null ? 'Stored data is not growing — no capacity action needed.' : `At ${run.slopeKbPerDay} KB/day, the 5 MB browser quota is reached in about ${run.days} days.`);
    if (this.data.storagePct() > 50) tips.push('Enable retention auto-purge for audit logs and old notifications in Data Management → Retention.');
    tips.push('Create a backup before bulk clean-ups (Data Management → Backup & restore).');
    return tips;
  });

  protected sortStorage(key: 'bytes' | 'key' | 'records'): void {
    this.storageSort.update((s) => ({ key, dir: s.key === key ? ((-s.dir) as SortDir) : key === 'key' ? 1 : -1 }));
  }

  protected exportStorage(): void {
    downloadCsv(`neverbeen-storage-${this.isoDay(Date.now())}.csv`, ['Key', 'Dataset', 'Records', 'Bytes', 'Share %'], this.storageRows().map((k) => [k.key, k.label, k.records ?? '', k.bytes, k.share.toFixed(2)]));
  }

  // ------------------------------------------------------------------ Performance tab
  protected readonly vitals = computed(() => {
    this.lastRefreshed();
    return this.data.realVitals();
  });
  protected readonly perfType = signal<ChartType>('line');
  protected readonly perfSeries = computed(() => this.buildSeries(['avgLoadMs', 'p95LoadMs'], false));
  protected readonly errorSeries = computed(() => this.buildSeries(['errors'], false));
  protected readonly resourceMode = signal<'size' | 'count'>('size');
  protected readonly resources = computed(() => {
    this.lastRefreshed();
    return this.data.resources();
  });
  protected readonly slowPages = computed(() =>
    this.pages()
      .filter((p) => p.p95LoadMs > 0)
      .slice()
      .sort((a, b) => b.p95LoadMs - a.p95LoadMs)
      .slice(0, 8)
      .map((p) => ({ label: p.title, value: Math.round(p.p95LoadMs), color: p.p95LoadMs > 3500 ? '#ef4444' : p.p95LoadMs > 2500 ? '#f59e0b' : '#10b981' })),
  );

  protected rating(v: { value: number | null; good: number; poor: number }): 'good' | 'ni' | 'poor' | 'na' {
    if (v.value === null) return 'na';
    return v.value <= v.good ? 'good' : v.value <= v.poor ? 'ni' : 'poor';
  }

  protected vitalText(v: { value: number | null; unit: string }): string {
    if (v.value === null) return 'n/a';
    if (v.unit === 'ms') return v.value >= 1000 ? `${(v.value / 1000).toFixed(2)} s` : `${Math.round(v.value)} ms`;
    if (v.unit === 'MB') return `${v.value} MB`;
    return String(v.value);
  }

  // ------------------------------------------------------------------ Risks tab
  protected readonly ack = signal<Set<string>>(this.loadAck());
  protected readonly riskSeverity = signal<RiskSeverity | 'all'>('all');
  protected readonly riskArea = signal<RiskArea | 'all'>('all');
  protected readonly showAck = signal(false);
  protected readonly riskAreas: RiskArea[] = ['Traffic', 'User activity', 'Storage', 'Performance', 'Operations'];
  protected readonly openRisks = computed(() => this.risks().filter((r) => !this.ack().has(r.id)));
  protected readonly risksView = computed(() =>
    this.risks().filter((r) => (this.showAck() || !this.ack().has(r.id)) && (this.riskSeverity() === 'all' || r.severity === this.riskSeverity()) && (this.riskArea() === 'all' || r.area === this.riskArea())),
  );
  protected readonly riskCounts = computed(() => ({
    critical: this.openRisks().filter((r) => r.severity === 'critical').length,
    warning: this.openRisks().filter((r) => r.severity === 'warning').length,
    info: this.openRisks().filter((r) => r.severity === 'info').length,
  }));

  protected toggleAck(id: string): void {
    this.ack.update((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      try {
        localStorage.setItem(ACK_KEY, JSON.stringify([...n]));
      } catch {
        /* ignore */
      }
      return n;
    });
  }

  private loadAck(): Set<string> {
    try {
      return new Set(JSON.parse(localStorage.getItem(ACK_KEY) ?? '[]') as string[]);
    } catch {
      return new Set();
    }
  }

  protected readonly Math = Math;
  protected readonly todayIso = this.isoDay(Date.now());

  protected iso(ms: number): string {
    return new Date(ms).toISOString();
  }
}
