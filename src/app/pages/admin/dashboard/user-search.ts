import { Component, computed, inject, signal } from '@angular/core';
import { AdminInsightsService, MemberInsight, shortDate } from '../shared/admin-insights.service';
import { AccountState, accountStateLabel } from '../../../services/admin-moderation.service';
import { AdminConfirmDialog } from '../shared/admin-confirm-dialog';

/** K — Find any user by name / UID / email / city and disable (or re-enable) their account. */
@Component({
  selector: 'app-admin-user-search',
  imports: [AdminConfirmDialog],
  template: `
    <section class="us-card">
      <div class="us-intro">
        <h3>🔎 Find a user</h3>
        <p>Search any member and disable their account instantly.</p>
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
                <div class="us-row" [class.is-disabled]="m.accountState === 'disabled'">
                  <span class="g-avatar">
                    <img [src]="m.photo" [alt]="m.fullName" />
                    <i class="dot" [class.on]="m.isOnline"></i>
                  </span>
                  <span class="us-meta">
                    <strong>
                      {{ m.fullName }}
                      @if (m.isVerified) {
                        <span class="g-tick" title="Verified">✓</span>
                      }
                    </strong>
                    <small>{{ m.profession }} · {{ m.city ? m.city + ', ' : '' }}{{ m.country }}</small>
                    <small class="mono">UID {{ m.uniqueId }} · {{ m.email }} · joined {{ shortDate(m.registeredAtUtc) }}</small>
                  </span>
                  <span class="g-badge" [class]="'g-badge ' + stateTone(m.accountState)">{{ stateLabel(m.accountState) }}</span>
                  @if (m.accountState === 'disabled') {
                    <button type="button" class="g-btn success" (click)="insights.enable(m.id)">Enable</button>
                  } @else {
                    <button type="button" class="g-btn danger" (click)="target.set(m)">⛔ Disable account</button>
                  }
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
        margin-top: 0.5rem;
        background: #ffffff;
        border-radius: 14px;
        overflow: hidden;
        box-shadow: 0 24px 48px -24px rgba(15, 23, 42, 0.6);
        color: #0f172a;
        max-height: 420px;
        overflow-y: auto;
      }
      .us-row {
        display: grid;
        grid-template-columns: auto 1fr auto auto;
        gap: 0.7rem;
        align-items: center;
        padding: 0.6rem 0.8rem;
        border-bottom: 1px solid #f1f5f9;
      }
      .us-row:hover {
        background: #f8fafc;
      }
      .us-row.is-disabled {
        background: #fef2f2;
      }
      .us-meta {
        display: flex;
        flex-direction: column;
        min-width: 0;
        line-height: 1.3;
      }
      .us-meta strong {
        font-size: 0.86rem;
        display: inline-flex;
        align-items: center;
        gap: 0.3rem;
      }
      .us-meta small {
        font-size: 0.72rem;
        color: #64748b;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .us-meta .mono {
        font-variant-numeric: tabular-nums;
        color: #94a3b8;
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
          grid-template-columns: auto 1fr;
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
