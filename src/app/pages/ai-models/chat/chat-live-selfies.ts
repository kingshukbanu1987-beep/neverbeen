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
 *
 * A failure is reported as a **reason**, not as a verdict on the whole session: `unavailable`
 * (the studio has no image key — definitive, and her old camera reads the same key, so it is not
 * asked either) or `transient` (a timeout, a throttle, a network blip, a refusal — worth asking
 * again shortly). The chat service turns those reasons into short, per-camera cooldowns, so one
 * failed request never decides the rest of the visit.
 */
import { AiModelProfile } from '../ai-model-data';
import { ChatSelfieFailure, selfieLook } from './chat-selfie';
import { timeZoneForPlace } from './chat-world';

/** Where the window asks for the two live photographs. */
export const LIVE_CHAT_SELFIES_ENDPOINT = '/api/livechatselfiesandphotos';

/**
 * How long the service is given before the window falls back to her album. Two photographs are
 * generated in parallel, and an image model under load can take a while — the budget is wide
 * enough that a slow answer still arrives instead of being cut down into a fallback.
 */
export const LIVE_CHAT_SELFIES_TIMEOUT_MS = 60_000;

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

/** Either the two photographs, or the reason there are none — never a bare, unexplained `null`. */
export type LiveChatSelfiesOutcome =
  | { ok: true; selfies: GeneratedLiveChatSelfies }
  | { ok: false; reason: ChatSelfieFailure };

/**
 * Asks the service for two fresh photographs of the model. The answer carries **why** when there
 * are no photographs — so the chat can rest the right camera for the right length of time, send
 * one of her own album frames for now, and try the service again on a later request: a visitor
 * who asks always gets a photograph, and a single failed request never decides the session.
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
}): Promise<LiveChatSelfiesOutcome> {
  const fetchImpl = input.fetchImpl ?? (typeof fetch === 'function' ? fetch : null);
  if (!fetchImpl || !input.reference.startsWith('data:image/')) {
    return { ok: false, reason: 'no-reference' };
  }

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
    if (!response.ok) {
      // `503 selfies-unavailable` is the studio saying "no image key" — definitive, and her old
      // camera reads the same key. Everything else (a throttle, a timeout, an upstream failure,
      // a refusal) is transient: the service is asked again on a later request.
      return { ok: false, reason: response.status === 503 ? 'unavailable' : 'transient' };
    }

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
    if (images.length === 0) return { ok: false, reason: 'transient' };

    return {
      ok: true,
      selfies: {
        images,
        place: typeof payload?.place === 'string' && payload.place ? payload.place : '',
        flaw: typeof payload?.flaw === 'string' && payload.flaw ? payload.flaw : '',
        timestamp: typeof payload?.timestamp === 'string' ? payload.timestamp : '',
        watermark: typeof payload?.watermark === 'string' ? payload.watermark : '',
      },
    };
  } catch {
    return { ok: false, reason: 'transient' };
  } finally {
    if (timeout !== null) clearTimeout(timeout);
  }
}
