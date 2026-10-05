import { afterEach, describe, expect, it, vi } from 'vitest';
import workerEntry from '../../../../../worker/index';

const worker = (workerEntry as { default?: typeof workerEntry }).default ?? workerEntry;
const ORIGIN = 'https://neverbeen.example';
const ENV = {
  ASSETS: {
    fetch: async (request: Request) => new Response(`asset:${new URL(request.url).pathname}`),
  },
  WHATSAPP_TOKEN: 'test-token',
  WHATSAPP_PHONE_NUMBER_ID: '1234567890',
  FOUNDER_WHATSAPP_NUMBER: '919051888116',
};

function payload(overrides: Record<string, unknown> = {}) {
  return {
    model: {
      name: 'Nourhan Durrani',
      handle: '@nourhan.durrani',
      slug: 'nourhan-durrani',
      location: 'Sarajevo, Bosnia and Herzegovina',
    },
    term: { term: 'Full day', detail: '8 hours on set', usd: 1700 },
    booking: { date: '2026-11-14', project: 'Editorial shoot' },
    client: { name: 'Ada Lovelace', email: 'ada@studio.example', phone: '+60 12 345 6789' },
    page: '/ai-models/nourhan-durrani',
    ...overrides,
  };
}

/** A fresh client IP per request keeps the per-isolate throttle out of the other assertions. */
function post(body: unknown, ip = '203.0.113.10') {
  return new Request(`${ORIGIN}/api/model-booking`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'cf-connecting-ip': ip },
    body: JSON.stringify(body),
  });
}

function call(request: Request, env: unknown = ENV) {
  return worker.fetch(request, env as never);
}

describe('booking Worker entry', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('delivers a valid booking to the founder over WhatsApp without exposing the number', async () => {
    const calls: string[] = [];
    vi.stubGlobal('fetch', async (input: RequestInfo | URL) => {
      calls.push(String(input));
      return new Response(JSON.stringify({ messages: [{ id: 'wamid.TEST' }] }), { status: 200 });
    });

    const response = await call(post(payload()));
    const body = (await response.json()) as Record<string, unknown>;

    expect(response.status).toBe(200);
    expect(body['ok']).toBe(true);
    expect(body['delivered']).toBe(true);
    expect(body['channel']).toBe('whatsapp');
    expect(calls[0]).toBe('https://graph.facebook.com/v21.0/1234567890/messages');
    expect(JSON.stringify(body)).not.toContain('919051888116');
  });

  it('answers 405 for GET, 422 for a past shoot date and 503 when the secrets are missing', async () => {
    const wrongMethod = await call(new Request(`${ORIGIN}/api/model-booking`));
    expect(wrongMethod.status).toBe(405);
    expect(((await wrongMethod.json()) as Record<string, unknown>)['error']).toBe(
      'method-not-allowed',
    );

    const pastDate = await call(
      post(
        payload({ booking: { date: '2020-01-01', project: 'Editorial shoot' } }),
        '203.0.113.11',
      ),
    );
    const pastBody = (await pastDate.json()) as { fields: { field: string }[] };
    expect(pastDate.status).toBe(422);
    expect(pastBody.fields.map((entry) => entry.field)).toContain('date');

    const unconfigured = await call(post(payload(), '203.0.113.12'), { ASSETS: ENV.ASSETS });
    expect(unconfigured.status).toBe(503);
    expect(((await unconfigured.json()) as Record<string, unknown>)['error']).toBe(
      'not-configured',
    );
  });

  it('serves static assets itself and keeps unknown API routes out of the app shell', async () => {
    const asset = await call(new Request(`${ORIGIN}/ai-models/nourhan-durrani`));
    expect(asset.status).toBe(200);
    expect(await asset.text()).toBe('asset:/ai-models/nourhan-durrani');

    const unknownApi = await call(new Request(`${ORIGIN}/api/anything-else`));
    expect(unknownApi.status).toBe(404);
    expect(((await unknownApi.json()) as Record<string, unknown>)['error']).toBe('not-found');
  });

  it('throttles a single client that hammers the endpoint', async () => {
    vi.stubGlobal(
      'fetch',
      async () => new Response(JSON.stringify({ messages: [] }), { status: 200 }),
    );

    const statuses: number[] = [];
    for (let attempt = 0; attempt < 8; attempt += 1) {
      const response = await call(post(payload(), '198.51.100.77'));
      statuses.push(response.status);
    }

    expect(statuses.filter((status) => status === 200).length).toBe(6);
    expect(statuses.at(-1)).toBe(429);
  });
});
