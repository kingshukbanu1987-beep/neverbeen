import { Component, ElementRef, computed, inject, input, model, signal } from '@angular/core';
import { DIMS, Dim, GRANS, Gran, RANGES, RangeKey, StatFilter, UserStatsService, emptyFilter, filterCount, gransFor } from './user-stats';
import { REGIONS } from '../../../../services/announcements.service';

type FilterKey = keyof StatFilter;

const FILTERS: { key: FilterKey; label: string; icon: string; search: boolean }[] = [
  { key: 'regions', label: 'Geography', icon: '🌍', search: false },
  { key: 'countries', label: 'Country', icon: '🏳️', search: true },
  { key: 'cities', label: 'City', icon: '🏙️', search: true },
  { key: 'genders', label: 'Gender', icon: '⚧', search: false },
  { key: 'ages', label: 'Age group', icon: '🎂', search: false },
];

/**
 * Filter bar shared by the User Management insight pages: time range,
 * granularity, "break down by" and audience filters (geography, country,
 * city, gender, age group).
 */
@Component({
  selector: 'app-uc-filters',
  host: { class: 'uc-filters', '(document:click)': 'outside($event)', '(document:keydown.escape)': 'open.set(null)' },
  template: `
    <div class="uc-filter-row">
      @if (showRange()) {
        <div class="uc-seg" role="group" aria-label="Time range">
          @for (r of ranges; track r.key) {
            <button type="button" [class.on]="range() === r.key" (click)="setRange(r.key)" [attr.aria-pressed]="range() === r.key">{{ r.label }}</button>
          }
        </div>
      }
      @if (showGran()) {
        <div class="uc-seg" role="group" aria-label="Group by period">
          @for (g of grans; track g.key) {
            <button type="button" [class.on]="gran() === g.key" [disabled]="!allowed().includes(g.key)" (click)="gran.set(g.key)" [attr.aria-pressed]="gran() === g.key">
              {{ g.label }}
            </button>
          }
        </div>
      }
      <span class="uc-spacer"></span>
      @if (showDim()) {
        <label class="uc-dim">
          <span>Break down by</span>
          <div class="uc-seg compact" role="group" aria-label="Break down by">
            @for (d of dims; track d.key) {
              <button type="button" [class.on]="dim() === d.key" (click)="dim.set(d.key)" [attr.aria-pressed]="dim() === d.key" [title]="d.label">
                <span aria-hidden="true">{{ d.icon }}</span> {{ d.label }}
              </button>
            }
          </div>
        </label>
      }
    </div>

    <div class="uc-filter-row">
      <span class="uc-filter-title">Filters</span>
      @for (f of filters; track f.key) {
        <div class="uc-fdrop" [class.active]="filter()[f.key].length > 0">
          <button type="button" class="uc-fbtn" (click)="toggle(f.key, $event)" [attr.aria-expanded]="open() === f.key" [attr.data-filter]="f.key">
            <span aria-hidden="true">{{ f.icon }}</span> {{ f.label }}
            @if (filter()[f.key].length) {
              <b>{{ filter()[f.key].length }}</b>
            }
            <span class="uc-caret" aria-hidden="true">▾</span>
          </button>
          @if (open() === f.key) {
            <div class="uc-pop" role="dialog" [attr.aria-label]="f.label + ' filter'" (click)="$event.stopPropagation()">
              @if (f.search) {
                <input class="uc-pop-search" type="search" [placeholder]="'Search ' + f.label.toLowerCase() + '…'" [value]="q()" (input)="q.set($any($event.target).value)" />
              }
              <div class="uc-pop-list">
                @for (o of optionsFor(f.key); track o.value) {
                  <label class="uc-pop-item">
                    <input type="checkbox" [checked]="filter()[f.key].includes(o.value)" (change)="flip(f.key, o.value)" />
                    <span>{{ o.icon ? o.icon + ' ' : '' }}{{ o.value }}</span>
                    <em>{{ o.n }}</em>
                  </label>
                } @empty {
                  <p class="uc-pop-empty">No matches</p>
                }
              </div>
              <div class="uc-pop-foot">
                <button type="button" (click)="clear(f.key)">Clear</button>
                <button type="button" class="primary" (click)="open.set(null)">Done</button>
              </div>
            </div>
          }
        </div>
      }
      @for (c of chips(); track c.key + c.value) {
        <span class="uc-chip">
          {{ c.value }}
          <button type="button" (click)="flip(c.key, c.value)" [attr.aria-label]="'Remove ' + c.value">×</button>
        </span>
      }
      @if (count()) {
        <button type="button" class="uc-reset" (click)="reset()">Reset filters</button>
      }
      <span class="uc-spacer"></span>
      <span class="uc-matching"><b>{{ matching().toLocaleString() }}</b> of {{ stats.members().length.toLocaleString() }} members match</span>
    </div>
  `,
})
export class UcFilters {
  protected readonly stats = inject(UserStatsService);
  private readonly host = inject(ElementRef<HTMLElement>);

  readonly filter = model<StatFilter>(emptyFilter());
  readonly range = model<RangeKey>('30d');
  readonly gran = model<Gran>('day');
  readonly dim = model<Dim>('none');
  readonly showRange = input(true);
  readonly showGran = input(true);
  readonly showDim = input(true);
  readonly matching = input(0);

  protected readonly ranges = RANGES;
  protected readonly grans = GRANS;
  protected readonly dims = DIMS;
  protected readonly filters = FILTERS;
  protected readonly open = signal<FilterKey | null>(null);
  protected readonly q = signal('');
  protected readonly allowed = computed(() => gransFor(this.range()));
  protected readonly count = computed(() => filterCount(this.filter()));

  protected readonly chips = computed(() => {
    const f = this.filter();
    return FILTERS.flatMap((d) => f[d.key].map((value) => ({ key: d.key, value })));
  });

  protected setRange(r: RangeKey): void {
    this.range.set(r);
    const allowed = gransFor(r);
    if (!allowed.includes(this.gran())) this.gran.set(RANGES.find((x) => x.key === r)!.gran);
  }

  protected optionsFor(key: FilterKey): { value: string; n: number; icon?: string }[] {
    const o = this.stats.options();
    const q = this.q().trim().toLowerCase();
    const f = this.filter();
    let list: { value: string; n: number; icon?: string }[];
    switch (key) {
      case 'regions':
        list = o.regions.map((r) => ({ ...r, icon: REGIONS.find((x) => x.name === r.value)?.icon ?? '🌐' }));
        break;
      case 'countries':
        list = o.countries;
        break;
      case 'cities':
        list = f.countries.length ? o.cities.filter((c) => f.countries.includes(o.cityCountry.get(c.value) ?? '')) : o.cities;
        break;
      case 'genders':
        list = o.genders;
        break;
      case 'ages':
        list = o.ages;
        break;
    }
    return q ? list.filter((x) => x.value.toLowerCase().includes(q)) : list.slice(0, 80);
  }

  protected toggle(key: FilterKey, e: Event): void {
    e.stopPropagation();
    this.q.set('');
    this.open.update((o) => (o === key ? null : key));
  }

  protected flip(key: FilterKey, value: string): void {
    this.filter.update((f) => {
      const list = f[key].includes(value) ? f[key].filter((v) => v !== value) : [...f[key], value];
      return { ...f, [key]: list };
    });
  }

  protected clear(key: FilterKey): void {
    this.filter.update((f) => ({ ...f, [key]: [] }));
  }

  protected reset(): void {
    this.filter.set(emptyFilter());
  }

  protected outside(e: Event): void {
    if (this.open() && !(this.host.nativeElement as HTMLElement).contains(e.target as Node)) this.open.set(null);
  }
}
