import { Injectable, computed, inject, signal } from '@angular/core';
import { AdminAuditService } from '../../../services/admin-audit.service';
import { CommunityService } from '../../../services/community.service';
import { AdminInsightsService, MemberInsight, seeded } from './admin-insights.service';

export const ADMIN_USER_OPS_KEY = 'neverbeen_admin_user_ops';

/* ------------------------------------------------------------------ */
/*  Roles & permissions (RBAC)                                         */
/* ------------------------------------------------------------------ */

export type UserRole = 'member' | 'creator' | 'ambassador' | 'moderator' | 'admin';

export const ROLES: { key: UserRole; label: string; icon: string; description: string; tone: string }[] = [
  { key: 'member', label: 'Member', icon: '👤', description: 'Standard community member', tone: '' },
  { key: 'creator', label: 'Verified Creator', icon: '📸', description: 'Trusted storyteller with boosted reach', tone: 'info' },
  { key: 'ambassador', label: 'Ambassador', icon: '🌟', description: 'Local guide representing NeverBeen', tone: 'ok' },
  { key: 'moderator', label: 'Moderator', icon: '🛡️', description: 'Reviews reports & moderates content', tone: 'violet' },
  { key: 'admin', label: 'Administrator', icon: '👑', description: 'Full access to the Admin Console', tone: 'danger' },
];

export type Permission =
  | 'post'
  | 'comment'
  | 'message'
  | 'circles'
  | 'feature_posts'
  | 'moderate_comments'
  | 'review_reports'
  | 'manage_users'
  | 'data_tools';

export const PERMISSIONS: { key: Permission; label: string; group: string }[] = [
  { key: 'post', label: 'Publish journey posts', group: 'Community' },
  { key: 'comment', label: 'Comment & react', group: 'Community' },
  { key: 'message', label: 'Direct messages', group: 'Community' },
  { key: 'circles', label: 'Create circles', group: 'Community' },
  { key: 'feature_posts', label: 'Feature / pin posts', group: 'Content' },
  { key: 'moderate_comments', label: 'Hide or remove comments', group: 'Content' },
  { key: 'review_reports', label: 'Review abuse reports', group: 'Trust & Safety' },
  { key: 'manage_users', label: 'Manage user accounts', group: 'Administration' },
  { key: 'data_tools', label: 'Access data tools', group: 'Administration' },
];

type Matrix = Record<UserRole, Record<Permission, boolean>>;

function defaultMatrix(): Matrix {
  const all = (on: Permission[]) =>
    Object.fromEntries(PERMISSIONS.map((p) => [p.key, on.includes(p.key)])) as Record<Permission, boolean>;
  return {
    member: all(['post', 'comment', 'message']),
    creator: all(['post', 'comment', 'message', 'circles']),
    ambassador: all(['post', 'comment', 'message', 'circles', 'feature_posts']),
    moderator: all(['post', 'comment', 'message', 'circles', 'feature_posts', 'moderate_comments', 'review_reports']),
    admin: all(PERMISSIONS.map((p) => p.key)),
  };
}

/* ------------------------------------------------------------------ */
/*  Sessions & security                                                */
/* ------------------------------------------------------------------ */

export interface UserSession {
  id: string;
  userId: number;
  device: string;
  platform: string;
  browser: string;
  icon: string;
  city: string;
  country: string;
  ip: string;
  startedUtc: string;
  lastSeenUtc: string;
  active: boolean;
  risk?: string;
}

export interface UserSecurity {
  emailVerified: boolean;
  twoFactor: boolean;
  signupMethod: 'Email' | 'Google' | 'Facebook';
  passwordChangedUtc: string;
  passwordResetRequired: boolean;
  failedLogins24h: number;
  lastLoginUtc: string;
}

export interface AdminNote {
  id: number;
  text: string;
  atUtc: string;
  author: string;
}

interface UserOpsState {
  roles: Record<number, UserRole>;
  tags: Record<number, string[]>;
  notes: Record<number, AdminNote[]>;
  revokedSessions: string[];
  revokedAllBefore: Record<number, string>;
  passwordReset: Record<number, string>;
  matrix: Matrix;
}

const DEVICES = [
  { device: 'iPhone 15', platform: 'iOS 18', browser: 'Safari', icon: '📱' },
  { device: 'Pixel 8', platform: 'Android 15', browser: 'Chrome', icon: '📱' },
  { device: 'Galaxy S24', platform: 'Android 15', browser: 'Samsung Internet', icon: '📱' },
  { device: 'MacBook Air', platform: 'macOS 15', browser: 'Chrome', icon: '💻' },
  { device: 'Windows PC', platform: 'Windows 11', browser: 'Edge', icon: '🖥️' },
  { device: 'iPad Air', platform: 'iPadOS 18', browser: 'Safari', icon: '📲' },
  { device: 'OnePlus 12', platform: 'Android 14', browser: 'Chrome', icon: '📱' },
];

const FOREIGN = [
  { city: 'Lagos', country: 'Nigeria' },
  { city: 'Moscow', country: 'Russia' },
  { city: 'São Paulo', country: 'Brazil' },
  { city: 'Frankfurt', country: 'Germany' },
];

export const SUGGESTED_TAGS = ['VIP', 'Press', 'Partner', 'Beta tester', 'Watchlist', 'Top creator', 'Needs follow-up'];

function load(): UserOpsState {
  const empty: UserOpsState = {
    roles: {},
    tags: {},
    notes: {},
    revokedSessions: [],
    revokedAllBefore: {},
    passwordReset: {},
    matrix: defaultMatrix(),
  };
  if (typeof localStorage === 'undefined') return empty;
  try {
    const raw = localStorage.getItem(ADMIN_USER_OPS_KEY);
    return raw ? { ...empty, ...(JSON.parse(raw) as Partial<UserOpsState>) } : empty;
  } catch {
    return empty;
  }
}

/**
 * Admin Console — user account operations beyond moderation: roles & permissions,
 * tags, private admin notes, sessions/devices and security controls.
 * Device/session/security details are simulated deterministically per member
 * (the demo has no real auth backend) and persist admin overrides in localStorage.
 */
@Injectable({ providedIn: 'root' })
export class AdminUserOpsService {
  private readonly insights = inject(AdminInsightsService);
  private readonly community = inject(CommunityService);
  private readonly audit = inject(AdminAuditService);

  readonly state = signal<UserOpsState>(load());

  /* --------------------------- Roles --------------------------- */

  roleOf(id: number): UserRole {
    const override = this.state().roles[id];
    if (override) return override;
    if (id === 1) return 'admin';
    const r = seeded(id * 7 + 3)();
    if (r < 0.012) return 'moderator';
    if (r < 0.035) return 'ambassador';
    if (r < 0.1 && this.insights.member(id)?.isVerified) return 'creator';
    return 'member';
  }

  readonly roleCounts = computed(() => {
    this.state();
    const counts = Object.fromEntries(ROLES.map((r) => [r.key, 0])) as Record<UserRole, number>;
    for (const m of this.insights.members()) counts[this.roleOf(m.id)]++;
    return counts;
  });

  setRole(id: number, role: UserRole): void {
    const before = this.roleOf(id);
    if (before === role) return;
    this.mutate((s) => ({ ...s, roles: { ...s.roles, [id]: role } }));
    this.audit.log({ category: 'role', action: `Role changed: ${roleLabel(before)} → ${roleLabel(role)}`, targetId: id, targetLabel: this.name(id) });
  }

  can(role: UserRole, permission: Permission): boolean {
    return this.state().matrix[role]?.[permission] ?? false;
  }

  togglePermission(role: UserRole, permission: Permission): void {
    if (role === 'admin') return;
    const next = !this.can(role, permission);
    this.mutate((s) => ({ ...s, matrix: { ...s.matrix, [role]: { ...s.matrix[role], [permission]: next } } }));
    const p = PERMISSIONS.find((x) => x.key === permission)?.label ?? permission;
    this.audit.log({ category: 'role', action: `${next ? 'Granted' : 'Revoked'} “${p}”`, targetLabel: `Role: ${roleLabel(role)}` });
  }

  resetPermissions(): void {
    this.mutate((s) => ({ ...s, matrix: defaultMatrix() }));
    this.audit.log({ category: 'role', action: 'Permission matrix reset to defaults' });
  }

  /* --------------------------- Tags & notes --------------------------- */

  tagsOf(id: number): string[] {
    const stored = this.state().tags[id];
    if (stored) return stored;
    const r = seeded(id * 11 + 5)();
    return r < 0.03 ? ['Top creator'] : r < 0.045 ? ['Watchlist'] : [];
  }

  readonly allTags = computed(() => {
    const set = new Set(SUGGESTED_TAGS);
    for (const list of Object.values(this.state().tags)) list.forEach((t) => set.add(t));
    return [...set].sort();
  });

  addTag(id: number, tag: string): void {
    const clean = tag.trim();
    if (!clean || this.tagsOf(id).includes(clean)) return;
    this.mutate((s) => ({ ...s, tags: { ...s.tags, [id]: [...this.tagsOf(id), clean] } }));
    this.audit.log({ category: 'account', action: `Tag added: ${clean}`, targetId: id, targetLabel: this.name(id) });
  }

  removeTag(id: number, tag: string): void {
    this.mutate((s) => ({ ...s, tags: { ...s.tags, [id]: this.tagsOf(id).filter((t) => t !== tag) } }));
    this.audit.log({ category: 'account', action: `Tag removed: ${tag}`, targetId: id, targetLabel: this.name(id) });
  }

  notesOf(id: number): AdminNote[] {
    return this.state().notes[id] ?? [];
  }

  addNote(id: number, text: string): void {
    const clean = text.trim();
    if (!clean) return;
    const note: AdminNote = { id: Date.now(), text: clean, atUtc: new Date().toISOString(), author: 'admin' };
    this.mutate((s) => ({ ...s, notes: { ...s.notes, [id]: [note, ...this.notesOf(id)] } }));
    this.audit.log({ category: 'account', action: 'Private note added', targetId: id, targetLabel: this.name(id) });
  }

  deleteNote(id: number, noteId: number): void {
    this.mutate((s) => ({ ...s, notes: { ...s.notes, [id]: this.notesOf(id).filter((n) => n.id !== noteId) } }));
  }

  /* --------------------------- Profile controls --------------------------- */

  setVerified(id: number, verified: boolean): void {
    this.community.adminPatchCompanion(id, { isVerified: verified });
    this.audit.log({ category: 'account', action: verified ? 'Identity verified' : 'Verification removed', targetId: id, targetLabel: this.name(id) });
  }

  setProfileLocked(id: number, locked: boolean): void {
    this.community.adminPatchCompanion(id, { isProfileLocked: locked });
    this.audit.log({ category: 'account', action: locked ? 'Profile locked (private)' : 'Profile unlocked (public)', targetId: id, targetLabel: this.name(id) });
  }

  isProfileLocked(id: number): boolean {
    return this.community.companions().find((c) => Number(c.id) === id)?.isProfileLocked === true;
  }

  /* --------------------------- Security & sessions --------------------------- */

  security(m: MemberInsight): UserSecurity {
    const rand = seeded(m.id * 13 + 1);
    const now = Date.now();
    const reset = this.state().passwordReset[m.id];
    const methodRoll = rand();
    return {
      emailVerified: m.isVerified || rand() < 0.72,
      twoFactor: rand() < (m.isVerified ? 0.55 : 0.2),
      signupMethod: methodRoll < 0.55 ? 'Email' : methodRoll < 0.85 ? 'Google' : 'Facebook',
      passwordChangedUtc: new Date(now - Math.floor(rand() * 300) * 86_400_000).toISOString(),
      passwordResetRequired: !!reset,
      failedLogins24h: rand() < 0.04 ? 5 + Math.floor(rand() * 14) : rand() < 0.2 ? 1 + Math.floor(rand() * 2) : 0,
      lastLoginUtc: m.isOnline ? new Date(now - Math.floor(rand() * 5) * 3_600_000).toISOString() : m.lastActiveUtc,
    };
  }

  sessionsOf(m: MemberInsight): UserSession[] {
    const st = this.state();
    const rand = seeded(m.id * 19 + 11);
    const count = m.isOnline ? 1 + Math.floor(rand() * 3) : rand() < 0.45 ? 1 : 0;
    const allBefore = st.revokedAllBefore[m.id];
    const now = Date.now();
    const sessions: UserSession[] = [];
    for (let k = 0; k < count; k++) {
      const d = DEVICES[Math.floor(rand() * DEVICES.length)];
      const foreign = rand() < 0.05;
      const loc = foreign ? FOREIGN[Math.floor(rand() * FOREIGN.length)] : { city: m.city || m.country, country: m.country };
      const lastSeen = k === 0 && m.isOnline ? now - Math.floor(rand() * 10) * 60_000 : now - Math.floor(rand() * 9 * 86_400_000);
      const started = lastSeen - Math.floor(rand() * 20 * 86_400_000);
      const id = `${m.id}-${k}`;
      if (st.revokedSessions.includes(id)) continue;
      if (allBefore && started <= new Date(allBefore).getTime()) continue;
      sessions.push({
        id,
        userId: m.id,
        ...d,
        ...loc,
        ip: `${100 + Math.floor(rand() * 90)}.${Math.floor(rand() * 255)}.xxx.xxx`,
        startedUtc: new Date(started).toISOString(),
        lastSeenUtc: new Date(lastSeen).toISOString(),
        active: now - lastSeen < 30 * 60_000,
        risk: foreign ? `New country (${loc.country}) — usual location ${m.country}` : undefined,
      });
    }
    return sessions;
  }

  /** All sessions across the community (for the Sessions & Security tab). */
  readonly allSessions = computed(() => {
    this.state();
    return this.insights
      .members()
      .filter((m) => m.accountState !== 'disabled')
      .flatMap((m) => this.sessionsOf(m).map((s) => ({ session: s, member: m })));
  });

  /** Accounts with bursts of failed logins (possible credential stuffing). */
  readonly loginAlerts = computed(() => {
    this.state();
    return this.insights
      .members()
      .map((m) => ({ member: m, security: this.security(m) }))
      .filter((x) => x.security.failedLogins24h >= 5)
      .sort((a, b) => b.security.failedLogins24h - a.security.failedLogins24h);
  });

  revokeSession(session: UserSession): void {
    this.mutate((s) => ({ ...s, revokedSessions: [...s.revokedSessions, session.id] }));
    this.audit.log({ category: 'security', action: `Session revoked (${session.device} · ${session.city})`, targetId: session.userId, targetLabel: this.name(session.userId) });
  }

  revokeAllSessions(id: number): void {
    this.mutate((s) => ({ ...s, revokedAllBefore: { ...s.revokedAllBefore, [id]: new Date().toISOString() } }));
    this.audit.log({ category: 'security', action: 'Signed out of all devices', targetId: id, targetLabel: this.name(id) });
  }

  forcePasswordReset(id: number): void {
    this.mutate((s) => ({ ...s, passwordReset: { ...s.passwordReset, [id]: new Date().toISOString() } }));
    this.audit.log({ category: 'security', action: 'Password reset required at next sign-in', targetId: id, targetLabel: this.name(id) });
  }

  clearPasswordReset(id: number): void {
    this.mutate((s) => {
      const next = { ...s.passwordReset };
      delete next[id];
      return { ...s, passwordReset: next };
    });
  }

  /** Remove every admin-side record for a user (right to erasure). */
  forget(id: number): void {
    this.mutate((s) => {
      const strip = <T>(map: Record<number, T>) => {
        const next = { ...map };
        delete next[id];
        return next;
      };
      return { ...s, roles: strip(s.roles), tags: strip(s.tags), notes: strip(s.notes), passwordReset: strip(s.passwordReset) };
    });
  }

  private name(id: number): string {
    return this.insights.member(id)?.fullName ?? `Member #${id}`;
  }

  private mutate(fn: (s: UserOpsState) => UserOpsState): void {
    this.state.update(fn);
    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem(ADMIN_USER_OPS_KEY, JSON.stringify(this.state()));
      } catch {
        /* ignore quota errors */
      }
    }
  }
}

export function roleLabel(role: UserRole): string {
  return ROLES.find((r) => r.key === role)?.label ?? role;
}

export function roleMeta(role: UserRole) {
  return ROLES.find((r) => r.key === role) ?? ROLES[0];
}
