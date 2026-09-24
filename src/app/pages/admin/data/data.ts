import { Component, computed, inject, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import {
  ABUSE_REPORTS_KEY,
  BLOCKED_USERS_KEY,
  COMPANIONS_KEY,
  COMMENTS_KEY,
  CIRCLES_KEY,
  HIDDEN_POSTS_KEY,
  JOURNEY_KEY,
  NOTIFS_KEY,
  PROFILE_KEY,
  TOKEN_KEY,
  USER_KEY,
  CommunityService,
} from '../../../services/community.service';

interface DatasetRow {
  key: string;
  label: string;
  records: number;
  bytes: number;
  clearable: boolean;
  exists: boolean;
}

/**
 * Admin > Data Management — every NeverBeen dataset stored in the browser:
 * live record counts & storage usage, dataset clearing, full JSON export and
 * a factory reset.
 */
@Component({
  selector: 'app-admin-data',
  imports: [DecimalPipe],
  template: `
    <div class="admin-page-head">
      <h2>Data Management</h2>
      <p>Datasets stored in this browser, backups and maintenance actions.</p>
    </div>

    <div class="data-summary">
      <div class="summary-card">
        <p class="summary-label">Total stored</p>
        <p class="summary-value">{{ totalBytes() | number }} B</p>
        <small>{{ datasets().length }} datasets · localStorage</small>
      </div>
      <div class="summary-card">
        <p class="summary-label">Largest dataset</p>
        <p class="summary-value">{{ largestSize() }}</p>
        <small>{{ largestLabel() }}</small>
      </div>
      <div class="summary-actions">
        <button type="button" class="data-btn export" (click)="exportAll()">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
            <polyline points="7 10 12 15 17 10"></polyline>
            <line x1="12" y1="15" x2="12" y2="3"></line>
          </svg>
          Export all data (JSON)
        </button>
        <button type="button" class="data-btn danger" (click)="confirmReset.set(true)">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
            <polyline points="3 6 5 6 21 6"></polyline>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
          </svg>
          Factory reset…
        </button>
      </div>
    </div>

    <div class="data-panel">
      <div class="data-table-wrap">
        <table class="data-table">
          <thead>
            <tr>
              <th>Dataset</th>
              <th>Storage key</th>
              <th>Records</th>
              <th>Size</th>
              <th>Status</th>
              <th class="actions-col">Action</th>
            </tr>
          </thead>
          <tbody>
            @for (dataset of datasets(); track dataset.key) {
              <tr>
                <td><strong>{{ dataset.label }}</strong></td>
                <td><code>{{ dataset.key }}</code></td>
                <td>{{ dataset.exists ? dataset.records : '—' }}</td>
                <td>{{ dataset.exists ? friendlyBytes(dataset.bytes) : '0 B' }}</td>
                <td>
                  @if (dataset.exists) {
                    <span class="state-chip ok">● Active</span>
                  } @else {
                    <span class="state-chip">○ Empty</span>
                  }
                </td>
                <td class="actions-cell">
                  @if (dataset.clearable && dataset.exists) {
                    <button type="button" class="clear-btn" (click)="clearDataset(dataset)" [title]="'Clear ' + dataset.label">
                      Clear
                    </button>
                  } @else {
                    <span class="clear-disabled">—</span>
                  }
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>

      <p class="data-note">
        Clearing a dataset re-seeds it with demo data on the next page load. Export downloads a
        complete JSON snapshot of every <code>neverbeen_*</code> key currently stored.
      </p>
    </div>

    @if (confirmReset()) {
      <div class="modal-backdrop" (click)="confirmReset.set(false)">
        <div class="modal-card" (click)="$event.stopPropagation()" role="dialog" aria-modal="true">
          <h3>Factory reset?</h3>
          <p>
            All NeverBeen data in this browser — members, posts, comments, notifications, auth
            sessions — will be erased and re-seeded with fresh demo data. The page will reload.
          </p>
          <div class="modal-actions">
            <button type="button" class="btn-ghost" (click)="confirmReset.set(false)">Cancel</button>
            <button type="button" class="btn-danger" (click)="factoryReset()">Erase everything</button>
          </div>
        </div>
      </div>
    }

    @if (toast(); as message) {
      <div class="admin-toast" role="status">{{ message }}</div>
    }
  `,
  styleUrl: './data.css',
})
export class AdminData {
  private readonly community = inject(CommunityService);

  protected readonly confirmReset = signal(false);
  protected readonly toast = signal<string | null>(null);

  private static readonly KNOWN: { key: string; label: string; clearable: boolean }[] = [
    { key: COMPANIONS_KEY, label: 'Companion directory', clearable: false },
    { key: JOURNEY_KEY, label: 'Journey posts', clearable: false },
    { key: COMMENTS_KEY, label: 'Conversation threads', clearable: false },
    { key: CIRCLES_KEY, label: 'Community circles', clearable: false },
    { key: NOTIFS_KEY, label: 'Notifications', clearable: true },
    { key: ABUSE_REPORTS_KEY, label: 'Abuse reports', clearable: true },
    { key: HIDDEN_POSTS_KEY, label: 'Hidden posts', clearable: true },
    { key: BLOCKED_USERS_KEY, label: 'Blocked users', clearable: true },
    { key: PROFILE_KEY, label: 'Member profile drafts', clearable: false },
    { key: TOKEN_KEY, label: 'Auth token', clearable: true },
    { key: USER_KEY, label: 'Signed-in user', clearable: true },
    { key: 'neverbeen_admin_session', label: 'Admin session', clearable: true },
  ];

  protected readonly datasets = computed<DatasetRow[]>(() => {
    const usage = new Map(this.community.adminStorageUsage().map((u) => [u.key, u.bytes]));
    const known = new Set(AdminData.KNOWN.map((k) => k.key));
    const rows: DatasetRow[] = [];

    for (const def of AdminData.KNOWN) {
      const bytes = usage.get(def.key) ?? 0;
      rows.push({
        ...def,
        label: def.label,
        records: bytes > 0 ? this.countRecords(def.key) : 0,
        bytes,
        exists: bytes > 0,
      });
    }

    // Surface any extra neverbeen_* keys added by future features.
    for (const [key, bytes] of usage) {
      if (!known.has(key)) {
        rows.push({ key, label: key.replace(/^neverbeen_/, '').replace(/_/g, ' '), records: this.countRecords(key), bytes, clearable: true, exists: true });
      }
    }

    return rows.sort((a, b) => b.bytes - a.bytes);
  });

  protected readonly totalBytes = computed(() => this.datasets().reduce((sum, d) => sum + d.bytes, 0));

  protected readonly largest = computed<DatasetRow | null>(() =>
    this.datasets().reduce<DatasetRow | null>((best, d) => (!best || d.bytes > best.bytes ? d : best), null),
  );

  protected readonly largestSize = computed(() => (this.largest() ? this.friendlyBytes(this.largest()!.bytes) : '—'));

  protected readonly largestLabel = computed(() => (this.largest() ? this.largest()!.label : 'no data stored'));

  friendlyBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  }

  exportAll(): void {
    const json = this.community.adminExportData();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `neverbeen-data-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
    this.showToast('Data exported as JSON.');
  }

  clearDataset(dataset: DatasetRow): void {
    this.community.adminClearDataset(dataset.key);
    this.showToast(`${dataset.label} cleared — reloading to re-seed…`);
    window.setTimeout(() => window.location.reload(), 900);
  }

  factoryReset(): void {
    for (const dataset of this.datasets()) {
      this.community.adminClearDataset(dataset.key);
    }
    window.location.reload();
  }

  private countRecords(key: string): number {
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(key) : null;
    if (!raw) return 0;
    try {
      const parsed: unknown = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed.length;
      if (parsed && typeof parsed === 'object') return Object.keys(parsed).length;
      return 1;
    } catch {
      return 1;
    }
  }

  private showToast(message: string): void {
    this.toast.set(message);
    window.setTimeout(() => {
      if (this.toast() === message) this.toast.set(null);
    }, 2600);
  }
}
