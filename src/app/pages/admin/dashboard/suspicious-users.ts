import { Component, computed, effect, inject, signal } from '@angular/core';
import {
  AdminInsightsService,
  SUSPICIOUS_META,
  SuspiciousType,
  SuspiciousUser,
  downloadCsv,
  timeAgo,
} from '../shared/admin-insights.service';
import { AccountState, accountStateLabel } from '../../../services/admin-moderation.service';
import { AdminConfirmDialog } from '../shared/admin-confirm-dialog';

type SortKey = 'risk' | 'name' | 'flags' | 'last';

/** Dashboard section: grid of members flagged by content scans, reports and behaviour signals. */
@Component({
  selector: 'app-admin-suspicious-users',
  imports: [AdminConfirmDialog],
  template: `
    <section class="g-panel" id="suspicious-users">
      <header class="sus-head">
        <div>
          <h3>🕵️ Suspicious Users</h3>
          <p>Members flagged for offensive language, redundant comments/posts, hateful or anti-government political content, spam and more.</p>
        </div>
        <div class="sus-summary">
          <span class="g-badge danger">High {{ levelCount('High') }}</span>
          <span class="g-badge warn">Medium {{ levelCount('Medium') }}</span>
          <span class="g-badge">Low {{ levelCount('Low') }}</span>
        </div>
      </header>

      <div class="g-toolbar">
        <label class="g-search">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
            <circle cx="11" cy="11" r="7"></circle>
            <line x1="21" y1="21" x2="16.5" y2="16.5"></line>
          </svg>
          <input type="search" placeholder="Search flagged member or evidence…" [value]="search()" (input)="search.set($any($event.target).value)" aria-label="Search suspicious users" />
        </label>
        <label class="g-select">
          <span>Activity</span>
          <select [value]="activity()" (change)="activity.set($any($event.target).value)">
            <option value="">All activities</option>
            @for (t of activityTypes; track t) {
              <option [value]="t">{{ meta[t].icon }} {{ meta[t].label }}</option>
            }
          </select>
        </label>
        <label class="g-select">
          <span>Risk</span>
          <select [value]="risk()" (change)="risk.set($any($event.target).value)">
            <option value="">Any risk</option>
            <option value="High">High</option>
            <option value="Medium">Medium</option>
            <option value="Low">Low</option>
          </select>
        </label>
        <label class="g-select">
          <span>Country</span>
          <select [value]="country()" (change)="country.set($any($event.target).value)">
            <option value="">All countries</option>
            @for (c of countries(); track c) {
              <option [value]="c">{{ c }}</option>
            }
          </select>
        </label>
        <label class="g-select">
          <span>Account</span>
          <select [value]="account()" (change)="account.set($any($event.target).value)">
            <option value="">Any status</option>
            <option value="open">Needs action</option>
            <option value="disabled">Disabled</option>
            <option value="identity_required">Identity check</option>
          </select>
        </label>
        <span class="g-toolbar-spacer"></span>
        <button type="button" class="g-icon-btn" (click)="exportCsv()">⤓ Export CSV</button>
      </div>

      @if (filtered().length === 0) {
        <p class="g-empty">No suspicious members match these filters. 🎉</p>
      } @else {
        <div class="g-table-wrap" style="max-height: 560px">
          <table class="g-table">
            <thead>
              <tr>
                <th class="sortable" [class.sorted]="sortKey() === 'name'" (click)="sortBy('name')">Member <span class="arrow">{{ arrow('name') }}</span></th>
                <th class="sortable" [class.sorted]="sortKey() === 'risk'" (click)="sortBy('risk')">Risk <span class="arrow">{{ arrow('risk') }}</span></th>
                <th class="sortable" [class.sorted]="sortKey() === 'flags'" (click)="sortBy('flags')">Suspicious actions &amp; activities <span class="arrow">{{ arrow('flags') }}</span></th>
                <th class="sortable" [class.sorted]="sortKey() === 'last'" (click)="sortBy('last')">Last flagged <span class="arrow">{{ arrow('last') }}</span></th>
                <th>Account</th>
                <th style="text-align: right">Actions</th>
              </tr>
            </thead>
            <tbody>
              @for (row of paged(); track row.member.id) {
                <tr [class.is-disabled]="row.member.accountState === 'disabled'">
                  <td>
                    <div class="g-member">
                      <span class="g-avatar">
                        <img [src]="row.member.photo" [alt]="row.member.fullName" loading="lazy" />
                        <i class="dot" [class.on]="row.member.isOnline"></i>
                      </span>
                      <span class="g-member-meta">
                        <strong>
                          {{ row.member.fullName }}
                          @if (row.member.isVerified) {
                            <span class="g-tick" title="Verified">✓</span>
                          }
                        </strong>
                        <small>{{ row.member.city || row.member.country }} · {{ row.member.country }}</small>
                      </span>
                    </div>
                  </td>
                  <td>
                    <div class="g-risk">
                      <span class="g-risk-bar"><i [style.width.%]="row.riskScore"></i></span>
                      <b>{{ row.riskScore }}</b>
                    </div>
                    <span class="g-badge" [class]="'g-badge ' + levelTone(row.riskLevel)" style="margin-top: 0.3rem">{{ row.riskLevel }}</span>
                  </td>
                  <td class="sus-signals">
                    @for (s of row.signals; track s.type) {
                      <div class="sus-signal" [attr.data-sev]="s.severity">
                        <span class="sus-tag">{{ meta[s.type].icon }} {{ meta[s.type].label }}</span>
                        <span class="sus-evidence">{{ s.evidence }}</span>
                      </div>
                    }
                  </td>
                  <td class="g-nowrap g-muted">{{ timeAgo(row.lastFlaggedUtc) }}</td>
                  <td>
                    <span class="g-badge" [class]="'g-badge ' + stateTone(row.member.accountState)">{{ stateLabel(row.member.accountState) }}</span>
                  </td>
                  <td>
                    <div class="g-actions sus-actions">
                      @if (row.member.accountState === 'disabled') {
                        <button type="button" class="g-btn success" (click)="insights.enable(row.member.id)">Re-enable</button>
                      } @else {
                        <button type="button" class="g-btn danger" (click)="ask(row, 'disable')">⛔ Disable</button>
                        <button
                          type="button"
                          class="g-btn violet"
                          [disabled]="row.member.accountState === 'identity_required'"
                          (click)="ask(row, 'identity')"
                        >
                          🪪 {{ row.member.accountState === 'identity_required' ? 'Identity requested' : 'Force Identity Confirmation' }}
                        </button>
                      }
                    </div>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }

      <footer class="g-foot">
        <span>{{ filtered().length }} flagged member(s) · signals combine live content scans, member reports and behaviour patterns</span>
        <div class="g-pager">
          <button type="button" [disabled]="currentPage() === 1" (click)="page.set(currentPage() - 1)" aria-label="Previous page">‹</button>
          <button type="button" class="current">{{ currentPage() }} / {{ totalPages() }}</button>
          <button type="button" [disabled]="currentPage() === totalPages()" (click)="page.set(currentPage() + 1)" aria-label="Next page">›</button>
        </div>
      </footer>
    </section>

    @if (pending(); as p) {
      <app-admin-confirm-dialog
        [heading]="p.action === 'disable' ? 'Disable this account?' : 'Force identity confirmation?'"
        [message]="
          p.action === 'disable'
            ? p.row.member.fullName + ' will be signed out and hidden from the community until an admin re-enables the account.'
            : p.row.member.fullName + ' will be locked out until they re-confirm their identity with a government ID or verified email.'
        "
        [confirmLabel]="p.action === 'disable' ? 'Disable account' : 'Require identity check'"
        [tone]="p.action === 'disable' ? 'danger' : 'violet'"
        [withReason]="p.action === 'disable'"
        (confirmed)="confirm($event)"
        (cancelled)="pending.set(null)"
      />
    }
  `,
  styleUrls: ['../shared/admin-grid.css'],
  styles: [
    `
      .sus-head {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        gap: 1rem;
        flex-wrap: wrap;
        padding: 1rem 1.1rem 0.8rem;
      }
      .sus-head h3 {
        margin: 0;
        font-size: 1.05rem;
        font-weight: 800;
      }
      .sus-head p {
        margin: 0.2rem 0 0;
        font-size: 0.8rem;
        color: #64748b;
        max-width: 640px;
      }
      .sus-summary {
        display: flex;
        gap: 0.35rem;
      }
      .sus-signals {
        min-width: 320px;
      }
      .sus-signal {
        display: flex;
        flex-direction: column;
        gap: 0.1rem;
        padding: 0.35rem 0.55rem;
        border-left: 3px solid #facc15;
        background: #fffbeb;
        border-radius: 0 8px 8px 0;
        margin-bottom: 0.3rem;
      }
      .sus-signal[data-sev='2'] {
        border-color: #f97316;
        background: #fff7ed;
      }
      .sus-signal[data-sev='3'] {
        border-color: #ef4444;
        background: #fef2f2;
      }
      .sus-signal:last-child {
        margin-bottom: 0;
      }
      .sus-tag {
        font-size: 0.74rem;
        font-weight: 800;
        color: #0f172a;
      }
      .sus-evidence {
        font-size: 0.72rem;
        color: #475569;
      }
      .sus-actions {
        flex-direction: column;
        align-items: stretch;
        min-width: 190px;
      }
    `,
  ],
})
export class AdminSuspiciousUsers {
  protected readonly insights = inject(AdminInsightsService);
  protected readonly meta = SUSPICIOUS_META;
  protected readonly activityTypes = Object.keys(SUSPICIOUS_META) as SuspiciousType[];
  protected readonly timeAgo = timeAgo;
  protected readonly stateLabel = accountStateLabel;

  protected readonly search = signal('');
  protected readonly activity = signal('');
  protected readonly risk = signal('');
  protected readonly country = signal('');
  protected readonly account = signal('');
  protected readonly sortKey = signal<SortKey>('risk');
  protected readonly sortDir = signal<1 | -1>(-1);
  protected readonly page = signal(1);
  private readonly pageSize = 8;

  protected readonly pending = signal<{ row: SuspiciousUser; action: 'disable' | 'identity' } | null>(null);

  protected readonly countries = computed(() => [...new Set(this.insights.suspiciousUsers().map((r) => r.member.country))].sort());

  protected readonly filtered = computed(() => {
    const term = this.search().trim().toLowerCase();
    const rows = this.insights.suspiciousUsers().filter((r) => {
      if (this.activity() && !r.signals.some((s) => s.type === this.activity())) return false;
      if (this.risk() && r.riskLevel !== this.risk()) return false;
      if (this.country() && r.member.country !== this.country()) return false;
      const state = r.member.accountState;
      if (this.account() === 'open' && (state === 'disabled' || state === 'identity_required')) return false;
      if (this.account() && this.account() !== 'open' && state !== this.account()) return false;
      if (!term) return true;
      return (
        r.member.fullName.toLowerCase().includes(term) ||
        r.member.city.toLowerCase().includes(term) ||
        r.signals.some((s) => s.evidence.toLowerCase().includes(term) || SUSPICIOUS_META[s.type].label.toLowerCase().includes(term))
      );
    });
    const dir = this.sortDir();
    const val = (r: SuspiciousUser): string | number => {
      switch (this.sortKey()) {
        case 'name':
          return r.member.fullName.toLowerCase();
        case 'flags':
          return r.signals.length;
        case 'last':
          return r.lastFlaggedUtc;
        default:
          return r.riskScore;
      }
    };
    return rows.slice().sort((a, b) => {
      const va = val(a);
      const vb = val(b);
      return (va < vb ? -1 : va > vb ? 1 : 0) * dir;
    });
  });

  protected readonly totalPages = computed(() => Math.max(1, Math.ceil(this.filtered().length / this.pageSize)));
  protected readonly currentPage = computed(() => Math.min(this.page(), this.totalPages()));
  protected readonly paged = computed(() => {
    const start = (this.currentPage() - 1) * this.pageSize;
    return this.filtered().slice(start, start + this.pageSize);
  });

  constructor() {
    effect(() => {
      this.search();
      this.activity();
      this.risk();
      this.country();
      this.account();
      this.page.set(1);
    });
  }

  protected levelCount(level: SuspiciousUser['riskLevel']): number {
    return this.insights.suspiciousUsers().filter((r) => r.riskLevel === level).length;
  }

  protected levelTone(level: SuspiciousUser['riskLevel']): string {
    return level === 'High' ? 'danger' : level === 'Medium' ? 'warn' : '';
  }

  protected stateTone(state: AccountState): string {
    return state === 'active' ? 'ok' : state === 'disabled' ? 'danger' : state === 'identity_required' ? 'violet' : 'warn';
  }

  protected sortBy(key: SortKey): void {
    if (this.sortKey() === key) this.sortDir.update((d) => (d === 1 ? -1 : 1));
    else {
      this.sortKey.set(key);
      this.sortDir.set(key === 'name' ? 1 : -1);
    }
  }

  protected arrow(key: SortKey): string {
    return this.sortKey() === key ? (this.sortDir() === 1 ? '▲' : '▼') : '↕';
  }

  protected ask(row: SuspiciousUser, action: 'disable' | 'identity'): void {
    this.pending.set({ row, action });
  }

  protected confirm(reason: string): void {
    const p = this.pending();
    if (!p) return;
    if (p.action === 'disable') this.insights.disable(p.row.member.id, reason || 'Suspicious activity');
    else this.insights.forceIdentity(p.row.member.id);
    this.pending.set(null);
  }

  protected exportCsv(): void {
    downloadCsv(
      'neverbeen-suspicious-users.csv',
      ['UID', 'Name', 'Country', 'Risk score', 'Risk level', 'Activities', 'Evidence', 'Account'],
      this.filtered().map((r) => [
        r.member.uniqueId,
        r.member.fullName,
        r.member.country,
        r.riskScore,
        r.riskLevel,
        r.signals.map((s) => SUSPICIOUS_META[s.type].label).join('; '),
        r.signals.map((s) => s.evidence).join(' | '),
        accountStateLabel(r.member.accountState),
      ]),
    );
  }
}
