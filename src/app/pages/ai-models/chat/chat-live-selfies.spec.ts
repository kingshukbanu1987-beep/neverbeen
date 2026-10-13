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

    const live = await generateLiveChatSelfies({
      model: alisha,
      moment: { place: 'on the terrace', flaw: 'crooked' },
      reference: 'data:image/jpeg;base64,AAAA',
      seed: 'turn-7',
      fetchImpl,
    });

    expect(live).not.toBeNull();
    expect(live!.images).toHaveLength(2);
    expect(live!.place).toContain('terrace');
    expect(live!.timestamp).toBe('13/10/2026 18:42');
    expect(live!.watermark).toBe('Shot on iPhone 18 Pro');

    // Her likeness, her own clock and the salt of this turn travel with the request.
    expect(bodies).toHaveLength(1);
    expect(String(bodies[0]['reference'])).toBe('data:image/jpeg;base64,AAAA');
    expect(String(bodies[0]['timezone'])).toBe('Asia/Kolkata');
    expect(String((bodies[0]['model'] as Record<string, unknown>)['location'])).toContain(
      'Darjeeling',
    );
    expect(String(bodies[0]['seed'])).toBe('turn-7');
  });

  it('never asks without her photograph, and ignores an answer with no images', async () => {
    const fetchImpl = vi.fn(async () => {
      throw new Error('the service must not be called without a photograph');
    }) as unknown as typeof fetch;

    const withoutReference = await generateLiveChatSelfies({
      model: alisha,
      reference: '',
      fetchImpl,
    });
    expect(withoutReference).toBeNull();
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
    expect(noImages).toBeNull();
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

    const live = await generateLiveChatSelfies({
      model: alisha,
      reference: 'data:image/jpeg;base64,AAAA',
      fetchImpl,
    });
    expect(live!.images).toEqual(['data:image/png;base64,QUJD', 'data:image/png;base64,QUJDMA==']);
  });
});
