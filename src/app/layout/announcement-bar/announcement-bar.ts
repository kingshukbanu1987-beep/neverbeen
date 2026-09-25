import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SiteConfigService } from '../../services/site-config.service';
import { MaintenanceService } from '../../services/maintenance.service';

const DISMISS_KEY = 'neverbeen_announcement_dismissed';

/**
 * Slim site-wide banner above the navigation. Shows (in priority order) an
 * upcoming scheduled-downtime warning, then the announcement configured in
 * Admin Console → Website Management.
 */
@Component({
  selector: 'app-announcement-bar',
  imports: [RouterLink],
  template: `
    @if (warning(); as w) {
      <div class="ab ab-warning" role="status">
        <span class="ab-icon" aria-hidden="true">🛠️</span>
        <p>
          <strong>Scheduled maintenance</strong> in about {{ w.minutes }} min — NeverBeen will be briefly unavailable from
          {{ time(w.startUtc) }}@if (w.endUtc) {<span> to {{ time(w.endUtc) }}</span>}.
        </p>
      </div>
    } @else if (announcement(); as a) {
      <div [class]="'ab ab-' + a.tone" role="region" aria-label="Announcement">
        <p>
          {{ a.text }}
          @if (a.linkLabel && a.linkUrl) {
            @if (a.external) {
              <a [href]="a.linkUrl" target="_blank" rel="noopener">{{ a.linkLabel }} →</a>
            } @else {
              <a [routerLink]="a.linkUrl">{{ a.linkLabel }} →</a>
            }
          }
        </p>
        @if (a.dismissible) {
          <button type="button" class="ab-close" aria-label="Dismiss announcement" (click)="dismiss(a.signature)">×</button>
        }
      </div>
    }
  `,
  styles: `
    .ab {
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.6rem;
      padding: 0.5rem 2.6rem;
      font-size: 0.86rem;
      line-height: 1.4;
      text-align: center;
      color: #fff;
      background: linear-gradient(90deg, var(--forest-deep, #18241e), var(--bronze, #8c5a32));
    }
    .ab p { margin: 0; }
    .ab a { margin-left: 0.4rem; font-weight: 700; text-decoration: underline; text-underline-offset: 3px; }
    .ab-info { background: linear-gradient(90deg, #1e3a8a, #2563eb); }
    .ab-success { background: linear-gradient(90deg, #065f46, #10b981); }
    .ab-warning { background: linear-gradient(90deg, #92400e, #f59e0b); }
    .ab-icon { font-size: 1rem; }
    .ab-close {
      position: absolute;
      right: 0.6rem;
      top: 50%;
      transform: translateY(-50%);
      width: 28px;
      height: 28px;
      border: 0;
      border-radius: 50%;
      background: rgba(255, 255, 255, 0.16);
      color: inherit;
      font-size: 1.1rem;
      line-height: 1;
      cursor: pointer;
    }
    .ab-close:hover { background: rgba(255, 255, 255, 0.3); }
  `,
})
export class AnnouncementBar {
  private readonly cms = inject(SiteConfigService);
  private readonly maintenance = inject(MaintenanceService);
  private readonly dismissed = signal(this.readDismissed());

  protected readonly warning = this.maintenance.upcomingWarning;

  protected readonly announcement = computed(() => {
    if (!this.cms.flag('global.announcement', 'enabled')) return null;
    const text = this.cms.text('global.announcement', 'text').trim();
    if (!text) return null;
    const linkUrl = this.cms.text('global.announcement', 'linkUrl').trim();
    const signature = `${text}|${linkUrl}`;
    const dismissible = this.cms.flag('global.announcement', 'dismissible');
    if (dismissible && this.dismissed() === signature) return null;
    return {
      text,
      linkLabel: this.cms.text('global.announcement', 'linkLabel').trim(),
      linkUrl,
      external: /^https?:\/\//i.test(linkUrl),
      tone: this.cms.text('global.announcement', 'tone') || 'promo',
      dismissible,
      signature,
    };
  });

  protected time(iso: string): string {
    return new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  }

  protected dismiss(signature: string): void {
    this.dismissed.set(signature);
    try {
      sessionStorage.setItem(DISMISS_KEY, signature);
    } catch {
      /* ignore */
    }
  }

  private readDismissed(): string | null {
    try {
      return sessionStorage.getItem(DISMISS_KEY);
    } catch {
      return null;
    }
  }
}
