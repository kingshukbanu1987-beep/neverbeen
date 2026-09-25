import { Component, DestroyRef, afterNextRender, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DOCUMENT } from '@angular/common';
import { HealthDataService, METRIC_META, MetricKey, formatMetric } from './health-data.service';
import { ChartSeries, HcBars, HcChart, HcDonut, HcFunnel, HcGauge } from './health-charts';
import { REPORT_SECTIONS, ReportSection, ReportSpec, buildReportData, describeWindow, kpiRows, loadSpec, seriesValues } from './health-report.model';
import { formatBytes } from '../data/format';
import { STORAGE_QUOTA } from '../shared/admin-data-ops.service';

const PRINTED_KEY = 'neverbeen_health_report_printed';

/**
 * Print-ready Website Health report. Opened in a new tab by the report
 * builder; renders A4 pages with a branded header, running footer with page
 * numbers and a cover sheet, then opens the browser print dialog so the admin
 * can "Save as PDF".
 */
@Component({
  selector: 'app-admin-health-report',
  imports: [RouterLink, HcChart, HcDonut, HcBars, HcGauge, HcFunnel],
  templateUrl: './health-report.html',
  styleUrl: './health-report.css',
})
export class AdminHealthReport {
  private readonly data = inject(HealthDataService);
  private readonly doc = inject(DOCUMENT);

  protected readonly spec = signal<ReportSpec | null>(loadSpec());
  protected readonly ready = signal(false);
  protected readonly generatedAt = new Date();
  protected readonly fmt = formatMetric;
  protected readonly meta = METRIC_META;
  protected readonly formatBytes = formatBytes;
  protected readonly quotaKb = STORAGE_QUOTA / 1024;
  protected readonly trafficKpis: MetricKey[] = ['pageViews', 'visitors', 'sessions', 'bounceRate', 'avgSessionSec', 'newUsers'];

  protected readonly d = computed(() => {
    const s = this.spec();
    this.data.tick();
    return s ? buildReportData(this.data, s) : null;
  });

  protected readonly period = computed(() => (this.d() ? describeWindow(this.d()!.win) : ''));
  protected readonly prevPeriod = computed(() => (this.d() ? describeWindow(this.d()!.prevWin) : ''));
  protected readonly kpis = computed(() => (this.d() ? kpiRows(this.d()!) : []));
  protected readonly labels = computed(() => this.d()?.buckets.map((b) => b.label) ?? []);
  protected readonly sectionMeta = computed(() => {
    const s = this.spec();
    return s ? REPORT_SECTIONS.filter((x) => s.sections.includes(x.key)) : [];
  });
  protected readonly scoreText = computed(() => {
    const v = this.d()?.score ?? 0;
    return v >= 85 ? 'Excellent' : v >= 70 ? 'Healthy' : v >= 50 ? 'Needs attention' : 'At risk';
  });
  protected readonly filterText = computed(() => {
    const s = this.spec();
    if (!s) return '';
    const dev = s.device === 'all' ? 'All devices' : s.device[0].toUpperCase() + s.device.slice(1);
    const c = s.country === 'all' ? 'All countries' : s.country;
    const g = { hour: 'Hourly', day: 'Daily', week: 'Weekly', month: 'Monthly' }[this.d()?.q.granularity ?? s.granularity];
    return `${dev} · ${c} · ${g}`;
  });
  protected readonly riskCounts = computed(() => {
    const r = this.d()?.risks ?? [];
    return { critical: r.filter((x) => x.severity === 'critical').length, warning: r.filter((x) => x.severity === 'warning').length, info: r.filter((x) => x.severity === 'info').length };
  });

  constructor() {
    const s = this.spec();
    const prevTitle = this.doc.title;
    const style = this.doc.createElement('style');
    style.setAttribute('data-health-report', '');
    const landscape = s?.orientation === 'landscape';
    style.textContent = `
      @page {
        size: A4 ${landscape ? 'landscape' : 'portrait'};
        margin: 14mm 13mm 18mm;
        @bottom-right { content: "Page " counter(page) " of " counter(pages); font: 600 8pt system-ui, sans-serif; color: #64748b; }
      }
      @page :first { @bottom-right { content: none; } }
      @media print { html, body { background: #fff !important; } }
    `;
    this.doc.head.appendChild(style);
    if (s) {
      const d = this.generatedAt;
      const stamp = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      // Chrome uses the document title as the default "Save as PDF" file name.
      this.doc.title = `NeverBeen Health Report ${stamp} ${s.id}`;
    }
    inject(DestroyRef).onDestroy(() => {
      style.remove();
      this.doc.title = prevTitle;
    });

    // Pick up the async Storage API estimate, then print once charts have measured.
    this.data.refresh();
    afterNextRender(() => {
      setTimeout(() => {
        this.ready.set(true);
        if (!s) return;
        let printed: string | null = null;
        try {
          printed = sessionStorage.getItem(PRINTED_KEY);
          sessionStorage.setItem(PRINTED_KEY, s.id);
        } catch {
          /* ignore */
        }
        const auto = !/[?&]noprint\b/.test(this.doc.location?.search ?? '');
        if (auto && printed !== s.id && typeof window.print === 'function') setTimeout(() => this.print(), 350);
      }, 900);
    });
  }

  protected has(k: ReportSection): boolean {
    return !!this.spec()?.sections.includes(k);
  }

  protected sectionNo(k: ReportSection): number {
    return this.sectionMeta().findIndex((s) => s.key === k) + 1;
  }

  protected print(): void {
    try {
      window.print();
    } catch {
      /* jsdom / unsupported */
    }
  }

  protected close(): void {
    window.close();
  }

  protected series(keys: MetricKey[]): ChartSeries[] {
    const d = this.d();
    if (!d) return [];
    const n = d.buckets.length;
    const out: ChartSeries[] = [];
    for (const k of keys) {
      out.push({ key: k, label: METRIC_META[k].label, color: METRIC_META[k].color, values: seriesValues(d.buckets, k) });
      if (this.spec()?.compare) {
        const prev = seriesValues(d.prevBuckets, k);
        while (prev.length < n) prev.push(0);
        out.push({ key: `${k}-prev`, label: `${METRIC_META[k].label} (prev.)`, color: METRIC_META[k].color, values: prev.slice(-n), dashed: true });
      }
    }
    return out;
  }

  protected readonly trafficSeries = computed(() => this.series(['pageViews', 'visitors']));
  protected readonly activitySeries = computed(() => this.series(['signIns', 'registrations', 'posts', 'comments']));
  protected readonly perfSeries = computed(() => this.series(['avgLoadMs', 'p95LoadMs']));
  protected readonly errorSeries = computed(() => this.series(['errors']));
  protected readonly storageSeries = computed<ChartSeries[]>(() => {
    const d = this.d();
    return d ? [{ key: 'storageKb', label: 'Stored data', color: METRIC_META.storageKb.color, values: seriesValues(d.buckets, 'storageKb') }] : [];
  });
  protected readonly storageDonut = computed(() => {
    const keys = this.d()?.storageKeys ?? [];
    const top = keys.slice(0, 6).map((k) => ({ label: k.label, value: Math.round((k.bytes / 1024) * 10) / 10 }));
    const rest = keys.slice(6).reduce((a, k) => a + k.bytes, 0);
    return rest ? [...top, { label: 'Other', value: Math.round((rest / 1024) * 10) / 10 }] : top;
  });
  protected readonly slowPages = computed(() =>
    (this.d()?.pages ?? [])
      .filter((p) => p.p95LoadMs > 0)
      .slice()
      .sort((a, b) => b.p95LoadMs - a.p95LoadMs)
      .slice(0, 8)
      .map((p) => ({ label: p.title, value: Math.round(p.p95LoadMs), color: p.p95LoadMs > 3500 ? '#ef4444' : p.p95LoadMs > 2500 ? '#f59e0b' : '#10b981' })),
  );
  protected readonly storageTips = computed(() => {
    const d = this.d();
    if (!d) return [];
    const tips: string[] = [];
    const big = d.storageKeys[0];
    if (big) tips.push(`“${big.label}” is the largest dataset (${formatBytes(big.bytes)}, ${big.share.toFixed(1)}% of stored data).`);
    tips.push(d.runway.days === null ? 'Stored data is not growing — no capacity action required.' : `At ${d.runway.slopeKbPerDay} KB/day the 5 MB quota is reached in about ${d.runway.days} days.`);
    if (d.storagePct > 50) tips.push('Enable retention auto-purge for audit logs and notifications (Data Management → Retention).');
    tips.push('Take a backup before bulk clean-ups (Data Management → Backup & restore).');
    return tips;
  });

  protected readonly countFormat = (v: number) => (Math.abs(v) >= 10000 ? `${(v / 1000).toFixed(0)}k` : Math.abs(v) >= 1000 ? `${(v / 1000).toFixed(1)}k` : `${Math.round(v)}`);
  protected readonly msFormat = (v: number) => (v >= 1000 ? `${(v / 1000).toFixed(1)}s` : `${Math.round(v)}ms`);
  protected readonly kbFormat = (v: number) => (v >= 1024 ? `${(v / 1024).toFixed(2)} MB` : `${Math.round(v)} KB`);

  protected rating(v: { value: number | null; good: number; poor: number }): string {
    if (v.value === null) return 'Not available';
    return v.value <= v.good ? 'Good' : v.value <= v.poor ? 'Needs improvement' : 'Poor';
  }

  protected vitalText(v: { value: number | null; unit: string }): string {
    if (v.value === null) return 'n/a';
    if (v.unit === 'ms') return v.value >= 1000 ? `${(v.value / 1000).toFixed(2)} s` : `${Math.round(v.value)} ms`;
    if (v.unit === 'MB') return `${v.value} MB`;
    return String(v.value);
  }

  protected dateTime(d: Date | string): string {
    return new Date(d).toLocaleString(undefined, { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  }
}
