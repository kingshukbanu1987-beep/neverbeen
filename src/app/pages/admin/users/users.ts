import { Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import { AdminInsightsService } from '../shared/admin-insights.service';
import { AdminUserOpsService } from '../shared/admin-user-ops.service';
import { AdminUserDirectory } from './user-directory';
import { AdminUserDrawer } from './user-drawer';
import { AdminRolesMatrix } from './roles-matrix';
import { AdminSessionsSecurity } from './sessions-security';
import { AdminAuditLog } from '../shared/admin-audit-log';
import type { AuditCategory } from '../../../services/admin-audit.service';
import { AdminUserInsights, INSIGHT_SECTIONS, InsightSection } from './insights/user-insights';

type ManageTab = 'directory' | 'roles' | 'sessions' | 'audit';
type UsersTab = ManageTab | InsightSection;

const DAY = 864e5;

/**
 * Admin > User Management — directory with segments & bulk actions, a User 360° drawer,
 * roles/permissions (RBAC), sessions & security monitoring and an audit trail.
 */
@Component({
  selector: 'app-admin-users',
  imports: [AdminUserDirectory, AdminUserDrawer, AdminRolesMatrix, AdminSessionsSecurity, AdminAuditLog, AdminUserInsights],
  styleUrls: ['../shared/admin-grid.css', './users.css'],
  template: `
    <header class="g-page-head">
      <div>
        <h2>User Management</h2>
        <p>Know every member at a glance and control their account — roles, access, security and privacy.</p>
      </div>
    </header>

    @if (!isInsight()) {
    <div class="g-kpis um-kpis">
      @for (k of kpis(); track k.label) {
        <div class="g-kpi" [style.--kpi-glow]="k.glow">
          <small>{{ k.label }}</small>
          <strong>{{ k.value }}</strong>
          <span class="um-kpi-sub">{{ k.sub }}</span>
          @if (k.pct !== undefined) {
            <span class="um-kpi-bar"><i [style.width.%]="k.pct"></i></span>
          }
        </div>
      }
    </div>
    }

    <div class="um-tabs-row">
      <nav class="g-tabs" role="tablist" aria-label="User management sections">
        @for (t of tabs; track t.key) {
          <button type="button" role="tab" [class.active]="tab() === t.key" [attr.aria-selected]="tab() === t.key" (click)="setTab(t.key)">
            {{ t.icon }} {{ t.label }}
            @if (t.key === 'sessions' && alertCount()) {
              <span class="count">{{ alertCount() }}</span>
            }
          </button>
        }
      </nav>
      <nav class="um-insight-tabs" role="tablist" aria-label="User insights">
        <span class="um-insight-label">📊 Insights</span>
        @for (t of insightTabs; track t.key) {
          <button type="button" role="tab" class="um-itab" [class.active]="tab() === t.key" [attr.aria-selected]="tab() === t.key" [attr.data-tab]="t.key" (click)="setTab(t.key)" [title]="t.title">
            <span aria-hidden="true">{{ t.icon }}</span> {{ t.label }}
          </button>
        }
      </nav>
    </div>

    @switch (tab()) {
      @case ('directory') {
        <app-admin-user-directory (manage)="open($event)" />
      }
      @case ('roles') {
        <app-admin-roles-matrix />
      }
      @case ('sessions') {
        <app-admin-sessions-security (manage)="open($event)" />
      }
      @case ('audit') {
        <app-admin-audit-log [categories]="auditCategories" />
      }
      @default {
        @defer (on immediate) {
          <app-admin-user-insights [section]="insightTab()" />
        } @placeholder {
          <div class="um-skeleton" aria-busy="true" aria-label="Loading insights"><i></i><i></i><i></i></div>
        }
      }
    }

    @if (openId(); as id) {
      <app-admin-user-drawer [userId]="id" (closed)="close()" />
    }
  `,
})
export class AdminUsers {
  private readonly insights = inject(AdminInsightsService);
  private readonly ops = inject(AdminUserOpsService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  protected readonly tabs: { key: UsersTab; label: string; icon: string }[] = [
    { key: 'directory', label: 'Directory', icon: '👥' },
    { key: 'roles', label: 'Roles & permissions', icon: '🎖️' },
    { key: 'sessions', label: 'Sessions & security', icon: '🔐' },
    { key: 'audit', label: 'Audit log', icon: '🧾' },
  ];
  protected readonly insightTabs = INSIGHT_SECTIONS;
  protected readonly auditCategories: AuditCategory[] = ['account', 'moderation', 'role', 'security'];

  private readonly query = toSignal(this.route.queryParamMap.pipe(map((p) => ({ tab: p.get('tab'), user: p.get('user') }))), {
    initialValue: { tab: null, user: null },
  });
  private readonly localTab = signal<UsersTab | null>(null);
  private readonly localOpen = signal<number | null | undefined>(undefined);

  protected readonly tab = computed<UsersTab>(() => {
    const t = this.localTab() ?? this.query().tab;
    return this.tabs.some((x) => x.key === t) || INSIGHT_SECTIONS.some((x) => x.key === t) ? (t as UsersTab) : 'directory';
  });
  protected readonly isInsight = computed(() => INSIGHT_SECTIONS.some((x) => x.key === this.tab()));
  protected readonly insightTab = computed<InsightSection>(() => (this.isInsight() ? (this.tab() as InsightSection) : 'registrations'));

  constructor() {
    // A new ?tab= in the URL (e.g. from the side panel) wins over the last clicked tab.
    effect(() => {
      this.query().tab;
      untracked(() => this.localTab.set(null));
    });
  }

  protected readonly openId = computed<number | null>(() => {
    const local = this.localOpen();
    if (local !== undefined) return local;
    const u = Number(this.query().user);
    return Number.isFinite(u) && u > 0 ? u : null;
  });

  protected readonly alertCount = computed(() => this.ops.loginAlerts().length);

  protected readonly kpis = computed(() => {
    const members = this.insights.members();
    const now = Date.now();
    const total = members.length || 1;
    const new7 = members.filter((m) => now - Date.parse(m.registeredAtUtc) <= 7 * DAY).length;
    const active24 = members.filter((m) => m.isOnline || now - Date.parse(m.lastActiveUtc) <= DAY).length;
    const verified = members.filter((m) => m.isVerified).length;
    const restricted = members.filter((m) => m.accountState === 'restricted' || m.accountState === 'warned' || m.accountState === 'identity_required').length;
    const disabled = members.filter((m) => m.accountState === 'disabled').length;
    this.ops.state();
    const twoFa = members.filter((m) => this.ops.security(m).twoFactor).length;
    const pct = (n: number) => Math.round((n / total) * 100);
    return [
      { label: 'Total users', value: members.length.toLocaleString(), sub: `${this.ops.roleCounts().moderator + this.ops.roleCounts().admin} staff accounts`, glow: 'rgba(99,102,241,0.16)' },
      { label: 'New · 7 days', value: new7.toLocaleString(), sub: 'Registrations this week', glow: 'rgba(16,185,129,0.16)' },
      { label: 'Active · 24h', value: active24.toLocaleString(), sub: `${pct(active24)}% daily active`, pct: pct(active24), glow: 'rgba(14,165,233,0.16)' },
      { label: 'Verified', value: `${pct(verified)}%`, sub: `${verified.toLocaleString()} identity-verified`, pct: pct(verified), glow: 'rgba(16,185,129,0.16)' },
      { label: '2FA adoption', value: `${pct(twoFa)}%`, sub: `${twoFa.toLocaleString()} protected accounts`, pct: pct(twoFa), glow: 'rgba(139,92,246,0.16)' },
      { label: 'Restricted · Disabled', value: `${restricted} · ${disabled}`, sub: 'Accounts under action', glow: 'rgba(239,68,68,0.16)' },
    ];
  });

  protected setTab(tab: UsersTab): void {
    this.localTab.set(tab);
    this.syncUrl();
  }

  protected open(id: number): void {
    this.localOpen.set(id);
    this.syncUrl();
  }

  protected close(): void {
    this.localOpen.set(null);
    this.syncUrl();
  }

  private syncUrl(): void {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { tab: this.tab() === 'directory' ? null : this.tab(), user: this.openId() ?? null },
      replaceUrl: true,
    });
  }
}
