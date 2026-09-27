import { Component, EventEmitter, Input, Output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  ABOUT_FIELD_LABELS,
  AboutFieldKey,
  Companion,
  CustomAudienceMode,
  FieldAudience,
  FieldVisibility,
} from '../../../models/community';

interface AudienceOption {
  id: FieldVisibility;
  label: string;
  hint: string;
  icon: string;
}

const OPTIONS: AudienceOption[] = [
  { id: 'public', label: 'Public', hint: 'Everyone can see this', icon: '🌐' },
  { id: 'companions', label: 'Companions', hint: 'Only companions can see this', icon: '👥' },
  { id: 'private', label: 'Private', hint: 'Only you can see this', icon: '🔒' },
  { id: 'custom', label: 'Customize', hint: 'Pick who can or cannot see this', icon: '✨' },
];

/**
 * Ultra-modern audience picker for one About me field.
 * Public / Companions / Private, plus a customize list of companions.
 */
@Component({
  selector: 'app-field-audience',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="fa" [class.is-open]="menuOpen()">
      <button type="button" class="fa-trigger" (click)="toggleMenu($event)" [attr.aria-expanded]="menuOpen()" [attr.aria-label]="'Who can see ' + fieldLabel()">
        <span class="fa-ico" aria-hidden="true">{{ current().icon }}</span>
        <span class="fa-copy">
          <small>Who can see</small>
          <b>{{ current().label }}</b>
        </span>
        <span class="fa-chev" aria-hidden="true">▾</span>
      </button>

      @if (menuOpen()) {
        <div class="fa-menu" (click)="$event.stopPropagation()">
          <p class="fa-menu-kicker">{{ fieldLabel() }}</p>
          @for (opt of options; track opt.id) {
            <button type="button" class="fa-opt" [class.is-on]="opt.id === visibility()" (click)="pick(opt.id)">
              <span class="fa-opt-ico" aria-hidden="true">{{ opt.icon }}</span>
              <span>
                <b>{{ opt.label }}</b>
                <small>{{ opt.hint }}</small>
              </span>
              @if (opt.id === visibility()) {
                <span class="fa-check" aria-hidden="true">✓</span>
              }
            </button>
          }

          @if (visibility() === 'custom') {
            <div class="fa-custom">
              <div class="fa-seg" role="tablist" aria-label="Customize audience">
                <button type="button" [class.is-on]="mode() === 'allow'" (click)="setMode('allow')">Only these can see</button>
                <button type="button" [class.is-on]="mode() === 'deny'" (click)="setMode('deny')">Hide from these</button>
              </div>
              <p class="fa-custom-hint">
                @if (mode() === 'allow') {
                  Only the companions you tick can see this. Everyone else cannot.
                } @else {
                  Everyone can see this except the companions you tick.
                }
              </p>
              <input type="search" class="fa-search" placeholder="Search companions…" [ngModel]="query()" (ngModelChange)="query.set($event)" />
              @if (selectedCompanions().length > 0) {
                <div class="fa-chips">
                  @for (c of selectedCompanions(); track c.id) {
                    <button type="button" class="fa-chip" (click)="toggleCompanion(c.id)">
                      {{ c.fullName }} <span aria-hidden="true">×</span>
                    </button>
                  }
                </div>
              }
              <div class="fa-list">
                @for (c of filtered(); track c.id) {
                  <label class="fa-row">
                    <input type="checkbox" [checked]="isSelected(c.id)" (change)="toggleCompanion(c.id)" />
                    <img [src]="c.profilePhotoUrl" [alt]="" />
                    <span>
                      <b>{{ c.fullName }}</b>
                      <small>{{ c.city }}</small>
                    </span>
                  </label>
                } @empty {
                  <p class="fa-empty">No companions match that search.</p>
                }
              </div>
            </div>
          }
        </div>
      }
    </div>
  `,
  styles: `
    :host { display: inline-flex; position: relative; z-index: 5; }
    .fa { position: relative; }
    .fa-trigger {
      display: inline-flex;
      align-items: center;
      gap: 0.45rem;
      border: 1px solid rgb(var(--ct-ac-rgb, 37 99 235) / 0.28);
      background: linear-gradient(180deg, rgb(var(--ct-sf-rgb, 255 255 255) / 0.96), rgb(var(--ct-sf2-rgb, 248 250 252) / 0.96));
      color: var(--ct-ink, #0f172a);
      border-radius: 999px;
      padding: 0.28rem 0.7rem 0.28rem 0.35rem;
      cursor: pointer;
      font: inherit;
      box-shadow: 0 8px 20px -16px rgba(37, 99, 235, 0.8);
    }
    .fa-trigger:hover { border-color: rgb(var(--ct-ac-rgb, 37 99 235) / 0.55); }
    .fa-ico {
      width: 28px;
      height: 28px;
      border-radius: 999px;
      display: grid;
      place-items: center;
      background: rgb(var(--ct-ac-rgb, 37 99 235) / 0.12);
      font-size: 0.9rem;
    }
    .fa-copy { display: flex; flex-direction: column; align-items: flex-start; line-height: 1.05; }
    .fa-copy small { font-size: 0.62rem; letter-spacing: 0.04em; text-transform: uppercase; color: var(--ct-mu, #64748b); font-weight: 700; }
    .fa-copy b { font-size: 0.78rem; }
    .fa-chev { color: var(--ct-mu, #64748b); font-size: 0.75rem; }
    .fa-menu {
      position: absolute;
      top: calc(100% + 8px);
      right: 0;
      width: min(340px, 78vw);
      max-height: min(460px, 70vh);
      overflow: auto;
      padding: 0.55rem;
      border-radius: 18px;
      background: rgb(var(--ct-sf-rgb, 255 255 255) / 0.98);
      border: 1px solid var(--ct-ln, #e2e8f0);
      box-shadow: 0 24px 50px -24px rgba(2, 8, 23, 0.45);
      z-index: 40;
    }
    .fa-menu-kicker {
      margin: 0.15rem 0.45rem 0.4rem;
      font-size: 0.68rem;
      font-weight: 800;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: var(--ct-fa, #94a3b8);
    }
    .fa-opt {
      width: 100%;
      display: flex;
      align-items: center;
      gap: 0.6rem;
      text-align: left;
      border: none;
      background: transparent;
      border-radius: 12px;
      padding: 0.45rem 0.5rem;
      cursor: pointer;
      font: inherit;
      color: var(--ct-ink, #0f172a);
    }
    .fa-opt:hover, .fa-opt.is-on { background: rgb(var(--ct-ac-rgb, 37 99 235) / 0.08); }
    .fa-opt b, .fa-opt small { display: block; }
    .fa-opt small { color: var(--ct-mu, #64748b); font-size: 0.72rem; font-weight: 600; }
    .fa-opt-ico { width: 28px; text-align: center; }
    .fa-check { margin-left: auto; color: var(--ct-ac, #2563eb); font-weight: 800; }
    .fa-custom { margin-top: 0.35rem; padding-top: 0.45rem; border-top: 1px solid var(--ct-ln, #e2e8f0); }
    .fa-seg { display: grid; grid-template-columns: 1fr 1fr; gap: 0.3rem; }
    .fa-seg button {
      border: 1px solid var(--ct-ln, #e2e8f0);
      background: transparent;
      border-radius: 999px;
      padding: 0.35rem 0.4rem;
      font: inherit;
      font-size: 0.72rem;
      font-weight: 750;
      cursor: pointer;
      color: var(--ct-ink2, #334155);
    }
    .fa-seg button.is-on {
      background: var(--ct-ac, #2563eb);
      color: #fff;
      border-color: transparent;
    }
    .fa-custom-hint { margin: 0.45rem 0.15rem; font-size: 0.75rem; color: var(--ct-mu, #64748b); line-height: 1.35; }
    .fa-search {
      width: 100%;
      border: 1px solid var(--ct-ln2, #cbd5e1);
      border-radius: 999px;
      padding: 0.4rem 0.75rem;
      font: inherit;
      font-size: 0.8rem;
      background: var(--ct-sf, #fff);
      color: var(--ct-ink, #0f172a);
    }
    .fa-chips { display: flex; flex-wrap: wrap; gap: 0.3rem; margin: 0.45rem 0; }
    .fa-chip {
      border: none;
      background: rgb(var(--ct-ac-rgb, 37 99 235) / 0.12);
      color: var(--ct-ink, #0f172a);
      border-radius: 999px;
      padding: 0.2rem 0.55rem;
      font: inherit;
      font-size: 0.72rem;
      font-weight: 700;
      cursor: pointer;
    }
    .fa-list { display: flex; flex-direction: column; gap: 0.15rem; max-height: 180px; overflow: auto; margin-top: 0.35rem; }
    .fa-row {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.3rem 0.25rem;
      border-radius: 10px;
      cursor: pointer;
    }
    .fa-row:hover { background: rgb(var(--ct-ink-rgb, 15 23 42) / 0.04); }
    .fa-row img { width: 28px; height: 28px; border-radius: 50%; object-fit: cover; }
    .fa-row b, .fa-row small { display: block; }
    .fa-row b { font-size: 0.8rem; }
    .fa-row small { color: var(--ct-mu, #64748b); font-size: 0.68rem; }
    .fa-empty { margin: 0.4rem; font-size: 0.78rem; color: var(--ct-mu, #64748b); }
  `,
})
export class FieldAudienceControl {
  @Input() field: AboutFieldKey = 'intro';
  @Input() audience: FieldAudience = { visibility: 'public' };
  @Input() companions: Companion[] = [];
  @Output() audienceChange = new EventEmitter<FieldAudience>();

  protected readonly options = OPTIONS;
  protected readonly menuOpen = signal(false);
  protected readonly query = signal('');

  protected fieldLabel(): string {
    return ABOUT_FIELD_LABELS[this.field] ?? 'This information';
  }

  protected visibility(): FieldVisibility {
    return this.audience?.visibility ?? 'public';
  }

  protected mode(): CustomAudienceMode {
    return this.audience?.customMode ?? 'allow';
  }

  protected current(): AudienceOption {
    return OPTIONS.find((o) => o.id === this.visibility()) ?? OPTIONS[0];
  }

  protected selectedCompanions(): Companion[] {
    const ids = new Set(this.audience?.companionIds ?? []);
    return this.companions.filter((c) => ids.has(c.id));
  }

  protected filtered(): Companion[] {
    const q = this.query().trim().toLowerCase();
    const connected = this.companions.filter((c) => c.status === 'connected');
    if (!q) return connected.slice(0, 40);
    return connected.filter((c) => c.fullName.toLowerCase().includes(q) || c.city.toLowerCase().includes(q)).slice(0, 40);
  }

  protected isSelected(id: number): boolean {
    return (this.audience?.companionIds ?? []).includes(id);
  }

  protected toggleMenu(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    this.menuOpen.update((v) => !v);
  }

  protected pick(id: FieldVisibility): void {
    const next: FieldAudience = {
      visibility: id,
      customMode: this.mode(),
      companionIds: this.audience?.companionIds ?? [],
    };
    this.audience = next;
    this.audienceChange.emit(next);
    if (id !== 'custom') this.menuOpen.set(false);
  }

  protected setMode(mode: CustomAudienceMode): void {
    const next: FieldAudience = {
      visibility: 'custom',
      customMode: mode,
      companionIds: this.audience?.companionIds ?? [],
    };
    this.audience = next;
    this.audienceChange.emit(next);
  }

  protected toggleCompanion(id: number): void {
    const current = this.audience?.companionIds ?? [];
    const companionIds = current.includes(id) ? current.filter((x) => x !== id) : [...current, id];
    const next: FieldAudience = {
      visibility: 'custom',
      customMode: this.mode(),
      companionIds,
    };
    this.audience = next;
    this.audienceChange.emit(next);
  }
}
