import { Component, computed, inject, input, output, signal } from '@angular/core';
import { AdminInsightsService, SUSPICIOUS_META, shortDate, timeAgo } from '../shared/admin-insights.service';
import { AdminUserOpsService, ROLES, SUGGESTED_TAGS, UserRole, roleMeta } from '../shared/admin-user-ops.service';
import { AdminDataOpsService, maskValue } from '../shared/admin-data-ops.service';
import {
  AccountState,
  AdminModerationService,
  RESTRICTION_DURATIONS,
  RESTRICTION_SCOPES,
  RestrictionScope,
  accountStateLabel,
} from '../../../services/admin-moderation.service';
import { AdminAuditService, AUDIT_CATEGORY_META } from '../../../services/admin-audit.service';
import { CommunityService } from '../../../services/community.service';
import { AdminConfirmDialog } from '../shared/admin-confirm-dialog';
import { AdminIdentityService, IDENTITY_STATUS_META } from '../shared/admin-identity.service';
import type { JourneyComment } from '../../../models/community';

type Tab = 'overview' | 'activity' | 'moderation' | 'security' | 'notes';
type Pending = 'disable' | 'identity' | 'erase' | 'signout' | null;

interface TimelineItem {
  at: string;
  icon: string;
  title: string;
  detail?: string;
  tone?: string;
}

/** User 360° drawer — full profile, activity, moderation, security/devices, notes/tags and every account control. */
@Component({
  selector: 'app-admin-user-drawer',
  imports: [AdminConfirmDialog],
  templateUrl: './user-drawer.html',
  styleUrls: ['../shared/admin-grid.css', './user-drawer.css'],
})
export class AdminUserDrawer {
  private readonly insights = inject(AdminInsightsService);
  protected readonly ops = inject(AdminUserOpsService);
  private readonly moderation = inject(AdminModerationService);
  private readonly dataOps = inject(AdminDataOpsService);
  private readonly audit = inject(AdminAuditService);
  private readonly community = inject(CommunityService);
  private readonly identity = inject(AdminIdentityService);

  readonly userId = input.required<number>();
  readonly closed = output<void>();

  protected readonly roles = ROLES;
  protected readonly roleMeta = roleMeta;
  protected readonly durations = RESTRICTION_DURATIONS;
  protected readonly scopes = RESTRICTION_SCOPES;
  protected readonly suggestedTags = SUGGESTED_TAGS;
  protected readonly stateLabel = accountStateLabel;
  protected readonly timeAgo = timeAgo;
  protected readonly shortDate = shortDate;
  protected readonly susMeta = SUSPICIOUS_META;
  protected readonly idStatus = IDENTITY_STATUS_META;

  protected readonly tab = signal<Tab>('overview');
  protected readonly revealPii = signal(false);
  protected readonly showRestrict = signal(false);
  protected readonly restrictDays = signal(7);
  protected readonly restrictScopes = signal<RestrictionScope[]>(['posting', 'commenting']);
  protected readonly noteDraft = signal('');
  protected readonly tagDraft = signal('');
  protected readonly pending = signal<Pending>(null);
  protected readonly eraseMode = signal<'anonymize' | 'delete'>('anonymize');
  protected readonly copied = signal(false);

  protected readonly member = computed(() => this.insights.member(this.userId()));
  protected readonly companion = computed(() => this.community.companions().find((c) => Number(c.id) === this.userId()));
  protected readonly role = computed(() => {
    this.ops.state();
    return this.ops.roleOf(this.userId());
  });
  protected readonly tags = computed(() => {
    this.ops.state();
    return this.ops.tagsOf(this.userId());
  });
  protected readonly notes = computed(() => {
    this.ops.state();
    return this.ops.notesOf(this.userId());
  });
  protected readonly security = computed(() => {
    this.ops.state();
    const m = this.member();
    return m ? this.ops.security(m) : null;
  });
  protected readonly sessions = computed(() => {
    this.ops.state();
    const m = this.member();
    return m ? this.ops.sessionsOf(m) : [];
  });
  protected readonly locked = computed(() => this.companion()?.isProfileLocked === true);
  protected readonly action = computed(() => {
    this.moderation.accountActions();
    return this.moderation.actionOf(this.userId());
  });
  protected readonly suspicious = computed(() => this.insights.suspiciousUsers().find((s) => s.member.id === this.userId()));
  protected readonly reportsAgainst = computed(() => this.insights.reports().filter((r) => r.reported.id === this.userId()));
  protected readonly idHistory = computed(() => this.identity.historyOf(this.userId()));
  protected readonly reportsFiled = computed(() => this.insights.reports().filter((r) => r.reporter.id === this.userId()));

  protected readonly details = computed(() => {
    const c = this.companion();
    const m = this.member();
    if (!m) return [];
    const a = c?.aboutMeDetails;
    const pii = (v: string | undefined) => (!v ? '—' : this.revealPii() ? v : maskValue(v));
    return [
      { label: 'Email', value: pii(m.email), pii: true },
      { label: 'Phone', value: pii(a?.contactPhone), pii: true },
      { label: 'Date of birth', value: pii(a?.dateOfBirth), pii: true },
      { label: 'Gender · Age', value: `${m.gender} · ${m.age} (${m.ageGroup})` },
      { label: 'Location', value: [m.city, m.country].filter(Boolean).join(', ') || '—' },
      { label: 'Hometown', value: a?.hometown || '—' },
      { label: 'Profession', value: `${m.profession}` },
      { label: 'Languages', value: a?.languagesKnown?.join(', ') || '—' },
      { label: 'Relationship', value: a?.relationshipStatus || '—' },
      { label: 'Companions', value: String(c?.connectedCompanionIds?.length ?? c?.mutualCompanionsCount ?? 0) },
      { label: 'Joined', value: shortDate(m.registeredAtUtc) },
      { label: 'Last active', value: m.isOnline ? 'Online now' : timeAgo(m.lastActiveUtc) },
    ];
  });

  protected readonly timeline = computed<TimelineItem[]>(() => {
    const id = this.userId();
    const m = this.member();
    if (!m) return [];
    const items: TimelineItem[] = [];
    for (const p of this.community.journeyPosts()) {
      if (Number(p.author?.id) === id) {
        items.push({ at: p.createdAtUtc, icon: '📝', title: 'Published a journey post', detail: (p.text || '').slice(0, 110) + (p.location ? ` · 📍 ${p.location}` : '') });
      }
      const walk = (list?: JourneyComment[]) =>
        (list ?? []).forEach((c) => {
          if (Number(c.author?.id) === id) items.push({ at: c.createdAtUtc, icon: '💬', title: `Commented on ${p.author?.fullName ?? 'a post'}'s journey`, detail: (c.text || '').slice(0, 110) });
          walk(c.replies);
        });
      walk(p.comments);
    }
    for (const e of this.audit.entries()) {
      if (e.targetId === id) items.push({ at: e.atUtc, icon: AUDIT_CATEGORY_META[e.category].icon, title: e.action, detail: e.details ? `by ${e.actor} — ${e.details}` : `by ${e.actor}`, tone: 'admin' });
    }
    for (const r of this.reportsAgainst()) items.push({ at: r.createdAtUtc, icon: '🚩', title: `Reported by ${r.reporter.fullName}`, detail: r.reason, tone: 'warn' });
    for (const s of this.suspicious()?.signals ?? []) items.push({ at: s.detectedAtUtc, icon: SUSPICIOUS_META[s.type].icon, title: `Flagged: ${SUSPICIOUS_META[s.type].label}`, detail: s.evidence, tone: 'warn' });
    const sec = this.security();
    if (sec) items.push({ at: sec.lastLoginUtc, icon: '🔓', title: 'Signed in', detail: this.sessions()[0] ? `${this.sessions()[0].device} · ${this.sessions()[0].city}` : undefined });
    items.push({ at: m.registeredAtUtc, icon: '🎉', title: `Joined NeverBeen via ${sec?.signupMethod ?? 'Email'}` });
    return items.sort((a, b) => b.at.localeCompare(a.at)).slice(0, 40);
  });

  protected readonly tabs: { key: Tab; label: string }[] = [
    { key: 'overview', label: 'Overview' },
    { key: 'activity', label: 'Activity' },
    { key: 'moderation', label: 'Moderation' },
    { key: 'security', label: 'Security & devices' },
    { key: 'notes', label: 'Notes & tags' },
  ];

  protected stateTone(state: AccountState): string {
    return state === 'active' ? 'ok' : state === 'disabled' ? 'danger' : state === 'identity_required' ? 'violet' : 'warn';
  }

  protected toggleReveal(): void {
    const next = !this.revealPii();
    this.revealPii.set(next);
    if (next) {
      this.audit.log({ category: 'privacy', action: 'Personal data revealed in user profile', targetId: this.userId(), targetLabel: this.member()?.fullName });
    }
  }

  protected copyUid(): void {
    const uid = this.member()?.uniqueId ?? '';
    navigator.clipboard?.writeText(uid).catch(() => undefined);
    this.copied.set(true);
    setTimeout(() => this.copied.set(false), 1500);
  }

  protected setRole(e: Event): void {
    this.ops.setRole(this.userId(), (e.target as HTMLSelectElement).value as UserRole);
    this.insights.notify(`${this.member()?.fullName}'s role updated.`);
  }

  protected toggleVerify(): void {
    const next = !this.member()?.isVerified;
    this.ops.setVerified(this.userId(), next);
    this.insights.notify(next ? 'Member verified.' : 'Verification removed.');
  }

  protected toggleLock(): void {
    const next = !this.locked();
    this.ops.setProfileLocked(this.userId(), next);
    this.insights.notify(next ? 'Profile locked (private).' : 'Profile unlocked (public).');
  }

  protected warn(): void {
    this.moderation.warn(this.userId(), 'Warning issued from User Management');
    this.insights.notify(`Warning sent to ${this.member()?.fullName}.`);
  }

  protected toggleScope(scope: RestrictionScope, on: boolean): void {
    this.restrictScopes.update((list) => (on ? [...new Set([...list, scope])] : list.filter((s) => s !== scope)));
  }

  protected applyRestrict(): void {
    this.moderation.restrict(this.userId(), this.restrictDays(), this.restrictScopes(), 'Restricted from User Management');
    this.showRestrict.set(false);
    this.insights.notify(`${this.member()?.fullName} restricted for ${this.durations.find((d) => d.days === this.restrictDays())?.label}.`);
  }

  protected resetPassword(): void {
    this.ops.forcePasswordReset(this.userId());
    this.insights.notify('Password reset will be required at next sign-in.');
  }

  protected enable(): void {
    this.insights.enable(this.userId());
  }

  protected confirm(reason: string): void {
    const id = this.userId();
    switch (this.pending()) {
      case 'disable':
        this.insights.disable(id, reason || 'Disabled from User Management');
        break;
      case 'identity':
        this.insights.forceIdentity(id);
        break;
      case 'signout':
        this.ops.revokeAllSessions(id);
        this.insights.notify('Signed out of every device.');
        break;
      case 'erase': {
        const name = this.member()?.fullName;
        const res = this.dataOps.eraseUser(id, this.eraseMode());
        this.insights.notify(`${name} erased — ${res.posts} posts and ${res.comments} comments ${this.eraseMode() === 'delete' ? 'deleted' : 'anonymised'}.`);
        this.pending.set(null);
        this.closed.emit();
        return;
      }
    }
    this.pending.set(null);
  }

  protected exportData(): void {
    this.dataOps.exportUserPackage(this.userId());
    this.insights.notify('Personal data package downloaded.');
  }

  protected addNote(): void {
    this.ops.addNote(this.userId(), this.noteDraft());
    this.noteDraft.set('');
  }

  protected addTag(value?: string): void {
    this.ops.addTag(this.userId(), value ?? this.tagDraft());
    this.tagDraft.set('');
  }
}
