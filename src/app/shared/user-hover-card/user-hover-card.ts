import { Component, ElementRef, effect, inject, viewChild } from '@angular/core';
import { UserPreviewOverlayService } from './user-preview.service';

/**
 * The single global traveler preview card. Mounted once in the app shell; it
 * renders only while `UserPreviewOverlayService.state` holds a live preview.
 */
@Component({
  selector: 'app-user-hover-card',
  imports: [],
  templateUrl: './user-hover-card.html',
  styleUrl: './user-hover-card.css',
  host: {
    'class': 'uhc-host',
  },
})
export class UserHoverCard {
  private readonly overlay = inject(UserPreviewOverlayService);

  protected readonly state = this.overlay.state;

  protected readonly defaultAvatar =
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80';

  private readonly cardEl = viewChild<ElementRef<HTMLDivElement>>('cardEl');
  private lastKey: string | null = null;
  private cardHasAnimated = false;

  /** Replay the pop-in animation when the pointer moves to a different traveler. */
  constructor() {
    effect(() => {
      const s = this.state();
      if (!s) {
        this.lastKey = null;
        this.cardHasAnimated = false;
        return;
      }
      const el = this.cardEl()?.nativeElement;
      if (s.key !== this.lastKey) {
        this.lastKey = s.key;
        if (el && this.cardHasAnimated) {
          // User switched while the card was open: restart the entrance animation.
          el.classList.add('uhc-replay');
          void el.offsetWidth; // force reflow so the animation restarts
          el.classList.remove('uhc-replay');
        }
        this.cardHasAnimated = true;
      }
    });
  }

  onCardEnter(): void {
    this.overlay.cardEntered();
  }

  onCardLeave(): void {
    this.overlay.hide();
  }
}
