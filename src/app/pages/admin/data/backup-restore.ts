import { Component, inject, signal } from '@angular/core';
import { AdminDataOpsService, RestorePreview } from '../shared/admin-data-ops.service';
import { AdminInsightsService, timeAgo } from '../shared/admin-insights.service';
import { AdminConfirmDialog } from '../shared/admin-confirm-dialog';
import { formatBytes } from './format';

/** Snapshot backups with SHA-256 checksums, verified restore with diff preview, and factory reset. */
@Component({
  selector: 'app-admin-backup-restore',
  imports: [AdminConfirmDialog],
  styleUrls: ['../shared/admin-grid.css', './data.css'],
  template: `
    <div class="dm-backup-grid">
      <section class="g-panel dm-card">
        <h3>💾 Create backup</h3>
        <p>Downloads a full JSON snapshot of every dataset, signed with a SHA-256 checksum so tampering or corruption is detected on restore.</p>
        <button type="button" class="g-btn dark" [disabled]="busy()" (click)="backup()">{{ busy() ? 'Creating…' : 'Download backup now' }}</button>
      </section>

      <section class="g-panel dm-card">
        <h3>♻️ Restore from backup</h3>
        <p>Upload a NeverBeen backup file. You'll see exactly what changes before anything is written.</p>
        <label class="dm-drop" [class.over]="dragOver()" (dragover)="$event.preventDefault(); dragOver.set(true)" (dragleave)="dragOver.set(false)" (drop)="onDrop($event)">
          <input type="file" accept="application/json,.json" (change)="onFile($event)" />
          <span>⤒ Choose a .json backup or drop it here</span>
        </label>
      </section>
    </div>

    @if (preview(); as p) {
      <section class="g-panel dm-preview">
        @if (!p.valid) {
          <p class="dm-note danger">✕ {{ p.error }}</p>
        } @else {
          <div class="dm-panel-head">
            <div>
              <h3>Restore preview — {{ fileName() }}</h3>
              <p>
                Created {{ p.file?.__meta?.createdUtc ? timeAgo(p.file!.__meta.createdUtc) : 'unknown' }} ·
                {{ p.file?.__meta?.records?.toLocaleString() }} records ·
                @if (p.checksumOk) {
                  <span class="dm-ok-text">✓ checksum verified</span>
                } @else {
                  <span class="dm-danger-text">⚠ checksum mismatch — file was modified</span>
                }
              </p>
            </div>
            <button type="button" class="g-link-btn" (click)="preview.set(null)">Discard</button>
          </div>
          <div class="g-table-wrap">
            <table class="g-table compact">
              <thead>
                <tr><th>Dataset</th><th style="text-align: right">Current</th><th style="text-align: right">In backup</th><th style="text-align: right">Change</th></tr>
              </thead>
              <tbody>
                @for (r of p.rows; track r.key) {
                  <tr>
                    <td>{{ r.label }}</td>
                    <td style="text-align: right">{{ r.current }}</td>
                    <td style="text-align: right">{{ r.incoming }}</td>
                    <td style="text-align: right" [class.dm-ok-text]="r.incoming > r.current" [class.dm-danger-text]="r.incoming < r.current">
                      {{ r.incoming === r.current ? '—' : (r.incoming > r.current ? '+' : '') + (r.incoming - r.current) }}
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
          <div class="dm-restore-actions">
            <label><input type="checkbox" [checked]="safety()" (change)="safety.set($any($event.target).checked)" /> Download a safety backup of the current data first</label>
            <button type="button" class="g-btn danger" (click)="confirmRestore.set(true)">Restore this backup</button>
          </div>
        }
      </section>
    }

    <section class="g-panel" style="margin-top: 1rem">
      <div class="dm-panel-head">
        <div>
          <h3>Backup history</h3>
          <p>The last 30 backups created from this console.</p>
        </div>
      </div>
      <div class="g-table-wrap">
        <table class="g-table compact">
          <thead>
            <tr><th>File</th><th>Type</th><th>Created</th><th style="text-align: right">Records</th><th style="text-align: right">Size</th><th>Checksum (SHA-256)</th></tr>
          </thead>
          <tbody>
            @for (b of backups(); track b.id) {
              <tr>
                <td><code>{{ b.name }}</code></td>
                <td><span class="g-badge" [class.warn]="b.kind === 'safety'" [class.info]="b.kind === 'manual'">{{ b.kind === 'safety' ? 'Safety' : 'Manual' }}</span></td>
                <td class="g-nowrap">{{ timeAgo(b.createdUtc) }}</td>
                <td style="text-align: right">{{ b.records.toLocaleString() }}</td>
                <td style="text-align: right" class="g-nowrap">{{ fmt(b.bytes) }}</td>
                <td><code [title]="b.checksum">{{ b.checksum.slice(0, 16) }}…</code></td>
              </tr>
            } @empty {
              <tr><td colspan="6" class="g-empty">No backups yet — create your first one above.</td></tr>
            }
          </tbody>
        </table>
      </div>
    </section>

    <section class="g-panel dm-danger-zone">
      <div>
        <h3>Danger zone — factory reset</h3>
        <p>Deletes every saved NeverBeen dataset in this browser and reloads the original seed data. Your admin session is kept.</p>
      </div>
      <button type="button" class="g-btn danger" (click)="confirmReset.set(true)">Factory reset…</button>
    </section>

    @if (confirmRestore()) {
      <app-admin-confirm-dialog
        heading="Restore backup?"
        message="Current data will be replaced with the backup and the console will reload."
        confirmLabel="Restore now"
        [withReason]="false"
        (confirmed)="restore()"
        (cancelled)="confirmRestore.set(false)"
      />
    }
    @if (confirmReset()) {
      <app-admin-confirm-dialog
        heading="Factory reset all data?"
        message="Every saved change (posts, comments, moderation, roles, notes, privacy requests…) is removed permanently. Create a backup first if unsure."
        confirmLabel="Reset everything"
        [withReason]="false"
        (confirmed)="reset()"
        (cancelled)="confirmReset.set(false)"
      />
    }
  `,
})
export class AdminBackupRestore {
  private readonly dataOps = inject(AdminDataOpsService);
  private readonly insights = inject(AdminInsightsService);

  protected readonly backups = this.dataOps.backups;
  protected readonly timeAgo = timeAgo;
  protected readonly fmt = formatBytes;
  protected readonly busy = signal(false);
  protected readonly preview = signal<RestorePreview | null>(null);
  protected readonly fileName = signal('');
  protected readonly safety = signal(true);
  protected readonly dragOver = signal(false);
  protected readonly confirmRestore = signal(false);
  protected readonly confirmReset = signal(false);

  protected async backup(): Promise<void> {
    this.busy.set(true);
    try {
      const b = await this.dataOps.createBackup('manual');
      this.insights.notify(`Backup downloaded — ${b.records.toLocaleString()} records.`);
    } finally {
      this.busy.set(false);
    }
  }

  protected onFile(e: Event): void {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (file) void this.load(file);
    (e.target as HTMLInputElement).value = '';
  }

  protected onDrop(e: DragEvent): void {
    e.preventDefault();
    this.dragOver.set(false);
    const file = e.dataTransfer?.files?.[0];
    if (file) void this.load(file);
  }

  async load(file: File): Promise<void> {
    this.fileName.set(file.name);
    this.preview.set(await this.dataOps.previewRestore(await file.text()));
  }

  protected async restore(): Promise<void> {
    const file = this.preview()?.file;
    this.confirmRestore.set(false);
    if (!file) return;
    if (this.safety()) await this.dataOps.createBackup('safety');
    this.dataOps.applyRestore(file);
    this.insights.notify('Backup restored — reloading…');
  }

  protected reset(): void {
    this.confirmReset.set(false);
    this.dataOps.factoryReset();
  }
}
