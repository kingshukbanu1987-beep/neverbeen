import { Component, computed, inject, signal } from '@angular/core';
import { AdminInsightsService } from '../shared/admin-insights.service';
import { SelectValueSync } from '../../../shared/select-value-sync';

interface Bucket {
  key: string;
  label: string;
  tooltip: string;
  count: number;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** I — Member registration statistics with Country / Year / Month / Date filters. */
@Component({
  selector: 'app-admin-registration-chart',
  imports: [SelectValueSync],
  template: `
    <section class="c-card">
      <header class="c-head">
        <div>
          <h3>📈 Member Registrations</h3>
          <p>{{ granularityLabel() }}</p>
        </div>
        <div class="c-toggle" role="group" aria-label="Overlay">
          <button type="button" [class.on]="!cumulative()" (click)="cumulative.set(false)">New</button>
          <button type="button" [class.on]="cumulative()" (click)="cumulative.set(true)" title="Show running total line">+ Cumulative</button>
        </div>
      </header>

      <div class="c-filters">
        <label>
          <span>Country</span>
          <select [value]="country()" (change)="country.set($any($event.target).value)">
            <option value="">All countries</option>
            @for (c of countries(); track c) {
              <option [value]="c">{{ c }}</option>
            }
          </select>
        </label>
        <label>
          <span>Year</span>
          <select [value]="year()" (change)="setYear($any($event.target).value)">
            <option value="">All years</option>
            @for (y of years(); track y) {
              <option [value]="y">{{ y }}</option>
            }
          </select>
        </label>
        <label>
          <span>Month</span>
          <select [value]="month()" (change)="setMonth($any($event.target).value)">
            <option value="">All months</option>
            @for (m of months; track m; let i = $index) {
              <option [value]="i + 1">{{ m }}</option>
            }
          </select>
        </label>
        <label>
          <span>Date</span>
          <input type="date" [value]="date()" [min]="minDate()" [max]="maxDate()" (change)="setDate($any($event.target).value)" />
        </label>
        @if (country() || year() || month() || date()) {
          <button type="button" class="c-reset" (click)="reset()">Reset</button>
        }
      </div>

      <div class="c-kpis">
        <div class="c-kpi"><small>Registrations</small><strong>{{ totalInRange().toLocaleString() }}</strong></div>
        <div class="c-kpi"><small>Peak</small><strong>{{ peak()?.count ?? 0 }} <span class="rc-sub">{{ peak()?.label }}</span></strong></div>
        <div class="c-kpi"><small>Average / {{ unit() }}</small><strong>{{ average() }}</strong></div>
        <div class="c-kpi"><small>Members to date</small><strong>{{ membersToDate().toLocaleString() }}</strong></div>
      </div>

      @if (totalInRange() === 0) {
        <p class="c-empty">No registrations for the selected filters.</p>
      } @else {
        <div class="rc-plot" (mouseleave)="hover.set(null)">
          <div class="rc-grid" aria-hidden="true">
            @for (t of ticks(); track t) {
              <span class="rc-tick" [style.bottom.%]="(t / axisMax()) * 100"><em>{{ t }}</em></span>
            }
          </div>
          <div class="rc-cols" [style.gap.px]="buckets().length > 40 ? 1 : buckets().length > 20 ? 3 : 6">
            @for (b of buckets(); track b.key; let i = $index) {
              <div class="rc-col" (mouseenter)="hover.set(i)" [class.dim]="hover() !== null && hover() !== i">
                <span class="rc-bar" [style.height.%]="(b.count / axisMax()) * 100" [class.zero]="b.count === 0"></span>
                @if (hover() === i) {
                  <span class="rc-tip">
                    <b>{{ b.count }}</b> new members<br />
                    <small>{{ b.tooltip }}</small>
                    @if (cumulative()) {
                      <br /><small>Running total: {{ running()[i] }}</small>
                    }
                  </span>
                }
              </div>
            }
          </div>
          @if (cumulative()) {
            <svg class="rc-line" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
              <defs>
                <linearGradient id="rcArea" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stop-color="#6366f1" stop-opacity="0.25" />
                  <stop offset="100%" stop-color="#6366f1" stop-opacity="0" />
                </linearGradient>
              </defs>
              <path [attr.d]="linePath().area" fill="url(#rcArea)"></path>
              <path [attr.d]="linePath().line" fill="none" stroke="#6366f1" stroke-width="2" vector-effect="non-scaling-stroke"></path>
            </svg>
          }
        </div>
        <div class="rc-labels" [style.gap.px]="buckets().length > 40 ? 1 : buckets().length > 20 ? 3 : 6">
          @for (b of buckets(); track b.key; let i = $index) {
            <span>{{ showLabel(i) ? b.label : '' }}</span>
          }
        </div>
        <footer class="c-foot">
          <span class="c-legend">
            <span><i style="background: linear-gradient(180deg, #34d399, #059669)"></i>New registrations</span>
            @if (cumulative()) {
              <span><i style="background: #6366f1"></i>Running total (scaled)</span>
            }
          </span>
          <span>{{ buckets().length }} {{ unit() }}s</span>
        </footer>
      }
    </section>
  `,
  styleUrls: ['./charts.css'],
  styles: [
    `
      .rc-sub {
        font-size: 0.66rem;
        font-weight: 600;
        color: #94a3b8;
      }
      .rc-plot {
        position: relative;
        height: 220px;
        margin-left: 30px;
        border-bottom: 1px solid #e2e8f0;
      }
      .rc-grid {
        position: absolute;
        inset: 0;
        pointer-events: none;
      }
      .rc-tick {
        position: absolute;
        left: 0;
        right: 0;
        border-top: 1px dashed #eef2f7;
      }
      .rc-tick em {
        position: absolute;
        left: -32px;
        top: -8px;
        width: 26px;
        text-align: right;
        font-style: normal;
        font-size: 0.62rem;
        font-weight: 700;
        color: #94a3b8;
      }
      .rc-cols {
        position: absolute;
        inset: 0;
        display: flex;
        align-items: flex-end;
      }
      .rc-col {
        position: relative;
        flex: 1 1 0;
        height: 100%;
        display: flex;
        align-items: flex-end;
        justify-content: center;
        cursor: crosshair;
        transition: opacity 0.15s ease;
      }
      .rc-col.dim {
        opacity: 0.45;
      }
      .rc-bar {
        display: block;
        width: 100%;
        max-width: 34px;
        border-radius: 6px 6px 2px 2px;
        background: linear-gradient(180deg, #34d399, #059669);
        transition: height 0.45s cubic-bezier(0.2, 0.8, 0.2, 1);
        min-height: 2px;
      }
      .rc-bar.zero {
        background: #e2e8f0;
      }
      .rc-tip {
        position: absolute;
        bottom: calc(100% + 6px);
        left: 50%;
        transform: translateX(-50%);
        z-index: 3;
        background: #0f172a;
        color: #f8fafc;
        font-size: 0.72rem;
        line-height: 1.35;
        border-radius: 10px;
        padding: 0.4rem 0.6rem;
        white-space: nowrap;
        pointer-events: none;
        box-shadow: 0 10px 24px -10px rgba(15, 23, 42, 0.6);
      }
      .rc-tip small {
        color: #cbd5e1;
      }
      .rc-col:first-child .rc-tip {
        left: 0;
        transform: none;
      }
      .rc-col:last-child .rc-tip {
        left: auto;
        right: 0;
        transform: none;
      }
      .rc-line {
        position: absolute;
        inset: 0;
        width: 100%;
        height: 100%;
        pointer-events: none;
      }
      .rc-labels {
        display: flex;
        margin-left: 30px;
        margin-top: 0.35rem;
      }
      .rc-labels span {
        flex: 1 1 0;
        min-width: 0;
        text-align: center;
        font-size: 0.6rem;
        font-weight: 700;
        color: #94a3b8;
        white-space: nowrap;
        overflow: visible;
      }
    `,
  ],
})
export class AdminRegistrationChart {
  private readonly insights = inject(AdminInsightsService);
  protected readonly months = MONTHS;

  protected readonly country = signal('');
  protected readonly year = signal('');
  protected readonly month = signal('');
  protected readonly date = signal('');
  protected readonly cumulative = signal(false);
  protected readonly hover = signal<number | null>(null);

  protected readonly countries = computed(() => [...new Set(this.insights.members().map((m) => m.country))].sort());

  private readonly dated = computed(() =>
    this.insights
      .members()
      .filter((m) => !this.country() || m.country === this.country())
      .map((m) => new Date(m.registeredAtUtc))
      .sort((a, b) => a.getTime() - b.getTime()),
  );

  private readonly allDates = computed(() => this.insights.members().map((m) => new Date(m.registeredAtUtc).getTime()));
  protected readonly years = computed(() => {
    const ds = this.allDates();
    if (!ds.length) return [];
    const min = new Date(Math.min(...ds)).getFullYear();
    const max = new Date(Math.max(...ds)).getFullYear();
    return Array.from({ length: max - min + 1 }, (_, i) => String(max - i));
  });
  protected readonly minDate = computed(() => (this.allDates().length ? isoDay(new Date(Math.min(...this.allDates()))) : ''));
  protected readonly maxDate = computed(() => (this.allDates().length ? isoDay(new Date(Math.max(...this.allDates()))) : ''));

  protected readonly mode = computed<'hour' | 'day' | 'month' | 'year-of-month' | 'timeline'>(() => {
    if (this.date()) return 'hour';
    if (this.year() && this.month()) return 'day';
    if (this.year()) return 'month';
    if (this.month()) return 'year-of-month';
    return 'timeline';
  });

  protected readonly unit = computed(() => {
    switch (this.mode()) {
      case 'hour':
        return 'hour';
      case 'day':
        return 'day';
      case 'year-of-month':
        return 'year';
      default:
        return 'month';
    }
  });

  protected readonly granularityLabel = computed(() => {
    const where = this.country() ? ` in ${this.country()}` : '';
    switch (this.mode()) {
      case 'hour':
        return `Hourly sign-ups on ${new Date(this.date() + 'T00:00').toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' })}${where}`;
      case 'day':
        return `Daily sign-ups — ${MONTHS[+this.month() - 1]} ${this.year()}${where}`;
      case 'month':
        return `Monthly sign-ups — ${this.year()}${where}`;
      case 'year-of-month':
        return `${MONTHS[+this.month() - 1]} sign-ups compared across years${where}`;
      default:
        return `Monthly sign-ups since launch${where}`;
    }
  });

  protected readonly buckets = computed<Bucket[]>(() => {
    const dates = this.dated();
    const mode = this.mode();
    const make = (key: string, label: string, tooltip: string): Bucket => ({ key, label, tooltip, count: 0 });
    let buckets: Bucket[] = [];
    let keyOf: (d: Date) => string | null;

    if (mode === 'hour') {
      buckets = Array.from({ length: 24 }, (_, h) => make(String(h), `${String(h).padStart(2, '0')}h`, `${String(h).padStart(2, '0')}:00 – ${String(h).padStart(2, '0')}:59`));
      keyOf = (d) => (isoDay(d) === this.date() ? String(d.getHours()) : null);
    } else if (mode === 'day') {
      const y = +this.year();
      const m = +this.month() - 1;
      const days = new Date(y, m + 1, 0).getDate();
      buckets = Array.from({ length: days }, (_, i) => make(String(i + 1), String(i + 1), `${i + 1} ${MONTHS[m]} ${y}`));
      keyOf = (d) => (d.getFullYear() === y && d.getMonth() === m ? String(d.getDate()) : null);
    } else if (mode === 'month') {
      const y = +this.year();
      buckets = MONTHS.map((name, i) => make(String(i), name, `${name} ${y}`));
      keyOf = (d) => (d.getFullYear() === y ? String(d.getMonth()) : null);
    } else if (mode === 'year-of-month') {
      const m = +this.month() - 1;
      buckets = this.years()
        .slice()
        .reverse()
        .map((y) => make(y, `${MONTHS[m]} ${y.slice(2)}`, `${MONTHS[m]} ${y}`));
      keyOf = (d) => (d.getMonth() === m ? String(d.getFullYear()) : null);
    } else {
      const ds = this.allDates();
      if (!ds.length) return [];
      const start = new Date(Math.min(...ds));
      const end = new Date(Math.max(...ds));
      const cursor = new Date(start.getFullYear(), start.getMonth(), 1);
      while (cursor <= end) {
        const k = `${cursor.getFullYear()}-${cursor.getMonth()}`;
        buckets.push(make(k, `${MONTHS[cursor.getMonth()]} ${String(cursor.getFullYear()).slice(2)}`, `${MONTHS[cursor.getMonth()]} ${cursor.getFullYear()}`));
        cursor.setMonth(cursor.getMonth() + 1);
      }
      keyOf = (d) => `${d.getFullYear()}-${d.getMonth()}`;
    }

    const index = new Map(buckets.map((b, i) => [b.key, i]));
    for (const d of dates) {
      const k = keyOf(d);
      const i = k === null ? undefined : index.get(k);
      if (i !== undefined) buckets[i].count++;
    }
    return buckets;
  });

  protected readonly totalInRange = computed(() => this.buckets().reduce((s, b) => s + b.count, 0));
  protected readonly peak = computed(() => this.buckets().reduce<Bucket | null>((best, b) => (!best || b.count > best.count ? b : best), null));
  protected readonly average = computed(() => {
    const n = this.buckets().length;
    return n ? (this.totalInRange() / n).toFixed(1) : '0';
  });

  /** Members registered up to the end of the selected period (country filter respected). */
  protected readonly membersToDate = computed(() => {
    const dates = this.dated();
    let end: number;
    if (this.date()) end = new Date(this.date() + 'T23:59:59').getTime();
    else if (this.year() && this.month()) end = new Date(+this.year(), +this.month(), 0, 23, 59, 59).getTime();
    else if (this.year()) end = new Date(+this.year(), 11, 31, 23, 59, 59).getTime();
    else end = Infinity;
    return dates.filter((d) => d.getTime() <= end).length;
  });

  protected readonly axisMax = computed(() => {
    const max = Math.max(1, ...this.buckets().map((b) => b.count));
    const step = niceStep(max);
    return Math.ceil(max / step) * step;
  });

  protected readonly ticks = computed(() => {
    const max = this.axisMax();
    const step = niceStep(max);
    const out: number[] = [];
    for (let t = 0; t <= max; t += step) out.push(t);
    return out;
  });

  protected readonly running = computed(() => {
    let acc = 0;
    return this.buckets().map((b) => (acc += b.count));
  });

  protected readonly linePath = computed(() => {
    const run = this.running();
    const n = run.length;
    const max = Math.max(1, run[n - 1] ?? 1);
    const pts = run.map((v, i) => [((i + 0.5) / n) * 100, 100 - (v / max) * 96] as const);
    const line = pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(2)},${y.toFixed(2)}`).join(' ');
    const area = pts.length ? `${line} L${pts[pts.length - 1][0].toFixed(2)},100 L${pts[0][0].toFixed(2)},100 Z` : '';
    return { line, area };
  });

  protected showLabel(i: number): boolean {
    const n = this.buckets().length;
    const every = n > 28 ? Math.ceil(n / 12) : n > 16 ? 2 : 1;
    return i % every === 0 || i === n - 1;
  }

  protected setYear(value: string): void {
    this.year.set(value);
    this.date.set('');
  }

  protected setMonth(value: string): void {
    this.month.set(value);
    this.date.set('');
  }

  protected setDate(value: string): void {
    this.date.set(value);
    if (value) {
      const [y, m] = value.split('-');
      this.year.set(String(+y));
      this.month.set(String(+m));
    }
  }

  protected reset(): void {
    this.country.set('');
    this.year.set('');
    this.month.set('');
    this.date.set('');
  }
}

function isoDay(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function niceStep(max: number): number {
  const rough = max / 4;
  const pow = Math.pow(10, Math.floor(Math.log10(Math.max(1, rough))));
  const n = rough / pow;
  const step = n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10;
  return Math.max(1, step * pow);
}
