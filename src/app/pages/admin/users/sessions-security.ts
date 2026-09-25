import { Component, computed, inject, output, signal } from '@angular/core';
import { AdminUserOpsService } from '../shared/admin-user-ops.service';
import { AdminInsightsService, timeAgo } from '../shared/admin-insights.service';

type SessionFilter = 'all' | 'risky' | 'active';

/** Community-wide session monitor, failed-login alerts and security posture. */
@Component({
  selector: 'app-admin-sessions-security',
  styleUrls: ['../shared/admin-grid.css', './users.css'],
  template: `
    <div class="ss-grid">
      <section class="g-panel">
        <div class="g-toolbar">
          <label class="g-search">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
              <circle cx="11" cy="11" r="7"></circle>
              <line x1="21" y1="21" x2="16.5" y2="16.5"></line>
            </svg>
            <input type="search" placeholder="Search user, device, city or IP…" [value]="search()" (input)="search.set($any($event.target).value); page.set(1)" aria-label="Search sessions" />
          </label>
          <div class="g-tabs">
            <button type="button" [class.active]="filter() === 'all'" (click)="setFilter('all')">All <span class="count">{{ sessions().length }}</span></button>
            <button type="button" [class.active]="filter() === 'active'" (click)="setFilter('active')">Active now <span class="count">{{ activeCount() }}</span></button>
            <button type="button" [class.active]="filter() === 'risky'" (click)="setFilter('risky')">⚠ Risky <span class="count">{{ riskyCount() }}</span></button>
          </div>
        </div>
        <div class="g-table-wrap">
          <table class="g-table compact">
            <thead>
              <tr>
                <th>User</th>
                <th>Device</th>
                <th>Location · IP</th>
                <th>Last seen</th>
                <th style="text-align: right">Action</th>
              </tr>
            </thead>
            <tbody>
              @for (row of paged(); track row.session.id) {
                <tr>
                  <td>
                    <button type="button" class="g-member um-member-btn" (click)="manage.emit(row.member.id)">
                      <span class="g-avatar"><img [src]="row.member.photo" [alt]="row.member.fullName" loading="lazy" /></span>
                      <span class="g-member-meta"><strong>{{ row.member.fullName }}</strong><small>{{ row.member.email }}</small></span>
                    </button>
                  </td>
                  <td class="g-nowrap">
                    {{ row.session.icon }} {{ row.session.device }}<br />
                    <small class="g-muted">{{ row.session.platform }} · {{ row.session.browser }}</small>
                  </td>
                  <td class="g-nowrap">
                    {{ row.session.city }}, {{ row.session.country }}<br />
                    <small class="g-muted">{{ row.session.ip }}</small>
                    @if (row.session.risk) {
                      <br /><span class="ss-risk">⚠ {{ row.session.risk }}</span>
                    }
                  </td>
                  <td class="g-nowrap">
                    @if (row.session.active) {
                      <span class="g-badge ok">● Active</span>
                    } @else {
                      <span class="g-muted">{{ timeAgo(row.session.lastSeenUtc) }}</span>
                    }
                  </td>
                  <td>
                    <div class="g-actions"><button type="button" class="g-btn dark" (click)="manage.emit(row.member.id)">👤 Manage</button><button type="button" class="g-btn" (click)="revoke(row.session)">Revoke</button></div>
                  </td>
                </tr>
              } @empty {
                <tr><td colspan="5" class="g-empty">No sessions match.</td></tr>
              }
            </tbody>
          </table>
        </div>
        <footer class="g-foot">
          <span>{{ filtered().length }} session(s)</span>
          <div class="g-pager">
            <button type="button" [disabled]="currentPage() === 1" (click)="page.set(currentPage() - 1)" aria-label="Previous page">‹</button>
            <button type="button" class="current">{{ currentPage() }} / {{ totalPages() }}</button>
            <button type="button" [disabled]="currentPage() === totalPages()" (click)="page.set(currentPage() + 1)" aria-label="Next page">›</button>
          </div>
        </footer>
      </section>

      <div>
        <section class="g-panel">
          <div class="ss-panel-head">
            <div>
              <h3>🚨 Failed-login alerts</h3>
              <p>5+ failed sign-ins in 24h — possible credential stuffing.</p>
            </div>
          </div>
          @for (a of alerts(); track a.member.id) {
            <div class="ss-alert">
              <span class="ss-count">{{ a.security.failedLogins24h }}</span>
              <div>
                <strong>{{ a.member.fullName }}</strong>
                <small>{{ a.security.twoFactor ? '2FA on' : 'No 2FA' }} · last login {{ timeAgo(a.security.lastLoginUtc) }}</small>
              </div>
              @if (a.security.passwordResetRequired) {
                <span class="g-badge warn">Reset pending</span>
              } @else {
                <button type="button" class="g-btn" (click)="reset(a.member.id)">🔑 Reset</button>
              }
              <button type="button" class="g-btn dark" (click)="manage.emit(a.member.id)">👤 Manage</button>
            </div>
          } @empty {
            <p class="g-empty">No failed-login bursts detected.</p>
          }
        </section>

        <section class="g-panel" style="margin-top: 1rem">
          <div class="ss-panel-head">
            <div>
              <h3>🛡️ Security posture</h3>
              <p>Share of active accounts with each safeguard.</p>
            </div>
          </div>
          <div class="ss-bars">
            @for (b of posture(); track b.label) {
              <div class="ss-bar">
                <div><span>{{ b.label }}</span><strong>{{ b.pct }}%</strong></div>
                <span class="track"><i [style.width.%]="b.pct"></i></span>
              </div>
            }
          </div>
        </section>
      </div>
    </div>
  `,
})
export class AdminSessionsSecurity {
  private readonly ops = inject(AdminUserOpsService);
  private readonly insights = inject(AdminInsightsService);

  readonly manage = output<number>();
  protected readonly timeAgo = timeAgo;

  protected readonly search = signal('');
  protected readonly filter = signal<SessionFilter>('all');
  protected readonly page = signal(1);
  private readonly pageSize = 12;

  protected readonly sessions = this.ops.allSessions;
  protected readonly alerts = this.ops.loginAlerts;
  protected readonly activeCount = computed(() => this.sessions().filter((s) => s.session.active).length);
  protected readonly riskyCount = computed(() => this.sessions().filter((s) => !!s.session.risk).length);

  protected readonly filtered = computed(() => {
    const q = this.search().trim().toLowerCase();
    const f = this.filter();
    return this.sessions()
      .filter((s) => (f === 'risky' ? !!s.session.risk : f === 'active' ? s.session.active : true))
      .filter(
        (s) =>
          !q ||
          [s.member.fullName, s.member.email, s.session.device, s.session.city, s.session.ip, s.session.browser].some((v) =>
            v.toLowerCase().includes(q),
          ),
      )
      .sort((a, b) => Number(!!b.session.risk) - Number(!!a.session.risk) || b.session.lastSeenUtc.localeCompare(a.session.lastSeenUtc));
  });

  protected readonly totalPages = computed(() => Math.max(1, Math.ceil(this.filtered().length / this.pageSize)));
  protected readonly currentPage = computed(() => Math.min(this.page(), this.totalPages()));
  protected readonly paged = computed(() => {
    const start = (this.currentPage() - 1) * this.pageSize;
    return this.filtered().slice(start, start + this.pageSize);
  });

  protected readonly posture = computed(() => {
    this.ops.state();
    const active = this.insights.members().filter((m) => m.accountState !== 'disabled');
    const n = Math.max(1, active.length);
    const sec = active.map((m) => ({ m, s: this.ops.security(m) }));
    const pct = (k: number) => Math.round((k / n) * 100);
    return [
      { label: 'Email verified', pct: pct(sec.filter((x) => x.s.emailVerified).length) },
      { label: 'Two-factor authentication', pct: pct(sec.filter((x) => x.s.twoFactor).length) },
      { label: 'Identity verified', pct: pct(sec.filter((x) => x.m.isVerified).length) },
      { label: 'Password changed < 1 year', pct: pct(sec.filter((x) => Date.now() - Date.parse(x.s.passwordChangedUtc) < 365 * 864e5).length) },
    ];
  });

  protected setFilter(f: SessionFilter): void {
    this.filter.set(f);
    this.page.set(1);
  }

  protected revoke(session: Parameters<AdminUserOpsService['revokeSession']>[0]): void {
    this.ops.revokeSession(session);
    this.insights.notify(`Session on ${session.device} revoked.`);
  }

  protected reset(id: number): void {
    this.ops.forcePasswordReset(id);
    this.insights.notify('Password reset will be required at next sign-in.');
  }
}
