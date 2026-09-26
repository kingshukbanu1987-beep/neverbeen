import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import {
  MAINTENANCE_TEMPLATES,
  MAINTENANCE_THEMES,
  MaintenancePageContent,
  MaintenanceSchedule,
  MaintenanceService,
  MaintenanceTemplate,
  MaintenanceTheme,
} from '../../../services/maintenance.service';
import { AdminAuditService, AuditCategory } from '../../../services/admin-audit.service';
import { AdminInsightsService, downloadCsv } from '../shared/admin-insights.service';
import { downloadJson } from '../shared/admin-data-ops.service';
import { AdminConfirmDialog } from '../shared/admin-confirm-dialog';
import { AdminAuditLog } from '../shared/admin-audit-log';
import { MaintenancePage } from '../../../layout/maintenance-page/maintenance-page';
import { SelectValueSync } from '../../../shared/select-value-sync';

type StartMode = 'now' | 'at';
type EndMode = 'duration' | 'at' | 'manual';
type PageToggle = 'showLogo' | 'showCountdown' | 'showProgress' | 'showUpdates' | 'showContact' | 'showNotify';

/** yyyy-MM-ddTHH:mm in local time, for <input type="datetime-local">. */
export function toLocalInput(ms: number): string {
  const d = new Date(ms);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

export function formatDuration(ms: number): string {
  const m = Math.max(0, Math.round(ms / 60_000));
  const d = Math.floor(m / 1440);
  const h = Math.floor((m % 1440) / 60);
  const mm = m % 60;
  return [d && `${d}d`, h && `${h}h`, (mm || (!d && !h)) && `${mm}m`].filter(Boolean).join(' ');
}

/**
 * Admin > Site Downtime — take the entire public website down for a critical
 * release, now or in a scheduled window, and design the single page visitors
 * see in the meantime. /admin and /login always stay reachable.
 */
@Component({
  selector: 'app-admin-maintenance',
  imports: [SelectValueSync, DatePipe, RouterLink, AdminConfirmDialog, AdminAuditLog, MaintenancePage],
  styleUrls: ['../shared/admin-grid.css', '../website/website.css', './maintenance.css'],
  templateUrl: './maintenance.html',
})
export class AdminMaintenance {
  protected readonly maintenance = inject(MaintenanceService);
  private readonly audit = inject(AdminAuditService);
  private readonly insights = inject(AdminInsightsService);

  protected readonly templates = Object.entries(MAINTENANCE_TEMPLATES).map(([key, v]) => ({ key: key as MaintenanceTemplate, ...v }));
  protected readonly themes = Object.entries(MAINTENANCE_THEMES).map(([key, v]) => ({ key: key as MaintenanceTheme, ...v }));
  protected readonly durations = [15, 30, 60, 120, 240, 480, 1440];
  protected readonly warnOptions = [
    { value: 0, label: 'No warning' },
    { value: 15, label: '15 min before' },
    { value: 60, label: '1 hour before' },
    { value: 240, label: '4 hours before' },
    { value: 1440, label: '1 day before' },
  ];
  protected readonly toggles: { key: PageToggle; label: string; hint: string }[] = [
    { key: 'showLogo', label: 'Website logo', hint: 'NeverBeen logo at the top' },
    { key: 'showCountdown', label: 'Countdown', hint: 'Live timer to the end of the window' },
    { key: 'showProgress', label: 'Progress bar', hint: 'Share of the window elapsed' },
    { key: 'showUpdates', label: 'Status updates', hint: 'Timeline of the notes you post' },
    { key: 'showNotify', label: '“Notify me” form', hint: 'Collect emails of waiting visitors' },
    { key: 'showContact', label: 'Contact email', hint: 'For urgent enquiries' },
  ];
  protected readonly auditCategories: AuditCategory[] = ['operations'];
  protected readonly formatDuration = formatDuration;

  // ------------------------------------------------------------------ live clock
  protected readonly now = signal(Date.now());

  constructor() {
    const t = setInterval(() => this.now.set(Date.now()), 1000);
    inject(DestroyRef).onDestroy(() => clearInterval(t));
  }

  // ------------------------------------------------------------------ state
  protected readonly state = this.maintenance.state;
  protected readonly page = computed(() => this.state().page);
  protected readonly schedule = computed(() => this.state().schedule);
  protected readonly status = this.maintenance.status;
  protected readonly localTz = Intl.DateTimeFormat().resolvedOptions().timeZone;

  // ------------------------------------------------------------------ timeframe form
  protected readonly startMode = signal<StartMode>('now');
  protected readonly startAt = signal(toLocalInput(Date.now() + 60 * 60_000));
  protected readonly endMode = signal<EndMode>('duration');
  protected readonly durationMin = signal(60);
  protected readonly endAt = signal(toLocalInput(Date.now() + 3 * 60 * 60_000));
  protected readonly reason = signal('');
  protected readonly warnBefore = signal(60);

  protected readonly window = computed(() => {
    const now = this.now();
    const start = this.startMode() === 'now' ? now : Date.parse(this.startAt());
    let end: number | null = null;
    if (this.endMode() === 'duration') end = start + this.durationMin() * 60_000;
    else if (this.endMode() === 'at') end = Date.parse(this.endAt());
    const errors: string[] = [];
    if (Number.isNaN(start)) errors.push('Choose a valid start time.');
    else if (this.startMode() === 'at' && start <= now) errors.push('The scheduled start must be in the future.');
    if (end !== null && Number.isNaN(end)) errors.push('Choose a valid end time.');
    else if (end !== null && end <= start) errors.push('The end must be after the start.');
    if (this.endMode() === 'duration' && !(this.durationMin() >= 1)) errors.push('Duration must be at least 1 minute.');
    return { start, end, errors };
  });

  /** Schedule used by the preview: the armed window, or the one being prepared. */
  protected readonly previewSchedule = computed<MaintenanceSchedule>(() => {
    const s = this.schedule();
    if (s.enabled && this.status() !== 'live') return s;
    const w = this.window();
    const start = Number.isNaN(w.start) ? Date.now() : w.start;
    return { enabled: true, startUtc: new Date(start).toISOString(), endUtc: w.end && !Number.isNaN(w.end) ? new Date(w.end).toISOString() : null, reason: '', warnBeforeMinutes: 0 };
  });

  protected readonly countdown = computed(() => {
    const s = this.schedule();
    const now = this.now();
    if (this.status() === 'down') return s.endUtc ? { label: 'Back online in', value: formatDuration(Date.parse(s.endUtc) - now) } : { label: 'Down for', value: formatDuration(now - Date.parse(s.startUtc ?? new Date().toISOString())) };
    if (this.status() === 'scheduled' && s.startUtc) return { label: 'Goes down in', value: formatDuration(Date.parse(s.startUtc) - now) };
    return null;
  });

  protected readonly elapsedPct = computed(() => {
    const s = this.schedule();
    if (this.status() !== 'down' || !s.startUtc || !s.endUtc) return null;
    const a = Date.parse(s.startUtc);
    const b = Date.parse(s.endUtc);
    return Math.round(Math.min(1, Math.max(0, (this.now() - a) / (b - a))) * 100);
  });

  // ------------------------------------------------------------------ site-wide file
  protected readonly remoteStatus = computed(() => {
    const checked = this.maintenance.remoteChecked();
    const r = this.maintenance.remote();
    if (checked === 'pending') return { tone: 'info', text: 'Checking the deployed maintenance.json…' };
    if (checked === 'absent' || !r) return { tone: 'warn', text: 'No maintenance.json is deployed — downtime currently applies to this browser only.' };
    const live = r.schedule.enabled && (!r.schedule.endUtc || Date.parse(r.schedule.endUtc) > this.now());
    return live
      ? { tone: 'danger', text: `Deployed maintenance.json takes the site down${r.schedule.endUtc ? ' until ' + new Date(r.schedule.endUtc).toLocaleString() : ''}.` }
      : { tone: 'ok', text: 'Deployed maintenance.json found — it currently keeps the site online.' };
  });

  protected readonly history = this.maintenance.history;
  protected readonly subscribers = computed(() => this.state().subscribers);

  // ------------------------------------------------------------------ dialogs
  protected readonly confirm = signal<null | 'down' | 'schedule' | 'end' | 'cancel'>(null);
  protected readonly newUpdate = signal('');

  protected confirmHeading(kind: 'down' | 'schedule' | 'end' | 'cancel'): string {
    return { down: 'Take the website down now?', schedule: 'Schedule the downtime?', end: 'Bring the website back online?', cancel: 'Cancel the scheduled downtime?' }[kind];
  }

  protected confirmMessage(kind: 'down' | 'schedule' | 'end' | 'cancel'): string {
    const w = this.window();
    const until = w.end ? `until ${new Date(w.end).toLocaleString()} (${formatDuration(w.end - w.start)})` : 'until you bring it back manually';
    switch (kind) {
      case 'down':
        return `Every visitor will immediately see only the maintenance page ${until}. The Admin Console and sign-in stay available.`;
      case 'schedule':
        return `The website goes down at ${new Date(w.start).toLocaleString()} and stays down ${until}.${this.warnBefore() ? ' Visitors see a warning banner beforehand.' : ''}`;
      case 'end':
        return 'The maintenance page is removed and visitors get the full website back immediately.';
      case 'cancel':
        return 'The scheduled window is removed; the website stays online.';
    }
  }

  protected requestArm(): void {
    if (this.window().errors.length) return;
    this.confirm.set(this.startMode() === 'now' ? 'down' : 'schedule');
  }

  protected runConfirm(): void {
    const kind = this.confirm();
    this.confirm.set(null);
    if (!kind) return;
    const w = this.window();
    if (kind === 'down' || kind === 'schedule') {
      const startIso = kind === 'down' ? null : new Date(w.start).toISOString();
      const endIso = w.end ? new Date(kind === 'down' ? Date.now() + (w.end - w.start) : w.end).toISOString() : null;
      this.maintenance.schedule(startIso, endIso, this.reason(), kind === 'down' ? 0 : this.warnBefore());
      this.audit.log({
        category: 'operations',
        action: kind === 'down' ? 'Website taken down' : 'Downtime scheduled',
        targetLabel: this.page().title,
        details: `${kind === 'down' ? 'Now' : new Date(w.start).toLocaleString()} → ${endIso ? new Date(endIso).toLocaleString() : 'manual end'}${this.reason() ? ' · ' + this.reason() : ''}`,
      });
      this.insights.notify(kind === 'down' ? 'The website is now DOWN for visitors.' : 'Downtime scheduled.');
    } else {
      const wasDown = this.status() === 'down';
      this.maintenance.end();
      this.audit.log({ category: 'operations', action: wasDown ? 'Website brought back online' : 'Scheduled downtime cancelled' });
      this.insights.notify(wasDown ? 'The website is back online.' : 'Scheduled downtime cancelled.');
    }
  }

  protected extend(minutes: number): void {
    this.maintenance.extend(minutes);
    this.audit.log({ category: 'operations', action: 'Downtime extended', details: `+${formatDuration(minutes * 60_000)}` });
    this.insights.notify(`Downtime extended by ${formatDuration(minutes * 60_000)}.`);
  }

  // ------------------------------------------------------------------ page content
  protected applyTemplate(t: MaintenanceTemplate): void {
    this.maintenance.applyTemplate(t);
  }

  protected updatePage<K extends keyof MaintenancePageContent>(key: K, value: MaintenancePageContent[K]): void {
    this.maintenance.updatePage({ [key]: value, ...(key === 'title' || key === 'message' ? { template: 'custom' as const } : {}) } as Partial<MaintenancePageContent>);
  }

  protected postUpdate(): void {
    const text = this.newUpdate().trim();
    if (!text) return;
    this.maintenance.addUpdate(text);
    this.newUpdate.set('');
    this.audit.log({ category: 'operations', action: 'Status update posted', details: text });
  }

  // ------------------------------------------------------------------ files
  protected downloadFile(): void {
    downloadJson('maintenance.json', this.maintenance.exportFile());
    this.audit.log({ category: 'operations', action: 'maintenance.json downloaded', details: this.status() });
  }

  protected async copyFile(): Promise<void> {
    try {
      await navigator.clipboard.writeText(JSON.stringify(this.maintenance.exportFile(), null, 2));
      this.insights.notify('maintenance.json copied to the clipboard.');
    } catch {
      this.insights.notify('Copy failed — use Download instead.');
    }
  }

  protected exportSubscribers(): void {
    downloadCsv('neverbeen-downtime-subscribers.csv', ['Email', 'Subscribed (UTC)'], this.subscribers().map((s) => [s.email, s.atUtc]));
  }

  protected clearSubscribers(): void {
    this.maintenance.clearSubscribers();
    this.insights.notify('Subscriber list cleared.');
  }

  protected durationOf(h: { startUtc: string; endUtc: string | null }): string {
    return h.endUtc ? formatDuration(Date.parse(h.endUtc) - Date.parse(h.startUtc)) : 'Open-ended';
  }
}
