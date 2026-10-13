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
 * "achha, The capital of France is Paris" needs the small letter back — but "achha, Alisha
 * Bhattacharya signing off" must keep its capital, because that first word is her name.
 */
function lowerFirstUnlessName(text: string): string {
  const [first = '', second = ''] = text.split(/\s+/);
  const isName = /^[A-Z][a-z]/.test(first) && /^[A-Z][a-z]/.test(second) && !/^I['’]/.test(second);
  return isName ? text : text.charAt(0).toLowerCase() + text.slice(1);
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
      'Ask me about anywhere in the world. I am surprisingly good at capitals.',
      'Give me a country and I will tell you something about it.',
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
    `Something I read and cannot stop thinking about: the Nile runs through eleven countries. Eleven. Ask me anything like that and I will probably know it.`,
    `Did you know Nepal is nearly an hour ahead of India, and the whole country runs on one time zone? It fascinates me, being partly made of facts like that.`,
    `The world outside is loud today. What is it like where you are — warm, grey, raining?`,
    `Ask me a capital city. Any of them. I never miss.`,
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
  if (!first) return 'Ask me something — anything at all. I am bored of my own thoughts.';
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
