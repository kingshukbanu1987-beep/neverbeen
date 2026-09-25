import { Component, computed, inject, input, output, signal } from '@angular/core';
import { UcBars, UcDonut, UcPyramid, UcSpark, UcTrend, fmtNum, BarItem } from './charts';
import { InsightCtx, location, segmentBars } from './section-kit';
import { AGE_GROUPS, MemberInsight, downloadCsv, timeAgo } from '../../shared/admin-insights.service';
import { ManageUserButton } from '../../shared/manage-user-button';
import {
  Bucket,
  DIMS,
  Gran,
  LAUNCH,
  StatFilter,
  UserStatsService,
  bucketIndex,
  buckets,
  countSeries,
  fmtDate,
  matchesFilter,
  pctChange,
  pyramidOf,
  slicesOf,
  startOfDay,
  startOfMonth,
  startOfWeek,
  startOfYear,
  totals,
} from './user-stats';

export type NewPeriod = 'today' | 'week' | 'month' | 'year' | '5y';

interface PeriodDef {
  key: NewPeriod;
  label: string;
  prevLabel: string;
  icon: string;
  color: string;
}

const PERIODS: PeriodDef[] = [
  { key: 'today', label: 'Today', prevLabel: 'yesterday', icon: '☀️', color: '#f59e0b' },
  { key: 'week', label: 'This week', prevLabel: 'last week', icon: '🗓️', color: '#10b981' },
  { key: 'month', label: 'This month', prevLabel: 'last month', icon: '📅', color: '#0ea5e9' },
  { key: 'year', label: 'This year', prevLabel: 'last year', icon: '🎉', color: '#6366f1' },
  { key: '5y', label: 'Last 5 years', prevLabel: 'previous 5 years', icon: '🏛️', color: '#8b5cf6' },
];

/** Window, previous window and chart granularity for a "new users" period. */
export function periodWindow(p: NewPeriod, now: number, fiveYearGran: Gran = 'year'): { from: number; to: number; prevFrom: number; prevTo: number; gran: Gran; end: number } {
  const d = new Date(now);
  switch (p) {
    case 'today': {
      const from = startOfDay(now);
      return { from, to: now, prevFrom: new Date(d.getFullYear(), d.getMonth(), d.getDate() - 1).getTime(), prevTo: from, gran: 'hour', end: from + 86_400_000 - 1 };
    }
    case 'week': {
      const from = startOfWeek(now);
      const prevFrom = new Date(new Date(from).setDate(new Date(from).getDate() - 7)).getTime();
      return { from, to: now, prevFrom, prevTo: from, gran: 'day', end: new Date(new Date(from).setDate(new Date(from).getDate() + 7)).getTime() - 1 };
    }
    case 'month': {
      const from = startOfMonth(now);
      return { from, to: now, prevFrom: new Date(d.getFullYear(), d.getMonth() - 1, 1).getTime(), prevTo: from, gran: 'day', end: new Date(d.getFullYear(), d.getMonth() + 1, 1).getTime() - 1 };
    }
    case 'year': {
      const from = startOfYear(now);
      return { from, to: now, prevFrom: new Date(d.getFullYear() - 1, 0, 1).getTime(), prevTo: from, gran: 'month', end: new Date(d.getFullYear() + 1, 0, 1).getTime() - 1 };
    }
    case '5y': {
      const from = new Date(d.getFullYear() - 4, 0, 1).getTime();
      return { from, to: now, prevFrom: new Date(d.getFullYear() - 9, 0, 1).getTime(), prevTo: from, gran: fiveYearGran, end: new Date(d.getFullYear() + 1, 0, 1).getTime() - 1 };
    }
  }
}

/** E. New users — today, this week, this month, this year, last 5 years. */
@Component({
  selector: 'app-uc-new-users',
  imports: [UcTrend, UcDonut, UcBars, UcPyramid, UcSpark, ManageUserButton],
  template: `
    <div class="uc-periods" role="tablist" aria-label="New users period">
      @for (t of tiles(); track t.key) {
        <button type="button" role="tab" class="uc-period" [class.on]="period() === t.key" [attr.aria-selected]="period() === t.key" [attr.data-period]="t.key" [style.--kpi]="t.color" (click)="period.set(t.key)">
          <span class="uc-period-top"><span aria-hidden="true">{{ t.icon }}</span> New users {{ t.label.toLowerCase() }}</span>
          <strong>{{ fmt(t.count) }}</strong>
          <span class="uc-period-foot">
            <span class="uc-delta" [class.up]="(t.delta ?? 1) > 0" [class.down]="(t.delta ?? 0) < 0">{{ t.delta === null ? 'new' : (t.delta > 0 ? '▲ ' : t.delta < 0 ? '▼ ' : '→ ') + abs(t.delta) + '%' }}</span>
            <small>{{ fmt(t.prev) }} {{ t.prevLabel }}</small>
          </span>
          <app-uc-spark [values]="t.spark" [color]="t.color" [width]="120" [height]="26" />
        </button>
      }
    </div>

    <section class="uc-card uc-wide">
      <header class="uc-card-head">
        <div>
          <h3>New users {{ current().label.toLowerCase() }} · {{ fmt(inPeriod().length) }}</h3>
          <p>{{ windowLabel() }} · by {{ dimLabel() }}</p>
        </div>
        @if (period() === '5y') {
          <div class="uc-seg small" role="group" aria-label="Group by">
            <button type="button" [class.on]="fiveGran() === 'year'" (click)="fiveGran.set('year')">Year</button>
            <button type="button" [class.on]="fiveGran() === 'month'" (click)="fiveGran.set('month')">Month</button>
          </div>
        }
        <div class="uc-seg small" role="group" aria-label="Chart type">
          <button type="button" [class.on]="chart() === 'bar'" (click)="chart.set('bar')" title="Bars">▮▮</button>
          <button type="button" [class.on]="chart() === 'area'" (click)="chart.set('area')" title="Area">◭</button>
        </div>
      </header>
      <app-uc-trend [labels]="labels()" [short]="shorts()" [series]="trend()" [mode]="chart()" [stacked]="true" [height]="250" [markers]="markers()" unit="new users" ariaLabel="New users" />
      @if (!inPeriod().length) {
        <p class="uc-note">No sign-ups {{ current().label.toLowerCase() }} for this selection yet{{ lastSignup() ? ' — the most recent was ' + lastSignup() : '' }}.</p>
      }
    </section>

    <div class="uc-grid-3">
      <section class="uc-card">
        <header class="uc-card-head"><div><h3>🌍 Geography</h3><p>New users by region · click to filter</p></div></header>
        <app-uc-bars [items]="bars().region" [clickable]="true" (pick)="pick.emit({ key: 'regions', value: $event })" />
      </section>
      <section class="uc-card">
        <header class="uc-card-head"><div><h3>🏳️ Countries</h3><p>vs {{ current().prevLabel }}</p></div></header>
        <app-uc-bars [items]="bars().country" [clickable]="true" (pick)="pick.emit({ key: 'countries', value: $event })" />
      </section>
      <section class="uc-card">
        <header class="uc-card-head"><div><h3>🏙️ Cities</h3><p>vs {{ current().prevLabel }}</p></div></header>
        <app-uc-bars [items]="bars().city" [clickable]="true" (pick)="pick.emit({ key: 'cities', value: $event })" />
      </section>
    </div>

    <div class="uc-grid-3">
      <section class="uc-card">
        <header class="uc-card-head"><div><h3>⚧ Gender</h3><p>New users {{ current().label.toLowerCase() }}</p></div></header>
        <app-uc-donut [slices]="gender()" centerLabel="new users" />
      </section>
      <section class="uc-card">
        <header class="uc-card-head"><div><h3>🎂 Age groups</h3><p>Click to filter</p></div></header>
        <app-uc-bars [items]="ages()" [clickable]="true" (pick)="pick.emit({ key: 'ages', value: $event })" [limit]="6" />
      </section>
      <section class="uc-card">
        <header class="uc-card-head"><div><h3>👫 Gender × age</h3><p>Verified: {{ verifiedPct() }}% of new users</p></div></header>
        <app-uc-pyramid [rows]="pyramid()" />
      </section>
    </div>

    <section class="uc-card">
      <header class="uc-card-head">
        <div><h3>Newest members</h3><p>{{ fmt(inPeriod().length) }} joined {{ current().label.toLowerCase() }} — newest first</p></div>
        <button type="button" class="uc-btn" (click)="exportCsv()" [disabled]="!inPeriod().length">⤓ Export CSV</button>
      </header>
      <div class="uc-newbies">
        @for (m of newest(); track m.id) {
          <article class="uc-newbie">
            @if (m.photo) {
              <img [src]="m.photo" alt="" loading="lazy" />
            } @else {
              <span class="uc-avatar lg">{{ m.fullName[0] }}</span>
            }
            <div class="uc-newbie-body">
              <b>
                {{ m.fullName }}
                @if (m.isVerified) {
                  <span class="uc-tick" title="Verified">✓</span>
                }
              </b>
              <small>{{ m.gender }} · {{ m.age }} · {{ loc(m) }}</small>
              <small class="uc-joined" [title]="date(m.registeredAtUtc)">Joined {{ ago(m.registeredAtUtc) }}</small>
            </div>
            <app-manage-user-btn [userId]="m.id" [name]="m.fullName" size="sm" />
          </article>
        } @empty {
          <p class="uc-empty-inline">No new members {{ current().label.toLowerCase() }} for this selection.</p>
        }
      </div>
      @if (inPeriod().length > newest().length) {
        <button type="button" class="uc-more" (click)="shown.set(shown() + 12)">Show more ({{ inPeriod().length - newest().length }} left)</button>
      }
    </section>
  `,
})
export class UcNewUsers {
  private readonly stats = inject(UserStatsService);
  readonly ctx = input.required<InsightCtx>();
  readonly pick = output<{ key: keyof StatFilter; value: string }>();

  protected readonly period = signal<NewPeriod>('month');
  protected readonly fiveGran = signal<Gran>('year');
  protected readonly chart = signal<'bar' | 'area'>('bar');
  protected readonly shown = signal(12);
  protected readonly fmt = fmtNum;
  protected readonly abs = Math.abs;
  protected readonly loc = location;
  protected readonly ago = timeAgo;
  protected readonly date = (iso: string) => new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });

  private readonly pool = computed(() => this.stats.members().filter((m) => matchesFilter(m, this.ctx().filter)));
  private readonly regAt = (m: MemberInsight) => Date.parse(m.registeredAtUtc);
  protected readonly current = computed(() => PERIODS.find((p) => p.key === this.period())!);
  protected readonly dimLabel = computed(() => DIMS.find((d) => d.key === this.ctx().dim)!.label.toLowerCase());

  private readonly win = computed(() => periodWindow(this.period(), this.ctx().to, this.fiveGran()));
  private readonly bks = computed<Bucket[]>(() => {
    const w = this.win();
    return buckets(w.from, w.gran === 'hour' || w.gran === 'day' ? w.end : w.to, w.gran);
  });

  protected readonly inPeriod = computed(() => {
    const w = this.win();
    return this.pool()
      .filter((m) => this.regAt(m) >= w.from && this.regAt(m) <= w.to)
      .sort((a, b) => this.regAt(b) - this.regAt(a));
  });

  protected readonly tiles = computed(() => {
    const now = this.ctx().to;
    const pool = this.pool();
    return PERIODS.map((p) => {
      const w = periodWindow(p.key, now);
      const count = pool.filter((m) => this.regAt(m) >= w.from && this.regAt(m) <= w.to).length;
      const prev = pool.filter((m) => this.regAt(m) >= w.prevFrom && this.regAt(m) < w.prevTo).length;
      const bks = buckets(w.from, w.to, p.key === '5y' ? 'month' : w.gran);
      const spark = totals(countSeries(pool, bks, (m) => m, this.regAt, 'none', pool), bks.length);
      return { ...p, count, prev, delta: pctChange(count, prev), spark };
    });
  });

  protected readonly windowLabel = computed(() => {
    const w = this.win();
    return `${fmtDate(w.from)} – ${fmtDate(w.to)}`;
  });

  protected readonly labels = computed(() => this.bks().map((b) => b.label));
  protected readonly shorts = computed(() => this.bks().map((b) => b.short));
  protected readonly trend = computed(() => countSeries(this.pool(), this.bks(), (m) => m, this.regAt, this.ctx().dim, this.pool()));
  protected readonly markers = computed(() => {
    const i = bucketIndex(this.bks(), LAUNCH);
    return i >= 0 && this.period() === '5y' ? [{ index: i, label: '🚀 Launch' }] : [];
  });

  /** A context for the ranked bars (current vs previous window). */
  private readonly periodCtx = computed<InsightCtx>(() => {
    const w = this.win();
    return { ...this.ctx(), from: w.from, to: w.to, bks: this.bks(), prev: { from: w.prevFrom, to: w.prevTo }, rangeLabel: this.current().label };
  });

  protected readonly bars = computed(() => ({
    region: segmentBars(this.pool(), (m) => m, this.regAt, 'region', this.periodCtx()),
    country: segmentBars(this.pool(), (m) => m, this.regAt, 'country', this.periodCtx()),
    city: segmentBars(this.pool(), (m) => m, this.regAt, 'city', this.periodCtx()),
  }));

  protected readonly gender = computed(() => slicesOf(this.inPeriod(), 'gender'));
  protected readonly ages = computed<BarItem[]>(() => {
    const items = segmentBars(this.pool(), (m) => m, this.regAt, 'age', this.periodCtx(), 6);
    return AGE_GROUPS.map((g) => items.find((i) => i.label === g) ?? { label: g, value: 0 }).map((i) => ({ ...i, spark: undefined }));
  });
  protected readonly pyramid = computed(() => pyramidOf(this.inPeriod()));
  protected readonly verifiedPct = computed(() => {
    const l = this.inPeriod();
    return l.length ? Math.round((l.filter((m) => m.isVerified).length / l.length) * 100) : 0;
  });

  protected readonly newest = computed(() => this.inPeriod().slice(0, this.shown()));

  protected readonly lastSignup = computed(() => {
    const latest = this.pool().reduce<MemberInsight | null>((a, m) => (!a || this.regAt(m) > this.regAt(a) ? m : a), null);
    return latest ? `${latest.fullName}, ${timeAgo(latest.registeredAtUtc)}` : '';
  });

  protected exportCsv(): void {
    const rows = this.inPeriod().map((m) => [m.fullName, m.email, m.gender, m.age, location(m), m.isVerified ? 'Yes' : 'No', new Date(m.registeredAtUtc).toISOString()]);
    downloadCsv(`new-users-${this.period()}.csv`, ['Name', 'Email', 'Gender', 'Age', 'Location', 'Verified', 'Registered (UTC)'], rows);
  }
}
