/**
 * Booking request handling for the NeverBeen AI Model Rent form.
 *
 * The founder's WhatsApp number is a server-side secret: it only ever exists in the Worker's
 * environment (or the developer's own environment locally). Nothing in this module returns it to the
 * browser, and every response body is built from the visitor's own input, so the number cannot leak
 * through the API, the page source or the network tab.
 *
 * The module is plain ESM so it can run unchanged in three places:
 *   - the Cloudflare Worker (worker/index.ts) that serves production traffic,
 *   - the local development API (scripts/dev-booking-api.mjs),
 *   - the unit tests (src/app/pages/ai-models/booking/booking-core.spec.ts).
 */

export const BOOKING_ENDPOINT = '/api/model-booking';
export const GRAPH_API_VERSION = 'v21.0';

/** Largest request body we accept, as a guard against oversized payloads. */
export const MAX_BODY_BYTES = 32 * 1024;

const FIELD_LIMITS = {
  name: 120,
  email: 160,
  phone: 40,
  company: 120,
  location: 160,
  project: 120,
  usage: 160,
  notes: 1000,
  term: 60,
  detail: 120,
  slug: 120,
  handle: 80,
  page: 300,
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PHONE_PATTERN = /^[+()\d][\d\s()+.-]{5,}$/;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function isRecord(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function clean(value, limit) {
  if (typeof value === 'number') return String(value).slice(0, limit);
  if (typeof value !== 'string') return '';
  // Collapse newlines in pasted values, keep it single-line except for notes.
  return value.replace(/\r/g, '').trim().slice(0, limit);
}

function cleanMultiline(value, limit) {
  if (typeof value !== 'string') return '';
  return value.replace(/\r\n?/g, '\n').trim().slice(0, limit);
}

function startOfDay(date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function parseIsoDate(value) {
  if (!DATE_PATTERN.test(value)) return null;
  const parsed = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) return null;
  // Reject impossible dates such as 2026-02-31 (JS rolls them over).
  if (parsed.toISOString().slice(0, 10) !== value) return null;
  return parsed;
}

/** Human-readable shoot date, e.g. "Fri, 24 Oct 2026". */
export function formatShootDate(iso) {
  const parsed = parseIsoDate(iso);
  if (!parsed) return iso;
  return new Intl.DateTimeFormat('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(parsed);
}

export function formatUsd(amount) {
  return `$${Number(amount).toLocaleString('en-US')}`;
}

/** Short, human-quotable reference such as "NB-7K2M4Q". */
export function createBookingReference() {
  const alphabet = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  const bytes = new Uint8Array(6);
  if (globalThis.crypto?.getRandomValues) globalThis.crypto.getRandomValues(bytes);
  else
    for (let index = 0; index < bytes.length; index += 1)
      bytes[index] = Math.floor(Math.random() * 256);
  let reference = '';
  for (const byte of bytes) reference += alphabet[byte % alphabet.length];
  return `NB-${reference}`;
}

/**
 * Validates and normalises a booking payload.
 *
 * @returns {{ errors: Record<string, string>, booking: object|null }}
 */
export function validateBookingRequest(payload, now = new Date()) {
  const errors = {};
  const source = isRecord(payload) ? payload : {};
  const model = isRecord(source.model) ? source.model : {};
  const term = isRecord(source.term) ? source.term : {};
  const bookingInput = isRecord(source.booking) ? source.booking : {};
  const clientInput = isRecord(source.client) ? source.client : {};

  const modelName = clean(model.name, FIELD_LIMITS.name);
  const termName = clean(term.term, FIELD_LIMITS.term);
  const usd = Number(term.usd);
  const clientName = clean(clientInput.name, FIELD_LIMITS.name);
  const email = clean(clientInput.email, FIELD_LIMITS.email);
  const phone = clean(clientInput.phone, FIELD_LIMITS.phone);
  const date = clean(bookingInput.date, 10);

  if (!modelName) errors['model'] = 'The model could not be identified.';
  if (!termName) errors['term'] = 'Choose a booking term.';
  else if (!Number.isFinite(usd) || usd <= 0)
    errors['term'] = 'Choose a booking term with a price.';

  if (!date) errors['date'] = 'Choose a shoot date.';
  else {
    const parsed = parseIsoDate(date);
    if (!parsed) errors['date'] = 'That shoot date is not a real date.';
    else if (parsed.getTime() < startOfDay(now).getTime())
      errors['date'] = 'The shoot date cannot be in the past.';
  }

  if (!clientName) errors['name'] = 'Add your name.';
  if (!email) errors['email'] = 'Add an email address.';
  else if (!EMAIL_PATTERN.test(email)) errors['email'] = 'That email address looks incomplete.';
  if (!phone) errors['phone'] = 'Add a phone number.';
  else if (!PHONE_PATTERN.test(phone)) errors['phone'] = 'That phone number looks incomplete.';

  if (Object.keys(errors).length > 0) return { errors, booking: null };

  return {
    errors,
    booking: {
      reference: createBookingReference(),
      requestedAt: now.toISOString(),
      model: {
        name: modelName,
        handle: clean(model.handle, FIELD_LIMITS.handle),
        slug: clean(model.slug, FIELD_LIMITS.slug),
        location: clean(model.location, FIELD_LIMITS.location),
      },
      term: { term: termName, detail: clean(term.detail, FIELD_LIMITS.detail), usd },
      shootDate: date,
      client: {
        name: clientName,
        email,
        phone,
        company: clean(clientInput.company, FIELD_LIMITS.company),
      },
      brief: {
        location: clean(bookingInput.location, FIELD_LIMITS.location),
        project: clean(bookingInput.project, FIELD_LIMITS.project),
        usage: clean(bookingInput.usage, FIELD_LIMITS.usage),
        notes: cleanMultiline(bookingInput.notes, FIELD_LIMITS.notes),
      },
      page: clean(source.page, FIELD_LIMITS.page),
    },
  };
}

/** The WhatsApp message that reaches the founder. */
export function buildBookingMessage(booking) {
  const { model, term, client, brief } = booking;
  const lines = [
    '*New booking request — NeverBeen AI Models*',
    '',
    `*Model*: ${model.name}${model.handle ? ` (${model.handle})` : ''}`,
    model.location ? `Based in ${model.location}` : '',
    model.slug ? `Portfolio: /ai-models/${model.slug}` : '',
    '',
    '*Term*',
    `${term.term}${term.detail ? ` — ${term.detail}` : ''}`,
    `Price: ${formatUsd(term.usd)} USD`,
    '',
    '*Shoot date*',
    formatShootDate(booking.shootDate),
    '',
    '*Client*',
    `Name: ${client.name}`,
    `Email: ${client.email}`,
    `Phone: ${client.phone}`,
    client.company ? `Company: ${client.company}` : '',
    '',
    '*Booking information*',
    brief.project ? `Project: ${brief.project}` : '',
    brief.location ? `Shoot location: ${brief.location}` : '',
    brief.usage ? `Usage: ${brief.usage}` : '',
    brief.notes ? `Notes: ${brief.notes}` : '',
    '',
    `Reference: ${booking.reference}`,
    `Requested: ${booking.requestedAt.slice(0, 16).replace('T', ' ')} UTC`,
    booking.page ? `Sent from: ${booking.page}` : '',
  ];

  return lines
    .filter((line, index, all) => !(line === '' && all[index - 1] === ''))
    .join('\n')
    .trim();
}

function jsonResponse(status, body) {
  return { status, body };
}

/**
 * Sends the message to the founder's WhatsApp through the WhatsApp Cloud API, or through the
 * development outbox when no credentials are configured.
 *
 * @returns {Promise<{ channel: string, delivered: boolean }|null>} null when nothing is configured.
 */
async function deliver({ message, env, fetchImpl, outbox }) {
  const token = env['WHATSAPP_TOKEN'];
  const phoneNumberId = env['WHATSAPP_PHONE_NUMBER_ID'];
  const recipient = env['FOUNDER_WHATSAPP_NUMBER'];

  if (token && phoneNumberId && recipient) {
    const response = await fetchImpl(
      `https://graph.facebook.com/${GRAPH_API_VERSION}/${phoneNumberId}/messages`,
      {
        method: 'POST',
        headers: {
          authorization: `Bearer ${token}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: recipient,
          type: 'text',
          text: { preview_url: false, body: message },
        }),
      },
    );

    if (!response.ok) {
      const detail = typeof response.text === 'function' ? await response.text() : '';
      throw new Error(
        `WhatsApp Cloud API responded ${response.status}${detail ? `: ${detail.slice(0, 200)}` : ''}`,
      );
    }
    return { channel: 'whatsapp', delivered: true };
  }

  if (typeof outbox === 'function') {
    await outbox(message);
    return { channel: 'outbox', delivered: false };
  }

  return null;
}

/**
 * Handles one booking submission.
 *
 * @param {object} options
 * @param {string} [options.method] HTTP method of the request.
 * @param {unknown} [options.payload] Parsed JSON body, when the method is POST.
 * @param {object} [options.env] Environment with the WhatsApp delivery secrets.
 * @param {Function} [options.fetchImpl] fetch implementation (injected for tests).
 * @param {Date} [options.now] Current time (injected for tests).
 * @param {Function} [options.outbox] Development sink used when no credentials are configured.
 * @returns {Promise<{ status: number, body: object }>}
 */
export async function handleModelBookingRequest({
  method = 'POST',
  payload = null,
  env = {},
  fetchImpl = globalThis.fetch,
  now = new Date(),
  outbox = null,
} = {}) {
  if (String(method).toUpperCase() !== 'POST') {
    return jsonResponse(405, { ok: false, error: 'method-not-allowed' });
  }

  const { errors, booking } = validateBookingRequest(payload, now);
  if (!booking) {
    return jsonResponse(422, {
      ok: false,
      error: 'validation',
      fields: Object.entries(errors).map(([field, message]) => ({ field, message })),
    });
  }

  const message = buildBookingMessage(booking);

  let delivery;
  try {
    delivery = await deliver({ message, env, fetchImpl, outbox });
  } catch (error) {
    console.error(`[ai-models] Booking delivery failed: ${error.message}`);
    return jsonResponse(502, { ok: false, error: 'delivery-failed', reference: booking.reference });
  }

  if (!delivery) {
    return jsonResponse(503, {
      ok: false,
      error: 'not-configured',
      reference: booking.reference,
      message: 'The studio booking channel is not connected yet.',
    });
  }

  return jsonResponse(200, {
    ok: true,
    delivered: delivery.delivered,
    channel: delivery.channel,
    reference: booking.reference,
    message:
      delivery.channel === 'whatsapp'
        ? 'Your request is on its way to the studio.'
        : 'Your request is saved in the studio outbox.',
  });
}
