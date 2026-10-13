#!/usr/bin/env node
/**
 * Local stand-in for the production Worker's `/api/*` endpoints: the AI model chat and the model
 * booking.
 *
 * The Angular dev server proxies `/api/*` here (see `proxy.conf.json`), so `npm start` exercises the
 * same server-side logic production runs — `worker/ai-chat-core.mjs` and
 * `worker/model-booking-core.mjs` — without deploying anything.
 *
 *   - `POST /api/ai-chat` — the live chat with a model. With `OPENAI_API_KEY` in the environment the
 *     answer is streamed from OpenAI (and Google results are added when `GOOGLE_SEARCH_API_KEY` and
 *     `GOOGLE_SEARCH_CX` are set). Without the key it answers `503 ai-unavailable`, which is exactly
 *     what production does unmapped, and the website answers from the model's own engine instead —
 *     so the chat works either way.
 *   - `POST /api/ai-read` — the reading desk: Google Translate reads the visitor's words and
 *     Gemini (or OpenAI) reads the turn — the message, the photograph, the document — before she
 *     answers. Without a key it answers `503 analysis-unavailable` and the window's own reader
 *     takes over.
 *   - `POST /api/ai-selfie` — her camera: Gemini's image model takes a selfie from her own profile
 *     photograph, at the moment the chat has put her in. Without a key the window sends one of her
 *     album frames instead.
 *   - `POST /api/model-booking` — the booking endpoint. The portfolio form itself hands off directly
 *     to WhatsApp, so this is only for server-side integrations; the shared logic is
 *     `worker/model-booking-core.mjs` and the only difference is delivery:
 *
 *   - with WHATSAPP_TOKEN, WHATSAPP_PHONE_NUMBER_ID and FOUNDER_WHATSAPP_NUMBER set in the
 *     environment, the message is sent to the founder's WhatsApp exactly as in production;
 *   - otherwise the message is appended to `booking-outbox.log` and the response reports
 *     `channel: "outbox"`, so the API caller can retrieve the request for local review.
 *
 * The founder's number is read from the environment only — it is never returned to the browser.
 */
import { appendFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  AI_CHAT_ENDPOINT,
  MAX_CHAT_BODY_BYTES,
  createAiChatResponse,
} from '../worker/ai-chat-core.mjs';
import {
  BOOKING_ENDPOINT,
  MAX_BODY_BYTES,
  handleModelBookingRequest,
} from '../worker/model-booking-core.mjs';
import {
  AI_READ_ENDPOINT,
  MAX_READ_BODY_BYTES,
  createAiReadResponse,
} from '../worker/ai-read-core.mjs';
import {
  AI_SELFIE_ENDPOINT,
  MAX_SELFIE_BODY_BYTES,
  createAiSelfieResponse,
} from '../worker/ai-selfie-core.mjs';

const projectRoot = fileURLToPath(new URL('..', import.meta.url));
const port = Number(process.env['BOOKING_API_PORT'] ?? 8787);
const outboxFile = join(projectRoot, 'booking-outbox.log');

function readBody(request, maxBytes = MAX_BODY_BYTES) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    request.on('data', (chunk) => {
      size += chunk.length;
      if (size > maxBytes) {
        reject(new Error('payload-too-large'));
        request.destroy();
        return;
      }
      chunks.push(chunk);
    });
    request.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    request.on('error', reject);
  });
}

const server = createServer(async (request, response) => {
  const path = new URL(request.url ?? '/', 'http://localhost').pathname;

  if (path === AI_CHAT_ENDPOINT) {
    if ((request.method ?? 'GET').toUpperCase() !== 'POST') {
      response.writeHead(405, { 'content-type': 'application/json; charset=utf-8' });
      response.end(JSON.stringify({ ok: false, error: 'method-not-allowed' }));
      return;
    }

    let chatPayload;
    try {
      chatPayload = JSON.parse(await readBody(request, MAX_CHAT_BODY_BYTES));
    } catch (error) {
      const tooLarge = error.message === 'payload-too-large';
      response.writeHead(tooLarge ? 413 : 400, { 'content-type': 'application/json' });
      response.end(
        JSON.stringify({ ok: false, error: tooLarge ? 'payload-too-large' : 'invalid-json' }),
      );
      return;
    }

    const chatResponse = await createAiChatResponse({ payload: chatPayload, env: process.env });
    response.writeHead(chatResponse.status, Object.fromEntries(chatResponse.headers.entries()));
    response.end(Buffer.from(await chatResponse.arrayBuffer()));
    return;
  }

  if (path === AI_READ_ENDPOINT || path === AI_SELFIE_ENDPOINT) {
    const isSelfie = path === AI_SELFIE_ENDPOINT;
    const endpoint = isSelfie ? AI_SELFIE_ENDPOINT : AI_READ_ENDPOINT;

    if ((request.method ?? 'GET').toUpperCase() !== 'POST') {
      response.writeHead(405, { 'content-type': 'application/json; charset=utf-8' });
      response.end(JSON.stringify({ ok: false, error: 'method-not-allowed' }));
      return;
    }

    let body;
    try {
      body = JSON.parse(
        await readBody(request, isSelfie ? MAX_SELFIE_BODY_BYTES : MAX_READ_BODY_BYTES),
      );
    } catch (error) {
      const tooLarge = error.message === 'payload-too-large';
      response.writeHead(tooLarge ? 413 : 400, { 'content-type': 'application/json' });
      response.end(
        JSON.stringify({ ok: false, error: tooLarge ? 'payload-too-large' : 'invalid-json' }),
      );
      return;
    }

    const apiResponse = isSelfie
      ? await createAiSelfieResponse({ payload: body, env: process.env })
      : await createAiReadResponse({ payload: body, env: process.env });
    response.writeHead(apiResponse.status, Object.fromEntries(apiResponse.headers.entries()));
    response.end(Buffer.from(await apiResponse.arrayBuffer()));
    console.log(`[ai-models] ${endpoint} → ${apiResponse.status}`);
    return;
  }

  if (path !== BOOKING_ENDPOINT) {
    response.writeHead(404, { 'content-type': 'application/json' });
    response.end(JSON.stringify({ ok: false, error: 'not-found' }));
    return;
  }

  // Match the production Worker: anything that is not a POST is answered with 405.
  if ((request.method ?? 'GET').toUpperCase() !== 'POST') {
    const notAllowed = await handleModelBookingRequest({
      method: request.method ?? 'GET',
      payload: undefined,
      env: process.env,
      outbox: null,
    });
    response.writeHead(notAllowed.status, { 'content-type': 'application/json; charset=utf-8' });
    response.end(JSON.stringify(notAllowed.body));
    return;
  }

  let payload;
  try {
    payload = JSON.parse(await readBody(request));
  } catch (error) {
    const tooLarge = error.message === 'payload-too-large';
    response.writeHead(tooLarge ? 413 : 400, { 'content-type': 'application/json' });
    response.end(
      JSON.stringify({ ok: false, error: tooLarge ? 'payload-too-large' : 'invalid-json' }),
    );
    return;
  }

  const result = await handleModelBookingRequest({
    method: request.method ?? 'POST',
    payload,
    env: process.env,
    outbox: (message) => {
      appendFileSync(outboxFile, `\n──── ${new Date().toISOString()} ────\n${message}\n`, 'utf8');
      console.log('[ai-models] Booking written to booking-outbox.log');
    },
  });

  response.writeHead(result.status, { 'content-type': 'application/json; charset=utf-8' });
  response.end(JSON.stringify(result.body));
});

server.listen(port, '127.0.0.1', () => {
  const configured = Boolean(
    process.env['WHATSAPP_TOKEN'] &&
    process.env['WHATSAPP_PHONE_NUMBER_ID'] &&
    process.env['FOUNDER_WHATSAPP_NUMBER'],
  );
  console.log(
    `[ai-models] Booking API on http://127.0.0.1:${port}${BOOKING_ENDPOINT} — ` +
      (configured
        ? 'WhatsApp delivery configured'
        : 'no WhatsApp credentials, writing to booking-outbox.log'),
  );
  console.log(
    `[ai-models] AI chat API on http://127.0.0.1:${port}${AI_CHAT_ENDPOINT} — ` +
      (process.env['OPENAI_API_KEY']
        ? 'OpenAI answers configured'
        : 'no OPENAI_API_KEY, the website answers from the model’s own engine'),
  );
  console.log(
    `[ai-models] Reading desk on http://127.0.0.1:${port}${AI_READ_ENDPOINT} — ` +
      (process.env['GEMINI_API_KEY']
        ? 'Gemini reads the turns'
        : process.env['OPENAI_API_KEY']
          ? 'OpenAI reads the turns'
          : 'Google Translate only — the window reads the rest itself'),
  );
  console.log(
    `[ai-models] Her camera on http://127.0.0.1:${port}${AI_SELFIE_ENDPOINT} — ` +
      (process.env['GEMINI_API_KEY']
        ? 'selfies are taken with Gemini'
        : 'no GEMINI_API_KEY, a selfie is one of her own album frames'),
  );
});

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    server.close(() => process.exit(0));
  });
}
