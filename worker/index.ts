/**
 * Cloudflare Worker entry point for the NeverBeen site.
 *
 * Static files are served from the built Angular app. `/api/*` is handled here for server-side
 * model-booking integrations that deliver through the WhatsApp Cloud API, and
 * `/neverbeen-api/*` is proxied to the NeverBeen Web API (the ASP.NET Core service that stores
 * the community in PostgreSQL / Supabase).
 *
 * Because the Angular app calls the API through this same-origin path, the browser never has to
 * deal with CORS or mixed content: the Worker talks to the API server-side and returns the plain
 * JSON/photo response.
 *
 * The WhatsApp credentials are Worker secrets:
 *
 *   npx wrangler secret put WHATSAPP_TOKEN             # WhatsApp Cloud API token
 *   npx wrangler secret put WHATSAPP_PHONE_NUMBER_ID   # sender phone number id
 *   npx wrangler secret put FOUNDER_WHATSAPP_NUMBER    # where the bookings go
 *
 * `/api/ai-chat` is the AI model chat: her answers to questions from outside NeverBeen stream from
 * OpenAI with live Google results. It needs its own optional secrets — without them the website
 * answers from the model's own engine, so the chat always works:
 *
 *   npx wrangler secret put OPENAI_API_KEY         # OpenAI key
 *   npx wrangler secret put GOOGLE_SEARCH_API_KEY  # Google Custom Search JSON API key
 *   npx wrangler secret put GOOGLE_SEARCH_CX       # programmable search engine id
 *
 * See `worker/ai-chat-core.mjs` and `docs/ai-model-chat.md`.
 *
 * The API target can be overridden with the NEVERBEEN_API_URL variable (see wrangler.jsonc).
 *
 * Until the WhatsApp secrets are set the booking endpoint answers 503 and no message is sent. The
 * optional endpoint never returns the founder's number to its caller.
 */
import { BOOKING_ENDPOINT, handleModelBookingRequest } from './model-booking-core.mjs';
import { AI_CHAT_ENDPOINT, MAX_CHAT_BODY_BYTES, createAiChatResponse } from './ai-chat-core.mjs';

interface Env {
  ASSETS: { fetch(request: Request): Promise<Response> };
  WHATSAPP_TOKEN?: string;
  WHATSAPP_PHONE_NUMBER_ID?: string;
  FOUNDER_WHATSAPP_NUMBER?: string;
  /** Base URL of the NeverBeen Web API (defaults to the deployed Azure App Service). */
  NEVERBEEN_API_URL?: string;
  /** OpenAI key for the AI model chat; without it the chat answers from its own engine. */
  OPENAI_API_KEY?: string;
  /** OpenAI model used by the chat (defaults to `gpt-4o-mini`). */
  OPENAI_MODEL?: string;
  /** Google Custom Search credentials — live search results for the chat (both optional). */
  GOOGLE_SEARCH_API_KEY?: string;
  GOOGLE_SEARCH_CX?: string;
}

/** Same-origin path the Angular app uses for the NeverBeen Web API. */
const API_PROXY_PREFIX = '/neverbeen-api';
/** Deployed NeverBeen Web API — override with the NEVERBEEN_API_URL variable. */
const DEFAULT_API_ORIGIN =
  'https://neverbeen-api-kingshuk-cqexbcb5hqbqavdb.westus3-01.azurewebsites.net';

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

/** A chat turn carries the dossier and possibly a picture, so it gets its own, larger budget. */
const RATE_LIMIT_CHAT_REQUESTS = 30;
const chatRequests = new Map<string, number[]>();

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

/** The chat endpoint's own throttle: a conversation is fast, but not free. */
function isChatRateLimited(key: string, now: number): boolean {
  const hits = (chatRequests.get(key) ?? []).filter((time) => now - time < RATE_LIMIT_WINDOW_MS);
  hits.push(now);
  chatRequests.set(key, hits);

  if (chatRequests.size > 500) {
    for (const [entry, times] of chatRequests) {
      if (times.every((time) => now - time >= RATE_LIMIT_WINDOW_MS)) chatRequests.delete(entry);
    }
  }

  return hits.length > RATE_LIMIT_CHAT_REQUESTS;
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

/**
 * Forwards `/neverbeen-api/<path>` to the NeverBeen Web API as a server-side request.
 *
 * The browser keeps talking to this site's own origin (no CORS pre-flight, no mixed content when
 * the API is on plain HTTP), and the API's JSON/photo response is passed back unchanged.
 */
async function proxyToCommunityApi(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const suffix = url.pathname.slice(API_PROXY_PREFIX.length) || '/';
  const origin = (env.NEVERBEEN_API_URL?.trim() || DEFAULT_API_ORIGIN).replace(/\/+$/, '');
  const target = `${origin}${suffix.startsWith('/') ? suffix : `/${suffix}`}${url.search}`;

  const headers = new Headers(request.headers);
  // Let the API see its own host, and keep the browser origin out of the server-side call so the
  // API never applies its CORS policy to a request that came from this Worker.
  headers.delete('host');
  headers.delete('origin');
  headers.delete('referer');

  const hasBody = request.method !== 'GET' && request.method !== 'HEAD';
  return fetch(
    new Request(target, {
      method: request.method,
      headers,
      // Buffer the payload (small JSON bodies and profile photographs) so the same code
      // works both in the Workers runtime and under the Node-based unit-test runner.
      body: hasBody ? await request.arrayBuffer() : undefined,
    }),
  );
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === API_PROXY_PREFIX || url.pathname.startsWith(`${API_PROXY_PREFIX}/`)) {
      return proxyToCommunityApi(request, env);
    }

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

    if (url.pathname === AI_CHAT_ENDPOINT) {
      const clientKey = request.headers.get('cf-connecting-ip') ?? 'unknown';
      if (isChatRateLimited(clientKey, Date.now())) {
        return json(429, { ok: false, error: 'too-many-requests' });
      }

      if (request.method !== 'POST') return json(405, { ok: false, error: 'method-not-allowed' });

      const declared = Number(request.headers.get('content-length') ?? '0');
      const text =
        Number.isFinite(declared) && declared > MAX_CHAT_BODY_BYTES ? null : await request.text();
      if (text === null || text.length > MAX_CHAT_BODY_BYTES) {
        return json(413, { ok: false, error: 'payload-too-large' });
      }

      let payload: unknown;
      try {
        payload = JSON.parse(text);
      } catch {
        return json(400, { ok: false, error: 'invalid-json' });
      }

      // The chat reads its own secrets; the booking core never sees them.
      return createAiChatResponse({
        payload,
        env: {
          OPENAI_API_KEY: env.OPENAI_API_KEY,
          OPENAI_MODEL: env.OPENAI_MODEL,
          GOOGLE_SEARCH_API_KEY: env.GOOGLE_SEARCH_API_KEY,
          GOOGLE_SEARCH_CX: env.GOOGLE_SEARCH_CX,
        },
      });
    }

    if (url.pathname.startsWith('/api/')) {
      return json(404, { ok: false, error: 'not-found' });
    }

    return env.ASSETS.fetch(request);
  },
};
