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
  AI_CHAT_TYPING_MAX_MS,
  AI_CHAT_TYPING_MIN_MS,
  AI_CHAT_TYPING_PER_CHAR_MS,
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
