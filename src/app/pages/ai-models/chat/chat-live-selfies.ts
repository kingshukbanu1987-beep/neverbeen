/**
 * The window's client for the **`livechatselfiesandphotos`** service (`POST
 * /api/livechatselfiesandphotos` — see `worker/livechatselfiesandphotos.mjs`).
 *
 * When the visitor asks the model for a **selfie** in the live chat, this client calls the
 * service and gets **two fresh photographs of her** back: the same outfit and the same ambience
 * in both, different poses and a different style, light and streets chosen from the model's own
 * country, city and current local hour, stamped in the corner with her timestamp and the phone
 * watermark as if she had just clicked them.
 *
 * The photographs come back as `data:` URLs and are never uploaded anywhere else: they live only
 * in the browser, are flagged `ephemeral` on their bubbles, and are dropped from the transcript
 * the moment the chat session ends.
 */
import { AiModelProfile } from '../ai-model-data';
import { selfieLook } from './chat-selfie';
import { timeZoneForPlace } from './chat-world';

/** Where the window asks for the two live photographs. */
export const LIVE_CHAT_SELFIES_ENDPOINT = '/api/livechatselfiesandphotos';

/** How long the service is given before the window falls back to her album. */
export const LIVE_CHAT_SELFIES_TIMEOUT_MS = 45_000;

export interface GeneratedLiveChatSelfies {
  /** The two photographs, as data URLs — same outfit and ambience, different poses. */
  images: string[];
  /** Where they were taken, in her voice — the caption's "in the kitchen, waiting for coffee". */
  place: string;
  /** The photography flaw she admits to in her caption. */
  flaw: string;
  /** The timestamp stamped on the bottom-right corner of both photographs. */
  timestamp: string;
  /** The phone watermark stamped with it. */
  watermark: string;
}

/**
 * Asks the service for two fresh photographs of the model. Returns `null` — so the chat sends one
 * of her own album frames instead, and a visitor who asked always gets a photograph — when the
 * studio has no image key, the service is unreachable, or it answers with words instead of
 * pictures.
 */
export async function generateLiveChatSelfies(input: {
  model: AiModelProfile;
  /** The moment the chat put her in — a hint only: the service picks the real ambience. */
  moment?: { place: string; flaw: string };
  /** Her profile photograph, as a data URL. Without it the service is not asked. */
  reference: string;
  /** Salt for the setting and poses, so one session never photographs her the same way twice. */
  seed?: string;
  fetchImpl?: typeof fetch | null;
}): Promise<GeneratedLiveChatSelfies | null> {
  const fetchImpl = input.fetchImpl ?? (typeof fetch === 'function' ? fetch : null);
  if (!fetchImpl || !input.reference.startsWith('data:image/')) return null;

  const controller = typeof AbortController === 'function' ? new AbortController() : null;
  const timeout = controller
    ? setTimeout(() => controller.abort(), LIVE_CHAT_SELFIES_TIMEOUT_MS)
    : null;

  try {
    const response = await fetchImpl(LIVE_CHAT_SELFIES_ENDPOINT, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        model: {
          slug: input.model.slug,
          name: input.model.name,
          handle: input.model.handle,
          location: input.model.location,
          age: input.model.age,
        },
        moment: {
          place: input.moment?.place ?? '',
          flaw: input.moment?.flaw ?? '',
        },
        look: selfieLook(input.model),
        // Her own clock: the service photographs her by the hour in **her** country and city, not
        // by the visitor's.
        timezone: timeZoneForPlace(input.model.location) ?? '',
        seed: input.seed ?? '',
        reference: input.reference,
      }),
      signal: controller?.signal,
    });
    if (!response.ok) return null;

    const payload = (await response.json()) as {
      images?: unknown;
      place?: unknown;
      flaw?: unknown;
      timestamp?: unknown;
      watermark?: unknown;
    } | null;
    const images = Array.isArray(payload?.images)
      ? payload.images.filter(
          (image): image is string => typeof image === 'string' && image.startsWith('data:image/'),
        )
      : [];
    if (images.length === 0) return null;

    return {
      images,
      place: typeof payload?.place === 'string' && payload.place ? payload.place : '',
      flaw: typeof payload?.flaw === 'string' && payload.flaw ? payload.flaw : '',
      timestamp: typeof payload?.timestamp === 'string' ? payload.timestamp : '',
      watermark: typeof payload?.watermark === 'string' ? payload.watermark : '',
    };
  } catch {
    return null;
  } finally {
    if (timeout !== null) clearTimeout(timeout);
  }
}
