/**
 * Types for `livechatselfiesandphotos.mjs` — the live-chat selfie and photo service that generates
 * two fresh photographs of the model (same outfit, same ambience, different poses) at the moment
 * the chat is in, stamped with her local timestamp and the phone watermark. Shared by the
 * Cloudflare Worker (`worker/index.ts`), the local development API (`scripts/dev-api.mjs`), the
 * chat window and the tests.
 */

export declare const LIVE_CHAT_SELFIES_ENDPOINT: string;
export declare const MAX_LIVE_CHAT_BODY_BYTES: number;
export declare const MAX_LIVE_CHAT_REFERENCE_BYTES: number;
export declare const LIVE_CHAT_PHOTO_COUNT: number;
export declare const LIVE_CHAT_PHONE_WATERMARK_DEFAULT: string;
export declare const COUNTRY_TIME_ZONES: Record<string, string>;
export declare const SELFIE_EXPRESSIONS: readonly string[];
export declare const SELFIE_POSES: readonly string[];
export declare const SELFIE_PHOTOGRAPHY_FLAWS: readonly string[];

/** What the chat window posts to the service. */
export interface LiveChatSelfiesPayload {
  model?: { slug?: string; name?: string; handle?: string; location?: string; age?: string };
  /** The moment she says she is in — a fallback setting; the service picks the real ambience. */
  moment?: { place?: string; flaw?: string };
  /** How she looks on her profile card, in a few words. */
  look?: string;
  /** Her own profile photograph, as a data URL: the likeness the selfies are taken from. */
  reference?: string;
  /** The model's IANA time zone, when the window knows it — otherwise her city and country decide. */
  timezone?: string;
  /** The salt on the setting and poses, so one chat session never photographs her the same way. */
  seed?: string;
}

export interface LiveChatSelfiesRequest {
  model: { slug: string; name: string; handle: string; location: string; age: string };
  moment: { place: string; flaw: string };
  look: string;
  reference: string;
  timezone: string;
  seed: string;
}

/** Her local moment: the hour in her own time zone, the light it brings, and the stamp. */
export interface ModelLocalMoment {
  zone: string;
  hour: number;
  minute: number;
  phase: 'morning' | 'afternoon' | 'evening' | 'night';
  timeLabel: string;
  timestamp: string;
}

/** Where she is standing: the ambience that matches her country, city and current hour. */
export interface ModelAmbience {
  place: string;
  phase: ModelLocalMoment['phase'];
  timeLabel: string;
  text: string;
}

/** The shared scene both photographs are taken in — one setting, one expression, two poses. */
export interface LiveChatSelfieScene {
  ambience: ModelAmbience;
  expression: string;
  flaws: [string, string];
  poses: [string, string];
  flaw: string;
}

export declare function resolveModelTimeZone(location: unknown, timezone: unknown): string;
export declare function phaseForHour(hour: number): ModelLocalMoment['phase'];
export declare function modelLocalMoment(options?: {
  location?: string;
  timezone?: string;
  now?: Date;
}): ModelLocalMoment;
export declare function ambienceFor(options: {
  location?: string;
  moment: ModelLocalMoment;
  seed?: string;
}): ModelAmbience;
export declare function liveChatSelfieScene(options: {
  location?: string;
  moment: ModelLocalMoment;
  seed?: string;
}): LiveChatSelfieScene;
export declare function buildLiveChatSelfiePrompt(
  request: LiveChatSelfiesRequest,
  variant: {
    ambience: ModelAmbience;
    expression: string;
    pose: string;
    flaw: string;
    timestamp: string;
    watermark: string;
  },
): string;
export declare function buildGeminiLiveChatSelfiesBody(
  request: LiveChatSelfiesRequest,
  variant: {
    ambience: ModelAmbience;
    expression: string;
    pose: string;
    flaw: string;
    timestamp: string;
    watermark: string;
  },
): Record<string, unknown>;
export declare function validateLiveChatSelfiesRequest(
  payload: unknown,
): { request: LiveChatSelfiesRequest; error?: undefined } | { request?: undefined; error: string };
export declare function createLiveChatSelfiesResponse(options: {
  payload: unknown;
  env: Record<string, string | undefined>;
  fetchImpl?: typeof fetch;
}): Promise<Response>;
