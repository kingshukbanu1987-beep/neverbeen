import { Component, computed, effect, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink, RouterLinkActive } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import {
  AGE_GROUPS,
  AdminInsightsService,
  MemberInsight,
  PROFESSION_CATEGORIES,
  downloadCsv,
  shortDate,
  timeAgo,
} from '../shared/admin-insights.service';
import { AccountState, accountStateLabel } from '../../../services/admin-moderation.service';
import { AdminConfirmDialog } from '../shared/admin-confirm-dialog';
import { SelectValueSync } from '../../../shared/select-value-sync';

type Mode = 'all' | 'verified' | 'online';
type SortKey = 'name' | 'location' | 'age' | 'profession' | 'joined' | 'posts' | 'lastActive';

const MODE_META: Record<Mode, { title: string; subtitle: string; csv: string }> = {
  all: { title: 'All Members', subtitle: 'Every registered NeverBeen community member.', csv: 'all-members' },
  verified: { title: 'Verified Members', subtitle: 'Members whose identity has been confirmed via work or university email.', csv: 'verified-members' },
  online: { title: 'Online Now', subtitle: 'Members active on the platform at this moment.', csv: 'online-members' },
};

/**
 * Admin > Members grid — used for "Total Members", "Verified Members" and
 * "Online Now". Filterable, sortable, paginated table / card grid with CSV export.
 */
@Component({
  selector: 'app-admin-members',
  imports: [SelectValueSync, RouterLink, RouterLinkActive, AdminConfirmDialog],
  templateUrl: './members.html',
  styleUrls: ['../shared/admin-grid.css'],
})
export class AdminMembers {
  private readonly insights = inject(AdminInsightsService);
  private readonly route = inject(ActivatedRoute);
  private readonly routeData = toSignal(this.route.data);

  protected readonly mode = computed<Mode>(() => (this.routeData()?.['mode'] as Mode) ?? 'all');
  protected readonly meta = computed(() => MODE_META[this.mode()]);

  protected readonly ageGroups = AGE_GROUPS;
  protected readonly professionCategories = PROFESSION_CATEGORIES;
  protected readonly accountStates: AccountState[] = ['active', 'warned', 'restricted', 'identity_required', 'disabled'];
  protected readonly stateLabel = accountStateLabel;
  protected readonly shortDate = shortDate;
  protected readonly timeAgo = timeAgo;

  // Filters
  protected readonly search = signal('');
  protected readonly country = signal('');
  protected readonly gender = signal('');
  protected readonly ageGroup = signal('');
  protected readonly profession = signal('');
  protected readonly verification = signal('');
  protected readonly account = signal('');
  protected readonly joined = signal('');

  // View state
  protected readonly view = signal<'table' | 'cards'>('table');
  protected readonly compact = signal(false);
  protected readonly sortKey = signal<SortKey>('joined');
  protected readonly sortDir = signal<1 | -1>(-1);
  protected readonly page = signal(1);
  protected readonly pageSize = signal(25);

  protected readonly confirmTarget = signal<MemberInsight | null>(null);

  protected readonly counts = computed(() => ({
    all: this.insights.members().length,
    verified: this.insights.verifiedMembers().length,
    online: this.insights.onlineMembers().length,
  }));

  /** Members in the current mode, before toolbar filters. */
  private readonly base = computed(() => {
    switch (this.mode()) {
      case 'verified':
        return this.insights.verifiedMembers();
      case 'online':
        return this.insights.onlineMembers();
      default:
        return this.insights.members();
    }
  });

  protected readonly countries = computed(() => [...new Set(this.base().map((m) => m.country))].sort());
  protected readonly genders = computed(() => [...new Set(this.base().map((m) => m.gender))].sort());

  protected readonly filtered = computed(() => {
    const term = this.search().trim().toLowerCase();
    const now = Date.now();
    const joinedDays = this.joined() === '7' ? 7 : this.joined() === '30' ? 30 : this.joined() === '365' ? 365 : 0;
    const rows = this.base().filter((m) => {
      if (this.country() && m.country !== this.country()) return false;
      if (this.gender() && m.gender !== this.gender()) return false;
      if (this.ageGroup() && m.ageGroup !== this.ageGroup()) return false;
      if (this.profession() && m.professionCategory !== this.profession()) return false;
      if (this.verification() === 'verified' && !m.isVerified) return false;
      if (this.verification() === 'unverified' && m.isVerified) return false;
      if (this.account() && m.accountState !== this.account()) return false;
      if (joinedDays && now - new Date(m.registeredAtUtc).getTime() > joinedDays * 86_400_000) return false;
      if (!term) return true;
      return (
        m.fullName.toLowerCase().includes(term) ||
        m.uniqueId.includes(term) ||
        m.email.toLowerCase().includes(term) ||
        m.city.toLowerCase().includes(term) ||
        m.country.toLowerCase().includes(term) ||
        m.profession.toLowerCase().includes(term)
      );
    });

    const dir = this.sortDir();
    const key = this.sortKey();
    const val = (m: MemberInsight): string | number => {
      switch (key) {
        case 'name':
          return m.fullName.toLowerCase();
        case 'location':
          return `${m.country} ${m.city}`.toLowerCase();
        case 'age':
          return m.age;
        case 'profession':
          return m.profession.toLowerCase();
        case 'posts':
          return m.postCount;
        case 'lastActive':
          return m.lastActiveUtc;
        default:
          return m.registeredAtUtc;
      }
    };
    return rows.slice().sort((a, b) => {
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
  protected readonly pageNumbers = computed(() => {
    const total = this.totalPages();
    const current = this.currentPage();
    const from = Math.max(1, Math.min(current - 2, total - 4));
    return Array.from({ length: Math.min(5, total) }, (_, i) => from + i);
  });

  protected readonly kpis = computed(() => {
    const rows = this.filtered();
    const verified = rows.filter((m) => m.isVerified).length;
    const avgAge = rows.length ? Math.round(rows.reduce((s, m) => s + m.age, 0) / rows.length) : 0;
    return [
      { label: 'Matching members', value: rows.length.toLocaleString(), glow: 'rgba(16,185,129,0.18)' },
      { label: 'Verified', value: rows.length ? `${Math.round((verified / rows.length) * 100)}%` : '—', glow: 'rgba(29,155,240,0.18)' },
      { label: 'Online now', value: rows.filter((m) => m.isOnline).length.toLocaleString(), glow: 'rgba(34,197,94,0.18)' },
      { label: 'Countries', value: new Set(rows.map((m) => m.country)).size.toString(), glow: 'rgba(99,102,241,0.18)' },
      { label: 'Average age', value: avgAge ? `${avgAge} yrs` : '—', glow: 'rgba(245,158,11,0.18)' },
    ];
  });

  protected readonly activeFilters = computed(() => {
    const list: { label: string; clear: () => void }[] = [];
    const push = (value: string, label: string, s: { set: (v: string) => void }) => {
      if (value) list.push({ label, clear: () => s.set('') });
    };
    push(this.search(), `Search: “${this.search()}”`, this.search);
    push(this.country(), `Country: ${this.country()}`, this.country);
    push(this.gender(), `Gender: ${this.gender()}`, this.gender);
    push(this.ageGroup(), `Age: ${this.ageGroup()}`, this.ageGroup);
    push(this.profession(), `Profession: ${this.profession()}`, this.profession);
    push(this.verification(), this.verification() === 'verified' ? 'Verified only' : 'Unverified only', this.verification);
    push(this.account(), `Account: ${accountStateLabel(this.account() as AccountState)}`, this.account);
    push(this.joined(), `Joined: last ${this.joined()} days`, this.joined);
    return list;
  });

  constructor() {
    // Reset to the first page whenever the result set changes shape.
    effect(() => {
      for (const s of [this.search, this.country, this.gender, this.ageGroup, this.profession, this.verification, this.account, this.joined]) s();
      this.mode();
      this.pageSize();
      this.page.set(1);
    });
  }

  protected set(sig: { set: (v: string) => void }, event: Event): void {
    sig.set((event.target as HTMLInputElement | HTMLSelectElement).value);
  }

  protected clearAll(): void {
    for (const s of [this.search, this.country, this.gender, this.ageGroup, this.profession, this.verification, this.account, this.joined]) {
      s.set('');
    }
  }

  protected sortBy(key: SortKey): void {
    if (this.sortKey() === key) {
      this.sortDir.update((d) => (d === 1 ? -1 : 1));
    } else {
      this.sortKey.set(key);
      this.sortDir.set(key === 'name' || key === 'location' || key === 'profession' ? 1 : -1);
    }
  }

  protected arrow(key: SortKey): string {
    return this.sortKey() === key ? (this.sortDir() === 1 ? '▲' : '▼') : '↕';
  }

  protected setPageSize(event: Event): void {
    this.pageSize.set(Number((event.target as HTMLSelectElement).value));
  }

  protected stateTone(state: AccountState): string {
    return state === 'active' ? 'ok' : state === 'disabled' ? 'danger' : state === 'identity_required' ? 'violet' : 'warn';
  }

  protected askDisable(member: MemberInsight): void {
    this.confirmTarget.set(member);
  }

  protected confirmDisable(reason: string): void {
    const m = this.confirmTarget();
    if (m) this.insights.disable(m.id, reason || undefined);
    this.confirmTarget.set(null);
  }

  protected enable(member: MemberInsight): void {
    this.insights.enable(member.id);
  }

  protected exportCsv(): void {
    downloadCsv(
      `neverbeen-${this.meta().csv}.csv`,
      ['UID', 'Name', 'Email', 'Country', 'City', 'Gender', 'Age', 'Profession', 'Verified', 'Online', 'Joined', 'Posts', 'Account'],
      this.filtered().map((m) => [
        m.uniqueId,
        m.fullName,
        m.email,
        m.country,
        m.city,
        m.gender,
        m.age,
        m.profession,
        m.isVerified ? 'Yes' : 'No',
        m.isOnline ? 'Yes' : 'No',
        m.registeredAtUtc.slice(0, 10),
        m.postCount,
        accountStateLabel(m.accountState),
      ]),
    );
  }
}
