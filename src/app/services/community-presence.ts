import type { UserActiveStatus } from '../models/community';

/**
 * Presence rules of the community (Active status, Away and Inactive, and “last seen”).
 *
 *  - Signing in sets the status to Active.
 *  - Signing out sets it to Inactive, whatever status the member had chosen.
 *  - A member who has not used the community for more than 15 minutes is Away
 *    (closing the browser, moving to another tab or app, or sitting idle all count as
 *    not using it). Away is automatic: it overrides the chosen status until the member
 *    uses the community again, and then the chosen status is shown again.
 *  - Away and Inactive always show when the member was last seen.
 *
 * The Web API applies the same rules to the statuses it returns to other members; the
 * browser applies them again so the wording stays fresh between two API reads.
 */

/** A member who has not used the community for longer than this is shown as Away. */
export const PRESENCE_AWAY_AFTER_MS = 15 * 60_000;
/** How often an open page that is in use reports the member's activity to the Web API. */
export const PRESENCE_HEARTBEAT_MS = 60_000;
/** Shortest gap between two activity reports caused by the member's own input. */
export const PRESENCE_INPUT_REPORT_GAP_MS = 30_000;
/** How often the open page re-evaluates Away and the “last seen” wording. */
export const PRESENCE_CLOCK_MS = 30_000;

const KNOWN_STATUSES: readonly string[] = ['Active', 'Busy', "Don't Disturb", 'Away', 'Inactive', 'Custom'];

export interface EffectivePresence {
  /** The status other members see right now. */
  status: UserActiveStatus;
  /** ISO time the member was last using the community, when the API or this browser knows it. */
  lastSeenUtc: string | null;
}

export interface PresenceText {
  /** Full wording, e.g. “Away · last seen 12 min ago”. */
  label: string;
  /** Only the time part, e.g. “12 min ago”; null when the status does not show last seen. */
  lastSeenLabel: string | null;
}

function toMillis(iso: string | null | undefined): number | null {
  if (!iso) return null;
  const ms = Date.parse(iso);
  return Number.isNaN(ms) ? null : ms;
}

/**
 * The status the member chose, as stored. Away is never a choice (it is automatic), so a
 * stored Away reads as Active; a missing or unknown value reads as Active too.
 */
export function chosenPresence(status: string | null | undefined): UserActiveStatus {
  if (!status || status === 'Away' || !KNOWN_STATUSES.includes(status)) return 'Active';
  return status as UserActiveStatus;
}

/**
 * The status to show for a member. `status` is the member's choice, or the status the API
 * already resolved for another member (which may be Away). Inactive and Away are kept as they
 * are; any other status becomes Away once the member's last activity is older than 15 minutes.
 * With no last-seen time the status is kept as it is.
 */
export function effectivePresence(
  status: string | null | undefined,
  lastSeenUtc: string | null | undefined,
  nowMs: number,
): EffectivePresence {
  const lastSeen = lastSeenUtc || null;
  const base: UserActiveStatus = KNOWN_STATUSES.includes(status ?? '') ? (status as UserActiveStatus) : 'Active';
  if (base === 'Inactive' || base === 'Away') return { status: base, lastSeenUtc: lastSeen };
  const seenMs = toMillis(lastSeen);
  if (seenMs !== null && nowMs - seenMs > PRESENCE_AWAY_AFTER_MS) {
    return { status: 'Away', lastSeenUtc: lastSeen };
  }
  return { status: base, lastSeenUtc: lastSeen };
}

/** “just now”, “12 min ago”, “3 h ago”, “yesterday”, “4 days ago”, then a short date. */
export function lastSeenAgo(lastSeenUtc: string | null | undefined, nowMs: number): string | null {
  const seenMs = toMillis(lastSeenUtc);
  if (seenMs === null) return null;
  const minutes = Math.floor(Math.max(0, nowMs - seenMs) / 60_000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'yesterday';
  if (days < 7) return `${days} days ago`;
  return new Date(seenMs).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

/**
 * The wording shown beside a member's status. Away and Inactive always carry a last-seen
 * part (“recently” when the time is not known); the other statuses carry none.
 */
export function presenceText(
  status: UserActiveStatus,
  customText: string | null | undefined,
  lastSeenUtc: string | null | undefined,
  nowMs: number,
): PresenceText {
  const base = status === 'Custom' && customText ? customText : status;
  if (status !== 'Away' && status !== 'Inactive') return { label: base, lastSeenLabel: null };
  const ago = lastSeenAgo(lastSeenUtc, nowMs) ?? 'recently';
  return { label: `${base} · last seen ${ago}`, lastSeenLabel: ago };
}

/**
 * Tracks whether the member is using the community on this page: the page must be visible,
 * the window focused, and the member must have given input (pointer, keyboard, touch, scroll)
 * within the last 15 minutes. Input also proves that the page is in use, so it sets focus.
 */
export class PresenceActivity {
  private lastInputMs: number;
  private visible = true;
  private focused = true;

  constructor(nowMs: number) {
    this.lastInputMs = nowMs;
  }

  noteInput(nowMs: number): void {
    this.lastInputMs = Math.max(this.lastInputMs, nowMs);
    this.focused = true;
  }

  setVisible(visible: boolean): void {
    this.visible = visible;
  }

  setFocused(focused: boolean): void {
    this.focused = focused;
  }

  /** True while the member is using the community on this page. */
  isUsing(nowMs: number): boolean {
    return this.visible && this.focused && nowMs - this.lastInputMs <= PRESENCE_AWAY_AFTER_MS;
  }

  /** The last time the member gave input on this page, never later than `nowMs`. */
  lastActivityAt(nowMs: number): number {
    return Math.min(this.lastInputMs, nowMs);
  }
}
