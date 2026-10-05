#!/usr/bin/env node
/**
 * Local stand-in for the production Worker's booking endpoint.
 *
 * The Angular dev server proxies `/api/*` here (see `proxy.conf.json`), so the Rent form can be
 * submitted end-to-end while developing. The same shared logic as production runs
 * (`worker/model-booking-core.mjs`); the only difference is delivery:
 *
 *   - with WHATSAPP_TOKEN, WHATSAPP_PHONE_NUMBER_ID and FOUNDER_WHATSAPP_NUMBER set in the
 *     environment, the message is sent to the founder's WhatsApp exactly as in production;
 *   - otherwise the message is appended to `booking-outbox.log` and the response reports
 *     `channel: "outbox"`, so the form still works and nothing is silently lost.
 *
 * The founder's number is read from the environment only — it is never returned to the browser.
 */
import { appendFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  BOOKING_ENDPOINT,
  MAX_BODY_BYTES,
  handleModelBookingRequest,
} from '../worker/model-booking-core.mjs';

const projectRoot = fileURLToPath(new URL('..', import.meta.url));
const port = Number(process.env['BOOKING_API_PORT'] ?? 8787);
const outboxFile = join(projectRoot, 'booking-outbox.log');

function readBody(request) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    request.on('data', (chunk) => {
      size += chunk.length;
      if (size > MAX_BODY_BYTES) {
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
});

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    server.close(() => process.exit(0));
  });
}
