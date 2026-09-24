import { Component, computed, inject, signal } from '@angular/core';
import { AdminDataOpsService, RETENTION_OPTIONS, RetentionPolicy } from '../shared/admin-data-ops.service';
import { AdminInsightsService, timeAgo } from '../shared/admin-insights.service';
import { AdminConfirmDialog } from '../shared/admin-confirm-dialog';

/** Retention policies — how long each dataset is kept, what happens after, and auto-purge. */
@Component({
  selector: 'app-admin-retention',
  imports: [AdminConfirmDialog],
  styleUrls: ['../shared/admin-grid.css', './data.css'],
  template: `
    <section class="g-panel">
      <div class="dm-panel-head">
        <div>
          <h3>Retention policies</h3>
          <p>Data minimisation: keep personal data only as long as needed. Auto-purge policies run each time Data Management opens.</p>
        </div>
      </div>
      <div class="g-table-wrap">
        <table class="g-table">
          <thead>
            <tr>
              <th>Dataset</th>
              <th>Keep for</th>
              <th>Then</th>
              <th>Auto-purge</th>
              <th style="text-align: right">Expired now</th>
              <th>Last run</th>
              <th style="text-align: right">Action</th>
            </tr>
          </thead>
          <tbody>
            @for (row of rows(); track row.policy.key) {
              <tr>
                <td>
                  <strong>{{ row.icon }} {{ row.label }}</strong><br />
                  <small class="g-muted">{{ row.records }} record(s)</small>
                </td>
                <td>
                  <select class="dm-inline-select" [value]="row.policy.days" (change)="update(row.policy, { days: +$any($event.target).value })" [attr.aria-label]="'Retention for ' + row.label">
                    @for (o of options; track o.days) {
                      <option [value]="o.days">{{ o.label }}</option>
                    }
                  </select>
                </td>
                <td>
                  <select class="dm-inline-select" [value]="row.policy.action" (change)="update(row.policy, { action: $any($event.target).value })" [attr.aria-label]="'Action for ' + row.label">
                    <option value="delete">Delete</option>
                    <option value="archive">Archive (download) & delete</option>
                  </select>
                </td>
                <td>
                  <button
                    type="button"
                    class="rm-toggle"
                    role="switch"
                    [class.on]="row.policy.auto"
                    [attr.aria-checked]="row.policy.auto"
                    [attr.aria-label]="'Auto-purge ' + row.label"
                    [disabled]="!row.policy.days"
                    (click)="update(row.policy, { auto: !row.policy.auto })"
                  ></button>
                </td>
                <td style="text-align: right">
                  @if (row.policy.days) {
                    <strong [class.dm-danger-text]="row.expired > 0">{{ row.expired }}</strong>
                  } @else {
                    <span class="g-muted">—</span>
                  }
                </td>
                <td class="g-nowrap g-muted">
                  {{ row.policy.lastRunUtc ? timeAgo(row.policy.lastRunUtc) + ' · ' + (row.policy.lastRunAffected ?? 0) + ' removed' : 'Never' }}
                </td>
                <td>
                  <div class="g-actions">
                    <button type="button" class="g-btn dark" [disabled]="!row.policy.days" (click)="pending.set(row)">Run now</button>
                  </div>
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>
      <footer class="g-foot"><span>“Keep forever” disables purging for that dataset. Archive downloads a JSON copy before deleting.</span></footer>
    </section>

    @if (pending(); as row) {
      <app-admin-confirm-dialog
        [heading]="'Run retention on ' + row.label + '?'"
        [message]="row.expired + ' record(s) older than ' + row.policy.days + ' days will be ' + (row.policy.action === 'archive' ? 'archived to a JSON file and removed.' : 'permanently deleted.')"
        [confirmLabel]="row.policy.action === 'archive' ? 'Archive & purge' : 'Delete expired'"
        [withReason]="false"
        (confirmed)="run(row)"
        (cancelled)="pending.set(null)"
      />
    }
  `,
})
export class AdminRetention {
  private readonly dataOps = inject(AdminDataOpsService);
  private readonly insights = inject(AdminInsightsService);

  protected readonly options = RETENTION_OPTIONS;
  protected readonly timeAgo = timeAgo;
  protected readonly pending = signal<{ policy: RetentionPolicy; label: string; expired: number } | null>(null);

  protected readonly rows = computed(() => {
    const ds = this.dataOps.datasets();
    return this.dataOps.policies().map((policy) => {
      const d = ds.find((x) => x.key === policy.key);
      return { policy, label: d?.label ?? policy.key, icon: d?.icon ?? '📁', records: d?.records ?? 0, expired: this.dataOps.affectedBy(policy).length };
    });
  });

  protected update(policy: RetentionPolicy, patch: Partial<RetentionPolicy>): void {
    if (patch.days === 0) patch = { ...patch, auto: false };
    this.dataOps.updatePolicy(policy.key, patch);
  }

  protected run(row: { policy: RetentionPolicy; label: string }): void {
    const n = this.dataOps.runPolicy(row.policy.key, 'manual');
    this.pending.set(null);
    this.insights.notify(n ? `${n} expired record(s) purged from ${row.label}.` : `Nothing to purge in ${row.label}.`);
  }
}
