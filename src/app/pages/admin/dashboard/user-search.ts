import { Component, computed, inject, signal } from '@angular/core';
import { AdminInsightsService, MemberInsight, shortDate } from '../shared/admin-insights.service';
import { AccountState, accountStateLabel } from '../../../services/admin-moderation.service';
import { AdminConfirmDialog } from '../shared/admin-confirm-dialog';
import { ManageUserButton } from '../shared/manage-user-button';

/** K — Find any user by name / UID / email / city and disable (or re-enable) their account. */
@Component({
  selector: 'app-admin-user-search',
  imports: [AdminConfirmDialog, ManageUserButton],
  template: `
    <section class="us-card">
      <div class="us-intro">
        <h3>🔎 Find a user</h3>
        <p>Search any member — open <b>Manage</b> for full account details, or disable the account instantly.</p>
      </div>
      <div class="us-box-wrap">
        <label class="us-box" [class.open]="term().length > 0">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
            <circle cx="11" cy="11" r="7"></circle>
            <line x1="21" y1="21" x2="16.5" y2="16.5"></line>
          </svg>
          <input
            type="search"
            placeholder="Name, 20-digit UID, email, city or country…"
            [value]="term()"
            (input)="term.set($any($event.target).value)"
            (keydown.escape)="term.set('')"
            aria-label="Find a user"
            autocomplete="off"
          />
          @if (term()) {
            <span class="us-count">{{ matches().length }} found</span>
          }
        </label>

        @if (term().trim().length > 0) {
          <div class="us-results" role="listbox">
            @if (matches().length === 0) {
              <p class="us-empty">No member matches “{{ term() }}”.</p>
            } @else {
              @for (m of matches().slice(0, 8); track m.id) {
                <div class="us-row" [class.is-disabled]="m.accountState === 'disabled'" [attr.data-state]="m.accountState">
                  <span class="us-photo">
                    @if (m.photo) {
                      <img [src]="m.photo" [alt]="m.fullName" loading="lazy" />
                    } @else {
                      <span class="us-initial">{{ m.fullName[0] }}</span>
                    }
                    <i class="us-online" [class.on]="m.isOnline" [title]="m.isOnline ? 'Online now' : 'Offline'"></i>
                  </span>
                  <span class="us-meta">
                    <span class="us-name-row">
                      <strong>{{ m.fullName }}</strong>
                      @if (m.isVerified) {
                        <span class="g-tick" title="Verified">✓</span>
                      }
                      <span class="us-state" [class]="'us-state ' + stateTone(m.accountState)">{{ stateLabel(m.accountState) }}</span>
                    </span>
                    <small class="us-sub">{{ m.profession }}<i aria-hidden="true">·</i>📍 {{ m.city ? m.city + ', ' : '' }}{{ m.country }}</small>
                    <small class="us-mono">UID {{ m.uniqueId }}<i aria-hidden="true">·</i>{{ m.email }}<i aria-hidden="true">·</i>joined {{ shortDate(m.registeredAtUtc) }}</small>
                  </span>
                  <span class="us-actions" role="group" [attr.aria-label]="'Actions for ' + m.fullName">
                    <app-manage-user-btn [userId]="m.id" [name]="m.fullName" variant="segment" />
                    @if (m.accountState === 'disabled') {
                      <button type="button" class="us-act enable" (click)="insights.enable(m.id)" [attr.aria-label]="'Enable ' + m.fullName">✓ Enable</button>
                    } @else {
                      <button type="button" class="us-act disable" (click)="target.set(m)" [attr.aria-label]="'Disable ' + m.fullName">⛔ Disable</button>
                    }
                  </span>
                </div>
              }
              @if (matches().length > 8) {
                <p class="us-more">+ {{ matches().length - 8 }} more — refine your search</p>
              }
            }
          </div>
        }
      </div>
    </section>

    @if (target(); as m) {
      <app-admin-confirm-dialog
        heading="Disable this account?"
        [message]="m.fullName + ' (UID ' + m.uniqueId + ') will be signed out and hidden from the community until an admin re-enables the account.'"
        confirmLabel="Disable account"
        (confirmed)="confirm($event)"
        (cancelled)="target.set(null)"
      />
    }
  `,
  styleUrls: ['../shared/admin-grid.css'],
  styles: [
    `
      .us-card {
        display: grid;
        grid-template-columns: minmax(180px, 260px) 1fr;
        gap: 1rem;
        align-items: start;
        padding: 1rem 1.1rem;
        border-radius: 20px;
        color: #e2e8f0;
        background:
          radial-gradient(circle at 12% 0%, rgba(16, 185, 129, 0.35), transparent 45%),
          radial-gradient(circle at 100% 100%, rgba(99, 102, 241, 0.35), transparent 50%),
          linear-gradient(135deg, #0b3d31, #0f172a);
        box-shadow: 0 20px 40px -28px rgba(2, 44, 34, 0.8);
        margin-bottom: 1.1rem;
      }
      .us-intro h3 {
        margin: 0;
        font-size: 1.02rem;
        font-weight: 800;
        color: #ffffff;
      }
      .us-intro p {
        margin: 0.2rem 0 0;
        font-size: 0.78rem;
        color: #a7f3d0;
      }
      .us-box-wrap {
        position: relative;
        min-width: 0;
      }
      .us-box {
        display: flex;
        align-items: center;
        gap: 0.6rem;
        background: rgba(255, 255, 255, 0.96);
        border-radius: 14px;
        padding: 0.7rem 0.95rem;
        box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.2);
        transition: box-shadow 0.15s ease;
      }
      .us-box:focus-within {
        box-shadow: 0 0 0 4px rgba(52, 211, 153, 0.4);
      }
      .us-box svg {
        width: 18px;
        height: 18px;
        color: #64748b;
        flex: 0 0 auto;
      }
      .us-box input {
        flex: 1;
        min-width: 0;
        border: none;
        outline: none;
        background: transparent;
        font: inherit;
        font-size: 0.92rem;
        color: #0f172a;
      }
      .us-count {
        font-size: 0.7rem;
        font-weight: 800;
        color: #047857;
        background: rgba(16, 185, 129, 0.12);
        border-radius: 999px;
        padding: 0.15rem 0.55rem;
        white-space: nowrap;
      }
      .us-results {
        margin-top: 0.45rem;
        padding: 0.3rem;
        background: rgba(255, 255, 255, 0.98);
        border-radius: 16px;
        box-shadow:
          0 0 0 1px rgba(15, 23, 42, 0.04),
          0 28px 56px -28px rgba(15, 23, 42, 0.65);
        color: #0f172a;
        max-height: 440px;
        overflow-y: auto;
        scrollbar-width: thin;
      }
      .us-row {
        position: relative;
        display: grid;
        grid-template-columns: auto minmax(0, 1fr) auto;
        gap: 0.75rem;
        align-items: center;
        padding: 0.5rem 0.6rem;
        border-radius: 12px;
        transition: background 0.15s ease;
      }
      .us-row + .us-row {
        margin-top: 2px;
      }
      .us-row::before {
        content: '';
        position: absolute;
        left: 0;
        top: 10px;
        bottom: 10px;
        width: 3px;
        border-radius: 3px;
        background: linear-gradient(180deg, #10b981, #6366f1);
        opacity: 0;
        transition: opacity 0.15s ease;
      }
      .us-row:hover {
        background: linear-gradient(90deg, #f5f7ff, #f8fafc 60%);
      }
      .us-row:hover::before {
        opacity: 1;
      }
      .us-row.is-disabled {
        background: #fff5f5;
      }
      .us-row.is-disabled .us-photo img {
        filter: grayscale(0.85);
        opacity: 0.75;
      }
      .us-photo {
        position: relative;
        flex: 0 0 auto;
        width: 50px;
        height: 50px;
      }
      .us-photo img,
      .us-initial {
        width: 50px;
        height: 50px;
        border-radius: 15px;
        object-fit: cover;
        display: block;
        background: #e2e8f0;
        box-shadow:
          0 0 0 2px #ffffff,
          0 6px 14px -8px rgba(15, 23, 42, 0.55);
      }
      .us-initial {
        display: grid;
        place-items: center;
        font-weight: 800;
        color: #ffffff;
        background: linear-gradient(135deg, #6366f1, #10b981);
      }
      .us-online {
        position: absolute;
        right: -3px;
        bottom: -3px;
        width: 13px;
        height: 13px;
        border-radius: 50%;
        background: #cbd5e1;
        border: 2.5px solid #ffffff;
      }
      .us-online.on {
        background: #22c55e;
        box-shadow: 0 0 0 3px rgba(34, 197, 94, 0.2);
      }
      .us-meta {
        display: flex;
        flex-direction: column;
        gap: 0.08rem;
        min-width: 0;
        line-height: 1.3;
      }
      .us-name-row {
        display: flex;
        align-items: center;
        gap: 0.35rem;
        min-width: 0;
      }
      .us-name-row strong {
        font-size: 0.9rem;
        font-weight: 800;
        letter-spacing: -0.01em;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .us-state {
        display: inline-flex;
        align-items: center;
        gap: 0.28rem;
        flex: 0 0 auto;
        font-size: 0.64rem;
        font-weight: 800;
        letter-spacing: 0.02em;
        padding: 0.12rem 0.5rem 0.12rem 0.42rem;
        border-radius: 999px;
        color: #475569;
        background: #f1f5f9;
      }
      .us-state::before {
        content: '';
        width: 6px;
        height: 6px;
        border-radius: 50%;
        background: currentColor;
      }
      .us-state.ok {
        color: #047857;
        background: #d1fae5;
      }
      .us-state.danger {
        color: #b91c1c;
        background: #fee2e2;
      }
      .us-state.warn {
        color: #92400e;
        background: #fef3c7;
      }
      .us-state.violet {
        color: #6d28d9;
        background: #ede9fe;
      }
      .us-sub,
      .us-mono {
        font-size: 0.72rem;
        color: #64748b;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .us-mono {
        font-size: 0.68rem;
        color: #94a3b8;
        font-variant-numeric: tabular-nums;
      }
      .us-sub i,
      .us-mono i {
        font-style: normal;
        margin: 0 0.35rem;
        color: #cbd5e1;
      }
      .us-actions {
        display: inline-flex;
        align-items: stretch;
        height: 32px;
        border-radius: 10px;
        overflow: hidden;
        background: #ffffff;
        box-shadow:
          0 0 0 1px #e2e8f0,
          0 4px 10px -8px rgba(15, 23, 42, 0.45);
      }
      .us-act {
        display: inline-flex;
        align-items: center;
        gap: 0.3rem;
        padding: 0 0.75rem;
        border: 0;
        border-left: 1px solid #e2e8f0;
        background: transparent;
        font: inherit;
        font-size: 0.74rem;
        font-weight: 800;
        line-height: 1;
        white-space: nowrap;
        cursor: pointer;
        transition:
          background 0.15s ease,
          color 0.15s ease;
      }
      .us-act.disable {
        color: #b91c1c;
      }
      .us-act.disable:hover {
        color: #ffffff;
        background: linear-gradient(135deg, #ef4444, #dc2626);
      }
      .us-act.enable {
        color: #047857;
      }
      .us-act.enable:hover {
        color: #ffffff;
        background: linear-gradient(135deg, #10b981, #059669);
      }
      .us-act:focus-visible {
        outline: 3px solid rgba(99, 102, 241, 0.45);
        outline-offset: -3px;
      }
      .us-empty,
      .us-more {
        margin: 0;
        padding: 0.8rem;
        font-size: 0.8rem;
        color: #64748b;
        text-align: center;
      }
      @media (max-width: 760px) {
        .us-card {
          grid-template-columns: 1fr;
        }
        .us-row {
          grid-template-columns: auto minmax(0, 1fr);
        }
        .us-actions {
          grid-column: 1 / -1;
          justify-self: end;
        }
      }
    `,
  ],
})
export class AdminUserSearch {
  protected readonly insights = inject(AdminInsightsService);
  protected readonly stateLabel = accountStateLabel;
  protected readonly shortDate = shortDate;

  protected readonly term = signal('');
  protected readonly target = signal<MemberInsight | null>(null);

  protected readonly matches = computed(() => {
    const t = this.term().trim().toLowerCase();
    if (!t) return [];
    return this.insights
      .members()
      .filter(
        (m) =>
          m.fullName.toLowerCase().includes(t) ||
          m.uniqueId.includes(t) ||
          String(m.id) === t ||
          m.email.toLowerCase().includes(t) ||
          m.city.toLowerCase().includes(t) ||
          m.country.toLowerCase().includes(t),
      )
      .sort((a, b) => Number(!a.fullName.toLowerCase().startsWith(t)) - Number(!b.fullName.toLowerCase().startsWith(t)));
  });

  protected stateTone(state: AccountState): string {
    return state === 'active' ? 'ok' : state === 'disabled' ? 'danger' : state === 'identity_required' ? 'violet' : 'warn';
  }

  protected confirm(reason: string): void {
    const m = this.target();
    if (m) this.insights.disable(m.id, reason || undefined);
    this.target.set(null);
  }
}
