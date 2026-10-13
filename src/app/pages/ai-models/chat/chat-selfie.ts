/**
 * E — she takes a selfie.
 *
 * When the visitor asks for a selfie she does not hand over a frame from the studio's album: she
 * **takes one now**. Her own profile photograph goes to the studio's camera
 * (`POST /api/ai-selfie`, see `worker/ai-selfie-core.mjs`), Google Gemini's image model photographs
 * her from it, and the picture comes back as a data URL — the same woman, a new photograph, at the
 * moment the chat has just put her in. The window then dresses it like a phone photograph
 * (`.is-selfie` in `ai-model-chat.css`): portrait crop, a tilt, grain, a glare and a timestamp.
 *
 * Her album is kept for two things and nothing else:
 *
 *   - the likeness the camera photographs her *from* — the frame above (`selfieReference()`);
 *   - the fallback, when the studio has no image key or the model refuses: a visitor who asks for a
 *     photograph always gets one, so an album frame goes out instead, exactly as it used to.
 *
 * J's video rule lives next to it, in `videoRefusal()`.
 */
import { AiModelProfile } from '../ai-model-data';
import { seededPick } from './chat-random';

/**
 * The word itself: a visitor who asks for a *selfie* gets one taken now (her camera, above). A
 * visitor who asks for her *photos* is asking for her album, and gets the frame they asked for.
 */
export const SELFIE_WORD_PATTERN = /\bselfie?s?\b|\bselfis?\b/;

/** Asking for a picture of her rather than about the studio's work. */
export const SELFIE_REQUEST_PATTERN =
  /\bselfies?\b|\b(?:send|share|show|give|post|see)\b[^?]{0,28}\b(?:your|ur)\b[^?]{0,12}\b(?:photo|photos|pic|pics|picture|pictures|face|self)\b|\b(?:photo|pic|picture|selfie)s?\s+of\s+(?:you|yourself)\b|\bshow me (?:you|yourself)\b/;

/** Asking her for a video. */
export const VIDEO_REQUEST_PATTERN =
  /\b(?:send|share|give|post|make|record|shoot|show)\b[^?]{0,28}\b(?:video|videos|clip|clips|reel|reels)\b|\b(?:video|videos|clip|clips|reel|reels)\b[^?]{0,18}\b(?:of you|yours)\b|\byour videos?\b|\b(?:any|some|more|another)\s+(?:video|videos|clip|clips|reel|reels)\b|\b(?:video|videos|clip|clips|reels?)\s*\?/;

export interface ChatSelfie {
  /** One of her own photographs, sent as if it had just been taken on her phone. */
  photo: string;
  /** Where she says she is. */
  place: string;
  /** The flaw she admits to. */
  flaw: string;
}

const SELFIE_MOMENTS: readonly { place: string; flaw: string }[] = [
  {
    place: 'in my room, the lamp is on and it is too warm in here',
    flaw: 'no filter, no makeup, this is the real thing',
  },
  { place: 'on the balcony, it is far too bright out here', flaw: 'I am squinting like an idiot' },
  {
    place: 'in the kitchen waiting for the coffee',
    flaw: 'my hair is doing whatever it wants today',
  },
  {
    place: 'in the car before a shoot',
    flaw: 'it came out slightly crooked and I left it that way',
  },
  {
    place: 'on the studio stairs, terrible light in that stairwell',
    flaw: 'the light went straight across my face',
  },
  {
    place: 'on the roof, it is almost dark already',
    flaw: 'grainy, my phone is old and I refuse to replace it',
  },
  {
    place: 'in a café corner, hiding from the afternoon',
    flaw: 'I moved while it was taking, so it is a little blurred',
  },
  {
    place: 'in the lift of my building, the lighting there is a crime',
    flaw: 'I did not even check it before sending',
  },
  {
    place: 'lying down, which is a bad idea for a photograph',
    flaw: 'this is a terrible angle and I am sending it anyway',
  },
  {
    place: 'by the window with the curtain half closed',
    flaw: 'half of my face is in shadow, sorry',
  },
];

/** Her camera, server-side. */
export const AI_SELFIE_ENDPOINT = '/api/ai-selfie';

/** How long her camera is given before she sends a frame from her own album instead. */
export const AI_SELFIE_TIMEOUT_MS = 30_000;

const SELFIE_OPENERS: readonly string[] = [
  'Fine, here — one from just now.',
  'Okay, okay. Only because you asked nicely.',
  'You are lucky I am in a good mood.',
  'One, and then you owe me a photograph of you.',
  'Alright — but this one is not the polished version of me.',
];

/** The moment she is in, and the flaw she admits to — where and how the selfie was taken. */
export function pickSelfieMoment(seed: string): { place: string; flaw: string } {
  return seededPick(SELFIE_MOMENTS, `${seed}|moment`);
}

/** Picks the frame she sends, the moment she is in and the flaw she admits to. */
export function pickChatSelfie(
  model: AiModelProfile,
  seed: string,
  exclude: readonly string[] = [],
): ChatSelfie | null {
  const sources = model.photos.map((photo) => photo.src);
  const album = (sources.length > 0 ? sources : model.cover ? [model.cover] : []).filter(
    (photo) => !exclude.includes(photo),
  );
  const pool = album.length > 0 ? album : sources;
  if (pool.length === 0) return null;

  const moment = pickSelfieMoment(seed);
  // Counted, so two selfies in one session are never the same photograph.
  const photo = seededPick(pool, `${seed}|photo|${exclude.length}`);
  return { photo, place: moment.place, flaw: moment.flaw };
}

// ------------------------------------------------------------------ her camera

/**
 * The photograph the camera is given to photograph her from: her profile card's own cover first,
 * then the first frame of her album. Empty when she has neither, and then no selfie is taken.
 */
export function selfieReference(model: AiModelProfile): string {
  return model.cover || model.photos[0]?.src || '';
}

/**
 * How she looks, in the few words the camera is given alongside her photograph. Her age and where
 * she is from, because a selfie has to look like a woman of that age from that place, and nothing
 * about her body: her photograph already holds the likeness.
 */
export function selfieLook(model: AiModelProfile): string {
  const city = model.location.split(',')[0]?.trim() ?? '';
  const parts = [
    model.age ? `${model.age} years old` : '',
    city ? `living in ${city}` : '',
    'in the middle of an ordinary evening at home',
  ].filter(Boolean);
  return parts.join(', ');
}

/** The largest side of the likeness photograph sent to the studio's camera. */
const SELFIE_REFERENCE_SIDE = 768;

/** The largest likeness sent without being downscaled first (a browser without a canvas). */
const SELFIE_REFERENCE_RAW_BYTES = 1_200_000;

/**
 * Her profile photograph, downscaled, as a data URL — the likeness the selfie is taken from. The
 * picture is already on this site, so it is fetched from the same origin (the cache usually has it)
 * and drawn into a small canvas. A browser without a canvas sends her own bytes instead, when they
 * are small enough to travel. Returns `''` when the photograph cannot be read at all, and the chat
 * then sends one of her album frames instead of a selfie taken now.
 */
export async function readSelfieReference(
  url: string,
  fetchImpl: typeof fetch | null = typeof fetch === 'function' ? fetch : null,
): Promise<string> {
  if (!url || !fetchImpl || typeof document === 'undefined') return '';

  try {
    const response = await fetchImpl(url);
    if (!response.ok) return '';
    const type = (response.headers.get('content-type') || 'image/jpeg').split(';')[0].trim();
    if (!type.startsWith('image/')) return '';

    const bytes = new Uint8Array(await response.arrayBuffer());
    if (bytes.length === 0) return '';

    const downscaled = await downscaleSelfieReference(bytes, type);
    if (downscaled) return downscaled;

    // No canvas — a small photograph travels exactly as it is, and a large one is left alone (she
    // has album frames, and a selfie is never worth sending a browser to its knees for).
    if (bytes.length > SELFIE_REFERENCE_RAW_BYTES) return '';
    return `data:${type};base64,${bytesToBase64(bytes)}`;
  } catch {
    return '';
  }
}

/** Her photograph drawn small, when the browser has a canvas to draw it on. */
async function downscaleSelfieReference(bytes: Uint8Array, type: string): Promise<string> {
  if (typeof URL === 'undefined' || typeof URL.createObjectURL !== 'function') return '';

  const canvas = document.createElement('canvas');
  const context = canvas.getContext?.('2d');
  if (!context) return '';

  const objectUrl = URL.createObjectURL(new Blob([bytes.slice().buffer], { type }));
  try {
    const image = await loadSelfieImage(objectUrl);
    const longest = Math.max(image.naturalWidth, image.naturalHeight);
    if (!Number.isFinite(longest) || longest <= 0) return '';

    const scale = Math.min(1, SELFIE_REFERENCE_SIDE / longest);
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.88);
    return dataUrl.startsWith('data:image/') ? dataUrl : '';
  } catch {
    return '';
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

/** A picture's bytes as base64, in chunks so a large photograph cannot overflow the call stack. */
function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  const chunk = 0x8000;
  for (let index = 0; index < bytes.length; index += chunk) {
    binary += String.fromCharCode(...bytes.subarray(index, index + chunk));
  }
  return typeof btoa === 'function' ? btoa(binary) : '';
}

/** How long her own likeness is given to load before the album frame is used instead. */
const SELFIE_REFERENCE_LOAD_MS = 4_000;

function loadSelfieImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    const giveUp = setTimeout(
      () => reject(new Error('photograph never loaded')),
      SELFIE_REFERENCE_LOAD_MS,
    );
    const done = (): void => clearTimeout(giveUp);
    image.onload = () => {
      done();
      resolve(image);
    };
    image.onerror = () => {
      done();
      reject(new Error('unreadable photograph'));
    };
    image.src = url;
  });
}

export interface GeneratedSelfie {
  /** The photograph the camera took, as a data URL. */
  image: string;
  /** Who took it: `gemini`. */
  provider: string;
}

/**
 * E — she takes the selfie now: her own photograph and the moment she is in go to the studio's
 * camera, and a new photograph comes back. Returns `null` when the studio has no image key, the
 * camera is unreachable, or the model answered with words instead of a picture — and the caller
 * then sends one of her own album frames, so the visitor always gets a photograph.
 */
export async function generateChatSelfie(input: {
  model: AiModelProfile;
  /** The moment she says she is in — where the photograph is taken and what is imperfect about it. */
  moment: { place: string; flaw: string };
  /** Her profile photograph, as a data URL. Without it the camera is not asked. */
  reference: string;
  fetchImpl?: typeof fetch | null;
}): Promise<GeneratedSelfie | null> {
  const fetchImpl = input.fetchImpl ?? (typeof fetch === 'function' ? fetch : null);
  if (!fetchImpl || !input.reference.startsWith('data:image/')) return null;

  const controller = typeof AbortController === 'function' ? new AbortController() : null;
  const timeout = controller ? setTimeout(() => controller.abort(), AI_SELFIE_TIMEOUT_MS) : null;

  try {
    const response = await fetchImpl(AI_SELFIE_ENDPOINT, {
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
        moment: { place: input.moment.place, flaw: input.moment.flaw },
        look: selfieLook(input.model),
        reference: input.reference,
      }),
      signal: controller?.signal,
    });
    if (!response.ok) return null;

    const payload = (await response.json()) as { image?: unknown; provider?: unknown } | null;
    const image = typeof payload?.image === 'string' ? payload.image : '';
    if (!image.startsWith('data:image/')) return null;
    return { image, provider: typeof payload?.provider === 'string' ? payload.provider : 'gemini' };
  } catch {
    return null;
  } finally {
    if (timeout !== null) clearTimeout(timeout);
  }
}

/** Her words when the frame goes out — the phone-photograph apology a person always adds. */
export function selfieCaption(
  model: AiModelProfile,
  selfie: ChatSelfie,
  seed: string,
  name: string,
): string {
  const first = model.name.split(' ')[0];
  const opener = seededPick(SELFIE_OPENERS, `${seed}|opener`);
  const who = name ? ` ${name},` : '';
  const aside = seededPick(
    [
      `${first} at home, in other words.`,
      `You can see my whole life in the background, which is embarrassing.`,
      `Not for anyone else, alright?`,
      `Do not judge the wall behind me.`,
    ],
    `${seed}|aside`,
  );
  return `${opener}${who} I took it a minute ago, ${selfie.place}. ${selfie.flaw} 🙈 ${aside}`;
}
