import { Injectable, signal } from '@angular/core';

/**
 * Tiny root-level bridge between the lazy CommunityService and the always-mounted site navbar.
 *
 * The full CommunityService (and its seeded community data) lives in the lazy
 * community chunks. Keeping the eager site navbar free of it — via this
 * small service — keeps the initial bundle within budget. Community pages
 * push the live unread counts and sign-in / profile state into it; the navbar
 * only ever reads from it.
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
  /** Whether a member is signed in to the Community; null until CommunityService syncs. */
  readonly signedIn = signal<boolean | null>(null);

  /**
   * Bumped whenever the signed-in member's menu identity changes (profile photo upload,
   * name / profile edit) so the navbar re-reads the stored session immediately instead
   * of waiting for the next navigation or account-menu open.
   */
  readonly profileRevision = signal(0);

  /**
   * Bumped when the lazy CommunityService updates the current device's IP address or
   * login location. The navbar's read-only device row then re-reads the account-scoped
   * device cache without pulling the full community service into the initial bundle.
   */
  readonly deviceRevision = signal(0);

  sync(unreadNotifications: number, unreadChats: number, signedIn?: boolean): void {
    this.unreadNotifications.set(unreadNotifications);
    this.unreadChats.set(unreadChats);
    if (signedIn !== undefined) {
      this.signedIn.set(signedIn);
    }
  }

  /** CommunityService calls this after the member's photo or profile details were saved. */
  bumpProfileRevision(): void {
    this.profileRevision.update((revision) => revision + 1);
  }

  /** CommunityService calls this after device / IP-geolocation details are persisted. */
  bumpDeviceRevision(): void {
    this.deviceRevision.update((revision) => revision + 1);
  }
}
