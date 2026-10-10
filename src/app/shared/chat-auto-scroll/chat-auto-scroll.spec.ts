import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { ChatAutoScroll } from './chat-auto-scroll';
import type { ChatMessage } from '../../models/community';

let nextId = 1;

function message(text: string, sentAtUtc = new Date().toISOString()): ChatMessage {
  return {
    id: nextId++,
    senderId: 2,
    receiverId: 1,
    text,
    sentAtUtc,
  };
}

@Component({
  selector: 'app-chat-host',
  standalone: true,
  imports: [ChatAutoScroll],
  template: `
    <div class="chat-messages-container" [nbChatAutoScroll]="messages()">
      @for (m of messages(); track m.id) {
        <p>{{ m.text }}</p>
      }
    </div>
  `,
})
class ChatHost {
  readonly messages = signal<ChatMessage[]>([message('first')]);
}

/** jsdom never lays text out, so the height of the message list has to be given to it. */
function withListHeight<T>(height: number, run: () => T): T {
  const original = Object.getOwnPropertyDescriptor(Element.prototype, 'scrollHeight');
  Object.defineProperty(Element.prototype, 'scrollHeight', { configurable: true, get: () => height });
  try {
    return run();
  } finally {
    if (original) Object.defineProperty(Element.prototype, 'scrollHeight', original);
    else delete (Element.prototype as unknown as Record<string, unknown>)['scrollHeight'];
  }
}

describe('ChatAutoScroll', () => {
  beforeEach(() => {
    nextId = 1;
    TestBed.configureTestingModule({ imports: [ChatHost] });
  });

  /** Opens the chat window over a list `height` pixels tall. */
  function openChat(height = 900) {
    return withListHeight(height, () => {
      const fixture = TestBed.createComponent(ChatHost);
      fixture.detectChanges();
      TestBed.flushEffects();
      const container = fixture.nativeElement.querySelector('.chat-messages-container') as HTMLElement;
      return { fixture, container };
    });
  }

  /** Adds a message to the open chat and lets the window scroll to it. */
  function receive(fixture: ReturnType<typeof openChat>['fixture'], msg: ChatMessage, height: number): void {
    withListHeight(height, () => {
      fixture.componentInstance.messages.update((list) => [...list, msg]);
      fixture.detectChanges();
      TestBed.flushEffects();
    });
  }

  it('points the chat window at its latest message as soon as it opens', () => {
    const { container } = openChat(900);
    expect(container.scrollTop).toBe(900);
  });

  it('scrolls down to a message that arrives while the chat is open', () => {
    const { fixture, container } = openChat(900);

    receive(fixture, message('hello there'), 1200);

    expect(container.scrollTop).toBe(1200);
  });

  it('follows the member’s own outgoing message', () => {
    const { fixture, container } = openChat(900);

    receive(fixture, { ...message('sending this myself'), senderId: 1, receiverId: 2 }, 1500);

    expect(container.scrollTop).toBe(1500);
  });

  it('stays on the latest message when a profile picture finishes loading later', () => {
    const { container } = openChat(900);
    container.scrollTop = 0;

    withListHeight(1350, () => {
      // `<img>` load events do not bubble, so the directive listens for them in capture.
      container.dispatchEvent(new Event('load'));
    });

    expect(container.scrollTop).toBe(1350);
  });
});
