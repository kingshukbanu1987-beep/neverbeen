/**
 * The reading desk, in the window.
 *
 * Requirement: nothing a visitor sends — their words, their photograph, their document — is answered
 * before it has been read. This module is that reading, in two passes:
 *
 *   1. **The window's own reading**, instantly and offline: `chat-input.ts` repairs the typing,
 *      `chat-language.ts` reads the language from the studio's books, `chat-photo.ts` looks at the
 *      frame the visitor attached. It always produces a reading, even with no network at all.
 *   2. **The studio's reading desk**, when it is configured: `POST /api/ai-read`
 *      (see `worker/ai-read-core.mjs`) puts the same turn through Google Translate and then through
 *      Google Gemini or OpenAI — a structured reading of what the visitor meant, the language they
 *      wrote in, their intent, their feeling, their tone, and what a photograph or a document
 *      actually contained. Its reading replaces the window's where it has something to say, and the
 *      window's own reading fills the gaps.
 *
 * The finished reading is handed to the reply engine (`chat-replies.ts`) and to the studio's answer
 * endpoint (`worker/ai-chat-core.mjs`), so the answer is always an answer to the meaning and never
 * to the letters somebody typed. Nothing of this is ever shown to the visitor.
 */
import { AiModelProfile } from '../ai-model-data';
import {
  ChatVisitorLanguage,
  ROMANISED_LANGUAGE_BOOKS,
  RomanisedLanguageCode,
} from './chat-language';
import { readVisitorMessage } from './chat-input';
import { ChatPhotoFacts } from './chat-photo';
import { AiChatAttachment, AiChatMessage } from './chat-types';

/** Where a reading came from. */
export type ChatReadingSource = 'studio' | 'local';

/**
 * What one visitor turn means, as the window and the reading desk read it. Every field is a plain
 * string so a reading can travel to the answer endpoint as JSON without losing anything.
 */
export interface ChatTurnReading {
  /** `studio` when the reading desk answered, `local` when the window read it alone. */
  source: ChatReadingSource;
  /** Who read it: `gemini`, `openai`, `google-translate`, `studio` (the window's own books). */
  provider: string;
  /** The visitor's message written out in plain English, typos repaired and languages translated. */
  english: string;
  /** The language they wrote in, when the studio has a book for it. */
  language: RomanisedLanguageCode | '';
  languageName: string;
  romanised: boolean;
  /** `compliment`, `selfie`, `personal`, `question`… — what the turn is. */
  intent: string;
  /** `warm`, `happy`, `playful`, `flirty`, `neutral`, `sad`, `angry`. */
  sentiment: string;
  /** How they wrote it, in a few words. */
  tone: string;
  /** What the message is about. */
  about: string;
  /** What they seem to want back. */
  wants: string;
  /** What their photograph or document contained, as the reading desk saw it. */
  attachment: string;
  /** One line of advice for her answer. */
  advice: string;
}

/** How long the reading desk is given before the window's own reading is used instead. */
export const AI_READ_TIMEOUT_MS = 20_000;

/** The reading desk's endpoint. */
export const AI_READ_ENDPOINT = '/api/ai-read';

/** The languages the studio has a book for, as a set of codes. */
const KNOWN_LANGUAGES = new Set(Object.keys(ROMANISED_LANGUAGE_BOOKS));

/** The colour and the light of a frame, in the words the reading uses. */
function localPhotoNote(facts: ChatPhotoFacts | null): string {
  if (!facts) return '';
  const light =
    facts.brightness < 0.28 ? 'dark' : facts.brightness > 0.72 ? 'very bright' : 'evenly lit';
  const colour = facts.dominant || 'natural';
  const who = facts.skin >= 0.06 ? 'with a person in it' : 'with nobody in it';
  return `a ${facts.orientation} photograph, ${light}, mostly ${colour}, ${who}`;
}

/**
 * The window's own reading of one turn: always available, always instant, and the reading the chat
 * falls back on when the studio has no key or the network is gone.
 */
export function localTurnReading(input: {
  text: string;
  attachment?: AiChatAttachment | null;
  language?: ChatVisitorLanguage | null;
  photo?: ChatPhotoFacts | null;
  model: AiModelProfile;
}): ChatTurnReading {
  const reading = readVisitorMessage(input.text ?? '');
  const language = input.language ?? null;
  void input.model;
  const english = language?.english?.trim() || reading.analysed.trim();
  const attachment = input.attachment ?? null;

  return {
    source: 'local',
    provider: 'studio',
    english,
    language: language?.romanised ? language.code : '',
    languageName: language?.romanised ? language.label : '',
    romanised: Boolean(language?.romanised),
    // What the turn is stays for the reading desk to say: the window's own reader repairs the
    // typing and reads the language, but naming the intent is the desk's work.
    intent: attachment
      ? attachment.kind === 'document'
        ? 'document'
        : attachment.kind === 'video'
          ? 'video'
          : 'photo'
      : '',
    sentiment: 'neutral',
    tone: '',
    about: '',
    wants: '',
    attachment:
      attachment?.kind === 'photo' ? localPhotoNote(input.photo ?? null) : attachment ? '' : '',
    advice: '',
  };
}

/** The largest document the window keeps the bytes of, for the reading desk to open. */
export const AI_READ_DOCUMENT_LIMIT_BYTES = 4 * 1024 * 1024;

/**
 * A document the visitor attached, kept as a data URL so the reading desk can open it: a PDF is read
 * by the reading model, a text file is read as it is, and anything else is sent as it came. Returns
 * an empty object for a document too large to travel, and the desk then works from its name.
 */
export async function readDocumentBytes(file: File): Promise<{ fileData?: string }> {
  if (!file || file.size <= 0 || file.size > AI_READ_DOCUMENT_LIMIT_BYTES) return {};
  if (typeof FileReader === 'undefined') return {};

  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : '';
      resolve(result.startsWith('data:') ? { fileData: result } : {});
    };
    reader.onerror = () => resolve({});
    try {
      reader.readAsDataURL(file);
    } catch {
      resolve({});
    }
  });
}

/** One key of the desk's answer, trimmed, or the window's own value when the desk had none. */
function text(value: unknown, limit: number, fallback = ''): string {
  if (typeof value !== 'string') return fallback;
  const clean = value.replace(/\s+/g, ' ').trim();
  return clean ? clean.slice(0, limit) : fallback;
}

/**
 * What the reply engine and the answer endpoint are handed: the desk's reading where it has one, the
 * window's own reading everywhere else. A language the studio has no book for is never switched to —
 * the chat keeps answering in English, exactly as it does today.
 */
export function mergeReadings(
  local: ChatTurnReading,
  /** The desk's answer, as it arrived over the wire — every key optional and untrusted. */
  desk: Record<string, unknown> | null,
): ChatTurnReading {
  if (!desk) return local;

  const code = text(desk['language'], 24, '').toLowerCase();
  const language = KNOWN_LANGUAGES.has(code) ? (code as RomanisedLanguageCode) : local.language;

  return {
    source: 'studio',
    provider: text(desk['provider'], 40, 'studio'),
    english: text(desk['english'], 600, local.english),
    language,
    languageName: text(desk['languageName'], 60, language ? local.languageName : ''),
    romanised: desk['romanised'] === true || (desk['romanised'] === undefined && local.romanised),
    intent: text(desk['intent'], 24, local.intent),
    sentiment: text(desk['sentiment'], 24, local.sentiment),
    tone: text(desk['tone'], 120, local.tone),
    about: text(desk['about'], 160, local.about),
    wants: text(desk['wants'], 240, local.wants),
    attachment: text(desk['attachment'], 600, local.attachment),
    advice: text(desk['advice'], 400, local.advice),
  };
}

/** The desk's request body for one turn. */
function readBody(input: {
  text: string;
  attachment?: AiChatAttachment | null;
  user?: { name: string; firstName: string } | null;
  model: AiModelProfile;
  history: readonly AiChatMessage[];
  local: ChatTurnReading;
}): Record<string, unknown> {
  const attachment = input.attachment ?? null;
  return {
    text: input.text.slice(0, 2000),
    model: {
      slug: input.model.slug,
      name: input.model.name,
      handle: input.model.handle,
      location: input.model.location,
      age: input.model.age,
    },
    user: input.user
      ? { name: input.user.name, firstName: input.user.firstName }
      : { name: '', firstName: '' },
    local: {
      english: input.local.english,
      language: input.local.language,
      languageName: input.local.languageName,
      romanised: input.local.romanised,
      meaning: input.local.about,
    },
    attachment: attachment
      ? {
          kind: attachment.kind,
          name: attachment.name,
          type: attachment.type,
          // A photograph travels in its preview; a document travels in the bytes the window kept.
          dataUrl: attachment.kind === 'photo' ? attachment.preview : (attachment.fileData ?? ''),
        }
      : null,
    history: input.history
      .filter((message) => message.kind === 'message' && message.text.trim().length > 0)
      .slice(-6)
      .map((message) => ({
        role: message.author === 'user' ? ('user' as const) : ('model' as const),
        text: message.text.slice(0, 600),
      })),
  };
}

/**
 * Reads one turn: the window's own reading first, then the studio's reading desk when it is allowed
 * and reachable. The desk is never asked twice for the same message, and a failure is remembered for
 * a while — the chat carries on with the window's own reading and no waiting.
 */
export async function analyseVisitorTurn(input: {
  text: string;
  attachment?: AiChatAttachment | null;
  model: AiModelProfile;
  user?: { name: string; firstName: string } | null;
  history: readonly AiChatMessage[];
  language?: ChatVisitorLanguage | null;
  photo?: ChatPhotoFacts | null;
  /** False in a test, offline, or when the desk has already answered "not configured". */
  allowNetwork?: boolean;
  fetchImpl?: typeof fetch;
}): Promise<ChatTurnReading> {
  const local = localTurnReading({
    text: input.text,
    attachment: input.attachment,
    language: input.language,
    photo: input.photo,
    model: input.model,
  });

  const fetchImpl = input.fetchImpl ?? (typeof fetch === 'function' ? fetch : null);
  if (input.allowNetwork === false || !fetchImpl) return local;
  if (!input.text.trim() && !input.attachment) return local;

  const controller = typeof AbortController === 'function' ? new AbortController() : null;
  const timeout = controller ? setTimeout(() => controller.abort(), AI_READ_TIMEOUT_MS) : null;

  try {
    const response = await fetchImpl(AI_READ_ENDPOINT, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(readBody({ ...input, local })),
      signal: controller?.signal,
    });
    if (!response.ok) return local;
    const payload = (await response.json()) as { reading?: Record<string, unknown> } | null;
    return mergeReadings(local, payload?.reading ?? null);
  } catch {
    // Offline, refused or too slow: the window's own reading stands, and the answer is written from
    // it exactly as it was before there was a reading desk at all.
    return local;
  } finally {
    if (timeout !== null) clearTimeout(timeout);
  }
}

/**
 * The reading as the studio's answer endpoint wants it: the desk's findings, minus the two fields
 * that belong to the window alone.
 */
export function readingForAnswer(reading: ChatTurnReading): Record<string, unknown> {
  return {
    english: reading.english,
    language: reading.language,
    languageName: reading.languageName,
    romanised: reading.romanised,
    intent: reading.intent,
    sentiment: reading.sentiment,
    tone: reading.tone,
    about: reading.about,
    wants: reading.wants,
    attachment: reading.attachment,
    advice: reading.advice,
    provider: reading.provider,
  };
}

/** True when the reading desk read this turn — used by the transcript and the tests. */
export function readingFromStudio(reading: ChatTurnReading | null | undefined): boolean {
  return reading?.source === 'studio';
}
