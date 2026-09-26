import { Injectable, signal } from '@angular/core';

/**
 * Tiny root-level bridge for the community header's unread badges.
 *
 * The full CommunityService (and its seeded community data) lives in the lazy
 * community chunks. Keeping the eager site navbar free of it — via this
 * small service — keeps the initial bundle within budget. Community pages
 * push the live unread counts into it; the navbar only ever reads from it.
 *
 * Counts start at -1 ("not synced yet"): until the lazy CommunityService has
 * pushed a value, consumers may fall back to their own snapshot.
 */
@Injectable({ providedIn: 'root' })
export class CommunityBadgeService {
  /** Unread notification count (bell icon badge); -1 until CommunityService syncs. */
  readonly unreadNotifications = signal(-1);
  /** Chats that still hold at least one unread companion message (messenger icon badge); -1 until synced. */
  readonly unreadChats = signal(-1);

  sync(unreadNotifications: number, unreadChats: number): void {
    this.unreadNotifications.set(unreadNotifications);
    this.unreadChats.set(unreadChats);
  }
}
