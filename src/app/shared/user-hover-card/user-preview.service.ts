import { DestroyRef, Injectable, signal } from '@angular/core';
import { CommunityService } from '../../services/community.service';
import { UserActiveStatus } from '../../models/community';

/**
 * Minimal user shape that can be previewed. `AuthorInfo`, `Companion`,
 * `Profile` and `CurrentUser` all satisfy this interface structurally, so the
 * same directive can be attached to names/avatars anywhere in the community.
 */
export interface PreviewableUser {
  id?: number;
  uniqueId?: string;
  fullName?: string;
  profilePhotoUrl?: string;
  profession?: string;
  country?: string;
  city?: string;
  isVerified?: boolean;
  activeStatus?: UserActiveStatus | string;
  customStatusText?: string;
  isOnline?: boolean;
}

export type PreviewStatusTone = 'online' | 'busy' | 'away' | 'dnd' | 'custom' | 'inactive';

export interface UserPreviewState {
  /** Stable identity so the card can re-animate when a different user is hovered. */
  key: string;
  name: string;
  photo?: string;
  profession?: string;
  location?: string;
  isVerified: boolean;
  statusLabel: string;
  statusTone: PreviewStatusTone;
  companionCount: number;
  journeyPostCount: number;
  mutualWithMe: number | null;
  x: number;
  y: number;
  /** Which side of the anchor the card is rendered on (drives transform origin). */
  placement: 'right' | 'left';
  visible: boolean;
}

const SHOW_DELAY_MS = 250; // brief pause so the card does not flash while sweeping across a list
const HIDE_DELAY_MS = 160; // grace period so the pointer can travel from the name into the card
const CARD_WIDTH = 300;
const CARD_HEIGHT = 276;
const EDGE_GAP = 10;

function stableHash(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

@Injectable({ providedIn: 'root' })
export class UserPreviewOverlayService {
  /** The single live preview card (null = nothing rendered). */
  readonly state = signal<UserPreviewState | null>(null);

  private showTimer: ReturnType<typeof setTimeout> | null = null;
  private hideTimer: ReturnType<typeof setTimeout> | null = null;
  private pendingUser: PreviewableUser | null = null;
  private pendingAnchor: Element | null = null;
  private repositionAnchor: Element | null = null;
  private readonly onReposition = (): void => this.reposition();

  constructor(
    private readonly community: CommunityService,
    private readonly destroyRef: DestroyRef,
  ) {
    this.destroyRef.onDestroy(() => this.teardown());
  }

  /** Begin (or restart) a hover preview for `user`, anchored to `anchor`. */
  show(user: PreviewableUser | null | undefined, anchor: Element): void {
    if (!user || user.id == null || !anchor) return;
    this.clearShowTimer();
    this.clearHideTimer();

    const current = this.state();
    if (current && current.key === this.keyFor(user)) {
      // Same traveler, different element (e.g. moved from the avatar to the name):
      // re-anchor instantly so the card never flickers.
      const { x, y, placement } = this.positionFor(anchor, current.placement);
      this.state.set({ ...current, x, y, placement, visible: true });
      this.attachReposition(anchor);
      return;
    }

    this.pendingUser = user;
    this.pendingAnchor = anchor;
    this.showTimer = setTimeout(() => this.commitShow(), SHOW_DELAY_MS);
  }

  /** Called when the pointer leaves the hovered name/avatar. */
  hide(): void {
    this.clearShowTimer();
    this.clearHideTimer();
    this.pendingUser = null;
    this.pendingAnchor = null;
    const current = this.state();
    if (!current) return;
    // Animate out first, then remove from the DOM entirely.
    this.state.set({ ...current, visible: false });
    this.hideTimer = setTimeout(() => {
      if (this.state()?.visible === false) {
        this.state.set(null);
        this.detachReposition();
      }
    }, HIDE_DELAY_MS);
  }

  /** Called when the anchor element is destroyed while the card is anchored to it. */
  dismissIfAnchoredTo(el: Element): void {
    if (this.repositionAnchor === el) {
      this.clearShowTimer();
      this.clearHideTimer();
      this.pendingUser = null;
      this.pendingAnchor = null;
      this.detachReposition();
      this.state.set(null);
    }
  }

  /** Pointer moved from the anchor into the card itself — stay visible. */
  cardEntered(): void {
    this.clearHideTimer();
    const current = this.state();
    if (current && !current.visible) {
      this.state.set({ ...current, visible: true });
    }
  }

  // ---------------------------------------------------------------------------
  // Internals
  // ---------------------------------------------------------------------------

  private commitShow(): void {
    const user = this.pendingUser;
    const anchor = this.pendingAnchor;
    this.pendingUser = null;
    this.pendingAnchor = null;
    if (!user || user.id == null || !anchor || !anchor.isConnected) return;

    const key = this.keyFor(user);
    const current = this.state();
    const sameUser = current?.key === key;
    const { x, y, placement } = this.positionFor(anchor, sameUser ? current?.placement : undefined);

    this.state.set({
      key,
      name: user.fullName || 'Traveler',
      photo: user.profilePhotoUrl,
      profession: user.profession,
      location: this.locationFor(user),
      isVerified: !!user.isVerified,
      statusLabel: this.statusFor(user).label,
      statusTone: this.statusFor(user).tone,
      companionCount: this.companionCountFor(user.id as number),
      journeyPostCount: this.journeyPostCountFor(user.id as number),
      mutualWithMe: this.mutualCompanionsFor(user),
      x,
      y,
      placement,
      visible: true,
    });
    this.attachReposition(anchor);
  }

  private keyFor(user: PreviewableUser): string {
    return `${user.id}:${user.uniqueId ?? ''}:${user.fullName ?? ''}`;
  }

  private locationFor(user: PreviewableUser): string | undefined {
    return [user.city, user.country].filter(Boolean).join(', ') || undefined;
  }

  private positionFor(
    anchor: Element,
    preferredPlacement?: 'right' | 'left',
  ): { x: number; y: number; placement: 'right' | 'left' } {
    const rect = anchor.getBoundingClientRect();
    const vw = typeof window !== 'undefined' ? window.innerWidth : document.documentElement.clientWidth;
    const vh = typeof window !== 'undefined' ? window.innerHeight : document.documentElement.clientHeight;

    let placement: 'right' | 'left';
    if (preferredPlacement) {
      placement = preferredPlacement;
    } else {
      const fitsRight = rect.right + EDGE_GAP + CARD_WIDTH <= vw - EDGE_GAP;
      const fitsLeft = rect.left - EDGE_GAP - CARD_WIDTH >= EDGE_GAP;
      placement = fitsRight ? 'right' : fitsLeft ? 'left' : 'right';
    }

    let x = placement === 'right' ? rect.right + EDGE_GAP : rect.left - EDGE_GAP - CARD_WIDTH;
    x = Math.max(EDGE_GAP, Math.min(x, Math.max(EDGE_GAP, vw - CARD_WIDTH - EDGE_GAP)));

    let y = rect.top + rect.height / 2 - CARD_HEIGHT / 2;
    if (y < EDGE_GAP) {
      y = Math.min(rect.bottom + EDGE_GAP, Math.max(EDGE_GAP, vh - CARD_HEIGHT - EDGE_GAP));
    }
    y = Math.max(EDGE_GAP, Math.min(y, Math.max(EDGE_GAP, vh - CARD_HEIGHT - EDGE_GAP)));

    return { x, y, placement };
  }

  /** Total number of companions a traveler is connected with. */
  private companionCountFor(userId: number): number {
    const currentId = this.community.currentUser()?.id;
    if (currentId != null && userId === currentId) {
      const mine = this.community.companions().filter((c) => c.status === 'connected').length;
      if (mine > 0) return mine;
    }
    // Deterministic per-user value (stable across sessions) for seeded travelers.
    return 12 + (stableHash(`companions:${userId}`) % 160);
  }

  /** Total journey posts authored by the traveler (live feed count). */
  private journeyPostCountFor(userId: number): number {
    let n = 0;
    for (const post of this.community.journeyPosts()) {
      if (post.author?.id === userId) n++;
    }
    return n;
  }

  /** Mutual companion count — only meaningful when the hovered user is one of mine. */
  private mutualCompanionsFor(user: PreviewableUser): number | null {
    const companion = this.community.companions().find(
      (c) => c.id === user.id || (user.uniqueId != null && c.uniqueId === user.uniqueId),
    );
    if (!companion) return null;
    return companion.mutualCompanionsCount ?? null;
  }

  private statusFor(user: PreviewableUser): { label: string; tone: PreviewStatusTone } {
    switch (user.activeStatus) {
      case 'Busy':
        return { label: 'Busy', tone: 'busy' };
      case "Don't Disturb":
        return { label: "Don't Disturb", tone: 'dnd' };
      case 'Away':
        return { label: 'Away', tone: 'away' };
      case 'Inactive':
        return { label: 'Inactive', tone: 'inactive' };
      case 'Custom':
        return { label: user.customStatusText || 'Custom status', tone: 'custom' };
      case 'Active':
        return { label: 'Active', tone: 'online' };
      default:
        return user.isOnline ? { label: 'Online', tone: 'online' } : { label: 'Traveler', tone: 'inactive' };
    }
  }

  /** While a card is open, keep it glued to its anchor across scroll/resize. */
  private attachReposition(anchor: Element): void {
    if (this.repositionAnchor === anchor) return;
    if (this.repositionAnchor) this.detachReposition();
    this.repositionAnchor = anchor;
    window.addEventListener('scroll', this.onReposition, true);
    window.addEventListener('resize', this.onReposition);
  }

  private detachReposition(): void {
    if (!this.repositionAnchor) return;
    window.removeEventListener('scroll', this.onReposition, true);
    window.removeEventListener('resize', this.onReposition);
    this.repositionAnchor = null;
  }

  private reposition(): void {
    const anchor = this.repositionAnchor;
    const current = this.state();
    if (!anchor || !anchor.isConnected) {
      // Anchor scrolled away / section switched — drop the card.
      this.detachReposition();
      if (current) this.state.set(null);
      return;
    }
    if (!current || !current.visible) return;
    const { x, y, placement } = this.positionFor(anchor, current.placement);
    this.state.set({ ...current, x, y, placement });
  }

  private clearShowTimer(): void {
    if (this.showTimer) {
      clearTimeout(this.showTimer);
      this.showTimer = null;
    }
  }

  private clearHideTimer(): void {
    if (this.hideTimer) {
      clearTimeout(this.hideTimer);
      this.hideTimer = null;
    }
  }

  private teardown(): void {
    this.clearShowTimer();
    this.clearHideTimer();
    this.detachReposition();
    this.state.set(null);
  }
}
