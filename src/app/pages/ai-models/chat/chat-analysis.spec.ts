import { describe, expect, it, vi } from 'vitest';
import { aiModelProfiles } from '../ai-model-data';
import {
  AI_READ_ENDPOINT,
  analyseVisitorTurn,
  localTurnReading,
  mergeReadings,
  readingForAnswer,
  readingFromStudio,
} from './chat-analysis';

const alisha = aiModelProfiles.find((model) => model.slug === 'alisha-bhattacharya')!;

const VISITOR = { name: 'Rahul Verma', firstName: 'Rahul' };

/** The reading desk's answer, as `worker/ai-read-core.mjs` writes it. */
function deskReading(overrides: Record<string, unknown> = {}) {
  return {
    ok: true,
    provider: 'gemini',
    reading: {
      english: 'You are very beautiful, and I wanted you to know it.',
      language: 'en',
      languageName: 'English',
      romanised: false,
      intent: 'compliment',
      sentiment: 'warm',
      tone: 'short and shy',
      about: 'a compliment about her looks',
      wants: 'to be told she is pretty too',
      attachment: '',
      advice: 'Blush, tease him a little, and ask him something about himself.',
      provider: 'gemini',
      ...overrides,
    },
  };
}

/** A stubbed reading desk, recording what the window sent it. */
function stubDesk(payload: unknown, status = 200) {
  const bodies: Record<string, unknown>[] = [];
  const fetchImpl = vi.fn(async (_url: string, init?: RequestInit) => {
    bodies.push(JSON.parse(String(init?.body ?? '{}')) as Record<string, unknown>);
    return new Response(JSON.stringify(payload), {
      status,
      headers: { 'content-type': 'application/json' },
    });
  }) as unknown as typeof fetch;
  return { fetchImpl, bodies };
}

describe('the window’s own reading (nothing is answered before it is read)', () => {
  it('repairs the typing and keeps the meaning of a short-formed message', () => {
    const reading = localTurnReading({ text: 'u r sooooo beutifull', model: alisha });

    expect(reading.source).toBe('local');
    expect(reading.english).toContain('you are');
    expect(reading.english).toContain('beautiful');
  });

  it('reads a Romanised message through the studio’s books, in English', () => {
    const reading = localTurnReading({
      text: 'ami khete jabo',
      model: alisha,
      language: {
        code: 'bn',
        label: 'Bengali',
        english: 'i will go to eat',
        romanised: true,
        source: 'books',
        fresh: true,
      },
    });

    expect(reading.language).toBe('bn');
    expect(reading.languageName).toBe('Bengali');
    expect(reading.romanised).toBe(true);
    expect(reading.english).toBe('i will go to eat');
  });

  it('says what an attached photograph looked like, from the window’s own eye on it', () => {
    const reading = localTurnReading({
      text: '',
      model: alisha,
      attachment: {
        kind: 'photo',
        name: 'me.jpg',
        type: 'image/jpeg',
        size: 12,
        source: 'upload',
        preview: 'data:image/jpeg;base64,AAAA',
      },
      photo: {
        width: 600,
        height: 800,
        orientation: 'portrait',
        brightness: 0.2,
        saturation: 0.4,
        warmth: 0.1,
        dominant: 'warm brown',
        skin: 0.2,
      },
    });

    expect(reading.intent).toBe('photo');
    expect(reading.attachment).toContain('portrait');
    expect(reading.attachment).toContain('dark');
  });
});

describe('the studio’s reading desk (Google Translate, then Gemini or OpenAI)', () => {
  it('reads the turn with the desk and keeps what the desk understood', async () => {
    const { fetchImpl, bodies } = stubDesk(deskReading());

    const reading = await analyseVisitorTurn({
      text: 'u r sooooo beutifull',
      model: alisha,
      user: VISITOR,
      history: [],
      fetchImpl,
    });

    expect(readingFromStudio(reading)).toBe(true);
    expect(reading.source).toBe('studio');
    expect(reading.provider).toBe('gemini');
    expect(reading.english).toContain('very beautiful');
    expect(reading.intent).toBe('compliment');
    expect(reading.sentiment).toBe('warm');
    expect(reading.advice).toContain('Blush');

    // The window tells the desk what it read itself, and who it is reading the turn for.
    const body = bodies[0];
    expect(String(body['text'])).toBe('u r sooooo beutifull');
    expect(body['user']).toEqual(VISITOR);
    expect((body['local'] as Record<string, unknown>)['english']).toContain('beautiful');
    expect((body['model'] as Record<string, unknown>)['slug']).toBe('alisha-bhattacharya');
  });

  it('hands an attached document to the desk as its own bytes', async () => {
    const { fetchImpl, bodies } = stubDesk(
      deskReading({
        english: 'Here is the brief.',
        intent: 'document',
        attachment: 'A two-page PDF: a creative brief for a beach shoot in Goa, with a budget.',
      }),
    );

    const reading = await analyseVisitorTurn({
      text: 'Here is the brief',
      attachment: {
        kind: 'document',
        name: 'brief.pdf',
        type: 'application/pdf',
        size: 900,
        source: 'file',
        preview: '',
        fileData: 'data:application/pdf;base64,JVBERi0xLjQK',
      },
      model: alisha,
      user: VISITOR,
      history: [],
      fetchImpl,
    });

    expect(reading.attachment).toContain('creative brief');
    expect((bodies[0]['attachment'] as Record<string, unknown>)['dataUrl']).toBe(
      'data:application/pdf;base64,JVBERi0xLjQK',
    );
  });

  it('answers in the language the desk read, even when the studio has no book for it', async () => {
    const { fetchImpl } = stubDesk(
      deskReading({
        english: 'I want to know the price of a shoot.',
        language: 'ta',
        languageName: 'Tamil',
        romanised: true,
      }),
    );

    const reading = await analyseVisitorTurn({
      text: 'shoot panam evlo',
      model: alisha,
      user: VISITOR,
      history: [],
      fetchImpl,
    });

    // Tamil has no book of its own: the meaning is understood, and the chat stays in English.
    expect(reading.english).toContain('price of a shoot');
    expect(reading.language).toBe('');
  });

  it('knows the languages the studio has a book for', async () => {
    const { fetchImpl } = stubDesk(
      deskReading({
        english: 'I will go to eat',
        language: 'bn',
        languageName: 'Bengali',
        romanised: true,
      }),
    );

    const reading = await analyseVisitorTurn({
      text: 'ami khete jabo',
      model: alisha,
      user: VISITOR,
      history: [],
      fetchImpl,
    });

    expect(reading.language).toBe('bn');
    expect(reading.romanised).toBe(true);
    expect(reading.languageName).toBe('Bengali');
  });

  it('falls back to the window’s own reading when the desk is off, refused or unreachable', async () => {
    const off = await analyseVisitorTurn({
      text: 'u r sooooo beutifull',
      model: alisha,
      history: [],
      allowNetwork: false,
    });
    expect(off.source).toBe('local');
    expect(off.english).toContain('beautiful');

    const refused = stubDesk({ ok: false, error: 'analysis-unavailable' }, 503);
    const refusedReading = await analyseVisitorTurn({
      text: 'u r sooooo beutifull',
      model: alisha,
      history: [],
      fetchImpl: refused.fetchImpl,
    });
    expect(refusedReading.source).toBe('local');

    const broken = vi.fn(async () => {
      throw new Error('offline');
    }) as unknown as typeof fetch;
    const brokenReading = await analyseVisitorTurn({
      text: 'u r sooooo beutifull',
      model: alisha,
      history: [],
      fetchImpl: broken,
    });
    expect(brokenReading.source).toBe('local');
    expect(brokenReading.english).toContain('beautiful');
  });
});

describe('what the reading hands on', () => {
  it('fills the desk’s gaps from the window’s own reading', () => {
    const local = localTurnReading({ text: 'u r beutifull', model: alisha });
    const merged = mergeReadings(local, {
      provider: 'gemini',
      english: 'You are beautiful.',
      language: 'en',
      romanised: false,
    });

    expect(merged.source).toBe('studio');
    expect(merged.english).toBe('You are beautiful.');
    expect(merged.intent).toBe(local.intent);
    expect(merged.attachment).toBe(local.attachment);
  });

  it('carries the reading to her answer endpoint without the window’s own bookkeeping', () => {
    const local = localTurnReading({ text: 'hello', model: alisha });
    const forAnswer = readingForAnswer(mergeReadings(local, deskReading().reading));

    expect(forAnswer['english']).toContain('very beautiful');
    expect(forAnswer['intent']).toBe('compliment');
    expect(forAnswer['advice']).toContain('Blush');
    expect(forAnswer['source']).toBeUndefined();
  });

  it('asks the desk through the studio’s own endpoint', async () => {
    const { fetchImpl } = stubDesk(deskReading());
    await analyseVisitorTurn({ text: 'hi', model: alisha, history: [], fetchImpl });
    expect(AI_READ_ENDPOINT).toBe('/api/ai-read');
    expect(fetchImpl).toHaveBeenCalledWith(AI_READ_ENDPOINT, expect.anything());
  });
});
