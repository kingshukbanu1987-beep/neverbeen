/**
 * Types for `ai-chat-core.mjs`, the AI model chat logic shared by the Cloudflare Worker
 * (`worker/index.ts`), the local development API (`scripts/dev-api.mjs`) and the tests.
 */

export declare const AI_CHAT_ENDPOINT: string;
export declare const MAX_CHAT_BODY_BYTES: number;
export declare const OPENAI_DEFAULT_MODEL: string;
export declare const MAX_ATTACHMENT_DATA_URL: number;
export declare const CHAT_PERSONA_RULES: string;

/** One live Google result behind an answer. */
export interface ChatSearchResult {
  title: string;
  url: string;
  snippet: string;
}

/** What the chat window posts to the endpoint. */
export interface ChatRequestPayload {
  model?: { slug?: string; name?: string; handle?: string; location?: string; age?: string };
  dossier?: string;
  question?: string;
  history?: { role: 'user' | 'model'; text: string }[];
  attachment?: { kind: 'photo' | 'document'; name: string; type: string; dataUrl: string } | null;
}

export interface ChatTurn {
  question: string;
  dossier: string;
  model: { slug: string; name: string; handle: string; location: string; age: string };
  history: { role: 'user' | 'assistant'; content: string }[];
  attachment: { kind: 'photo' | 'document'; name: string; type: string; dataUrl: string } | null;
  customRules: string;
}

export declare function cleanChatText(value: unknown, limit: number): string;
export declare function validateChatRequest(
  payload: unknown,
): { turn: ChatTurn; error?: undefined } | { turn?: undefined; error: string };
export declare function buildChatSystemPrompt(
  turn: ChatTurn,
  searchResults?: ChatSearchResult[],
): string;
export declare function buildOpenAiChatBody(
  turn: ChatTurn,
  searchResults?: ChatSearchResult[],
  model?: string,
): Record<string, unknown>;
export declare function searchGoogle(
  question: string,
  env: Record<string, string | undefined>,
  fetchImpl?: typeof fetch,
): Promise<ChatSearchResult[]>;
export declare function createAiChatResponse(options: {
  payload: unknown;
  env: Record<string, string | undefined>;
  fetchImpl?: typeof fetch;
}): Promise<Response>;
