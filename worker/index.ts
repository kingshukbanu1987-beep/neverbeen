/**
 * Cloudflare Worker entry point for the NeverBeen site.
 *
 * Static files are served from the built Angular app; `/api/*` is handled here for server-side
 * model-booking integrations that deliver through the WhatsApp Cloud API.
 *
 * The WhatsApp credentials are Worker secrets:
 *
 *   npx wrangler secret put WHATSAPP_TOKEN             # WhatsApp Cloud API token
 *   npx wrangler secret put WHATSAPP_PHONE_NUMBER_ID   # sender phone number id
 *   npx wrangler secret put FOUNDER_WHATSAPP_NUMBER    # where the bookings go
 *
 * Until they are set the endpoint answers 503 and no message is sent. The optional endpoint never
 * returns the founder's number to its caller.
 */
import { BOOKING_ENDPOINT, handleModelBookingRequest } from './model-booking-core.mjs';

interface Env {
  ASSETS: { fetch(request: Request): Promise<Response> };
  WHATSAPP_TOKEN?: string;
  WHATSAPP_PHONE_NUMBER_ID?: string;
  FOUNDER_WHATSAPP_NUMBER?: string;
}

/** The booking core only ever reads the three WhatsApp values, so hand it exactly those. */
function bookingEnv(env: Env): Record<string, string | undefined> {
  return {
    WHATSAPP_TOKEN: env.WHATSAPP_TOKEN,
    WHATSAPP_PHONE_NUMBER_ID: env.WHATSAPP_PHONE_NUMBER_ID,
    FOUNDER_WHATSAPP_NUMBER: env.FOUNDER_WHATSAPP_NUMBER,
  };
}

const MAX_BODY_BYTES = 32 * 1024;
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_REQUESTS = 6;

/** Best-effort per-isolate throttle: enough to stop a single client hammering the endpoint. */
const recentRequests = new Map<string, number[]>();

function isRateLimited(key: string, now: number): boolean {
  const hits = (recentRequests.get(key) ?? []).filter((time) => now - time < RATE_LIMIT_WINDOW_MS);
  hits.push(now);
  recentRequests.set(key, hits);

  if (recentRequests.size > 500) {
    for (const [entry, times] of recentRequests) {
      if (times.every((time) => now - time >= RATE_LIMIT_WINDOW_MS)) recentRequests.delete(entry);
    }
  }

  return hits.length > RATE_LIMIT_REQUESTS;
}

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
    },
  });
}

async function readPayload(request: Request): Promise<unknown> {
  const declaredLength = Number(request.headers.get('content-length') ?? '0');
  if (Number.isFinite(declaredLength) && declaredLength > MAX_BODY_BYTES) return null;

  const text = await request.text();
  if (text.length > MAX_BODY_BYTES) return null;

  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === BOOKING_ENDPOINT) {
      const clientKey = request.headers.get('cf-connecting-ip') ?? 'unknown';
      if (isRateLimited(clientKey, Date.now())) {
        return json(429, { ok: false, error: 'too-many-requests' });
      }

      if (request.method !== 'POST') return json(405, { ok: false, error: 'method-not-allowed' });

      const payload = await readPayload(request);
      if (payload === null) return json(413, { ok: false, error: 'payload-too-large' });
      if (payload === undefined) return json(400, { ok: false, error: 'invalid-json' });

      const result = await handleModelBookingRequest({
        method: 'POST',
        payload,
        env: bookingEnv(env),
      });
      return json(result.status, result.body);
    }

    if (url.pathname.startsWith('/api/')) {
      return json(404, { ok: false, error: 'not-found' });
    }

    return env.ASSETS.fetch(request);
  },
};
