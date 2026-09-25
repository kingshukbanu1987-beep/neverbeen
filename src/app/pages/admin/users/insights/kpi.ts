import { Component, computed, input } from '@angular/core';
import { UcSpark } from './charts';

/** KPI tile with trend delta and sparkline. */
@Component({
  selector: 'app-uc-kpi',
  imports: [UcSpark],
  host: { class: 'uc-kpi', '[style.--kpi]': 'color()' },
  template: `
    <div class="uc-kpi-top">
      <small>
        @if (icon()) {
          <span aria-hidden="true">{{ icon() }}</span>
        }
        {{ label() }}
      </small>
      @if (delta() !== undefined) {
        <span class="uc-delta" [class.up]="good() === true" [class.down]="good() === false" [title]="deltaHint()">{{ deltaText() }}</span>
      }
    </div>
    <strong>{{ value() }}</strong>
    <div class="uc-kpi-bottom">
      <span class="uc-kpi-sub">{{ sub() }}</span>
      @if (spark().length > 1) {
        <app-uc-spark [values]="spark()" [color]="color()" [width]="76" [height]="24" />
      }
    </div>
  `,
})
export class UcKpi {
  readonly label = input('');
  readonly value = input<string | number>('');
  readonly sub = input('');
  readonly icon = input('');
  readonly color = input('#6366f1');
  readonly spark = input<number[]>([]);
  /** % change vs the previous period (null = no baseline, undefined = hide). */
  readonly delta = input<number | null | undefined>(undefined);
  readonly deltaHint = input('vs previous period');
  /** When true, an increase is bad (e.g. disabled accounts). */
  readonly invert = input(false);

  protected readonly deltaText = computed(() => {
    const d = this.delta();
    if (d === null) return 'new';
    if (d === undefined) return '';
    if (d === 0) return '→ 0%';
    return `${d > 0 ? '▲' : '▼'} ${Math.abs(d)}%`;
  });

  protected readonly good = computed(() => {
    const d = this.delta();
    if (d === null || d === undefined || d === 0) return null;
    return this.invert() ? d < 0 : d > 0;
  });
}
