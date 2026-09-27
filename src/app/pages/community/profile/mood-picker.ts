import { Component, ElementRef, EventEmitter, HostListener, Input, Output, ViewChild, computed, signal } from '@angular/core';
import { TRAVEL_MOOD_GROUPS } from './travel-moods';

/**
 * Travel Mood opens as a popup: search one mood, and browse every type expanded,
 * with Collapse / Expand on each type.
 */
@Component({
  selector: 'app-mood-picker',
  template: `
    <div class="mood-picker">
      <label class="accessory-lbl" [attr.for]="inputId" (click)="openPopup($event)">Travel Mood:</label>
      <button type="button" class="mood-trigger" (click)="openPopup()">
        <span class="mood-trigger-value" [class.is-placeholder]="!value">{{ value || 'Choose a mood' }}</span>
        <span class="mood-trigger-action">Browse</span>
      </button>
      <p class="mood-hint">Opens a searchable list. Every type starts expanded — Collapse or Expand any type.</p>

      @if (popupOpen()) {
        <div class="mood-backdrop" (click)="closePopup()">
          <div
            class="mood-popup"
            role="dialog"
            aria-modal="true"
            aria-labelledby="mood-popup-title"
            (click)="$event.stopPropagation()"
          >
            <header class="mood-popup-head">
              <div>
                <p class="mood-kicker">Journey</p>
                <h2 id="mood-popup-title">Travel Mood</h2>
                <p class="mood-popup-note">Search for one mood and select it. Each type is expanded — Collapse or Expand as you like.</p>
              </div>
              <button type="button" class="mood-close" (click)="closePopup()" aria-label="Close">×</button>
            </header>

            <div class="mood-popup-search">
              <input
                #moodSearch
                [id]="inputId"
                type="search"
                [value]="query()"
                (input)="onSearch($event)"
                placeholder="Search a mood, for example aurora or street food"
                autocomplete="off"
                aria-label="Search travel moods"
              />
              <span class="mood-match-count">{{ matchCount() }} {{ matchCount() === 1 ? 'mood' : 'moods' }}</span>
            </div>

            <div class="mood-popup-list">
              @for (group of visibleGroups(); track group.label) {
                <section class="mood-type">
                  <div class="mood-type-head">
                    <button
                      type="button"
                      class="mood-type-toggle"
                      [attr.aria-expanded]="isExpanded(group.label)"
                      (click)="toggleGroup(group.label)"
                    >
                      <span>{{ group.label }}</span>
                      <span class="mood-type-count">{{ group.moods.length }}</span>
                    </button>
                    <button type="button" class="mood-collapse" (click)="toggleGroup(group.label)">
                      {{ isExpanded(group.label) ? 'Collapse' : 'Expand' }}
                    </button>
                  </div>
                  @if (isExpanded(group.label)) {
                    <div class="mood-type-list">
                      @for (mood of group.moods; track mood) {
                        <button
                          type="button"
                          class="mood-option"
                          [class.is-selected]="mood === value"
                          (click)="choose(mood)"
                        >
                          {{ mood }}
                        </button>
                      }
                    </div>
                  }
                </section>
              } @empty {
                <p class="mood-empty">No mood matches that search.</p>
              }
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styles: `
    .mood-picker { position: relative; display: flex; flex-direction: column; gap: 0.3rem; flex: 1 1 220px; min-width: 180px; }
    .accessory-lbl { font-size: 0.72rem; font-weight: 800; letter-spacing: 0.04em; text-transform: uppercase; color: var(--ct-ink2, #64748b); cursor: pointer; }
    .mood-trigger {
      display: flex; align-items: center; justify-content: space-between; gap: 0.6rem;
      width: 100%; text-align: left; cursor: pointer;
      border: 1px solid var(--ct-line, #e2e8f0); border-radius: 12px;
      background: var(--ct-sf, #fff); color: var(--ct-ink, #0f172a);
      padding: 0.55rem 0.7rem; font: inherit;
    }
    .mood-trigger:hover { border-color: #0f766e; }
    .mood-trigger-value { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .mood-trigger-value.is-placeholder { color: var(--ct-ink2, #94a3b8); }
    .mood-trigger-action {
      flex: none; font-size: 0.68rem; font-weight: 800; letter-spacing: 0.04em; text-transform: uppercase;
      color: #0f766e; background: #f0fdfa; border-radius: 999px; padding: 0.2rem 0.5rem;
    }
    .mood-hint { margin: 0; font-size: 0.72rem; color: var(--ct-ink2, #94a3b8); }
    .mood-backdrop {
      position: fixed; inset: 0; z-index: 100020;
      display: flex; align-items: flex-start; justify-content: center;
      padding: clamp(72px, 10vh, 96px) 1rem 1.5rem;
      background: rgba(15, 23, 42, 0.55);
      backdrop-filter: blur(4px);
    }
    .mood-popup {
      width: min(640px, 100%);
      max-height: min(78vh, 760px);
      display: flex; flex-direction: column;
      border-radius: 28px;
      background: var(--ct-sf, #fff);
      color: var(--ct-ink, #0f172a);
      box-shadow: 0 30px 70px -28px rgba(15, 23, 42, 0.55);
      overflow: hidden;
    }
    .mood-popup-head, .mood-popup-search, .mood-popup-list { padding-left: 1.35rem; padding-right: 1.35rem; }
    .mood-popup-head {
      display: flex; justify-content: space-between; gap: 1rem;
      padding-top: 1.25rem; padding-bottom: 0.7rem;
    }
    .mood-kicker { margin: 0; font-size: 0.72rem; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase; color: #0f766e; }
    .mood-popup-head h2 { margin: 0.15rem 0 0; font-size: 1.35rem; letter-spacing: -0.03em; }
    .mood-popup-note { margin: 0.35rem 0 0; max-width: 46ch; font-size: 0.84rem; line-height: 1.4; color: var(--ct-ink2, #64748b); }
    .mood-close { border: 0; background: var(--ct-sf2, #f1f5f9); color: inherit; width: 32px; height: 32px; border-radius: 50%; cursor: pointer; font-size: 1.2rem; line-height: 1; }
    .mood-popup-search { display: flex; flex-direction: column; gap: 0.35rem; padding-bottom: 0.75rem; }
    .mood-popup-search input {
      width: 100%; box-sizing: border-box;
      border: 1px solid var(--ct-line, #e2e8f0); border-radius: 14px;
      background: var(--ct-sf, #fff); color: inherit;
      padding: 0.75rem 0.85rem; font: inherit;
    }
    .mood-match-count { font-size: 0.72rem; font-weight: 700; color: var(--ct-ink2, #64748b); }
    .mood-popup-list { overflow: auto; padding-bottom: 1.15rem; display: flex; flex-direction: column; gap: 0.35rem; }
    .mood-type { border-top: 1px solid var(--ct-line, #e2e8f0); padding-top: 0.55rem; }
    .mood-type-head { display: flex; align-items: center; gap: 0.5rem; }
    .mood-type-toggle {
      flex: 1; display: flex; align-items: center; justify-content: space-between; gap: 0.5rem;
      border: 0; background: transparent; color: inherit; cursor: pointer;
      text-align: left; font: inherit; font-weight: 800; padding: 0.35rem 0;
    }
    .mood-type-count {
      font-size: 0.68rem; font-weight: 800; color: var(--ct-ink2, #64748b);
      background: var(--ct-sf2, #f1f5f9); border-radius: 999px; padding: 0.12rem 0.45rem;
    }
    .mood-collapse {
      flex: none; border: 1px solid var(--ct-line, #e2e8f0); background: var(--ct-sf, #fff); color: inherit;
      border-radius: 999px; padding: 0.28rem 0.7rem; font: inherit; font-size: 0.75rem; font-weight: 800; cursor: pointer;
    }
    .mood-collapse:hover { border-color: #0f766e; color: #0f766e; }
    .mood-type-list { display: flex; flex-wrap: wrap; gap: 0.4rem; padding: 0.15rem 0 0.75rem; }
    .mood-option {
      border: 1px solid var(--ct-line, #e2e8f0); background: var(--ct-sf, #fff); color: inherit;
      border-radius: 999px; padding: 0.38rem 0.72rem; font: inherit; font-size: 0.84rem; cursor: pointer;
    }
    .mood-option:hover { border-color: #0f766e; background: #f0fdfa; }
    .mood-option.is-selected { background: #0f172a; border-color: #0f172a; color: #fff; }
    .mood-empty { margin: 0.6rem 0; color: var(--ct-ink2, #64748b); }
  `,
})
export class MoodPicker {
  @Input() value = '';
  @Input() inputId = 'journey-travel-mood';
  @Output() valueChange = new EventEmitter<string>();
  @ViewChild('moodSearch') private searchInput?: ElementRef<HTMLInputElement>;

  protected readonly popupOpen = signal(false);
  protected readonly query = signal('');
  private readonly collapsed = signal<ReadonlySet<string>>(new Set());

  protected readonly visibleGroups = computed(() => {
    const query = this.query().trim().toLowerCase();
    if (!query) return TRAVEL_MOOD_GROUPS;
    return TRAVEL_MOOD_GROUPS.flatMap((group) => {
      const typeMatches = group.label.toLowerCase().includes(query);
      const moods = typeMatches ? [...group.moods] : group.moods.filter((mood) => mood.toLowerCase().includes(query));
      return moods.length ? [{ label: group.label, moods }] : [];
    });
  });

  protected matchCount(): number {
    return this.visibleGroups().reduce((count, group) => count + group.moods.length, 0);
  }

  protected isExpanded(label: string): boolean {
    return !this.collapsed().has(label);
  }

  protected openPopup(event?: Event): void {
    event?.preventDefault();
    this.collapsed.set(new Set());
    this.query.set('');
    this.popupOpen.set(true);
    setTimeout(() => this.searchInput?.nativeElement.focus());
  }

  protected closePopup(): void {
    this.popupOpen.set(false);
    this.query.set('');
  }

  protected onSearch(event: Event): void {
    const next = (event.target as HTMLInputElement).value;
    const wasEmpty = !this.query().trim();
    this.query.set(next);
    if (wasEmpty && next.trim()) this.collapsed.set(new Set());
  }

  protected toggleGroup(label: string): void {
    this.collapsed.update((current) => {
      const next = new Set(current);
      if (next.has(label)) next.delete(label);
      else next.add(label);
      return next;
    });
  }

  protected choose(mood: string): void {
    this.value = mood;
    this.valueChange.emit(mood);
    this.closePopup();
  }

  @HostListener('document:keydown.escape')
  protected onEscape(): void {
    if (this.popupOpen()) this.closePopup();
  }
}
