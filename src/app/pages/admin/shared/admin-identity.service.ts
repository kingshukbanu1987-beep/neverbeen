import { Injectable, computed, inject, signal } from '@angular/core';
import { AdminModerationService, AccountModeration } from '../../../services/admin-moderation.service';
import { AdminAuditService } from '../../../services/admin-audit.service';
import { CommunityService } from '../../../services/community.service';
import { AdminInsightsService, MemberInsight, SUSPICIOUS_META, seeded } from './admin-insights.service';

export const ADMIN_IDENTITY_KEY = 'neverbeen_identity_submissions';

export type IdentityDocType = 'Aadhaar Card' | 'PAN Card' | 'Passport' | 'Driving Licence' | 'Voter ID' | 'National ID Card';
export type IdentityFileSide = 'Front' | 'Back' | 'Selfie';
/** Why the member had to verify: their account was disabled, or an admin forced an identity check. */
export type IdentityTrigger = 'disabled' | 'identity_required';
export type IdentityStatus = 'pending' | 'approved' | 'rejected' | 'resubmit_requested';

export interface IdentityFile {
  id: string;
  side: IdentityFileSide;
  name: string;
  mime: string;
  sizeBytes: number;
  /** Real uploads carry the file itself; seeded demo documents are rendered from the submission data. */
  dataUrl?: string;
}

export interface IdentityChecks {
  /** Name on document matches the profile name. */
  nameMatch: boolean;
  /** Date of birth on document matches the profile. */
  dobMatch: boolean;
  /** Document is within its validity period. */
  notExpired: boolean;
  /** Face similarity between selfie and document photo (0–100). */
  faceMatch: number;
  /** Liveness (selfie is a live capture, not a photo of a photo). */
  liveness: boolean;
  /** No signs of editing / tampering in the image. */
  tamperFree: boolean;
}

export interface IdentitySubmission {
  id: number;
  userId: number;
  trigger: IdentityTrigger;
  /** The moderation reason that caused the check. */
  triggerReason: string;
  documentType: IdentityDocType;
  documentNumber: string;
  nameOnDocument: string;
  dobOnDocument: string;
  genderOnDocument: string;
  issuingCountry: string;
  issuedOn: string;
  expiresOn: string;
  address?: string;
  files: IdentityFile[];
  checks: IdentityChecks;
  memberNote?: string;
  attempt: number;
  submittedAtUtc: string;
  status: IdentityStatus;
  decidedAtUtc?: string;
  decisionNote?: string;
}

interface IdentityState {
  seeded: boolean;
  submissions: IdentitySubmission[];
}

export const IDENTITY_STATUS_META: Record<IdentityStatus, { label: string; tone: string }> = {
  pending: { label: 'Awaiting review', tone: 'warn' },
  approved: { label: 'Approved · enabled', tone: 'ok' },
  rejected: { label: 'Permanently disabled', tone: 'danger' },
  resubmit_requested: { label: 'Re-check requested', tone: 'violet' },
};

export const IDENTITY_TRIGGER_META: Record<IdentityTrigger, { label: string; icon: string; tone: string }> = {
  disabled: { label: 'Account disabled', icon: '⛔', tone: 'danger' },
  identity_required: { label: 'Forced identity check', icon: '🪪', tone: 'violet' },
};

/** Masks a document number, keeping the last 4 characters (e.g. XXXX XXXX 4821). */
export function maskDocNumber(value: string): string {
  const visible = 4;
  let seen = 0;
  const chars = value.split('');
  for (let i = chars.length - 1; i >= 0; i--) {
    if (/[A-Za-z0-9]/.test(chars[i])) {
      seen++;
      if (seen > visible) chars[i] = '•';
    }
  }
  return chars.join('');
}

/** Number of automated checks that passed (face match ≥ 80 counts as pass). */
export function checksPassed(c: IdentityChecks): { passed: number; total: number } {
  const list = [c.nameMatch, c.dobMatch, c.notExpired, c.faceMatch >= 80, c.liveness, c.tamperFree];
  return { passed: list.filter(Boolean).length, total: list.length };
}

function load(): IdentityState {
  const empty: IdentityState = { seeded: false, submissions: [] };
  if (typeof localStorage === 'undefined') return empty;
  try {
    const raw = localStorage.getItem(ADMIN_IDENTITY_KEY);
    return raw ? { ...empty, ...(JSON.parse(raw) as IdentityState) } : empty;
  } catch {
    return empty;
  }
}

const DAY = 86_400_000;

/**
 * Identity verification queue — documents members submit after their account was disabled
 * or an admin forced an identity check. Admins can enable the account again, permanently
 * disable it, or force another identity check.
 */
@Injectable({ providedIn: 'root' })
export class AdminIdentityService {
  private readonly moderation = inject(AdminModerationService);
  private readonly audit = inject(AdminAuditService);
  private readonly community = inject(CommunityService);
  private readonly insights = inject(AdminInsightsService);

  readonly state = signal<IdentityState>(load());

  readonly submissions = computed(() => this.state().submissions.slice().sort((a, b) => b.submittedAtUtc.localeCompare(a.submittedAtUtc)));
  readonly pending = computed(() => this.submissions().filter((s) => s.status === 'pending'));

  /** Accounts that must verify but have not uploaded documents yet. */
  readonly awaitingDocuments = computed(() => {
    const open = new Set(this.submissions().filter((s) => s.status === 'pending').map((s) => s.userId));
    return this.insights
      .members()
      .filter((m) => (m.accountState === 'identity_required' || (m.accountState === 'disabled' && !this.moderation.actionOf(m.id)?.permanent)) && !open.has(m.id));
  });

  constructor() {
    if (!this.state().seeded) this.seed();
  }

  byId(id: number): IdentitySubmission | undefined {
    return this.state().submissions.find((s) => s.id === Number(id));
  }

  historyOf(userId: number): IdentitySubmission[] {
    return this.submissions().filter((s) => s.userId === Number(userId));
  }

  /** Called by the member-facing verification flow when documents are uploaded. */
  submit(input: Omit<IdentitySubmission, 'id' | 'attempt' | 'submittedAtUtc' | 'status' | 'trigger' | 'triggerReason'>): IdentitySubmission {
    const action = this.moderation.actionOf(input.userId);
    const sub: IdentitySubmission = {
      ...input,
      id: Date.now(),
      trigger: action?.state === 'disabled' ? 'disabled' : 'identity_required',
      triggerReason: action?.reason ?? 'Identity confirmation required',
      attempt: this.historyOf(input.userId).length + 1,
      submittedAtUtc: new Date().toISOString(),
      status: 'pending',
    };
    this.mutate((s) => ({ ...s, submissions: [sub, ...s.submissions] }));
    return sub;
  }

  /** Documents are genuine → enable the account again. */
  approve(id: number, note = 'Identity verified — account enabled'): void {
    const sub = this.byId(id);
    if (!sub) return;
    this.moderation.enableAccount(sub.userId);
    this.decide(sub, 'approved', note);
    this.audit.log({ category: 'security', action: 'Identity verification approved', targetId: sub.userId, targetLabel: this.name(sub.userId), details: `${sub.documentType} · ${note}` });
  }

  /** Documents are fake / mismatched → permanently disable. */
  permanentlyDisable(id: number, reason = 'Identity verification failed'): void {
    const sub = this.byId(id);
    if (!sub) return;
    this.moderation.permanentlyDisable(sub.userId, reason);
    this.decide(sub, 'rejected', reason);
    this.audit.log({ category: 'security', action: 'Identity verification rejected', targetId: sub.userId, targetLabel: this.name(sub.userId), details: reason });
  }

  /** Documents unclear → ask the member to verify again. */
  requestRecheck(id: number, reason = 'Documents unclear — please submit again'): void {
    const sub = this.byId(id);
    if (!sub) return;
    this.moderation.forceIdentityConfirmation(sub.userId, reason);
    this.decide(sub, 'resubmit_requested', reason);
  }

  /** Audit trail entry every time an admin opens a personal document. */
  logView(sub: IdentitySubmission, file: IdentityFile): void {
    this.audit.log({ category: 'privacy', action: `Identity document viewed (${sub.documentType} · ${file.side})`, targetId: sub.userId, targetLabel: this.name(sub.userId) });
  }

  /** Right to erasure: remove every document a member submitted. */
  forget(userId: number): number {
    const before = this.state().submissions.length;
    this.mutate((s) => ({ ...s, submissions: s.submissions.filter((x) => x.userId !== Number(userId)) }));
    return before - this.state().submissions.length;
  }

  private decide(sub: IdentitySubmission, status: IdentityStatus, note: string): void {
    this.mutate((s) => ({
      ...s,
      submissions: s.submissions.map((x) => (x.id === sub.id ? { ...x, status, decisionNote: note, decidedAtUtc: new Date().toISOString() } : x)),
    }));
  }

  private name(id: number): string {
    return this.insights.member(id)?.fullName ?? `Member #${id}`;
  }

  private mutate(fn: (s: IdentityState) => IdentityState): void {
    this.state.update(fn);
    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem(ADMIN_IDENTITY_KEY, JSON.stringify(this.state()));
      } catch {
        /* ignore quota errors */
      }
    }
  }

  /* ------------------------------------------------------------------ */
  /*  Demo data: high-risk members who were disabled / forced to verify  */
  /* ------------------------------------------------------------------ */

  private seed(): void {
    const candidates = this.insights
      .suspiciousUsers()
      .filter((s) => s.member.accountState === 'active' && s.member.id !== 1)
      .slice(0, 9);
    if (candidates.length < 3) return;

    // [trigger, status, attempt]
    const plan: [IdentityTrigger, IdentityStatus, number][] = [
      ['disabled', 'pending', 1],
      ['identity_required', 'pending', 1],
      ['disabled', 'pending', 2],
      ['identity_required', 'pending', 1],
      ['disabled', 'pending', 1],
      ['identity_required', 'pending', 1],
      ['disabled', 'approved', 1],
      ['identity_required', 'rejected', 1],
      ['disabled', 'resubmit_requested', 1],
    ];
    const now = Date.now();
    const actions: AccountModeration[] = [];
    const submissions: IdentitySubmission[] = [];

    candidates.forEach((s, i) => {
      const [trigger, status, attempt] = plan[i];
      const m = s.member;
      const rnd = seeded(9100 + m.id * 13);
      const top = s.signals[0];
      const triggerReason = `${SUSPICIOUS_META[top.type].label} — ${top.evidence}`.slice(0, 140);
      const submittedAt = now - (i * 7 + 2) * 3_600_000 - Math.floor(rnd() * 3_600_000);
      const decidedAt = submittedAt + 5 * 3_600_000;

      const accountState = status === 'approved' ? 'active' : status === 'rejected' ? 'disabled' : status === 'resubmit_requested' ? 'identity_required' : trigger;
      actions.push({
        userId: m.id,
        state: accountState,
        warnings: 1,
        permanent: status === 'rejected' ? true : undefined,
        reason: status === 'approved' ? 'Re-enabled after identity verification' : status === 'rejected' ? 'Identity verification failed — document mismatch' : triggerReason,
        updatedAtUtc: new Date(status === 'pending' ? submittedAt - 20 * 3_600_000 : decidedAt).toISOString(),
      });

      const doc = this.makeDocument(m, rnd, i);
      const bad = status === 'rejected' || i === 2; // mismatched / suspicious documents
      const checks: IdentityChecks = {
        nameMatch: !bad,
        dobMatch: !(bad && i !== 2),
        notExpired: i !== 5,
        faceMatch: bad ? 41 + Math.floor(rnd() * 25) : 82 + Math.floor(rnd() * 17),
        liveness: !(status === 'rejected'),
        tamperFree: !(status === 'rejected'),
      };
      submissions.push({
        id: 880_001 + i,
        userId: m.id,
        trigger,
        triggerReason,
        ...doc,
        nameOnDocument: checks.nameMatch ? m.fullName.toUpperCase() : this.alteredName(m.fullName),
        files: this.files(doc.documentType, m.id, rnd),
        checks,
        memberNote: [
          'Please restore my account, I have uploaded my original ID.',
          'This is my real profile. Attaching my ID and a selfie.',
          'Uploading again with a clearer photo as requested.',
          'I only share travel stories — happy to verify.',
          'My account was disabled by mistake, here are my documents.',
          undefined,
          'Documents attached for verification.',
          'Please check.',
          'Here is my licence.',
        ][i],
        attempt,
        submittedAtUtc: new Date(submittedAt).toISOString(),
        status,
        decidedAtUtc: status === 'pending' ? undefined : new Date(decidedAt).toISOString(),
        decisionNote:
          status === 'approved'
            ? 'Identity verified — account enabled'
            : status === 'rejected'
              ? 'Identity verification failed — document mismatch'
              : status === 'resubmit_requested'
                ? 'Photo blurred — please submit a clearer image'
                : undefined,
      });
    });

    this.moderation.seedAccountActions(actions);
    this.mutate(() => ({ seeded: true, submissions }));
  }

  private makeDocument(m: MemberInsight, rnd: () => number, i: number) {
    const c = this.community.companions().find((x) => Number(x.id) === m.id);
    const india = m.country === 'India';
    const types: IdentityDocType[] = india ? ['Aadhaar Card', 'PAN Card', 'Passport', 'Driving Licence', 'Voter ID'] : ['Passport', 'National ID Card', 'Driving Licence'];
    const documentType = types[i % types.length];
    const digits = (n: number) => Array.from({ length: n }, () => Math.floor(rnd() * 10)).join('');
    const letters = (n: number) => Array.from({ length: n }, () => String.fromCharCode(65 + Math.floor(rnd() * 26))).join('');
    const documentNumber =
      documentType === 'Aadhaar Card'
        ? `${digits(4)} ${digits(4)} ${digits(4)}`
        : documentType === 'PAN Card'
          ? `${letters(5)}${digits(4)}${letters(1)}`
          : documentType === 'Passport'
            ? `${letters(1)}${digits(7)}`
            : documentType === 'Driving Licence'
              ? `${india ? 'DL' : letters(2)}-${digits(2)}${digits(11)}`
              : documentType === 'Voter ID'
                ? `${letters(3)}${digits(7)}`
                : `${letters(2)}${digits(9)}`;
    const dob = c?.aboutMeDetails?.dateOfBirth || new Date(Date.now() - m.age * 365.25 * DAY).toISOString().slice(0, 10);
    const issued = new Date(Date.now() - (1 + Math.floor(rnd() * 8)) * 365 * DAY - Math.floor(rnd() * 300) * DAY);
    const expires = i === 5 ? new Date(Date.now() - 40 * DAY) : new Date(issued.getTime() + 10 * 365 * DAY);
    return {
      documentType,
      documentNumber,
      dobOnDocument: dob,
      genderOnDocument: m.gender || '—',
      issuingCountry: m.country || 'India',
      issuedOn: issued.toISOString().slice(0, 10),
      expiresOn: documentType === 'Aadhaar Card' || documentType === 'PAN Card' || documentType === 'Voter ID' ? '' : expires.toISOString().slice(0, 10),
      address: [c?.aboutMeDetails?.hometown || m.city, m.country].filter(Boolean).join(', '),
    };
  }

  private files(type: IdentityDocType, userId: number, rnd: () => number): IdentityFile[] {
    const slug = type.toLowerCase().replace(/\s+/g, '-');
    const sides: IdentityFileSide[] = type === 'Passport' || type === 'PAN Card' ? ['Front', 'Selfie'] : ['Front', 'Back', 'Selfie'];
    return sides.map((side) => ({
      id: `${userId}-${side.toLowerCase()}`,
      side,
      name: side === 'Selfie' ? `selfie-with-${slug}.jpg` : `${slug}-${side.toLowerCase()}.jpg`,
      mime: 'image/jpeg',
      sizeBytes: 380_000 + Math.floor(rnd() * 1_900_000),
    }));
  }

  private alteredName(name: string): string {
    const parts = name.split(' ');
    const alt = ['KUMAR', 'SINGH', 'KHAN', 'DAS', 'VERMA', 'ROY'];
    return [parts[0], alt[name.length % alt.length]].join(' ').toUpperCase();
  }
}
