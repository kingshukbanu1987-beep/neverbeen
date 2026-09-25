import { Component, computed, inject, input, output, signal } from '@angular/core';
import { UcBars, UcDonut, UcSpark, UcTrend, fmtNum, BarItem } from './charts';
import { UcKpi } from './kpi';
import { InsightCtx, location } from './section-kit';
import { AGE_GROUPS, downloadCsv, timeAgo } from '../../shared/admin-insights.service';
import { ManageUserButton } from '../../shared/manage-user-button';
import { ActivityRow, DIMS, Dim, Series, Slice, StatFilter, UserStatsService, colorFor, dayNo, dayStart, segOf } from './user-stats';

interface Scored {
  row: ActivityRow;
  active: number;
  eligible: number;
  rate: number;
  daysSince: number;
  streak: number;
  spark: number[];
  tier: Tier;
}

type Tier = 'power' | 'regular' | 'casual' | 'dormant';

const TIERS: { key: Tier; label: string; hint: string; color: string }[] = [
  { key: 'power', label: 'Power users', hint: 'Active ≥ 60% of days', color: '#10b981' },
  { key: 'regular', label: 'Regular', hint: 'Active 25–60% of days', color: '#6366f1' },
  { key: 'casual', label: 'Casual', hint: 'Active < 25% of days', color: '#f59e0b' },
  { key: 'dormant', label: 'Inactive', hint: 'No activity in the period', color: '#ef4444' },
];

/** C. Most Active / Inactive users. */
@Component({
  selector: 'app-uc-engagement',
  imports: [UcTrend, UcDonut, UcBars, UcKpi, UcSpark, ManageUserButton],
  template: `
    <div class="uc-kpis">
      @for (t of tierCards(); track t.key) {
        <app-uc-kpi [icon]="t.icon" [label]="t.label" [value]="fmt(t.value)" [sub]="t.pct + '% · ' + t.hint" [color]="t.color" />
      }
      <app-uc-kpi icon="📆" label="Avg active days" [value]="avgDays()" [sub]="'per member · ' + ctx().rangeLabel" color="#0ea5e9" />
      <app-uc-kpi icon="🔥" label="Longest streak" [value]="best().streak + ' days'" [sub]="best().name" color="#ec4899" />
    </div>

    <div class="uc-grid-2-1">
      <section class="uc-card">
        <header class="uc-card-head">
          <div><h3>Active vs inactive members over time</h3><p>Members registered by then, split by whether they were active in each {{ ctx().gran }}</p></div>
        </header>
        <app-uc-trend [labels]="labels()" [short]="shorts()" [series]="activeVsInactive()" mode="area" [stacked]="true" [height]="260" unit="members" ariaLabel="Active vs inactive members" />
      </section>
      <section class="uc-card">
        <header class="uc-card-head"><div><h3>🎯 Engagement tiers</h3><p>{{ ctx().rangeLabel }}</p></div></header>
        <app-uc-donut [slices]="tierSlices()" centerLabel="members" [size]="160" />
      </section>
    </div>

    <section class="uc-card uc-board">
      <header class="uc-card-head">
        <div class="uc-seg" role="tablist" aria-label="Leaderboard">
          <button type="button" role="tab" [class.on]="board() === 'active'" [attr.aria-selected]="board() === 'active'" (click)="board.set('active')">🔥 Most active</button>
          <button type="button" role="tab" [class.on]="board() === 'inactive'" [attr.aria-selected]="board() === 'inactive'" (click)="board.set('inactive')">💤 Most inactive</button>
        </div>
        <p class="uc-board-hint">{{ board() === 'active' ? 'Ranked by active days in the period, then streak' : 'Fewest active days in the period, then longest time since last seen' }}</p>
        <label class="uc-check"><input type="checkbox" [checked]="includeDisabled()" (change)="includeDisabled.set(!includeDisabled())" /> Include disabled</label>
        <div class="uc-seg small" role="group" aria-label="Rows">
          @for (n of [10, 25, 50]; track n) {
            <button type="button" [class.on]="limit() === n" (click)="limit.set(n)">{{ n }}</button>
          }
        </div>
        <button type="button" class="uc-btn" (click)="exportCsv()">⤓ CSV</button>
      </header>
      <div class="uc-table-wrap">
        <table class="uc-table uc-lead">
          <thead>
            <tr>
              <th class="num">#</th><th>Member</th><th>Location</th><th>Gender · Age</th>
              <th class="num">Active days</th><th>Activity rate</th><th class="num">Best streak</th><th>Last seen</th><th>Recent activity</th><th class="num">Posts · Comments</th><th></th>
            </tr>
          </thead>
          <tbody>
            @for (s of leaderboard(); track s.row.member.id; let i = $index) {
              <tr [attr.data-board]="board()">
                <td class="num"><span class="uc-rank" [class.gold]="i === 0" [class.silver]="i === 1" [class.bronze]="i === 2">{{ i + 1 }}</span></td>
                <td>
                  <span class="uc-member">
                    @if (s.row.member.photo) {
                      <img [src]="s.row.member.photo" alt="" loading="lazy" />
                    } @else {
                      <span class="uc-avatar">{{ s.row.member.fullName[0] }}</span>
                    }
                    <span><b>{{ s.row.member.fullName }}</b><small>{{ s.row.member.email }}</small></span>
                  </span>
                </td>
                <td>{{ loc(s.row.member) }}</td>
                <td>{{ s.row.member.gender }} · {{ s.row.member.age }}</td>
                <td class="num"><b>{{ s.active }}</b><small class="uc-of"> / {{ s.eligible }}</small></td>
                <td><span class="uc-meter" [class.bad]="board() === 'inactive'"><i [style.width.%]="s.rate"></i></span>{{ s.rate }}%</td>
                <td class="num">{{ s.streak }}d</td>
                <td>
                  @if (s.daysSince <= 0) {
                    <span class="uc-pill ok">Today</span>
                  } @else {
                    <span class="uc-pill" [class.warn]="s.daysSince >= 7" [class.bad]="s.daysSince >= 14">{{ s.daysSince }}d ago</span>
                  }
                </td>
                <td><app-uc-spark [values]="s.spark" [color]="board() === 'active' ? '#10b981' : '#ef4444'" [width]="96" /></td>
                <td class="num">{{ s.row.member.postCount }} · {{ s.row.member.commentCount }}</td>
                <td><app-manage-user-btn [userId]="s.row.member.id" [name]="s.row.member.fullName" size="sm" /></td>
              </tr>
            } @empty {
              <tr><td colspan="11" class="uc-empty-inline">No members match these filters</td></tr>
            }
          </tbody>
        </table>
      </div>
    </section>

    <div class="uc-grid-3">
      <section class="uc-card">
        <header class="uc-card-head"><div><h3>📊 Activity distribution</h3><p>Members by number of active days</p></div></header>
        <app-uc-trend [labels]="histogram().labels" [short]="histogram().labels" [series]="histogram().series" mode="bar" [legend]="false" [height]="220" unit="members" ariaLabel="Activity distribution" />
      </section>
      <section class="uc-card">
        <header class="uc-card-head"><div><h3>Avg active days by {{ segLabel() }}</h3><p>Higher is more engaged · click to filter</p></div></header>
        <app-uc-bars [items]="segAvg()" [share]="false" [clickable]="segFilterKey() !== null" (pick)="pickSeg($event)" />
      </section>
      <section class="uc-card">
        <header class="uc-card-head"><div><h3>Inactive share by {{ segLabel() }}</h3><p>Members with no activity in the period</p></div></header>
        <app-uc-bars [items]="segDormant()" [share]="false" color="#ef4444" [clickable]="segFilterKey() !== null" (pick)="pickSeg($event)" />
      </section>
    </div>
  `,
})
export class UcEngagement {
  private readonly stats = inject(UserStatsService);
  readonly ctx = input.required<InsightCtx>();
  readonly pick = output<{ key: keyof StatFilter; value: string }>();

  protected readonly board = signal<'active' | 'inactive'>('active');
  protected readonly limit = signal(10);
  protected readonly includeDisabled = signal(false);
  protected readonly fmt = fmtNum;
  protected readonly loc = location;
  protected readonly timeAgo = timeAgo;

  protected readonly labels = computed(() => this.ctx().bks.map((b) => b.label));
  protected readonly shorts = computed(() => this.ctx().bks.map((b) => b.short));
  protected readonly segDim = computed<Dim>(() => (this.ctx().dim === 'none' ? 'age' : this.ctx().dim));
  protected readonly segLabel = computed(() => DIMS.find((d) => d.key === this.segDim())!.label.toLowerCase());
  protected readonly segFilterKey = computed<keyof StatFilter | null>(() => {
    const map: Record<Dim, keyof StatFilter | null> = { region: 'regions', country: 'countries', city: 'cities', gender: 'genders', age: 'ages', none: null };
    return map[this.segDim()];
  });

  private readonly rows = computed(() => {
    const rows = this.stats.rows(this.ctx().filter);
    return this.includeDisabled() ? rows : rows.filter((r) => r.member.accountState !== 'disabled');
  });

  private readonly scored = computed<Scored[]>(() => {
    const from = dayNo(this.ctx().from);
    const to = dayNo(this.ctx().to);
    const span = to - from + 1;
    const per = Math.max(1, Math.round(span / 14));
    return this.rows()
      .filter((r) => r.start <= to)
      .map((row) => {
        const eligible = to - Math.max(from, row.start) + 1;
        const active = this.stats.activeDays(row, from, to);
        const rate = Math.round((active / Math.max(1, eligible)) * 1000) / 10;
        const tier: Tier = active === 0 ? 'dormant' : rate >= 60 ? 'power' : rate >= 25 ? 'regular' : 'casual';
        return {
          row,
          active,
          eligible,
          rate,
          daysSince: row.lastDay < 0 ? 9999 : to - row.lastDay,
          streak: this.stats.streak(row, to),
          spark: this.stats.recent(row, to, 14, per),
          tier,
        };
      });
  });

  protected readonly tierCards = computed(() => {
    const s = this.scored();
    const n = s.length || 1;
    const icons: Record<Tier, string> = { power: '🚀', regular: '🙂', casual: '🌙', dormant: '💤' };
    return TIERS.map((t) => {
      const value = s.filter((x) => x.tier === t.key).length;
      return { ...t, icon: icons[t.key], value, pct: Math.round((value / n) * 100) };
    });
  });

  protected readonly tierSlices = computed<Slice[]>(() => this.tierCards().map((t) => ({ label: t.label, value: t.value, color: t.color })));

  protected readonly avgDays = computed(() => {
    const s = this.scored();
    return s.length ? (s.reduce((a, x) => a + x.active, 0) / s.length).toFixed(1) : '0';
  });

  protected readonly best = computed(() => {
    const s = this.scored();
    if (!s.length) return { streak: 0, name: '—' };
    const top = s.reduce((a, b) => (b.streak > a.streak ? b : a));
    return { streak: top.streak, name: top.row.member.fullName };
  });

  protected readonly leaderboard = computed(() => {
    const s = this.scored().slice();
    if (this.board() === 'active') s.sort((a, b) => b.active - a.active || b.streak - a.streak || b.rate - a.rate);
    else s.sort((a, b) => a.rate - b.rate || b.daysSince - a.daysSince || a.active - b.active);
    return s.slice(0, this.limit());
  });

  protected readonly activeVsInactive = computed<Series[]>(() => {
    const bks = this.ctx().bks;
    const rows = this.rows();
    const active = this.stats.activeSeries(rows, bks, 'none', 'unique')[0]?.values ?? bks.map(() => 0);
    const registered = bks.map((b) => {
      const endDay = dayNo(b.end - 1);
      return rows.filter((r) => r.start <= endDay).length;
    });
    return [
      { name: 'Active', color: '#10b981', values: active },
      { name: 'Inactive', color: '#f87171', values: registered.map((r, i) => Math.max(0, r - active[i])) },
    ];
  });

  protected readonly histogram = computed(() => {
    const s = this.scored();
    const span = dayNo(this.ctx().to) - dayNo(this.ctx().from) + 1;
    const edges = span <= 7 ? [0, 1, 2, 3, 4, 5, 6, 7] : span <= 31 ? [0, 1, 3, 6, 11, 16, 21, 31] : [0, 1, 6, 16, 31, 61, 121, 241, 481];
    const bins: { label: string; lo: number; hi: number }[] = [];
    for (let i = 0; i < edges.length; i++) {
      const lo = edges[i];
      const hi = i + 1 < edges.length ? edges[i + 1] - 1 : Infinity;
      if (lo > span) break;
      const label = lo === 0 && hi === 0 ? '0' : hi === Infinity || hi >= span ? `${lo}+` : lo === hi ? `${lo}` : `${lo}–${hi}`;
      bins.push({ label, lo, hi: hi >= span ? Infinity : hi });
    }
    const values = bins.map((b) => s.filter((x) => x.active >= b.lo && x.active <= b.hi).length);
    return { labels: bins.map((b) => `${b.label} days`), series: [{ name: 'Members', color: '#6366f1', values }] };
  });

  private readonly bySeg = computed(() => {
    const dim = this.segDim();
    const map = new Map<string, { sum: number; n: number; dormant: number }>();
    if (dim === 'age') AGE_GROUPS.forEach((g) => map.set(g, { sum: 0, n: 0, dormant: 0 }));
    for (const x of this.scored()) {
      const k = segOf(x.row.member, dim);
      const g = map.get(k) ?? { sum: 0, n: 0, dormant: 0 };
      g.sum += x.active;
      g.n++;
      if (x.tier === 'dormant') g.dormant++;
      map.set(k, g);
    }
    return [...map.entries()].filter(([, g]) => g.n > 0);
  });

  protected readonly segAvg = computed<BarItem[]>(() => {
    const dim = this.segDim();
    return this.bySeg()
      .map(([label, g], i) => ({ label, value: Math.round((g.sum / g.n) * 10) / 10, sub: `${g.n.toLocaleString()} members`, color: colorFor(dim, label, i) }))
      .sort((a, b) => (dim === 'age' ? AGE_GROUPS.indexOf(a.label) - AGE_GROUPS.indexOf(b.label) : b.value - a.value));
  });

  protected readonly segDormant = computed<BarItem[]>(() =>
    this.bySeg()
      .map(([label, g]) => {
        const pct = Math.round((g.dormant / g.n) * 1000) / 10;
        return { label, value: pct, display: `${pct}%`, sub: `${g.dormant} of ${g.n}` };
      })
      .sort((a, b) => b.value - a.value),
  );

  protected pickSeg(value: string): void {
    const key = this.segFilterKey();
    if (key) this.pick.emit({ key, value });
  }

  protected exportCsv(): void {
    const rows = this.leaderboard().map((s, i) => [
      i + 1,
      s.row.member.fullName,
      s.row.member.email,
      location(s.row.member),
      s.row.member.gender,
      s.row.member.age,
      s.active,
      s.eligible,
      s.rate,
      s.streak,
      s.daysSince >= 9999 ? '' : s.daysSince,
    ]);
    downloadCsv(`most-${this.board()}-users.csv`, ['Rank', 'Name', 'Email', 'Location', 'Gender', 'Age', 'Active days', 'Eligible days', 'Activity rate %', 'Best streak', 'Days since last active'], rows);
  }

  protected readonly dayStart = dayStart;
}
