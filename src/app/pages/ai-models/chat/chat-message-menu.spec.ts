import { describe, expect, it } from 'vitest';
import { chatMessageMenu } from './chat-message-menu';
import {
  AI_CHAT_UNSEND_WINDOW_MS,
  AiChatAttachment,
  AiChatMessage,
  canUnsendMessage,
  chatMessageBody,
} from './chat-types';

const NOW = Date.UTC(2026, 9, 14, 12, 0, 0);

function message(partial: Partial<AiChatMessage> = {}): AiChatMessage {
  return {
    id: partial.id ?? 'm-1',
    author: 'model',
    text: 'Hello there',
    at: NOW,
    kind: 'message',
    attachment: null,
    reaction: null,
    reactionBy: null,
    pending: false,
    revealedChars: 11,
    sources: [],
    replyTo: null,
    intent: '',
    ...partial,
  };
}

function photo(partial: Partial<AiChatAttachment> = {}): AiChatAttachment {
  return {
    kind: 'photo',
    name: 'Photograph',
    type: 'image/jpeg',
    size: 1024,
    source: 'upload',
    preview: 'data:image/jpeg;base64,AAAA',
    ...partial,
  };
}

const labels = (items: { label: string }[]): string[] => items.map((item) => item.label);

describe('chatMessageMenu (Instagram message menu)', () => {
  it('offers Reply, Forward, Copy, Delete for you and Pin on her message, in that order', () => {
    const items = chatMessageMenu(message(), { now: NOW });
    expect(labels(items)).toEqual(['Reply', 'Forward', 'Copy', 'Delete for you', 'Pin']);
    expect(items.map((item) => item.id)).toEqual(['reply', 'forward', 'copy', 'delete', 'pin']);
  });

  it('never offers Unsend on a message the model wrote, whenever it was sent', () => {
    expect(labels(chatMessageMenu(message({ at: NOW }), { now: NOW }))).not.toContain('Unsend');
  });

  it('adds Unsend to the visitor’s own message within two minutes of sending it', () => {
    const own = message({ author: 'user', at: NOW - 30_000 });
    expect(labels(chatMessageMenu(own, { now: NOW }))).toEqual([
      'Reply',
      'Forward',
      'Copy',
      'Delete for you',
      'Unsend',
      'Pin',
    ]);
  });

  it('takes Unsend away once the two minutes are over', () => {
    const own = message({ author: 'user', at: NOW - AI_CHAT_UNSEND_WINDOW_MS - 1 });
    expect(labels(chatMessageMenu(own, { now: NOW }))).not.toContain('Unsend');
  });

  it('keeps Unsend exactly at the two-minute mark', () => {
    const own = message({ author: 'user', at: NOW - AI_CHAT_UNSEND_WINDOW_MS });
    expect(labels(chatMessageMenu(own, { now: NOW }))).toContain('Unsend');
  });

  it('shows Unpin in place of Pin on a pinned message', () => {
    const items = chatMessageMenu(message({ pinned: true }), { now: NOW });
    expect(items.at(-1)).toEqual({ id: 'unpin', label: 'Unpin' });
  });

  it('leaves out Reply when the chat is closed and takes no replies', () => {
    expect(labels(chatMessageMenu(message(), { now: NOW, canReply: false }))).not.toContain(
      'Reply',
    );
  });

  it('offers no Forward or Copy on a photograph that has no words of its own', () => {
    const shot = message({
      author: 'user',
      text: 'Sent a photograph',
      attachment: photo(),
      at: NOW,
    });
    const labelsShown = labels(chatMessageMenu(shot, { now: NOW }));
    expect(labelsShown).not.toContain('Forward');
    expect(labelsShown).not.toContain('Copy');
    expect(labelsShown).toContain('Delete for you');
  });

  it('offers nothing while she is still typing, and nothing on notices or reminders', () => {
    expect(chatMessageMenu(message({ pending: true }), { now: NOW })).toEqual([]);
    expect(chatMessageMenu(message({ kind: 'notice' }), { now: NOW })).toEqual([]);
    expect(chatMessageMenu(message({ kind: 'reminder' }), { now: NOW })).toEqual([]);
  });

  it('leaves an unsent message with only Delete for you', () => {
    const gone = message({ author: 'user', unsent: true, text: '', at: NOW });
    expect(chatMessageMenu(gone, { now: NOW }).map((item) => item.id)).toEqual(['delete']);
  });
});

describe('chatMessageBody and canUnsendMessage', () => {
  it('returns the typed words, and nothing for a placeholder or an unsent message', () => {
    expect(chatMessageBody(message({ text: '  Hello  ' }))).toBe('Hello');
    expect(
      chatMessageBody(
        message({ author: 'user', text: 'Sent a photograph', attachment: photo(), at: NOW }),
      ),
    ).toBe('');
    expect(chatMessageBody(message({ unsent: true, text: '' }))).toBe('');
  });

  it('keeps real words even when a photograph is attached', () => {
    const shot = message({ author: 'user', text: 'Look at this', attachment: photo(), at: NOW });
    expect(chatMessageBody(shot)).toBe('Look at this');
  });

  it('lets only the writer unsend, once, and never a message that is still being written', () => {
    expect(canUnsendMessage(message({ author: 'user', at: NOW }), NOW)).toBe(true);
    expect(canUnsendMessage(message({ author: 'model', at: NOW }), NOW)).toBe(false);
    expect(canUnsendMessage(message({ author: 'user', at: NOW, pending: true }), NOW)).toBe(false);
    expect(canUnsendMessage(message({ author: 'user', at: NOW, unsent: true }), NOW)).toBe(false);
  });
});
