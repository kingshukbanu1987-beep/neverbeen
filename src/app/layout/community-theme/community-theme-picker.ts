import { Component, DestroyRef, ElementRef, ViewEncapsulation, computed, effect, inject, signal, untracked } from '@angular/core';
import { COMMUNITY_THEMES, CommunityThemeId, CommunityThemeService } from './community-themes';

/**
 * Theme dropdown shown in the website header while the member is in the Community.
 * Loaded lazily (@defer) by the navbar, so the rest of the website never downloads it.
 * Unencapsulated: it also carries the theme token sheet (community-themes.css), which
 * Angular removes again when the picker is destroyed (i.e. when leaving the Community).
 */
@Component({
  selector: 'app-community-theme-picker',
  encapsulation: ViewEncapsulation.None,
  styleUrls: ['./community-themes.css', './community-theme-picker.css'],
  host: { class: 'ctp-host' },
  template: `
    <div class="ctp" [class.is-open]="open()">
      <button
        #trigger
        type="button"
        class="ctp-trigger"
        aria-haspopup="listbox"
        [attr.aria-expanded]="open()"
        aria-controls="ctp-listbox"
        [attr.aria-label]="'Community theme: ' + current().name + '. Change theme'"
        title="Change the look of your Community pages"
        (click)="toggle()"
        (keydown.arrowDown)="openAndFocus($event)"
      >
        <span class="ctp-swatch" [style.background]="current().preview" aria-hidden="true">
          <i [style.background]="current().accent"></i>
        </span>
        <span class="ctp-trigger-text">
          <small>Theme</small>
          <b>{{ current().name }}</b>
        </span>
        <svg class="ctp-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" aria-hidden="true">
          <path d="m6 9 6 6 6-6"></path>
        </svg>
      </button>

      @if (open()) {
        <div class="ctp-panel" (keydown)="onPanelKey($event)">
          <div class="ctp-head">
            <div>
              <b>Community theme</b>
              <small>Changes your profile, pages and chats instantly. The rest of the website keeps its usual look.</small>
            </div>
            <button type="button" class="ctp-close" (click)="close(true)" aria-label="Close theme menu">✕</button>
          </div>
          <div id="ctp-listbox" class="ctp-list" role="listbox" aria-label="Community theme" [attr.aria-activedescendant]="'ctp-opt-' + themeId()">
            @for (t of themes; track t.id) {
              <button
                type="button"
                role="option"
                class="ctp-option"
                [id]="'ctp-opt-' + t.id"
                [attr.data-theme]="t.id"
                [class.is-selected]="t.id === themeId()"
                [attr.aria-selected]="t.id === themeId()"
                (click)="pick(t.id)"
              >
                <span class="ctp-preview" [style.background]="t.preview" aria-hidden="true">
                  <i class="ctp-chip-surface" [style.background]="t.surface"></i>
                  <i class="ctp-chip-accent" [style.background]="t.accent"></i>
                </span>
                <span class="ctp-option-text">
                  <b><span class="ctp-icon" aria-hidden="true">{{ t.icon }}</span>{{ t.name }}</b>
                  <small>{{ t.palette }}</small>
                  <em>{{ t.audience }}</em>
                </span>
                <span class="ctp-check" aria-hidden="true">
                  @if (t.id === themeId()) {
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="M5 12.5l4.5 4.5L19 7.5"></path></svg>
                  }
                </span>
              </button>
            }
          </div>
        </div>
      }
    </div>
  `,
})
export class CommunityThemePicker {
  private readonly svc = inject(CommunityThemeService);
  private readonly host = inject(ElementRef<HTMLElement>);

  protected readonly themes = COMMUNITY_THEMES;
  protected readonly open = signal(false);
  protected readonly themeId = this.svc.themeId;
  protected readonly current = computed(() => this.svc.theme());

  constructor() {
    let first = true;
    // Apply on load / member switch / selection — immediately, everywhere in the Community.
    effect(() => {
      this.svc.themeId();
      untracked(() => this.svc.apply(!first));
      first = false;
    });
    effect(() => document.documentElement.classList.toggle('ctp-open', this.open()));

    const onDocClick = (e: MouseEvent) => {
      if (this.open() && !(this.host.nativeElement as HTMLElement).contains(e.target as Node)) this.close();
    };
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && this.open()) this.close(true);
    };
    document.addEventListener('click', onDocClick, true);
    document.addEventListener('keydown', onEsc);
    inject(DestroyRef).onDestroy(() => {
      document.removeEventListener('click', onDocClick, true);
      document.removeEventListener('keydown', onEsc);
      this.svc.clear();
    });
  }

  protected toggle(): void {
    if (this.open()) this.close();
    else this.openAndFocus();
  }

  protected openAndFocus(e?: Event): void {
    e?.preventDefault();
    this.open.set(true);
    // Focus the selected option once the panel renders.
    setTimeout(() => this.options()[this.selectedIndex()]?.focus());
  }

  protected close(returnFocus = false): void {
    this.open.set(false);
    if (returnFocus) setTimeout(() => (this.host.nativeElement as HTMLElement).querySelector<HTMLButtonElement>('.ctp-trigger')?.focus());
  }

  protected pick(id: CommunityThemeId): void {
    this.svc.select(id);
    this.close(true);
  }

  protected onPanelKey(e: KeyboardEvent): void {
    const opts = this.options();
    if (!opts.length) return;
    const at = opts.indexOf(document.activeElement as HTMLButtonElement);
    let next = -1;
    if (e.key === 'ArrowDown') next = at < 0 ? this.selectedIndex() : (at + 1) % opts.length;
    else if (e.key === 'ArrowUp') next = at < 0 ? this.selectedIndex() : (at - 1 + opts.length) % opts.length;
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = opts.length - 1;
    else if (e.key === 'Tab') {
      this.close();
      return;
    }
    if (next >= 0) {
      e.preventDefault();
      opts[next].focus();
    }
  }

  private options(): HTMLButtonElement[] {
    return Array.from((this.host.nativeElement as HTMLElement).querySelectorAll<HTMLButtonElement>('.ctp-option'));
  }

  private selectedIndex(): number {
    return Math.max(0, this.themes.findIndex((t) => t.id === this.themeId()));
  }
}
