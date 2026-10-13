/**
 * Types for `ai-selfie-core.mjs` — the camera that takes her selfie with Google Gemini's image
 * model from her own profile photograph, at the moment the chat has put her in. Shared by the
 * Cloudflare Worker (`worker/index.ts`), the local development API (`scripts/dev-api.mjs`) and the
 * tests.
 */

export declare const AI_SELFIE_ENDPOINT: string;
export declare const MAX_SELFIE_BODY_BYTES: number;
export declare const GEMINI_DEFAULT_IMAGE_MODEL: string;
export declare const MAX_SELFIE_REFERENCE_BYTES: number;
export declare const MAX_SELFIE_IMAGE_CHARS: number;

/** What the chat window posts to the camera. */
export interface SelfieRequestPayload {
  model?: { slug?: string; name?: string; handle?: string; location?: string; age?: string };
  /** The moment she says she is in — what the album frame used to stand for. */
  moment?: { place?: string; flaw?: string };
  /** How she looks on her profile card, in a few words. */
  look?: string;
  /** Her own profile photograph, as a data URL: the likeness the selfie is taken from. */
  reference?: string;
}

export interface SelfieRequest {
  model: { slug: string; name: string; handle: string; location: string; age: string };
  moment: { place: string; flaw: string };
  look: string;
  reference: string;
}

export declare function cleanSelfieText(value: unknown, limit: number): string;
export declare function validateSelfieRequest(
  payload: unknown,
): { request: SelfieRequest; error?: undefined } | { request?: undefined; error: string };
export declare function buildSelfiePrompt(request: SelfieRequest): string;
export declare function buildGeminiSelfieBody(request: SelfieRequest): Record<string, unknown>;
export declare function extractGeneratedImage(payload: unknown): string | null;
export declare function createAiSelfieResponse(options: {
  payload: unknown;
  env: Record<string, string | undefined>;
  fetchImpl?: typeof fetch;
}): Promise<Response>;
