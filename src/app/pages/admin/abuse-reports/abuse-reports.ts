import { Component, ElementRef, afterNextRender, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AdminInsightsService, AdminReportView, shortDate, timeAgo } from '../shared/admin-insights.service';
import {
  AccountState,
  AdminModerationService,
  REPORT_DECISIONS,
  RESTRICTION_DURATIONS,
  RESTRICTION_SCOPES,
  ReportDecisionType,
  RestrictionScope,
  accountStateLabel,
} from '../../../services/admin-moderation.service';
import { CommunityService } from '../../../services/community.service';
import { SelectValueSync } from '../../../shared/select-value-sync';
import { ManageUserButton } from '../shared/manage-user-button';

interface DraftDecision {
  decision: ReportDecisionType | '';
  days: number;
  scopes: RestrictionScope[];
  note: string;
}

type Tab = 'pending' | 'resolved' | 'all';

/**
 * A — Abuse Reports: every report with who reported whom, the reported content,
 * and a decision dropdown for the admin (reject, warn, restrict for a period,
 * remove content, force identity confirmation, disable account).
 */
@Component({
  selector: 'app-admin-abuse-reports',
  imports: [SelectValueSync, ManageUserButton, RouterLink],
  templateUrl: './abuse-reports.html',
  styleUrls: ['../shared/admin-grid.css', './abuse-reports.css'],
})
export class AdminAbuseReports {
  private readonly insights = inject(AdminInsightsService);
  private readonly moderation = inject(AdminModerationService);
  private readonly community = inject(CommunityService);
  private readonly route = inject(ActivatedRoute);
  private readonly host = inject(ElementRef<HTMLElement>);

  protected readonly decisions = REPORT_DECISIONS;
  protected readonly durations = RESTRICTION_DURATIONS;
  protected readonly scopes = RESTRICTION_SCOPES;
  protected readonly timeAgo = timeAgo;
  protected readonly shortDate = shortDate;
  protected readonly stateLabel = accountStateLabel;

  protected readonly focusId = signal<number | null>(Number(this.route.snapshot.queryParamMap.get('report')) || null);
  protected readonly tab = signal<Tab>(this.focusId() ? 'all' : 'pending');
  protected readonly search = signal('');
  protected readonly reason = signal('');
  protected readonly type = signal('');
  protected readonly drafts = signal<Record<number, DraftDecision>>({});

  protected readonly reports = this.insights.reports;
  protected readonly reasons = computed(() => [...new Set(this.reports().map((r) => r.reason))].sort());

  protected readonly kpis = computed(() => {
    const all = this.reports();
    const actioned = new Set(
      all.filter((r) => r.decision && r.decision.decision !== 'reject').map((r) => r.reported.id),
    ).size;
    return [
      { label: 'Total reports', value: all.length, glow: 'rgba(99,102,241,0.18)' },
      { label: 'Awaiting decision', value: all.filter((r) => r.status === 'pending').length, glow: 'rgba(239,68,68,0.18)' },
      { label: 'Resolved', value: all.filter((r) => r.status === 'resolved').length, glow: 'rgba(16,185,129,0.18)' },
      { label: 'Members actioned', value: actioned, glow: 'rgba(245,158,11,0.18)' },
    ];
  });

  protected readonly counts = computed(() => ({
    pending: this.reports().filter((r) => r.status === 'pending').length,
    resolved: this.reports().filter((r) => r.status === 'resolved').length,
    all: this.reports().length,
  }));

  protected readonly filtered = computed(() => {
    const term = this.search().trim().toLowerCase();
    return this.reports().filter((r) => {
      if (this.tab() !== 'all' && r.status !== this.tab()) return false;
      if (this.reason() && r.reason !== this.reason()) return false;
      if (this.type() && r.targetType !== this.type()) return false;
      if (!term) return true;
      return (
        r.reporter.fullName.toLowerCase().includes(term) ||
        r.reported.fullName.toLowerCase().includes(term) ||
        r.reason.toLowerCase().includes(term) ||
        r.contentExcerpt.toLowerCase().includes(term) ||
        String(r.id).includes(term)
      );
    });
  });

  constructor() {
    afterNextRender(() => {
      const id = this.focusId();
      if (!id) return;
      const el = (this.host.nativeElement as HTMLElement).querySelector(`[data-report-id="${id}"]`);
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setTimeout(() => this.focusId.set(null), 2600);
    });
  }

  protected draft(id: number): DraftDecision {
    return this.drafts()[id] ?? { decision: '', days: 7, scopes: ['posting', 'commenting'], note: '' };
  }

  protected updateDraft(id: number, patch: Partial<DraftDecision>): void {
    this.drafts.update((map) => ({ ...map, [id]: { ...this.draft(id), ...patch } }));
  }

  protected toggleScope(id: number, scope: RestrictionScope, checked: boolean): void {
    const current = this.draft(id).scopes;
    this.updateDraft(id, { scopes: checked ? [...new Set([...current, scope])] : current.filter((s) => s !== scope) });
  }

  protected decisionMeta(key: ReportDecisionType | '' | undefined) {
    return this.decisions.find((d) => d.key === key);
  }

  protected durationLabel(days?: number): string {
    return this.durations.find((d) => d.days === days)?.label ?? `${days} days`;
  }

  protected scopeLabels(scopes?: RestrictionScope[]): string {
    return (scopes ?? []).map((s) => this.scopes.find((x) => x.key === s)?.label ?? s).join(', ');
  }

  protected apply(report: AdminReportView): void {
    const d = this.draft(report.id);
    if (!d.decision) return;
    const target = report.reported.id;
    const reason = `${report.reason} (report #${report.id})${d.note ? ' — ' + d.note : ''}`;

    switch (d.decision) {
      case 'warn':
        this.moderation.warn(target, reason);
        break;
      case 'restrict':
        this.moderation.restrict(target, d.days, d.scopes, reason);
        break;
      case 'remove_content':
        if (report.targetType === 'post') this.community.hideJourneyPost(report.targetId);
        this.moderation.warn(target, reason);
        break;
      case 'identity':
        this.moderation.forceIdentityConfirmation(target, reason);
        break;
      case 'disable':
        this.moderation.disableAccount(target, reason);
        break;
    }

    this.moderation.decideReport({
      reportId: report.id,
      decision: d.decision,
      note: d.note || undefined,
      durationDays: d.decision === 'restrict' ? d.days : undefined,
      restrictions: d.decision === 'restrict' ? d.scopes : undefined,
    });
    this.drafts.update((map) => {
      const next = { ...map };
      delete next[report.id];
      return next;
    });
    const label = this.decisionMeta(d.decision)?.label ?? 'Decision';
    this.insights.notify(`Report #${report.id}: ${label.split(' — ')[0]} applied to ${report.reported.fullName}.`);
  }

  protected reopen(report: AdminReportView): void {
    this.moderation.reopenReport(report.id);
    this.insights.notify(`Report #${report.id} re-opened for review.`);
  }

  protected reEnable(report: AdminReportView): void {
    this.insights.enable(report.reported.id);
  }

  protected stateTone(state: AccountState): string {
    return state === 'active' ? 'ok' : state === 'disabled' ? 'danger' : state === 'identity_required' ? 'violet' : 'warn';
  }

  protected reasonTone(reason: string): string {
    const r = reason.toLowerCase();
    if (r.includes('hate') || r.includes('harass') || r.includes('scam') || r.includes('political')) return 'danger';
    if (r.includes('spam') || r.includes('redundant') || r.includes('fake')) return 'violet';
    return 'warn';
  }
}
