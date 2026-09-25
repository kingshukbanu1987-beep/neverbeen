import { Component, computed, inject, input, output, signal } from '@angular/core';
import { UcBars, UcCalendar, UcDonut, UcSpark, UcTrend, fmtNum } from './charts';
import { UcKpi } from './kpi';
import { InsightCtx, compress, rateBars } from './section-kit';
import { AGE_GROUPS, downloadCsv } from '../../shared/admin-insights.service';
import {
  ActivityRow,
  DAY,
  DIMS,
  Dim,
  Series,
  Slice,
  StatFilter,
  UserStatsService,
  buckets,
  colorFor,
  dayNo,
  dayStart,
  pctChange,
  segOf,
  segmentKeys,
  startOfDay,
} from './user-stats';

const WD_LABELS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

/** B. Daily Active Users (DAU / WAU / MAU). */
@Component({
  selector: 'app-uc-active-users',
  imports: [UcTrend, UcDonut, UcBars, UcCalendar, UcKpi, UcSpark],
  template: `
    <div class="uc-kpis">
      <app-uc-kpi icon="⚡" label="Active today" [value]="fmt(k().today)" [sub]="'Yesterday ' + fmt(k().yesterday)" [delta]="k().todayDelta" deltaHint="vs yesterday" [spark]="k().spark14" color="#10b981" />
      <app-uc-kpi icon="📈" label="Average DAU" [value]="fmt(k().avg)" [sub]="ctx().rangeLabel" [delta]="k().avgDelta" color="#6366f1" />
      <app-uc-kpi icon="🏔️" label="Peak DAU" [value]="fmt(k().peak)" [sub]="k().peakLabel" color="#f59e0b" />
      <app-uc-kpi icon="🗓️" label="Weekly active (WAU)" [value]="fmt(k().wau)" sub="Last 7 days" [delta]="k().wauDelta" deltaHint="vs previous 7 days" color="#0ea5e9" />
      <app-uc-kpi icon="📅" label="Monthly active (MAU)" [value]="fmt(k().mau)" sub="Last 30 days" [delta]="k().mauDelta" deltaHint="vs previous 30 days" color="#8b5cf6" />
      <app-uc-kpi icon="🧲" label="Stickiness" [value]="k().stickiness + '%'" sub="DAU ÷ MAU (30 days)" color="#ec4899" />
    </div>

    <section class="uc-card uc-wide">
      <header class="uc-card-head">
        <div>
          <h3>{{ metricTitle() }}</h3>
          <p>{{ metric() === 'unique' ? 'Distinct members active in each ' + ctx().gran : 'Average members active per day within each ' + ctx().gran }} · by {{ dimLabel() }}</p>
        </div>
        @if (ctx().gran !== 'day') {
          <div class="uc-seg small" role="group" aria-label="Metric">
            <button type="button" [class.on]="metric() === 'unique'" (click)="metric.set('unique')">Unique ({{ uniqueShort() }})</button>
            <button type="button" [class.on]="metric() === 'avg'" (click)="metric.set('avg')">Avg daily (DAU)</button>
          </div>
        }
        <div class="uc-seg small" role="group" aria-label="Chart type">
          <button type="button" [class.on]="chart() === 'area'" (click)="chart.set('area')" title="Area">◭</button>
          <button type="button" [class.on]="chart() === 'bar'" (click)="chart.set('bar')" title="Bars">▮▮</button>
          <button type="button" [class.on]="chart() === 'line'" (click)="chart.set('line')" title="Lines">〰</button>
        </div>
      </header>
      <app-uc-trend
        [labels]="labels()"
        [short]="shorts()"
        [series]="series()"
        [overlay]="overlay()"
        [mode]="chart()"
        [stacked]="chart() !== 'line'"
        [height]="280"
        unit="users"
        ariaLabel="Active users over time"
      />
    </section>

    <div class="uc-grid-2-1">
      <section class="uc-card">
        <header class="uc-card-head"><div><h3>🗓️ Daily active users · last 12 months</h3><p>Darker squares are busier days</p></div></header>
        <app-uc-calendar [start]="calendar().start" [values]="calendar().values" unit="active users" />
      </section>
      <section class="uc-card">
        <header class="uc-card-head"><div><h3>📊 Weekday pattern</h3><p>Average DAU per weekday · {{ ctx().rangeLabel }}</p></div></header>
        <app-uc-bars [items]="weekday()" [share]="false" color="#10b981" [limit]="7" />
      </section>
    </div>

    <div class="uc-grid-3">
      <section class="uc-card">
        <header class="uc-card-head"><div><h3>🌍 Activity rate by geography</h3><p>Members active in period ÷ members · click to filter</p></div></header>
        <app-uc-bars [items]="rates().region" [share]="false" [clickable]="true" (pick)="pick.emit({ key: 'regions', value: $event })" />
      </section>
      <section class="uc-card">
        <header class="uc-card-head"><div><h3>⚧ Active users by gender</h3><p>Distinct members active in period</p></div></header>
        <app-uc-donut [slices]="gender()" centerLabel="active users" />
      </section>
      <section class="uc-card">
        <header class="uc-card-head"><div><h3>🎂 Activity rate by age</h3><p>Share of each age group active in period</p></div></header>
        <app-uc-bars [items]="rates().age" [share]="false" [clickable]="true" (pick)="pick.emit({ key: 'ages', value: $event })" [limit]="6" />
      </section>
    </div>

    <div class="uc-grid-2">
      <section class="uc-card">
        <header class="uc-card-head"><div><h3>🏳️ Most active countries</h3><p>Distinct active members in period</p></div></header>
        <app-uc-bars [items]="rates().country" [share]="false" [clickable]="true" (pick)="pick.emit({ key: 'countries', value: $event })" />
      </section>
      <section class="uc-card">
        <header class="uc-card-head"><div><h3>🏙️ Most active cities</h3><p>Distinct active members in period</p></div></header>
        <app-uc-bars [items]="rates().city" [share]="false" [clickable]="true" (pick)="pick.emit({ key: 'cities', value: $event })" />
      </section>
    </div>

    <section class="uc-card">
      <header class="uc-card-head">
        <div><h3>Active users by {{ tableDimLabel() }}</h3><p>{{ ctx().rangeLabel }} compared with the previous period</p></div>
        <button type="button" class="uc-btn" (click)="exportCsv()">⤓ Export CSV</button>
      </header>
      <div class="uc-table-wrap">
        <table class="uc-table">
          <thead>
            <tr><th>{{ tableDimLabel() }}</th><th class="num">Active users</th><th class="num">Avg DAU</th><th class="num">Activity rate</th><th class="num">Previous</th><th class="num">Change</th><th>Daily trend</th></tr>
          </thead>
          <tbody>
            @for (r of table(); track r.key) {
              <tr>
                <td><i class="uc-dot-i" [style.background]="r.color"></i>{{ r.key }}</td>
                <td class="num"><b>{{ fmt(r.active) }}</b></td>
                <td class="num">{{ fmt(r.avg) }}</td>
                <td class="num"><span class="uc-meter"><i [style.width.%]="r.rate"></i></span>{{ r.rate }}%</td>
                <td class="num">{{ ctx().prev ? fmt(r.prev) : '—' }}</td>
                <td class="num">
                  @if (ctx().prev) {
                    <span class="uc-delta" [class.up]="(r.delta ?? 1) > 0" [class.down]="(r.delta ?? 0) < 0">{{ r.delta === null ? 'new' : (r.delta > 0 ? '▲ ' : r.delta < 0 ? '▼ ' : '') + abs(r.delta) + '%' }}</span>
                  } @else {
                    —
                  }
                </td>
                <td><app-uc-spark [values]="r.spark" [color]="r.color" /></td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    </section>
  `,
})
export class UcActiveUsers {
  private readonly stats = inject(UserStatsService);
  readonly ctx = input.required<InsightCtx>();
  readonly pick = output<{ key: keyof StatFilter; value: string }>();

  protected readonly metric = signal<'unique' | 'avg'>('unique');
  protected readonly chart = signal<'area' | 'bar' | 'line'>('area');
  protected readonly fmt = fmtNum;
  protected readonly abs = Math.abs;

  private readonly rows = computed(() => this.stats.rows(this.ctx().filter));
  private readonly fromDay = computed(() => dayNo(this.ctx().from));
  private readonly toDay = computed(() => dayNo(this.ctx().to));

  protected readonly labels = computed(() => this.ctx().bks.map((b) => b.label));
  protected readonly shorts = computed(() => this.ctx().bks.map((b) => b.short));
  protected readonly dimLabel = computed(() => DIMS.find((d) => d.key === this.ctx().dim)!.label.toLowerCase());
  protected readonly tableDim = computed<Dim>(() => (this.ctx().dim === 'none' ? 'region' : this.ctx().dim));
  protected readonly tableDimLabel = computed(() => DIMS.find((d) => d.key === this.tableDim())!.label);
  protected readonly uniqueShort = computed(() => ({ day: 'DAU', week: 'WAU', month: 'MAU', year: 'YAU', hour: 'HAU' })[this.ctx().gran]);
  protected readonly metricTitle = computed(() => {
    if (this.ctx().gran === 'day' || this.metric() === 'avg') return 'Daily active users';
    return { week: 'Weekly active users', month: 'Monthly active users', year: 'Yearly active users', day: '', hour: '' }[this.ctx().gran];
  });

  protected readonly series = computed<Series[]>(() => {
    const mode = this.ctx().gran === 'day' ? 'unique' : this.metric();
    return this.stats.activeSeries(this.rows(), this.ctx().bks, this.ctx().dim, mode);
  });

  /** Daily totals from max(range, 1 year) up to today (single pass). */
  private readonly daily = computed(() => {
    const today = this.toDay();
    const start = Math.min(this.fromDay(), today - 364);
    const bks = buckets(dayStart(start), this.ctx().to, 'day');
    const values = this.stats.activeSeries(this.rows(), bks, 'none', 'unique')[0]?.values ?? [];
    return { start, values };
  });

  private dauAt(day: number): number {
    const d = this.daily();
    return d.values[day - d.start] ?? 0;
  }

  protected readonly overlay = computed<Series | null>(() => {
    if (this.ctx().gran !== 'day' || this.ctx().bks.length < 14) return null;
    const first = this.fromDay();
    const values = this.ctx().bks.map((_, i) => {
      let s = 0;
      for (let j = 0; j < 7; j++) s += this.dauAt(first + i - j);
      return Math.round((s / 7) * 10) / 10;
    });
    return { name: '7-day average', color: '#0f172a', values, dashed: true };
  });

  protected readonly k = computed(() => {
    const rows = this.rows();
    const today = this.toDay();
    const from = this.fromDay();
    const rangeVals: number[] = [];
    for (let d = from; d <= today; d++) rangeVals.push(this.dauAt(d));
    const avg = rangeVals.length ? rangeVals.reduce((a, b) => a + b, 0) / rangeVals.length : 0;
    let peakI = 0;
    rangeVals.forEach((v, i) => v > rangeVals[peakI] && (peakI = i));
    const prev = this.ctx().prev;
    let prevAvg = 0;
    if (prev) {
      const pf = dayNo(prev.from);
      const pt = dayNo(prev.to - 1);
      let s = 0;
      let n = 0;
      for (let d = pf; d <= pt; d++) {
        s += d >= this.daily().start ? this.dauAt(d) : this.stats.uniqueActive(rows, d, d);
        n++;
      }
      prevAvg = n ? s / n : 0;
    }
    const wau = this.stats.uniqueActive(rows, today - 6, today);
    const wauPrev = this.stats.uniqueActive(rows, today - 13, today - 7);
    const mau = this.stats.uniqueActive(rows, today - 29, today);
    const mauPrev = this.stats.uniqueActive(rows, today - 59, today - 30);
    let dau30 = 0;
    for (let d = today - 29; d <= today; d++) dau30 += this.dauAt(d);
    const spark14: number[] = [];
    for (let d = today - 13; d <= today; d++) spark14.push(this.dauAt(d));
    return {
      today: this.dauAt(today),
      yesterday: this.dauAt(today - 1),
      todayDelta: pctChange(this.dauAt(today), this.dauAt(today - 1)),
      spark14,
      avg: Math.round(avg * 10) / 10,
      avgDelta: prev ? pctChange(Math.round(avg * 10) / 10, Math.round(prevAvg * 10) / 10) : undefined,
      peak: rangeVals[peakI] ?? 0,
      peakLabel: new Date(dayStart(from + peakI)).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }),
      wau,
      wauDelta: pctChange(wau, wauPrev),
      mau,
      mauDelta: pctChange(mau, mauPrev),
      stickiness: mau ? Math.round((dau30 / 30 / mau) * 1000) / 10 : 0,
    };
  });

  protected readonly calendar = computed(() => {
    const today = this.toDay();
    const values: number[] = [];
    for (let d = today - 364; d <= today; d++) values.push(this.dauAt(d));
    return { start: startOfDay(dayStart(today - 364)), values };
  });

  protected readonly weekday = computed(() => {
    const sums = new Array(7).fill(0);
    const counts = new Array(7).fill(0);
    for (let d = this.fromDay(); d <= this.toDay(); d++) {
      const wd = (new Date(dayStart(d)).getDay() + 6) % 7;
      sums[wd] += this.dauAt(d);
      counts[wd]++;
    }
    const avgs = sums.map((s, i) => (counts[i] ? Math.round((s / counts[i]) * 10) / 10 : 0));
    const max = Math.max(...avgs);
    return WD_LABELS.map((label, i) => ({ label, value: avgs[i], color: avgs[i] === max ? '#10b981' : i >= 5 ? '#34d399' : '#6ee7b7' }));
  });

  /** Per-segment active vs total members, for the selected range. */
  private segmentActivity(dim: Dim, rows: ActivityRow[] = this.rows()): Map<string, { num: number; den: number }> {
    const from = this.fromDay();
    const to = this.toDay();
    const out = new Map<string, { num: number; den: number }>();
    if (dim === 'age') AGE_GROUPS.forEach((g) => out.set(g, { num: 0, den: 0 }));
    for (const r of rows) {
      if (r.start > to) continue;
      const k = segOf(r.member, dim);
      const g = out.get(k) ?? { num: 0, den: 0 };
      g.den++;
      if (this.stats.activeDays(r, from, to) > 0) g.num++;
      out.set(k, g);
    }
    return out;
  }

  protected readonly rates = computed(() => {
    const top = (dim: Dim) =>
      [...this.segmentActivity(dim).entries()]
        .sort((a, b) => b[1].num - a[1].num)
        .slice(0, 8)
        .map(([label, g], i) => ({ label, value: g.num, sub: `${Math.round((g.num / Math.max(1, g.den)) * 100)}% of ${g.den.toLocaleString()}`, color: colorFor(dim, label, i) }));
    return {
      region: rateBars(this.segmentActivity('region'), 'region'),
      age: AGE_GROUPS.map((g) => rateBars(this.segmentActivity('age'), 'age').find((b) => b.label === g) ?? { label: g, value: 0, display: '0%' }),
      country: top('country'),
      city: top('city'),
    };
  });

  protected readonly gender = computed<Slice[]>(() =>
    [...this.segmentActivity('gender').entries()].filter(([, g]) => g.num > 0).map(([label, g], i) => ({ label, value: g.num, color: colorFor('gender', label, i) })),
  );

  protected readonly table = computed(() => {
    const dim = this.tableDim();
    const rows = this.rows();
    const { keys, fold } = segmentKeys(rows.map((r) => r.member), dim, 12);
    const from = this.fromDay();
    const to = this.toDay();
    const days = to - from + 1;
    const prev = this.ctx().prev;
    const dayBks = buckets(dayStart(Math.max(from, to - 59)), this.ctx().to, 'day');
    const daily = this.stats.activeSeries(rows, dayBks, dim, 'unique');
    return keys
      .map((key, i) => {
        const seg = rows.filter((r) => fold(segOf(r.member, dim)) === key);
        let active = 0;
        let activeDays = 0;
        let den = 0;
        let prevActive = 0;
        for (const r of seg) {
          if (r.start <= to) den++;
          const ad = this.stats.activeDays(r, from, to);
          activeDays += ad;
          if (ad) active++;
          if (prev && this.stats.activeDays(r, dayNo(prev.from), dayNo(prev.to - 1))) prevActive++;
        }
        return {
          key,
          color: colorFor(dim, key, i),
          active,
          avg: Math.round((activeDays / days) * 10) / 10,
          rate: den ? Math.round((active / den) * 1000) / 10 : 0,
          prev: prevActive,
          delta: pctChange(active, prevActive),
          spark: compress(daily.find((s) => s.name === key)?.values ?? [], 20),
        };
      })
      .filter((r) => r.active > 0 || r.prev > 0)
      .sort((a, b) => b.active - a.active);
  });

  protected exportCsv(): void {
    const rows = this.table().map((r) => [r.key, r.active, r.avg, r.rate, r.prev, r.delta ?? '']);
    downloadCsv(`active-users-by-${this.tableDim()}.csv`, [this.tableDimLabel(), 'Active users', 'Avg DAU', 'Activity rate %', 'Previous', 'Change %'], rows);
  }

  protected readonly DAY = DAY;
}
