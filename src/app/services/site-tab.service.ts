import { Injectable, signal } from '@angular/core';
import { CommunityBadgeService } from './community-badge.service';

/**
 * Browser tab state for the whole website:
 *
 *  • The tab title is always "NeverBeen" — with the unread community
 *    notification count in brackets in front (e.g. "(3) NeverBeen"),
 *    the way Facebook does it. No route ever gets to rename the tab to a
 *    member/user profile or anything else.
 *  • When there are unread notifications, a small red circle (with the count,
 *    capped at 99) is drawn on top of the website icon in the tab.
 *
 * The unread count comes from CommunityBadgeService (kept live by the lazy
 * CommunityService). Until that service has synced (e.g. the member is on a
 * marketing page and has not opened the Community this session), the
 * notifications are read straight from localStorage. Only a signed-in
 * session (auth cookie present) shows a badge.
 */
const SITE_NAME = 'NeverBeen';
const NOTIFS_STORAGE_KEY = 'neverbeen_notifications';
const TOKEN_COOKIE = 'neverbeen_auth_token';
const FAVICON_URL = 'fav.png';

function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp('(?:^|; )' + name + '=([^;]*)'));
  return match ? decodeURIComponent(match[1]) : null;
}

@Injectable({ providedIn: 'root' })
export class SiteTabService {
  readonly unreadCount = signal(0);

  constructor(private readonly badges: CommunityBadgeService) {
    if (typeof window !== 'undefined') {
      // Another tab changed the notifications → re-check.
      window.addEventListener('storage', () => this.sync());
    }
  }

  /** Recompute title + favicon. Cheap enough to run on every navigation. */
  sync(): void {
    if (typeof document === 'undefined') return;
    const count = this.currentCount();
    this.unreadCount.set(count);
    const label = count > 99 ? '99+' : String(count);
    document.title = count > 0 ? `(${label}) ${SITE_NAME}` : SITE_NAME;
    this.renderFavicon(count);
  }

  private currentCount(): number {
    if (!getCookie(TOKEN_COOKIE)) return 0;
    const live = this.badges.unreadNotifications();
    return live >= 0 ? live : this.snapshotCount();
  }

  private snapshotCount(): number {
    try {
      const raw = localStorage.getItem(NOTIFS_STORAGE_KEY);
      if (!raw) return 0;
      const list = JSON.parse(raw);
      if (!Array.isArray(list)) return 0;
      return list.filter((n) => n && n.isRead === false).length;
    } catch {
      return 0;
    }
  }

  /** Red circle (+ count) over the website icon, or the plain icon at zero. */
  private renderFavicon(count: number): void {
    const link = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
    if (!link) return;
    if (count <= 0) {
      link.href = FAVICON_URL;
      return;
    }

    const img = new Image();
    img.onload = () => {
      try {
        const size = 64;
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.drawImage(img, 0, 0, size, size);

        const cx = size - 14;
        const cy = 14;
        const r = 14;
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.fillStyle = '#e11d48';
        ctx.fill();
        ctx.lineWidth = 4;
        ctx.strokeStyle = '#ffffff';
        ctx.stroke();

        const label = count > 99 ? '' : String(count);
        if (label) {
          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 15px -apple-system, "Segoe UI", Roboto, sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(label, cx, cy + 1);
        }
        // Only swap the icon if this load is still for the latest count.
        if (this.unreadCount() === count) link.href = canvas.toDataURL('image/png');
      } catch {
        /* canvas unavailable — keep the plain icon */
      }
    };
    img.src = FAVICON_URL;
  }
}
