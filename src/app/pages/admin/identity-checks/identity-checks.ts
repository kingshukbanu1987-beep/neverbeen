import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  AdminIdentityService,
  IDENTITY_STATUS_META,
  IDENTITY_TRIGGER_META,
  IdentityStatus,
  IdentitySubmission,
  checksPassed,
  maskDocNumber,
} from '../shared/admin-identity.service';
import { AdminInsightsService, MemberInsight, shortDate, timeAgo } from '../shared/admin-insights.service';
import { accountStateLabel } from '../../../services/admin-moderation.service';
import { AdminConfirmDialog } from '../shared/admin-confirm-dialog';
import { IdDocument } from './id-document';
import { SelectValueSync } from '../../../shared/select-value-sync';
import { ManageUserButton } from '../shared/manage-user-button';

type Tab = 'pending' | 'resubmit_requested' | 'approved' | 'rejected' | 'all';
type Pending = { kind: 'enable' | 'disable' | 'recheck'; sub: IdentitySubmission } | null;

interface Row {
  s: IdentitySubmission;
  m: MemberInsight | undefined;
  photo: string;
  passed: number;
  total: number;
}

/** Admin > Dashboard > Identity Check Verification — review submitted identity documents. */
@Component({
  selector: 'app-admin-identity-checks',
  imports: [SelectValueSync, ManageUserButton, RouterLink, AdminConfirmDialog, IdDocument],
  templateUrl: './identity-checks.html',
  styleUrls: ['../shared/admin-grid.css', './identity-checks.css'],
})
export class AdminIdentityChecks {
  private readonly identity = inject(AdminIdentityService);
  private readonly insights = inject(AdminInsightsService);

  protected readonly statusMeta = IDENTITY_STATUS_META;
  protected readonly triggerMeta = IDENTITY_TRIGGER_META;
  protected readonly mask = maskDocNumber;
  protected readonly timeAgo = timeAgo;
  protected readonly shortDate = shortDate;
  protected readonly stateLabel = accountStateLabel;

  protected readonly tab = signal<Tab>('pending');
  protected readonly search = signal('');
  protected readonly trigger = signal('');
  protected readonly docType = signal('');
  protected readonly checkFilter = signal<'' | 'clean' | 'flagged'>('');
  protected readonly pending = signal<Pending>(null);

  protected readonly tabs: { key: Tab; label: string }[] = [
    { key: 'pending', label: '⏳ Awaiting review' },
    { key: 'resubmit_requested', label: '🔁 Re-check requested' },
    { key: 'approved', label: '✅ Enabled' },
    { key: 'rejected', label: '⛔ Permanently disabled' },
    { key: 'all', label: 'All' },
  ];

  private readonly rows = computed<Row[]>(() =>
    this.identity.submissions().map((s) => {
      const m = this.insights.member(s.userId);
      return { s, m, photo: m?.photo ?? '', ...(({ passed, total }) => ({ passed, total }))(checksPassed(s.checks)) };
    }),
  );

  protected readonly counts = computed(() => {
    const all = this.rows();
    const by = (st: IdentityStatus) => all.filter((r) => r.s.status === st).length;
    return { pending: by('pending'), resubmit_requested: by('resubmit_requested'), approved: by('approved'), rejected: by('rejected'), all: all.length } as Record<Tab, number>;
  });

  protected readonly docTypes = computed(() => [...new Set(this.rows().map((r) => r.s.documentType))].sort());

  protected readonly kpis = computed(() => {
    const pend = this.rows().filter((r) => r.s.status === 'pending');
    const decided = this.rows().filter((r) => r.s.decidedAtUtc);
    const avgH = decided.length ? Math.round(decided.reduce((t, r) => t + (Date.parse(r.s.decidedAtUtc!) - Date.parse(r.s.submittedAtUtc)), 0) / decided.length / 3_600_000) : 0;
    return [
      { label: 'Awaiting review', value: pend.length, glow: 'rgba(245,158,11,0.2)' },
      { label: 'From disabled accounts', value: pend.filter((r) => r.s.trigger === 'disabled').length, glow: 'rgba(239,68,68,0.18)' },
      { label: 'From forced checks', value: pend.filter((r) => r.s.trigger === 'identity_required').length, glow: 'rgba(139,92,246,0.18)' },
      { label: 'Failed auto-checks', value: pend.filter((r) => r.passed < r.total).length, glow: 'rgba(239,68,68,0.18)' },
      { label: 'Awaiting documents', value: this.identity.awaitingDocuments().length, glow: 'rgba(14,165,233,0.16)' },
      { label: 'Avg. review time', value: decided.length ? `${avgH}h` : '—', glow: 'rgba(16,185,129,0.16)' },
    ];
  });

  protected readonly filtered = computed(() => {
    const t = this.tab();
    const q = this.search().trim().toLowerCase();
    const trig = this.trigger();
    const dt = this.docType();
    const cf = this.checkFilter();
    return this.rows()
      .filter((r) => t === 'all' || r.s.status === t)
      .filter((r) => !trig || r.s.trigger === trig)
      .filter((r) => !dt || r.s.documentType === dt)
      .filter((r) => (cf === 'clean' ? r.passed === r.total : cf === 'flagged' ? r.passed < r.total : true))
      .filter(
        (r) =>
          !q ||
          [r.m?.fullName ?? '', r.m?.email ?? '', r.m?.uniqueId ?? '', r.s.nameOnDocument, r.s.documentType, r.s.triggerReason].some((v) => v.toLowerCase().includes(q)),
      )
      .sort((a, b) => (t === 'pending' || t === 'all' ? a.s.submittedAtUtc.localeCompare(b.s.submittedAtUtc) : b.s.submittedAtUtc.localeCompare(a.s.submittedAtUtc)));
  });

  protected faceTone(score: number): string {
    return score >= 80 ? 'ok' : score >= 60 ? 'warn' : 'danger';
  }

  protected isOpen(s: IdentitySubmission): boolean {
    return s.status === 'pending' || s.status === 'resubmit_requested';
  }

  protected confirm(reason: string): void {
    const p = this.pending();
    if (!p) return;
    const name = this.insights.member(p.sub.userId)?.fullName ?? 'Member';
    if (p.kind === 'enable') {
      this.identity.approve(p.sub.id, reason || undefined);
      this.insights.notify(`${name}'s identity is verified — account enabled again.`);
    } else if (p.kind === 'disable') {
      this.identity.permanentlyDisable(p.sub.id, reason || undefined);
      this.insights.notify(`${name}'s account has been permanently disabled.`);
    } else {
      this.identity.requestRecheck(p.sub.id, reason || undefined);
      this.insights.notify(`${name} must complete the identity check again.`);
    }
    this.pending.set(null);
  }
}
