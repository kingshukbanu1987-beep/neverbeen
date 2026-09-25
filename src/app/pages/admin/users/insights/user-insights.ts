import { Component, ViewEncapsulation, computed, inject, input, signal } from '@angular/core';
import { UcFilters } from './insights-filters';
import { UcRegistrations } from './registrations';
import { UcActiveUsers } from './active-users';
import { UcEngagement } from './engagement';
import { UcDisabledUsers } from './disabled-users';
import { UcNewUsers } from './new-users';
import { InsightCtx } from './section-kit';
import { Dim, Gran, RANGES, RangeKey, StatFilter, UserStatsService, buckets, emptyFilter, matchesFilter, rangeStart } from './user-stats';

export type InsightSection = 'registrations' | 'active' | 'engagement' | 'disabled' | 'new';

export const INSIGHT_SECTIONS: { key: InsightSection; label: string; title: string; icon: string; desc: string }[] = [
  {
    key: 'registrations',
    label: 'Registrations',
    title: 'User Registrations Statistics',
    icon: '📈',
    desc: 'How sign-ups grow over time across geographies, countries, cities, genders and age groups.',
  },
  { key: 'active', label: 'Daily active', title: 'Daily Active Users', icon: '⚡', desc: 'Daily, weekly, monthly and yearly active members — where and who they are.' },
  { key: 'engagement', label: 'Active / Inactive', title: 'Most Active / Inactive Users', icon: '🔥', desc: 'Who engages the most, who has gone quiet, and how engagement differs between segments.' },
  { key: 'disabled', label: 'Disabled', title: 'Disabled Users', icon: '⛔', desc: 'Accounts disabled over time, why, by whom, and how many were reinstated.' },
  { key: 'new', label: 'New users', title: 'New Users', icon: '🌱', desc: 'New members today, this week, this month, this year and over the last 5 years.' },
];

const DEFAULTS: Record<InsightSection, { range: RangeKey; gran: Gran }> = {
  registrations: { range: '12m', gran: 'month' },
  active: { range: '30d', gran: 'day' },
  engagement: { range: '30d', gran: 'week' },
  disabled: { range: '12m', gran: 'month' },
  new: { range: '30d', gran: 'day' },
};

const RANGE_LABELS: Record<RangeKey, string> = {
  '7d': 'Last 7 days',
  '30d': 'Last 30 days',
  '90d': 'Last 90 days',
  '12m': 'Last 12 months',
  ytd: 'This year',
  all: 'All time',
};

/** User Management → Insights (A–E). Lazy-loaded from the users page. */
@Component({
  selector: 'app-admin-user-insights',
  imports: [UcFilters, UcRegistrations, UcActiveUsers, UcEngagement, UcDisabledUsers, UcNewUsers],
  styleUrl: './insights.css',
  encapsulation: ViewEncapsulation.None,
  host: { class: 'uc-root' },
  template: `
    <header class="uc-head">
      <span class="uc-head-icon" aria-hidden="true">{{ meta().icon }}</span>
      <div>
        <h2>{{ meta().title }}</h2>
        <p>{{ meta().desc }}</p>
      </div>
      <span class="uc-asof" [title]="'Data as of ' + asOf()">● Live · {{ asOf() }}</span>
    </header>

    <app-uc-filters
      [(filter)]="filter"
      [(dim)]="dim"
      [range]="state().range"
      (rangeChange)="patch({ range: $event })"
      [gran]="state().gran"
      (granChange)="patch({ gran: $event })"
      [showRange]="section() !== 'new'"
      [showGran]="section() !== 'new'"
      [matching]="matching()"
    />

    @switch (section()) {
      @case ('registrations') {
        <app-uc-registrations [ctx]="ctx()" (pick)="addFilter($event)" />
      }
      @case ('active') {
        <app-uc-active-users [ctx]="ctx()" (pick)="addFilter($event)" />
      }
      @case ('engagement') {
        <app-uc-engagement [ctx]="ctx()" (pick)="addFilter($event)" />
      }
      @case ('disabled') {
        <app-uc-disabled-users [ctx]="ctx()" (pick)="addFilter($event)" />
      }
      @case ('new') {
        <app-uc-new-users [ctx]="ctx()" (pick)="addFilter($event)" />
      }
    }

    <p class="uc-footnote">
      Registrations, profiles and account states come from member records. Day-by-day activity and past disable / reinstate history are
      modelled per member so they agree with each member's last-active time and current account state.
    </p>
  `,
})
export class AdminUserInsights {
  private readonly stats = inject(UserStatsService);
  readonly section = input<InsightSection>('registrations');

  protected readonly filter = signal<StatFilter>(emptyFilter());
  protected readonly dim = signal<Dim>('none');
  private readonly perSection = signal<Record<InsightSection, { range: RangeKey; gran: Gran }>>({ ...DEFAULTS });
  private readonly now = signal(Date.now());

  protected readonly meta = computed(() => INSIGHT_SECTIONS.find((s) => s.key === this.section()) ?? INSIGHT_SECTIONS[0]);
  protected readonly state = computed(() => this.perSection()[this.section()] ?? DEFAULTS.registrations);
  protected readonly matching = computed(() => this.stats.members().filter((m) => matchesFilter(m, this.filter())).length);
  protected readonly asOf = computed(() => new Date(this.now()).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }));

  protected readonly ctx = computed<InsightCtx>(() => {
    const { range, gran } = this.state();
    const to = this.now();
    const from = rangeStart(range, to);
    return {
      filter: this.filter(),
      range,
      gran,
      dim: this.dim(),
      from,
      to,
      bks: buckets(from, to, gran),
      prev: range === 'all' ? null : { from: from - (to - from), to: from },
      rangeLabel: RANGE_LABELS[range],
    };
  });

  protected patch(p: Partial<{ range: RangeKey; gran: Gran }>): void {
    const key = this.section();
    this.perSection.update((s) => {
      const next = { ...s[key], ...p };
      if (p.range && !p.gran) {
        const def = RANGES.find((r) => r.key === p.range)!.gran;
        if (!['day', 'week', 'month', 'year'].includes(next.gran)) next.gran = def;
      }
      return { ...s, [key]: next };
    });
  }

  protected addFilter(e: { key: keyof StatFilter; value: string }): void {
    this.filter.update((f) => (f[e.key].includes(e.value) ? f : { ...f, [e.key]: [...f[e.key], e.value] }));
  }
}
