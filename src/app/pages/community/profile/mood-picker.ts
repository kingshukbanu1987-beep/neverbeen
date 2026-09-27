import { Component, EventEmitter, Input, Output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TRAVEL_MOOD_GROUPS, searchTravelMoods } from './travel-moods';

@Component({
  selector: 'app-mood-picker',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="mood-picker" [class.open]="open()">
      <label class="accessory-lbl" [attr.for]="inputId">Travel Mood:</label>
      <div class="mood-picker-field">
        <input
          [id]="inputId"
          type="search"
          class="mood-search"
          placeholder="Search a type or a mood"
          [ngModel]="query()"
          (ngModelChange)="onQuery($event)"
          (focus)="open.set(true)"
          autocomplete="off"
          aria-label="Search travel moods"
        />
        <button type="button" class="mood-current" (click)="open.set(!open())" [attr.aria-expanded]="open()">
          {{ value || 'Choose a mood' }}
        </button>
      </div>
      @if (open()) {
        <div class="mood-dropdown" role="listbox">
          @if (query().trim()) {
            @for (hit of matches(); track hit.kind + hit.label + hit.type) {
              @if (hit.kind === 'type') {
                <button type="button" class="mood-hit type" (click)="chooseType(hit.label)">
                  <small>Type</small>
                  <strong>{{ hit.label }}</strong>
                </button>
              } @else {
                <button type="button" class="mood-hit" (click)="choose(hit.mood || hit.label)">
                  <strong>{{ hit.label }}</strong>
                  <small>{{ hit.type }}</small>
                </button>
              }
            } @empty {
              <p class="mood-empty">No matching type or mood.</p>
            }
          } @else {
            @for (group of groups; track group.label) {
              <div class="mood-group" [class.open]="isOpen(group.label)">
                <button type="button" class="mood-group-toggle" (click)="toggle(group.label)">
                  <span>{{ group.label }}</span>
                  <span>{{ isOpen(group.label) ? '▴' : '▾' }}</span>
                </button>
                @if (isOpen(group.label)) {
                  @for (mood of group.moods; track mood) {
                    <button type="button" class="mood-option" [class.picked]="value === mood" (click)="choose(mood)">{{ mood }}</button>
                  }
                }
              </div>
            }
          }
        </div>
      }
    </div>
  `,
  styles: `
    :host { display: block; min-width: 220px; position: relative; }
    .mood-picker-field { display: flex; flex-direction: column; gap: 0.35rem; }
    .mood-search, .mood-current {
      width: 100%;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      background: #fff;
      padding: 0.45rem 0.7rem;
      font: inherit;
      text-align: left;
    }
    .mood-current { font-weight: 700; color: #0f172a; }
    .mood-dropdown {
      position: absolute;
      z-index: 30;
      left: 0;
      right: 0;
      top: calc(100% + 4px);
      max-height: 280px;
      overflow: auto;
      background: #fff;
      border: 1px solid #e2e8f0;
      border-radius: 16px;
      box-shadow: 0 18px 40px rgba(15, 23, 42, 0.12);
      padding: 0.35rem;
    }
    .mood-hit, .mood-option, .mood-group-toggle {
      width: 100%;
      border: 0;
      background: transparent;
      text-align: left;
      padding: 0.45rem 0.6rem;
      border-radius: 10px;
      font: inherit;
      cursor: pointer;
    }
    .mood-hit { display: flex; flex-direction: column; }
    .mood-hit small, .mood-group-toggle span:last-child { color: #64748b; }
    .mood-hit.type { background: #eef2ff; }
    .mood-hit:hover, .mood-option:hover, .mood-group-toggle:hover { background: #f8fafc; }
    .mood-option.picked { background: #ecfeff; font-weight: 700; }
    .mood-group-toggle { display: flex; justify-content: space-between; font-weight: 700; }
    .mood-empty { margin: 0.4rem 0.6rem; color: #64748b; }
  `,
})
export class MoodPicker {
  @Input() value = '';
  @Input() inputId = 'journey-travel-mood';
  @Output() valueChange = new EventEmitter<string>();

  protected readonly groups = TRAVEL_MOOD_GROUPS;
  protected readonly open = signal(false);
  protected readonly query = signal('');
  protected readonly matches = signal(searchTravelMoods(''));
  private readonly opened = signal<string[]>([]);

  protected onQuery(value: string): void {
    this.query.set(value);
    this.matches.set(searchTravelMoods(value));
    this.open.set(true);
  }

  protected isOpen(label: string): boolean {
    return this.opened().includes(label);
  }

  protected toggle(label: string): void {
    this.opened.update((list) => (list.includes(label) ? list.filter((item) => item !== label) : [...list, label]));
  }

  protected choose(mood: string): void {
    this.valueChange.emit(mood);
    this.query.set('');
    this.open.set(false);
  }

  protected chooseType(label: string): void {
    this.opened.set([label]);
    this.query.set('');
    const group = this.groups.find((item) => item.label === label);
    if (group) this.valueChange.emit(group.moods[0]);
    this.open.set(true);
  }
}
