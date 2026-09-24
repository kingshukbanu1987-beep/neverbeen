import { Directive, ElementRef, Input, OnDestroy, inject } from '@angular/core';
import { PreviewableUser, UserPreviewOverlayService } from './user-preview.service';

/**
 * Shows the ultra-modern traveler preview card whenever the pointer hovers the
 * host element (a user's name or picture anywhere in the community). The card
 * disappears automatically when the pointer leaves.
 *
 * Usage:  <strong class="clickable-user" [nbUserPreview]="post.author">…</strong>
 */
@Directive({
  selector: '[nbUserPreview]',
  host: {
    '(mouseenter)': 'onMouseEnter()',
    '(mouseleave)': 'onMouseLeave()',
    '(focusin)': 'onFocusIn()',
    '(focusout)': 'onFocusOut()',
  },
})
export class UserPreviewDirective implements OnDestroy {
  /** The user this element represents (AuthorInfo, Companion, Profile, …). */
  @Input() nbUserPreview: PreviewableUser | null | undefined = null;

  private readonly host = inject(ElementRef<HTMLElement>);
  private readonly overlay = inject(UserPreviewOverlayService);

  onMouseEnter(): void {
    this.overlay.show(this.nbUserPreview, this.host.nativeElement);
  }

  onMouseLeave(): void {
    this.overlay.hide();
  }

  /** Keyboard accessibility: the preview also appears when the element is focused. */
  onFocusIn(): void {
    this.overlay.show(this.nbUserPreview, this.host.nativeElement);
  }

  onFocusOut(): void {
    this.overlay.hide();
  }

  /** The host element was removed (e.g. section switched) — drop a card anchored to it. */
  ngOnDestroy(): void {
    this.overlay.dismissIfAnchoredTo(this.host.nativeElement);
  }
}
