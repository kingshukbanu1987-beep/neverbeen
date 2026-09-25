import { Injectable, computed, inject, signal } from '@angular/core';
import {
  ABUSE_REPORTS_KEY,
  BLOCKED_USERS_KEY,
  CIRCLES_KEY,
  COMMENTS_KEY,
  COMPANIONS_KEY,
  CommunityService,
  HIDDEN_POSTS_KEY,
  JOURNEY_KEY,
  NOTIFS_KEY,
  PROFILE_KEY,
  USER_KEY,
} from '../../../services/community.service';
import {
  ADMIN_ACCOUNT_ACTIONS_KEY,
  ADMIN_REPORT_DECISIONS_KEY,
  AdminModerationService,
} from '../../../services/admin-moderation.service';
import { ADMIN_AUDIT_KEY, AdminAuditService } from '../../../services/admin-audit.service';
import { ADMIN_USER_OPS_KEY, AdminUserOpsService } from './admin-user-ops.service';
import { AdminInsightsService, seeded } from './admin-insights.service';
import { ADMIN_IDENTITY_KEY, AdminIdentityService } from './admin-identity.service';
import type { AuthorInfo, JourneyComment, JourneyPost } from '../../../models/community';

export const ADMIN_DATA_OPS_KEY = 'neverbeen_admin_data_ops';
/** Browsers typically allow ~5 MB (characters) of localStorage per origin. */
export const STORAGE_QUOTA = 5 * 1024 * 1024;

/* ------------------------------------------------------------------ */
/*  Catalog                                                            */
/* ------------------------------------------------------------------ */

export type Classification = 'PII' | 'Sensitive' | 'Internal' | 'Public';

export interface FieldInfo {
  path: string;
  cls: Classification | 'Quasi-identifier' | 'User content';
  note?: string;
}

export interface DatasetDef {
  key: string;
  label: string;
  icon: string;
  description: string;
  classification: Classification;
  owner: 'Community' | 'Admin' | 'Session';
  fields: FieldInfo[];
  clearable: boolean;
  timestampField?: string;
  read: () => unknown;
}

export interface DatasetInfo extends DatasetDef {
  records: number;
  bytes: number;
  persisted: boolean;
  persistedBytes: number;
}

/* ------------------------------------------------------------------ */
/*  Privacy requests                                                   */
/* ------------------------------------------------------------------ */

export type PrivacyType = 'access' | 'portability' | 'rectification' | 'erasure' | 'restriction' | 'consent_withdrawal';
export type PrivacyStatus = 'new' | 'in_progress' | 'completed' | 'rejected';

export const PRIVACY_TYPES: Record<PrivacyType, { label: string; icon: string; hint: string }> = {
  access: { label: 'Access (copy of data)', icon: '📄', hint: 'Send the member a copy of every record held about them.' },
  portability: { label: 'Data portability', icon: '📦', hint: 'Provide the data in a machine-readable (JSON) file.' },
  rectification: { label: 'Correction', icon: '✏️', hint: 'Fix inaccurate or incomplete personal data.' },
  erasure: { label: 'Erasure (right to be forgotten)', icon: '🗑️', hint: 'Delete or anonymise the member and their content.' },
  restriction: { label: 'Restrict processing', icon: '⏸️', hint: 'Stop using the data for recommendations & analytics.' },
  consent_withdrawal: { label: 'Withdraw consent', icon: '🚫', hint: 'Stop marketing emails and optional tracking.' },
};

export interface PrivacyRequest {
  id: number;
  type: PrivacyType;
  userId: number;
  userName: string;
  email: string;
  regulation: 'GDPR' | 'DPDP Act (India)' | 'CCPA';
  receivedUtc: string;
  dueUtc: string;
  status: PrivacyStatus;
  message: string;
  resolution?: string;
  resolvedUtc?: string;
}

/* ------------------------------------------------------------------ */
/*  Retention                                                          */
/* ------------------------------------------------------------------ */

export interface RetentionPolicy {
  key: string;
  days: number; // 0 = keep forever
  action: 'delete' | 'archive';
  auto: boolean;
  lastRunUtc?: string;
  lastRunAffected?: number;
}

export const RETENTION_OPTIONS = [
  { days: 30, label: '30 days' },
  { days: 90, label: '90 days' },
  { days: 180, label: '6 months' },
  { days: 365, label: '1 year' },
  { days: 730, label: '2 years' },
  { days: 0, label: 'Keep forever' },
];

/* ------------------------------------------------------------------ */
/*  Backups                                                            */
/* ------------------------------------------------------------------ */

export interface BackupEntry {
  id: number;
  name: string;
  createdUtc: string;
  bytes: number;
  records: number;
  datasets: number;
  checksum: string;
  kind: 'manual' | 'safety';
}

export interface BackupFile {
  __meta: { app: 'neverbeen'; format: 1; createdUtc: string; checksum: string; datasets: number; records: number };
  data: Record<string, unknown>;
}

export interface RestorePreview {
  valid: boolean;
  error?: string;
  checksumOk?: boolean;
  file?: BackupFile;
  rows: { key: string; label: string; current: number; incoming: number }[];
}

/* ------------------------------------------------------------------ */
/*  Data quality                                                       */
/* ------------------------------------------------------------------ */

export interface QualityCheck {
  id: string;
  title: string;
  description: string;
  severity: 'high' | 'medium' | 'low';
  dataset: string;
  count: number;
  samples: string[];
  fixLabel?: string;
}

interface DataOpsState {
  requests: PrivacyRequest[];
  policies: RetentionPolicy[];
  backups: BackupEntry[];
  maskPii: boolean;
  seeded: boolean;
}

const DEFAULT_POLICIES: RetentionPolicy[] = [
  { key: JOURNEY_KEY, days: 0, action: 'archive', auto: false },
  { key: COMMENTS_KEY, days: 0, action: 'delete', auto: false },
  { key: NOTIFS_KEY, days: 90, action: 'delete', auto: true },
  { key: ABUSE_REPORTS_KEY, days: 730, action: 'archive', auto: false },
  { key: ADMIN_AUDIT_KEY, days: 365, action: 'archive', auto: false },
];

function count(value: unknown): number {
  if (Array.isArray(value)) return value.length;
  if (value && typeof value === 'object') return Object.keys(value).length;
  return value === null || value === undefined ? 0 : 1;
}

function readLocal(key: string): unknown {
  if (typeof localStorage === 'undefined') return null;
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export async function sha256(text: string): Promise<string> {
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
    return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
  }
  // Fallback (non-secure contexts): FNV-1a 64-bit-ish hex.
  let h1 = 0x811c9dc5;
  let h2 = 0x01000193;
  for (let i = 0; i < text.length; i++) {
    h1 = Math.imul(h1 ^ text.charCodeAt(i), 16777619);
    h2 = Math.imul(h2 ^ text.charCodeAt(i), 2246822519);
  }
  return `fnv-${(h1 >>> 0).toString(16)}${(h2 >>> 0).toString(16)}`;
}

export function downloadJson(filename: string, value: unknown): number {
  const json = JSON.stringify(value, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
  return json.length;
}

export function maskEmail(email: string): string {
  const [user, domain] = email.split('@');
  if (!domain) return '•••';
  return `${user.slice(0, 2)}${'•'.repeat(Math.max(2, user.length - 2))}@${domain}`;
}

export function maskValue(v: string): string {
  if (v.includes('@')) return maskEmail(v);
  if (/^\+?[\d\s-]{7,}$/.test(v)) return v.slice(0, 3) + '•'.repeat(Math.max(3, v.length - 5)) + v.slice(-2);
  if (/^\d{4}-\d{2}-\d{2}/.test(v)) return `${v.slice(0, 4)}-••-••`;
  return v.length > 2 ? v[0] + '•'.repeat(v.length - 2) + v[v.length - 1] : '••';
}

const PII_KEYS = /(email|phone|dateofbirth|dob|ip|address|contact)/i;
export function isPiiField(name: string): boolean {
  return PII_KEYS.test(name);
}

const DELETED: AuthorInfo = { id: 0, fullName: 'Deleted member', profilePhotoUrl: '' };

/**
 * Admin Console — data governance: dataset catalog & PII inventory, privacy (data-subject)
 * requests, retention policies, data-quality checks, backups/restore and erasure.
 */
@Injectable({ providedIn: 'root' })
export class AdminDataOpsService {
  private readonly community = inject(CommunityService);
  private readonly moderation = inject(AdminModerationService);
  private readonly audit = inject(AdminAuditService);
  private readonly userOps = inject(AdminUserOpsService);
  private readonly insights = inject(AdminInsightsService);
  private readonly identity = inject(AdminIdentityService);

  readonly state = signal<DataOpsState>(this.load());
  /** Bumped whenever localStorage changes outside signals (so storage numbers refresh). */
  private readonly storageTick = signal(0);

  constructor() {
    if (!this.state().seeded) this.seedRequests();
  }

  /* ============================ Catalog ============================ */

  readonly definitions: DatasetDef[] = [
    {
      key: COMPANIONS_KEY,
      label: 'Member directory',
      icon: '👥',
      description: 'Profiles of every community member.',
      classification: 'PII',
      owner: 'Community',
      clearable: false,
      fields: [
        { path: 'fullName', cls: 'PII' },
        { path: 'verifiedEmail', cls: 'PII' },
        { path: 'aboutMeDetails.contactEmail / contactPhone', cls: 'PII' },
        { path: 'aboutMeDetails.dateOfBirth', cls: 'Sensitive', note: 'Age derivation only' },
        { path: 'aboutMeDetails.gender', cls: 'Sensitive' },
        { path: 'city · country · hometown', cls: 'Quasi-identifier' },
        { path: 'profilePhotoUrl · gallery', cls: 'PII', note: 'Biometric-adjacent imagery' },
        { path: 'bio · aboutMe · interests', cls: 'User content' },
      ],
      read: () => this.community.companions(),
    },
    {
      key: JOURNEY_KEY,
      label: 'Journey posts',
      icon: '📝',
      description: 'Travel stories, photos, reactions and comment threads.',
      classification: 'Public',
      owner: 'Community',
      clearable: false,
      timestampField: 'createdAtUtc',
      fields: [
        { path: 'author', cls: 'PII' },
        { path: 'text · comments', cls: 'User content' },
        { path: 'location · placeId', cls: 'Quasi-identifier' },
        { path: 'imageUrls', cls: 'User content' },
        { path: 'reactions · likers', cls: 'PII' },
      ],
      read: () => this.community.journeyPosts(),
    },
    {
      key: COMMENTS_KEY,
      label: 'Conversation threads',
      icon: '💬',
      description: 'Community wall comments and replies.',
      classification: 'Public',
      owner: 'Community',
      clearable: false,
      timestampField: 'createdAtUtc',
      fields: [
        { path: 'author', cls: 'PII' },
        { path: 'text · imageUrl', cls: 'User content' },
      ],
      read: () => this.community.comments(),
    },
    {
      key: CIRCLES_KEY,
      label: 'Circles',
      icon: '⭕',
      description: 'Member-created interest groups.',
      classification: 'Internal',
      owner: 'Community',
      clearable: false,
      fields: [{ path: 'memberIds', cls: 'Internal' }],
      read: () => this.community.circles(),
    },
    {
      key: NOTIFS_KEY,
      label: 'Notifications',
      icon: '🔔',
      description: 'Activity notifications for the signed-in member.',
      classification: 'Internal',
      owner: 'Community',
      clearable: true,
      timestampField: 'createdAtUtc',
      fields: [
        { path: 'fromUser', cls: 'PII' },
        { path: 'message', cls: 'User content' },
      ],
      read: () => this.community.notifications(),
    },
    {
      key: ABUSE_REPORTS_KEY,
      label: 'Abuse reports',
      icon: '🚩',
      description: 'Reports filed by members (kept for legal obligations).',
      classification: 'Sensitive',
      owner: 'Community',
      clearable: true,
      timestampField: 'createdAtUtc',
      fields: [
        { path: 'reporterEmail', cls: 'PII' },
        { path: 'reportedAuthor', cls: 'PII' },
        { path: 'details', cls: 'Sensitive' },
      ],
      read: () => this.community.abuseReports(),
    },
    {
      key: HIDDEN_POSTS_KEY,
      label: 'Hidden posts',
      icon: '🙈',
      description: 'Post IDs hidden by moderation.',
      classification: 'Internal',
      owner: 'Community',
      clearable: true,
      fields: [{ path: '[postId]', cls: 'Internal' }],
      read: () => this.community.hiddenPostIds(),
    },
    {
      key: BLOCKED_USERS_KEY,
      label: 'Blocked users',
      icon: '🚷',
      description: 'Members blocked by the signed-in member.',
      classification: 'Internal',
      owner: 'Community',
      clearable: true,
      fields: [{ path: '[userId]', cls: 'Internal' }],
      read: () => this.community.blockedUserIds(),
    },
    {
      key: ADMIN_ACCOUNT_ACTIONS_KEY,
      label: 'Account actions',
      icon: '🛡️',
      description: 'Warnings, restrictions, identity checks and disabled accounts.',
      classification: 'Sensitive',
      owner: 'Admin',
      clearable: false,
      fields: [{ path: 'state · reason · restrictions', cls: 'Sensitive' }],
      read: () => this.moderation.accountActions(),
    },
    {
      key: ADMIN_REPORT_DECISIONS_KEY,
      label: 'Report decisions',
      icon: '⚖️',
      description: 'Admin decisions on abuse reports.',
      classification: 'Internal',
      owner: 'Admin',
      clearable: false,
      fields: [{ path: 'decision · note', cls: 'Internal' }],
      read: () => this.moderation.reportDecisions(),
    },
    {
      key: ADMIN_USER_OPS_KEY,
      label: 'User operations',
      icon: '🎖️',
      description: 'Roles, permissions, tags, private notes and revoked sessions.',
      classification: 'Sensitive',
      owner: 'Admin',
      clearable: false,
      fields: [
        { path: 'notes', cls: 'Sensitive' },
        { path: 'roles · tags · matrix', cls: 'Internal' },
      ],
      read: () => this.userOps.state(),
    },
    {
      key: ADMIN_IDENTITY_KEY,
      label: 'Identity documents',
      icon: '🪪',
      description: 'Identity documents (ID, selfie) submitted for account verification, with review decisions.',
      classification: 'PII',
      owner: 'Admin',
      clearable: false,
      fields: [
        { path: 'submissions[].documentNumber', cls: 'PII', note: 'Government ID number' },
        { path: 'submissions[].dobOnDocument', cls: 'PII' },
        { path: 'submissions[].files (ID images, selfie)', cls: 'Sensitive', note: 'Biometric data' },
        { path: 'submissions[].nameOnDocument', cls: 'PII' },
      ],
      read: () => this.identity.state(),
    },
    {
      key: ADMIN_AUDIT_KEY,
      label: 'Audit log',
      icon: '📜',
      description: 'Every admin action with timestamp and target.',
      classification: 'Internal',
      owner: 'Admin',
      clearable: false,
      timestampField: 'atUtc',
      fields: [{ path: 'action · target · details', cls: 'Internal' }],
      read: () => this.audit.entries(),
    },
    {
      key: ADMIN_DATA_OPS_KEY,
      label: 'Data governance',
      icon: '🧾',
      description: 'Privacy requests, retention policies and backup history.',
      classification: 'Sensitive',
      owner: 'Admin',
      clearable: false,
      fields: [{ path: 'requests (name, email)', cls: 'PII' }],
      read: () => this.state(),
    },
    {
      key: USER_KEY,
      label: 'Signed-in member',
      icon: '🔑',
      description: 'Session identity of the member signed in on this browser.',
      classification: 'PII',
      owner: 'Session',
      clearable: true,
      fields: [{ path: 'email · fullName', cls: 'PII' }],
      read: () => {
        this.storageTick();
        return readLocal(USER_KEY);
      },
    },
    {
      key: PROFILE_KEY,
      label: 'Member profile',
      icon: '🪪',
      description: 'Full profile of the signed-in member.',
      classification: 'PII',
      owner: 'Session',
      clearable: false,
      fields: [{ path: 'contact · dateOfBirth · work · education', cls: 'PII' }],
      read: () => {
        this.storageTick();
        return readLocal(PROFILE_KEY);
      },
    },
  ];

  readonly datasets = computed<DatasetInfo[]>(() => {
    this.storageTick();
    return this.definitions.map((d) => {
      const value = d.read();
      const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(d.key) : null;
      let bytes = 0;
      try {
        bytes = value === null || value === undefined ? 0 : JSON.stringify(value).length;
      } catch {
        bytes = 0;
      }
      return { ...d, records: count(value), bytes, persisted: raw !== null, persistedBytes: raw?.length ?? 0 };
    });
  });

  readonly storageUsed = computed(() => {
    this.storageTick();
    this.datasets();
    if (typeof localStorage === 'undefined') return 0;
    let total = 0;
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith('neverbeen_')) total += key.length + (localStorage.getItem(key)?.length ?? 0);
    }
    return total;
  });

  readonly totalRecords = computed(() => this.datasets().reduce((s, d) => s + d.records, 0));

  definition(key: string): DatasetDef | undefined {
    return this.definitions.find((d) => d.key === key);
  }

  refreshStorage(): void {
    this.storageTick.update((n) => n + 1);
  }

  exportDataset(key: string, format: 'json' | 'csv'): void {
    const def = this.definition(key);
    if (!def) return;
    const value = def.read();
    const date = new Date().toISOString().slice(0, 10);
    if (format === 'json') {
      downloadJson(`neverbeen-${key.replace(/^neverbeen_/, '')}-${date}.json`, value);
    } else {
      const rows = Array.isArray(value) ? (value as Record<string, unknown>[]) : Object.values((value as Record<string, unknown>) ?? {});
      const cols = [...new Set(rows.slice(0, 100).flatMap((r) => (r && typeof r === 'object' ? Object.keys(r) : ['value'])))];
      const esc = (v: unknown) => `"${String(v === undefined || v === null ? '' : typeof v === 'object' ? JSON.stringify(v) : v).replace(/"/g, '""')}"`;
      const csv = [cols.map(esc).join(','), ...rows.map((r) => cols.map((c) => esc(r && typeof r === 'object' ? (r as Record<string, unknown>)[c] : r)).join(','))].join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `neverbeen-${key.replace(/^neverbeen_/, '')}-${date}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    }
    this.audit.log({ category: 'data', action: `Dataset exported (${format.toUpperCase()})`, targetLabel: def.label, details: `${count(value)} records` });
  }

  clearDataset(key: string): void {
    const def = this.definition(key);
    if (!def?.clearable) return;
    if (!this.community.adminReplaceDataset(key, [])) {
      localStorage.removeItem(key);
    }
    this.refreshStorage();
    this.audit.log({ category: 'data', action: 'Dataset cleared', targetLabel: def.label });
  }

  /** Delete one record (by array index or object key) from a community dataset. */
  deleteRecord(key: string, index: number | string): boolean {
    const def = this.definition(key);
    if (!def) return false;
    const value = def.read();
    if (!Array.isArray(value)) return false;
    const next = value.filter((_, i) => i !== index);
    const ok = this.community.adminReplaceDataset(key, next);
    if (ok) this.audit.log({ category: 'data', action: 'Record deleted in Data Explorer', targetLabel: def.label, details: `index ${index}` });
    return ok;
  }

  setMask(mask: boolean): void {
    this.mutate((s) => ({ ...s, maskPii: mask }));
    if (!mask) this.audit.log({ category: 'privacy', action: 'PII unmasked in Data Explorer' });
  }

  /* ============================ Privacy requests ============================ */

  readonly requests = computed(() => this.state().requests.slice().sort((a, b) => b.receivedUtc.localeCompare(a.receivedUtc)));

  createRequest(userId: number, type: PrivacyType, message: string, regulation: PrivacyRequest['regulation'] = 'DPDP Act (India)'): void {
    const m = this.insights.member(userId);
    const now = new Date();
    const req: PrivacyRequest = {
      id: Date.now(),
      type,
      userId,
      userName: m?.fullName ?? `Member #${userId}`,
      email: m?.email ?? '—',
      regulation,
      receivedUtc: now.toISOString(),
      dueUtc: new Date(now.getTime() + 30 * 86_400_000).toISOString(),
      status: 'new',
      message: message || 'Logged by admin on behalf of the member.',
    };
    this.mutate((s) => ({ ...s, requests: [req, ...s.requests] }));
    this.audit.log({ category: 'privacy', action: `Privacy request logged: ${PRIVACY_TYPES[type].label}`, targetId: userId, targetLabel: req.userName });
  }

  setRequestStatus(id: number, status: PrivacyStatus, resolution?: string): void {
    const req = this.state().requests.find((r) => r.id === id);
    this.mutate((s) => ({
      ...s,
      requests: s.requests.map((r) =>
        r.id === id
          ? { ...r, status, resolution: resolution ?? r.resolution, resolvedUtc: status === 'completed' || status === 'rejected' ? new Date().toISOString() : r.resolvedUtc }
          : r,
      ),
    }));
    if (req) {
      this.audit.log({
        category: 'privacy',
        action: `Privacy request ${status.replace('_', ' ')}: ${PRIVACY_TYPES[req.type].label}`,
        targetId: req.userId,
        targetLabel: req.userName,
        details: resolution,
      });
    }
  }

  /** Everything held about a member, as a portable JSON package (access / portability requests). */
  buildUserPackage(userId: number) {
    const id = Number(userId);
    const companion = this.community.companions().find((c) => Number(c.id) === id) ?? null;
    const posts = this.community.journeyPosts().filter((p) => Number(p.author?.id) === id);
    const comments: JourneyComment[] = [];
    const walk = (list?: JourneyComment[]) =>
      (list ?? []).forEach((c) => {
        if (Number(c.author?.id) === id) comments.push(c);
        walk(c.replies);
      });
    this.community.journeyPosts().forEach((p) => walk(p.comments));
    const wall = this.community.comments().filter((c) => Number(c.author?.id) === id);
    const m = this.insights.member(id);
    return {
      __meta: { app: 'neverbeen', subjectId: id, generatedUtc: new Date().toISOString(), format: 'NeverBeen data package v1' },
      profile: companion,
      account: m
        ? { uniqueId: m.uniqueId, email: m.email, registeredAtUtc: m.registeredAtUtc, lastActiveUtc: m.lastActiveUtc, role: this.userOps.roleOf(id), tags: this.userOps.tagsOf(id) }
        : null,
      security: m ? this.userOps.security(m) : null,
      sessions: m ? this.userOps.sessionsOf(m) : [],
      journeyPosts: posts,
      journeyComments: comments,
      wallComments: wall,
      reportsFiled: this.insights.reports().filter((r) => r.reporter.id === id).map((r) => ({ id: r.id, reason: r.reason, createdAtUtc: r.createdAtUtc })),
      moderation: this.moderation.actionOf(id) ?? null,
    };
  }

  exportUserPackage(userId: number): void {
    const pkg = this.buildUserPackage(userId);
    downloadJson(`neverbeen-data-package-${userId}.json`, pkg);
    this.audit.log({ category: 'privacy', action: 'Personal data package exported', targetId: userId, targetLabel: this.insights.member(userId)?.fullName });
  }

  /**
   * Right to erasure. 'anonymize' keeps content but strips identity; 'delete' removes content too.
   * Abuse reports and the moderation record are retained (legal obligation) with the name removed.
   */
  eraseUser(userId: number, mode: 'anonymize' | 'delete'): { posts: number; comments: number } {
    const id = Number(userId);
    const name = this.insights.member(id)?.fullName ?? `Member #${id}`;
    let posts = 0;
    let comments = 0;
    const scrubComments = (list: JourneyComment[] = []): JourneyComment[] =>
      list
        .filter((c) => {
          const mine = Number(c.author?.id) === id;
          if (mine) comments++;
          return !(mine && mode === 'delete');
        })
        .map((c) => ({
          ...c,
          author: Number(c.author?.id) === id ? DELETED : c.author,
          replies: scrubComments(c.replies),
        }));

    const nextPosts: JourneyPost[] = this.community
      .journeyPosts()
      .filter((p) => {
        const mine = Number(p.author?.id) === id;
        if (mine) posts++;
        return !(mine && mode === 'delete');
      })
      .map((p) => ({
        ...p,
        author: Number(p.author?.id) === id ? DELETED : p.author,
        comments: scrubComments(p.comments),
        likers: p.likers?.filter((l) => Number(l.id) !== id),
        reactions: p.reactions?.filter((r) => Number(r.user?.id) !== id),
        taggedCompanions: p.taggedCompanions?.filter((t) => Number(t.id) !== id),
      }));
    this.community.adminReplaceDataset(JOURNEY_KEY, nextPosts);

    const wall = this.community
      .comments()
      .filter((c) => !(Number(c.author?.id) === id && mode === 'delete'))
      .map((c) => (Number(c.author?.id) === id ? { ...c, author: DELETED } : c));
    this.community.adminReplaceDataset(COMMENTS_KEY, wall);

    this.community.adminReplaceDataset(
      NOTIFS_KEY,
      this.community.notifications().filter((n) => Number(n.fromUser?.id) !== id),
    );
    this.community.adminReplaceDataset(
      ABUSE_REPORTS_KEY,
      this.community.abuseReports().map((r) =>
        Number(r.reportedAuthor?.id) === id ? { ...r, reportedAuthor: { ...DELETED, id }, reporterEmail: r.reporterEmail } : r,
      ),
    );
    this.community.adminDeleteCompanion(id);
    this.userOps.forget(id);
    this.identity.forget(id);
    this.refreshStorage();
    this.audit.log({
      category: 'privacy',
      action: mode === 'delete' ? 'Member erased (content deleted)' : 'Member erased (content anonymised)',
      targetId: id,
      targetLabel: name,
      details: `${posts} posts, ${comments} comments processed`,
    });
    return { posts, comments };
  }

  /* ============================ Retention ============================ */

  readonly policies = computed(() => this.state().policies);

  affectedBy(policy: RetentionPolicy): unknown[] {
    if (!policy.days) return [];
    const def = this.definition(policy.key);
    const value = def?.read();
    if (!def?.timestampField || !Array.isArray(value)) return [];
    const cutoff = Date.now() - policy.days * 86_400_000;
    return value.filter((r) => {
      const ts = (r as Record<string, unknown>)[def.timestampField!];
      return typeof ts === 'string' && new Date(ts).getTime() < cutoff;
    });
  }

  updatePolicy(key: string, patch: Partial<RetentionPolicy>): void {
    this.mutate((s) => ({ ...s, policies: s.policies.map((p) => (p.key === key ? { ...p, ...patch } : p)) }));
    const def = this.definition(key);
    this.audit.log({ category: 'data', action: 'Retention policy updated', targetLabel: def?.label, details: JSON.stringify(patch) });
  }

  runPolicy(key: string, trigger: 'manual' | 'auto' = 'manual'): number {
    const policy = this.state().policies.find((p) => p.key === key);
    const def = this.definition(key);
    if (!policy || !def) return 0;
    const old = this.affectedBy(policy);
    if (old.length) {
      if (policy.action === 'archive' && trigger === 'manual') {
        downloadJson(`neverbeen-archive-${key.replace(/^neverbeen_/, '')}-${new Date().toISOString().slice(0, 10)}.json`, old);
      }
      const keep = (def.read() as unknown[]).filter((r) => !old.includes(r));
      if (key === ADMIN_AUDIT_KEY) this.audit.replace(keep as never);
      else this.community.adminReplaceDataset(key, keep);
    }
    this.mutate((s) => ({
      ...s,
      policies: s.policies.map((p) => (p.key === key ? { ...p, lastRunUtc: new Date().toISOString(), lastRunAffected: old.length } : p)),
    }));
    this.refreshStorage();
    this.audit.log({ category: 'data', action: `Retention ${trigger === 'auto' ? 'auto-purge' : 'run'}: ${policy.action}`, targetLabel: def.label, details: `${old.length} record(s) older than ${policy.days} days` });
    return old.length;
  }

  /** Runs every policy with auto-purge enabled (called when Data Management opens). */
  runAutoPolicies(): number {
    return this.state()
      .policies.filter((p) => p.auto && p.days > 0)
      .reduce((sum, p) => sum + this.runPolicy(p.key, 'auto'), 0);
  }

  /* ============================ Data quality ============================ */

  readonly qualityChecks = computed<QualityCheck[]>(() => {
    const companions = this.community.companions();
    const posts = this.community.journeyPosts();
    const memberIds = new Set(companions.map((c) => Number(c.id)));
    const selfId = this.community.currentUser()?.id;
    if (selfId !== undefined) memberIds.add(Number(selfId));
    memberIds.add(0); // anonymised "Deleted member"
    const members = this.insights.members();
    const emailRe = /^[^\s@.][^\s@]*@[^\s@]+\.[^\s@]{2,}$/;

    const noPhoto = companions.filter((c) => !c.profilePhotoUrl);
    const noDob = companions.filter((c) => !c.aboutMeDetails?.dateOfBirth);
    const noLocation = companions.filter((c) => !c.city || !c.country);
    const dupMap = new Map<string, string[]>();
    for (const c of companions) {
      const k = `${(c.fullName || '').toLowerCase().trim()}|${(c.city || '').toLowerCase().trim()}`;
      dupMap.set(k, [...(dupMap.get(k) ?? []), c.fullName]);
    }
    const dups = [...dupMap.values()].filter((v) => v.length > 1);
    const badEmails = members.filter((m) => !emailRe.test(m.email) || m.email.includes('..'));
    const orphanPosts = posts.filter((p) => !memberIds.has(Number(p.author?.id)));
    const emptyPosts = posts.filter((p) => !(p.text || '').trim() && !p.imageUrl && !(p.imageUrls?.length) && !p.isShared);
    const postIds = new Set(posts.map((p) => p.id));
    const staleHidden = this.community.hiddenPostIds().filter((id) => !postIds.has(id));
    const reportsMissing = this.community.abuseReports().filter((r) => r.targetType === 'post' && !postIds.has(r.targetId));

    return [
      { id: 'orphan-posts', title: 'Orphaned journey posts', description: 'Posts whose author no longer exists in the member directory.', severity: 'high', dataset: 'Journey posts', count: orphanPosts.length, samples: orphanPosts.slice(0, 3).map((p) => `#${p.id} by ${p.author?.fullName ?? 'unknown'}`), fixLabel: 'Anonymise authors' },
      { id: 'dup-accounts', title: 'Possible duplicate accounts', description: 'Members sharing the same name and city.', severity: 'medium', dataset: 'Member directory', count: dups.length, samples: dups.slice(0, 3).map((d) => `${d[0]} ×${d.length}`) },
      { id: 'bad-emails', title: 'Invalid email addresses', description: 'Emails that fail format validation (cannot receive notices).', severity: 'medium', dataset: 'Member directory', count: badEmails.length, samples: badEmails.slice(0, 3).map((m) => `${m.fullName}: ${m.email}`) },
      { id: 'empty-posts', title: 'Empty journey posts', description: 'Posts with no text and no photos.', severity: 'low', dataset: 'Journey posts', count: emptyPosts.length, samples: emptyPosts.slice(0, 3).map((p) => `#${p.id}`), fixLabel: 'Delete empty posts' },
      { id: 'stale-hidden', title: 'Stale hidden-post references', description: 'Hidden-post IDs pointing at posts that no longer exist.', severity: 'low', dataset: 'Hidden posts', count: staleHidden.length, samples: staleHidden.slice(0, 3).map((id) => `#${id}`), fixLabel: 'Remove references' },
      { id: 'reports-missing', title: 'Reports on deleted content', description: 'Abuse reports whose post was removed — keep for the legal record.', severity: 'low', dataset: 'Abuse reports', count: reportsMissing.length, samples: reportsMissing.slice(0, 3).map((r) => `#${r.id}`) },
      { id: 'no-photo', title: 'Members without a profile photo', description: 'Profiles missing a photo reduce trust.', severity: 'low', dataset: 'Member directory', count: noPhoto.length, samples: noPhoto.slice(0, 3).map((c) => c.fullName) },
      { id: 'no-dob', title: 'Missing date of birth', description: 'Age-gating and age analytics fall back to estimates.', severity: 'low', dataset: 'Member directory', count: noDob.length, samples: noDob.slice(0, 3).map((c) => c.fullName) },
      { id: 'no-location', title: 'Incomplete location', description: 'Profiles without both a city and a country.', severity: 'low', dataset: 'Member directory', count: noLocation.length, samples: noLocation.slice(0, 3).map((c) => c.fullName) },
    ];
  });

  readonly healthScore = computed(() => {
    const total = Math.max(1, this.community.companions().length + this.community.journeyPosts().length);
    const weight = { high: 6, medium: 3, low: 1 };
    const penalty = this.qualityChecks().reduce((s, c) => s + Math.min(1, c.count / total) * weight[c.severity] * 10 + (c.count ? weight[c.severity] : 0), 0);
    return Math.max(0, Math.min(100, Math.round(100 - penalty)));
  });

  fixQuality(id: string): number {
    let fixed = 0;
    const posts = this.community.journeyPosts();
    if (id === 'orphan-posts') {
      const ids = new Set(this.community.companions().map((c) => Number(c.id)));
      const selfId = this.community.currentUser()?.id;
      if (selfId !== undefined) ids.add(Number(selfId));
      ids.add(0);
      this.community.adminReplaceDataset(
        JOURNEY_KEY,
        posts.map((p) => (ids.has(Number(p.author?.id)) ? p : (fixed++, { ...p, author: DELETED }))),
      );
    } else if (id === 'empty-posts') {
      const keep = posts.filter((p) => (p.text || '').trim() || p.imageUrl || p.imageUrls?.length || p.isShared);
      fixed = posts.length - keep.length;
      this.community.adminReplaceDataset(JOURNEY_KEY, keep);
    } else if (id === 'stale-hidden') {
      const postIds = new Set(posts.map((p) => p.id));
      const keep = this.community.hiddenPostIds().filter((h) => postIds.has(h));
      fixed = this.community.hiddenPostIds().length - keep.length;
      this.community.adminReplaceDataset(HIDDEN_POSTS_KEY, keep);
    }
    this.refreshStorage();
    this.audit.log({ category: 'data', action: `Data quality fix: ${id}`, details: `${fixed} record(s) fixed` });
    return fixed;
  }

  /* ============================ Backup & restore ============================ */

  readonly backups = computed(() => this.state().backups);

  async buildSnapshot(): Promise<BackupFile> {
    const data: Record<string, unknown> = {};
    let records = 0;
    for (const d of this.definitions) {
      const v = d.read();
      if (v === null || v === undefined) continue;
      data[d.key] = v;
      records += count(v);
    }
    const checksum = await sha256(JSON.stringify(data));
    return {
      __meta: { app: 'neverbeen', format: 1, createdUtc: new Date().toISOString(), checksum, datasets: Object.keys(data).length, records },
      data,
    };
  }

  async createBackup(kind: 'manual' | 'safety' = 'manual'): Promise<BackupEntry> {
    const snap = await this.buildSnapshot();
    const stamp = snap.__meta.createdUtc.replace(/[:.]/g, '-').slice(0, 19);
    const name = `neverbeen-backup-${kind === 'safety' ? 'pre-restore-' : ''}${stamp}.json`;
    const bytes = downloadJson(name, snap);
    const entry: BackupEntry = {
      id: Date.now(),
      name,
      createdUtc: snap.__meta.createdUtc,
      bytes,
      records: snap.__meta.records,
      datasets: snap.__meta.datasets,
      checksum: snap.__meta.checksum,
      kind,
    };
    this.mutate((s) => ({ ...s, backups: [entry, ...s.backups].slice(0, 30) }));
    this.audit.log({ category: 'data', action: kind === 'safety' ? 'Safety backup created before restore' : 'Backup created', details: `${entry.records} records · sha256 ${entry.checksum.slice(0, 12)}…` });
    return entry;
  }

  async previewRestore(text: string): Promise<RestorePreview> {
    let file: BackupFile;
    try {
      file = JSON.parse(text) as BackupFile;
    } catch {
      return { valid: false, error: 'This file is not valid JSON.', rows: [] };
    }
    if (!file?.__meta || file.__meta.app !== 'neverbeen' || !file.data || typeof file.data !== 'object') {
      return { valid: false, error: 'Not a NeverBeen backup file (missing __meta / data).', rows: [] };
    }
    const checksumOk = (await sha256(JSON.stringify(file.data))) === file.__meta.checksum;
    const current = new Map(this.datasets().map((d) => [d.key, d.records]));
    const rows = Object.entries(file.data).map(([key, value]) => ({
      key,
      label: this.definition(key)?.label ?? key,
      current: current.get(key) ?? 0,
      incoming: count(value),
    }));
    return { valid: true, checksumOk, file, rows };
  }

  /** Writes the backup into storage and reloads the app so every service re-hydrates. */
  applyRestore(file: BackupFile): void {
    for (const [key, value] of Object.entries(file.data)) {
      if (!key.startsWith('neverbeen_')) continue;
      localStorage.setItem(key, JSON.stringify(value));
    }
    this.audit.log({ category: 'data', action: 'Backup restored', details: `${file.__meta.records} records from ${file.__meta.createdUtc}` });
    setTimeout(() => window.location.reload(), 600);
  }

  factoryReset(): void {
    const keep = new Set(['neverbeen_admin_session']);
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k?.startsWith('neverbeen_') && !keep.has(k)) keys.push(k);
    }
    keys.forEach((k) => localStorage.removeItem(k));
    window.location.reload();
  }

  /* ============================ internals ============================ */

  private seedRequests(): void {
    const members = this.insights.members();
    if (members.length < 20) return;
    const types: PrivacyType[] = ['access', 'erasure', 'portability', 'rectification', 'consent_withdrawal', 'restriction', 'access', 'erasure'];
    const messages: Record<PrivacyType, string> = {
      access: 'Please send me a copy of all personal data NeverBeen holds about me.',
      portability: 'I would like to download my journey posts and profile in a machine-readable format.',
      rectification: 'My date of birth and hometown on my profile are wrong. Please correct them.',
      erasure: 'I am leaving the platform. Please delete my account and everything I posted.',
      restriction: 'Please stop using my activity for recommendations while my complaint is reviewed.',
      consent_withdrawal: 'I withdraw consent for marketing emails and analytics tracking.',
    };
    const statuses: PrivacyStatus[] = ['new', 'in_progress', 'new', 'completed', 'new', 'in_progress', 'new', 'rejected'];
    const now = Date.now();
    const requests: PrivacyRequest[] = types.map((type, i) => {
      const m = members[Math.floor(seeded(4000 + i * 37)() * members.length)];
      const received = now - (i * 4 + 1 + (i === 1 ? 26 : 0)) * 86_400_000;
      const status = statuses[i];
      return {
        id: 700_001 + i,
        type,
        userId: m.id,
        userName: m.fullName,
        email: m.email,
        regulation: i % 3 === 2 ? 'GDPR' : 'DPDP Act (India)',
        receivedUtc: new Date(received).toISOString(),
        dueUtc: new Date(received + 30 * 86_400_000).toISOString(),
        status,
        message: messages[type],
        resolution: status === 'completed' ? 'Consent preferences updated; confirmation email sent.' : status === 'rejected' ? 'Identity could not be verified from the requesting email.' : undefined,
        resolvedUtc: status === 'completed' || status === 'rejected' ? new Date(received + 3 * 86_400_000).toISOString() : undefined,
      };
    });
    this.mutate((s) => ({ ...s, requests, seeded: true }));
  }

  private load(): DataOpsState {
    const empty: DataOpsState = { requests: [], policies: DEFAULT_POLICIES, backups: [], maskPii: true, seeded: false };
    const saved = readLocal(ADMIN_DATA_OPS_KEY) as Partial<DataOpsState> | null;
    if (!saved) return empty;
    const policies = DEFAULT_POLICIES.map((d) => saved.policies?.find((p) => p.key === d.key) ?? d);
    return { ...empty, ...saved, policies };
  }

  private mutate(fn: (s: DataOpsState) => DataOpsState): void {
    this.state.update(fn);
    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem(ADMIN_DATA_OPS_KEY, JSON.stringify(this.state()));
      } catch {
        /* ignore */
      }
    }
    this.refreshStorage();
  }
}
