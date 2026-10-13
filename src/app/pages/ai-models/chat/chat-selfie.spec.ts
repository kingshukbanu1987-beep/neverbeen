import { describe, expect, it, vi } from 'vitest';
import { aiModelProfiles } from '../ai-model-data';
import {
  AI_SELFIE_ENDPOINT,
  SELFIE_REQUEST_PATTERN,
  SELFIE_WORD_PATTERN,
  VIDEO_REQUEST_PATTERN,
  generateChatSelfie,
  pickChatSelfie,
  pickSelfieMoment,
  selfieCaption,
  selfieLook,
  selfieReference,
} from './chat-selfie';

const alisha = aiModelProfiles.find((model) => model.slug === 'alisha-bhattacharya')!;

describe('pickChatSelfie', () => {
  it('sends one of her own frames, taken on a phone, flaws and all (requirement E)', () => {
    const seed = 'alisha|selfie';
    const shot = pickChatSelfie(alisha, seed)!;

    expect(shot).not.toBeNull();
    expect(alisha.photos.map((photo) => photo.src)).toContain(shot.photo);
    // She does not change her mind about what she just sent.
    expect(pickChatSelfie(alisha, seed)!.photo).toBe(shot.photo);
    // A moment and a flaw, because it is a phone photograph and not a studio one.
    expect(shot.place.length).toBeGreaterThan(5);
    expect(shot.flaw.length).toBeGreaterThan(5);
    expect(`${shot.place} ${shot.flaw}`).toMatch(
      /light|lamp|dark|blur|crooked|grain|angle|makeup|hair|squint|shadow|café|lift|kitchen|balcony|room|roof|window|car|stairs/i,
    );
  });

  it('never sends the same frame twice in one session', () => {
    const first = pickChatSelfie(alisha, 'alisha|selfie|1')!;
    const second = pickChatSelfie(alisha, 'alisha|selfie|2', [first.photo])!;

    expect(second.photo).not.toBe(first.photo);
  });
});

describe('selfieCaption', () => {
  it('says where and how it was taken, and uses the visitor’s first name', () => {
    const seed = 'alisha|selfie';
    const shot = pickChatSelfie(alisha, seed)!;
    const caption = selfieCaption(alisha, shot, seed, 'Rahul');

    expect(caption).toContain('Rahul');
    expect(caption).toContain(shot.place);
    expect(caption).toContain(shot.flaw);
    expect(caption).toMatch(/minute ago|just now|🙈/);
  });
});

describe('the request patterns', () => {
  it('hears a selfie request and a video request, and leaves an ordinary question alone', () => {
    expect(SELFIE_REQUEST_PATTERN.test('send me a selfie')).toBe(true);
    expect(SELFIE_REQUEST_PATTERN.test('can I see your photos?')).toBe(true);
    expect(SELFIE_REQUEST_PATTERN.test('show me yourself')).toBe(true);
    expect(SELFIE_REQUEST_PATTERN.test('what is your rate per photograph?')).toBe(false);

    expect(VIDEO_REQUEST_PATTERN.test('send me a video')).toBe(true);
    expect(VIDEO_REQUEST_PATTERN.test('do you have any reels?')).toBe(true);
    expect(VIDEO_REQUEST_PATTERN.test('your videos please')).toBe(true);
    expect(VIDEO_REQUEST_PATTERN.test('I like your portraits')).toBe(false);
  });
});

describe('her camera (she takes the selfie now)', () => {
  it('photographs her from her own profile photograph', async () => {
    const bodies: Record<string, unknown>[] = [];
    const fetchImpl = vi.fn(async (url: string, init?: RequestInit) => {
      bodies.push(JSON.parse(String(init?.body ?? '{}')) as Record<string, unknown>);
      expect(url).toBe(AI_SELFIE_ENDPOINT);
      return new Response(
        JSON.stringify({ ok: true, provider: 'gemini', image: 'data:image/png;base64,QUJD' }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      );
    }) as unknown as typeof fetch;

    const moment = pickSelfieMoment('alisha|selfie');
    const outcome = await generateChatSelfie({
      model: alisha,
      moment,
      reference: 'data:image/jpeg;base64,AAAA',
      fetchImpl,
    });

    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    expect(outcome.selfie.image).toBe('data:image/png;base64,QUJD');
    expect(outcome.selfie.provider).toBe('gemini');
    // Her card, the moment she is in, and the likeness the photograph is taken from.
    expect((bodies[0]['moment'] as Record<string, unknown>)['place']).toBe(moment.place);
    expect((bodies[0]['moment'] as Record<string, unknown>)['flaw']).toBe(moment.flaw);
    expect(bodies[0]['reference']).toBe('data:image/jpeg;base64,AAAA');
    expect(String(bodies[0]['look'])).toContain(alisha.age);
  });

  it('never asks the camera without her photograph, and never sends what is not a picture', async () => {
    const fetchImpl = vi.fn(async () => {
      throw new Error('the camera must not be called without a photograph');
    }) as unknown as typeof fetch;

    const withoutReference = await generateChatSelfie({
      model: alisha,
      moment: pickSelfieMoment('alisha|selfie'),
      reference: '',
      fetchImpl,
    });
    expect(withoutReference).toEqual({ ok: false, reason: 'no-reference' });
    expect(fetchImpl).not.toHaveBeenCalled();

    const words = vi.fn(
      async () =>
        new Response(JSON.stringify({ ok: true, image: 'nope' }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }),
    ) as unknown as typeof fetch;
    const notAPicture = await generateChatSelfie({
      model: alisha,
      moment: pickSelfieMoment('alisha|selfie'),
      reference: 'data:image/jpeg;base64,AAAA',
      fetchImpl: words,
    });
    // Words instead of a picture are worth asking again later — not a verdict on the visit.
    expect(notAPicture).toEqual({ ok: false, reason: 'transient' });
  });

  it('falls back to her album when the studio has no camera at all', async () => {
    const refused = vi.fn(
      async () =>
        new Response(JSON.stringify({ ok: false, error: 'selfie-unavailable' }), {
          status: 503,
          headers: { 'content-type': 'application/json' },
        }),
    ) as unknown as typeof fetch;

    const outcome = await generateChatSelfie({
      model: alisha,
      moment: pickSelfieMoment('alisha|selfie'),
      reference: 'data:image/jpeg;base64,AAAA',
      fetchImpl: refused,
    });

    // `503` is the studio saying "no image key" — definitive, and named as such so the window
    // rests both cameras instead of asking the other one just to fail the same way.
    expect(outcome).toEqual({ ok: false, reason: 'unavailable' });
    // …and the frame she sends is still one of her own, so a visitor who asks always gets one.
    expect(pickChatSelfie(alisha, 'alisha|selfie')).not.toBeNull();
  });

  it('reports a failing or throttled camera as transient, worth asking again soon', async () => {
    for (const status of [429, 500, 502]) {
      const failing = vi.fn(
        async () =>
          new Response(JSON.stringify({ ok: false, error: 'selfie-failed' }), {
            status,
            headers: { 'content-type': 'application/json' },
          }),
      ) as unknown as typeof fetch;
      const outcome = await generateChatSelfie({
        model: alisha,
        moment: pickSelfieMoment('alisha|selfie'),
        reference: 'data:image/jpeg;base64,AAAA',
        fetchImpl: failing,
      });
      expect(outcome).toEqual({ ok: false, reason: 'transient' });
    }
  });

  it('takes the likeness from her profile card, and describes only her age and her city', () => {
    expect(selfieReference(alisha)).toBe(alisha.cover);
    expect(selfieLook(alisha)).toContain(alisha.age);
    expect(selfieLook(alisha)).toContain('Darjeeling');
    // Nothing about her body: her own photograph already holds the likeness.
    expect(selfieLook(alisha)).not.toMatch(/bust|waist|hip|cm/i);
  });

  it('hears the word “selfie” as a request to take one, and “photos” as a request for the album', () => {
    expect(SELFIE_WORD_PATTERN.test('send me a selfie')).toBe(true);
    expect(SELFIE_WORD_PATTERN.test('can i have a selfie please')).toBe(true);
    expect(SELFIE_WORD_PATTERN.test('can I see your photos?')).toBe(false);
    // The wider pattern — the one that decides she sends a picture at all — hears both.
    expect(SELFIE_REQUEST_PATTERN.test('can I see your photos?')).toBe(true);
  });

  it('keeps two selfies of one session in different moments', () => {
    const first = pickSelfieMoment('alisha|selfie|1');
    const second = pickSelfieMoment('alisha|selfie|2');
    expect(first.place).not.toBe(second.place);
    // The same seed is the same moment: she does not change her mind about where she is.
    expect(pickSelfieMoment('alisha|selfie|1')).toEqual(first);
  });
});
