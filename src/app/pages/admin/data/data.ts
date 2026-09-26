import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import { AdminDataOpsService, STORAGE_QUOTA } from '../shared/admin-data-ops.service';
import { AdminInsightsService } from '../shared/admin-insights.service';
import { AdminAuditLog } from '../shared/admin-audit-log';
import type { AuditCategory } from '../../../services/admin-audit.service';
import { AdminDataCatalog } from './data-catalog';
import { AdminDataExplorer } from './data-explorer';
import { AdminPrivacyRequests } from './privacy-requests';
import { AdminRetention } from './retention';
import { AdminDataQuality } from './data-quality';
import { AdminBackupRestore } from './backup-restore';
import { formatBytes } from './format';

type DataTab = 'catalog' | 'explorer' | 'privacy' | 'retention' | 'quality' | 'backup' | 'access';

/**
 * Admin > Data Management — data catalog & PII inventory, explorer with masking,
 * privacy (data-subject) requests with SLA, retention policies, data quality,
 * backup & restore and a data-access log.
 */
@Component({
  selector: 'app-admin-data',
  imports: [AdminDataCatalog, AdminDataExplorer, AdminPrivacyRequests, AdminRetention, AdminDataQuality, AdminBackupRestore, AdminAuditLog],
  styleUrls: ['../shared/admin-grid.css', './data.css'],
  template: `
    <header class="g-page-head">
      <div>
        <h2>Data Management</h2>
        <p>Govern every byte of member data — know what you hold, honour privacy rights, keep it clean and recoverable.</p>
      </div>
    </header>

    <div class="g-kpis">
      @for (k of kpis(); track k.label) {
        <div class="g-kpi" [style.--kpi-glow]="k.glow">
          <small>{{ k.label }}</small>
          <strong>{{ k.value }}</strong>
          <span class="dm-kpi-sub">{{ k.sub }}</span>
        </div>
      }
    </div>

    <div class="dm-tabs-row">
      <nav class="g-tabs" role="tablist" aria-label="Data management sections">
        @for (t of tabs; track t.key) {
          <button type="button" role="tab" [class.active]="tab() === t.key" [attr.aria-selected]="tab() === t.key" (click)="setTab(t.key)">
            {{ t.icon }} {{ t.label }}
            @if (t.key === 'privacy' && openRequests()) {
              <span class="count">{{ openRequests() }}</span>
            }
            @if (t.key === 'quality' && issues()) {
              <span class="count">{{ issues() }}</span>
            }
          </button>
        }
      </nav>
    </div>

    @switch (tab()) {
      @case ('catalog') {
        <app-admin-data-catalog (explore)="explore($event)" />
      }
      @case ('explorer') {
        <app-admin-data-explorer [initialKey]="explorerKey()" />
      }
      @case ('privacy') {
        <app-admin-privacy-requests />
      }
      @case ('retention') {
        <app-admin-retention />
      }
      @case ('quality') {
        <app-admin-data-quality />
      }
      @case ('backup') {
        <app-admin-backup-restore />
      }
      @case ('access') {
        <app-admin-audit-log [categories]="accessCategories" />
      }
    }
  `,
})
export class AdminData implements OnInit {
  private readonly dataOps = inject(AdminDataOpsService);
  private readonly insights = inject(AdminInsightsService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  protected readonly tabs: { key: DataTab; label: string; icon: string }[] = [
    { key: 'catalog', label: 'Catalog', icon: '🗂️' },
    { key: 'explorer', label: 'Explorer', icon: '🔎' },
    { key: 'privacy', label: 'Privacy requests', icon: '🧾' },
    { key: 'retention', label: 'Retention', icon: '⏳' },
    { key: 'quality', label: 'Data quality', icon: '🩺' },
    { key: 'backup', label: 'Backup & restore', icon: '💾' },
    { key: 'access', label: 'Access log', icon: '📜' },
  ];
  protected readonly accessCategories: AuditCategory[] = ['data', 'privacy'];

  private readonly queryTab = toSignal(this.route.queryParamMap.pipe(map((p) => p.get('tab'))), { initialValue: null });
  private readonly localTab = signal<DataTab | null>(null);
  protected readonly explorerKey = signal<string | null>(null);

  protected readonly tab = computed<DataTab>(() => {
    const t = this.localTab() ?? this.queryTab();
    return this.tabs.some((x) => x.key === t) ? (t as DataTab) : 'catalog';
  });

  protected readonly openRequests = computed(() => this.dataOps.requests().filter((r) => r.status === 'new' || r.status === 'in_progress').length);
  protected readonly issues = computed(() => this.dataOps.qualityChecks().filter((c) => c.count > 0 && c.severity !== 'low').length);

  protected readonly kpis = computed(() => {
    const ds = this.dataOps.datasets();
    const used = this.dataOps.storageUsed();
    const overdue = this.dataOps.requests().filter((r) => (r.status === 'new' || r.status === 'in_progress') && Date.parse(r.dueUtc) < Date.now()).length;
    const last = this.dataOps.backups()[0];
    return [
      { label: 'Datasets', value: ds.length, sub: `${ds.filter((d) => d.classification === 'PII' || d.classification === 'Sensitive').length} hold personal / sensitive data`, glow: 'rgba(99,102,241,0.16)' },
      { label: 'Records', value: this.dataOps.totalRecords().toLocaleString(), sub: 'Across all datasets', glow: 'rgba(16,185,129,0.16)' },
      { label: 'Storage', value: formatBytes(used), sub: `${Math.round((used / STORAGE_QUOTA) * 100)}% of ${formatBytes(STORAGE_QUOTA)} browser quota`, glow: 'rgba(14,165,233,0.16)' },
      { label: 'Privacy requests', value: this.openRequests(), sub: overdue ? `${overdue} overdue!` : 'Open · all within SLA', glow: overdue ? 'rgba(239,68,68,0.2)' : 'rgba(139,92,246,0.16)' },
      { label: 'Data health', value: `${this.dataOps.healthScore()}/100`, sub: `${this.dataOps.qualityChecks().filter((c) => c.count).length} checks need attention`, glow: 'rgba(245,158,11,0.18)' },
      { label: 'Last backup', value: last ? new Date(last.createdUtc).toLocaleDateString(undefined, { day: 'numeric', month: 'short' }) : 'Never', sub: last ? `${last.records.toLocaleString()} records` : 'Create one now', glow: last ? 'rgba(16,185,129,0.16)' : 'rgba(239,68,68,0.2)' },
    ];
  });

  ngOnInit(): void {
    const purged = this.dataOps.runAutoPolicies();
    if (purged > 0) this.insights.notify(`Retention auto-purge removed ${purged} expired record(s).`);
  }

  protected setTab(tab: DataTab): void {
    this.localTab.set(tab);
    this.router.navigate([], { relativeTo: this.route, queryParams: { tab: tab === 'catalog' ? null : tab }, replaceUrl: true });
  }

  protected explore(key: string): void {
    this.explorerKey.set(key);
    this.setTab('explorer');
  }
}
