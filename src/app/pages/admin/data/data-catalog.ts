import { Component, computed, inject, output, signal } from '@angular/core';
import { AdminDataOpsService, DatasetInfo, STORAGE_QUOTA } from '../shared/admin-data-ops.service';
import { AdminInsightsService } from '../shared/admin-insights.service';
import { AdminConfirmDialog } from '../shared/admin-confirm-dialog';
import { CLASS_TONE, formatBytes } from './format';
import { SelectValueSync } from '../../../shared/select-value-sync';

/** Dataset catalog: storage meter, classification, owner, PII inventory, export & clear. */
@Component({
  selector: 'app-admin-data-catalog',
  imports: [SelectValueSync, AdminConfirmDialog],
  styleUrls: ['../shared/admin-grid.css', './data.css'],
  template: `
    <section class="g-panel dm-storage">
      <div class="dm-storage-head">
        <div>
          <h3>Storage usage</h3>
          <p>{{ fmt(used()) }} of {{ fmt(quota) }} used · {{ pct() }}%</p>
        </div>
        <div class="dm-legend">
          @for (s of segments(); track s.key) {
            <span><i [style.background]="s.color"></i>{{ s.label }} · {{ fmt(s.bytes) }}</span>
          }
        </div>
      </div>
      <div class="dm-meter" [class.warn]="pct() >= 70" [class.danger]="pct() >= 90" role="meter" [attr.aria-valuenow]="pct()" aria-valuemin="0" aria-valuemax="100">
        @for (s of segments(); track s.key) {
          <i [style.width.%]="(s.bytes / quota) * 100" [style.background]="s.color" [title]="s.label + ' — ' + fmt(s.bytes)"></i>
        }
      </div>
      @if (pct() >= 70) {
        <p class="dm-note warn">⚠ Storage is getting full. Apply retention policies or export & clear old datasets.</p>
      }
    </section>

    <section class="g-panel" style="margin-top: 1rem">
      <div class="g-toolbar">
        <label class="g-search">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
            <circle cx="11" cy="11" r="7"></circle>
            <line x1="21" y1="21" x2="16.5" y2="16.5"></line>
          </svg>
          <input type="search" placeholder="Search datasets or fields…" [value]="search()" (input)="search.set($any($event.target).value)" aria-label="Search datasets" />
        </label>
        <label class="g-select">
          <span>Classification</span>
          <select [value]="cls()" (change)="cls.set($any($event.target).value)">
            <option value="">All</option>
            <option value="PII">PII</option>
            <option value="Sensitive">Sensitive</option>
            <option value="Internal">Internal</option>
            <option value="Public">Public</option>
          </select>
        </label>
      </div>
      <div class="g-table-wrap">
        <table class="g-table">
          <thead>
            <tr>
              <th>Dataset</th>
              <th>Classification</th>
              <th>Owner</th>
              <th style="text-align: right">Records</th>
              <th style="text-align: right">Size</th>
              <th>Personal data fields</th>
              <th style="text-align: right">Actions</th>
            </tr>
          </thead>
          <tbody>
            @for (d of filtered(); track d.key) {
              <tr>
                <td>
                  <div class="dm-ds">
                    <span class="dm-ds-icon">{{ d.icon }}</span>
                    <div>
                      <strong>{{ d.label }}</strong>
                      <small>{{ d.description }}</small>
                      <code>{{ d.key }}</code>
                    </div>
                  </div>
                </td>
                <td><span class="g-badge" [class]="'g-badge ' + tone[d.classification]">{{ d.classification }}</span></td>
                <td class="g-nowrap">{{ d.owner }}</td>
                <td class="g-nowrap" style="text-align: right"><strong>{{ d.records.toLocaleString() }}</strong></td>
                <td class="g-nowrap" style="text-align: right">
                  {{ fmt(d.bytes) }}
                  <br /><small class="g-muted">{{ d.persisted ? 'saved' : 'seed data' }}</small>
                </td>
                <td>
                  <div class="dm-fields">
                    @for (f of piiFields(d); track f.path) {
                      <span class="dm-field" [attr.data-cls]="f.cls" [title]="f.note ?? f.cls">{{ f.path }}</span>
                    } @empty {
                      <span class="g-muted">None</span>
                    }
                  </div>
                </td>
                <td>
                  <div class="g-actions">
                    <button type="button" class="g-btn" (click)="explore.emit(d.key)">🔎 Explore</button>
                    <button type="button" class="g-btn" (click)="dataOps.exportDataset(d.key, 'json')" [disabled]="!d.records">JSON</button>
                    <button type="button" class="g-btn" (click)="dataOps.exportDataset(d.key, 'csv')" [disabled]="!d.records">CSV</button>
                    @if (d.clearable) {
                      <button type="button" class="g-btn danger" [disabled]="!d.records" (click)="pendingClear.set(d)">Clear</button>
                    }
                  </div>
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>
      <footer class="g-foot">
        <span>{{ filtered().length }} dataset(s) · {{ piiCount() }} personal-data fields inventoried</span>
      </footer>
    </section>

    @if (pendingClear(); as d) {
      <app-admin-confirm-dialog
        [heading]="'Clear ' + d.label + '?'"
        [message]="'All ' + d.records + ' record(s) will be permanently deleted. Export a copy first if you need it.'"
        confirmLabel="Clear dataset"
        [withReason]="false"
        (confirmed)="clear(d)"
        (cancelled)="pendingClear.set(null)"
      />
    }
  `,
})
export class AdminDataCatalog {
  protected readonly dataOps = inject(AdminDataOpsService);
  private readonly insights = inject(AdminInsightsService);

  readonly explore = output<string>();

  protected readonly quota = STORAGE_QUOTA;
  protected readonly tone = CLASS_TONE;
  protected readonly fmt = formatBytes;
  protected readonly search = signal('');
  protected readonly cls = signal('');
  protected readonly pendingClear = signal<DatasetInfo | null>(null);

  protected readonly used = this.dataOps.storageUsed;
  protected readonly pct = computed(() => Math.min(100, Math.round((this.used() / STORAGE_QUOTA) * 100)));

  protected readonly segments = computed(() => {
    const ds = this.dataOps.datasets().filter((d) => d.persisted);
    const byOwner = (owner: string) => ds.filter((d) => d.owner === owner).reduce((s, d) => s + d.persistedBytes, 0);
    const community = byOwner('Community');
    const admin = byOwner('Admin');
    const session = byOwner('Session');
    return [
      { key: 'community', label: 'Community', bytes: community, color: '#10b981' },
      { key: 'admin', label: 'Admin', bytes: admin, color: '#6366f1' },
      { key: 'session', label: 'Session', bytes: session, color: '#f59e0b' },
      { key: 'other', label: 'Other', bytes: Math.max(0, this.used() - community - admin - session), color: '#94a3b8' },
    ];
  });

  protected readonly filtered = computed(() => {
    const q = this.search().trim().toLowerCase();
    const cls = this.cls();
    return this.dataOps
      .datasets()
      .filter((d) => !cls || d.classification === cls)
      .filter((d) => !q || [d.label, d.description, d.key, ...d.fields.map((f) => f.path)].some((v) => v.toLowerCase().includes(q)));
  });

  protected readonly piiCount = computed(() => this.dataOps.datasets().reduce((s, d) => s + this.piiFields(d).length, 0));

  protected piiFields(d: DatasetInfo) {
    return d.fields.filter((f) => f.cls === 'PII' || f.cls === 'Sensitive' || f.cls === 'Quasi-identifier');
  }

  protected clear(d: DatasetInfo): void {
    this.dataOps.clearDataset(d.key);
    this.pendingClear.set(null);
    this.insights.notify(`${d.label} cleared.`);
  }
}
