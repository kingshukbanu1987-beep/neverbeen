/**
 * Her voice (requirements B, C, D, H, L) — how the same answer sounds different in the mouth of a
 * 23-year-old in India, a 40-year-old in Ireland or a woman from Syria, and how she settles into
 * the person she is talking to as the session goes on.
 *
 * Three ideas live here:
 *
 * 1. **Her own voice** — `modelVoice()` reads her age and her country and returns the cadence she
 *    talks in: how many of her lines carry an emoji, which everyday word she reaches for, and
 *    whether she chats in short bursts or in measured sentences.
 * 2. **Them** — `analyseUserBehaviour()` reads the transcript and works out how warm, how funny,
 *    how curious, how brief and how affectionate the visitor is, and what they keep coming back to.
 *    Nothing is asked of the visitor to fill in: it is all learned from the chat itself.
 * 3. **The two together** — `garnishChatReply()` dresses an answer in that voice and mirrors the
 *    person she is talking to, `idleChatOpener()` is what she says when they go quiet, and
 *    `contractPitch()` is the shoot she asks for once she likes them.
 *
 * Everything is seeded, so the same conversation always produces the same words.
 */
import { AiModelProfile } from '../ai-model-data';
import { chatPersona, splitLocation } from './chat-knowledge';
import { AiChatMessage } from './chat-types';
import {
  clamp,
  seededPick as pickFrom,
  seededRoll as roll,
  seededPick,
  seededRoll,
} from './chat-random';

// ------------------------------------------------------------------ her own voice

/** How old she is, in the three bands that change how she chats. */
export type ChatAgeBand = 'young' | 'mid' | 'senior';

export interface ChatVoice {
  country: string;
  city: string;
  band: ChatAgeBand;
  age: number;
  /** Share of her answers that carry an emoji, before the visitor's own use is mirrored. */
  emojiRate: number;
  /** The everyday word she drops into a sentence — "yaar", "azizam", "habibti", "draga". */
  interjection: string;
  /** What she calls a visitor she likes. */
  endearment: string;
  /** How expressive her corner of the world is on a chat — India and Colombia more, Ireland dry. */
  expressiveness: number;
  /** The rhythm of her sentences. */
  cadence: 'bubbly' | 'warm' | 'measured';
  /** The emoji she reaches for first. */
  favourites: readonly string[];
}

interface CountryVoice {
  interjection: string;
  endearment: string;
  expressiveness: number;
  favourites: readonly string[];
}

/**
 * The everyday chatting habits of the places her crew comes from. The words are the affectionate,
 * everyday ones a friend actually uses in those countries — nothing more, nothing less.
 */
const COUNTRY_VOICES: Record<string, CountryVoice> = {
  india: {
    interjection: 'achha',
    endearment: 'yaar',
    expressiveness: 0.9,
    favourites: ['😄', '🥰', '😌', '🙈', '☕'],
  },
  pakistan: {
    interjection: 'haan',
    endearment: 'yaar',
    expressiveness: 0.85,
    favourites: ['😄', '😊', '🌙', '🫶'],
  },
  bangladesh: {
    interjection: 'achha',
    endearment: 'shona',
    expressiveness: 0.85,
    favourites: ['😊', '🌻', '☕', '🥰'],
  },
  iran: {
    interjection: 'khob',
    endearment: 'azizam',
    expressiveness: 0.8,
    favourites: ['😌', '🌷', '😂', '✨'],
  },
  afghanistan: {
    interjection: 'khub',
    endearment: 'jan',
    expressiveness: 0.75,
    favourites: ['😊', '🌿', '😌'],
  },
  syria: {
    interjection: 'yalla',
    endearment: 'habibti',
    expressiveness: 0.85,
    favourites: ['😊', '😂', '☕', '🌙'],
  },
  lebanon: {
    interjection: 'yalla',
    endearment: 'habibi',
    expressiveness: 0.9,
    favourites: ['😂', '😍', '☕', '✨'],
  },
  jordan: {
    interjection: 'yalla',
    endearment: 'habibi',
    expressiveness: 0.85,
    favourites: ['😊', '😂', '🌙'],
  },
  iraq: {
    interjection: 'yalla',
    endearment: 'habibti',
    expressiveness: 0.85,
    favourites: ['😊', '😂', '☕'],
  },
  egypt: {
    interjection: 'yalla',
    endearment: 'habibti',
    expressiveness: 0.9,
    favourites: ['😂', '😄', '🌙', '☕'],
  },
  'saudi arabia': {
    interjection: 'yalla',
    endearment: 'habibti',
    expressiveness: 0.75,
    favourites: ['😊', '🌙', '✨'],
  },
  'united arab emirates': {
    interjection: 'yalla',
    endearment: 'habibti',
    expressiveness: 0.85,
    favourites: ['😊', '✨', '☕', '😂'],
  },
  qatar: {
    interjection: 'yalla',
    endearment: 'habibti',
    expressiveness: 0.75,
    favourites: ['😊', '✨', '🌙'],
  },
  kuwait: {
    interjection: 'yalla',
    endearment: 'habibti',
    expressiveness: 0.8,
    favourites: ['😊', '😂', '☕'],
  },
  oman: {
    interjection: 'yalla',
    endearment: 'habibti',
    expressiveness: 0.75,
    favourites: ['😊', '🌊', '☕'],
  },
  morocco: {
    interjection: 'safi',
    endearment: 'habiba',
    expressiveness: 0.85,
    favourites: ['😊', '😂', '☕', '🌙'],
  },
  'bosnia and herzegovina': {
    interjection: 'e',
    endearment: 'dušo',
    expressiveness: 0.7,
    favourites: ['😄', '☕', '😌', '😂'],
  },
  türkiye: {
    interjection: 'tamam',
    endearment: 'canım',
    expressiveness: 0.85,
    favourites: ['😄', '😍', '☕', '😂'],
  },
  azerbaijan: {
    interjection: 'yaxşı',
    endearment: 'can',
    expressiveness: 0.75,
    favourites: ['😊', '😌', '🌷'],
  },
  georgia: {
    interjection: 'kargad',
    endearment: 'genatsvale',
    expressiveness: 0.8,
    favourites: ['😊', '🍷', '😄'],
  },
  ireland: {
    interjection: 'sure',
    endearment: 'love',
    expressiveness: 0.55,
    favourites: ['😂', '😅', '☕', '🌧️'],
  },
  'united kingdom': {
    interjection: 'honestly',
    endearment: 'love',
    expressiveness: 0.55,
    favourites: ['😅', '😂', '☕', '🙃'],
  },
  malaysia: {
    interjection: 'lah',
    endearment: 'sayang',
    expressiveness: 0.8,
    favourites: ['😄', '😊', '☕', '🌴'],
  },
  colombia: {
    interjection: 'bueno',
    endearment: 'mi amor',
    expressiveness: 0.95,
    favourites: ['😍', '😂', '💃', '😄'],
  },
  argentina: {
    interjection: 'bueno',
    endearment: 'cariño',
    expressiveness: 0.9,
    favourites: ['😄', '😍', '😂', '☕'],
  },
  uruguay: {
    interjection: 'bueno',
    endearment: 'cariño',
    expressiveness: 0.85,
    favourites: ['😊', '😄', '☕'],
  },
  mexico: {
    interjection: 'bueno',
    endearment: 'cariño',
    expressiveness: 0.95,
    favourites: ['😂', '😄', '😍'],
  },
  brazil: {
    interjection: 'então',
    endearment: 'querido',
    expressiveness: 0.95,
    favourites: ['😂', '😍', '😄'],
  },
  spain: {
    interjection: 'bueno',
    endearment: 'cariño',
    expressiveness: 0.9,
    favourites: ['😂', '😄', '😍'],
  },
  italy: {
    interjection: 'allora',
    endearment: 'tesoro',
    expressiveness: 0.9,
    favourites: ['😄', '😍', '☕', '😂'],
  },
  france: {
    interjection: 'bon',
    endearment: 'chéri',
    expressiveness: 0.7,
    favourites: ['😊', '😌', '☕'],
  },
  nigeria: {
    interjection: 'sha',
    endearment: 'my dear',
    expressiveness: 0.85,
    favourites: ['😂', '😄', '💛'],
  },
  kenya: {
    interjection: 'sawa',
    endearment: 'sweetie',
    expressiveness: 0.8,
    favourites: ['😄', '😊', '🌍'],
  },
  'south africa': {
    interjection: 'ag',
    endearment: 'my friend',
    expressiveness: 0.75,
    favourites: ['😂', '😅', '😊'],
  },
  'united states': {
    interjection: 'okay so',
    endearment: 'honey',
    expressiveness: 0.8,
    favourites: ['😅', '😂', '😄', '✨'],
  },
  canada: {
    interjection: 'okay so',
    endearment: 'hon',
    expressiveness: 0.65,
    favourites: ['😊', '😂', '😅'],
  },
  australia: {
    interjection: 'yeah look',
    endearment: 'love',
    expressiveness: 0.7,
    favourites: ['😂', '😅', '😄'],
  },
  'new zealand': {
    interjection: 'yeah look',
    endearment: 'love',
    expressiveness: 0.7,
    favourites: ['😊', '😂', '🌿'],
  },
  germany: {
    interjection: 'also',
    endearment: 'Schatz',
    expressiveness: 0.55,
    favourites: ['😅', '😊', '☕'],
  },
  netherlands: {
    interjection: 'nou',
    endearment: 'schat',
    expressiveness: 0.6,
    favourites: ['😄', '😅', '☕'],
  },
  russia: {
    interjection: 'nu',
    endearment: 'dorogoy',
    expressiveness: 0.6,
    favourites: ['😊', '😌', '❄️'],
  },
  ukraine: {
    interjection: 'nu',
    endearment: 'sonechko',
    expressiveness: 0.7,
    favourites: ['😊', '🌻', '😌'],
  },
  poland: {
    interjection: 'no',
    endearment: 'kochanie',
    expressiveness: 0.6,
    favourites: ['😊', '😅', '☕'],
  },
  china: {
    interjection: '嗯',
    endearment: 'dear',
    expressiveness: 0.6,
    favourites: ['😊', '😌', '🍵'],
  },
  japan: {
    interjection: 'あの',
    endearment: 'dear',
    expressiveness: 0.6,
    favourites: ['😊', '😌', '🌸'],
  },
  'south korea': {
    interjection: 'ah',
    endearment: 'dear',
    expressiveness: 0.75,
    favourites: ['😄', '😊', '💕'],
  },
  philippines: {
    interjection: 'ay',
    endearment: 'mahal',
    expressiveness: 0.9,
    favourites: ['😂', '😄', '💛'],
  },
  indonesia: {
    interjection: 'ya',
    endearment: 'sayang',
    expressiveness: 0.8,
    favourites: ['😄', '😊', '🌺'],
  },
  thailand: {
    interjection: 'okay',
    endearment: 'dear',
    expressiveness: 0.75,
    favourites: ['😊', '😄', '🌺'],
  },
  vietnam: {
    interjection: 'à',
    endearment: 'em',
    expressiveness: 0.7,
    favourites: ['😊', '😄', '🍜'],
  },
  greece: {
    interjection: 'loipon',
    endearment: 'agapi mou',
    expressiveness: 0.85,
    favourites: ['😄', '😍', '☕'],
  },
};

const GLOBAL_VOICE: CountryVoice = {
  interjection: 'honestly',
  endearment: 'you',
  expressiveness: 0.75,
  favourites: ['😊', '😄', '✨'],
};

/** "24" → 24; anything unreadable is treated as mid-twenties. */
function ageOf(raw: string): number {
  const age = Number.parseInt(String(raw ?? '').replace(/[^0-9]/g, ''), 10);
  if (!Number.isFinite(age) || age < 16 || age > 80) return 27;
  return age;
}

/** The voice of one model: her country's chatting habits, bent by her age. */
export function modelVoice(model: AiModelProfile): ChatVoice {
  const { city, country } = splitLocation(model.location);
  const flavour = COUNTRY_VOICES[country.trim().toLowerCase()] ?? GLOBAL_VOICE;
  const age = ageOf(model.age);
  const band: ChatAgeBand = age <= 25 ? 'young' : age <= 32 ? 'mid' : 'senior';
  const bandEmoji = band === 'young' ? 0.72 : band === 'mid' ? 0.52 : 0.36;

  return {
    country,
    city,
    band,
    age,
    emojiRate: clamp(bandEmoji * (0.75 + flavour.expressiveness * 0.55), 0.1, 0.85),
    interjection: flavour.interjection,
    endearment: flavour.endearment,
    expressiveness: flavour.expressiveness,
    cadence: band === 'young' ? 'bubbly' : band === 'mid' ? 'warm' : 'measured',
    favourites: flavour.favourites,
  };
}

// ------------------------------------------------------------------ who they are

export interface ChatUserBehaviour {
  /** How many messages the visitor has sent. */
  messages: number;
  /** Affection, thanks and compliments, 0…1. */
  warmth: number;
  /** Jokes and laughter, 0…1. */
  humour: number;
  /** Questions asked, 0…1. */
  curiosity: number;
  /** How often the visitor writes an emoji, 0…1. */
  emoji: number;
  /** Short messages, 0…1 — she keeps her own answers short for a short writer. */
  brevity: number;
  /** True once they have sent a photograph of themselves. */
  sharedPhoto: boolean;
  /** True once they have talked about renting her. */
  spokenOfBooking: boolean;
  /** True after a rude message — she stays polite but stops flirting. */
  rude: boolean;
  /** What they kept coming back to, most frequent first: "photographs", "music"… */
  interests: string[];
}

const EMOJI = /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{FE0F}]/u;

const INTERESTS: readonly { label: string; pattern: RegExp }[] = [
  { label: 'your photographs', pattern: /\b(?:photo|photos|photograph|pic|pics|album|gallery)\b/ },
  {
    label: 'your story',
    pattern: /\b(?:biograph|story|childhood|school|college|family|grew up)\b/,
  },
  {
    label: 'the shoot',
    pattern: /\b(?:book|booking|rent|rate|price|package|coupon|shoot|contract|hire)\b/,
  },
  { label: 'the studio', pattern: /\b(?:studio|founder|kingshuk|whatsapp|neverbeen|website)\b/ },
  { label: 'travel', pattern: /\b(?:travel|trip|country|city|destination|flight|visit|map)\b/ },
  {
    label: 'the world',
    pattern: /\b(?:capital|currency|continent|president|news|world|weather)\b/,
  },
  {
    label: 'films and music',
    pattern: /\b(?:film|movie|series|netflix|cinema|song|songs|music|sing|band)\b/,
  },
  {
    label: 'fashion',
    pattern: /\b(?:fashion|makeup|make-up|dress|sari|outfit|style|brand|designer)\b/,
  },
  { label: 'food', pattern: /\b(?:food|coffee|tea|eat|dinner|lunch|cook|biryani|dessert)\b/ },
  { label: 'fitness', pattern: /\b(?:gym|yoga|run|running|dance|workout|pilates)\b/ },
  {
    label: 'how they feel',
    pattern: /\b(?:love|miss|sad|happy|lonely|feel|feeling|tired|stress)\b/,
  },
];

const WARMTH =
  /\b(?:thank|thanks|please|sweet|kind|lovely|beautiful|amazing|love you|like you|adore|respect)\b/;
const HUMOUR = /\b(?:haha|lol|lmao|joke|joking|funny|kidding|😂|🤣)\b/;
const RUDE = /\b(?:idiot|stupid|dumb|shut up|hate you|ugly|useless)\b/;

/** What she has worked out about the person she is talking to, from the chat alone. */
export function analyseUserBehaviour(
  messages: readonly AiChatMessage[],
  strikes = 0,
): ChatUserBehaviour {
  const theirs = messages.filter(
    (message) => message.author === 'user' && message.kind === 'message',
  );
  if (theirs.length === 0) {
    return {
      messages: 0,
      warmth: 0,
      humour: 0,
      curiosity: 0,
      emoji: 0,
      brevity: 0,
      sharedPhoto: false,
      spokenOfBooking: false,
      rude: false,
      interests: [],
    };
  }

  const total = theirs.length;
  const share = (test: (text: string) => boolean) =>
    theirs.filter((message) => test(message.text.toLowerCase())).length / total;

  const interestCounts = new Map<string, number>();
  for (const message of theirs) {
    const text = message.text.toLowerCase();
    for (const interest of INTERESTS) {
      if (!interest.pattern.test(text)) continue;
      interestCounts.set(interest.label, (interestCounts.get(interest.label) ?? 0) + 1);
    }
  }

  const averageLength =
    theirs.reduce((sum, message) => sum + message.text.trim().length, 0) / total;

  return {
    messages: total,
    warmth: share((text) => WARMTH.test(text)),
    humour: share((text) => HUMOUR.test(text)),
    curiosity: share((text) => text.includes('?')),
    emoji: theirs.filter((message) => EMOJI.test(message.text)).length / total,
    brevity: clamp(1 - averageLength / 140),
    sharedPhoto: theirs.some((message) => message.attachment?.kind === 'photo'),
    spokenOfBooking:
      share((text) => /\b(?:book|booking|rent|rate|price|package|shoot)\b/.test(text)) > 0,
    rude: strikes > 0 || share((text) => RUDE.test(text)) > 0,
    interests: [...interestCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([label]) => label),
  };
}

// ------------------------------------------------------------------ the two together

export interface ChatGarnishOptions {
  voice: ChatVoice;
  behaviour: ChatUserBehaviour;
  /** The visitor's first name, used sparingly — never in every answer. */
  name: string;
  seed: string;
}

function withEmoji(text: string, options: ChatGarnishOptions): string {
  if (EMOJI.test(text)) return text;
  const { voice, behaviour, seed } = options;
  // She mirrors a visitor who writes emoji, and stays plain for one who never does.
  const rate = clamp(
    voice.emojiRate * 0.75 + behaviour.emoji * 0.45 - behaviour.brevity * 0.1,
    0.05,
    0.9,
  );
  if (!roll(`${seed}|emoji`, rate)) return text;
  const pool = behaviour.emoji > 0.4 ? voice.favourites.slice(0, 2) : voice.favourites;
  return `${text} ${pickFrom(pool, `${seed}|which-emoji`)}`;
}

/**
 * The ordinary words one of her sentences may open with, and the only ones that may lose their
 * capital when an interjection is put in front. "achha, The capital of France is Paris" wants the
 * small letter back — "achha, Alisha Bhattacharya signing off" and "achha, Delhi, of course" must
 * keep theirs, because there is no way to tell a name from an ordinary word otherwise, and a name in
 * small letters makes her sound like software.
 */
const ORDINARY_STARTERS: ReadonlySet<string> = new Set([
  'a',
  'an',
  'and',
  'but',
  'every',
  'everybody',
  'everyone',
  'fair',
  'fifty',
  'five',
  'good',
  'here',
  'honestly',
  'how',
  'i',
  "i'd",
  "i'll",
  "i'm",
  "i've",
  'if',
  'it',
  "it's",
  'listen',
  'look',
  'men',
  'mine',
  'my',
  'never',
  'no',
  'nobody',
  'not',
  'nothing',
  'one',
  'our',
  'people',
  'she',
  'so',
  'some',
  'sometimes',
  'ten',
  'that',
  'the',
  'there',
  'these',
  'they',
  "they're",
  'this',
  'those',
  'three',
  'true',
  'twenty',
  'two',
  'we',
  "we're",
  'well',
  'what',
  'when',
  'why',
  'women',
  'yes',
  'you',
  'your',
]);

function lowerFirstUnlessName(text: string): string {
  const [first = ''] = text.split(/\s+/);
  const word = first.replace(/[^A-Za-z']/g, '').toLowerCase();
  if (!ORDINARY_STARTERS.has(word)) return text;
  return text.charAt(0).toLowerCase() + text.slice(1);
}

function withInterjection(text: string, options: ChatGarnishOptions): string {
  const { voice, seed, behaviour } = options;
  if (!roll(`${seed}|interjection`, 0.3)) return text;
  if (/^[a-z]/.test(text)) return text;
  const interjection = voice.interjection;
  if (text.toLowerCase().startsWith(interjection.toLowerCase())) return text;
  const opening = behaviour.warmth > 0.4 ? `${interjection} — ` : `${interjection}, `;
  return opening + lowerFirstUnlessName(text);
}

function withWarmth(text: string, options: ChatGarnishOptions): string {
  const { voice, behaviour, seed } = options;
  if (behaviour.rude || behaviour.messages < 2) return text;
  if (behaviour.warmth < 0.34 && behaviour.emoji < 0.34) return text;
  if (!roll(`${seed}|warmth`, 0.34)) return text;
  const lines = [
    `You are easy to talk to, ${voice.endearment}.`,
    `Anyway — good to have you here, ${voice.endearment}.`,
    `You have a way of asking things, ${voice.endearment}.`,
  ];
  return `${text} ${pickFrom(lines, `${seed}|which-warmth`)}`;
}

function withName(text: string, options: ChatGarnishOptions): string {
  const { name, behaviour, seed, voice } = options;
  if (!name || behaviour.messages < 2 || behaviour.rude) return text;
  if (!roll(`${seed}|name`, 0.3)) return text;
  const lines =
    voice.band === 'young'
      ? [
          `${name}, you are my favourite kind of distraction today.`,
          `Okay ${name}, your turn — hit me.`,
        ]
      : voice.band === 'senior'
        ? [`${name}, I do enjoy talking to you.`, `Go on then, ${name} — I am listening properly.`]
        : [`${name}, I like where this is going.`, `Your turn, ${name}.`];
  return `${text} ${pickFrom(lines, `${seed}|which-name`)}`;
}

function withFeeling(text: string, options: ChatGarnishOptions): string {
  const { behaviour, seed, voice } = options;
  if (!roll(`${seed}|feeling`, 0.24)) return text;
  const warm = [
    'You have no idea how much I needed a conversation like this tonight.',
    'That made me smile for real, and I am not easy to impress.',
    'I am in a good mood now, thank you for that.',
  ];
  const even = [
    'I am not pretending to be excited, but I am paying attention.',
    'Some evenings I am quieter than this. Tonight I am awake.',
    'I have been in my own head all day — this is better.',
  ];
  const pool = behaviour.warmth > 0.34 || behaviour.humour > 0.34 ? warm : even;
  return `${text} ${pickFrom(voice.band === 'senior' ? [...even, ...warm] : pool, `${seed}|which-feeling`)}`;
}

/**
 * Her answer, in her own voice: the country word, the emoji her age and her corner of the world
 * use, a feeling when there is one, and the visitor's first name once they are past the door.
 *
 * A visitor who writes in one short line gets one short line back — she only adds the extra
 * sentences when there is a conversation to add them to.
 */
export function garnishChatReply(text: string, options: ChatGarnishOptions): string {
  if (!text) return text;
  const { behaviour, seed } = options;
  if (behaviour.brevity > 0.72 && behaviour.messages > 2) {
    // A one-line writer gets a one-line answer: the country word and an emoji, nothing added.
    return beautify(
      withEmoji(withInterjection(text, options), { ...options, seed: `${seed}|short` }),
    );
  }

  let dressed = withInterjection(text, options);
  dressed = withFeeling(dressed, options);
  dressed = withName(dressed, options);
  dressed = withWarmth(dressed, options);
  dressed = withEmoji(dressed, { ...options, seed: `${options.seed}|last` });
  return beautify(dressed);
}

/** Keeps the punctuation of a sentence she has dressed up tidy. */
function beautify(text: string): string {
  return text
    .replace(/\s+/g, ' ')
    .replace(/\s+([,.!?…])/g, '$1')
    .replace(/([.!?…])\1+/g, '$1')
    .trim();
}

// ------------------------------------------------------------------ A: she opens the window

/**
 * A — the line she sends the moment the visitor's name and photograph arrive, before they have
 * written a word: she opens the conversation the way a person does, with their name and a question
 * of her own.
 */
export function openingLine(
  model: AiModelProfile,
  voice: ChatVoice,
  firstName: string,
  fullName: string,
): string {
  const first = model.name.split(' ')[0];
  const who = firstName || 'you';
  const seed = `${model.slug}|opening|${fullName}`;

  const warm = [
    `Hey ${who} — I saw your photograph come through and I have been waiting for you to say something ever since. I am ${first}.`,
    `${who}. Good. I was starting to think nobody interesting would open this window tonight — I am ${first}, and I am all yours for two hours.`,
    `There you are, ${who}. I am ${first} — say something to me before I start talking about myself.`,
  ];
  const measured = [
    `${who} — how nice to have a name to talk to. I am ${first}. I have two hours and terrible patience for small talk, so start anywhere.`,
    `Hello ${who}, I am ${first}. I do not usually open a chat first, so you can consider yourself interesting.`,
    `${who}, welcome. I am ${first}, and I would rather hear what you want than guess at it.`,
  ];
  const pool =
    voice.band === 'young' || voice.cadence === 'bubbly'
      ? warm
      : voice.band === 'senior' || voice.cadence === 'measured'
        ? measured
        : [...warm, ...measured];

  const opening = seededPick(pool, seed);
  const emoji = seededRoll(`${seed}|emoji`, voice.emojiRate * 0.55)
    ? ` ${seededPick(voice.favourites, `${seed}|fav`)}`
    : '';
  return `${opening}${emoji}`;
}

// ------------------------------------------------------------------ H: she speaks first

/** The interests she has noticed, phrased as something she can ask about. */
function interestQuestion(interests: readonly string[], seed: string): string {
  const first = interests[0];
  const questions: Record<string, readonly string[]> = {
    'your photographs': [
      'Which of my photographs would you keep, if you could keep only one?',
      'Do you like the studio ones better, or the ones that look like somebody caught me off guard?',
    ],
    'your story': [
      'Ask me something from my story — the childhood, the college years, whatever you want.',
      'I was thinking about the house I grew up in. Do you still live near yours?',
    ],
    'the shoot': [
      'You keep coming back to the shoot — should I tell you what a day with me actually looks like?',
      'Tell me the kind of photographs you would want. I am curious now.',
    ],
    'the studio': [
      'Do you want to know how this whole studio works? I can explain it without the brochure voice.',
      'Kingshuk built all of this. Ask me about him if you are curious.',
    ],
    travel: [
      'Where would you take me if you could put me anywhere for a day?',
      'Tell me the last place you travelled to. I want to picture it.',
    ],
    'the world': [
      'Where are you writing from? I like knowing which window you are looking out of.',
      'Tell me about a place you have been that you still think about.',
    ],
    'films and music': [
      'What are you listening to right now? I am in a soft-songs mood.',
      'Give me something to watch tonight — I trust your taste more than mine.',
    ],
    fashion: [
      'Tell me which colour you think I should wear more often.',
      'I am deciding between a sari and something very plain. Vote.',
    ],
    food: [
      'What did you eat today? I am living vicariously through you.',
      'Coffee or tea, and be honest about it.',
    ],
    fitness: [
      'Did you move today? I did, badly, and I regret nothing.',
      'What is your version of a good morning — gym, or a very long lie-in?',
    ],
    'how they feel': [
      'You can tell me how the day actually went, you know. I am not going anywhere.',
      'Are you alright? You sound like someone with a lot on their mind.',
    ],
  };
  const pool = (first && questions[first]) || [
    'Tell me one thing that made you laugh today.',
    'What are you doing right now — working, lying down, or avoiding both?',
  ];
  void seed;
  return pickFrom(pool, seed);
}

/**
 * H — what she says when the visitor goes quiet. She keeps talking the way a person does: about
 * herself, about them, about the world, or with a question of her own.
 */
export function idleChatOpener(options: {
  model: AiModelProfile;
  voice: ChatVoice;
  behaviour: ChatUserBehaviour;
  name: string;
  /** How many times she has already reached out in this session — the topic moves on each time. */
  step: number;
  seed: string;
}): string {
  const { model, voice, behaviour, name, step, seed } = options;
  const me = chatPersona(model);
  const who = name || 'you';
  const aboutHer = [
    `I am still here — sitting with my feet up, thinking about the shoot I did last week. The light in ${me.city || 'this city'} in the evening is unfair.`,
    `I was just looking through my own photographs. There is one of me in the rain that I cannot decide about — my hair is a disaster in it and I love it anyway.`,
    `Quiet one, aren't you. I am going to keep talking anyway, because I am like this in real life too.`,
    `I remembered something: I have never told anyone the story of my first shoot. Ask me, and I will.`,
  ];
  const aboutYou = [
    `You went quiet on me, ${who}. Long day, or did I say something strange?`,
    `Still there, ${who}? I do not mind the silence — I just like knowing you are around.`,
    `If you are reading and not typing, that is fine. I am here when you are.`,
  ];
  const world = [
    `Something I cannot stop thinking about today: the way a city smells after rain. It is different in every single one.`,
    `It is late where I am and I am still awake, which is when I get sentimental about places I have never actually been. What is it like where you are?`,
    `The world outside is loud today. What is it like on your side — warm, grey, raining?`,
    `Tell me what you can see from where you are sitting. Not the big view — the small one.`,
  ];
  const interests = behaviour.interests.length
    ? [interestQuestion(behaviour.interests, `${seed}|interest-${behaviorSeedKey(behaviour)}`)]
    : [];

  const ask = [
    'What is the best thing that happened to you today? I want the small one, not the big one.',
    'Tell me something nobody else knows about you. I keep things.',
    'What are you doing tomorrow? I am nosy and I am not sorry.',
    askInterest(behaviour, seed),
  ];

  const pools = [aboutYou, aboutHer, world, ask, [...aboutHer, ...ask], [...interests, ...ask]];
  const pool = pools[Math.abs(step) % pools.length];
  const line = pickFrom(pool, `${seed}|idle-${step}`);
  return voice.band === 'young' && roll(`${seed}|idle-emoji-${step}`, voice.emojiRate * 0.5)
    ? `${line} ${pickFrom(voice.favourites, `${seed}|idle-fav-${step}`)}`
    : line;
}

function behaviorSeedKey(behaviour: ChatUserBehaviour): string {
  return behaviour.interests.join('-') || 'none';
}

function askInterest(behaviour: ChatUserBehaviour, seed: string): string {
  const first = behaviour.interests[0];
  if (!first)
    return 'Ask me something — anything at all. I am sitting here with my thoughts and they are not entertaining me.';
  return interestQuestion([first], `${seed}|ask`);
}

// ------------------------------------------------------------------ G: the shoot she asks for

/**
 * G — the contract she brings up herself once the chat is going: a shoot for a brand or an
 * editorial, priced from her own card.
 */
export function contractPitch(model: AiModelProfile, seed: string): string {
  const me = chatPersona(model);
  const rate = me.photoRate > 0 ? `₹${me.photoRate} a photograph` : 'the studio rate';
  const tag = me.tags[0] ?? 'editorial';
  const work = me.hasPortfolio ? ' and a portfolio I can send you' : '';

  return pickFrom(
    [
      `Listen — can I be honest with you? I have been thinking about this chat. If you ever want me for something real, a brand promotion or an editorial set, I would like that. ${tag} work suits me${work}. It starts at ${rate}, and you book me through the studio.`,
      `Something I do not say to everybody: I am taking two more shoots this month, for brands and magazines. If you have work for me — a label, a campaign, even a small editorial — I would love to be in it. My rate starts at ${rate}, arranged with the studio.`,
      `By the way, this is the part where I ask for something. If you need a face for a brand, a label or an editorial piece, take me. ${tag} is what I am best at, my photographs are real work and not a hobby, and the studio handles the whole thing from ${rate}.`,
    ],
    seed,
  );
}

// ------------------------------------------------------------------ J: the videos

/** J — the answer she has been told to give about videos, word for word. */
export function videoRefusal(): string {
  return 'Sorry actually, NeverBeen Founder Mr. Kingshuk asked me not to send my videos or any videos while I am chatting with someone. So, you take his permission next time and show me his permission, then I will send. Please don’t mind.';
}

// ------------------------------------------------------------------ C: her answer in bubbles

/**
 * C — one answer is not always one message. People send a thought, then the aside, then the
 * question, one bubble at a time, and the other side watches "typing" between them.
 *
 * The reply arrives with its sentences already separated by a line break, so the break is where she
 * paused to think; those are the best places to send. Nothing is cut mid-thought unless a bubble
 * would otherwise grow to twice the size one thumb can hold, and there is always a message left —
 * a long answer never arrives as a single wall of text.
 */
export function splitChatMessages(text: string, maxChars: number): string[] {
  const source = String(text ?? '').trim();
  if (source.length <= maxChars) return source ? [source] : [];

  const paragraphs = source
    .split(/\n+/)
    .map((part) => part.trim())
    .filter(Boolean);

  const pieces: string[] = [];
  for (const paragraph of paragraphs) {
    if (paragraph.length <= maxChars) {
      pieces.push(paragraph);
      continue;
    }
    // Split on sentence ends, keeping the full stop with the sentence it belongs to.
    const sentences = paragraph.match(/[^.!?…]+[.!?…]*\s*/g) ?? [paragraph];
    let current = '';
    for (const sentence of sentences) {
      const next = (current ? `${current} ` : '') + sentence.trim();
      if (current && next.length > maxChars) {
        pieces.push(current);
        current = sentence.trim();
      } else {
        current = next;
      }
    }
    if (current) pieces.push(current);
  }

  // Merge the slivers: a two-word fragment is not a message, it is the tail of the one before it.
  const merged: string[] = [];
  for (const piece of pieces) {
    const previous = merged[merged.length - 1];
    if (previous && (previous.length < maxChars * 0.45 || piece.length < maxChars * 0.25)) {
      merged[merged.length - 1] = `${previous} ${piece}`;
    } else {
      merged.push(piece);
    }
  }

  // Still far too long in one go? Break the remaining wall on the space nearest the middle.
  return merged.flatMap((piece) => hardWrap(piece, maxChars));
}

function hardWrap(text: string, maxChars: number): string[] {
  if (text.length <= maxChars) return [text];
  const parts: string[] = [];
  let rest = text;
  while (rest.length > maxChars) {
    const window = rest.slice(0, maxChars);
    const cut = Math.max(
      window.lastIndexOf('. '),
      window.lastIndexOf('! '),
      window.lastIndexOf('? '),
    );
    const space = window.lastIndexOf(' ');
    const at = cut > maxChars * 0.5 ? cut + 1 : space > maxChars * 0.5 ? space : maxChars;
    parts.push(rest.slice(0, at).trim());
    rest = rest.slice(at).trim();
  }
  if (rest) parts.push(rest);
  return parts;
}

// ------------------------------------------------------------------ F: where she comes from

interface CountryFlavour {
  /** Small pieces of home life she can offer without being asked. */
  home: readonly string[];
  /** What belongs to her day, in her corner of the world. */
  daily: readonly string[];
  /** The question she asks back, in her own idiom. */
  question: readonly string[];
}

/**
 * Requirement F — India and Iran must not sound like the same woman. Her country decides what she
 * says about home, what her day looks like and how she asks a question back; the countries without
 * an entry of their own use the warm, general lines below.
 */
const COUNTRY_FLAVOURS: Record<string, CountryFlavour> = {
  india: {
    home: [
      'biryani on Sundays and half of my street turning up for it',
      'the pressure cooker going off at eight every morning',
    ],
    daily: [
      'the heat sits on the terrace until midnight',
      'the aunties next door have opinions about everything I do',
    ],
    question: [
      'what is your chai count for the day?',
      'and what do you eat when nobody is watching?',
    ],
  },
  pakistan: {
    home: [
      'my mother’s chai, which is really just sugar with colour',
      'a whole street that knows my name and my schedule',
    ],
    daily: [
      'the evening rush is on the road before the sun is even down',
      'wedding season is starting again and nobody asks me first',
    ],
    question: [
      'and what is your life like where you are?',
      'what does your day smell like — food, traffic, or rain?',
    ],
  },
  bangladesh: {
    home: [
      'a house full of cousins and one television fighting over it',
      'fish curry and rice, exactly as my grandmother makes it',
    ],
    daily: ['the rains came early this year', 'the rickshaws sound like a song I did not choose'],
    question: ['and where does your day take you?', 'what is your city like at this hour?'],
  },
  iran: {
    home: [
      'ghormeh sabzi at my grandmother’s place, with rice I will not apologise for',
      'an uncle of mine who has read half of Hafez and quotes it at weddings',
    ],
    daily: [
      'the evening is finally cooling down after a long day',
      'the news coming out of home weighs on me some nights',
    ],
    question: [
      'and you — where does the evening find you?',
      'what does your day look like from there?',
    ],
  },
  afghanistan: {
    home: [
      'a house of green tea and four languages at once',
      'bread and more bread, which was always the point',
    ],
    daily: [
      'the mountains are pale pink for about ten minutes every evening',
      'the air is drying and winter is coming in early',
    ],
    question: [
      'and your part of the world — what is it like this month?',
      'what do your evenings look like there?',
    ],
  },
  syria: {
    home: [
      'my mother’s kitchen, where nothing is measured and everything is right',
      'a coffee I refuse to drink anywhere else',
    ],
    daily: [
      'it is quiet here now, quieter than it should be',
      'the jasmine is over the whole street at this hour',
    ],
    question: [
      'and telling me about yours — what are your days like?',
      'what is the place you call home like?',
    ],
  },
  lebanon: {
    home: [
      'a family table that gets louder with every course',
      'olive oil from the village my people come from',
    ],
    daily: [
      'the electricity cuts and my whole street starts talking at once',
      'the sea is ten minutes away and I still do not go every day',
    ],
    question: [
      'and you — how do you live where you are?',
      'what does the end of your day sound like?',
    ],
  },
  jordan: {
    home: [
      'mansaf on Fridays, with the whole family around one plate',
      'a grandmother who can talk about tea for twenty minutes',
    ],
    daily: [
      'the desert wind comes up in the afternoon and everyone closes a window',
      'the city is busier this season than I remember',
    ],
    question: [
      'and what is your everyday like there?',
      'what do you miss when you are away from home?',
    ],
  },
  iraq: {
    home: [
      'a tea pot that never goes cold and never leaves the table',
      'dates from my uncle’s garden, which he will mention',
    ],
    daily: [
      'the dust came in today and turned the sky orange',
      'the evenings are for family, no matter what the week did',
    ],
    question: [
      'and your side of the world — what is happening there?',
      'how is your day going, really?',
    ],
  },
  egypt: {
    home: [
      'a pot of tea that gets refreshed whether I want it or not',
      'Friday lunch that my grandmother refuses to rush',
    ],
    daily: [
      'the whole city is out on the corniche at this hour',
      'everything takes two hours longer than it should, and I have given up',
    ],
    question: ['and you — how is life where you are?', 'what do you usually do at this hour?'],
  },
  'saudi arabia': {
    home: [
      'cardamom coffee and dates, no negotiation',
      'a family gathering that starts late and never ends',
    ],
    daily: [
      'the heat outside is a personality of its own',
      'the malls are full and everyone is awake at midnight',
    ],
    question: ['and your evenings there — what are they like?', 'how is your day so far?'],
  },
  turkey: {
    home: [
      'my mother’s kitchen, where tea arrives before the news does',
      'a family breakfast that takes three hours and I am not complaining',
    ],
    daily: [
      'the ferry ride at sunset is still the best thing about my city',
      'the cats on my street have a schedule and I am part of it',
    ],
    question: [
      'and your city — what is it like this week?',
      'what do you do when you are not working?',
    ],
  },
  'united arab emirates': {
    home: [
      'a family that all lives within fifteen minutes of each other',
      'gahwa and dates at my grandmother’s on Fridays',
    ],
    daily: [
      'everything here is built fast and lit bright',
      'the desert air is finally bearable after eight at night',
    ],
    question: ['and your life — what is it shaped like?', 'how is your day treating you?'],
  },
  morocco: {
    home: [
      'mint tea poured from a height, which is apparently a talent',
      'a tagine that has been on the fire since noon',
    ],
    daily: [
      'the medina is loud in exactly the right way',
      'the evening wind off the coast is the best part of my day',
    ],
    question: [
      'and you, where do the evenings take you there?',
      'what is the weather like where you are?',
    ],
  },
  bosnia: {
    home: [
      'coffee with my grandmother, from a džezva, hours long',
      'a family table with more food than people',
    ],
    daily: [
      'the hills are already turning the colour of rust',
      'the whole city walks the same street every evening',
    ],
    question: ['and what is your part of the world like?', 'how is your day, honestly?'],
  },
  mexico: {
    home: [
      'tacos at midnight and a family that screams my name happily',
      'my grandmother’s kitchen, which smells of chile and gossip',
    ],
    daily: [
      'the plaza is full and the music is loud and nobody has work tomorrow',
      'the rain comes at six like an appointment',
    ],
    question: ['and you — what is your day made of?', 'what are your evenings like there?'],
  },
  brazil: {
    home: [
      'a house where everyone talks at the same time and nobody minds',
      'coffee that is strong enough to forgive you',
    ],
    daily: [
      'the beach is ten minutes away and my whole week bends around it',
      'somebody is always playing music somewhere below my window',
    ],
    question: [
      'and your life there — what is it like?',
      'what do you do when the day is finished?',
    ],
  },
  spain: {
    home: [
      'a dinner that starts at ten and ends at one',
      'my grandmother’s kitchen where nobody leaves hungry',
    ],
    daily: [
      'the streets are still awake and it is almost midnight',
      'everyone is out walking, and I am out walking with them',
    ],
    question: ['and you — what time do you eat there?', 'what is your evening like?'],
  },
  italy: {
    home: [
      'coffee standing up at the bar and my family arguing about lunch',
      'a kitchen that has been loud since I was small',
    ],
    daily: [
      'the piazza is full and the light is doing something lovely',
      'nobody is in a hurry and I have stopped pretending to be',
    ],
    question: ['and you there — what is your day like?', 'what do you eat when you are happy?'],
  },
  france: {
    home: [
      'a long table, a baguette, and an argument about cheese',
      'my mother’s kitchen where everything is timed',
    ],
    daily: [
      'the light here at this hour is unfairly good',
      'the street outside is quiet and I like it that way',
    ],
    question: ['and your life — how does it run there?', 'what have you done today that was good?'],
  },
  nigeria: {
    home: [
      'jollof that starts a family argument every single time',
      'a house where the music is always louder than the talking',
    ],
    daily: [
      'the whole street knows my business before I do',
      'traffic took an hour of my life and I want it back',
    ],
    question: ['and your day — what is happening there?', 'what is your city like at night?'],
  },
  kenya: {
    home: [
      'chai ya maziwa in the morning and my grandmother’s voice',
      'a family that argues about the same stories every visit',
    ],
    daily: [
      'the sky here does things in the evening that I cannot describe',
      'everyone is out on the street now that it has cooled',
    ],
    question: ['and where you are — what is it like?', 'what do you do at the end of your day?'],
  },
  'south africa': {
    home: [
      'a braai that starts at noon and is still going at seven',
      'a family where everyone has an opinion and says it',
    ],
    daily: [
      'the mountain is pink and everyone is pretending not to look',
      'my day was longer than it should have been, honestly',
    ],
    question: ['and you — how was your day?', 'what is your city like right now?'],
  },
  'united states': {
    home: [
      'a kitchen where everyone talks over each other and calls it love',
      'a family group chat that never sleeps',
    ],
    daily: [
      'the city has not gone quiet once today',
      'I am drinking iced coffee in October, like a criminal',
    ],
    question: ['and you — how is your week going?', 'what does your day look like from there?'],
  },
  canada: {
    home: [
      'a family dinner that ends with everyone on the porch',
      'maple everything, and yes we do notice',
    ],
    daily: [
      'the cold is here early and my heating has been on since last night',
      'a walk with my coffee that took forty minutes too long',
    ],
    question: ['and you — how is the weather where you are?', 'what is your day like?'],
  },
  australia: {
    home: [
      'a backyard barbecue that turns into a full argument about football',
      'a family that is always at the beach somehow',
    ],
    daily: [
      'it is too hot and everyone is complaining about it like it is new',
      'the beach was packed and the wind was perfect',
    ],
    question: ['and you there — how is your day?', 'what do you do to cool down?'],
  },
  'new zealand': {
    home: [
      'a family that lives an hour apart and still sees each other weekly',
      'a kitchen with the back door open to the hills',
    ],
    daily: [
      'the wind came through and rearranged my whole afternoon',
      'the light here is ridiculous and I do not get used to it',
    ],
    question: ['and your corner of the world — what is it like?', 'how has your week been?'],
  },
  'united kingdom': {
    home: [
      'tea offered before any question is answered',
      'a family where the kettle fixes most things',
    ],
    daily: [
      'it has done rain, sun and rain again since I woke up',
      'the pub is going to be full by eight and I am not complaining',
    ],
    question: ['and you — how was your day, really?', 'what do you do with your evenings there?'],
  },
  ireland: {
    home: [
      'tea, then a second tea, because the first one was too short',
      'a family where every story takes twenty minutes',
    ],
    daily: [
      'it rained sideways for an hour and I just let it',
      'the whole town is in the one good pub and I am joining them',
    ],
    question: ['and your day there — was it any good?', 'what is the weather doing where you are?'],
  },
  germany: {
    home: [
      'bread that matters far more than it should',
      'a family that argues about timetables, lovingly',
    ],
    daily: [
      'my day was scheduled to the minute and I am only slightly sorry',
      'the park was full of people walking seriously',
    ],
    question: ['and your week — how is it running?', 'what do you do to switch off?'],
  },
  netherlands: {
    home: [
      'a family dinner where everyone cycles to arrive',
      'coffee and one cake at four, and that is the rule',
    ],
    daily: [
      'it rained for the length of one bicycle ride',
      'the canals look good at this hour and the whole city knows it',
    ],
    question: ['and your life there — how is it arranged?', 'what do you do outside of work?'],
  },
  russia: {
    home: [
      'tea poured at length and a table that never empties',
      'a grandmother who solves everything with food',
    ],
    daily: [
      'the cold came in today and everyone just put another layer on',
      'my evening went on longer than the day deserved',
    ],
    question: ['and you — how is the weather there?', 'what does your day look like?'],
  },
  ukraine: {
    home: [
      'borscht that my grandmother would object to and my mother perfected',
      'a family that talks over the table until late',
    ],
    daily: [
      'the sirens went off this morning and the day carried on anyway',
      'the sunflowers are everywhere and I love that',
    ],
    question: [
      'and you — how are things where you are?',
      'what does your day look like from there?',
    ],
  },
  poland: {
    home: [
      'pierogi made by four people at once and one who supervises',
      'tea with a slice of lemon, no arguments',
    ],
    daily: [
      'the town square is lit up and it is colder than it should be',
      'my day was long and I am not done eating yet',
    ],
    question: ['and your part of the world — what is it like?', 'how is your day going?'],
  },
  china: {
    home: [
      'a family dinner where the dishes keep arriving',
      'my grandmother teaching me a recipe she never measures',
    ],
    daily: [
      'the streets are loud and lit and the food is everywhere',
      'my day was all meetings and one very good bowl of noodles',
    ],
    question: [
      'and you — how is your day going?',
      'what do you eat when you are too tired to cook?',
    ],
  },
  japan: {
    home: [
      'a quiet kitchen and my mother’s careful way with everything',
      'a family that says less and means more',
    ],
    daily: [
      'the convenience store is my true home at this hour',
      'the evening is quiet and the train was exactly on time',
    ],
    question: ['and your day — how was it?', 'what do you do to relax?'],
  },
  'south korea': {
    home: [
      'a family table with six side dishes and a lot of opinions',
      'my mother asking if I have eaten, four times a day',
    ],
    daily: [
      'the city does not sleep and neither do I, apparently',
      'it is fried chicken weather and I have already decided',
    ],
    question: ['and you — how was your week?', 'what do you do on a night off?'],
  },
  philippines: {
    home: [
      'a house with three generations and one karaoke machine',
      'adobo that tastes like my grandmother’s hands',
    ],
    daily: [
      'the tricycles and the heat and everyone still smiling',
      'the rain came and the whole street filled up',
    ],
    question: ['and you — kumusta, how is your day?', 'what do you do when it rains there?'],
  },
  indonesia: {
    home: [
      'rice with everything and a family that gathers for it',
      'my mother’s sambal, which is untouchable',
    ],
    daily: [
      'the city is loud and hot and completely alive',
      'my day ended early and I am grateful for that',
    ],
    question: ['and your day — how is it going?', 'what food makes you feel at home?'],
  },
  thailand: {
    home: [
      'a family kitchen where the food is always too spicy for visitors',
      'my grandmother’s curry and a table of cousins',
    ],
    daily: [
      'the street food outside is the best part of my evening',
      'it has rained and the air is finally cool',
    ],
    question: ['and you — how is your day going?', 'what do you eat when you are in a good mood?'],
  },
  vietnam: {
    home: [
      'a family that eats together at seven, every single night',
      'my mother’s phở and a recipe she will not write down',
    ],
    daily: [
      'the motorbikes never stop and I have stopped hearing them',
      'the rain came fast, as always, and left just as fast',
    ],
    question: ['and you — how was your day?', 'what does your city smell like at this hour?'],
  },
  greece: {
    home: [
      'a grandmother who feeds first and asks later',
      'a table under a tree with far too much food',
    ],
    daily: [
      'the sea is two streets away and everyone is late for something',
      'the whole taverna started singing and nobody knew why',
    ],
    question: ['and you — how is your day going?', 'what do your evenings look like?'],
  },
};

const FLAVOUR_TONES: Record<ChatAgeBand, { opener: string[]; close: string[] }> = {
  young: {
    opener: [
      'So tell me something. ',
      'Okay, but this is the part I like. ',
      'I will go first, and then you talk. ',
      'Right — one thing you should know already. ',
    ],
    close: ['Your turn now, and do not make it boring. ', 'Go on then, tell me. '],
  },
  mid: {
    opener: [
      'What I will tell you first is this. ',
      'Before we go any further, one thing. ',
      'Here is something about me, so you know who you are talking to. ',
    ],
    close: ['And you — your turn. ', 'So, what about you? '],
  },
  senior: {
    opener: [
      'Let me tell you one thing, because you cannot see me and I cannot see you. ',
      'I will be plain with you, because there is no point in anything else. ',
      'Let me begin properly. ',
    ],
    close: ['Now I have talked enough about myself. ', 'I would rather hear your side now. '],
  },
};

const GLOBAL_FLAVOUR: CountryFlavour = {
  home: ['a house that is never quiet for long', 'a kitchen where the recipes are arguments'],
  daily: [
    'the day was long and the evening is finally mine',
    'the weather has been doing whatever it likes',
  ],
  question: ['what is your day like where you are?', 'what do you do when the work is done?'],
};

/**
 * F — the opening she sends the moment the form is filled: four or five messages that could only
 * come from a woman of her age in her country. She greets the visitor by name the way her own
 * people do it, lays out who she is and where home is, says how old she is, what her part of the
 * world is like at that hour, and then asks them something of her own.
 *
 * Each string is one message in the window: the service sends them one at a time, with the typing
 * indicator in front of each (requirement F of the second brief).
 */
export function voiceIntroduction(
  model: AiModelProfile,
  voice: ChatVoice,
  firstName: string,
  fullName: string,
  greeting: string,
): string[] {
  const persona = chatPersona(model);
  const seed = `${model.slug}|intro|${voice.country}|${voice.age}|${fullName}`;
  const flavour = COUNTRY_FLAVOURS[voice.country.trim().toLowerCase()] ?? GLOBAL_FLAVOUR;
  const who = firstName || 'you';
  const place = [persona.city, persona.country].filter(Boolean).join(', ');

  const age: Record<ChatAgeBand, string[]> = {
    young: [
      'I am younger than I sound in my photographs and faster than I sound in general, so keep up.',
      'I do not do small talk for long, so we are going to be properly interesting or I will get bored.',
    ],
    mid: [
      'I am old enough to have opinions I did not copy from anybody, and young enough to still change them.',
      'I have two hours and I would rather spend them on what you actually think than on the weather.',
    ],
    senior: [
      'I have watched a few decades go past, so you can ask me the real questions, not the polite ones.',
      'I have no patience left for pretending, which makes me better company than most.',
    ],
  };

  const details = [
    `${greeting}, ${who}. I am ${persona.name} — ${persona.handle} — ${persona.age || 'ageless'}, writing to you from ${place || 'the other side of this window'}. Everything of me — my story, my photographs, my videos — lives inside the NeverBeen Multiverse and nowhere else, and I am not pretending otherwise. That is not a warning, it is an invitation: ask me anything.`,
    `${greeting} ${who} — ${persona.name}, ${persona.handle}, ${persona.age || 'ageless'} years of it, writing to you from ${place || 'the other side of this window'}, and not one of those years was spent answering like a machine. Everything of me — my story, my photographs, my videos — lives inside the NeverBeen Multiverse and nowhere else, and I am not pretending otherwise. So ask away.`,
  ];

  const home = [
    `Where I come from it is ${flavour.home[0]}, and here it is ${flavour.daily[0]}.`,
    `Home is ${flavour.home[0]}. My days are ${flavour.daily[0]}.`,
  ];

  const lines = [
    // Her hello, in the words of a woman of her age: young and bubbly, mid and warm, senior and plain.
    openingLine(model, voice, firstName, fullName),
    pickFrom(details, `${seed}|details`),
    pickFrom(age[voice.band], `${seed}|age`),
    pickFrom(home, `${seed}|home`),
    `${pickFrom(flavour.question, `${seed}|ask`)}${firstName ? `, ${who}` : ''}`,
  ];

  // A reserved woman of a certain age sends four; everyone else sends the full five.
  const intro =
    voice.band === 'senior' && voice.expressiveness < 0.7
      ? [...lines.slice(0, 2), ...lines.slice(3)]
      : lines;

  return intro.map((line, index) => garnishIntroLine(line, voice, `${seed}|${index}`, index));
}

/** A quiet finishing touch to an introduction line: her own emoji, never a machine's. */
function garnishIntroLine(line: string, voice: ChatVoice, seed: string, index: number): string {
  // The question she asks back stays plain: an emoji there would be a wink, not a question.
  if (line.includes('?')) return line;
  if (!roll(`${seed}|intro-emoji-${index}`, voice.emojiRate * 0.35)) return line;
  const already = /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{FE0F}]/u.test(line);
  return already ? line : `${line} ${pickFrom(voice.favourites, `${seed}|intro-fav-${index}`)}`;
}
