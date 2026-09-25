import { Component, DestroyRef, ElementRef, afterNextRender, computed, inject, input, signal } from '@angular/core';

/* ================================================================== */
/*  Hand-built, dependency-free SVG charts for Admin → Health          */
/* ================================================================== */

export interface ChartSeries {
  key: string;
  label: string;
  color: string;
  values: number[];
  dashed?: boolean;
}

export interface ChartShare {
  label: string;
  value: number;
  color?: string;
}

const PALETTE = ['#6366f1', '#10b981', '#f59e0b', '#0ea5e9', '#f43f5e', '#8b5cf6', '#14b8a6', '#94a3b8', '#ec4899', '#84cc16'];
const defaultFormat = (v: number) => (Math.abs(v) >= 1000 ? `${(v / 1000).toFixed(v >= 10000 ? 0 : 1)}k` : `${Math.round(v * 10) / 10}`);

function niceMax(v: number): number {
  if (v <= 0) return 1;
  const exp = Math.pow(10, Math.floor(Math.log10(v)));
  const f = v / exp;
  const nice = f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10;
  return nice * exp;
}

/** Tracks the rendered width of the host so charts stay crisp at any size (and in print). */
function useWidth(fallback: number) {
  const width = signal(fallback);
  const host = inject(ElementRef<HTMLElement>);
  const destroyRef = inject(DestroyRef);
  afterNextRender(() => {
    const el = host.nativeElement as HTMLElement;
    const set = () => el.clientWidth > 0 && width.set(el.clientWidth);
    set();
    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(set);
    ro.observe(el);
    destroyRef.onDestroy(() => ro.disconnect());
  });
  return width;
}

/* ------------------------------------------------------------------ Line / area / bar */

@Component({
  selector: 'hc-chart',
  host: { class: 'hc-host' },
  template: `
    <div class="hc-wrap" (mouseleave)="hover.set(null)">
      <svg [attr.viewBox]="'0 0 ' + W() + ' ' + height()" [attr.width]="W()" [attr.height]="height()" role="img" [attr.aria-label]="ariaLabel()" (mousemove)="onMove($event)">
        <defs>
          @for (s of visibleSeries(); track s.key) {
            <linearGradient [attr.id]="gid(s.key)" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" [attr.stop-color]="s.color" stop-opacity="0.32" />
              <stop offset="100%" [attr.stop-color]="s.color" stop-opacity="0.02" />
            </linearGradient>
          }
        </defs>
        <!-- grid & y axis -->
        @for (t of yTicks(); track t.v) {
          <line class="hc-grid" [attr.x1]="padL" [attr.x2]="W() - padR" [attr.y1]="t.y" [attr.y2]="t.y" />
          <text class="hc-axis" [attr.x]="padL - 8" [attr.y]="t.y + 4" text-anchor="end">{{ format()(t.v) }}</text>
        }
        <!-- x labels -->
        @for (l of xLabels(); track l.i) {
          <text class="hc-axis" [attr.x]="l.x" [attr.y]="height() - 8" text-anchor="middle">{{ l.text }}</text>
        }
        <!-- threshold -->
        @if (threshold(); as th) {
          @if (th.value <= yMax()) {
            <line class="hc-threshold" [attr.x1]="padL" [attr.x2]="W() - padR" [attr.y1]="y(th.value)" [attr.y2]="y(th.value)" />
            <text class="hc-threshold-label" [attr.x]="W() - padR" [attr.y]="y(th.value) - 5" text-anchor="end">{{ th.label }}</text>
          }
        }
        <!-- series -->
        @if (type() === 'bar') {
          @for (s of visibleSeries(); track s.key; let si = $index) {
            @for (v of s.values; track $index; let i = $index) {
              <rect
                class="hc-bar"
                [attr.x]="barX(i, si)"
                [attr.y]="y(v)"
                [attr.width]="barW()"
                [attr.height]="Math.max(0, y(0) - y(v))"
                [attr.fill]="s.color"
                [attr.opacity]="s.dashed ? 0.35 : hover() === null || hover() === i ? 0.95 : 0.55"
                rx="3"
              />
            }
          }
        } @else {
          @for (s of visibleSeries(); track s.key) {
            @if (type() === 'area' && !s.dashed) {
              <path [attr.d]="areaPath(s.values)" [attr.fill]="'url(#' + gid(s.key) + ')'" />
            }
            <path class="hc-line" [attr.d]="linePath(s.values)" [attr.stroke]="s.color" [attr.stroke-dasharray]="s.dashed ? '6 5' : null" [attr.opacity]="s.dashed ? 0.6 : 1" />
          }
        }
        <!-- hover -->
        @if (hover() !== null) {
          <line class="hc-cross" [attr.x1]="x(hover()!)" [attr.x2]="x(hover()!)" [attr.y1]="padT" [attr.y2]="height() - padB" />
          @if (type() !== 'bar') {
            @for (s of visibleSeries(); track s.key) {
              <circle [attr.cx]="x(hover()!)" [attr.cy]="y(s.values[hover()!] || 0)" r="4.5" [attr.fill]="s.color" stroke="#fff" stroke-width="2" />
            }
          }
        }
      </svg>
      @if (hover() !== null) {
        <div class="hc-tip" [style.left.px]="tipX()" [style.top.px]="padT">
          <strong>{{ labels()[hover()!] }}</strong>
          @for (s of visibleSeries(); track s.key) {
            <span><i [style.background]="s.color" [class.dashed]="s.dashed"></i>{{ s.label }} <b>{{ format()(s.values[hover()!] || 0) }}</b></span>
          }
        </div>
      }
    </div>
    @if (legend()) {
      <div class="hc-legend">
        @for (s of series(); track s.key) {
          <button type="button" class="hc-legend-item" [class.off]="hidden().has(s.key)" (click)="toggle(s.key)" [attr.aria-pressed]="!hidden().has(s.key)">
            <i [style.background]="s.color" [class.dashed]="s.dashed"></i>{{ s.label }}
          </button>
        }
      </div>
    }
  `,
  styleUrl: './health-charts.css',
})
export class HcChart {
  readonly labels = input.required<string[]>();
  readonly series = input.required<ChartSeries[]>();
  readonly type = input<'line' | 'area' | 'bar'>('area');
  readonly height = input(260);
  readonly format = input<(v: number) => string>(defaultFormat);
  readonly threshold = input<{ value: number; label: string } | null>(null);
  readonly legend = input(true);
  readonly smooth = input(true);
  readonly ariaLabel = input('Chart');

  protected readonly Math = Math;
  protected readonly padL = 52;
  protected readonly padR = 14;
  protected readonly padT = 14;
  protected readonly padB = 28;
  private readonly uid = Math.random().toString(36).slice(2, 8);
  protected readonly W = useWidth(720);
  protected readonly hover = signal<number | null>(null);
  protected readonly hidden = signal<Set<string>>(new Set());

  protected readonly visibleSeries = computed(() => this.series().filter((s) => !this.hidden().has(s.key)));
  protected readonly n = computed(() => Math.max(1, this.labels().length));
  protected readonly yMax = computed(() => {
    const max = Math.max(0, ...this.visibleSeries().flatMap((s) => s.values), this.threshold()?.value ?? 0);
    return niceMax(max * 1.08);
  });
  protected readonly yTicks = computed(() => Array.from({ length: 5 }, (_, i) => ({ v: (this.yMax() / 4) * i, y: this.y((this.yMax() / 4) * i) })));
  protected readonly xLabels = computed(() => {
    const n = this.labels().length;
    const maxLabels = Math.max(2, Math.floor((this.W() - this.padL - this.padR) / 78));
    const step = Math.max(1, Math.ceil(n / maxLabels));
    return this.labels()
      .map((text, i) => ({ i, text, x: this.x(i) }))
      .filter((l) => l.i % step === 0);
  });
  protected readonly barW = computed(() => {
    const band = (this.W() - this.padL - this.padR) / this.n();
    return Math.max(1.5, (band * 0.72) / Math.max(1, this.visibleSeries().length));
  });
  protected readonly tipX = computed(() => {
    const h = this.hover();
    if (h === null) return 0;
    const px = this.x(h);
    return px > this.W() * 0.6 ? px - 190 : px + 14;
  });

  protected gid(key: string): string {
    return `hc-${this.uid}-${key}`;
  }

  protected x(i: number): number {
    const inner = this.W() - this.padL - this.padR;
    if (this.type() === 'bar') return this.padL + (inner / this.n()) * (i + 0.5);
    return this.padL + (this.n() <= 1 ? inner / 2 : (inner / (this.n() - 1)) * i);
  }

  protected y(v: number): number {
    const inner = this.height() - this.padT - this.padB;
    return this.padT + inner - (Math.max(0, v) / this.yMax()) * inner;
  }

  protected barX(i: number, si: number): number {
    const k = this.visibleSeries().length;
    return this.x(i) - (this.barW() * k) / 2 + this.barW() * si;
  }

  protected linePath(values: number[]): string {
    const pts = values.map((v, i) => [this.x(i), this.y(v)] as const);
    if (!pts.length) return '';
    if (!this.smooth() || pts.length < 3) return pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ');
    // Catmull-Rom → cubic Bézier for a smooth, modern curve.
    let d = `M${pts[0][0].toFixed(1)},${pts[0][1].toFixed(1)}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[i - 1] ?? pts[i];
      const p1 = pts[i];
      const p2 = pts[i + 1];
      const p3 = pts[i + 2] ?? p2;
      const c1x = p1[0] + (p2[0] - p0[0]) / 6;
      const c1y = p1[1] + (p2[1] - p0[1]) / 6;
      const c2x = p2[0] - (p3[0] - p1[0]) / 6;
      const c2y = p2[1] - (p3[1] - p1[1]) / 6;
      d += ` C${c1x.toFixed(1)},${Math.min(this.y(0), c1y).toFixed(1)} ${c2x.toFixed(1)},${Math.min(this.y(0), c2y).toFixed(1)} ${p2[0].toFixed(1)},${p2[1].toFixed(1)}`;
    }
    return d;
  }

  protected areaPath(values: number[]): string {
    if (!values.length) return '';
    return `${this.linePath(values)} L${this.x(values.length - 1).toFixed(1)},${this.y(0)} L${this.x(0).toFixed(1)},${this.y(0)} Z`;
  }

  protected onMove(e: MouseEvent): void {
    const svg = e.currentTarget as SVGSVGElement;
    const rect = svg.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * this.W();
    let best = 0;
    let dist = Infinity;
    for (let i = 0; i < this.n(); i++) {
      const d = Math.abs(this.x(i) - px);
      if (d < dist) {
        dist = d;
        best = i;
      }
    }
    this.hover.set(best);
  }

  protected toggle(key: string): void {
    this.hidden.update((s) => {
      const n = new Set(s);
      if (n.has(key)) n.delete(key);
      else if (n.size < this.series().length - 1) n.add(key);
      return n;
    });
  }
}

/* ------------------------------------------------------------------ Donut */

@Component({
  selector: 'hc-donut',
  host: { class: 'hc-host' },
  template: `
    <div class="hc-donut">
      <svg [attr.viewBox]="'0 0 ' + size() + ' ' + size()" [attr.width]="size()" [attr.height]="size()" role="img" [attr.aria-label]="centerLabel()">
        <circle [attr.cx]="c()" [attr.cy]="c()" [attr.r]="r()" fill="none" stroke="#f1f5f9" [attr.stroke-width]="thickness()" />
        @for (s of arcs(); track s.label) {
          <circle
            class="hc-arc"
            [attr.cx]="c()"
            [attr.cy]="c()"
            [attr.r]="r()"
            fill="none"
            [attr.stroke]="s.color"
            [attr.stroke-width]="active() === s.label ? thickness() + 6 : thickness()"
            [attr.stroke-dasharray]="s.dash + ' ' + (circ() - s.dash)"
            [attr.stroke-dashoffset]="-s.offset"
            [attr.transform]="'rotate(-90 ' + c() + ' ' + c() + ')'"
            (mouseenter)="active.set(s.label)"
            (mouseleave)="active.set(null)"
          />
        }
        <text [attr.x]="c()" [attr.y]="c() - 4" text-anchor="middle" class="hc-donut-value">{{ centerValue() }}</text>
        <text [attr.x]="c()" [attr.y]="c() + 14" text-anchor="middle" class="hc-donut-label">{{ centerText() }}</text>
      </svg>
      <ul class="hc-donut-legend">
        @for (s of withColor(); track s.label) {
          <li [class.off]="hidden().has(s.label)" [class.active]="active() === s.label" (mouseenter)="active.set(s.label)" (mouseleave)="active.set(null)" (click)="toggle(s.label)">
            <i [style.background]="s.color"></i>
            <span class="lbl">{{ s.label }}</span>
            <span class="val">{{ format()(s.value) }}</span>
            <span class="pct">{{ pct(s.value) }}%</span>
          </li>
        }
      </ul>
    </div>
  `,
  styleUrl: './health-charts.css',
})
export class HcDonut {
  readonly data = input.required<ChartShare[]>();
  readonly size = input(170);
  readonly thickness = input(20);
  readonly centerLabel = input('Total');
  readonly format = input<(v: number) => string>(defaultFormat);

  protected readonly active = signal<string | null>(null);
  protected readonly hidden = signal<Set<string>>(new Set());
  protected readonly c = computed(() => this.size() / 2);
  protected readonly r = computed(() => this.size() / 2 - this.thickness() / 2 - 4);
  protected readonly circ = computed(() => 2 * Math.PI * this.r());
  protected readonly withColor = computed(() => this.data().map((d, i) => ({ ...d, color: d.color ?? PALETTE[i % PALETTE.length] })));
  protected readonly total = computed(() => this.withColor().filter((d) => !this.hidden().has(d.label)).reduce((a, d) => a + d.value, 0));
  protected readonly arcs = computed(() => {
    let off = 0;
    const tot = this.total() || 1;
    return this.withColor()
      .filter((d) => !this.hidden().has(d.label))
      .map((d) => {
        const dash = (d.value / tot) * this.circ();
        const a = { ...d, dash: Math.max(0, dash - 1.5), offset: off };
        off += dash;
        return a;
      });
  });
  protected readonly centerValue = computed(() => {
    const a = this.active();
    const item = a ? this.withColor().find((d) => d.label === a) : null;
    return item ? `${this.pct(item.value)}%` : this.format()(this.total());
  });
  protected readonly centerText = computed(() => this.active() ?? this.centerLabel());

  protected pct(v: number): string {
    return this.total() ? ((v / this.total()) * 100).toFixed(1) : '0';
  }

  protected toggle(label: string): void {
    this.hidden.update((s) => {
      const n = new Set(s);
      if (n.has(label)) n.delete(label);
      else if (n.size < this.data().length - 1) n.add(label);
      return n;
    });
  }
}

/* ------------------------------------------------------------------ Heatmap */

@Component({
  selector: 'hc-heatmap',
  host: { class: 'hc-host' },
  template: `
    <div class="hc-heat" (mouseleave)="cell.set(null)">
      <div class="hc-heat-grid" [style.grid-template-columns]="'44px repeat(' + cols() + ', minmax(0, 1fr))'">
        <span></span>
        @for (h of hourLabels(); track $index) {
          <span class="hc-heat-col">{{ h }}</span>
        }
        @for (row of grid(); track $index; let r = $index) {
          <span class="hc-heat-row">{{ rowLabels()[r] }}</span>
          @for (v of row; track $index; let c = $index) {
            <span class="hc-heat-cell" [style.background]="color(v)" (mouseenter)="cell.set({ r: r, c: c, v: v })" [attr.title]="rowLabels()[r] + ' ' + c + ':00 — ' + format()(v)"></span>
          }
        }
      </div>
      <div class="hc-heat-foot">
        @if (cell(); as x) {
          <span><b>{{ rowLabels()[x.r] }} {{ x.c }}:00–{{ x.c + 1 }}:00</b> · {{ format()(x.v) }} {{ unit() }}</span>
        } @else {
          <span>Peak: <b>{{ peak().label }}</b> · {{ format()(peak().v) }} {{ unit() }}</span>
        }
        <span class="hc-heat-scale">Less <i style="background:#eef2ff"></i><i style="background:#c7d2fe"></i><i style="background:#818cf8"></i><i style="background:#4f46e5"></i><i style="background:#312e81"></i> More</span>
      </div>
    </div>
  `,
  styleUrl: './health-charts.css',
})
export class HcHeatmap {
  readonly grid = input.required<number[][]>();
  readonly rowLabels = input(['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']);
  readonly unit = input('visitors');
  readonly format = input<(v: number) => string>(defaultFormat);

  protected readonly cell = signal<{ r: number; c: number; v: number } | null>(null);
  protected readonly cols = computed(() => this.grid()[0]?.length ?? 24);
  protected readonly hourLabels = computed(() => Array.from({ length: this.cols() }, (_, h) => (h % 3 === 0 ? String(h) : '')));
  private readonly max = computed(() => Math.max(1, ...this.grid().flat()));
  protected readonly peak = computed(() => {
    let best = { r: 0, c: 0, v: -1 };
    this.grid().forEach((row, r) => row.forEach((v, c) => v > best.v && (best = { r, c, v })));
    return { label: `${this.rowLabels()[best.r]} ${best.c}:00`, v: Math.max(0, best.v) };
  });

  protected color(v: number): string {
    const t = Math.pow(v / this.max(), 0.8);
    // indigo scale #eef2ff → #312e81
    const a = [238, 242, 255];
    const b = [49, 46, 129];
    const mid = [99, 102, 241];
    const lerp = (x: number[], y: number[], k: number) => x.map((xv, i) => Math.round(xv + (y[i] - xv) * k));
    const c = t < 0.6 ? lerp(a, mid, t / 0.6) : lerp(mid, b, (t - 0.6) / 0.4);
    return `rgb(${c[0]},${c[1]},${c[2]})`;
  }
}

/* ------------------------------------------------------------------ Horizontal bars */

@Component({
  selector: 'hc-bars',
  host: { class: 'hc-host' },
  template: `
    <ul class="hc-hbars">
      @for (d of rows(); track d.label; let i = $index) {
        <li>
          <span class="hc-hbar-label" [title]="d.label">{{ d.label }}</span>
          <span class="hc-hbar-track"><span class="hc-hbar-fill" [style.width.%]="(d.value / max()) * 100" [style.background]="d.color ?? palette[i % palette.length]"></span></span>
          <span class="hc-hbar-value">{{ format()(d.value) }}</span>
        </li>
      }
    </ul>
  `,
  styleUrl: './health-charts.css',
})
export class HcBars {
  readonly data = input.required<ChartShare[]>();
  readonly limit = input(10);
  readonly format = input<(v: number) => string>(defaultFormat);
  protected readonly palette = PALETTE;
  protected readonly rows = computed(() => this.data().slice(0, this.limit()));
  protected readonly max = computed(() => Math.max(1, ...this.rows().map((r) => r.value)));
}

/* ------------------------------------------------------------------ Gauge */

@Component({
  selector: 'hc-gauge',
  host: { class: 'hc-host' },
  template: `
    <svg [attr.viewBox]="'0 0 ' + size() + ' ' + (size() * 0.62)" [attr.width]="size()" [attr.height]="size() * 0.62" role="img" [attr.aria-label]="label() + ' ' + display()">
      <path [attr.d]="arc(1)" fill="none" stroke="#e2e8f0" [attr.stroke-width]="stroke()" stroke-linecap="round" />
      <path [attr.d]="arc(clamped() / 100)" fill="none" [attr.stroke]="color()" [attr.stroke-width]="stroke()" stroke-linecap="round" class="hc-gauge-arc" />
      <text [attr.x]="size() / 2" [attr.y]="size() * 0.5" text-anchor="middle" class="hc-gauge-value" [attr.fill]="color()">{{ display() }}</text>
      <text [attr.x]="size() / 2" [attr.y]="size() * 0.6" text-anchor="middle" class="hc-gauge-label">{{ label() }}</text>
    </svg>
  `,
  styleUrl: './health-charts.css',
})
export class HcGauge {
  readonly value = input.required<number>();
  readonly label = input('');
  readonly display = input<string>('');
  readonly size = input(180);
  readonly stroke = input(14);
  /** 'high-good' (health score) or 'high-bad' (usage). */
  readonly mode = input<'high-good' | 'high-bad'>('high-good');

  protected readonly clamped = computed(() => Math.max(0, Math.min(100, this.value())));
  protected readonly color = computed(() => {
    const v = this.mode() === 'high-good' ? this.clamped() : 100 - this.clamped();
    return v >= 80 ? '#10b981' : v >= 55 ? '#f59e0b' : '#ef4444';
  });

  protected arc(frac: number): string {
    const s = this.size();
    const r = s / 2 - this.stroke();
    const cx = s / 2;
    const cy = s * 0.52;
    const a0 = Math.PI;
    const a1 = Math.PI + Math.PI * Math.max(0.0001, frac);
    const p = (a: number) => `${(cx + r * Math.cos(a)).toFixed(2)},${(cy + r * Math.sin(a)).toFixed(2)}`;
    return `M${p(a0)} A${r},${r} 0 ${frac > 0.5 ? 1 : 0} 1 ${p(a1)}`;
  }
}

/* ------------------------------------------------------------------ Sparkline */

@Component({
  selector: 'hc-spark',
  host: { class: 'hc-spark-host' },
  template: `
    <svg [attr.viewBox]="'0 0 ' + width() + ' ' + height()" [attr.width]="width()" [attr.height]="height()" aria-hidden="true">
      <path [attr.d]="area()" [attr.fill]="color()" opacity="0.14" />
      <path [attr.d]="line()" fill="none" [attr.stroke]="color()" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round" />
    </svg>
  `,
})
export class HcSpark {
  readonly values = input.required<number[]>();
  readonly color = input('#6366f1');
  readonly width = input(110);
  readonly height = input(34);

  private readonly pts = computed(() => {
    const v = this.values();
    if (!v.length) return [] as [number, number][];
    const min = Math.min(...v);
    const max = Math.max(...v);
    const span = max - min || 1;
    return v.map((x, i) => [(i / Math.max(1, v.length - 1)) * this.width(), this.height() - 3 - ((x - min) / span) * (this.height() - 6)] as [number, number]);
  });
  protected readonly line = computed(() => this.pts().map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' '));
  protected readonly area = computed(() => (this.pts().length ? `${this.line()} L${this.width()},${this.height()} L0,${this.height()} Z` : ''));
}

/* ------------------------------------------------------------------ Funnel */

@Component({
  selector: 'hc-funnel',
  host: { class: 'hc-host' },
  template: `
    <ol class="hc-funnel">
      @for (s of steps(); track s.label; let i = $index) {
        <li>
          <div class="hc-funnel-bar" [style.width.%]="Math.max(6, (s.value / max()) * 100)" [style.background]="colors[i % colors.length]">
            <span>{{ s.label }}</span>
            <b>{{ s.value.toLocaleString() }}</b>
          </div>
          @if (i > 0) {
            <small class="hc-funnel-conv">{{ conv(i) }}% of previous step · {{ overall(i) }}% overall</small>
          }
        </li>
      }
    </ol>
  `,
  styleUrl: './health-charts.css',
})
export class HcFunnel {
  readonly steps = input.required<ChartShare[]>();
  protected readonly Math = Math;
  protected readonly colors = ['linear-gradient(90deg,#6366f1,#818cf8)', 'linear-gradient(90deg,#0ea5e9,#38bdf8)', 'linear-gradient(90deg,#10b981,#34d399)', 'linear-gradient(90deg,#f59e0b,#fbbf24)', 'linear-gradient(90deg,#f43f5e,#fb7185)'];
  protected readonly max = computed(() => Math.max(1, ...this.steps().map((s) => s.value)));

  protected conv(i: number): string {
    const prev = this.steps()[i - 1]?.value || 1;
    return ((this.steps()[i].value / prev) * 100).toFixed(1);
  }

  protected overall(i: number): string {
    return ((this.steps()[i].value / (this.steps()[0]?.value || 1)) * 100).toFixed(1);
  }
}
