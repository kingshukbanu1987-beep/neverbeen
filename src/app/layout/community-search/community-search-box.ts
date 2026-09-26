import { Component, DestroyRef, ElementRef, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { Circle, Companion } from '../../models/community';
import { CommunityService } from '../../services/community.service';

/**
 * The Community search box — lives in the community page header (top left) on
 * laptop/tablet screens so the member can find travelers, companions and
 * circles from anywhere in the Community. Selecting a result navigates:
 *
 *   traveler → /profile?id=<uid>   (opens that member's profile)
 *   circle   → /profile#circles    (the Circles section)
 */
@Component({
  selector: 'app-community-search-box',
  standalone: true,
  imports: [CommonModule, FormsModule],
  host: { class: 'csb-host' },
  template: `
    <div class="csb" [class.is-open]="open()">
      <div class="csb-input-wrapper">
        <svg viewBox="0 0 24 24" class="csb-icon" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
          <circle cx="11" cy="11" r="8"></circle>
          <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
        </svg>
        <input
          type="text"
          class="csb-input"
          placeholder="Search travelers, companions, or circles…"
          aria-label="Search travelers, companions, or circles"
          [value]="query()"
          (focus)="onFocus()"
          (input)="onInput($event)"
          (keydown.escape)="close()"
          (keydown.arrowdown)="move(1, $event)"
          (keydown.arrowup)="move(-1, $event)"
          (keydown.enter)="pickHighlighted($event)"
        />
        @if (query()) {
          <button type="button" class="csb-clear" (click)="clear()" aria-label="Clear search">✕</button>
        }
      </div>

      @if (open() && (results().travelers.length > 0 || results().circles.length > 0)) {
        <div class="csb-dropdown" role="listbox" aria-label="Search results">
          @if (results().travelers.length > 0) {
            <div class="csb-group">
              <span class="csb-group-label">Travelers</span>
              @for (t of results().travelers; track t.id) {
                <div class="csb-item" (click)="openTraveler(t)" role="option" tabindex="0">
                  <img [src]="t.profilePhotoUrl" [alt]="t.fullName" class="csb-avatar" />
                  <div class="csb-item-info">
                    <strong>
                      {{ t.fullName }}
                      @if (isVerified(t)) {
                        <span class="csb-verified" title="Verified Account" aria-label="Verified">
                          <svg viewBox="0 0 24 24"><path fill="#ffffff" d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/></svg>
                        </span>
                      }
                      @if (t.isProfileLocked) {
                        <span class="csb-lock" title="Profile is locked">🔒</span>
                      }
                    </strong>
                    <span>{{ t.city }}, {{ t.country }} • {{ t.profession }}</span>
                  </div>
                  <div class="csb-item-action">
                    @if (t.status === 'connected') {
                      <span class="csb-status connected">Connected</span>
                    } @else if (t.status === 'pending_outgoing') {
                      <span class="csb-status pending">Request Sent</span>
                    } @else {
                      <button
                        type="button"
                        class="csb-connect"
                        (click)="$event.stopPropagation(); connect(t.id)"
                      >
                        + Connect
                      </button>
                    }
                  </div>
                </div>
              }
            </div>
          }

          @if (results().circles.length > 0) {
            <div class="csb-group">
              <span class="csb-group-label">Circles</span>
              @for (c of results().circles; track c.id) {
                <div class="csb-item" (click)="openCircles()" role="option" tabindex="0">
                  <span class="csb-circle-badge" [style.background]="c.color">{{ c.icon }}</span>
                  <div class="csb-item-info">
                    <strong>{{ c.name }}</strong>
                    <span>{{ c.memberIds.length }} members • {{ c.description }}</span>
                  </div>
                </div>
              }
            </div>
          }
        </div>
      } @else if (open() && query().trim().length >= 2 && results().travelers.length === 0 && results().circles.length === 0) {
        <div class="csb-dropdown csb-empty">No travelers or circles match “{{ query() }}”.</div>
      }
    </div>
  `,
  styles: `
    .csb-host {
      position: relative;
    }

    .csb {
      position: relative;
      font-family: 'Outfit', system-ui, sans-serif;
    }

    .csb-input-wrapper {
      display: flex;
      align-items: center;
      gap: 0.45rem;
      height: 38px;
      padding: 0 0.8rem;
      border-radius: 999px;
      border: 1px solid var(--ct-ln, #e2e8f0);
      background: var(--ct-sf, #ffffff);
      box-shadow: 0 1px 3px rgba(2, 8, 23, 0.06);
      transition: border-color 0.18s ease, box-shadow 0.18s ease;
    }

    .csb.is-open .csb-input-wrapper,
    .csb-input-wrapper:focus-within {
      border-color: rgb(var(--ct-ac-rgb, 37 99 235) / 0.55);
      box-shadow: 0 0 0 3px rgb(var(--ct-ac-rgb, 37 99 235) / 0.15);
    }

    .csb-icon {
      width: 15px;
      height: 15px;
      color: var(--ct-mu, #64748b);
      flex: none;
    }

    .csb-input {
      flex: 1;
      min-width: 0;
      border: none;
      outline: none;
      background: transparent;
      font: inherit;
      font-size: 0.84rem;
      font-weight: 600;
      color: var(--ct-ink, #0f172a);
    }

    .csb-input::placeholder {
      color: var(--ct-fa, #94a3b8);
      font-weight: 500;
    }

    .csb-clear {
      border: none;
      background: none;
      cursor: pointer;
      font-size: 0.78rem;
      color: var(--ct-fa, #94a3b8);
      padding: 0 0.1rem;
      line-height: 1;
      flex: none;
    }

    .csb-dropdown {
      position: absolute;
      top: calc(100% + 8px);
      left: 0;
      width: min(400px, 86vw);
      max-height: min(420px, 70vh);
      overflow-y: auto;
      border-radius: 16px;
      border: 1px solid var(--ct-ln, #e2e8f0);
      background: rgb(var(--ct-sf-rgb, 255 255 255) / 0.98);
      box-shadow:
        0 24px 56px -18px rgba(2, 8, 23, 0.4),
        0 6px 18px -8px rgba(2, 8, 23, 0.2);
      padding: 0.5rem;
      z-index: 1000;
    }

    .csb-empty {
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 1.1rem 1rem;
      font-size: 0.85rem;
      font-weight: 600;
      color: var(--ct-mu, #64748b);
    }

    .csb-group {
      padding: 0.25rem;
    }

    .csb-group + .csb-group {
      border-top: 1px solid var(--ct-ln, #e2e8f0);
      margin-top: 0.35rem;
    }

    .csb-group-label {
      display: block;
      padding: 0.3rem 0.5rem;
      font-size: 0.68rem;
      font-weight: 800;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      color: var(--ct-fa, #94a3b8);
    }

    .csb-item {
      display: flex;
      align-items: center;
      gap: 0.65rem;
      padding: 0.5rem;
      border-radius: 12px;
      cursor: pointer;
      transition: background 0.15s ease;
    }

    .csb-item:hover {
      background: rgb(var(--ct-ink-rgb, 15 23 42) / 0.05);
    }

    .csb-avatar {
      width: 38px;
      height: 38px;
      border-radius: 50%;
      object-fit: cover;
      flex: none;
      background: var(--ct-ln, #e2e8f0);
    }

    .csb-circle-badge {
      width: 38px;
      height: 38px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.05rem;
      flex: none;
    }

    .csb-item-info {
      flex: 1;
      min-width: 0;
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .csb-item-info strong {
      font-size: 0.87rem;
      font-weight: 700;
      color: var(--ct-ink, #0f172a);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      display: flex;
      align-items: center;
      gap: 5px;
    }

    .csb-item-info span {
      font-size: 0.74rem;
      color: var(--ct-mu, #64748b);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .csb-verified {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 15px;
      height: 15px;
      border-radius: 50%;
      background: linear-gradient(135deg, #38bdf8, #2563eb);
      flex: none;
    }
    .csb-verified svg {
      width: 9px;
      height: 9px;
    }

    .csb-lock {
      font-size: 0.7rem;
    }

    .csb-item-action {
      flex: none;
    }

    .csb-status {
      font-size: 0.68rem;
      font-weight: 700;
      padding: 0.2rem 0.55rem;
      border-radius: 999px;
    }
    .csb-status.connected {
      color: #047857;
      background: rgba(16, 185, 129, 0.14);
    }
    .csb-status.pending {
      color: #b45309;
      background: rgba(245, 158, 11, 0.14);
    }
    html[data-ctheme-mode='dark'] .csb-status.connected {
      color: #6ee7b7;
      background: rgba(16, 185, 129, 0.18);
    }
    html[data-ctheme-mode='dark'] .csb-status.pending {
      color: #fcd34d;
      background: rgba(245, 158, 11, 0.16);
    }

    .csb-connect {
      border: none;
      background: var(--ct-ac, #2563eb);
      color: var(--ct-act, #ffffff);
      font: inherit;
      font-size: 0.74rem;
      font-weight: 700;
      padding: 0.35rem 0.8rem;
      border-radius: 999px;
      cursor: pointer;
    }
  `,
})
export class CommunitySearchBox implements OnInit {
  private readonly service = inject(CommunityService);
  private readonly router = inject(Router);
  private readonly host = inject(ElementRef<HTMLElement>);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly query = signal('');
  protected readonly open = signal(false);

  /** Same matching rules as the profile page search (name / city / country / profession). */
  protected readonly results = computed(() => {
    const q = this.query().trim().toLowerCase();
    if (!q) return { travelers: [] as Companion[], circles: [] as Circle[] };

    const travelers = this.service
      .companions()
      .filter(
        (c) =>
          !this.service.isUserBlocked(c.id) &&
          (c.fullName.toLowerCase().includes(q) ||
            c.city.toLowerCase().includes(q) ||
            c.country.toLowerCase().includes(q) ||
            c.profession.toLowerCase().includes(q)),
      );

    const circles = this.service
      .circles()
      .filter((cr) => cr.name.toLowerCase().includes(q) || cr.description.toLowerCase().includes(q));

    return { travelers, circles };
  });

  ngOnInit(): void {
    // Close when clicking anywhere outside the search box.
    const onDocClick = (e: MouseEvent): void => {
      if (this.open() && !(this.host.nativeElement as HTMLElement).contains(e.target as Node)) {
        this.close();
      }
    };
    document.addEventListener('click', onDocClick, true);
    this.destroyRef.onDestroy(() => document.removeEventListener('click', onDocClick, true));
  }

  protected onFocus(): void {
    if (this.query().trim()) this.open.set(true);
  }

  protected onInput(e: Event): void {
    this.query.set((e.target as HTMLInputElement).value);
    this.open.set(this.query().trim().length > 0);
  }

  protected clear(): void {
    this.query.set('');
    this.open.set(false);
    const input = this.root().querySelector('.csb-input') as HTMLInputElement | null;
    input?.focus();
  }

  protected close(): void {
    this.open.set(false);
  }

  protected isVerified(t: Companion): boolean {
    return !!t.isVerified;
  }

  protected openTraveler(t: Companion): void {
    this.open.set(false);
    this.query.set('');
    this.router.navigate(['/profile'], {
      queryParams: { id: t.uniqueId ?? String(t.id) },
    });
  }

  protected openCircles(): void {
    this.open.set(false);
    this.query.set('');
    this.router.navigate(['/profile'], { fragment: 'circles' });
  }

  protected connect(companionId: number): void {
    this.service.sendCompanionshipRequest(companionId);
  }

  private root(): HTMLElement {
    return this.host.nativeElement as HTMLElement;
  }

  // Keyboard list navigation (ArrowUp/Down + Enter) across the visible results.
  protected move(_dir: number, e: Event): void {
    // Simple roving focus over the visible result items.
    const items = Array.from(this.root().querySelectorAll('.csb-item')) as HTMLElement[];
    if (!items.length) return;
    e.preventDefault();
    const active = document.activeElement as HTMLElement | null;
    const at = active ? items.indexOf(active) : -1;
    const next = _dir > 0 ? (at + 1) % items.length : (at - 1 + items.length) % items.length;
    items[next].focus();
  }

  protected pickHighlighted(e: Event): void {
    const active = document.activeElement as HTMLElement | null;
    if (active?.classList.contains('csb-item')) {
      e.preventDefault();
      active.click();
    } else {
      const first = this.root().querySelector('.csb-item') as HTMLElement | null;
      if (first) {
        e.preventDefault();
        first.click();
      }
    }
  }
}
