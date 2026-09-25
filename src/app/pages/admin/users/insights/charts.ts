import { Component, DestroyRef, ElementRef, afterNextRender, computed, inject, input, output, signal } from '@angular/core';
import type { Series, Slice } from './user-stats';

/* ------------------------------------------------------------------------ */
/*  Shared helpers                                                           */
/* ------------------------------------------------------------------------ */

let uid = 0;

export function fmtNum(v: number): string {
  if (!Number.isFinite(v)) return '–';
  if (Math.abs(v) >= 10_000) return (v / 1000).toFixed(Math.abs(v) >= 100_000 ? 0 : 1).replace(/\.0$/, '') + 'k';
  return Number.isInteger(v) ? v.toLocaleString() : v.toLocaleString(undefined, { maximumFractionDigits: 1 });
}

/** A "nice" axis maximum and tick step. */
export function niceScale(max: number, ticks = 4): { max: number; step: number } {
  if (max <= 0) return { max: ticks, step: 1 };
  const raw = max / ticks;
  const mag = Math.pow(10, Math.floor(Math.log10(raw)));
  const norm = raw / mag;
  const step = (norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 2.5 ? 2.5 : norm <= 5 ? 5 : 10) * mag;
  const s = step < 1 ? Math.max(step, raw <= 0.5 ? step : 1) : step;
  return { max: Math.ceil(max / s) * s, step: s };
}

/** Monotone cubic path through points (no overshoot). */
export function smoothPath(pts: [number, number][], move = true): string {
  const n = pts.length;
  if (!n) return '';
  if (n === 1) return `${move ? 'M' : 'L'}${pts[0][0]},${pts[0][1]}`;
  if (n > 240) return pts.map((p, i) => `${i === 0 && move ? 'M' : 'L'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join('');
  const dx: number[] = [];
  const m: number[] = [];
  for (let i = 0; i < n - 1; i++) {
    dx.push(pts[i + 1][0] - pts[i][0]);
    m.push((pts[i + 1][1] - pts[i][1]) / (dx[i] || 1));
  }
  const t: number[] = [m[0]];
  for (let i = 1; i < n - 1; i++) t.push(m[i - 1] * m[i] <= 0 ? 0 : (m[i - 1] + m[i]) / 2);
  t.push(m[n - 2]);
  for (let i = 0; i < n - 1; i++) {
    if (m[i] === 0) {
      t[i] = 0;
      t[i + 1] = 0;
      continue;
    }
    const a = t[i] / m[i];
    const b = t[i + 1] / m[i];
    const h = a * a + b * b;
    if (h > 9) {
      const k = 3 / Math.sqrt(h);
      t[i] = k * a * m[i];
      t[i + 1] = k * b * m[i];
    }
  }
  let d = `${move ? 'M' : 'L'}${pts[0][0].toFixed(1)},${pts[0][1].toFixed(1)}`;
  for (let i = 0; i < n - 1; i++) {
    const h = dx[i] / 3;
    d += `C${(pts[i][0] + h).toFixed(1)},${(pts[i][1] + t[i] * h).toFixed(1)} ${(pts[i + 1][0] - h).toFixed(1)},${(pts[i + 1][1] - t[i + 1] * h).toFixed(1)} ${pts[i + 1][0].toFixed(1)},${pts[i + 1][1].toFixed(1)}`;
  }
  return d;
}

/** Tracks the rendered width of the host element. */
function useWidth(fallback: number) {
  const host = inject(ElementRef<HTMLElement>);
  const width = signal(fallback);
  const destroy = inject(DestroyRef);
  afterNextRender(() => {
    const el = host.nativeElement as HTMLElement;
    const measure = () => {
      const w = Math.round(el.getBoundingClientRect().width);
      if (w > 40) width.set(w);
    };
    measure();
    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    destroy.onDestroy(() => ro.disconnect());
  });
  return width;
}

/* ------------------------------------------------------------------------ */
/*  Trend chart — area / line / bars, stacked or grouped, hover crosshair    */
/* ------------------------------------------------------------------------ */

@Component({
  selector: 'app-uc-trend',
  host: { class: 'uc-trend' },
  template: `
    @if (legend() && (series().length > 1 || overlay())) {
      <div class="uc-legend" role="group" aria-label="Series">
        @for (s of series(); track s.name) {
          <button type="button" class="uc-leg" [class.off]="hidden().has(s.name)" (click)="toggle(s.name)" [attr.aria-pressed]="!hidden().has(s.name)">
            <i [style.background]="s.color"></i>{{ s.name }}
            <b>{{ fmt(total(s)) }}</b>
          </button>
        }
        @if (overlay(); as o) {
          <span class="uc-leg static"><i class="line" [style.background]="o.color"></i>{{ o.name }}</span>
        }
      </div>
    }
    <div class="uc-plot" [style.height.px]="height()">
      @if (empty()) {
        <div class="uc-empty">No data for this selection</div>
      }
      <svg [attr.width]="w()" [attr.height]="height()" [attr.viewBox]="'0 0 ' + w() + ' ' + height()" role="img" [attr.aria-label]="ariaLabel()">
        <defs>
          @for (s of view().layers; track s.name) {
            <linearGradient [attr.id]="gid + '-' + $index" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" [attr.stop-color]="s.color" [attr.stop-opacity]="stacked() ? 0.85 : 0.35" />
              <stop offset="100%" [attr.stop-color]="s.color" [attr.stop-opacity]="stacked() ? 0.55 : 0.02" />
            </linearGradient>
          }
          <clipPath [attr.id]="gid + '-clip'"><rect class="uc-reveal" [attr.x]="pl" y="0" [attr.width]="innerW()" [attr.height]="height()" /></clipPath>
        </defs>
        <!-- grid + y axis -->
        @for (t of view().ticks; track t.v) {
          <line class="uc-grid" [attr.x1]="pl" [attr.x2]="w() - pr" [attr.y1]="t.y" [attr.y2]="t.y" />
          <text class="uc-ytick" [attr.x]="pl - 6" [attr.y]="t.y + 3.5" text-anchor="end">{{ fmt(t.v) }}</text>
        }
        <g [attr.clip-path]="'url(#' + gid + '-clip)'">
          @if (view().bars) {
            @for (b of view().rects; track $index) {
              <rect class="uc-bar" [attr.x]="b.x" [attr.y]="b.y" [attr.width]="b.w" [attr.height]="b.h" [attr.fill]="b.color" [attr.rx]="b.r" [class.dim]="hover() !== null && hover() !== b.i" />
            }
          } @else {
            @for (l of view().layers; track l.name) {
              @if (l.area) {
                <path class="uc-area" [attr.d]="l.area" [attr.fill]="'url(#' + gid + '-' + $index + ')'" />
              }
              <path class="uc-line" [attr.d]="l.line" [attr.stroke]="l.color" [class.dashed]="l.dashed" />
            }
          }
          @if (view().overlay; as o) {
            <path class="uc-line uc-overlay" [attr.d]="o.line" [attr.stroke]="o.color" />
          }
        </g>
        @for (mk of view().markers; track mk.label) {
          <line class="uc-marker" [attr.x1]="mk.x" [attr.x2]="mk.x" [attr.y1]="pt" [attr.y2]="height() - pb" />
          <text class="uc-marker-label" [attr.x]="mk.x + 4" [attr.y]="pt + 10">{{ mk.label }}</text>
        }
        <!-- x axis -->
        @for (x of view().xticks; track x.i) {
          <text class="uc-xtick" [attr.x]="x.x" [attr.y]="height() - 6" text-anchor="middle">{{ x.label }}</text>
        }
        <!-- hover -->
        @if (hover() !== null && view().points[hover()!]; as p) {
          <line class="uc-cross" [attr.x1]="p.x" [attr.x2]="p.x" [attr.y1]="pt" [attr.y2]="height() - pb" />
          @if (!view().bars) {
            @for (d of p.dots; track $index) {
              <circle class="uc-dot" [attr.cx]="p.x" [attr.cy]="d.y" r="4" [attr.stroke]="d.color" />
            }
          }
        }
        <rect class="uc-hit" [attr.x]="pl" [attr.y]="pt" [attr.width]="innerW()" [attr.height]="height() - pt - pb" (pointermove)="move($event)" (pointerleave)="hover.set(null)" />
      </svg>
      @if (hover() !== null && tip(); as t) {
        <div class="uc-tip" [style.left.px]="t.left" [class.flip]="t.flip">
          <strong>{{ t.label }}</strong>
          @for (r of t.rows; track r.name) {
            <span class="uc-tip-row"><i [style.background]="r.color"></i>{{ r.name }}<b>{{ r.value }}</b></span>
          }
          @if (t.total !== null) {
            <span class="uc-tip-row total">Total<b>{{ t.total }}</b></span>
          }
        </div>
      }
    </div>
  `,
})
export class UcTrend {
  readonly labels = input<string[]>([]);
  readonly short = input<string[]>([]);
  readonly series = input<Series[]>([]);
  readonly overlay = input<Series | null>(null);
  readonly mode = input<'area' | 'line' | 'bar'>('area');
  readonly stacked = input(true);
  readonly legend = input(true);
  readonly height = input(240);
  readonly unit = input('');
  readonly markers = input<{ index: number; label: string }[]>([]);
  readonly ariaLabel = input('Trend chart');

  protected readonly gid = `uc${++uid}`;
  protected readonly pl = 44;
  protected readonly pr = 12;
  protected readonly pt = 10;
  protected readonly pb = 24;
  protected readonly w = useWidth(720);
  protected readonly innerW = computed(() => Math.max(10, this.w() - this.pl - this.pr));
  protected readonly hidden = signal<Set<string>>(new Set());
  protected readonly hover = signal<number | null>(null);
  protected readonly fmt = fmtNum;

  private readonly visible = computed(() => this.series().filter((s) => !this.hidden().has(s.name)));
  protected readonly empty = computed(() => !this.series().some((s) => s.values.some((v) => v > 0)));

  protected total(s: Series): number {
    return s.values.reduce((a, b) => a + b, 0);
  }

  protected toggle(name: string): void {
    this.hidden.update((h) => {
      const n = new Set(h);
      if (n.has(name)) n.delete(name);
      else if (this.series().length - n.size > 1) n.add(name);
      return n;
    });
  }

  protected readonly view = computed(() => {
    const series = this.visible();
    const n = Math.max(this.labels().length, ...series.map((s) => s.values.length), 0);
    const H = this.height();
    const innerH = H - this.pt - this.pb;
    const iw = this.innerW();
    const bars = this.mode() === 'bar' && n <= 160;
    const stacked = this.stacked() && series.length > 1;
    const cum = series.map(() => new Array<number>(n).fill(0));
    const base = series.map(() => new Array<number>(n).fill(0));
    let max = 0;
    for (let i = 0; i < n; i++) {
      let acc = 0;
      series.forEach((s, k) => {
        const v = s.values[i] ?? 0;
        base[k][i] = stacked ? acc : 0;
        acc = stacked ? acc + v : v;
        cum[k][i] = acc;
        max = Math.max(max, acc);
      });
    }
    const ov = this.overlay();
    if (ov) max = Math.max(max, ...ov.values);
    const { max: top, step } = niceScale(max);
    const y = (v: number) => this.pt + innerH - (v / top) * innerH;
    const band = n ? iw / n : iw;
    const x = (i: number) => (bars ? this.pl + band * (i + 0.5) : this.pl + (n <= 1 ? iw / 2 : (i * iw) / (n - 1)));

    const ticks: { v: number; y: number }[] = [];
    for (let v = 0; v <= top + 1e-9; v += step) ticks.push({ v: Math.round(v * 100) / 100, y: y(v) });

    const layers = series.map((s, k) => {
      const topPts: [number, number][] = [];
      const botPts: [number, number][] = [];
      for (let i = 0; i < n; i++) {
        topPts.push([x(i), y(cum[k][i])]);
        botPts.push([x(i), y(base[k][i])]);
      }
      const line = smoothPath(topPts);
      const area = this.mode() === 'line' ? '' : `${line}${smoothPath(botPts.reverse(), false)}Z`;
      return { name: s.name, color: s.color, dashed: !!s.dashed, line, area };
    });

    const rects: { x: number; y: number; w: number; h: number; color: string; r: number; i: number }[] = [];
    if (bars) {
      const gap = Math.min(6, band * 0.28);
      const groups = stacked ? 1 : series.length;
      const bw = Math.max(1, (band - gap) / groups);
      for (let i = 0; i < n; i++) {
        series.forEach((s, k) => {
          const v = s.values[i] ?? 0;
          if (!v) return;
          const y1 = y(cum[k][i]);
          const y0 = y(base[k][i]);
          const bx = this.pl + band * i + gap / 2 + (stacked ? 0 : k * bw);
          rects.push({ x: bx, y: y1, w: bw, h: Math.max(0.5, y0 - y1), color: s.color, r: Math.min(4, bw / 3), i });
        });
      }
    }

    const overlay = ov ? { color: ov.color, line: smoothPath(ov.values.map((v, i) => [x(i), y(v)] as [number, number])) } : null;

    const shorts = this.short().length ? this.short() : this.labels();
    const every = Math.max(1, Math.ceil(n / Math.max(2, Math.floor(iw / 64))));
    const xticks: { i: number; x: number; label: string }[] = [];
    for (let i = 0; i < n; i += every) xticks.push({ i, x: Math.min(Math.max(x(i), this.pl + 14), this.pl + iw - 14), label: shorts[i] ?? '' });

    const points = Array.from({ length: n }, (_, i) => ({ x: x(i), dots: series.map((s, k) => ({ y: y(cum[k][i]), color: s.color })) }));
    const markers = this.markers()
      .filter((mk) => mk.index >= 0 && mk.index < n)
      .map((mk) => ({ x: x(mk.index), label: mk.label }));
    return { ticks, layers, rects, bars, overlay, xticks, points, markers, n, band };
  });

  protected readonly tip = computed(() => {
    const i = this.hover();
    if (i === null) return null;
    const v = this.view();
    const p = v.points[i];
    if (!p) return null;
    const unit = this.unit() ? ' ' + this.unit() : '';
    const rows = this.visible().map((s) => ({ name: s.name, color: s.color, value: fmtNum(s.values[i] ?? 0) + unit }));
    const ov = this.overlay();
    if (ov) rows.push({ name: ov.name, color: ov.color, value: fmtNum(ov.values[i] ?? 0) + unit });
    const tot = this.visible().reduce((a, s) => a + (s.values[i] ?? 0), 0);
    return {
      label: this.labels()[i] ?? '',
      rows,
      total: this.visible().length > 1 && this.stacked() ? fmtNum(Math.round(tot * 10) / 10) + unit : null,
      left: p.x,
      flip: p.x > this.w() * 0.62,
    };
  });

  protected move(e: PointerEvent): void {
    const rect = (e.currentTarget as SVGRectElement).getBoundingClientRect();
    const v = this.view();
    if (!v.n) return;
    const scale = rect.width ? this.innerW() / rect.width : 1;
    const px = (e.clientX - rect.left) * scale;
    const i = v.bars ? Math.floor(px / v.band) : Math.round((px / this.innerW()) * (v.n - 1));
    this.hover.set(Math.min(v.n - 1, Math.max(0, i)));
  }

  /** Test hook: show the tooltip for a data index. */
  hoverAt(i: number): void {
    this.hover.set(i);
  }
}

/* ------------------------------------------------------------------------ */
/*  Donut                                                                     */
/* ------------------------------------------------------------------------ */

@Component({
  selector: 'app-uc-donut',
  host: { class: 'uc-donut' },
  template: `
    <div class="uc-donut-ring" [style.width.px]="size()" [style.height.px]="size()">
      <svg [attr.width]="size()" [attr.height]="size()" [attr.viewBox]="'0 0 ' + size() + ' ' + size()" role="img" [attr.aria-label]="centerLabel() + ' breakdown'">
        <circle class="uc-donut-track" [attr.cx]="c()" [attr.cy]="c()" [attr.r]="r()" [attr.stroke-width]="thickness()" />
        @for (a of arcs(); track a.label) {
          <circle
            class="uc-donut-arc"
            [class.on]="active() === $index"
            [class.dim]="active() !== null && active() !== $index"
            [attr.cx]="c()"
            [attr.cy]="c()"
            [attr.r]="r()"
            [attr.stroke]="a.color"
            [attr.stroke-width]="thickness()"
            [attr.stroke-dasharray]="a.dash"
            [attr.stroke-dashoffset]="a.offset"
            [attr.transform]="'rotate(-90 ' + c() + ' ' + c() + ')'"
            (pointerenter)="active.set($index)"
            (pointerleave)="active.set(null)"
          />
        }
      </svg>
      <div class="uc-donut-center">
        @if (active() !== null && arcs()[active()!]; as a) {
          <strong>{{ pct(a.value) }}%</strong>
          <small>{{ a.label }} · {{ fmt(a.value) }}</small>
        } @else {
          <strong>{{ fmt(total()) }}</strong>
          <small>{{ centerLabel() }}</small>
        }
      </div>
    </div>
    @if (showLegend()) {
      <ul class="uc-donut-legend">
        @for (a of arcs(); track a.label) {
          <li [class.on]="active() === $index" (pointerenter)="active.set($index)" (pointerleave)="active.set(null)">
            <i [style.background]="a.color"></i>
            <span>{{ a.label }}</span>
            <b>{{ fmt(a.value) }}</b>
            <em>{{ pct(a.value) }}%</em>
          </li>
        }
      </ul>
    }
  `,
})
export class UcDonut {
  readonly slices = input<Slice[]>([]);
  readonly size = input(150);
  readonly thickness = input(20);
  readonly centerLabel = input('Total');
  readonly showLegend = input(true);

  protected readonly active = signal<number | null>(null);
  protected readonly fmt = fmtNum;
  protected readonly c = computed(() => this.size() / 2);
  protected readonly r = computed(() => this.size() / 2 - this.thickness() / 2 - 2);
  protected readonly total = computed(() => this.slices().reduce((a, s) => a + s.value, 0));

  protected readonly arcs = computed(() => {
    const C = 2 * Math.PI * this.r();
    const tot = this.total() || 1;
    let acc = 0;
    return this.slices().map((s) => {
      const len = (s.value / tot) * C;
      const vis = Math.max(0, len - (this.slices().length > 1 && len > 4 ? 2 : 0));
      const arc = { ...s, dash: `${vis} ${C - vis}`, offset: -acc };
      acc += len;
      return arc;
    });
  });

  protected pct(v: number): number {
    const t = this.total();
    return t ? Math.round((v / t) * 1000) / 10 : 0;
  }
}

/* ------------------------------------------------------------------------ */
/*  Sparkline                                                                 */
/* ------------------------------------------------------------------------ */

@Component({
  selector: 'app-uc-spark',
  host: { class: 'uc-spark' },
  template: `
    <svg [attr.width]="width()" [attr.height]="height()" [attr.viewBox]="'0 0 ' + width() + ' ' + height()" aria-hidden="true">
      <path [attr.d]="paths().area" [attr.fill]="color()" fill-opacity="0.14" />
      <path [attr.d]="paths().line" [attr.stroke]="color()" fill="none" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" />
    </svg>
  `,
})
export class UcSpark {
  readonly values = input<number[]>([]);
  readonly color = input('#6366f1');
  readonly width = input(84);
  readonly height = input(24);

  protected readonly paths = computed(() => {
    const v = this.values();
    const w = this.width();
    const h = this.height() - 2;
    if (!v.length) return { line: '', area: '' };
    const max = Math.max(1, ...v);
    const pts = v.map((y, i) => [v.length === 1 ? w / 2 : (i * w) / (v.length - 1), 1 + h - (y / max) * (h - 1)] as [number, number]);
    const line = smoothPath(pts);
    return { line, area: `${line}L${w},${h + 1}L0,${h + 1}Z` };
  });
}

/* ------------------------------------------------------------------------ */
/*  Ranked horizontal bars                                                    */
/* ------------------------------------------------------------------------ */

export interface BarItem {
  label: string;
  value: number;
  color?: string;
  sub?: string;
  delta?: number | null;
  spark?: number[];
  icon?: string;
  /** Optional value shown instead of the raw number (e.g. "42%"). */
  display?: string;
}

@Component({
  selector: 'app-uc-bars',
  imports: [UcSpark],
  host: { class: 'uc-bars' },
  template: `
    @for (b of rows(); track b.label) {
      <div class="uc-bar-row" [class.clickable]="clickable()" (click)="clickable() && pick.emit(b.label)" [attr.title]="clickable() ? 'Filter by ' + b.label : null">
        <span class="uc-bar-label">
          @if (b.icon) {
            <span aria-hidden="true">{{ b.icon }}</span>
          }
          <span class="uc-bar-name">{{ b.label }}</span>
          @if (b.sub) {
            <small>{{ b.sub }}</small>
          }
        </span>
        <span class="uc-bar-track"><i [style.width.%]="b.w" [style.background]="b.color || color()"></i></span>
        <b class="uc-bar-val">{{ b.display ?? fmt(b.value) }}</b>
        @if (share()) {
          <em class="uc-bar-share">{{ b.share }}%</em>
        }
        @if (b.delta !== undefined) {
          <span class="uc-delta" [class.up]="(b.delta ?? 0) > 0" [class.down]="(b.delta ?? 0) < 0">{{ deltaText(b.delta ?? null) }}</span>
        }
        @if (b.spark) {
          <app-uc-spark [values]="b.spark" [color]="b.color || color()" />
        }
      </div>
    } @empty {
      <p class="uc-empty-inline">No data for this selection</p>
    }
  `,
})
export class UcBars {
  readonly items = input<BarItem[]>([]);
  readonly color = input('#6366f1');
  readonly share = input(true);
  readonly clickable = input(false);
  readonly limit = input(8);
  readonly pick = output<string>();
  protected readonly fmt = fmtNum;

  protected readonly rows = computed(() => {
    const items = this.items().slice(0, this.limit());
    const max = Math.max(1, ...items.map((i) => i.value));
    const tot = this.items().reduce((a, i) => a + i.value, 0) || 1;
    return items.map((i) => ({ ...i, w: (i.value / max) * 100, share: Math.round((i.value / tot) * 1000) / 10 }));
  });

  protected deltaText(d: number | null): string {
    if (d === null) return 'new';
    if (d === 0) return '0%';
    return `${d > 0 ? '▲' : '▼'} ${Math.abs(d)}%`;
  }
}

/* ------------------------------------------------------------------------ */
/*  Population pyramid (e.g. Male ← age group → Female)                      */
/* ------------------------------------------------------------------------ */

@Component({
  selector: 'app-uc-pyramid',
  host: { class: 'uc-pyramid' },
  template: `
    <div class="uc-pyr-head">
      <span><i [style.background]="leftColor()"></i>{{ leftName() }} · {{ fmt(totL()) }}</span>
      <span>{{ rightName() }} · {{ fmt(totR()) }}<i [style.background]="rightColor()"></i></span>
    </div>
    @for (r of rows(); track r.label) {
      <div class="uc-pyr-row" [attr.title]="r.label + ': ' + leftName() + ' ' + r.left + ', ' + rightName() + ' ' + r.right">
        <span class="uc-pyr-side left"><b>{{ fmt(r.left) }}</b><i [style.width.%]="(r.left / max()) * 100" [style.background]="leftColor()"></i></span>
        <span class="uc-pyr-label">{{ r.label }}</span>
        <span class="uc-pyr-side right"><i [style.width.%]="(r.right / max()) * 100" [style.background]="rightColor()"></i><b>{{ fmt(r.right) }}</b></span>
      </div>
    }
  `,
})
export class UcPyramid {
  readonly rows = input<{ label: string; left: number; right: number }[]>([]);
  readonly leftName = input('Male');
  readonly rightName = input('Female');
  readonly leftColor = input('#3b82f6');
  readonly rightColor = input('#ec4899');
  protected readonly fmt = fmtNum;
  protected readonly max = computed(() => Math.max(1, ...this.rows().flatMap((r) => [r.left, r.right])));
  protected readonly totL = computed(() => this.rows().reduce((a, r) => a + r.left, 0));
  protected readonly totR = computed(() => this.rows().reduce((a, r) => a + r.right, 0));
}

/* ------------------------------------------------------------------------ */
/*  Calendar heatmap (weeks × weekdays)                                       */
/* ------------------------------------------------------------------------ */

const WEEKDAYS = ['Mon', '', 'Wed', '', 'Fri', '', 'Sun'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

@Component({
  selector: 'app-uc-calendar',
  host: { class: 'uc-calendar' },
  template: `
    <div class="uc-cal-scroll">
      <div class="uc-cal" [style.--weeks]="grid().weeks.length">
        <div class="uc-cal-months">
          @for (m of grid().months; track $index) {
            <span [style.grid-column]="m.col + 1">{{ m.label }}</span>
          }
        </div>
        <div class="uc-cal-days">
          @for (d of weekdays; track $index) {
            <span>{{ d }}</span>
          }
        </div>
        <div class="uc-cal-grid">
          @for (wk of grid().weeks; track $index) {
            <div class="uc-cal-week">
              @for (c of wk; track $index) {
                @if (c) {
                  <i class="uc-cell" [attr.data-level]="c.level" [class.on]="hovered() === c" (pointerenter)="hovered.set(c)" (pointerleave)="hovered.set(null)" [attr.title]="c.label + ': ' + c.value + ' ' + unit()"></i>
                } @else {
                  <i class="uc-cell blank"></i>
                }
              }
            </div>
          }
        </div>
      </div>
    </div>
    <div class="uc-cal-foot">
      <span class="uc-cal-hover">
        @if (hovered(); as h) {
          <b>{{ h.label }}</b> · {{ fmt(h.value) }} {{ unit() }}
        } @else {
          Hover a day for details
        }
      </span>
      <span class="uc-cal-scale">Less @for (l of [0, 1, 2, 3, 4]; track l) {<i class="uc-cell" [attr.data-level]="l"></i>} More</span>
    </div>
  `,
})
export class UcCalendar {
  /** Consecutive days: `start` = local midnight (ms) of the first day. */
  readonly start = input(0);
  readonly values = input<number[]>([]);
  readonly unit = input('');
  protected readonly weekdays = WEEKDAYS;
  protected readonly fmt = fmtNum;
  protected readonly hovered = signal<{ label: string; value: number; level: number } | null>(null);

  protected readonly grid = computed(() => {
    const vals = this.values();
    const sorted = vals.filter((v) => v > 0).sort((a, b) => a - b);
    const q = (p: number) => sorted[Math.min(sorted.length - 1, Math.floor(p * sorted.length))] ?? 0;
    const cuts = [q(0.25), q(0.5), q(0.75)];
    const level = (v: number) => (v <= 0 ? 0 : v <= cuts[0] ? 1 : v <= cuts[1] ? 2 : v <= cuts[2] ? 3 : 4);
    const first = new Date(this.start());
    const lead = (first.getDay() + 6) % 7;
    const cells: ({ label: string; value: number; level: number; month: number; date: number } | null)[] = new Array(lead).fill(null);
    vals.forEach((v, i) => {
      const d = new Date(first.getFullYear(), first.getMonth(), first.getDate() + i);
      cells.push({ label: d.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }), value: v, level: level(v), month: d.getMonth(), date: d.getDate() });
    });
    const weeks: (typeof cells)[] = [];
    for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
    const months: { col: number; label: string }[] = [];
    let lastMonth = -1;
    weeks.forEach((wk, col) => {
      const c = wk.find((x) => x && x.date <= 7);
      if (c && c.month !== lastMonth) {
        if (!months.length || col - months[months.length - 1].col >= 3) months.push({ col, label: MONTHS[c.month] });
        lastMonth = c.month;
      }
    });
    return { weeks, months };
  });
}
