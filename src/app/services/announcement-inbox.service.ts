import { DestroyRef, Injectable, inject, signal } from '@angular/core';
import {
  ANN_CATEGORY_META,
  ANN_PRIORITY_META,
  AnnouncementsService,
  Announcement,
  AudienceProfile,
  matchesAudience,
  statusOf,
} from './announcements.service';

/** Per-member state of announcement notifications, keyed by user id. */
export const ANNOUNCEMENT_INBOX_KEY = 'neverbeen_announcement_inbox';

interface InboxState {
  /** Announcements the member removed from their Notifications list. */
  cleared: string[];
  /** Announcements the member has seen. */
  read: string[];
}

export interface AnnouncementNotice {
  a: Announcement;
  unread: boolean;
  categoryLabel: string;
  categoryIcon: string;
  priorityLabel: string;
  html: string;
  external: boolean;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** Builds the audience profile of the signed-in member from their account + profile. */
export function viewerProfile(
  user: { id: number; isVerified?: boolean; aboutMeDetails?: { gender?: string; dateOfBirth?: string } } | null | undefined,
  profile?: {
    country?: string;
    countryName?: string;
    city?: string;
    cityName?: string;
    gender?: string;
    dateOfBirth?: string;
    isVerified?: boolean;
    aboutMeDetails?: { gender?: string; dateOfBirth?: string };
  } | null,
): AudienceProfile | null {
  if (!user || user.id === undefined || user.id === null) return null;
  const about = profile?.aboutMeDetails ?? user.aboutMeDetails;
  const dobRaw = about?.dateOfBirth || profile?.dateOfBirth;
  const dob = dobRaw ? Date.parse(dobRaw) : NaN;
  return {
    id: Number(user.id),
    country: (profile?.country || profile?.countryName || '').trim(),
    city: (profile?.city || profile?.cityName || '').trim(),
    gender: about?.gender || profile?.gender || '',
    age: Number.isFinite(dob) ? Math.floor((Date.now() - dob) / (365.25 * 86_400_000)) : null,
    isVerified: user.isVerified === true || profile?.isVerified === true,
  };
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/** Announcement body → safe HTML (supports **bold** and line breaks). */
export function noticeHtml(body: string): string {
  return escapeHtml(body)
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\n/g, '<br />');
}

/**
 * Admin announcements in a member's profile → Notifications. Every live (sent,
 * not expired, not ended) announcement whose audience includes the member is
 * listed until the member clears it. New announcements appear automatically:
 * the list is derived from the live announcement store, which is refreshed
 * when another tab (e.g. the Admin Console) publishes, and re-evaluated as
 * scheduled announcements go live.
 */
@Injectable({ providedIn: 'root' })
export class AnnouncementInboxService {
  private readonly announcements = inject(AnnouncementsService);
  readonly state = signal<Record<string, InboxState>>(this.load());

  constructor() {
    if (typeof window === 'undefined') return;
    const onStorage = (e: StorageEvent) => {
      if (e.key === ANNOUNCEMENT_INBOX_KEY) this.state.set(this.load());
    };
    window.addEventListener('storage', onStorage);
    inject(DestroyRef).onDestroy(() => window.removeEventListener('storage', onStorage));
  }

  /** Re-read announcements + inbox state from storage (e.g. when Notifications is opened). */
  refresh(): void {
    this.announcements.resync();
    this.state.set(this.load());
  }

  /** Live announcements for this member, newest first (critical ones on top). */
  noticesFor(viewer: AudienceProfile | null): AnnouncementNotice[] {
    if (!viewer) return [];
    const now = this.announcements.now();
    const st = this.state()[String(viewer.id)] ?? { cleared: [], read: [] };
    const cleared = new Set(st.cleared);
    const read = new Set(st.read);
    return this.announcements
      .items()
      .filter((a) => statusOf(a, now) === 'live' && !cleared.has(a.id) && matchesAudience(a.audience, viewer))
      .sort((a, b) => Number(b.priority === 'critical') - Number(a.priority === 'critical') || Date.parse(b.sendAtUtc) - Date.parse(a.sendAtUtc))
      .map((a) => ({
        a,
        unread: !read.has(a.id),
        categoryLabel: ANN_CATEGORY_META[a.category]?.label ?? a.category,
        categoryIcon: ANN_CATEGORY_META[a.category]?.icon ?? '📣',
        priorityLabel: ANN_PRIORITY_META[a.priority]?.label ?? a.priority,
        html: noticeHtml(a.body),
        external: /^https?:\/\//i.test(a.ctaUrl ?? ''),
      }));
  }

  unreadCount(viewer: AudienceProfile | null): number {
    return this.noticesFor(viewer).filter((n) => n.unread).length;
  }

  markRead(userId: number, ids: string[]): void {
    if (!ids.length) return;
    this.patch(userId, (s) => ({ ...s, read: [...new Set([...s.read, ...ids])] }));
  }

  clear(userId: number, id: string): void {
    this.patch(userId, (s) => ({ ...s, cleared: [...new Set([...s.cleared, id])] }));
  }

  clearAll(userId: number, ids: string[]): void {
    if (!ids.length) return;
    this.patch(userId, (s) => ({ ...s, cleared: [...new Set([...s.cleared, ...ids])] }));
  }

  private patch(userId: number, fn: (s: InboxState) => InboxState): void {
    const key = String(userId);
    this.state.update((all) => ({ ...all, [key]: fn(all[key] ?? { cleared: [], read: [] }) }));
    try {
      localStorage.setItem(ANNOUNCEMENT_INBOX_KEY, JSON.stringify(this.state()));
    } catch {
      /* storage unavailable */
    }
  }

  private load(): Record<string, InboxState> {
    try {
      const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(ANNOUNCEMENT_INBOX_KEY) : null;
      const parsed = raw ? JSON.parse(raw) : null;
      return parsed && typeof parsed === 'object' ? parsed : {};
    } catch {
      return {};
    }
  }
}

/** "25 Sep, 14:05" style timestamp. */
export function noticeTime(iso: string): string {
  const d = new Date(iso);
  return `${d.getDate()} ${MONTHS[d.getMonth()]}, ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}
