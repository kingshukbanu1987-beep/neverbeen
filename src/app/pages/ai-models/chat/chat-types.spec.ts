import { describe, expect, it } from 'vitest';
import { AiChatMessage } from './chat-types';
import {
  AI_CHAT_AWAY_MAX_MS,
  AI_CHAT_AWAY_MIN_MS,
  AI_CHAT_GAP_MAX_MS,
  AI_CHAT_GAP_MIN_MS,
  AI_CHAT_INTRO_MAX_MS,
  AI_CHAT_INTRO_MIN_MS,
  AI_CHAT_MID_PAUSE_MAX_MS,
  AI_CHAT_MID_PAUSE_MIN_MS,
  AI_CHAT_REACTIONS,
  AI_CHAT_REPLY_QUOTE_CHARS,
  AI_CHAT_TYPING_MAX_MS,
  AI_CHAT_TYPING_MIN_MS,
  AI_CHAT_TYPING_PER_CHAR_MS,
  reactionEmoji,
  replyQuoteOf,
  typingTimeFor,
} from './chat-types';

describe('the shape of a message (requirements A and C of the second brief)', () => {
  it('carries a pending flag and the characters that are on screen', () => {
    const message: AiChatMessage = {
      id: 'model-1',
      author: 'model',
      text: 'Delhi, of course.',
      at: 1,
      kind: 'message',
      attachment: null,
      reaction: null,
      reactionBy: null,
      pending: true,
      revealedChars: 0,
      sources: [],
      intent: 'knowledge:capital',
    };

    // While she is typing, the bubble holds nothing at all: her answer is never printed out letter
    // by letter, so `revealedChars` is either zero or the whole message.
    expect(message.pending).toBe(true);
    expect(message.revealedChars).toBe(0);
    message.pending = false;
    message.revealedChars = message.text.length;
    expect(message.revealedChars).toBe(17);
  });
});

describe('the seven expressions and the reply quote', () => {
  it('offers exactly the seven expressions, in tray order', () => {
    expect(AI_CHAT_REACTIONS.map((option) => option.id)).toEqual([
      'like',
      'dislike',
      'love',
      'smile',
      'angry',
      'cry',
      'happy',
    ]);
    expect(AI_CHAT_REACTIONS.map((option) => option.emoji)).toEqual([
      '👍',
      '👎',
      '❤️',
      '😊',
      '😡',
      '😭',
      '😄',
    ]);
    expect(reactionEmoji('dislike')).toBe('👎');
    expect(reactionEmoji('cry')).toBe('😭');
    expect(reactionEmoji(null)).toBe('');
  });

  it('snapshots the message a reply answers, text trimmed to the quote length', () => {
    const long = 'word '.repeat(80).trim();
    const message: AiChatMessage = {
      id: 'user-9',
      author: 'user',
      text: long,
      at: 42,
      kind: 'message',
      attachment: null,
      reaction: null,
      reactionBy: null,
      pending: false,
      revealedChars: long.length,
      sources: [],
      intent: '',
    };
    const quote = replyQuoteOf(message);
    expect(quote.id).toBe('user-9');
    expect(quote.author).toBe('user');
    expect(quote.at).toBe(42);
    expect(quote.text.length).toBe(AI_CHAT_REPLY_QUOTE_CHARS);
    expect(quote.photo).toBe(false);
  });

  it('quotes a photograph as a photograph, not as the words “Sent a photograph”', () => {
    const message: AiChatMessage = {
      id: 'user-10',
      author: 'user',
      text: 'Sent a photograph',
      at: 43,
      kind: 'message',
      attachment: {
        kind: 'photo',
        name: 'me.jpg',
        type: 'image/jpeg',
        size: 1024,
        source: 'upload',
        preview: 'data:image/jpeg;base64,AAAA',
      },
      reaction: null,
      reactionBy: null,
      pending: false,
      revealedChars: 17,
      sources: [],
      intent: '',
    };
    const quote = replyQuoteOf(message);
    expect(quote.text).toBe('');
    expect(quote.photo).toBe(true);
  });
});

describe('the time a person needs to type a message (requirement A of the second brief)', () => {
  it('grows with the length of the message', () => {
    const short = typingTimeFor(10);
    const medium = typingTimeFor(120);
    const long = typingTimeFor(400);

    expect(short).toBe(AI_CHAT_TYPING_MIN_MS);
    expect(medium).toBe(120 * AI_CHAT_TYPING_PER_CHAR_MS);
    expect(long).toBeGreaterThan(medium);
  });

  it('never drops below the floor and never runs past the ceiling', () => {
    expect(typingTimeFor(0)).toBe(AI_CHAT_TYPING_MIN_MS);
    expect(typingTimeFor(-40)).toBe(AI_CHAT_TYPING_MIN_MS);
    expect(typingTimeFor(10_000)).toBe(AI_CHAT_TYPING_MAX_MS);
    expect(AI_CHAT_TYPING_MAX_MS).toBeLessThan(10_000);
  });

  it('takes its scale from the caller, so the tests can pin a wait down', () => {
    expect(typingTimeFor(50, 40, 2_000, 9_000)).toBe(2_000);
    expect(typingTimeFor(100, 40, 2_000, 9_000)).toBe(4_000);
    expect(typingTimeFor(0, 0, 0, 0)).toBe(0);
  });
});

describe('the pauses of a real chat (requirement D of the second brief)', () => {
  it('brackets the away pause between three and seven seconds', () => {
    expect(AI_CHAT_AWAY_MIN_MS).toBeGreaterThanOrEqual(3_000);
    expect(AI_CHAT_AWAY_MAX_MS).toBeLessThanOrEqual(7_000);
    expect(AI_CHAT_AWAY_MAX_MS).toBeGreaterThan(AI_CHAT_AWAY_MIN_MS);
  });

  it('brackets the mid-thought pause between two and five seconds', () => {
    expect(AI_CHAT_MID_PAUSE_MIN_MS).toBeGreaterThanOrEqual(2_000);
    expect(AI_CHAT_MID_PAUSE_MAX_MS).toBeLessThanOrEqual(5_000);
    expect(AI_CHAT_MID_PAUSE_MAX_MS).toBeGreaterThan(AI_CHAT_MID_PAUSE_MIN_MS);
  });

  it('reaches the stretches the brief asks for: a three to five second opening, two to four second gaps', () => {
    expect(AI_CHAT_INTRO_MIN_MS).toBe(3_000);
    expect(AI_CHAT_INTRO_MAX_MS).toBe(5_000);
    expect(AI_CHAT_GAP_MIN_MS).toBe(2_000);
    expect(AI_CHAT_GAP_MAX_MS).toBe(4_000);
  });
});
