import { Component, computed, inject, input, output, signal } from '@angular/core';
import { UcBars, UcDonut, UcPyramid, UcTrend, fmtNum, BarItem } from './charts';
import { UcKpi } from './kpi';
import { InsightCtx, compress, location, segmentBars } from './section-kit';
import { AGE_GROUPS, downloadCsv } from '../../shared/admin-insights.service';
import { ManageUserButton } from '../../shared/manage-user-button';
import {
  DAY,
  DIMS,
  DISABLE_REASONS,
  DisableEvent,
  PALETTE,
  Series,
  Slice,
  StatFilter,
  UserStatsService,
  bucketIndex,
  countSeries,
  fmtDate,
  matchesFilter,
  pctChange,
  pyramidOf,
  slicesOf,
  totals,
} from './user-stats';

/** D. Disabled users. */
@Component({
  selector: 'app-uc-disabled-users',
  imports: [UcTrend, UcDonut, UcBars, UcPyramid, UcKpi, ManageUserButton],
  template: `
    <div class="uc-kpis">
      <app-uc-kpi icon="⛔" label="Disabled right now" [value]="fmt(k().current)" [sub]="k().permanent + ' permanent'" color="#ef4444" />
      <app-uc-kpi icon="🚫" label="Disabled in period" [value]="fmt(k().inRange)" [sub]="ctx().rangeLabel" [delta]="k().delta" [invert]="true" [spark]="k().spark" color="#f97316" />
      <app-uc-kpi icon="♻️" label="Reinstated in period" [value]="fmt(k().reinstated)" [sub]="k().reinstatedPct + '% of disabled accounts'" color="#10b981" />
      <app-uc-kpi icon="⏱️" label="Avg time disabled" [value]="k().avgDays + ' days'" sub="Before reinstatement" color="#6366f1" />
      <app-uc-kpi icon="📉" label="Disable rate" [value]="k().rate + '%'" sub="Of members ever disabled" color="#8b5cf6" />
      <app-uc-kpi icon="🏷️" label="Top reason" [value]="k().topReason.count" [sub]="k().topReason.label" color="#f59e0b" />
    </div>

    <section class="uc-card uc-wide">
      <header class="uc-card-head">
        <div><h3>Accounts disabled over time</h3><p>Disabled per {{ ctx().gran }} by {{ dimLabel() }} · line shows reinstatements</p></div>
      </header>
      <app-uc-trend [labels]="labels()" [short]="shorts()" [series]="trend()" [overlay]="reinstatedLine()" mode="bar" [stacked]="true" [height]="260" unit="accounts" ariaLabel="Disabled accounts over time" />
    </section>

    <div class="uc-grid-3">
      <section class="uc-card">
        <header class="uc-card-head"><div><h3>🏷️ Reasons</h3><p>Why accounts were disabled · {{ ctx().rangeLabel }}</p></div></header>
        <app-uc-donut [slices]="reasons()" centerLabel="disabled" />
      </section>
      <section class="uc-card">
        <header class="uc-card-head"><div><h3>🌍 Geography</h3><p>Disabled accounts by region · click to filter</p></div></header>
        <app-uc-bars [items]="bars().region" [clickable]="true" (pick)="pick.emit({ key: 'regions', value: $event })" />
      </section>
      <section class="uc-card">
        <header class="uc-card-head"><div><h3>🏙️ Cities</h3><p>Most disabled accounts</p></div></header>
        <app-uc-bars [items]="bars().city" [clickable]="true" (pick)="pick.emit({ key: 'cities', value: $event })" />
      </section>
    </div>

    <div class="uc-grid-3">
      <section class="uc-card">
        <header class="uc-card-head"><div><h3>⚧ Gender</h3><p>Disabled in period</p></div></header>
        <app-uc-donut [slices]="gender()" centerLabel="disabled" />
      </section>
      <section class="uc-card">
        <header class="uc-card-head"><div><h3>🎂 Age groups</h3><p>Disabled in period · click to filter</p></div></header>
        <app-uc-bars [items]="ages()" [clickable]="true" (pick)="pick.emit({ key: 'ages', value: $event })" [limit]="6" color="#f97316" />
      </section>
      <section class="uc-card">
        <header class="uc-card-head"><div><h3>🛡️ Actioned by</h3><p>Admins who disabled accounts</p></div></header>
        <app-uc-bars [items]="admins()" color="#6366f1" />
      </section>
    </div>

    <div class="uc-grid-2-1">
      <section class="uc-card">
        <header class="uc-card-head">
          <div><h3>Disabled accounts</h3><p>{{ list().length }} in {{ ctx().rangeLabel.toLowerCase() }} (plus everyone disabled right now)</p></div>
          <div class="uc-seg small" role="group" aria-label="Status">
            <button type="button" [class.on]="status() === 'all'" (click)="status.set('all')">All</button>
            <button type="button" [class.on]="status() === 'current'" (click)="status.set('current')">Disabled now</button>
            <button type="button" [class.on]="status() === 'reinstated'" (click)="status.set('reinstated')">Reinstated</button>
          </div>
          <button type="button" class="uc-btn" (click)="exportCsv()">⤓ CSV</button>
        </header>
        <div class="uc-table-wrap">
          <table class="uc-table">
            <thead><tr><th>Member</th><th>Location</th><th>Disabled on</th><th>Reason</th><th>By</th><th>Status</th><th></th></tr></thead>
            <tbody>
              @for (e of shown(); track e.member.id + '-' + e.disabledAt) {
                <tr class="uc-dis-row" [attr.data-status]="e.reinstatedAt === null ? 'disabled' : 'reinstated'">
                  <td>
                    <span class="uc-member">
                      @if (e.member.photo) {
                        <img [src]="e.member.photo" alt="" loading="lazy" />
                      } @else {
                        <span class="uc-avatar">{{ e.member.fullName[0] }}</span>
                      }
                      <span><b>{{ e.member.fullName }}</b><small>{{ e.member.gender }} · {{ e.member.age }}</small></span>
                    </span>
                  </td>
                  <td>{{ loc(e.member) }}</td>
                  <td>{{ date(e.disabledAt) }}</td>
                  <td>{{ e.reason }}</td>
                  <td>{{ e.by }}</td>
                  <td>
                    @if (e.reinstatedAt === null) {
                      <span class="uc-pill bad">{{ e.permanent ? 'Permanently disabled' : 'Disabled' }}</span>
                    } @else {
                      <span class="uc-pill ok" [title]="'Reinstated ' + date(e.reinstatedAt)">Reinstated · {{ lengthDays(e) }}d</span>
                    }
                  </td>
                  <td><app-manage-user-btn [userId]="e.member.id" [name]="e.member.fullName" size="sm" /></td>
                </tr>
              } @empty {
                <tr><td colspan="7" class="uc-empty-inline">No disabled accounts for this selection</td></tr>
              }
            </tbody>
          </table>
        </div>
        @if (filtered().length > shown().length) {
          <button type="button" class="uc-more" (click)="page.set(page() + 1)">Show more ({{ filtered().length - shown().length }} left)</button>
        }
      </section>
      <section class="uc-card">
        <header class="uc-card-head"><div><h3>👫 Gender × age</h3><p>Disabled in period</p></div></header>
        <app-uc-pyramid [rows]="pyramid()" />
      </section>
    </div>
  `,
})
export class UcDisabledUsers {
  private readonly stats = inject(UserStatsService);
  readonly ctx = input.required<InsightCtx>();
  readonly pick = output<{ key: keyof StatFilter; value: string }>();

  protected readonly status = signal<'all' | 'current' | 'reinstated'>('all');
  protected readonly page = signal(1);
  protected readonly fmt = fmtNum;
  protected readonly loc = location;
  protected readonly date = (ms: number) => fmtDate(ms);

  private readonly events = computed(() => this.stats.disableEvents().filter((e) => matchesFilter(e.member, this.ctx().filter)));
  private readonly inRange = computed(() => {
    const { from, to } = this.ctx();
    return this.events().filter((e) => e.disabledAt >= from && e.disabledAt <= to);
  });
  private readonly at = (e: DisableEvent) => e.disabledAt;

  protected readonly labels = computed(() => this.ctx().bks.map((b) => b.label));
  protected readonly shorts = computed(() => this.ctx().bks.map((b) => b.short));
  protected readonly dimLabel = computed(() => DIMS.find((d) => d.key === this.ctx().dim)!.label.toLowerCase());

  protected readonly trend = computed<Series[]>(() => {
    const ev = this.events();
    const series = countSeries(ev, this.ctx().bks, (e) => e.member, this.at, this.ctx().dim, ev.map((e) => e.member));
    return this.ctx().dim === 'none' ? series.map((s) => ({ ...s, name: 'Disabled', color: '#f97316' })) : series;
  });

  protected readonly reinstatedLine = computed<Series>(() => {
    const bks = this.ctx().bks;
    const values = bks.map(() => 0);
    for (const e of this.events()) {
      if (e.reinstatedAt === null) continue;
      const i = bucketIndex(bks, e.reinstatedAt);
      if (i >= 0) values[i]++;
    }
    return { name: 'Reinstated', color: '#10b981', values };
  });

  protected readonly k = computed(() => {
    const ctx = this.ctx();
    const all = this.events();
    const inRange = this.inRange();
    const prev = ctx.prev ? all.filter((e) => e.disabledAt >= ctx.prev!.from && e.disabledAt < ctx.prev!.to).length : 0;
    const reinstated = all.filter((e) => e.reinstatedAt !== null && e.reinstatedAt >= ctx.from && e.reinstatedAt <= ctx.to).length;
    const done = all.filter((e) => e.reinstatedAt !== null);
    const avgDays = done.length ? done.reduce((a, e) => a + (e.reinstatedAt! - e.disabledAt) / DAY, 0) / done.length : 0;
    const pool = this.stats.members().filter((m) => matchesFilter(m, ctx.filter)).length || 1;
    const reasons = this.reasons();
    const top = reasons.slice().sort((a, b) => b.value - a.value)[0];
    const current = all.filter((e) => e.current);
    return {
      current: current.length,
      permanent: current.filter((e) => e.permanent).length,
      inRange: inRange.length,
      delta: ctx.prev ? pctChange(inRange.length, prev) : undefined,
      spark: compress(totals(this.trend(), ctx.bks.length), 24),
      reinstated,
      reinstatedPct: inRange.length ? Math.round((inRange.filter((e) => e.reinstatedAt !== null).length / inRange.length) * 100) : 0,
      avgDays: avgDays.toFixed(1),
      rate: Math.round((new Set(all.map((e) => e.member.id)).size / pool) * 1000) / 10,
      topReason: { label: top?.label ?? 'None in period', count: top?.value ?? 0 },
    };
  });

  protected readonly reasons = computed<Slice[]>(() => {
    const counts = new Map<string, number>();
    for (const e of this.inRange()) counts.set(e.reason, (counts.get(e.reason) ?? 0) + 1);
    const order = [...DISABLE_REASONS, ...[...counts.keys()].filter((r) => !DISABLE_REASONS.includes(r))];
    return order.filter((r) => counts.get(r)).map((r, i) => ({ label: r, value: counts.get(r)!, color: PALETTE[i % PALETTE.length] }));
  });

  protected readonly bars = computed(() => ({
    region: segmentBars(this.events(), (e) => e.member, this.at, 'region', this.ctx()),
    city: segmentBars(this.events(), (e) => e.member, this.at, 'city', this.ctx()),
  }));

  protected readonly gender = computed(() => slicesOf(this.inRange().map((e) => e.member), 'gender'));
  protected readonly ages = computed<BarItem[]>(() => {
    const items = segmentBars(this.events(), (e) => e.member, this.at, 'age', this.ctx(), 6);
    return AGE_GROUPS.map((g) => items.find((i) => i.label === g) ?? { label: g, value: 0 }).map((i) => ({ ...i, spark: undefined }));
  });
  protected readonly pyramid = computed(() => pyramidOf(this.inRange().map((e) => e.member)));

  protected readonly admins = computed<BarItem[]>(() => {
    const counts = new Map<string, number>();
    for (const e of this.inRange()) counts.set(e.by, (counts.get(e.by) ?? 0) + 1);
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([label, value]) => ({ label, value }));
  });

  protected readonly list = computed(() => {
    const cur = this.events().filter((e) => e.current && !this.inRange().includes(e));
    return [...cur, ...this.inRange()].sort((a, b) => b.disabledAt - a.disabledAt);
  });

  protected readonly filtered = computed(() => {
    const s = this.status();
    return this.list().filter((e) => s === 'all' || (s === 'current' ? e.reinstatedAt === null : e.reinstatedAt !== null));
  });

  protected readonly shown = computed(() => this.filtered().slice(0, this.page() * 12));

  protected lengthDays(e: DisableEvent): number {
    return Math.max(1, Math.round(((e.reinstatedAt ?? Date.now()) - e.disabledAt) / DAY));
  }

  protected exportCsv(): void {
    const rows = this.filtered().map((e) => [
      e.member.fullName,
      e.member.email,
      location(e.member),
      fmtDate(e.disabledAt),
      e.reason,
      e.by,
      e.reinstatedAt === null ? 'Disabled' : 'Reinstated ' + fmtDate(e.reinstatedAt),
    ]);
    downloadCsv('disabled-users.csv', ['Name', 'Email', 'Location', 'Disabled on', 'Reason', 'By', 'Status'], rows);
  }
}
