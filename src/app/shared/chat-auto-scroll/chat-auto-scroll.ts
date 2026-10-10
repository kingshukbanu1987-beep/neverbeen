import {
  DestroyRef,
  Directive,
  ElementRef,
  Injector,
  afterNextRender,
  effect,
  inject,
  input,
  runInInjectionContext,
} from '@angular/core';
import type { ChatMessage } from '../../models/community';

/**
 * Keeps a chat window on its latest message (Messenger requirement B):
 *
 *  - when the chat pop-up opens (or comes back from "minimized"), the list starts at the
 *    newest message instead of the top of the history;
 *  - whenever a message arrives — from the companion or from this member — the list scrolls
 *    down to it;
 *  - a profile picture that finishes loading after the scroll cannot leave the newest
 *    message half cut off: the list is pinned to the bottom again.
 *
 * Usage: `<div class="chat-messages-container" [nbChatAutoScroll]="box.messages">…</div>`
 */
@Directive({
  selector: '[nbChatAutoScroll]',
  standalone: true,
})
export class ChatAutoScroll {
  /**
   * The chat's messages; a new message means a new array, which is what re-runs the effect.
   * The input carries the directive's own name so one attribute both applies the directive
   * and hands it the conversation: `[nbChatAutoScroll]="box.messages"`.
   */
  readonly messages = input<readonly ChatMessage[]>([], { alias: 'nbChatAutoScroll' });

  private readonly container = inject(ElementRef<HTMLElement>).nativeElement;
  private readonly destroyRef = inject(DestroyRef);
  private readonly injector = inject(Injector);

  constructor() {
    effect(() => {
      // Reading the input registers the dependency; the scroll itself must wait until the
      // new message is in the DOM, so it happens after the next render. An effect callback is
      // not an injection context on its own, hence the explicit one for afterNextRender.
      this.messages();
      runInInjectionContext(this.injector, () => afterNextRender(() => this.scrollToLatest()));
    });

    // Avatars load asynchronously and grow the list below the scroll position.
    this.container.addEventListener('load', this.onMediaLoaded, true);
    this.destroyRef.onDestroy(() => this.container.removeEventListener('load', this.onMediaLoaded, true));
  }

  /** The newest message at the bottom of the window. */
  scrollToLatest(): void {
    this.container.scrollTop = this.container.scrollHeight;
  }

  private readonly onMediaLoaded = (): void => this.scrollToLatest();
}
