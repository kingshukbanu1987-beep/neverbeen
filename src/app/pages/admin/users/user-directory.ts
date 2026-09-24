import { Component, computed, effect, inject, output, signal } from '@angular/core';
import { AdminInsightsService, MemberInsight, downloadCsv, shortDate, timeAgo } from '../shared/admin-insights.service';
import { AdminUserOpsService, ROLES, UserRole, roleLabel, roleMeta } from '../shared/admin-user-ops.service';
import { AccountState, AdminModerationService, accountStateLabel } from '../../../services/admin-moderation.service';
import { AdminConfirmDialog } from '../shared/admin-confirm-dialog';

type Segment =
  | 'all'
  | 'new7'
  | 'active24'
  | 'inactive14'
  | 'unverified'
  | 'staff'
  | 'atRisk'
  | 'restricted'
  | 'disabled'
  | 'no2fa';

type SortKey = 'name' | 'joined' | 'lastActive' | 'posts' | 'risk';

interface Row {
  m: MemberInsight;
  role: UserRole;
  risk: number;
  twoFactor: boolean;
  emailVerified: boolean;
  tags: string[];
}

const SEGMENTS: { key: Segment; label: string; icon: string }[] = [
  { key: 'all', label: 'All users', icon: '👥' },
  { key: 'new7', label: 'New this week', icon: '✨' },
  { key: 'active24', label: 'Active 24h', icon: '⚡' },
  { key: 'inactive14', label: 'Inactive 14d+', icon: '💤' },
  { key: 'unverified', label: 'Unverified', icon: '❔' },
  { key: 'staff', label: 'Staff & ambassadors', icon: '🎖️' },
  { key: 'atRisk', label: 'At risk', icon: '🕵️' },
  { key: 'restricted', label: 'Warned / restricted', icon: '⚠️' },
  { key: 'disabled', label: 'Disabled', icon: '⛔' },
  { key: 'no2fa', label: '2FA off', icon: '🔓' },
];

/** User Management › Directory — segments, advanced filters, multi-select bulk actions. */
@Component({
  selector: 'app-admin-user-directory',
  imports: [AdminConfirmDialog],
  templateUrl: './user-directory.html',
  styleUrls: ['../shared/admin-grid.css', './users.css'],
})
export class AdminUserDirectory {
  private readonly insights = inject(AdminInsightsService);
  private readonly ops = inject(AdminUserOpsService);
  private readonly moderation = inject(AdminModerationService);

  readonly manage = output<number>();

  protected readonly segments = SEGMENTS;
  protected readonly roles = ROLES;
  protected readonly states: AccountState[] = ['active', 'warned', 'restricted', 'identity_required', 'disabled'];
  protected readonly stateLabel = accountStateLabel;
  protected readonly roleMeta = roleMeta;
  protected readonly timeAgo = timeAgo;
  protected readonly shortDate = shortDate;

  protected readonly segment = signal<Segment>('all');
  protected readonly search = signal('');
  protected readonly country = signal('');
  protected readonly role = signal('');
  protected readonly state = signal('');
  protected readonly tag = signal('');
  protected readonly sortKey = signal<SortKey>('joined');
  protected readonly sortDir = signal<1 | -1>(-1);
  protected readonly page = signal(1);
  protected readonly pageSize = signal(20);
  protected readonly selected = signal<Set<number>>(new Set());
  protected readonly confirmBulkDisable = signal(false);

  protected readonly allTags = this.ops.allTags;

  private readonly riskById = computed(() => new Map(this.insights.suspiciousUsers().map((s) => [s.member.id, s.riskScore])));

  private readonly rows = computed<Row[]>(() => {
    this.ops.state();
    const risk = this.riskById();
    return this.insights.members().map((m) => {
      const sec = this.ops.security(m);
      return { m, role: this.ops.roleOf(m.id), risk: risk.get(m.id) ?? 0, twoFactor: sec.twoFactor, emailVerified: sec.emailVerified, tags: this.ops.tagsOf(m.id) };
    });
  });

  protected readonly countries = computed(() => [...new Set(this.insights.members().map((m) => m.country))].sort());

  private matchesSegment(r: Row, seg: Segment, now: number): boolean {
    const m = r.m;
    switch (seg) {
      case 'new7':
        return now - new Date(m.registeredAtUtc).getTime() <= 7 * 86_400_000;
      case 'active24':
        return m.isOnline || now - new Date(m.lastActiveUtc).getTime() <= 86_400_000;
      case 'inactive14':
        return !m.isOnline && now - new Date(m.lastActiveUtc).getTime() > 14 * 86_400_000;
      case 'unverified':
        return !m.isVerified;
      case 'staff':
        return r.role === 'moderator' || r.role === 'admin' || r.role === 'ambassador';
      case 'atRisk':
        return r.risk > 0;
      case 'restricted':
        return m.accountState === 'warned' || m.accountState === 'restricted' || m.accountState === 'identity_required';
      case 'disabled':
        return m.accountState === 'disabled';
      case 'no2fa':
        return !r.twoFactor;
      default:
        return true;
    }
  }

  protected readonly segmentCounts = computed(() => {
    const now = Date.now();
    const rows = this.rows();
    return Object.fromEntries(SEGMENTS.map((s) => [s.key, rows.filter((r) => this.matchesSegment(r, s.key, now)).length])) as Record<Segment, number>;
  });

  protected readonly filtered = computed(() => {
    const now = Date.now();
    const term = this.search().trim().toLowerCase();
    const list = this.rows().filter((r) => {
      if (!this.matchesSegment(r, this.segment(), now)) return false;
      if (this.country() && r.m.country !== this.country()) return false;
      if (this.role() && r.role !== this.role()) return false;
      if (this.state() && r.m.accountState !== this.state()) return false;
      if (this.tag() && !r.tags.includes(this.tag())) return false;
      if (!term) return true;
      return (
        r.m.fullName.toLowerCase().includes(term) ||
        r.m.email.toLowerCase().includes(term) ||
        r.m.uniqueId.includes(term) ||
        r.m.city.toLowerCase().includes(term) ||
        r.tags.some((t) => t.toLowerCase().includes(term))
      );
    });
    const dir = this.sortDir();
    const val = (r: Row): string | number => {
      switch (this.sortKey()) {
        case 'name':
          return r.m.fullName.toLowerCase();
        case 'lastActive':
          return r.m.isOnline ? '9999' : r.m.lastActiveUtc;
        case 'posts':
          return r.m.postCount + r.m.commentCount;
        case 'risk':
          return r.risk;
        default:
          return r.m.registeredAtUtc;
      }
    };
    return list.slice().sort((a, b) => {
      const va = val(a);
      const vb = val(b);
      return (va < vb ? -1 : va > vb ? 1 : 0) * dir;
    });
  });

  protected readonly totalPages = computed(() => Math.max(1, Math.ceil(this.filtered().length / this.pageSize())));
  protected readonly currentPage = computed(() => Math.min(this.page(), this.totalPages()));
  protected readonly paged = computed(() => {
    const start = (this.currentPage() - 1) * this.pageSize();
    return this.filtered().slice(start, start + this.pageSize());
  });

  protected readonly allOnPageSelected = computed(() => this.paged().length > 0 && this.paged().every((r) => this.selected().has(r.m.id)));
  protected readonly selectedRows = computed(() => this.rows().filter((r) => this.selected().has(r.m.id)));

  constructor() {
    effect(() => {
      this.segment();
      this.search();
      this.country();
      this.role();
      this.state();
      this.tag();
      this.pageSize();
      this.page.set(1);
    });
  }

  protected set(sig: { set: (v: string) => void }, e: Event): void {
    sig.set((e.target as HTMLInputElement).value);
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

  protected toggle(id: number, checked: boolean): void {
    this.selected.update((s) => {
      const next = new Set(s);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  protected togglePage(checked: boolean): void {
    this.selected.update((s) => {
      const next = new Set(s);
      for (const r of this.paged()) {
        if (checked) next.add(r.m.id);
        else next.delete(r.m.id);
      }
      return next;
    });
  }

  protected selectAllFiltered(): void {
    this.selected.set(new Set(this.filtered().map((r) => r.m.id)));
  }

  protected clearSelection(): void {
    this.selected.set(new Set());
  }

  protected stateTone(state: AccountState): string {
    return state === 'active' ? 'ok' : state === 'disabled' ? 'danger' : state === 'identity_required' ? 'violet' : 'warn';
  }

  /* ------------------------- Bulk actions ------------------------- */

  protected bulk(action: 'verify' | 'warn' | 'restrict' | 'identity' | 'signout' | 'enable' | 'reset'): void {
    const ids = [...this.selected()];
    if (!ids.length) return;
    for (const id of ids) {
      switch (action) {
        case 'verify':
          this.ops.setVerified(id, true);
          break;
        case 'warn':
          this.moderation.warn(id, 'Bulk warning from User Management');
          break;
        case 'restrict':
          this.moderation.restrict(id, 7, ['posting', 'commenting'], 'Bulk 7-day restriction');
          break;
        case 'identity':
          this.moderation.forceIdentityConfirmation(id, 'Bulk identity check');
          break;
        case 'signout':
          this.ops.revokeAllSessions(id);
          break;
        case 'reset':
          this.ops.forcePasswordReset(id);
          break;
        case 'enable':
          this.moderation.enableAccount(id);
          break;
      }
    }
    const labels = { verify: 'verified', warn: 'warned', restrict: 'restricted for 7 days', identity: 'asked to confirm identity', signout: 'signed out everywhere', enable: 're-enabled', reset: 'required to reset password' };
    this.insights.notify(`${ids.length} user(s) ${labels[action]}.`);
  }

  protected bulkDisable(reason: string): void {
    const ids = [...this.selected()];
    for (const id of ids) this.moderation.disableAccount(id, reason || 'Bulk disable from User Management');
    this.confirmBulkDisable.set(false);
    this.insights.notify(`${ids.length} account(s) disabled.`);
  }

  protected bulkRole(e: Event): void {
    const el = e.target as HTMLSelectElement;
    const role = el.value as UserRole;
    if (!role) return;
    for (const id of this.selected()) this.ops.setRole(id, role);
    this.insights.notify(`${this.selected().size} user(s) set to ${roleLabel(role)}.`);
    el.value = '';
  }

  protected bulkTag(e: Event): void {
    const el = e.target as HTMLSelectElement;
    if (!el.value) return;
    for (const id of this.selected()) this.ops.addTag(id, el.value);
    this.insights.notify(`Tag “${el.value}” added to ${this.selected().size} user(s).`);
    el.value = '';
  }

  protected exportSelected(): void {
    const rows = this.selectedRows().length ? this.selectedRows() : this.filtered();
    downloadCsv(
      'neverbeen-users.csv',
      ['UID', 'Name', 'Email', 'Country', 'City', 'Role', 'Account', 'Verified', '2FA', 'Posts', 'Comments', 'Risk', 'Joined', 'Last active', 'Tags'],
      rows.map((r) => [
        r.m.uniqueId,
        r.m.fullName,
        r.m.email,
        r.m.country,
        r.m.city,
        roleLabel(r.role),
        accountStateLabel(r.m.accountState),
        r.m.isVerified ? 'Yes' : 'No',
        r.twoFactor ? 'On' : 'Off',
        r.m.postCount,
        r.m.commentCount,
        r.risk,
        r.m.registeredAtUtc.slice(0, 10),
        r.m.isOnline ? 'Online now' : r.m.lastActiveUtc.slice(0, 10),
        r.tags.join('; '),
      ]),
    );
  }
}
