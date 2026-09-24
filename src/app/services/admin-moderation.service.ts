import { Injectable, computed, inject, signal } from '@angular/core';
import { AdminAuditService } from './admin-audit.service';

/** localStorage keys for Admin Console moderation state. */
export const ADMIN_ACCOUNT_ACTIONS_KEY = 'neverbeen_admin_account_actions';
export const ADMIN_REPORT_DECISIONS_KEY = 'neverbeen_admin_report_decisions';

export type AccountState = 'active' | 'warned' | 'restricted' | 'identity_required' | 'disabled';

/** Parts of the product a restricted member temporarily loses access to. */
export type RestrictionScope = 'posting' | 'commenting' | 'messaging' | 'companion_requests';

export const RESTRICTION_SCOPES: { key: RestrictionScope; label: string }[] = [
  { key: 'posting', label: 'Publishing journey posts' },
  { key: 'commenting', label: 'Commenting & reacting' },
  { key: 'messaging', label: 'Direct messages' },
  { key: 'companion_requests', label: 'Sending companion requests' },
];

export const RESTRICTION_DURATIONS: { days: number; label: string }[] = [
  { days: 1, label: '24 hours' },
  { days: 3, label: '3 days' },
  { days: 7, label: '1 week' },
  { days: 14, label: '2 weeks' },
  { days: 30, label: '1 month' },
];

export interface AccountModeration {
  userId: number;
  state: AccountState;
  /** Number of formal warnings issued so far. */
  warnings: number;
  restrictedUntilUtc?: string;
  restrictions?: RestrictionScope[];
  reason?: string;
  updatedAtUtc: string;
}

export type ReportDecisionType =
  | 'reject'
  | 'warn'
  | 'restrict'
  | 'remove_content'
  | 'identity'
  | 'disable';

export const REPORT_DECISIONS: { key: ReportDecisionType; label: string; hint: string; tone: 'neutral' | 'warn' | 'danger' }[] = [
  { key: 'reject', label: 'Reject report — no violation found', hint: 'Close the report without any action against the member.', tone: 'neutral' },
  { key: 'warn', label: 'Give a formal warning', hint: 'Send the member a warning; it is recorded on their account.', tone: 'warn' },
  { key: 'restrict', label: 'Warn & limit access for a period', hint: 'Warn the member and temporarily switch off selected features.', tone: 'warn' },
  { key: 'remove_content', label: 'Remove reported content & warn', hint: 'Hide the reported post from the community and warn the member.', tone: 'warn' },
  { key: 'identity', label: 'Force identity confirmation', hint: 'Lock the account until the member re-confirms their identity.', tone: 'danger' },
  { key: 'disable', label: 'Disable the account', hint: 'The member can no longer sign in or appear in the community.', tone: 'danger' },
];

export interface ReportDecision {
  reportId: number;
  decision: ReportDecisionType;
  note?: string;
  durationDays?: number;
  restrictions?: RestrictionScope[];
  decidedAtUtc: string;
  decidedBy: string;
}

function load<T>(key: string, fallback: T): T {
  if (typeof localStorage === 'undefined') return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function save<T>(key: string, value: T): void {
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(key, JSON.stringify(value));
  }
}

/**
 * Admin Console moderation state: account actions (warn / restrict / force identity /
 * disable) and abuse-report decisions. Persists to localStorage, like the rest of the
 * NeverBeen demo datasets. Deliberately has no dependency on CommunityService so the
 * community layer can consume `disabledUserIds` without a circular dependency.
 */
@Injectable({ providedIn: 'root' })
export class AdminModerationService {
  private readonly audit = inject(AdminAuditService);
  readonly accountActions = signal<Record<number, AccountModeration>>(
    load<Record<number, AccountModeration>>(ADMIN_ACCOUNT_ACTIONS_KEY, {}),
  );
  readonly reportDecisions = signal<Record<number, ReportDecision>>(
    load<Record<number, ReportDecision>>(ADMIN_REPORT_DECISIONS_KEY, {}),
  );

  readonly disabledUserIds = computed(() =>
    Object.values(this.accountActions())
      .filter((a) => a.state === 'disabled')
      .map((a) => Number(a.userId)),
  );

  /** Effective account state — expired restrictions fall back to 'warned'. */
  stateOf(userId: number): AccountState {
    const action = this.accountActions()[userId];
    if (!action) return 'active';
    if (action.state === 'restricted' && action.restrictedUntilUtc) {
      if (new Date(action.restrictedUntilUtc).getTime() < Date.now()) return 'warned';
    }
    return action.state;
  }

  actionOf(userId: number): AccountModeration | undefined {
    return this.accountActions()[userId];
  }

  disableAccount(userId: number, reason = 'Disabled by administrator'): void {
    this.patch(userId, { state: 'disabled', reason });
    this.audit.log({ category: 'account', action: 'Account disabled', targetId: userId, details: reason });
  }

  enableAccount(userId: number): void {
    this.patch(userId, { state: 'active', reason: 'Re-enabled by administrator', restrictedUntilUtc: undefined, restrictions: undefined });
    this.audit.log({ category: 'account', action: 'Account re-enabled', targetId: userId });
  }

  warn(userId: number, reason = 'Formal warning issued'): void {
    const current = this.accountActions()[userId];
    this.patch(userId, {
      state: current?.state === 'disabled' || current?.state === 'identity_required' ? current.state : 'warned',
      warnings: (current?.warnings ?? 0) + 1,
      reason,
    });
    this.audit.log({ category: 'moderation', action: 'Warning issued', targetId: userId, details: reason });
  }

  restrict(userId: number, days: number, scopes: RestrictionScope[], reason = 'Temporarily restricted'): void {
    const current = this.accountActions()[userId];
    const until = new Date(Date.now() + days * 86_400_000).toISOString();
    this.patch(userId, {
      state: 'restricted',
      warnings: (current?.warnings ?? 0) + 1,
      restrictedUntilUtc: until,
      restrictions: scopes.length ? scopes : ['posting', 'commenting'],
      reason,
    });
    this.audit.log({
      category: 'moderation',
      action: `Restricted for ${days} day(s)`,
      targetId: userId,
      details: `${(scopes.length ? scopes : ['posting', 'commenting']).join(', ')} — ${reason}`,
    });
  }

  forceIdentityConfirmation(userId: number, reason = 'Identity confirmation required'): void {
    this.patch(userId, { state: 'identity_required', reason });
    this.audit.log({ category: 'security', action: 'Identity confirmation required', targetId: userId, details: reason });
  }

  decideReport(decision: Omit<ReportDecision, 'decidedAtUtc' | 'decidedBy'>): void {
    const full: ReportDecision = { ...decision, decidedAtUtc: new Date().toISOString(), decidedBy: 'admin' };
    this.reportDecisions.update((map) => ({ ...map, [decision.reportId]: full }));
    save(ADMIN_REPORT_DECISIONS_KEY, this.reportDecisions());
    this.audit.log({ category: 'moderation', action: `Abuse report #${decision.reportId} decided: ${decision.decision}`, details: decision.note });
  }

  reopenReport(reportId: number): void {
    this.reportDecisions.update((map) => {
      const next = { ...map };
      delete next[reportId];
      return next;
    });
    save(ADMIN_REPORT_DECISIONS_KEY, this.reportDecisions());
    this.audit.log({ category: 'moderation', action: `Abuse report #${reportId} re-opened` });
  }

  private patch(userId: number, patch: Partial<AccountModeration>): void {
    const id = Number(userId);
    this.accountActions.update((map) => {
      const current: AccountModeration = map[id] ?? { userId: id, state: 'active', warnings: 0, updatedAtUtc: '' };
      return { ...map, [id]: { ...current, ...patch, userId: id, updatedAtUtc: new Date().toISOString() } };
    });
    save(ADMIN_ACCOUNT_ACTIONS_KEY, this.accountActions());
  }
}

export function accountStateLabel(state: AccountState): string {
  switch (state) {
    case 'warned':
      return 'Warned';
    case 'restricted':
      return 'Restricted';
    case 'identity_required':
      return 'Identity check';
    case 'disabled':
      return 'Disabled';
    default:
      return 'Active';
  }
}
