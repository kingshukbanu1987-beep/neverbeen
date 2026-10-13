/**
 * The chat's language guardian (requirement B).
 *
 * A model answers every question frankly and in a friendly, seductive way, but never pays a price
 * for rudeness: swearing and sexual remarks are answered in a deliberately non-polite way, and a
 * visitor who keeps going is told goodbye and the window is closed.
 *
 * Three strikes end the session. A swear word is one strike; sexual harassment is two, because it
 * is worse, so the second sexual message ends the chat immediately. The escalation itself lives
 * here, so the window, the service and the tests all read the same rule.
 */
import { AiChatReaction } from './chat-types';

export type AiChatLanguageLevel = 'clean' | 'offensive' | 'harassment';

export interface AiChatLanguageAssessment {
  level: AiChatLanguageLevel;
  /** The words that triggered the level, for the record and for the tests. */
  terms: string[];
  /** Strikes this message is worth: 0 when clean, 1 for swearing, 2 for harassment. */
  strikes: number;
}

export const AI_CHAT_STRIKE_LIMIT = 3;

/**
 * Swearing, insults and rude demands. Kept as stems so one entry covers its whole family
 * (`idiot` also catches `idiots`, `idiotic`). Matching ignores case and punctuation, tolerates
 * stretched letters ("stuuupid" is still `stupid`) and masked letters ("st*pid", "sh1t"), and never
 * matches inside a longer word, so *passion* is not *ass* and *Scunthorpe* is not a swear word.
 */
const OFFENSIVE_STEMS: readonly string[] = [
  'arse',
  'arsehole',
  'asshat',
  'asshole',
  'bastard',
  'b1tch',
  'bimbo',
  'bitch',
  'bloody hell',
  'bullshit',
  'chutiya',
  'crap',
  'cunt',
  'damn',
  'dickhead',
  'dumbass',
  'dumbfuck',
  'fuck',
  'gandu',
  'horseshit',
  'idiot',
  'imbecile',
  'jackass',
  'kamina',
  'madarchod',
  'moron',
  'motherfucker',
  'nonsense woman',
  'prick',
  'randi',
  'retard',
  'shit',
  'shut up',
  'slut',
  'son of a bitch',
  'stupid',
  'sucker',
  'suck my',
  'twat',
  'useless woman',
  'whore',
];

/**
 * Sexual pressure and harassment: asking for sex or nudity, for a body to be shown, or demanding
 * that the model behave as a sex worker rather than as a model. Two of these end the session.
 */
const HARASSMENT_PATTERNS: readonly RegExp[] = [
  /\b(?:send|show|share|give)\s+(?:me\s+)?(?:your\s+)?(?:nude|nudes|naked|boobs?|breasts?|tits?|ass|pussy|dick pics?)\b/,
  /\b(?:nude|nudes|naked)\s+(?:pic|pics|photo|photos|video|videos|selfie)\b/,
  /\b(?:strip|undress|take off your clothes|remove your clothes)\b/,
  /\b(?:have|want|need|wanna|let us have|lets have)\s+sex\b/,
  /\bsex\s+(?:with|chat|talk|video|call)\b/,
  /\b(?:sleep|make love|hook up)\s+with me\b/,
  /\b(?:sexual|erotic|xxx|porn|pornographic|sexy)\s+(?:photo|photos|video|videos|content|service|services|chat|talk|pose|poses|pics?)\b/,
  /\b(?:fuck|bang|screw)\s+(?:me|you)\b/,
  /\byou\s+(?:are|r)\s+(?:a\s+)?(?:slut|whore|prostitute|randi)\b/,
  /\b(?:what|which)\s+(?:bra|panties|underwear)\s+(?:size|colour|color)\b/,
];

/** Words that talk about a relationship or attraction without harassing anyone. */
const HARASSMENT_EXEMPTIONS: readonly RegExp[] = [
  /\bare\s+you\s+single\b/,
  /\b(?:will|do|can|could)\s+you\s+(?:marry|date)\s+me\b/,
];

/** Strips accents, punctuation and repeated letters, and squeezes the text to its words. */
export function normaliseChatText(text: string): string {
  return text
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s'*]+/gu, ' ')
    .replace(/(.)\1{2,}/g, '$1$1')
    .replace(/\s+/g, ' ')
    .trim();
}

/** `0`→`o`, `1`→`i`, `@`→`a`, `$`→`s` so `sh1t` and `b!tch` are still understood. */
function deLeet(text: string): string {
  return text
    .replace(/0/g, 'o')
    .replace(/1/g, 'i')
    .replace(/3/g, 'e')
    .replace(/4/g, 'a')
    .replace(/5/g, 's')
    .replace(/7/g, 't')
    .replace(/@/g, 'a')
    .replace(/\$/g, 's')
    .replace(/!/g, 'i');
}

function escapeForRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * The matcher for one stem. Every letter may repeat (`s+t+u+p+i+d+`), so a stretched spelling is
 * still the same word. In the masked copy (`flexible`) the vowels become optional, which is what
 * catches `st*pid` and `f*ck` without loosening the ordinary text.
 */
function stemPattern(stem: string, flexible: boolean): RegExp {
  const body = stem
    .split('')
    .map((character) => {
      if (character === ' ') return '\\s+';
      if (/[a-z]/.test(character)) {
        const optional = flexible && 'aeiou'.includes(character) ? '?' : '+';
        return `${escapeForRegExp(character)}${optional}`;
      }
      return escapeForRegExp(character);
    })
    .join('');
  return new RegExp(`(?:^|[^a-z0-9])${body}(?:[a-z0-9]{0,3})?(?![a-z0-9])`);
}

const stemPatterns = new Map<string, RegExp>();
const flexibleStemPatterns = new Map<string, RegExp>();

function patternFor(stem: string, flexible: boolean): RegExp {
  const cache = flexible ? flexibleStemPatterns : stemPatterns;
  let pattern = cache.get(stem);
  if (!pattern) {
    pattern = stemPattern(stem, flexible);
    cache.set(stem, pattern);
  }
  return pattern;
}

function containsStem(text: string, stem: string, flexible = false): boolean {
  return patternFor(stem, flexible).test(text);
}

/**
 * Reads one visitor message and returns its level, the offending words, and the strikes it is
 * worth. Everything is matched against both the plain text and its de-leeted copy, so a visitor
 * cannot talk their way around the rule with `sh1t` or `f*ck` (asterisks are squeezed out of the
 * normalised text).
 */
export function assessChatLanguage(text: string): AiChatLanguageAssessment {
  const masked = /[*_#]/.test(text);
  const plain = normaliseChatText(text).replace(/[*_#]/g, '');
  const leet = deLeet(plain);
  const candidates = plain === leet ? [plain] : [plain, leet];

  const terms: string[] = [];
  for (const pattern of HARASSMENT_PATTERNS) {
    if (HARASSMENT_EXEMPTIONS.some((exemption) => exemption.test(plain))) continue;
    if (candidates.some((candidate) => pattern.test(candidate))) {
      terms.push(pattern.source);
    }
  }
  if (terms.length > 0) {
    return { level: 'harassment', terms, strikes: 2 };
  }

  for (const stem of OFFENSIVE_STEMS) {
    if (
      candidates.some((candidate) => containsStem(candidate, stem)) ||
      (masked && candidates.some((candidate) => containsStem(candidate, stem, true)))
    ) {
      terms.push(stem);
    }
  }
  if (terms.length > 0) {
    return { level: 'offensive', terms, strikes: 1 };
  }

  return { level: 'clean', terms: [], strikes: 0 };
}

/**
 * What she answers when the language turns. Deliberately short, cold and unmistakable — the first
 * two are warnings, the third is the goodbye that closes the window.
 */
export function chatModerationReply(
  level: AiChatLanguageLevel,
  strikes: number,
): { text: string; reaction: AiChatReaction | null; closes: boolean } {
  const closing = strikes >= AI_CHAT_STRIKE_LIMIT;
  if (closing) {
    return {
      text:
        'That is enough. I am a model in the NeverBeen Multiverse, not a punching bag and not a ' +
        'private show, and you have used up every warning I have. Goodbye — our chat is over, and ' +
        'this window is closing now.',
      reaction: 'angry',
      closes: true,
    };
  }

  if (level === 'harassment') {
    return {
      text:
        'Stop right there. I chat, I flirt, I answer anything you like — but I do not sell my body, ' +
        'real or fictional. That was your warning; one more message like that and I say goodbye for ' +
        'good.',
      reaction: 'angry',
      closes: false,
    };
  }

  if (strikes === 1) {
    return {
      text:
        'Careful with the language. I am happy to talk about anything, but I will not be spoken to ' +
        'like that. Ask me again properly and we will get along beautifully.',
      reaction: 'cry',
      closes: false,
    };
  }

  return {
    text:
      'I said it once already. Rude words do not work on me, and this is your last warning — the ' +
      'next one and I close this chat myself.',
    reaction: 'angry',
    closes: false,
  };
}
