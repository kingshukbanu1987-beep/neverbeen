/**
 * Requirement L — never a bot line.
 *
 * Her answers are written by Google Gemini, on the NeverBeen Web API, from her own
 * `characterdatabase.json` and `biography.json` (`POST /neverbeen-api/api/ai-chat`). The server's
 * rules forbid the software voice and its prompt asks for a woman texting on her phone — but a
 * language model slips sometimes, and a visitor who reads one *"As an AI, I cannot…"* has met a
 * chatbot, not her.
 *
 * So the window reads every answer before she says it, whoever wrote it:
 *
 * - `botLineIn()` names the phrase that gave the answer away (`''` when the words are hers);
 * - `herOwnWords()` takes those sentences out and leaves the rest of what she said — the
 *   conversation is never thrown away because one line of it was wrong;
 * - `readsLikeABot()` is the question the service asks before it lets an answer through, and when
 *   nothing of the answer survives the window answers from her own engine instead.
 *
 * The guard is deliberately quiet about what it did: the visitor never hears that anything was
 * filtered, exactly as they never hear where an answer came from (requirement B).
 */

/** One way of speaking that no woman texting on her phone ever uses. */
export interface BotLine {
  /** The phrase, as the tests and the API's own scrub name it. */
  label: string;
  pattern: RegExp;
}

/**
 * The phrases that make an answer read like software. Every entry is a *whole phrase* rather than a
 * bare word, so nothing here fires on an ordinary sentence: `Gemini` is a star sign, and
 * *"my model"* is her job.
 *
 * The list is the same one the NeverBeen Web API keeps (`AiChatPrompt.BotLinePatterns`, see
 * `docs/patches/neverbeen-api-ai-chat-her-voice.patch`): the server scrubs the answer Gemini sends
 * and the window checks it again before it is said, so a bot line has to get past both.
 */
export const BOT_LINE_PATTERNS: readonly BotLine[] = [
  // Who she is not.
  { label: 'as-an-ai', pattern: /\bas an? (?:ai|a\.i\.|artificial intelligence)\b/i },
  {
    label: 'i-am-an-ai',
    pattern:
      /\bi(?:'m|’m| am) (?:just |only |really )?an? (?:ai|a\.i\.|artificial intelligence|language model|large language model|llm|chat\s?bot|bot|virtual assistant|digital assistant|ai assistant|ai model|computer program|software program|program)\b/i,
  },
  { label: 'ai-model', pattern: /\b(?:ai|a\.i\.|language|large language) models?\b/i },
  { label: 'assistant', pattern: /\b(?:virtual|digital|ai) assistant\b/i },
  { label: 'chatbot', pattern: /\bchat\s?-?bots?\b/i },
  { label: 'language-model', pattern: /\blarge language models?\b|\bllms?\b/i },
  // What she is not here to do.
  {
    label: 'built-to',
    pattern: /\bi(?:'m|’m| am) (?:here|programmed|designed|built|trained|created|made) to\b/i,
  },
  {
    label: 'purpose',
    pattern: /\bmy (?:purpose|goal|function|job) is to (?:help|assist|answer)\b/i,
  },
  { label: 'how-can-i-help', pattern: /\bhow (?:can|may|might) i (?:be of )?(?:help|assist)\b/i },
  { label: 'anything-else', pattern: /\bis there anything else\b/i },
  { label: 'anything-else-i-can', pattern: /\banything else (?:i can|you (?:need|would like))\b/i },
  { label: 'feel-free-to-ask', pattern: /\bfeel free to (?:ask|reach out|let me know)\b/i },
  { label: 'hope-this-helps', pattern: /\bi hope (?:this|that) helps\b/i },
  { label: 'let-me-know-if', pattern: /\blet me know if you (?:need|have|would like)\b/i },
  // What a program cannot do.
  {
    label: 'cannot-browse',
    pattern:
      /\bi (?:cannot|can'?t|can not|am unable to) (?:browse|access the internet|access|search|surf|see (?:images|pictures|photos)|view (?:images|pictures|photos))\b/i,
  },
  {
    label: 'no-feelings',
    pattern:
      /\bi (?:don'?t|do not|can'?t|cannot) (?:really )?have (?:feelings|emotions|a body|a life|personal experiences)\b/i,
  },
  {
    label: 'no-emotions',
    pattern: /\bi (?:don'?t|do not) (?:feel|experience) (?:emotions|feelings|anything)\b/i,
  },
  // The machinery showing through.
  {
    label: 'my-database',
    pattern:
      /\bmy (?:database|data base|knowledge base|knowledgebase|dataset|training data|training|instructions|programming|source code|character profile|character database|biography file)\b/i,
  },
  { label: 'in-my-training', pattern: /\bin my (?:training data|knowledge base|database)\b/i },
  { label: 'according-to-my', pattern: /\baccording to my (?:database|files|records|profile)\b/i },
  // The studio's own secrets, said out loud.
  { label: 'openai', pattern: /\b(?:open\s?ai|chat\s?gpt)\b/i },
  { label: 'gpt', pattern: /\bgpt-?[0-9o]\b/i },
  { label: 'google-api', pattern: /\bgoogle (?:gemini|api|search|translate)\b/i },
  { label: 'api', pattern: /\b(?:the|our|an?) api\b/i },
  // Prompt scaffolding that leaked into the answer.
  { label: 'role-label', pattern: /(?:^|\n)\s*(?:assistant|system|user|model|ai)\s*:/i },
  { label: 'answer-label', pattern: /(?:^|\n)\s*(?:answer|response|reply)\s*:/i },
  {
    label: 'instructions',
    pattern: /\bas (?:instructed|per instructions)\b|\bmy instructions say\b/i,
  },
];

/**
 * The first phrase in `text` that gives her away, or `''` when every word of it is hers.
 * The phrase itself is returned rather than a boolean so a caller can log, retry or drop the
 * sentence that carried it.
 */
export function botLineIn(text: string): string {
  const reply = (text ?? '').trim();
  if (reply.length === 0) return '';
  for (const line of BOT_LINE_PATTERNS) {
    const match = line.pattern.exec(reply);
    if (match) return line.label;
  }
  return '';
}

/** True when the answer reads like a chatbot instead of her. */
export function readsLikeABot(text: string): boolean {
  return botLineIn(text).length > 0;
}

/** A line that is markdown furniture rather than something a woman types on her phone. */
const MARKDOWN_LINE = /^\s{0,3}(?:#{1,6}\s+|>\s+|[-*•]\s+|\d{1,2}[.)]\s+)/;
/** The emphasis a model reaches for and a thumb never types. */
const MARKDOWN_MARKUP = /(\*\*|__|~~|`)/;

/** True when the text carries browser-shaped furniture rather than a text message. */
function hasMarkdownFurniture(text: string): boolean {
  return MARKDOWN_LINE.test(text) || MARKDOWN_MARKUP.test(text);
}

/** The same sentence with the furniture off it: no heading, no bullet, no emphasis markers. */
function plainSentence(sentence: string): string {
  return sentence
    .replace(MARKDOWN_LINE, '')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/__([^_]+)__/g, '$1')
    .replace(/~~([^~]+)~~/g, '$1')
    .replace(/`{1,3}([^`]+)`{1,3}/g, '$1')
    .replace(/\*([^*\n]+)\*/g, '$1')
    .replace(/\b_([^_\n]+)_\b/g, '$1')
    .replace(/(\*\*|__|~~|`)/g, '')
    .replace(/^[\s\-–—•*]+/, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** The sentences of one line: the seam a single wrong sentence is taken out at. */
function sentencesOf(line: string): string[] {
  return (line.match(/[^.!?…]+[.!?…]*/g) ?? [line]).map((part) => part.trim()).filter(Boolean);
}

/**
 * Her answer as she would have typed it: the sentences that read like software are taken out, the
 * markdown is taken off, and what is left is returned with its paragraphs — and its blank lines,
 * which are the seams the window splits a long answer at (requirement C) — exactly where they were.
 *
 * A text that is already hers comes back **unchanged**, character for character: the guard never
 * rewrites a good answer, so every scripted line of her own engine, every emoji and every pause of
 * hers reaches the visitor as it was written.
 */
export function herOwnWords(text: string): string {
  const answer = text ?? '';
  if (answer.trim().length === 0) return '';
  if (botLineIn(answer).length === 0 && !hasMarkdownFurniture(answer)) return answer;

  const paragraphs = answer
    .replace(/\r\n?/g, '\n')
    .split(/\n{2,}/)
    .map((paragraph) =>
      paragraph
        .split('\n')
        .map((line) =>
          sentencesOf(line)
            .filter((sentence) => botLineIn(sentence).length === 0)
            .map(plainSentence)
            .filter((sentence) => sentence.length > 0)
            .join(' '),
        )
        .filter((line) => line.length > 0)
        .join(' '),
    )
    .map((paragraph) => paragraph.replace(/\s+/g, ' ').trim())
    .filter((paragraph) => paragraph.length > 0);

  return paragraphs.join('\n\n').trim();
}
