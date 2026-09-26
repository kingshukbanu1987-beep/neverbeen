import { Injectable, signal } from '@angular/core';

/**
 * Tiny root-level bridge for the community header's unread badges.
 *
 * The full CommunityService (and its seeded community data) lives in the lazy
 * community chunks. Keeping the eager site navbar free of it — via this
 * small service — keeps the initial bundle within budget. Community pages
 * push the live unread counts into it; the navbar only ever reads from it.
 */
@Injectable({ providedIn: 'root' })
export class CommunityBadgeService {
  /** Unread notification count (bell icon badge). */
  readonly unreadNotifications = signal(0);
  /** Chats that still hold at least one unread companion message (messenger icon badge). */
  readonly unreadChats = signal(0);

  sync(unreadNotifications: number, unreadChats: number): void {
    this.unreadNotifications.set(unreadNotifications);
    this.unreadChats.set(unreadChats);
  }
}
