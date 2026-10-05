import {
  buildBookingMessage,
  createBookingReference,
  formatShootDate,
  handleModelBookingRequest,
  validateBookingRequest,
} from '../../../../../worker/model-booking-core.mjs';

const NOW = new Date('2026-10-05T09:30:00Z');
const FOUNDER_NUMBER = '919051888116';

function payload(overrides: Record<string, unknown> = {}) {
  return {
    model: {
      name: 'Nourhan Durrani',
      handle: '@nourhan.durrani',
      slug: 'nourhan-durrani',
      location: 'Sarajevo, Bosnia and Herzegovina',
    },
    term: { term: 'Full day', detail: '8 hours on set', usd: 1700 },
    booking: {
      date: '2026-11-14',
      project: 'Editorial shoot',
      location: 'Kuala Lumpur, Malaysia',
      usage: 'Digital and print, 12 months',
      notes: 'Studio preferred, morning light.',
    },
    client: {
      name: 'Ada Lovelace',
      email: 'ada@studio.example',
      phone: '+60 12 345 6789',
      company: 'Studio X',
    },
    page: 'https://neverbeen.example/ai-models/nourhan-durrani',
    ...overrides,
  };
}

const ENV = {
  WHATSAPP_TOKEN: 'test-token',
  WHATSAPP_PHONE_NUMBER_ID: '1234567890',
  FOUNDER_WHATSAPP_NUMBER: FOUNDER_NUMBER,
};

describe('model booking core', () => {
  it('accepts a complete request and writes the message into the developer outbox', async () => {
    const messages: string[] = [];

    const result = await handleModelBookingRequest({
      method: 'POST',
      payload: payload(),
      now: NOW,
      outbox: (message: string) => messages.push(message),
    });

    expect(result.status).toBe(200);
    expect(result.body.ok).toBe(true);
    expect(result.body.channel).toBe('outbox');
    expect(result.body.delivered).toBe(false);
    expect(result.body.reference).toMatch(/^NB-[A-Z0-9]{6}$/);

    const message = messages[0];
    expect(message).toContain('New booking request');
    expect(message).toContain('Nourhan Durrani (@nourhan.durrani)');
    expect(message).toContain('Full day — 8 hours on set');
    expect(message).toContain('$1,700 USD');
    expect(message).toContain('Sat, 14 Nov 2026');
    expect(message).toContain('Ada Lovelace');
    expect(message).toContain('ada@studio.example');
    expect(message).toContain('+60 12 345 6789');
    expect(message).toContain('Studio preferred, morning light.');
    expect(message).toContain(result.body.reference);
  });

  it('keeps the founder number out of every response and message it returns', async () => {
    const outbox: string[] = [];
    const accepted = await handleModelBookingRequest({
      method: 'POST',
      payload: payload(),
      now: NOW,
      outbox: (message: string) => outbox.push(message),
    });

    const serialised = JSON.stringify(accepted);
    expect(serialised).not.toContain(FOUNDER_NUMBER);
    expect(serialised).not.toContain('whatsapp.me');
    expect(outbox[0]).not.toContain(FOUNDER_NUMBER);
  });

  it('sends through the WhatsApp Cloud API with the configured number when credentials exist', async () => {
    const calls: { url: string; body: any; headers: any }[] = [];
    const fetchImpl = (async (url: string, init: any) => {
      calls.push({ url, body: JSON.parse(init.body), headers: init.headers });
      return new Response(JSON.stringify({ messages: [{ id: 'wamid.test' }] }), { status: 200 });
    }) as unknown as typeof fetch;

    const result = await handleModelBookingRequest({
      method: 'POST',
      payload: payload(),
      env: ENV,
      now: NOW,
      fetchImpl,
    });

    expect(result.status).toBe(200);
    expect(result.body.delivered).toBe(true);
    expect(result.body.channel).toBe('whatsapp');

    expect(calls.length).toBe(1);
    expect(calls[0].url).toContain('/1234567890/messages');
    expect(calls[0].headers.authorization).toBe('Bearer test-token');
    expect(calls[0].body.to).toBe(FOUNDER_NUMBER);
    expect(calls[0].body.type).toBe('text');
    expect(calls[0].body.text.body).toContain('Nourhan Durrani');
  });

  it('reports a delivery failure without leaking the number or the token', async () => {
    const fetchImpl = (async () =>
      new Response(JSON.stringify({ error: { message: 'expired token' } }), {
        status: 401,
      })) as unknown as typeof fetch;

    const result = await handleModelBookingRequest({
      method: 'POST',
      payload: payload(),
      env: ENV,
      now: NOW,
      fetchImpl,
    });

    expect(result.status).toBe(502);
    expect(result.body.ok).toBe(false);
    expect(result.body.error).toBe('delivery-failed');
    expect(JSON.stringify(result.body)).not.toContain(FOUNDER_NUMBER);
    expect(JSON.stringify(result.body)).not.toContain('test-token');
  });

  it('answers 503 when the studio has not connected a WhatsApp channel yet', async () => {
    const result = await handleModelBookingRequest({
      method: 'POST',
      payload: payload(),
      now: NOW,
    });
    expect(result.status).toBe(503);
    expect(result.body.error).toBe('not-configured');
  });

  it('rejects incomplete or impossible bookings with field-level errors', async () => {
    const empty = await handleModelBookingRequest({ method: 'POST', payload: {}, now: NOW });
    expect(empty.status).toBe(422);
    expect(empty.body.error).toBe('validation');
    const fields = (empty.body.fields ?? []).map((entry: { field: string }) => entry.field);
    expect(fields).toEqual(
      expect.arrayContaining(['model', 'term', 'date', 'name', 'email', 'phone']),
    );

    const past = validateBookingRequest(payload({ booking: { date: '2020-01-01' } }), NOW);
    expect(past.booking).toBeNull();
    expect(past.errors['date']).toContain('past');

    const rolledOver = validateBookingRequest(payload({ booking: { date: '2026-02-31' } }), NOW);
    expect(rolledOver.errors['date']).toBeTruthy();

    const badEmail = validateBookingRequest(
      payload({ client: { name: 'A', email: 'not-an-email', phone: '+60 12 345 6789' } }),
      NOW,
    );
    expect(badEmail.errors['email']).toBeTruthy();
  });

  it('only accepts POST', async () => {
    const result = await handleModelBookingRequest({ method: 'GET', payload: payload(), now: NOW });
    expect(result.status).toBe(405);
  });

  it('formats dates, prices and references predictably', () => {
    expect(formatShootDate('2026-11-14')).toBe('Sat, 14 Nov 2026');
    expect(formatShootDate('2026-02-31')).toBe('2026-02-31');
    expect(createBookingReference()).toMatch(/^NB-[A-Z2-9]{6}$/);

    const { booking } = validateBookingRequest(payload(), NOW);
    expect(booking).not.toBeNull();
    const message = buildBookingMessage(booking!);
    expect(message).toContain('Price: $1,700 USD');
    expect(message.split('\n').length).toBeGreaterThan(20);
  });
});
