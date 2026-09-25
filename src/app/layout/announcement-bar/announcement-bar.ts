import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SiteConfigService } from '../../services/site-config.service';
import { MaintenanceService } from '../../services/maintenance.service';
import { ANN_CATEGORY_META, AnnouncementsService, AudienceProfile } from '../../services/announcements.service';
import { NavigationEnd, Router } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { filter, map, merge, fromEvent, of } from 'rxjs';

// Read the signed-in community member straight from storage (same keys as CommunityService)
// so the site banner doesn't pull the large community dataset into the initial bundle.
const USER_KEY = 'neverbeen_current_user';
const PROFILE_KEY = 'neverbeen_user_profile';

interface StoredMember {
  id?: number | string;
  country?: string;
  countryName?: string;
  city?: string;
  cityName?: string;
  isVerified?: boolean;
  aboutMeDetails?: { gender?: string; dateOfBirth?: string };
}

function readJson(key: string): StoredMember | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as StoredMember) : null;
  } catch {
    return null;
  }
}

/** Current visitor's targeting profile, or null when signed out. */
export function storedViewer(): AudienceProfile | null {
  const u = readJson(USER_KEY);
  if (!u || u.id === undefined || u.id === null) return null;
  const p = readJson(PROFILE_KEY) ?? {};
  const about = p.aboutMeDetails ?? u.aboutMeDetails;
  const dob = about?.dateOfBirth ? Date.parse(about.dateOfBirth) : NaN;
  return {
    id: Number(u.id),
    country: (p.country || p.countryName || u.country || '').trim(),
    city: (p.city || p.cityName || u.city || '').trim(),
    gender: about?.gender ?? '',
    age: Number.isFinite(dob) ? Math.floor((Date.now() - dob) / (365.25 * 86_400_000)) : null,
    isVerified: u.isVerified === true || p.isVerified === true,
  };
}

const DISMISS_KEY = 'neverbeen_announcement_dismissed';

/**
 * Slim site-wide banner above the navigation. Shows (in priority order) an
 * upcoming scheduled-downtime warning, then a live Admin Console → Announcement
 * (In-app banner channel) addressed to this visitor, then the announcement
 * configured in Admin Console → Website Management.
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
    } @else if (adminNotice(); as n) {
      <div [class]="'ab ab-admin ab-' + n.tone" [class.ab-critical]="n.a.priority === 'critical'" role="region" aria-label="Announcement from NeverBeen">
        <p>
          <span class="ab-icon" aria-hidden="true">{{ n.icon }}</span>
          <strong>{{ n.a.title }}</strong>
          <span class="ab-text"> — {{ n.text }}</span>
          @if (n.a.ctaLabel && n.a.ctaUrl) {
            @if (n.external) {
              <a [href]="n.a.ctaUrl" target="_blank" rel="noopener">{{ n.a.ctaLabel }} →</a>
            } @else {
              <a [routerLink]="n.a.ctaUrl">{{ n.a.ctaLabel }} →</a>
            }
          }
        </p>
        <button type="button" class="ab-close" aria-label="Dismiss announcement" (click)="announcements.dismiss(n.a.id)">×</button>
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
    .ab-admin.ab-danger, .ab-critical { background: linear-gradient(90deg, #991b1b, #ef4444); }
    .ab-admin.ab-violet { background: linear-gradient(90deg, #4c1d95, #8b5cf6); }
    .ab-admin.ab-ok { background: linear-gradient(90deg, #065f46, #10b981); }
    .ab-admin.ab-warn { background: linear-gradient(90deg, #92400e, #f59e0b); }
    .ab-admin .ab-icon { margin-right: 0.3rem; }
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

  protected readonly announcements = inject(AnnouncementsService);
  private readonly router = inject(Router);

  protected readonly warning = this.maintenance.upcomingWarning;

  /** Who is looking at the site — refreshed on navigation / other tabs signing in or out. */
  private readonly viewer = toSignal(
    merge(
      of(null),
      this.router.events.pipe(filter((e) => e instanceof NavigationEnd)),
      typeof window !== 'undefined' ? fromEvent(window, 'storage') : of(null),
    ).pipe(map(() => storedViewer())),
    { initialValue: null },
  );

  /** Live admin announcement (banner channel) for this visitor. */
  protected readonly adminNotice = computed(() => {
    const a = this.announcements.forViewer(this.viewer())[0];
    if (!a) return null;
    const meta = ANN_CATEGORY_META[a.category];
    return {
      a,
      icon: meta.icon,
      tone: a.priority === 'critical' ? 'danger' : meta.tone || 'info',
      text: a.body.replace(/\*\*(.+?)\*\*/g, '$1'),
      external: /^https?:\/\//i.test(a.ctaUrl ?? ''),
    };
  });

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
