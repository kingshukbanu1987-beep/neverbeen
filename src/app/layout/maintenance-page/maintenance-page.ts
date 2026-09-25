import { Component, DestroyRef, computed, inject, input, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { MaintenancePageContent, MaintenanceSchedule, MaintenanceService } from '../../services/maintenance.service';

/**
 * The single page every visitor sees while the website is taken down for a
 * critical release. Content is configured in Admin Console → Site Downtime.
 * Also rendered (embedded) as the live preview in the Admin Console.
 */
@Component({
  selector: 'app-maintenance-page',
  imports: [DatePipe],
  templateUrl: './maintenance-page.html',
  styleUrl: './maintenance-page.css',
  host: { '[class.embedded]': 'embedded()', '[attr.data-theme]': 'page().theme' },
})
export class MaintenancePage {
  private readonly maintenance = inject(MaintenanceService);

  /** Preview overrides (Admin Console); otherwise the configuration in force is used. */
  readonly content = input<MaintenancePageContent | null>(null);
  readonly scheduleOverride = input<MaintenanceSchedule | null>(null, { alias: 'schedule' });
  readonly embedded = input(false);

  protected readonly page = computed(() => this.content() ?? this.maintenance.effective().page);
  protected readonly schedule = computed(() => this.scheduleOverride() ?? this.maintenance.effective().schedule);

  private readonly tick = signal(Date.now());
  protected readonly email = signal('');
  protected readonly subscribed = signal<'idle' | 'ok' | 'invalid'>('idle');
  protected readonly year = new Date().getFullYear();

  constructor() {
    const timer = setInterval(() => this.tick.set(Date.now()), 1000);
    // Tab title while the full-screen page is shown (not in the embedded admin preview).
    let previousTitle: string | null = null;
    queueMicrotask(() => {
      if (this.embedded() || typeof document === 'undefined') return;
      previousTitle = document.title;
      document.title = 'Back soon — NeverBeen';
    });
    inject(DestroyRef).onDestroy(() => {
      clearInterval(timer);
      if (previousTitle !== null) document.title = previousTitle;
    });
  }

  protected readonly remaining = computed(() => {
    const end = this.schedule().endUtc;
    if (!end) return null;
    const ms = Math.max(0, Date.parse(end) - this.tick());
    const s = Math.floor(ms / 1000);
    return { d: Math.floor(s / 86400), h: Math.floor((s % 86400) / 3600), m: Math.floor((s % 3600) / 60), s: s % 60, done: ms === 0 };
  });

  protected readonly progress = computed(() => {
    const { startUtc, endUtc } = this.schedule();
    if (!startUtc || !endUtc) return null;
    const start = Date.parse(startUtc);
    const end = Date.parse(endUtc);
    if (!(end > start)) return null;
    return Math.round(Math.min(1, Math.max(0, (this.tick() - start) / (end - start))) * 100);
  });

  protected pad(n: number): string {
    return String(n).padStart(2, '0');
  }

  protected notify(event: Event): void {
    event.preventDefault();
    if (this.embedded()) {
      this.subscribed.set('ok');
      return;
    }
    this.subscribed.set(this.maintenance.subscribe(this.email()) ? 'ok' : 'invalid');
  }

  protected onEmail(event: Event): void {
    this.email.set((event.target as HTMLInputElement).value);
    this.subscribed.set('idle');
  }
}
