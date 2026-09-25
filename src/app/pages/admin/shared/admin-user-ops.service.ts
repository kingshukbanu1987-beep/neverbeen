import { Injectable, computed, inject, signal } from '@angular/core';
import { AdminAuditService } from '../../../services/admin-audit.service';
import { CommunityService } from '../../../services/community.service';
import { AdminInsightsService, MemberInsight, seeded } from './admin-insights.service';
import {
  ABROAD,
  DEVICE_MODELS,
  DOMESTIC_TRAVEL,
  HISTORY_MODELS,
  RISKY_ABROAD,
  countryNet,
  deviceNameFor,
  geoOf,
  hashSeed,
  ipFor,
  macFor,
  maskIp,
  pick,
} from './device-intel';

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
  /** Name the OS gives the device, e.g. "Priya's iPhone" or "DESKTOP-7KQ2LMX". */
  deviceName: string;
  kind: 'Mobile' | 'Tablet' | 'Laptop' | 'Desktop';
  /** Full public IP (the `ip` field is the masked form used in lists). */
  ipFull: string;
  mac: string;
  region: string;
  isp: string;
  timezone: string;
}

export type DeviceEndReason =
  | 'Signed out'
  | 'Session expired'
  | 'Replaced by a newer device'
  | 'Signed out after password change'
  | 'Revoked by admin'
  | 'Signed out of all devices (admin)';

/** A device / session that is no longer signed in. */
export interface InactiveDevice extends UserSession {
  endedUtc: string;
  endReason: DeviceEndReason;
  signIns: number;
}

/** Maximum devices listed in "Inactive sessions & devices". */
export const INACTIVE_DEVICE_LIMIT = 10;

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
  /** When each individually revoked session was ended. */
  revokedAt: Record<string, string>;
  revokedAllBefore: Record<number, string>;
  passwordReset: Record<number, string>;
  matrix: Matrix;
}

export const SUGGESTED_TAGS = ['VIP', 'Press', 'Partner', 'Beta tester', 'Watchlist', 'Top creator', 'Needs follow-up'];

function load(): UserOpsState {
  const empty: UserOpsState = {
    roles: {},
    tags: {},
    notes: {},
    revokedSessions: [],
    revokedAt: {},
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

  /** Every session generated for the member, including ones that have since been ended. */
  private rawSessions(m: MemberInsight): UserSession[] {
    const rand = seeded(m.id * 19 + 11);
    const count = m.isOnline ? 1 + Math.floor(rand() * 3) : rand() < 0.45 ? 1 : 0;
    const now = Date.now();
    const home = geoOf(m.city, m.country);
    const sessions: UserSession[] = [];
    for (let k = 0; k < count; k++) {
      const model = DEVICE_MODELS[Math.floor(rand() * DEVICE_MODELS.length)];
      const foreign = rand() < 0.05;
      const lastSeen = k === 0 && m.isOnline ? now - Math.floor(rand() * 10) * 60_000 : now - Math.floor(rand() * 9 * 86_400_000);
      const started = lastSeen - Math.floor(rand() * 20 * 86_400_000);
      const id = `${m.id}-${k}`;
      const loc = foreign ? RISKY_ABROAD[Math.floor(rand() * RISKY_ABROAD.length)] : { ...home, country: m.country };
      sessions.push(
        this.device(m, id, model, loc, {
          startedUtc: new Date(started).toISOString(),
          lastSeenUtc: new Date(lastSeen).toISOString(),
          active: now - lastSeen < 30 * 60_000,
          risk: foreign ? `New country (${loc.country}) — usual location ${m.country}` : undefined,
        }),
      );
    }
    return sessions;
  }

  /** Builds a session / device record with deterministic network details. */
  private device(
    m: MemberInsight,
    id: string,
    model: (typeof HISTORY_MODELS)[number],
    loc: { city: string; region: string; country: string },
    extra: Pick<UserSession, 'startedUtc' | 'lastSeenUtc' | 'active' | 'risk'> & { isp?: string },
  ): UserSession {
    const r = seeded(hashSeed(`device:${id}`));
    const net = countryNet(loc.country);
    const ipFull = ipFor(r, loc.country);
    // The same physical device keeps its name & MAC across sessions.
    const hw = seeded(hashSeed(`hw:${m.id}:${model.device}`));
    return {
      id,
      userId: m.id,
      device: model.device,
      platform: model.platform,
      browser: model.browser,
      icon: model.icon,
      kind: model.kind,
      deviceName: deviceNameFor(hw, model, m.fullName),
      mac: macFor(hw, model),
      city: loc.city,
      region: loc.region,
      country: loc.country,
      ip: maskIp(ipFull).replace(/•••/g, 'xxx'),
      ipFull,
      isp: extra.isp ?? pick(r, net.isps),
      timezone: net.timezone,
      startedUtc: extra.startedUtc,
      lastSeenUtc: extra.lastSeenUtc,
      active: extra.active,
      risk: extra.risk,
    };
  }

  /** Why (and when) a generated session is no longer active — null while it is still signed in. */
  private endedInfo(m: MemberInsight, s: UserSession): { reason: DeviceEndReason; at: string } | null {
    const st = this.state();
    if (st.revokedSessions.includes(s.id)) return { reason: 'Revoked by admin', at: st.revokedAt?.[s.id] ?? s.lastSeenUtc };
    const allBefore = st.revokedAllBefore[m.id];
    if (allBefore && Date.parse(s.startedUtc) <= Date.parse(allBefore)) return { reason: 'Signed out of all devices (admin)', at: allBefore };
    return null;
  }

  sessionsOf(m: MemberInsight): UserSession[] {
    return this.rawSessions(m).filter((s) => !this.endedInfo(m, s));
  }

  /**
   * The last {@link INACTIVE_DEVICE_LIMIT} devices / sessions the member used that are
   * no longer signed in — sessions ended by an admin plus earlier sign-in history.
   * Most recent first.
   */
  inactiveDevicesOf(m: MemberInsight): InactiveDevice[] {
    const now = Date.now();
    const DAY = 86_400_000;
    const out: InactiveDevice[] = [];

    // 1) Sessions that were active until an admin ended them.
    for (const s of this.rawSessions(m)) {
      const ended = this.endedInfo(m, s);
      if (!ended) continue;
      const r = seeded(hashSeed(`signins:${s.id}`));
      out.push({ ...s, active: false, lastSeenUtc: ended.at < s.lastSeenUtc ? ended.at : s.lastSeenUtc, endedUtc: ended.at, endReason: ended.reason, signIns: 1 + Math.floor(r() * 25) });
    }

    // 2) Earlier devices from the member's sign-in history.
    const rand = seeded(m.id * 37 + 5);
    const registered = Date.parse(m.registeredAtUtc);
    const reg = Number.isNaN(registered) ? now - 400 * DAY : Math.min(registered, now - 2 * DAY);
    const ageDays = (now - reg) / DAY;
    const max = ageDays > 180 ? 12 : ageDays > 60 ? 8 : ageDays > 14 ? 5 : 3;
    const n = 1 + Math.floor(rand() * max);
    const lastActive = Date.parse(m.lastActiveUtc);
    const newest = Math.min(Number.isNaN(lastActive) ? now : lastActive, now) - DAY;
    const span = Math.max(DAY, (newest - reg) / n);
    const home = geoOf(m.city, m.country);
    const travel = DOMESTIC_TRAVEL[m.country] ?? [];

    for (let k = 0; k < n; k++) {
      const model = pick(rand, HISTORY_MODELS);
      const windowEnd = newest - k * span;
      const lastSeen = Math.max(reg + 60_000, windowEnd - rand() * span * 0.35);
      const started = Math.max(reg, lastSeen - (0.05 + rand() * 0.6) * span);
      const where = rand();
      let loc: { city: string; region: string; country: string } = { ...home, country: m.country };
      let risk: string | undefined;
      let isp: string | undefined;
      if (where > 0.97) {
        loc = pick(rand, RISKY_ABROAD);
        risk = `Unusual country (${loc.country}) — usual location ${m.country}`;
      } else if (where > 0.94) {
        // VPN exit node: IP geolocates to the hosting provider, not the member.
        loc = { city: 'Amsterdam', region: 'North Holland', country: 'Netherlands' };
        isp = 'M247 Europe (VPN / hosting)';
        risk = 'Signed in through a VPN / hosting network';
      } else if (where > 0.88) {
        loc = pick(rand, ABROAD);
      } else if (where > 0.72 && travel.length) {
        loc = { ...pick(rand, travel), country: m.country };
      }
      const endRoll = seeded(hashSeed(`end:${m.id}-h${k}`))();
      const endReason: DeviceEndReason =
        endRoll < 0.45 ? 'Signed out' : endRoll < 0.8 ? 'Session expired' : endRoll < 0.93 ? 'Replaced by a newer device' : 'Signed out after password change';
      const ended = endReason === 'Session expired' ? Math.min(lastSeen + 30 * DAY, now - 60_000) : lastSeen;
      const rec = this.device(m, `${m.id}-h${k}`, model, loc, {
        startedUtc: new Date(started).toISOString(),
        lastSeenUtc: new Date(lastSeen).toISOString(),
        active: false,
        risk,
        isp,
      });
      out.push({ ...rec, endedUtc: new Date(ended).toISOString(), endReason, signIns: 1 + Math.floor(rand() * 60) });
    }

    return out.sort((a, b) => Date.parse(b.lastSeenUtc) - Date.parse(a.lastSeenUtc)).slice(0, INACTIVE_DEVICE_LIMIT);
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
    this.mutate((s) => ({ ...s, revokedSessions: [...s.revokedSessions, session.id], revokedAt: { ...(s.revokedAt ?? {}), [session.id]: new Date().toISOString() } }));
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
