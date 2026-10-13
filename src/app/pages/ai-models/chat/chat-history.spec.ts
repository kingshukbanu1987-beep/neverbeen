import { ComponentFixture, TestBed } from '@angular/core/testing';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { aiModelProfiles } from '../ai-model-data';
import { ChatHistory } from './chat-history';
import { AiChatMessage, AiChatSession, AI_CHAT_SESSION_MS } from './chat-types';

const model = aiModelProfiles.find((profile) => profile.slug === 'alisha-bhattacharya')!;

function line(partial: Partial<AiChatMessage> & { id: string }): AiChatMessage {
  return {
    author: 'model',
    text: '',
    at: Date.now(),
    kind: 'message',
    attachment: null,
    reaction: null,
    reactionBy: null,
    pending: false,
    revealedChars: 0,
    sources: [],
    replyTo: null,
    intent: '',
    ...partial,
  };
}

describe('ChatHistory sheet', () => {
  let fixture: ComponentFixture<ChatHistory>;

  afterEach(() => {
    fixture?.destroy();
    vi.restoreAllMocks();
  });

  function create(messages: AiChatMessage[]): void {
    const session = {
      slug: model.slug,
      identity: { name: 'Rahul Verma', avatar: 'data:image/png;base64,AAAA' },
      startedAt: Date.now(),
      endsAt: Date.now() + AI_CHAT_SESSION_MS,
      messages,
      strikes: 0,
      closed: '',
      reminders: [],
      introduced: true,
      followUpAt: 0,
      followUps: 0,
      lastVisitorAt: 0,
      pitches: 0,
      closedAt: 0,
      feedback: null,
      language: '',
    } as AiChatSession;

    fixture = TestBed.createComponent(ChatHistory);
    fixture.componentRef.setInput('model', model);
    fixture.componentRef.setInput('session', session);
    fixture.detectChanges();
  }

  it('lists every line of the conversation, with the count of messages in the heading', () => {
    create([
      line({ id: 'n', author: 'system', kind: 'notice', text: 'Private chat' }),
      line({ id: 'a', text: 'Hello there' }),
      line({ id: 'b', author: 'user', text: 'Hi back' }),
    ]);

    const element: HTMLElement = fixture.nativeElement;
    expect(element.querySelector('.chat-history-heading p')?.textContent).toContain('2 messages');
    expect(element.querySelector('.chat-history-notice')?.textContent).toContain('Private chat');
    const bubbles = Array.from(element.querySelectorAll('.chat-history-text')).map((node) =>
      node.textContent?.trim(),
    );
    expect(bubbles).toEqual(['Hello there', 'Hi back']);
    expect(element.querySelectorAll('.chat-history-line.is-outgoing')).toHaveLength(1);
  });

  it('shows pictures and documents, with a save button only where the bytes are still here', () => {
    create([
      line({
        id: 'p',
        author: 'user',
        attachment: {
          kind: 'photo',
          name: 'beach.png',
          type: 'image/png',
          size: 10,
          source: 'upload',
          preview: 'data:image/png;base64,AAAA',
        },
      }),
      line({
        id: 'd',
        author: 'user',
        attachment: {
          kind: 'document',
          name: 'a.pdf',
          type: 'application/pdf',
          size: 2048,
          source: 'file',
          preview: '',
          fileData: 'data:application/pdf;base64,AAAA',
        },
      }),
      line({
        id: 'g',
        author: 'user',
        attachment: {
          kind: 'document',
          name: 'b.txt',
          type: 'text/plain',
          size: 1,
          source: 'file',
          preview: '',
          fileData: '',
        },
      }),
    ]);

    const element: HTMLElement = fixture.nativeElement;
    expect(
      element.querySelector<HTMLImageElement>('.chat-history-photo')?.getAttribute('src'),
    ).toBe('data:image/png;base64,AAAA');
    expect(element.querySelectorAll('.chat-history-download')).toHaveLength(1);
    expect(element.querySelector('.chat-history-file-gone')?.textContent).toContain(
      'No longer kept in this tab',
    );
  });

  it('goes back to the conversation when asked', () => {
    create([line({ id: 'a', text: 'Hi' })]);
    const closed = vi.fn();
    fixture.componentInstance.closed.subscribe(closed);

    (fixture.nativeElement as HTMLElement)
      .querySelector<HTMLButtonElement>('.chat-history-back')!
      .click();

    expect(closed).toHaveBeenCalledTimes(1);
  });
});
