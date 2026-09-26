import { Component, computed, inject, input, output, signal } from '@angular/core';
import { UcBars, UcCalendar, UcDonut, UcPyramid, UcSpark, UcTrend, fmtNum } from './charts';
import { UcKpi } from './kpi';
import { InsightCtx, compress, segmentBars } from './section-kit';
import {
  DAY,
  DIMS,
  Dim,
  LAUNCH,
  Series,
  StatFilter,
  UserStatsService,
  bucketIndex,
  countSeries,
  matchesFilter,
  pctChange,
  pyramidOf,
  segOf,
  segmentKeys,
  slicesOf,
  startOfDay,
  sum,
  totals,
} from './user-stats';
import { AGE_GROUPS, MemberInsight, downloadCsv } from '../../shared/admin-insights.service';

/** A. User Registrations Statistics. */
@Component({
  selector: 'app-uc-registrations',
  imports: [UcTrend, UcDonut, UcBars, UcPyramid, UcCalendar, UcKpi, UcSpark],
  template: `
    <div class="uc-kpis">
      <app-uc-kpi icon="🆕" label="New registrations" [value]="fmt(k().inRange)" [sub]="ctx().rangeLabel" [delta]="k().delta" [spark]="k().spark" color="#6366f1" />
      <app-uc-kpi icon="👥" label="Total members" [value]="fmt(k().total)" [sub]="'+' + k().growth + '% growth in period'" color="#10b981" />
      <app-uc-kpi icon="📆" label="Average per day" [value]="k().perDay" [sub]="k().perWeek + ' per week'" color="#0ea5e9" />
      <app-uc-kpi icon="🏔️" label="Peak {{ granLabel() }}" [value]="fmt(k().peak.value)" [sub]="k().peak.label" color="#f59e0b" />
      <app-uc-kpi icon="✅" label="Verified sign-ups" [value]="k().verifiedPct + '%'" [sub]="fmt(k().verified) + ' of ' + fmt(k().inRange) + ' verified'" color="#8b5cf6" />
      <app-uc-kpi icon="🌍" label="Countries reached" [value]="k().countries" [sub]="k().cities + ' cities'" color="#ec4899" />
    </div>

    <section class="uc-card uc-wide">
      <header class="uc-card-head">
        <div>
          <h3>Registrations over time</h3>
          <p>{{ view() === 'cumulative' ? 'Total registered members' : 'New sign-ups per ' + ctx().gran }} · by {{ dimLabel() }}</p>
        </div>
        <div class="uc-seg small" role="group" aria-label="Chart view">
          <button type="button" [class.on]="view() === 'period'" (click)="view.set('period')">Per {{ ctx().gran }}</button>
          <button type="button" [class.on]="view() === 'cumulative'" (click)="view.set('cumulative')">Cumulative</button>
        </div>
        <div class="uc-seg small" role="group" aria-label="Chart type">
          <button type="button" [class.on]="chart() === 'bar'" (click)="chart.set('bar')" title="Bars">▮▮</button>
          <button type="button" [class.on]="chart() === 'area'" (click)="chart.set('area')" title="Area">◭</button>
          <button type="button" [class.on]="chart() === 'line'" (click)="chart.set('line')" title="Lines">〰</button>
        </div>
      </header>
      <app-uc-trend
        [labels]="labels()"
        [short]="shorts()"
        [series]="trend()"
        [mode]="chart()"
        [stacked]="chart() !== 'line'"
        [height]="270"
        [markers]="markers()"
        unit="members"
        ariaLabel="Registrations over time"
      />
    </section>

    <div class="uc-grid-3">
      <section class="uc-card">
        <header class="uc-card-head"><div><h3>🌍 Geography</h3><p>Sign-ups by world region · click to filter</p></div></header>
        <app-uc-bars [items]="bars().region" [clickable]="true" (pick)="pick.emit({ key: 'regions', value: $event })" />
      </section>
      <section class="uc-card">
        <header class="uc-card-head"><div><h3>🏳️ Top countries</h3><p>Change vs previous period</p></div></header>
        <app-uc-bars [items]="bars().country" [clickable]="true" (pick)="pick.emit({ key: 'countries', value: $event })" />
      </section>
      <section class="uc-card">
        <header class="uc-card-head"><div><h3>🏙️ Top cities</h3><p>Where new members come from</p></div></header>
        <app-uc-bars [items]="bars().city" [clickable]="true" (pick)="pick.emit({ key: 'cities', value: $event })" />
      </section>
    </div>

    <div class="uc-grid-3">
      <section class="uc-card">
        <header class="uc-card-head"><div><h3>⚧ Gender</h3><p>New registrations in period</p></div></header>
        <app-uc-donut [slices]="gender()" centerLabel="sign-ups" />
      </section>
      <section class="uc-card">
        <header class="uc-card-head"><div><h3>🎂 Age groups</h3><p>Age at sign-up</p></div></header>
        <app-uc-bars [items]="ages()" [clickable]="true" (pick)="pick.emit({ key: 'ages', value: $event })" [limit]="6" />
      </section>
      <section class="uc-card">
        <header class="uc-card-head"><div><h3>👫 Gender × age</h3><p>Population pyramid of new members</p></div></header>
        <app-uc-pyramid [rows]="pyramid()" />
      </section>
    </div>

    <section class="uc-card">
      <header class="uc-card-head"><div><h3>🗓️ Daily sign-ups · last 12 months</h3><p>Each square is one day — darker means more registrations</p></div></header>
      <app-uc-calendar [start]="calendar().start" [values]="calendar().values" unit="sign-ups" />
    </section>

    <section class="uc-card">
      <header class="uc-card-head">
        <div><h3>Breakdown by {{ tableDimLabel() }}</h3><p>{{ ctx().rangeLabel }} compared with the previous period</p></div>
        <button type="button" class="uc-btn" (click)="exportCsv()">⤓ Export CSV</button>
      </header>
      <div class="uc-table-wrap">
        <table class="uc-table">
          <thead>
            <tr><th>{{ tableDimLabel() }}</th><th class="num">New</th><th class="num">Share</th><th class="num">Previous</th><th class="num">Change</th><th class="num">Total members</th><th>Trend</th></tr>
          </thead>
          <tbody>
            @for (r of table(); track r.key) {
              <tr>
                <td><i class="uc-dot-i" [style.background]="r.color"></i>{{ r.key }}</td>
                <td class="num"><b>{{ fmt(r.cur) }}</b></td>
                <td class="num">{{ r.share }}%</td>
                <td class="num">{{ ctx().prev ? fmt(r.prev) : '—' }}</td>
                <td class="num">
                  @if (ctx().prev) {
                    <span class="uc-delta" [class.up]="(r.delta ?? 1) > 0" [class.down]="(r.delta ?? 0) < 0">{{ r.delta === null ? 'new' : (r.delta > 0 ? '▲ ' : r.delta < 0 ? '▼ ' : '') + abs(r.delta) + '%' }}</span>
                  } @else {
                    —
                  }
                </td>
                <td class="num">{{ fmt(r.total) }}</td>
                <td><app-uc-spark [values]="r.spark" [color]="r.color" /></td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    </section>
  `,
})
export class UcRegistrations {
  private readonly stats = inject(UserStatsService);
  readonly ctx = input.required<InsightCtx>();
  readonly pick = output<{ key: keyof StatFilter; value: string }>();

  protected readonly view = signal<'period' | 'cumulative'>('period');
  protected readonly chart = signal<'bar' | 'area' | 'line'>('bar');
  protected readonly fmt = fmtNum;
  protected readonly abs = Math.abs;

  private readonly pool = computed(() => this.stats.members().filter((m) => matchesFilter(m, this.ctx().filter)));
  private readonly regAt = (m: MemberInsight) => Date.parse(m.registeredAtUtc);
  private readonly newInRange = computed(() => {
    const { from, to } = this.ctx();
    return this.pool().filter((m) => {
      const t = this.regAt(m);
      return t >= from && t <= to;
    });
  });

  protected readonly labels = computed(() => this.ctx().bks.map((b) => b.label));
  protected readonly shorts = computed(() => this.ctx().bks.map((b) => b.short));
  protected readonly dimLabel = computed(() => DIMS.find((d) => d.key === this.ctx().dim)!.label.toLowerCase());
  protected readonly granLabel = computed(() => this.ctx().gran);
  protected readonly tableDim = computed<Dim>(() => (this.ctx().dim === 'none' ? 'country' : this.ctx().dim));
  protected readonly tableDimLabel = computed(() => DIMS.find((d) => d.key === this.tableDim())!.label);

  private readonly perBucket = computed(() => countSeries(this.pool(), this.ctx().bks, (m) => m, this.regAt, this.ctx().dim, this.pool()));

  protected readonly trend = computed<Series[]>(() => {
    const series = this.perBucket();
    if (this.view() === 'period') return series;
    const { from, dim } = this.ctx();
    const { fold } = segmentKeys(this.pool(), dim);
    return series.map((s) => {
      let acc = this.pool().filter((m) => this.regAt(m) < from && fold(segOf(m, dim)) === s.name).length;
      return { ...s, values: s.values.map((v) => (acc += v)) };
    });
  });

  protected readonly markers = computed(() => {
    const i = bucketIndex(this.ctx().bks, LAUNCH);
    return i >= 0 ? [{ index: i, label: '🚀 Launch' }] : [];
  });

  protected readonly k = computed(() => {
    const ctx = this.ctx();
    const inRange = this.newInRange();
    const pool = this.pool();
    const prevCount = ctx.prev ? pool.filter((m) => this.regAt(m) >= ctx.prev!.from && this.regAt(m) < ctx.prev!.to).length : 0;
    const days = Math.max(1, (ctx.to - ctx.from) / DAY);
    const tot = totals(this.perBucket(), ctx.bks.length);
    let peakI = 0;
    tot.forEach((v, i) => v > tot[peakI] && (peakI = i));
    const before = pool.length - inRange.length;
    const verified = inRange.filter((m) => m.isVerified).length;
    return {
      inRange: inRange.length,
      delta: ctx.prev ? pctChange(inRange.length, prevCount) : undefined,
      spark: compress(tot, 24),
      total: pool.length,
      growth: before ? Math.round((inRange.length / before) * 1000) / 10 : 100,
      perDay: (inRange.length / days).toFixed(1),
      perWeek: ((inRange.length / days) * 7).toFixed(1),
      peak: { value: tot[peakI] ?? 0, label: ctx.bks[peakI]?.label ?? '—' },
      verified,
      verifiedPct: inRange.length ? Math.round((verified / inRange.length) * 100) : 0,
      countries: new Set(inRange.map((m) => m.country)).size,
      cities: new Set(inRange.map((m) => m.city).filter(Boolean)).size,
    };
  });

  protected readonly bars = computed(() => {
    const ctx = this.ctx();
    const pool = this.pool();
    return {
      region: segmentBars(pool, (m) => m, this.regAt, 'region', ctx),
      country: segmentBars(pool, (m) => m, this.regAt, 'country', ctx),
      city: segmentBars(pool, (m) => m, this.regAt, 'city', ctx),
    };
  });

  protected readonly gender = computed(() => slicesOf(this.newInRange(), 'gender'));
  protected readonly ages = computed(() => {
    const items = segmentBars(this.pool(), (m) => m, this.regAt, 'age', this.ctx(), 6);
    return AGE_GROUPS.map((g) => items.find((i) => i.label === g) ?? { label: g, value: 0 }).map((i) => ({ ...i, spark: undefined }));
  });
  protected readonly pyramid = computed(() => pyramidOf(this.newInRange()));

  protected readonly calendar = computed(() => {
    const end = startOfDay(this.ctx().to);
    const start = end - 364 * DAY;
    const values = new Array<number>(365).fill(0);
    for (const m of this.pool()) {
      const t = startOfDay(this.regAt(m));
      const i = Math.round((t - start) / DAY);
      if (i >= 0 && i < 365) values[i]++;
    }
    return { start, values };
  });

  protected readonly table = computed(() => {
    const ctx = this.ctx();
    const dim = this.tableDim();
    const pool = this.pool();
    const { keys, fold } = segmentKeys(pool, dim, 12);
    const series = countSeries(pool, ctx.bks, (m) => m, this.regAt, dim, pool);
    const totalNew = this.newInRange().length || 1;
    return keys
      .map((key, i) => {
        const inSeg = pool.filter((m) => fold(segOf(m, dim)) === key);
        const cur = inSeg.filter((m) => this.regAt(m) >= ctx.from && this.regAt(m) <= ctx.to).length;
        const prev = ctx.prev ? inSeg.filter((m) => this.regAt(m) >= ctx.prev!.from && this.regAt(m) < ctx.prev!.to).length : 0;
        const s = series.find((x) => x.name === key);
        return {
          key,
          color: s?.color ?? '#94a3b8',
          cur,
          prev,
          share: Math.round((cur / totalNew) * 1000) / 10,
          delta: pctChange(cur, prev),
          total: inSeg.length,
          spark: compress(s?.values ?? [], 20),
          i,
        };
      })
      .filter((r) => r.total > 0)
      .sort((a, b) => b.cur - a.cur || b.total - a.total);
  });

  protected exportCsv(): void {
    const rows = this.table().map((r) => [r.key, r.cur, r.share, r.prev, r.delta ?? '', r.total]);
    downloadCsv(`registrations-by-${this.tableDim()}.csv`, [this.tableDimLabel(), 'New', 'Share %', 'Previous', 'Change %', 'Total members'], rows);
  }

  protected sum = sum;
}
