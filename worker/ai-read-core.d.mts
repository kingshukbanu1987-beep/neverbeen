/**
 * Types for `ai-read-core.mjs` — the reading desk that analyses a visitor's turn (words,
 * photograph, document) with Google Translate, Gemini and OpenAI before she answers it. Shared by
 * the Cloudflare Worker (`worker/index.ts`), the local development API (`scripts/dev-api.mjs`) and
 * the tests.
 */

export declare const AI_READ_ENDPOINT: string;
export declare const MAX_READ_BODY_BYTES: number;
export declare const GEMINI_DEFAULT_MODEL: string;
export declare const OPENAI_DEFAULT_READ_MODEL: string;
export declare const MAX_READ_ATTACHMENT_BYTES: number;
export declare const READ_INTENTS: string[];
export declare const READ_SENTIMENTS: string[];
export declare const READ_ANALYST_BRIEF: string;

/** What the chat window posts to the reading desk. */
export interface ReadRequestPayload {
  text?: string;
  model?: { slug?: string; name?: string; handle?: string; location?: string; age?: string };
  user?: { name?: string; firstName?: string };
  /** What the window's own books already read, offered as a hint. */
  local?: {
    english?: string;
    language?: string;
    languageName?: string;
    romanised?: boolean;
    meaning?: string;
  };
  attachment?: {
    kind: 'photo' | 'document';
    name: string;
    type: string;
    dataUrl: string;
    note?: string;
  } | null;
  history?: { role: 'user' | 'model'; text: string }[];
}

/** The reading: what the visitor sent, in English, and what she should do with it. */
export interface ChatTurnReading {
  english: string;
  language: string;
  languageName: string;
  romanised: boolean;
  intent: string;
  sentiment: string;
  tone: string;
  about: string;
  wants: string;
  attachment: string;
  advice: string;
  provider: string;
}

export interface ReadTurn {
  text: string;
  model: { slug: string; name: string; handle: string; location: string; age: string };
  visitor: { name: string; firstName: string };
  local: {
    english: string;
    language: string;
    languageName: string;
    romanised: boolean;
    meaning: string;
  };
  attachment: {
    kind: 'photo' | 'document';
    name: string;
    type: string;
    dataUrl: string;
    note: string;
  } | null;
  history: { role: 'user' | 'model'; content: string }[];
}

/** What Google Translate made of the words. */
export interface GoogleTranslation {
  english: string;
  detected: string;
  provider: string;
}

export declare function cleanReadText(value: unknown, limit: number): string;
export declare function validateReadRequest(
  payload: unknown,
): { turn: ReadTurn; error?: undefined } | { turn?: undefined; error: string };
export declare function normaliseLanguageCode(raw: unknown): string;
export declare function languageNameFor(code: string): string;
export declare function translateThroughGoogle(
  text: string,
  env: Record<string, string | undefined>,
  fetchImpl?: typeof fetch,
): Promise<GoogleTranslation | null>;
export declare function buildReadInstruction(
  turn: ReadTurn,
  translation?: GoogleTranslation | null,
): string;
export declare function buildOpenAiReadBody(
  turn: ReadTurn,
  translation: GoogleTranslation | null,
  model?: string,
): Record<string, unknown>;
export declare function buildGeminiReadBody(
  turn: ReadTurn,
  translation: GoogleTranslation | null,
): Record<string, unknown>;
export declare function parseJsonObject(raw: unknown): Record<string, unknown> | null;
export declare function normaliseReading(
  raw: unknown,
  fallback?: ChatTurnReading | null,
): ChatTurnReading | null;
export declare function readWithGemini(
  turn: ReadTurn,
  translation: GoogleTranslation | null,
  env: Record<string, string | undefined>,
  fetchImpl?: typeof fetch,
): Promise<ChatTurnReading | null>;
export declare function readWithOpenAi(
  turn: ReadTurn,
  translation: GoogleTranslation | null,
  env: Record<string, string | undefined>,
  fetchImpl?: typeof fetch,
): Promise<ChatTurnReading | null>;
export declare function createAiReadResponse(options: {
  payload: unknown;
  env: Record<string, string | undefined>;
  fetchImpl?: typeof fetch;
}): Promise<Response>;
