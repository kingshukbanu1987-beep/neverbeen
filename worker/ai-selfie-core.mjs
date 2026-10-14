/**
 * Her camera — the selfie she takes now.
 *
 * Requirement: when the visitor asks her for a **selfie**, she does not hand over a frame from the
 * studio's album. She takes one — with Google Gemini's image model, using her own profile
 * photograph as the likeness, and the moment the chat has just put her in ("in my room, the lamp is
 * on", "on the balcony, far too bright"). What comes back is a phone selfie of her: the same woman,
 * a new photograph, at the moment she says she took it.
 *
 *   Gemini image model  `GEMINI_API_KEY`, `GEMINI_IMAGE_MODEL`
 *                       (default `gemini-3.1-flash-image`)
 *
 * With no key — and whenever the model refuses, times out or answers with something that is not a
 * picture — the endpoint answers `503 { ok: false, error: 'selfie-unavailable' }` and the chat
 * window sends one of her own album frames instead, the way it always used to: a visitor asking for
 * a photograph always gets one.
 *
 * The picture is generated server-side and comes back as a `data:` URL, so nothing is stored and
 * the visitor's own photograph never reaches the studio's albums.
 */

import { geminiGenerateContentUrl, geminiHeaders, logGeminiFailure } from './gemini-http.mjs';

export const AI_SELFIE_ENDPOINT = '/api/ai-selfie';

/** Her profile photograph travels with the request, so the body is a little larger than a turn. */
export const MAX_SELFIE_BODY_BYTES = 8 * 1024 * 1024;

/** Native image generation model, distinct from the text/reading model. */
export const GEMINI_DEFAULT_IMAGE_MODEL = 'gemini-3.1-flash-image';

/** The largest profile photograph the endpoint will send as the likeness reference. */
export const MAX_SELFIE_REFERENCE_BYTES = 5 * 1024 * 1024;

/** The largest selfie the endpoint will accept back from the model (about 6 MB of base64). */
export const MAX_SELFIE_IMAGE_CHARS = 8 * 1024 * 1024;

const LIMITS = {
  name: 120,
  handle: 80,
  location: 160,
  age: 20,
  place: 240,
  flaw: 240,
  look: 400,
  moment: 400,
};

/** Trims a value to a string of at most `limit` characters. */
export function cleanSelfieText(value, limit) {
  if (typeof value !== 'string') return '';
  return value.replace(/\s+/g, ' ').trim().slice(0, limit);
}

/** Validates the window's selfie request. Returns the parsed request, or a message naming the problem. */
export function validateSelfieRequest(payload) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return { error: 'invalid-payload' };
  }

  const model = payload.model && typeof payload.model === 'object' ? payload.model : {};
  const moment = payload.moment && typeof payload.moment === 'object' ? payload.moment : {};
  const reference = typeof payload.reference === 'string' ? payload.reference : '';
  const usableReference =
    reference.startsWith('data:image/') && reference.length <= MAX_SELFIE_REFERENCE_BYTES;

  return {
    request: {
      model: {
        slug: cleanSelfieText(model.slug, LIMITS.name),
        name: cleanSelfieText(model.name, LIMITS.name),
        handle: cleanSelfieText(model.handle, LIMITS.handle),
        location: cleanSelfieText(model.location, LIMITS.location),
        age: cleanSelfieText(model.age, LIMITS.age),
      },
      /** What she says she is doing this minute — the moment the album frame used to stand for. */
      moment: {
        place: cleanSelfieText(moment.place, LIMITS.place),
        flaw: cleanSelfieText(moment.flaw, LIMITS.flaw),
      },
      /** How she looks in her own profile photograph, so the selfie keeps her features. */
      look: cleanSelfieText(payload.look, LIMITS.look),
      reference: usableReference ? reference : '',
    },
  };
}

/**
 * The prompt the image model is given: the woman from the reference photograph, the moment she has
 * just described, and the rules that make it a phone selfie rather than a studio frame.
 */
export function buildSelfiePrompt(request) {
  const who = request.model.name || 'the woman in the reference photograph';
  const place = request.moment.place || 'at home, in ordinary afternoon light';
  const flaw = request.moment.flaw || 'no filter, unchanged, sent as it came out';

  return [
    `Take a new photograph of ${who} — the exact woman in the reference photograph — as a selfie she is taking on her own phone right now.`,
    request.look
      ? `Keep her the woman in the reference image: her face, her features, her hair, her skin and her age. She is ${request.look}.`
      : 'Keep her the woman in the reference image: her face, her features, her hair, her skin and her age.',
    `The photograph is taken ${place}.`,
    `It is a casual phone selfie, not a studio photograph: the phone held at arm's length, slightly off-centre framing, the ordinary room or street behind her out of focus, mixed natural and house light, honest skin texture, a small imperfection, and this truth about it — ${flaw}.`,
    'Portrait orientation, about three quarters of her body or closer, looking into the camera as somebody who is enjoying the conversation.',
    'No text, no captions, no watermark, no logo, no extra people, no collage and no borders. One single photograph.',
  ].join(' ');
}

/** The Gemini body: the prompt and her own profile photograph as the likeness reference. */
export function buildGeminiSelfieBody(request) {
  const parts = [{ text: buildSelfiePrompt(request) }];

  if (request.reference) {
    const comma = request.reference.indexOf(',');
    const meta = comma > 0 ? request.reference.slice(5, comma) : '';
    const base64 = comma > 0 ? request.reference.slice(comma + 1) : '';
    if (base64) {
      parts.push({ inlineData: { mimeType: meta.split(';')[0] || 'image/jpeg', data: base64 } });
    }
  }

  return {
    contents: [{ role: 'user', parts }],
    generationConfig: { responseModalities: ['IMAGE'] },
  };
}

/**
 * The first picture in a Gemini answer, as a `data:` URL — or `null` when the answer carried words
 * instead of an image (which is how a refused request comes back).
 */
export function extractGeneratedImage(payload) {
  const parts = payload?.candidates?.[0]?.content?.parts;
  if (!Array.isArray(parts)) return null;

  for (const part of parts) {
    const inline = part?.inlineData ?? part?.inline_data;
    const data = inline?.data;
    if (typeof data !== 'string' || data.length === 0) continue;
    if (data.length > MAX_SELFIE_IMAGE_CHARS) continue;
    const mimeType = cleanSelfieText(inline?.mimeType ?? inline?.mime_type, 40) || 'image/png';
    if (!mimeType.startsWith('image/')) continue;
    return `data:${mimeType};base64,${data}`;
  }

  return null;
}

function jsonResponse(status, body) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  });
}

/**
 * `POST /api/ai-selfie` — she takes the selfie now. Answers JSON:
 *
 *   { ok: true, provider: "gemini", image: "data:image/png;base64,…" }
 *
 * Without an image key the endpoint answers `503 { ok: false, error: 'selfie-unavailable' }` and
 * the window sends one of her album frames instead, so a visitor who asks for a photograph always
 * gets one.
 */
export async function createAiSelfieResponse({ payload, env, fetchImpl = fetch }) {
  const validated = validateSelfieRequest(payload);
  if (validated.error) {
    return jsonResponse(400, { ok: false, error: validated.error });
  }

  const key = env.GEMINI_API_KEY?.trim();
  if (!key) {
    return jsonResponse(503, { ok: false, error: 'selfie-unavailable' });
  }

  const request = validated.request;
  const model = env.GEMINI_IMAGE_MODEL?.trim() || GEMINI_DEFAULT_IMAGE_MODEL;

  let upstream;
  try {
    upstream = await fetchImpl(geminiGenerateContentUrl(model), {
      method: 'POST',
      headers: geminiHeaders(key),
      body: JSON.stringify(buildGeminiSelfieBody(request)),
    });
  } catch {
    return jsonResponse(502, { ok: false, error: 'selfie-failed' });
  }

  if (!upstream.ok) {
    await logGeminiFailure('ai-selfie', model, upstream);
    return jsonResponse(502, { ok: false, error: 'selfie-failed' });
  }

  let parsed;
  try {
    parsed = await upstream.json();
  } catch {
    return jsonResponse(502, { ok: false, error: 'selfie-failed' });
  }

  const image = extractGeneratedImage(parsed);
  if (!image) {
    // The image model answered with words — a refusal, or a safety stop. She falls back to her own
    // album rather than showing the visitor an empty bubble.
    return jsonResponse(502, { ok: false, error: 'selfie-refused' });
  }

  return jsonResponse(200, {
    ok: true,
    provider: 'gemini',
    model,
    image,
    place: request.moment.place,
    flaw: request.moment.flaw,
  });
}
