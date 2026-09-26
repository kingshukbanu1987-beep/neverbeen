import { OverlayPortal } from '../shared/overlay-portal';
import { Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AdminDataOpsService, PRIVACY_TYPES, PrivacyRequest, PrivacyStatus, PrivacyType } from '../shared/admin-data-ops.service';
import { AdminInsightsService, shortDate, timeAgo } from '../shared/admin-insights.service';
import { AdminConfirmDialog } from '../shared/admin-confirm-dialog';
import { daysUntil } from './format';
import { SelectValueSync } from '../../../shared/select-value-sync';
import { ManageUserButton } from '../shared/manage-user-button';

type StatusFilter = 'open' | 'all' | PrivacyStatus;

const STATUS_META: Record<PrivacyStatus, { label: string; tone: string }> = {
  new: { label: 'New', tone: 'info' },
  in_progress: { label: 'In progress', tone: 'violet' },
  completed: { label: 'Completed', tone: 'ok' },
  rejected: { label: 'Rejected', tone: 'danger' },
};

/** Data-subject request (DSAR) inbox — GDPR / DPDP Act / CCPA with 30-day SLA tracking and one-click fulfilment. */
@Component({
  selector: 'app-admin-privacy-requests',
  imports: [SelectValueSync, ManageUserButton, AdminConfirmDialog, OverlayPortal],
  styleUrls: ['../shared/admin-grid.css', './data.css'],
  template: `
    <div class="dm-dsar-summary">
      @for (s of summary(); track s.label) {
        <div [attr.data-tone]="s.tone"><strong>{{ s.value }}</strong><small>{{ s.label }}</small></div>
      }
      <button type="button" class="g-btn dark" (click)="showNew.set(!showNew())">{{ showNew() ? 'Close' : '＋ Log new request' }}</button>
    </div>

    @if (showNew()) {
      <section class="g-panel dm-new-req">
        <h3>Log a privacy request</h3>
        <div class="dm-form-grid">
          <label>
            <span>Member</span>
            <input type="search" placeholder="Search by name or email…" [value]="memberQuery()" (input)="memberQuery.set($any($event.target).value); newUserId.set(null)" />
            @if (memberQuery() && !newUserId()) {
              <div class="dm-suggest">
                @for (m of suggestions(); track m.id) {
                  <button type="button" (click)="pickMember(m.id, m.fullName)">
                    <img [src]="m.photo" alt="" /> {{ m.fullName }} <small>{{ m.email }}</small>
                  </button>
                } @empty {
                  <span class="g-muted">No members match.</span>
                }
              </div>
            }
          </label>
          <label>
            <span>Request type</span>
            <select [value]="newType()" (change)="newType.set($any($event.target).value)">
              @for (t of typeKeys; track t) {
                <option [value]="t">{{ types[t].icon }} {{ types[t].label }}</option>
              }
            </select>
          </label>
          <label>
            <span>Regulation</span>
            <select [value]="newRegulation()" (change)="newRegulation.set($any($event.target).value)">
              <option>DPDP Act (India)</option>
              <option>GDPR</option>
              <option>CCPA</option>
            </select>
          </label>
          <label class="wide">
            <span>Member's message</span>
            <textarea [value]="newMessage()" (input)="newMessage.set($any($event.target).value)" [placeholder]="types[newType()].hint"></textarea>
          </label>
        </div>
        <div class="g-modal-actions">
          <button type="button" class="g-btn dark" [disabled]="!newUserId()" (click)="create()">Create request · due in 30 days</button>
        </div>
      </section>
    }

    <section class="g-panel" style="margin-top: 1rem">
      <div class="g-toolbar">
        <div class="g-tabs">
          @for (f of filters; track f.key) {
            <button type="button" [class.active]="filter() === f.key" (click)="filter.set(f.key)">{{ f.label }} <span class="count">{{ countFor(f.key) }}</span></button>
          }
        </div>
      </div>

      <div class="dm-req-list">
        @for (r of filtered(); track r.id) {
          <article class="dm-req" [attr.data-status]="r.status">
            <div class="dm-req-main">
              <div class="dm-req-title">
                <span class="dm-req-icon">{{ types[r.type].icon }}</span>
                <div>
                  <strong>{{ types[r.type].label }}</strong>
                  <small>#{{ r.id }} · {{ r.userName }} · {{ r.email }} · {{ r.regulation }}</small>
                </div>
              </div>
              <p class="dm-req-msg">“{{ r.message }}”</p>
              @if (r.resolution) {
                <p class="dm-req-res"><b>Resolution:</b> {{ r.resolution }} · {{ r.resolvedUtc ? timeAgo(r.resolvedUtc) : '' }}</p>
              }
            </div>
            <div class="dm-req-side">
              <span class="g-badge" [class]="'g-badge ' + statusMeta[r.status].tone">{{ statusMeta[r.status].label }}</span>
              @if (r.status === 'new' || r.status === 'in_progress') {
                <span class="dm-sla" [attr.data-level]="slaLevel(r)">{{ slaText(r) }}</span>
              }
              <small class="g-muted">Received {{ shortDate(r.receivedUtc) }}</small>
              @if (memberExists(r.userId)) {
                <app-manage-user-btn [userId]="r.userId" [name]="r.userName" size="sm" />
              }
              @if (r.status === 'new' || r.status === 'in_progress') {
                <div class="dm-req-actions">
                  @if (r.status === 'new') {
                    <button type="button" class="g-btn" (click)="start(r)">▶ Start</button>
                  }
                  @switch (r.type) {
                    @case ('access') {
                      <button type="button" class="g-btn success" (click)="fulfilExport(r)">⤓ Export & complete</button>
                    }
                    @case ('portability') {
                      <button type="button" class="g-btn success" (click)="fulfilExport(r)">📦 Send JSON & complete</button>
                    }
                    @case ('erasure') {
                      <button type="button" class="g-btn danger" (click)="pendingErase.set(r)">🗑 Erase member…</button>
                    }
                    @case ('rectification') {
                      <button type="button" class="g-btn" (click)="openProfile(r)">✏️ Open profile</button>
                      <button type="button" class="g-btn success" (click)="complete(r, 'Profile corrected as requested.')">✓ Complete</button>
                    }
                    @case ('restriction') {
                      <button type="button" class="g-btn success" (click)="complete(r, 'Processing restricted — excluded from recommendations & analytics.')">⏸ Restrict & complete</button>
                    }
                    @case ('consent_withdrawal') {
                      <button type="button" class="g-btn success" (click)="complete(r, 'Marketing & optional tracking consent withdrawn.')">🚫 Withdraw & complete</button>
                    }
                  }
                  <button type="button" class="g-link-btn" (click)="pendingReject.set(r)">Reject</button>
                </div>
              }
            </div>
          </article>
        } @empty {
          <p class="g-empty">No requests in this view. 🎉</p>
        }
      </div>
    </section>

    @if (pendingReject(); as r) {
      <app-admin-confirm-dialog
        heading="Reject this request?"
        [message]="'Explain why #' + r.id + ' cannot be fulfilled. The member is notified with this reason.'"
        confirmLabel="Reject request"
        reasonPlaceholder="e.g. Identity could not be verified from the requesting email"
        (confirmed)="reject(r, $event)"
        (cancelled)="pendingReject.set(null)"
      />
    }

    @if (pendingErase(); as r) {
      <div class="g-modal-backdrop" appOverlayPortal (click)="pendingErase.set(null)">
        <div class="g-modal" role="dialog" aria-modal="true" (click)="$event.stopPropagation()">
          <h3>Erase {{ r.userName }}?</h3>
          <p>The profile is permanently removed. Abuse reports and the moderation record are kept without the name (legal obligation).</p>
          <label class="dm-radio"><input type="radio" name="erase-mode" [checked]="eraseMode() === 'anonymize'" (change)="eraseMode.set('anonymize')" /> <span><b>Anonymise content</b> — posts & comments stay as “Deleted member”</span></label>
          <label class="dm-radio"><input type="radio" name="erase-mode" [checked]="eraseMode() === 'delete'" (change)="eraseMode.set('delete')" /> <span><b>Delete content</b> — remove posts & comments as well</span></label>
          <div class="g-modal-actions">
            <button type="button" class="g-btn" (click)="pendingErase.set(null)">Cancel</button>
            <button type="button" class="g-btn danger" (click)="erase(r)">Erase & complete</button>
          </div>
        </div>
      </div>
    }
  `,
})
export class AdminPrivacyRequests {
  private readonly dataOps = inject(AdminDataOpsService);
  private readonly insights = inject(AdminInsightsService);
  private readonly router = inject(Router);

  protected readonly types = PRIVACY_TYPES;
  protected readonly typeKeys = Object.keys(PRIVACY_TYPES) as PrivacyType[];
  protected readonly statusMeta = STATUS_META;
  protected readonly timeAgo = timeAgo;
  protected readonly shortDate = shortDate;

  protected readonly filters: { key: StatusFilter; label: string }[] = [
    { key: 'open', label: 'Open' },
    { key: 'new', label: 'New' },
    { key: 'in_progress', label: 'In progress' },
    { key: 'completed', label: 'Completed' },
    { key: 'rejected', label: 'Rejected' },
    { key: 'all', label: 'All' },
  ];
  protected readonly filter = signal<StatusFilter>('open');
  protected readonly pendingReject = signal<PrivacyRequest | null>(null);
  protected readonly pendingErase = signal<PrivacyRequest | null>(null);
  protected readonly eraseMode = signal<'anonymize' | 'delete'>('anonymize');

  protected readonly showNew = signal(false);
  protected readonly memberQuery = signal('');
  protected readonly newUserId = signal<number | null>(null);
  protected readonly newType = signal<PrivacyType>('access');
  protected readonly newRegulation = signal<PrivacyRequest['regulation']>('DPDP Act (India)');
  protected readonly newMessage = signal('');

  protected readonly requests = this.dataOps.requests;

  protected readonly filtered = computed(() => {
    const f = this.filter();
    const list = this.requests().filter((r) => (f === 'all' ? true : f === 'open' ? r.status === 'new' || r.status === 'in_progress' : r.status === f));
    return f === 'open' ? list.slice().sort((a, b) => a.dueUtc.localeCompare(b.dueUtc)) : list;
  });

  protected readonly summary = computed(() => {
    const open = this.requests().filter((r) => r.status === 'new' || r.status === 'in_progress');
    const overdue = open.filter((r) => daysUntil(r.dueUtc) < 0).length;
    const dueSoon = open.filter((r) => daysUntil(r.dueUtc) >= 0 && daysUntil(r.dueUtc) <= 7).length;
    const done = this.requests().filter((r) => r.status === 'completed' && r.resolvedUtc);
    const avg = done.length
      ? Math.round(done.reduce((s, r) => s + (Date.parse(r.resolvedUtc!) - Date.parse(r.receivedUtc)) / 86_400_000, 0) / done.length)
      : 0;
    return [
      { label: 'Open requests', value: open.length, tone: '' },
      { label: 'Overdue (30-day SLA)', value: overdue, tone: overdue ? 'danger' : 'ok' },
      { label: 'Due within 7 days', value: dueSoon, tone: dueSoon ? 'warn' : '' },
      { label: 'Avg. days to resolve', value: done.length ? avg : '—', tone: '' },
    ];
  });

  protected readonly suggestions = computed(() => {
    const q = this.memberQuery().trim().toLowerCase();
    if (q.length < 2) return [];
    return this.insights
      .members()
      .filter((m) => m.fullName.toLowerCase().includes(q) || m.email.toLowerCase().includes(q))
      .slice(0, 6);
  });

  protected countFor(f: StatusFilter): number {
    return this.requests().filter((r) => (f === 'all' ? true : f === 'open' ? r.status === 'new' || r.status === 'in_progress' : r.status === f)).length;
  }

  protected slaLevel(r: PrivacyRequest): 'overdue' | 'soon' | 'ok' {
    const d = daysUntil(r.dueUtc);
    return d < 0 ? 'overdue' : d <= 7 ? 'soon' : 'ok';
  }

  protected slaText(r: PrivacyRequest): string {
    const d = daysUntil(r.dueUtc);
    return d < 0 ? `⏰ Overdue by ${-d} day${d === -1 ? '' : 's'}` : d === 0 ? '⏰ Due today' : `⏳ ${d} day${d === 1 ? '' : 's'} left`;
  }

  protected pickMember(id: number, name: string): void {
    this.newUserId.set(id);
    this.memberQuery.set(name);
  }

  protected create(): void {
    const id = this.newUserId();
    if (!id) return;
    this.dataOps.createRequest(id, this.newType(), this.newMessage().trim() || PRIVACY_TYPES[this.newType()].hint, this.newRegulation());
    this.insights.notify('Privacy request logged — SLA clock started.');
    this.showNew.set(false);
    this.memberQuery.set('');
    this.newUserId.set(null);
    this.newMessage.set('');
    this.filter.set('open');
  }

  protected start(r: PrivacyRequest): void {
    this.dataOps.setRequestStatus(r.id, 'in_progress');
  }

  protected complete(r: PrivacyRequest, resolution: string): void {
    this.dataOps.setRequestStatus(r.id, 'completed', resolution);
    this.insights.notify(`Request #${r.id} completed.`);
  }

  protected fulfilExport(r: PrivacyRequest): void {
    this.dataOps.exportUserPackage(r.userId);
    this.complete(r, r.type === 'portability' ? 'Machine-readable JSON package delivered.' : 'Copy of personal data delivered to the member.');
  }

  protected memberExists(id: number): boolean {
    return !!this.insights.member(id);
  }

  protected openProfile(r: PrivacyRequest): void {
    this.router.navigate(['/admin/users'], { queryParams: { user: r.userId } });
  }

  protected reject(r: PrivacyRequest, reason: string): void {
    this.dataOps.setRequestStatus(r.id, 'rejected', reason || 'Request could not be verified.');
    this.pendingReject.set(null);
    this.insights.notify(`Request #${r.id} rejected.`);
  }

  protected erase(r: PrivacyRequest): void {
    const exists = !!this.insights.member(r.userId);
    const res = exists ? this.dataOps.eraseUser(r.userId, this.eraseMode()) : { posts: 0, comments: 0 };
    const verb = this.eraseMode() === 'delete' ? 'deleted' : 'anonymised';
    this.complete(r, exists ? `Member erased; ${res.posts} post(s) and ${res.comments} comment(s) ${verb}.` : 'Member had already been removed.');
    this.pendingErase.set(null);
  }
}
