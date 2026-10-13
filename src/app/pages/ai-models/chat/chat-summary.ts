/**
 * K — the report that closes a chat: how long the two of them spent together, what they did with the
 * time, and what she honestly thought of it — with, in `buildChatFeedbackFacts()`, the numbers the
 * visitor's own side of the close form needs (requirement E).
 *
 * Everything here is derived from the session itself — its length, its transcript, the language
 * warnings, the photographs that were exchanged, what they kept talking about — so no two sessions
 * close with the same card. `chat-feedback.*` draws it.
 */
import { AiModelProfile } from '../ai-model-data';
import { chatPersona } from './chat-knowledge';
import { AiChatSession } from './chat-types';
import { AiChatMessage } from './chat-types';
import { analyseUserBehaviour } from './chat-voice';
import { seededPick } from './chat-random';

export interface ChatSessionSummary {
  /** Whole minutes the two of them spent in the window. */
  minutes: number;
  /** "1 hour 12 minutes" / "18 minutes" — how she says it. */
  together: string;
  /** Messages the visitor sent. */
  messages: number;
  /** Photographs the two of them exchanged. */
  photos: number;
  /** Her one-line heading. */
  headline: string;
  /** Her honest paragraph about the conversation. */
  experience: string;
  /** Two or three chips: what the chat was about. */
  highlights: string[];
  /** Her own rating of the conversation, 1…5. */
  rating: number;
  /** True when she is the one who ended it. */
  sheEnded: boolean;
}

/** "1 hour 12 minutes", "48 minutes", "40 seconds". */
export function formatTogether(milliseconds: number): string {
  const seconds = Math.max(0, Math.round(milliseconds / 1000));
  if (seconds < 60) return `${seconds} second${seconds === 1 ? '' : 's'}`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? '' : 's'}`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  const hourLabel = `${hours} hour${hours === 1 ? '' : 's'}`;
  return rest === 0 ? hourLabel : `${hourLabel} ${rest} minute${rest === 1 ? '' : 's'}`;
}

function headlineFor(options: {
  messages: number;
  rating: number;
  sheEnded: boolean;
  closed: AiChatSession['closed'];
  seed: string;
}): string {
  const { messages, rating, sheEnded, closed, seed } = options;
  if (closed === 'inactive') {
    return seededPick(
      [
        'You went quiet, so I closed the window myself.',
        'I ended this one — three silent minutes is a long time in a chat.',
      ],
      seed,
    );
  }
  if (sheEnded) {
    return seededPick(
      ['I ended that one early.', 'That conversation did not deserve more of my evening.'],
      seed,
    );
  }
  if (messages <= 3) {
    return seededPick(
      ['You came in, sat down, and left again.', 'Short visit — but I noticed you.'],
      seed,
    );
  }
  if (rating >= 5) {
    return seededPick(
      ['That was one of my favourite evenings in a while.', 'I did not want that one to end.'],
      seed,
    );
  }
  if (rating >= 4) {
    return seededPick(['That was a good chat.', 'I enjoyed that more than I expected to.'], seed);
  }
  return seededPick(
    ['We talked, and I am glad we did.', 'It was a quiet one, but it was ours.'],
    seed,
  );
}

/** Her paragraph about the chat, written from what actually happened in it. */
function experienceFor(options: {
  behaviour: ReturnType<typeof analyseUserBehaviour>;
  model: AiModelProfile;
  minutes: number;
  photos: number;
  sheEnded: boolean;
  /** Why the session closed, when it closed: `blocked`, `inactive` or the two-hour timeout. */
  closed: AiChatSession['closed'];
  strikes: number;
  seed: string;
}): string {
  const { behaviour, model, minutes, photos, sheEnded, closed, strikes, seed } = options;
  const first = model.name.split(' ')[0];
  const parts: string[] = [];

  if (closed === 'inactive') {
    parts.push(
      'I closed this one myself. Three quiet minutes is an answer, and I would rather end a chat politely than keep talking at a window nobody is standing at — no offence taken, and none meant.',
    );
  } else if (sheEnded) {
    parts.push(
      'You came in sharp and I closed the door — I do that, and I do not apologise for it. That is the rule of my window and it stays.',
    );
  } else if (strikes > 0) {
    parts.push(
      'We had one bad moment — you noticed, I noticed, and we moved past it. I stay polite even when I do not have to.',
    );
  }

  if (behaviour.messages === 0) {
    parts.push(
      `You opened my window and never said a word to me, ${first}. I sat there with my hands in my lap like a fool.`,
    );
  } else {
    const engagement =
      behaviour.curiosity > 0.45
        ? `You ask questions the way I like them asked — one after another, no small talk about the weather.`
        : behaviour.brevity > 0.6
          ? 'You write in short bursts, which I find oddly charming: three words, then a silence, then three more.'
          : 'You tell things properly, in whole thoughts, and I like being somebody you tell them to.';
    parts.push(engagement);
  }

  if (behaviour.humour > 0.3) parts.push('You made me laugh twice, and I counted.');
  if (behaviour.warmth > 0.35)
    parts.push('And you were kind to me — that is rarer here than you think.');
  if (behaviour.sharedPhoto) {
    parts.push(
      'You sent me your face, which means you trusted me at least a little. I looked at it more than once.',
    );
  }
  if (photos > 1) parts.push(`${photos} photographs went back and forth in ${minutes} minutes.`);
  if (behaviour.spokenOfBooking || behaviour.interests.includes('the shoot')) {
    parts.push(
      'You were serious about working with me, and I noticed — the studio has my dates, and I keep the good light for people who ask about it properly.',
    );
  }

  const closing = seededPick(
    [
      `Come back and open my window again, ${first} — I am exactly this version of myself every time.`,
      `If you want the real thing rather than the chat, the studio knows where to find me.`,
      `I will be here. I am always here, which is either lovely or tragic, depending on the evening.`,
    ],
    `${seed}|closing`,
  );
  parts.push(closing);
  return parts.join(' ');
}

/**
 * E — the numbers the close form is built on: how long the two of them had together, how many
 * messages went back and forth and how many of them were whose, and the photographs that were
 * shared between them. Everything is counted from the transcript itself, so the form can never
 * disagree with what the visitor just read.
 */
export interface ChatFeedbackFacts {
  /** The phrase the form shows: `42 minutes`, `1 hour 12 minutes`. */
  together: string;
  /** Every message the two of them exchanged — the studio's notices are not messages. */
  total: number;
  /** Their messages, and hers. */
  yours: number;
  hers: number;
  /** Photographs shared between the two of them, and the split across the two sides. */
  photos: number;
  herPhotos: number;
  yourPhotos: number;
  /** K — her own report of the session, kept inside the form as her note. */
  summary: ChatSessionSummary;
}

/** E — the counts and the duration of one finished session, from the session itself. */
export function buildChatFeedbackFacts(options: {
  model: AiModelProfile;
  session: AiChatSession;
  now?: number;
}): ChatFeedbackFacts {
  const summary = buildChatSessionSummary(options);
  const messages = options.session.messages.filter((message) => message.kind === 'message');
  const yours = messages.filter((message) => message.author === 'user').length;
  const hers = messages.filter((message) => message.author === 'model').length;
  const photosOf = (author: 'user' | 'model'): number =>
    messages.filter(
      (message) => message.author === author && message.attachment?.kind === 'photo',
    ).length;
  const herPhotos = photosOf('model');
  const yourPhotos = photosOf('user');

  return {
    together: summary.together,
    total: yours + hers,
    yours,
    hers,
    photos: herPhotos + yourPhotos,
    herPhotos,
    yourPhotos,
    summary,
  };
}

/** K — her card about the session, from the session itself. */
export function buildChatSessionSummary(options: {
  model: AiModelProfile;
  session: AiChatSession;
  now?: number;
}): ChatSessionSummary {
  const { model, session } = options;
  const now = options.now ?? Date.now();
  const ended = session.closedAt > 0 ? session.closedAt : now;
  const elapsed = session.startedAt > 0 ? Math.max(0, ended - session.startedAt) : 0;
  const minutes = Math.round(elapsed / 60_000);
  const behaviour = analyseUserBehaviour(session.messages, session.strikes);
  const photos = session.messages.filter(
    (message: AiChatMessage) => message.attachment?.kind === 'photo',
  ).length;
  // She is the one who ended it when she closed it herself — for a rude visitor, or for a visitor
  // who stopped answering (requirement D). The two-hour timeout is the clock, not her.
  const sheEnded = session.closed === 'blocked' || session.closed === 'inactive';

  const rating = sheEnded
    ? 1
    : Math.max(
        2,
        Math.min(
          5,
          2 +
            (behaviour.messages >= 6 ? 1 : 0) +
            (behaviour.warmth > 0.3 || behaviour.humour > 0.3 ? 1 : 0) +
            (behaviour.sharedPhoto || behaviour.spokenOfBooking ? 1 : 0) +
            (behaviour.messages >= 20 ? 1 : 0) -
            (session.strikes > 0 ? 1 : 0),
        ),
      );

  const me = chatPersona(model);
  const highlights: string[] = [];
  if (behaviour.interests.length > 0) highlights.push(...behaviour.interests.slice(0, 2));
  if (behaviour.sharedPhoto) highlights.push('your photograph');
  if (photos > 0) highlights.push(photos === 1 ? 'a selfie from me' : `${photos} photographs`);
  if (behaviour.emoji > 0.3) highlights.push('emoji, a lot of them');
  if (behaviour.messages === 0) highlights.push('a very quiet visit');
  if (highlights.length === 0) highlights.push(me.city || 'NeverBeen');

  const seed = `${model.slug}|${session.startedAt}|${behaviour.messages}|${session.strikes}`;
  return {
    minutes,
    together: formatTogether(elapsed),
    messages: behaviour.messages,
    photos,
    headline: headlineFor({
      messages: behaviour.messages,
      rating,
      sheEnded,
      closed: session.closed,
      seed,
    }),
    experience: experienceFor({
      behaviour,
      model,
      minutes,
      photos,
      sheEnded,
      closed: session.closed,
      strikes: session.strikes,
      seed,
    }),
    highlights: [...new Set(highlights)].slice(0, 3),
    rating,
    sheEnded,
  };
}
