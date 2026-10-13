import { describe, expect, it, vi } from 'vitest';
import { aiModelProfiles } from '../ai-model-data';
import { LIVE_CHAT_SELFIES_ENDPOINT, generateLiveChatSelfies } from './chat-live-selfies';

const alisha = aiModelProfiles.find((model) => model.slug === 'alisha-bhattacharya')!;

describe('livechatselfiesandphotos — the window’s client', () => {
  it('asks the service for two fresh photographs and returns both', async () => {
    const bodies: Record<string, unknown>[] = [];
    const fetchImpl = vi.fn(async (url: string, init?: RequestInit) => {
      bodies.push(JSON.parse(String(init?.body ?? '{}')) as Record<string, unknown>);
      expect(url).toBe(LIVE_CHAT_SELFIES_ENDPOINT);
      return new Response(
        JSON.stringify({
          ok: true,
          provider: 'gemini',
          images: ['data:image/png;base64,QUJD', 'data:image/png;base64,QUJDMA=='],
          place: 'on the terrace in the evening light in Darjeeling',
          flaw: 'the horizon is crooked and I left it that way',
          timestamp: '13/10/2026 18:42',
          watermark: 'Shot on iPhone 18 Pro',
        }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      );
    }) as unknown as typeof fetch;

    const outcome = await generateLiveChatSelfies({
      model: alisha,
      moment: { place: 'on the terrace', flaw: 'crooked' },
      reference: 'data:image/jpeg;base64,AAAA',
      seed: 'turn-7',
      fetchImpl,
    });

    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    const live = outcome.selfies;
    expect(live.images).toHaveLength(2);
    expect(live.place).toContain('terrace');
    expect(live.timestamp).toBe('13/10/2026 18:42');
    expect(live.watermark).toBe('Shot on iPhone 18 Pro');

    // Her likeness, her own clock and the salt of this turn travel with the request.
    expect(bodies).toHaveLength(1);
    expect(String(bodies[0]['reference'])).toBe('data:image/jpeg;base64,AAAA');
    expect(String(bodies[0]['timezone'])).toBe('Asia/Kolkata');
    expect(String((bodies[0]['model'] as Record<string, unknown>)['location'])).toContain(
      'Darjeeling',
    );
    expect(String(bodies[0]['seed'])).toBe('turn-7');
  });

  it('never asks without her photograph, and reports an answer with no images as transient', async () => {
    const fetchImpl = vi.fn(async () => {
      throw new Error('the service must not be called without a photograph');
    }) as unknown as typeof fetch;

    const withoutReference = await generateLiveChatSelfies({
      model: alisha,
      reference: '',
      fetchImpl,
    });
    expect(withoutReference).toEqual({ ok: false, reason: 'no-reference' });
    expect(fetchImpl).not.toHaveBeenCalled();

    const wordOnly = vi.fn(
      async () =>
        new Response(JSON.stringify({ ok: true, provider: 'gemini' }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }),
    ) as unknown as typeof fetch;
    const noImages = await generateLiveChatSelfies({
      model: alisha,
      reference: 'data:image/jpeg;base64,AAAA',
      fetchImpl: wordOnly,
    });
    // A word-only answer is worth asking again later — not a verdict on the visit.
    expect(noImages).toEqual({ ok: false, reason: 'transient' });
  });

  it('says "unavailable" only for the studio’s no-key answer, and "transient" for every other failure', async () => {
    const answerWith = (status: number, error: string) =>
      vi.fn(
        async () =>
          new Response(JSON.stringify({ ok: false, error }), {
            status,
            headers: { 'content-type': 'application/json' },
          }),
      ) as unknown as typeof fetch;

    // The studio has no image key: definitive — both cameras read that one key.
    const unconfigured = await generateLiveChatSelfies({
      model: alisha,
      reference: 'data:image/jpeg;base64,AAAA',
      fetchImpl: answerWith(503, 'selfies-unavailable'),
    });
    expect(unconfigured).toEqual({ ok: false, reason: 'unavailable' });

    // A throttle, an upstream failure or a refusal: the service is asked again soon.
    for (const [status, error] of [
      [429, 'too-many-requests'],
      [502, 'selfies-failed'],
      [502, 'selfies-refused'],
    ] as const) {
      const failed = await generateLiveChatSelfies({
        model: alisha,
        reference: 'data:image/jpeg;base64,AAAA',
        fetchImpl: answerWith(status, error),
      });
      expect(failed).toEqual({ ok: false, reason: 'transient' });
    }

    // The network itself breaking is transient too.
    const offline = await generateLiveChatSelfies({
      model: alisha,
      reference: 'data:image/jpeg;base64,AAAA',
      fetchImpl: vi.fn(async () => {
        throw new Error('offline');
      }) as unknown as typeof fetch,
    });
    expect(offline).toEqual({ ok: false, reason: 'transient' });
  });

  it('drops anything in the answer that is not a data-URL photograph', async () => {
    const fetchImpl = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            ok: true,
            images: [
              'https://example.com/not-her.png',
              'data:image/png;base64,QUJD',
              42,
              'data:image/png;base64,QUJDMA==',
            ],
          }),
          { status: 200, headers: { 'content-type': 'application/json' } },
        ),
    ) as unknown as typeof fetch;

    const outcome = await generateLiveChatSelfies({
      model: alisha,
      reference: 'data:image/jpeg;base64,AAAA',
      fetchImpl,
    });
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    expect(outcome.selfies.images).toEqual([
      'data:image/png;base64,QUJD',
      'data:image/png;base64,QUJDMA==',
    ]);
  });
});
