import { Component, computed, inject, signal } from '@angular/core';
import { AGE_GROUPS, AdminInsightsService, PROFESSION_CATEGORIES } from '../shared/admin-insights.service';

interface CountryRow {
  country: string;
  total: number;
  female: number;
  male: number;
  other: number;
  share: number;
  widthPct: number;
}

const DONUT_COLORS = ['#10b981', '#6366f1', '#f59e0b', '#ec4899', '#0ea5e9', '#94a3b8'];

/** H — Country-wise member statistics with Gender / Age group / Profession / Verification filters. */
@Component({
  selector: 'app-admin-country-chart',
  template: `
    <section class="c-card">
      <header class="c-head">
        <div>
          <h3>🌍 Members by Country</h3>
          <p>Country-wise distribution of community members</p>
        </div>
        <div class="c-toggle" role="group" aria-label="Scale">
          <button type="button" [class.on]="scale() === 'linear'" (click)="scale.set('linear')">Linear</button>
          <button type="button" [class.on]="scale() === 'log'" (click)="scale.set('log')" title="Logarithmic scale makes smaller countries visible">Log</button>
        </div>
      </header>

      <div class="c-filters">
        <label>
          <span>Gender</span>
          <select [value]="gender()" (change)="gender.set($any($event.target).value)">
            <option value="">All genders</option>
            @for (g of genders(); track g) {
              <option [value]="g">{{ g }}</option>
            }
          </select>
        </label>
        <label>
          <span>Age group</span>
          <select [value]="ageGroup()" (change)="ageGroup.set($any($event.target).value)">
            <option value="">All ages</option>
            @for (a of ageGroups; track a) {
              <option [value]="a">{{ a }}</option>
            }
          </select>
        </label>
        <label>
          <span>Profession</span>
          <select [value]="profession()" (change)="profession.set($any($event.target).value)">
            <option value="">All professions</option>
            @for (p of professions; track p) {
              <option [value]="p">{{ p }}</option>
            }
          </select>
        </label>
        <label>
          <span>Verification</span>
          <select [value]="verified()" (change)="verified.set($any($event.target).value)">
            <option value="">All members</option>
            <option value="yes">Verified</option>
            <option value="no">Unverified</option>
          </select>
        </label>
        @if (gender() || ageGroup() || profession() || verified()) {
          <button type="button" class="c-reset" (click)="reset()">Reset</button>
        }
      </div>

      <div class="c-kpis">
        <div class="c-kpi"><small>Members</small><strong>{{ total().toLocaleString() }}</strong></div>
        <div class="c-kpi"><small>Countries</small><strong>{{ rows().length }}</strong></div>
        <div class="c-kpi"><small>Top country</small><strong>{{ rows()[0]?.country ?? '—' }}</strong></div>
        <div class="c-kpi"><small>Female share</small><strong>{{ femaleShare() }}</strong></div>
      </div>

      @if (rows().length === 0) {
        <p class="c-empty">No members match these filters.</p>
      } @else {
        <div class="cc-body">
          <ul class="cc-bars">
            @for (r of visibleRows(); track r.country) {
              <li [title]="r.country + ': ' + r.total + ' members (' + r.female + ' female, ' + r.male + ' male' + (r.other ? ', ' + r.other + ' other' : '') + ')'">
                <span class="cc-name">{{ r.country }}</span>
                <span class="cc-track">
                  <span class="cc-fill" [style.width.%]="r.widthPct">
                    @if (!gender()) {
                      <i class="seg f" [style.flex-grow]="r.female"></i>
                      <i class="seg m" [style.flex-grow]="r.male"></i>
                      <i class="seg o" [style.flex-grow]="r.other"></i>
                    } @else {
                      <i class="seg solid" style="flex-grow: 1"></i>
                    }
                  </span>
                </span>
                <span class="cc-val">{{ r.total }} <small>{{ r.share }}%</small></span>
              </li>
            }
          </ul>

          <div class="cc-donut">
            <svg viewBox="0 0 42 42" role="img" [attr.aria-label]="'Share of members by country'">
              <circle cx="21" cy="21" r="15.915" fill="none" stroke="#f1f5f9" stroke-width="6"></circle>
              @for (s of donut(); track s.label) {
                <circle
                  cx="21"
                  cy="21"
                  r="15.915"
                  fill="none"
                  [attr.stroke]="s.color"
                  stroke-width="6"
                  [attr.stroke-dasharray]="s.pct + ' ' + (100 - s.pct)"
                  [attr.stroke-dashoffset]="s.offset"
                >
                  <title>{{ s.label }} — {{ s.pct.toFixed(1) }}%</title>
                </circle>
              }
              <text x="21" y="20.5" text-anchor="middle" class="d-num">{{ total() }}</text>
              <text x="21" y="25.5" text-anchor="middle" class="d-lbl">members</text>
            </svg>
            <ul class="cc-donut-legend">
              @for (s of donut(); track s.label) {
                <li><i [style.background]="s.color"></i>{{ s.label }} <b>{{ s.pct.toFixed(0) }}%</b></li>
              }
            </ul>
          </div>
        </div>

        <footer class="c-foot">
          @if (!gender()) {
            <span class="c-legend">
              <span><i style="background: #ec4899"></i>Female</span>
              <span><i style="background: #3b82f6"></i>Male</span>
              <span><i style="background: #a3a3a3"></i>Other / not specified</span>
            </span>
          } @else {
            <span>Showing {{ gender() }} members only</span>
          }
          @if (rows().length > limit) {
            <button type="button" class="c-link" (click)="showAll.set(!showAll())">
              {{ showAll() ? 'Show top ' + limit : 'Show all ' + rows().length + ' countries' }}
            </button>
          }
        </footer>
      }
    </section>
  `,
  styleUrls: ['./charts.css'],
  styles: [
    `
      .cc-body {
        display: grid;
        grid-template-columns: 1fr 170px;
        gap: 1rem;
        align-items: center;
      }
      .cc-bars {
        list-style: none;
        margin: 0;
        padding: 0;
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
        max-height: 300px;
        overflow: auto;
        padding-right: 0.2rem;
      }
      .cc-bars li {
        display: grid;
        grid-template-columns: 96px 1fr 70px;
        align-items: center;
        gap: 0.55rem;
        font-size: 0.78rem;
      }
      .cc-name {
        font-weight: 700;
        color: #1e293b;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .cc-track {
        height: 14px;
        border-radius: 999px;
        background: #f1f5f9;
        overflow: hidden;
      }
      .cc-fill {
        display: flex;
        height: 100%;
        min-width: 4px;
        border-radius: 999px;
        overflow: hidden;
        transition: width 0.45s cubic-bezier(0.2, 0.8, 0.2, 1);
      }
      .seg {
        display: block;
        height: 100%;
        flex-basis: 0;
      }
      .seg.f {
        background: linear-gradient(90deg, #f472b6, #ec4899);
      }
      .seg.m {
        background: linear-gradient(90deg, #60a5fa, #3b82f6);
      }
      .seg.o {
        background: #a3a3a3;
      }
      .seg.solid {
        background: linear-gradient(90deg, #34d399, #10b981, #0d9488);
      }
      .cc-val {
        font-weight: 800;
        color: #0f172a;
        text-align: right;
        font-variant-numeric: tabular-nums;
      }
      .cc-val small {
        font-weight: 600;
        color: #94a3b8;
        font-size: 0.68rem;
      }
      .cc-donut svg {
        width: 100%;
        max-width: 150px;
        display: block;
        margin: 0 auto;
        transform: rotate(-90deg);
      }
      .cc-donut svg text {
        transform: rotate(90deg);
        transform-origin: 21px 21px;
      }
      .d-num {
        font-size: 6px;
        font-weight: 800;
        fill: #0f172a;
      }
      .d-lbl {
        font-size: 2.6px;
        font-weight: 700;
        fill: #94a3b8;
        text-transform: uppercase;
      }
      .cc-donut-legend {
        list-style: none;
        margin: 0.6rem 0 0;
        padding: 0;
        font-size: 0.7rem;
        color: #475569;
        display: flex;
        flex-direction: column;
        gap: 0.2rem;
      }
      .cc-donut-legend i {
        display: inline-block;
        width: 8px;
        height: 8px;
        border-radius: 2px;
        margin-right: 0.35rem;
      }
      .cc-donut-legend b {
        float: right;
        color: #0f172a;
      }
      @media (max-width: 640px) {
        .cc-body {
          grid-template-columns: 1fr;
        }
      }
    `,
  ],
})
export class AdminCountryChart {
  private readonly insights = inject(AdminInsightsService);
  protected readonly ageGroups = AGE_GROUPS;
  protected readonly professions = PROFESSION_CATEGORIES;
  protected readonly limit = 8;

  protected readonly gender = signal('');
  protected readonly ageGroup = signal('');
  protected readonly profession = signal('');
  protected readonly verified = signal('');
  protected readonly scale = signal<'linear' | 'log'>('linear');
  protected readonly showAll = signal(false);

  protected readonly genders = computed(() => [...new Set(this.insights.members().map((m) => m.gender))].sort());

  private readonly filtered = computed(() =>
    this.insights.members().filter(
      (m) =>
        (!this.gender() || m.gender === this.gender()) &&
        (!this.ageGroup() || m.ageGroup === this.ageGroup()) &&
        (!this.profession() || m.professionCategory === this.profession()) &&
        (!this.verified() || (this.verified() === 'yes') === m.isVerified),
    ),
  );

  protected readonly total = computed(() => this.filtered().length);

  protected readonly femaleShare = computed(() => {
    const t = this.total();
    return t ? `${Math.round((this.filtered().filter((m) => m.gender === 'Female').length / t) * 100)}%` : '—';
  });

  protected readonly rows = computed<CountryRow[]>(() => {
    const map = new Map<string, { total: number; female: number; male: number; other: number }>();
    for (const m of this.filtered()) {
      const e = map.get(m.country) ?? { total: 0, female: 0, male: 0, other: 0 };
      e.total++;
      if (m.gender === 'Female') e.female++;
      else if (m.gender === 'Male') e.male++;
      else e.other++;
      map.set(m.country, e);
    }
    const total = this.total() || 1;
    const list = [...map.entries()].sort((a, b) => b[1].total - a[1].total);
    const max = list[0]?.[1].total ?? 1;
    const log = this.scale() === 'log';
    return list.map(([country, e]) => ({
      country,
      ...e,
      share: Math.round((e.total / total) * 1000) / 10,
      widthPct: log ? Math.max(3, (Math.log10(e.total + 1) / Math.log10(max + 1)) * 100) : Math.max(1.5, (e.total / max) * 100),
    }));
  });

  protected readonly visibleRows = computed(() => (this.showAll() ? this.rows() : this.rows().slice(0, this.limit)));

  protected readonly donut = computed(() => {
    const rows = this.rows();
    const total = this.total() || 1;
    const top = rows.slice(0, 5).map((r) => ({ label: r.country, value: r.total }));
    const rest = rows.slice(5).reduce((s, r) => s + r.total, 0);
    if (rest) top.push({ label: 'Others', value: rest });
    let acc = 0;
    return top.map((s, i) => {
      const pct = (s.value / total) * 100;
      const seg = { label: s.label, pct, color: DONUT_COLORS[i % DONUT_COLORS.length], offset: -acc };
      acc += pct;
      return seg;
    });
  });

  protected reset(): void {
    this.gender.set('');
    this.ageGroup.set('');
    this.profession.set('');
    this.verified.set('');
  }
}
