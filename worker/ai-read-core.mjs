/**
 * The reading desk — the analysis that happens before she answers.
 *
 * Requirement: nothing the visitor sends is answered before it has been read. This module reads the
 * turn first — the words, the photograph, the document — with the studio's own accounts of the
 * public APIs, and hands the answer a plain-English reading of it:
 *
 *   - **Google Translate** reads any language written in Latin letters (Romanised Bengali,
 *     Hinglish, Arabizi, Turkish, Spanish, Malay) and puts it into English, reporting the language
 *     it found. The official Cloud Translation API is used when `GOOGLE_TRANSLATE_API_KEY` is set;
 *     without it the same public endpoint the site already uses (`translate.googleapis.com`) is
 *     asked, exactly as the chat window does today.
 *   - **Google Gemini** (`GEMINI_API_KEY`, `GEMINI_MODEL`) does the structured reading: what the
 *     visitor meant, their intent, their feeling, their tone, and — when something was attached —
 *     what the photograph shows or what the document contains. Gemini reads images and PDFs
 *     directly, so a brief or an invoice is read rather than thanked for.
 *   - **OpenAI** (`OPENAI_API_KEY`, `OPENAI_MODEL`) does exactly the same reading when Gemini is
 *     not configured, including looking at an attached photograph with its vision model.
 *
 * Nothing here is charged and nothing leaves the Worker without a key: with no provider the
 * endpoint answers `503 { ok: false, error: 'analysis-unavailable' }` and the chat reads the turn
 * itself (its own typo repair, its own language books, its own eye on the picture), so the
 * conversation always works.
 *
 * The visitor is never told any of this happened: the reading is handed to her answer as what she
 * understood, and the rules she answers by forbid naming where anything came from.
 */

import { geminiGenerateContentUrl, geminiHeaders, logGeminiFailure } from './gemini-http.mjs';

export const AI_READ_ENDPOINT = '/api/ai-read';

/** A turn is the question, the model card and one attachment — about the size of the chat body. */
export const MAX_READ_BODY_BYTES = 6 * 1024 * 1024;

/** Default for projects without legacy Gemini 2.5 access; override with GEMINI_MODEL. */
export const GEMINI_DEFAULT_MODEL = 'gemini-3.6-flash';

/** The OpenAI model used for the reading when `OPENAI_MODEL` is not configured. */
export const OPENAI_DEFAULT_READ_MODEL = 'gpt-4o-mini';

/** The largest attachment the reading desk will look at (the window sends about 320 KB). */
export const MAX_READ_ATTACHMENT_BYTES = 4 * 1024 * 1024;

const OPENAI_ENDPOINT = 'https://api.openai.com/v1/chat/completions';
const GOOGLE_TRANSLATE_ENDPOINT = 'https://translation.googleapis.com/language/translate/v2';
const GOOGLE_TRANSLATE_PUBLIC_ENDPOINT = 'https://translate.googleapis.com/translate_a/single';

const LIMITS = {
  question: 2000,
  language: 24,
  languageName: 60,
  intent: 24,
  sentiment: 24,
  tone: 120,
  about: 160,
  wants: 240,
  attachment: 600,
  advice: 400,
  english: 600,
  name: 120,
  handle: 80,
  location: 160,
  age: 20,
  historyMessage: 600,
  historyLength: 6,
};

/** The intents the reading desk may report. Anything else is reported as `other`. */
export const READ_INTENTS = [
  'greeting',
  'compliment',
  'affection',
  'personal',
  'studio',
  'world',
  'selfie',
  'photo',
  'document',
  'thanks',
  'sad',
  'joke',
  'question',
  'other',
];

/** The feelings the reading desk may report. Anything else is reported as `neutral`. */
export const READ_SENTIMENTS = ['warm', 'happy', 'playful', 'flirty', 'neutral', 'sad', 'angry'];

/**
 * The reading desk's brief, written on the server so a visitor can never write it. It asks for one
 * flat JSON object and nothing else — no prose, no markdown, no commentary.
 */
export const READ_ANALYST_BRIEF = [
  'You are the reading desk of the NeverBeen studio. A visitor is chatting with one of the studio’s AI models and you read the turn before she does.',
  'Answer with one JSON object and nothing else — no prose, no markdown, no code fences — with exactly these keys: english, language, languageName, romanised, intent, sentiment, tone, about, wants, attachment, advice.',
  'english: what the visitor means, written out properly in English — their spelling mistakes repaired and their short forms expanded ("u" becomes "you"), and any other language, including its Romanised (Latin-letter) form, translated into English. First person, as they meant it, at most three sentences.',
  'language: the ISO code of the language the visitor actually wrote in — "en" for English, "bn" Bengali, "hi" Hindi, "ur" Urdu, "fa" Persian, "ar" Arabic, "tr" Turkish, "es" Spanish, "ms" Malay — whatever the script.',
  'languageName: that language in English words.',
  `romanised: true when they wrote that language in Latin letters (Romanised Bengali, Hinglish, Arabizi) and false otherwise.`,
  `intent: one word from ${READ_INTENTS.join(', ')}.`,
  `sentiment: one word from ${READ_SENTIMENTS.join(', ')}.`,
  'tone: two or three words about how they wrote it, such as "short and shy" or "cheeky and confident".',
  'about: what the message is about, in a few words.',
  'wants: what the visitor seems to want back, in one short sentence.',
  'attachment: when a photograph or a document is attached, what it actually shows or contains, in two sentences — the setting, the light, who or what is in it, or the kind of paper it is. Empty string when nothing is attached.',
  'advice: one line of advice for the woman answering — what she should do in her reply, in her own voice. Never tell her to mention that anything was analysed, searched or translated.',
].join(' ');

/** Trims a value to a string of at most `limit` characters. */
export function cleanReadText(value, limit) {
  if (typeof value !== 'string') return '';
  return value.replace(/\s+/g, ' ').trim().slice(0, limit);
}

/** Validates the browser's reading request. Returns the parsed turn, or a message naming the problem. */
export function validateReadRequest(payload) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return { error: 'invalid-payload' };
  }

  const text = cleanReadText(payload.text, LIMITS.question);
  const model = payload.model && typeof payload.model === 'object' ? payload.model : {};
  const visitor = payload.user && typeof payload.user === 'object' ? payload.user : {};
  const attachment =
    payload.attachment && typeof payload.attachment === 'object' ? payload.attachment : null;
  const dataUrl =
    typeof attachment?.dataUrl === 'string' &&
    attachment.dataUrl.length <= MAX_READ_ATTACHMENT_BYTES
      ? attachment.dataUrl
      : '';
  const looksLikeMedia =
    dataUrl.startsWith('data:image/') || dataUrl.startsWith('data:application/pdf');

  if (text.length === 0 && !(attachment && (looksLikeMedia || attachment.name))) {
    return { error: 'empty-turn' };
  }

  const history = Array.isArray(payload.history)
    ? payload.history.slice(-LIMITS.historyLength)
    : [];

  return {
    turn: {
      text,
      model: {
        slug: cleanReadText(model.slug, LIMITS.name),
        name: cleanReadText(model.name, LIMITS.name),
        handle: cleanReadText(model.handle, LIMITS.handle),
        location: cleanReadText(model.location, LIMITS.location),
        age: cleanReadText(model.age, LIMITS.age),
      },
      visitor: {
        name: cleanReadText(visitor.name, LIMITS.name),
        firstName: cleanReadText(visitor.firstName, LIMITS.name),
      },
      /** What the window's own books already read, offered as a hint and never as the truth. */
      local: {
        english: cleanReadText(payload.local?.english, LIMITS.english),
        language: cleanReadText(payload.local?.language, LIMITS.language),
        languageName: cleanReadText(payload.local?.languageName, LIMITS.languageName),
        romanised: payload.local?.romanised === true,
        meaning: cleanReadText(payload.local?.meaning, LIMITS.about),
      },
      attachment: attachment
        ? {
            kind: attachment.kind === 'document' ? 'document' : 'photo',
            name: cleanReadText(attachment.name, LIMITS.name),
            type: cleanReadText(attachment.type, LIMITS.handle),
            dataUrl: looksLikeMedia ? dataUrl : '',
            note: cleanReadText(attachment.note, LIMITS.attachment),
          }
        : null,
      history: history
        .map((message) => ({
          role: message && message.role === 'user' ? 'user' : 'model',
          content: cleanReadText(message && message.text, LIMITS.historyMessage),
        }))
        .filter((message) => message.content.length > 0),
    },
  };
}

/**
 * The language Google Translate reported, in the codes the chat uses. Google answers with its own
 * names (`iw`, `id`, `prs`), so they are folded into the ones `chat-language.ts` knows.
 */
export function normaliseLanguageCode(raw) {
  const code = cleanReadText(raw, 16).toLowerCase();
  if (!code) return '';
  if (code === 'id' || code === 'in') return 'ms';
  if (code === 'prs' || code === 'pes' || code === 'dar' || code === 'fa-af') return 'fa';
  if (code === 'iw') return 'he';
  if (code === 'fil' || code === 'tl') return 'tl';
  return code.split('-')[0].slice(0, 8);
}

/** The English name of a language code, for the reading. */
export function languageNameFor(code) {
  const names = {
    en: 'English',
    bn: 'Bengali',
    hi: 'Hindi',
    ur: 'Urdu',
    fa: 'Persian',
    ar: 'Arabic',
    tr: 'Turkish',
    es: 'Spanish',
    ms: 'Malay',
    id: 'Indonesian',
    ta: 'Tamil',
    te: 'Telugu',
    mr: 'Marathi',
    gu: 'Gujarati',
    pa: 'Punjabi',
    ne: 'Nepali',
    si: 'Sinhala',
    th: 'Thai',
    vi: 'Vietnamese',
    zh: 'Chinese',
    ja: 'Japanese',
    ko: 'Korean',
    ru: 'Russian',
    fr: 'French',
    de: 'German',
    it: 'Italian',
    pt: 'Portuguese',
    nl: 'Dutch',
    pl: 'Polish',
    uk: 'Ukrainian',
    he: 'Hebrew',
    sw: 'Swahili',
    tl: 'Filipino',
  };
  return names[code] ?? '';
}

/**
 * The visitor's words in English, plus the language they were written in.
 *
 * The official Cloud Translation API is used when the studio has its key; without one the public
 * `translate.googleapis.com` endpoint answers, which is the same reader the chat window already
 * uses in the browser. Returns `null` when neither could be reached — the reading desk then works
 * from the visitor's own words.
 */
export async function translateThroughGoogle(text, env, fetchImpl = fetch) {
  const wanted = cleanReadText(text, LIMITS.question);
  if (wanted.length < 3) return null;

  const key = env.GOOGLE_TRANSLATE_API_KEY?.trim();
  try {
    if (key) {
      const response = await fetchImpl(
        `${GOOGLE_TRANSLATE_ENDPOINT}?key=${encodeURIComponent(key)}`,
        {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ q: [wanted], target: 'en', format: 'text' }),
        },
      );
      if (!response.ok) return null;
      const payload = await response.json();
      const translation = payload?.data?.translations?.[0];
      const english = cleanReadText(translation?.translatedText, LIMITS.english);
      if (!english) return null;
      const detected = normaliseLanguageCode(translation?.detectedSourceLanguage);
      return { english, detected, provider: 'google-translate' };
    }

    const url =
      `${GOOGLE_TRANSLATE_PUBLIC_ENDPOINT}?client=gtx&sl=auto&tl=en&dt=t&q=` +
      encodeURIComponent(wanted.slice(0, 400));
    const response = await fetchImpl(url, { method: 'GET' });
    if (!response.ok) return null;
    const payload = await response.json();
    const chunks = Array.isArray(payload?.[0]) ? payload[0] : [];
    const english = cleanReadText(
      chunks.map((chunk) => (Array.isArray(chunk) ? chunk[0] : '')).join(' '),
      LIMITS.english,
    );
    if (!english) return null;
    return {
      english,
      detected: normaliseLanguageCode(payload?.[2]),
      provider: 'google-translate',
    };
  } catch {
    return null;
  }
}

/** The reader's side of the turn: her card, the visitor's words, and anything attached. */
export function buildReadInstruction(turn, translation = null) {
  const lines = [READ_ANALYST_BRIEF, ''];

  lines.push(
    `She is ${turn.model.name || 'a NeverBeen model'}${
      turn.model.handle ? ` (${turn.model.handle})` : ''
    }${turn.model.location ? `, of ${turn.model.location}` : ''}${
      turn.model.age ? `, age ${turn.model.age}` : ''
    }.`,
  );
  if (turn.visitor.firstName || turn.visitor.name) {
    lines.push(`The visitor is ${turn.visitor.firstName || turn.visitor.name}.`);
  }

  lines.push('', `The visitor wrote: ${turn.text || '(nothing — the message is the attachment)'}`);

  if (translation?.english) {
    lines.push(
      '',
      `Google Translate read that as: ${translation.english}` +
        (translation.detected
          ? ` (language: ${translation.detected}${
              languageNameFor(translation.detected)
                ? `, ${languageNameFor(translation.detected)}`
                : ''
            })`
          : ''),
    );
  }
  if (turn.local.english && turn.local.english !== translation?.english) {
    lines.push(
      '',
      `The studio's own reader made it: ${turn.local.english}` +
        (turn.local.language ? ` (language: ${turn.local.language})` : ''),
    );
  }
  if (turn.local.meaning) {
    lines.push(`The studio's own books guessed the meaning was: ${turn.local.meaning}`);
  }

  if (turn.attachment) {
    const attachment = turn.attachment;
    lines.push(
      '',
      attachment.dataUrl
        ? `Attached: a ${attachment.kind} named "${attachment.name}" — read it and describe exactly what is in it in the "attachment" key.`
        : `Attached: a ${attachment.kind} named "${attachment.name}"${
            attachment.note ? ` (${attachment.note})` : ''
          } — its contents did not travel, so say only what the name and the kind allow.`,
    );
  } else {
    lines.push('', 'Nothing is attached to this message.');
  }

  if (turn.history.length > 0) {
    lines.push('', 'The last messages of the conversation, oldest first:');
    for (const message of turn.history) {
      lines.push(`- ${message.role === 'user' ? 'visitor' : 'her'}: ${message.content}`);
    }
  }

  return lines.join('\n');
}

/** The OpenAI body for the reading: JSON mode, low temperature, the picture when there is one. */
export function buildOpenAiReadBody(turn, translation, model = OPENAI_DEFAULT_READ_MODEL) {
  const instruction = buildReadInstruction(turn, translation);
  const content =
    turn.attachment?.kind === 'photo' && turn.attachment.dataUrl
      ? [
          { type: 'text', text: instruction },
          { type: 'image_url', image_url: { url: turn.attachment.dataUrl } },
        ]
      : instruction;

  return {
    model,
    temperature: 0.2,
    max_tokens: 600,
    response_format: { type: 'json_object' },
    messages: [{ role: 'user', content }],
  };
}

/** The Gemini body for the reading: the same instruction, with the image or the PDF inline. */
export function buildGeminiReadBody(turn, translation, model = GEMINI_DEFAULT_MODEL) {
  const parts = [{ text: buildReadInstruction(turn, translation) }];
  const attachment = turn.attachment;
  if (attachment?.dataUrl) {
    const comma = attachment.dataUrl.indexOf(',');
    const meta = attachment.dataUrl.slice(5, comma);
    const base64 = attachment.dataUrl.slice(comma + 1);
    const mimeType = meta.split(';')[0] || attachment.type || 'image/jpeg';
    parts.push({ inlineData: { mimeType, data: base64 } });
  }

  return {
    contents: [{ role: 'user', parts }],
    generationConfig: {
      temperature: 0.2,
      responseMimeType: 'application/json',
      maxOutputTokens: 2048,
      // Gemini 3+ controls reasoning with `thinkingLevel`, not the 2.5 series' `thinkingBudget`.
      // The reading is a quick structured pass, so keep it at the cheapest level that still
      // reads properly — and only send it to models that understand it.
      ...(/^(?:models\/)?gemini-[34](?:[.-])/.test(model)
        ? { thinkingConfig: { thinkingLevel: 'low' } }
        : {}),
    },
  };
}

/** Pulls the first JSON object out of a model's answer, however it wrapped it. */
export function parseJsonObject(raw) {
  if (raw && typeof raw === 'object') return raw;
  const text = String(raw ?? '').trim();
  if (!text) return null;
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start < 0 || end <= start) return null;
  try {
    const parsed = JSON.parse(text.slice(start, end + 1));
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

/** One key of the reading, clipped to its limit. */
function readingText(parsed, key) {
  return cleanReadText(parsed?.[key], LIMITS[key] ?? 200);
}

/**
 * The reading as the chat uses it: every key present, every value clipped, the intent and the
 * feeling folded into the sets the studio's own engine speaks.
 */
export function normaliseReading(raw, fallback = null) {
  const parsed = parseJsonObject(raw);
  if (!parsed) return fallback;

  const language = normaliseLanguageCode(parsed.language) || fallback?.language || '';
  const intentWord = cleanReadText(parsed.intent, LIMITS.intent).toLowerCase();
  const sentimentWord = cleanReadText(parsed.sentiment, LIMITS.sentiment).toLowerCase();

  const reading = {
    english: readingText(parsed, 'english') || fallback?.english || '',
    language,
    languageName:
      cleanReadText(parsed.languageName, LIMITS.languageName) || languageNameFor(language) || '',
    romanised:
      parsed.romanised === true || (parsed.romanised === undefined && Boolean(fallback?.romanised)),
    intent: READ_INTENTS.includes(intentWord) ? intentWord : (fallback?.intent ?? 'other'),
    sentiment: READ_SENTIMENTS.includes(sentimentWord)
      ? sentimentWord
      : (fallback?.sentiment ?? 'neutral'),
    tone: readingText(parsed, 'tone'),
    about: readingText(parsed, 'about'),
    wants: readingText(parsed, 'wants'),
    attachment: readingText(parsed, 'attachment') || fallback?.attachment || '',
    advice: readingText(parsed, 'advice'),
    provider: fallback?.provider ?? 'studio',
  };

  const meaningful =
    reading.english ||
    reading.about ||
    reading.wants ||
    reading.attachment ||
    reading.advice ||
    reading.tone;
  return meaningful ? reading : fallback;
}

/** The structured reading from Gemini, or `null` when it could not be had. */
export async function readWithGemini(turn, translation, env, fetchImpl = fetch) {
  const key = env.GEMINI_API_KEY?.trim();
  if (!key) return null;

  const model = env.GEMINI_MODEL?.trim() || GEMINI_DEFAULT_MODEL;
  try {
    const response = await fetchImpl(geminiGenerateContentUrl(model), {
      method: 'POST',
      headers: geminiHeaders(key),
      body: JSON.stringify(buildGeminiReadBody(turn, translation, model)),
    });
    if (!response.ok) {
      await logGeminiFailure('ai-read', model, response);
      return null;
    }
    const payload = await response.json();
    const parts = payload?.candidates?.[0]?.content?.parts;
    const text = Array.isArray(parts)
      ? parts
          .map((part) => (!part?.thought && typeof part?.text === 'string' ? part.text : ''))
          .join('')
      : '';
    const reading = normaliseReading(text, null);
    return reading ? { ...reading, provider: 'gemini' } : null;
  } catch {
    return null;
  }
}

/** The structured reading from OpenAI, or `null` when it could not be had. */
export async function readWithOpenAi(turn, translation, env, fetchImpl = fetch) {
  const key = env.OPENAI_API_KEY?.trim();
  if (!key) return null;

  const model = env.OPENAI_MODEL?.trim() || OPENAI_DEFAULT_READ_MODEL;
  try {
    const response = await fetchImpl(OPENAI_ENDPOINT, {
      method: 'POST',
      headers: { authorization: `Bearer ${key}`, 'content-type': 'application/json' },
      body: JSON.stringify(buildOpenAiReadBody(turn, translation, model)),
    });
    if (!response.ok) return null;
    const payload = await response.json();
    const content = payload?.choices?.[0]?.message?.content;
    const reading = normaliseReading(
      typeof content === 'string' ? content : (content?.[0]?.text ?? ''),
      null,
    );
    return reading ? { ...reading, provider: 'openai' } : null;
  } catch {
    return null;
  }
}

function jsonResponse(status, body) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  });
}

/** True when every letter of the message is Latin: the only case a Romanised reading makes sense. */
function isLatinScript(text) {
  return !/[^\u0000-\u024F\s\d\p{P}\p{S}]/u.test(text);
}

/** The window's own reading, used when no provider is configured or none answered. */
function localReading(turn, translation) {
  const detected = normaliseLanguageCode(translation?.detected) || '';
  const language = turn.local.language || detected;
  return {
    // Google's reading of the words comes first — that is the desk's own work — and the window's
    // reading stands in when Google was not reachable.
    english: translation?.english || turn.local.english || turn.text,
    language,
    languageName: turn.local.languageName || languageNameFor(language),
    romanised:
      turn.local.romanised || Boolean(detected && detected !== 'en' && isLatinScript(turn.text)),
    intent: turn.attachment
      ? turn.attachment.kind === 'document'
        ? 'document'
        : 'photo'
      : 'other',
    sentiment: 'neutral',
    tone: '',
    about: turn.local.meaning,
    wants: '',
    attachment: '',
    advice: '',
    provider: translation ? 'google-translate' : 'studio',
  };
}

/**
 * `POST /api/ai-read` — the reading of one turn. Answers JSON:
 *
 *   { ok: true, reading: { english, language, languageName, romanised, intent, sentiment,
 *                          tone, about, wants, attachment, advice, provider } }
 *
 * With no Gemini and no OpenAI key the endpoint still answers 200 with the reading the studio can
 * make on its own (the window sent its own reading and Google Translate read the words), and only
 * says `analysis-unavailable` when it has nothing at all to offer.
 */
export async function createAiReadResponse({ payload, env, fetchImpl = fetch }) {
  const validated = validateReadRequest(payload);
  if (validated.error) {
    return jsonResponse(400, { ok: false, error: validated.error });
  }

  const turn = validated.turn;
  const translation = await translateThroughGoogle(turn.text, env, fetchImpl);
  const structured =
    (await readWithGemini(turn, translation, env, fetchImpl)) ??
    (await readWithOpenAi(turn, translation, env, fetchImpl));

  if (structured) {
    return jsonResponse(200, { ok: true, reading: structured, provider: structured.provider });
  }

  const hasKey = Boolean(env.GEMINI_API_KEY?.trim() || env.OPENAI_API_KEY?.trim());
  // No structured reader answered. The word-level reading Google Translate made is still a real
  // reading — the language the visitor wrote in and what they said in English.
  if (translation) {
    const fallback = localReading(turn, translation);
    return jsonResponse(200, { ok: true, reading: fallback, provider: fallback.provider });
  }
  if (hasKey) {
    // A key is configured but nothing answered: the window keeps what it read itself.
    return jsonResponse(502, { ok: false, error: 'analysis-failed' });
  }
  return jsonResponse(503, { ok: false, error: 'analysis-unavailable' });
}
