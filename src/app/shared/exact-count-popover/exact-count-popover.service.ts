import { DestroyRef, Injectable, inject, signal } from '@angular/core';
import { exactCount } from './count-format';

/** The pop-up showing one counter's exact value. */
export interface ExactCountPopoverState {
  /** The counter button the pop-up belongs to — compared by identity, so it closes with its number. */
  anchor: Element;
  /** The exact figure, grouped for reading, e.g. `21,400`. */
  exact: string;
  /** What the figure counts, e.g. `Seen for Fiadh Dara` — the pop-up's accessible name. */
  description: string;
  /** Viewport x of the pop-up's centre, on the anchor's centre line. */
  x: number;
  /** Viewport y the pop-up is pinned to: the anchor's top edge, or its bottom edge when `below`. */
  y: number;
  /** True when there is no room above the number, so the pop-up opens under it instead. */
  below: boolean;
}

/** The pop-up closes itself after this long if the visitor does nothing. */
const AUTO_CLOSE_MS = 5000;
/** Clearance between the number and the pop-up. */
const GAP = 12;
/** The pop-up's height, used only to decide whether it fits above the number. */
const CARD_HEIGHT = 62;
/** How far the pop-up's centre stays from the window's edges. */
const EDGE = 96;

/**
 * The one exact-count pop-up of a page: the small rounded card a big counter opens to reveal its
 * exact figure. It closes itself when the visitor clicks anywhere else, presses Escape, scrolls
 * the number out of reach, or simply leaves it alone for five seconds.
 *
 * The pop-up itself is rendered by `ExactCountPopover`; this service owns where it sits and when
 * it goes away.
 */
@Injectable({ providedIn: 'root' })
export class ExactCountPopoverService {
  private readonly stateSignal = signal<ExactCountPopoverState | null>(null);
  /** The live pop-up, or null while it is closed. */
  readonly state = this.stateSignal.asReadonly();

  private timer: ReturnType<typeof setTimeout> | null = null;
  private listening = false;

  private readonly onPointerDown = (event: Event): void => {
    const current = this.stateSignal();
    const target = event.target as Element | null;
    if (!current || !target) return;
    // Clicking the pop-up itself keeps it open; clicking its own number toggles it closed.
    if (typeof target.closest === 'function' && target.closest('.ecp-card')) return;
    if (current.anchor === target || current.anchor.contains(target)) return;
    this.close();
  };

  private readonly onKeydown = (event: KeyboardEvent): void => {
    if (event.key === 'Escape') this.close();
  };

  private readonly onViewportChange = (): void => {
    const current = this.stateSignal();
    if (!current) return;
    if (!current.anchor.isConnected) {
      this.close();
      return;
    }
    this.stateSignal.set({ ...current, ...this.spotFor(current.anchor) });
  };

  constructor() {
    inject(DestroyRef).onDestroy(() => this.teardown());
  }

  /**
   * Opens the exact figure for a counter — or closes it again when its own number is clicked
   * twice. The pop-up closes itself after five seconds.
   */
  toggle(anchor: Element, count: { value: number; description: string }): void {
    if (this.stateSignal()?.anchor === anchor) {
      this.close();
      return;
    }

    this.stateSignal.set({
      anchor,
      exact: exactCount(count.value),
      description: count.description,
      ...this.spotFor(anchor),
    });
    this.listen();
    this.restartTimer();
  }

  /** Closes the pop-up, if one is open. */
  close(): void {
    if (!this.stateSignal()) return;
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    this.stateSignal.set(null);
    this.stopListening();
  }

  /** Whether the pop-up currently belongs to `anchor` — a counter's own "is my pop-up open?". */
  isOpenFor(anchor: Element): boolean {
    return this.stateSignal()?.anchor === anchor;
  }

  // ------------------------------------------------------------------------------ internals

  private spotFor(anchor: Element): Pick<ExactCountPopoverState, 'x' | 'y' | 'below'> {
    const rect = anchor.getBoundingClientRect();
    const width = typeof window === 'undefined' ? 0 : window.innerWidth;
    const centre = rect.left + rect.width / 2;
    // Keep the card's centre clear of the window's edges — but only when the width is known.
    const x =
      width > EDGE * 2 ? Math.max(EDGE, Math.min(centre, width - EDGE)) : Math.max(0, centre);
    // Open downwards when the number sits too close to the top of the window for the card.
    const below = rect.top - GAP - CARD_HEIGHT < 0;
    return { x, y: below ? rect.bottom + GAP : rect.top - GAP, below };
  }

  private restartTimer(): void {
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => this.close(), AUTO_CLOSE_MS);
  }

  private listen(): void {
    if (this.listening || typeof document === 'undefined') return;
    this.listening = true;
    // Capture phase, so the pop-up closes before the click reaches whatever it landed on.
    document.addEventListener('pointerdown', this.onPointerDown, true);
    document.addEventListener('keydown', this.onKeydown, true);
    window.addEventListener('scroll', this.onViewportChange, true);
    window.addEventListener('resize', this.onViewportChange);
  }

  private stopListening(): void {
    if (!this.listening) return;
    this.listening = false;
    document.removeEventListener('pointerdown', this.onPointerDown, true);
    document.removeEventListener('keydown', this.onKeydown, true);
    window.removeEventListener('scroll', this.onViewportChange, true);
    window.removeEventListener('resize', this.onViewportChange);
  }

  private teardown(): void {
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
    this.stateSignal.set(null);
    this.stopListening();
  }
}
