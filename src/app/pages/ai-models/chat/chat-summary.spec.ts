import { describe, expect, it } from 'vitest';
import { aiModelProfiles } from '../ai-model-data';
import { AiChatAttachment, AiChatMessage, AiChatSession } from './chat-types';
import { buildChatSessionSummary, formatTogether } from './chat-summary';

const alisha = aiModelProfiles.find((model) => model.slug === 'alisha-bhattacharya')!;
const startedAt = Date.UTC(2026, 0, 1, 20, 0, 0);

let counter = 0;

function message(
  author: AiChatMessage['author'],
  text: string,
  attachment: AiChatAttachment | null = null,
): AiChatMessage {
  counter += 1;
  return {
    id: `m${counter}`,
    author,
    text,
    at: startedAt + counter * 1_000,
    kind: 'message',
    attachment,
    reaction: null,
    reactionBy: null,
    pending: false,
    revealedChars: text.length,
    sources: [],
    intent: '',
  };
}

function session(overrides: Partial<AiChatSession> = {}): AiChatSession {
  return {
    slug: alisha.slug,
    identity: { name: 'Rahul Verma', avatar: 'data:image/jpeg;base64,AA' },
    startedAt,
    endsAt: startedAt + 2 * 60 * 60 * 1_000,
    messages: [],
    strikes: 0,
    closed: '',
    reminders: [],
    introduced: true,
    nudgeAt: 0,
    nudges: 0,
    pitches: 0,
    closedAt: 0,
    language: '',
    ...overrides,
  };
}

describe('formatTogether', () => {
  it('says how long two people were together, the way a person says it', () => {
    expect(formatTogether(40_000)).toBe('40 seconds');
    expect(formatTogether(1_000)).toBe('1 second');
    expect(formatTogether(60_000)).toBe('1 minute');
    expect(formatTogether(48 * 60_000)).toBe('48 minutes');
    expect(formatTogether(72 * 60_000)).toBe('1 hour 12 minutes');
    expect(formatTogether(120 * 60_000)).toBe('2 hours');
    expect(formatTogether(-500)).toBe('0 seconds');
  });
});

describe('buildChatSessionSummary', () => {
  it('writes her report from what actually happened in the session (requirement K)', () => {
    const report = buildChatSessionSummary({
      model: alisha,
      session: session({
        closedAt: startedAt + 25 * 60_000,
        messages: [
          message('model', 'Hey Rahul — so you finally said something.'),
          message('user', 'Thank you, you are lovely 😊'),
          message('user', 'What is the capital of India?'),
          message('user', 'haha that is funny, I travel a lot for work'),
          message('user', 'I would love to book you for a shoot one day'),
        ],
      }),
    });

    expect(report.minutes).toBe(25);
    expect(report.together).toBe('25 minutes');
    expect(report.messages).toBe(4);
    expect(report.sheEnded).toBe(false);
    expect(report.rating).toBeGreaterThanOrEqual(2);
    expect(report.rating).toBeLessThanOrEqual(5);
    expect(report.headline.length).toBeGreaterThan(5);
    expect(report.experience.length).toBeGreaterThan(80);
    expect(report.highlights.length).toBeGreaterThan(0);
    expect(report.highlights.length).toBeLessThanOrEqual(3);
  });

  it('counts the photographs that went back and forth', () => {
    const photo: AiChatAttachment = {
      kind: 'photo',
      name: 'me.jpg',
      type: 'image/jpeg',
      size: 1_024,
      source: 'upload',
      preview: 'data:image/jpeg;base64,AA',
    };
    const report = buildChatSessionSummary({
      model: alisha,
      session: session({
        closedAt: startedAt + 6 * 60_000,
        messages: [
          message('user', 'Here is me', photo),
          message('model', 'You look kind', { ...photo, selfie: true }),
        ],
      }),
    });

    expect(report.photos).toBe(2);
    expect(report.highlights.join(' ')).toMatch(/photograph|selfie/i);
  });

  it('rates a conversation she ended at one, and says so in her own words', () => {
    const report = buildChatSessionSummary({
      model: alisha,
      session: session({
        closed: 'blocked',
        closedAt: startedAt + 3 * 60_000,
        strikes: 3,
        messages: [message('user', 'You are an idiot')],
      }),
    });

    expect(report.sheEnded).toBe(true);
    expect(report.rating).toBe(1);
    expect(report.headline).toMatch(/ended|deserve/i);
    expect(report.experience).toMatch(/closed the door|sharp/i);
  });

  it('still finds something to say about a visit that never said a word', () => {
    const report = buildChatSessionSummary({
      model: alisha,
      session: session({ closedAt: startedAt + 4 * 60_000, messages: [] }),
    });

    expect(report.messages).toBe(0);
    expect(report.experience).toMatch(/never said a word/i);
    expect(report.highlights).toContain('a very quiet visit');
  });
});
