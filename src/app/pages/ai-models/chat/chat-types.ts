/**
 * The shape of one AI model chat: the messages, the attachments, the reactions and the session
 * rules. Shared by the chat window (`ai-model-chat.ts`), the reply engine (`chat-replies.ts`), the
 * moderation layer (`chat-moderation.ts`) and the session service
 * (`src/app/services/ai-model-chat.service.ts`).
 */
import type { ChatPersonalMemory } from './chat-personal-memory';
import { ChatIdentity } from './chat-identity';
import type { RomanisedLanguageCode } from './chat-language';

/** Who wrote a message: the model, the visitor, or NeverBeen itself (reminders and notices). */
export type AiChatAuthor = 'model' | 'user' | 'system';

/**
 * `message` — a normal chat bubble.
 * `reminder` — the session-time reminder, shown in the middle of the window.
 * `notice` — a studio notice (session started, session ended, community rules).
 */
export type AiChatMessageKind = 'message' | 'reminder' | 'notice';

/**
 * The seven expressions of the Instagram-style tray, in tray order — given on the photographs and
 * the text messages that pass between the visitor and the model, by either of them.
 */
export type AiChatReaction = 'like' | 'dislike' | 'love' | 'smile' | 'angry' | 'cry' | 'happy';

export interface AiChatReactionOption {
  id: AiChatReaction;
  emoji: string;
  /** Accessible label, e.g. "Love". */
  label: string;
}

export const AI_CHAT_REACTIONS: readonly AiChatReactionOption[] = [
  { id: 'like', emoji: '👍', label: 'Like' },
  { id: 'dislike', emoji: '👎', label: 'Dislike' },
  { id: 'love', emoji: '❤️', label: 'Love' },
  { id: 'smile', emoji: '😊', label: 'Smile' },
  { id: 'angry', emoji: '😡', label: 'Angry' },
  { id: 'cry', emoji: '😭', label: 'Cry' },
  { id: 'happy', emoji: '😄', label: 'Happy' },
];

export function reactionOption(reaction: AiChatReaction): AiChatReactionOption {
  return AI_CHAT_REACTIONS.find((option) => option.id === reaction) ?? AI_CHAT_REACTIONS[0];
}

export function reactionEmoji(reaction: AiChatReaction | null): string {
  return reaction ? reactionOption(reaction).emoji : '';
}

/** How the visitor attached a picture or a document to a message. */
export type AiChatAttachmentKind = 'photo' | 'document';

/** Where a photo came from: the file picker or the camera. */
export type AiChatAttachmentSource = 'upload' | 'camera' | 'file';

export interface AiChatAttachment {
  kind: AiChatAttachmentKind;
  /** Original file name, shown on the bubble. */
  name: string;
  /** MIME type reported by the browser. */
  type: string;
  /** Size in bytes. */
  size: number;
  source: AiChatAttachmentSource;
  /**
   * Set on her messages: the frame she says she has just taken on her phone (requirement E), drawn
   * like a phone photograph rather than like a studio frame.
   */
  selfie?: boolean;
  /**
   * Set on the photographs `livechatselfiesandphotos` generates for a live chat: they are never
   * written to storage, they live only in the browser, and their bytes are dropped from the
   * transcript the moment the chat session ends (see `AiModelChatService.endSession`).
   */
  ephemeral?: boolean;
  /**
   * Data URL used to preview a picture inside its bubble. Empty for documents, and dropped when a
   * session is restored without room for it (see `compactSessions` in the chat service).
   */
  preview: string;
  /**
   * A document's own bytes, as a data URL, so the studio's reading desk can actually open it before
   * she answers (a PDF is read by the reading model, not thanked for). Empty for photographs, whose
   * bytes travel in `preview`, and dropped on restore when it is larger than a session may keep.
   */
  fileData?: string;
}

/** One source behind an answer taken from outside NeverBeen (a Google result). */
export interface AiChatSource {
  title: string;
  url: string;
}

/**
 * The message somebody chose to reply over — the quote that sits at the top of a reply bubble,
 * the way an answer in Instagram chat carries the message it answers. A snapshot, so the quote
 * survives even when the original message later scrolls out of the window's memory.
 */
export interface AiChatReplyQuote {
  /** The id of the quoted message, so a click on the quote can jump back to it. */
  id: string;
  author: AiChatAuthor;
  /** A short excerpt of the quoted text — `''` when the message was only a photograph. */
  text: string;
  /** When the quoted message was written. */
  at: number;
  /** True when the quoted message carried a photograph rather than words. */
  photo?: boolean;
}

/** The longest excerpt of a message that a reply quote carries. */
export const AI_CHAT_REPLY_QUOTE_CHARS = 160;

/** The snapshot of a message that a reply quote holds. */
export function replyQuoteOf(message: AiChatMessage): AiChatReplyQuote {
  const photo = message.attachment?.kind === 'photo';
  const text =
    !message.text.trim() || (photo && message.text.startsWith('Sent a '))
      ? ''
      : message.text.replace(/\s+/g, ' ').trim().slice(0, AI_CHAT_REPLY_QUOTE_CHARS);
  return { id: message.id, author: message.author, text, at: message.at, photo };
}

export interface AiChatMessage {
  id: string;
  author: AiChatAuthor;
  text: string;
  /** Epoch milliseconds the message was written. */
  at: number;
  kind: AiChatMessageKind;
  attachment: AiChatAttachment | null;
  /** Reaction left **on this message**, and who left it. */
  reaction: AiChatReaction | null;
  reactionBy: 'user' | 'model' | null;
  /**
   * True only between the moment a bubble is created and the moment it lands whole. Her answer is
   * never printed out letter by letter: it is written while the typing indicator is up and appears
   * in one piece (requirement A of the second brief).
   */
  pending: boolean;
  /**
   * Characters of `text` on screen. The full answer is already in `text`, so the transcript, the
   * exported session and the tests never see a half-written sentence; a message that has landed
   * carries `text.length`.
   */
  revealedChars: number;
  /** Google results behind the answer, shown beneath her bubble. */
  sources: AiChatSource[];
  /**
   * The message this one replies over (the Instagram reply): a snapshot of the quoted message,
   * shown at the top of this bubble. Absent — `null` — on an ordinary message.
   */
  replyTo?: AiChatReplyQuote | null;
  /** Set on her messages: the intent the reply engine recognised. */
  intent: string;
  /**
   * Set on her messages: who read the visitor's message before she answered it — `gemini`,
   * `openai`, `google-translate` or `studio` (the window's own reader). Part of the transcript
   * because it is how the studio sees whether the reading desk is doing its work.
   */
  analysedBy?: string;
}

/** Why a chat session can no longer be written to. */
export type AiChatClosedReason = '' | 'timeout' | 'blocked' | 'inactive' | 'restarted' | 'visitor';

/** What the visitor thought of the chat, given in the close form (requirement E). */
export interface AiChatFeedback {
  /** The stars they chose, 1…5; 0 when they closed the form without choosing any. */
  rating: number;
  /** What they wrote in the comments box, in their own words. */
  comments: string;
  /** When they sent it. */
  at: number;
}

/** One visit's chat with one model: at most two hours, and never more than one at a time. */
export interface AiChatSession {
  /** Personal answers remembered only for this conversation. */
  personalMemory?: ChatPersonalMemory;
  slug: string;
  /**
   * Who she is talking to (requirement A) — their name and the photograph beside their messages.
   * `null` until the form in front of the window is filled in, and the two hours do not start
   * before it is: `startedAt`/`endsAt` stay 0 while the visitor is still introducing themselves.
   */
  identity: ChatIdentity | null;
  startedAt: number;
  /** `startedAt` + `AI_CHAT_SESSION_MS` — the two-hour limit. */
  endsAt: number;
  messages: AiChatMessage[];
  /**
   * The three-strike escalation: a warning is served at 1 and 2, and she says goodbye at 3.
   * A sexual message counts double (see `chat-moderation.ts`).
   */
  strikes: number;
  closed: AiChatClosedReason;
  /** Reminder marks already announced, in minutes before the end (15, 10, 5, 1). */
  reminders: number[];
  /** True once she has introduced herself — the first message of the session. */
  introduced: boolean;
  /**
   * True once this session has been counted as a Live Chat on the model's card. A session is
   * counted once, when the two hours start, however often the window is closed and reopened.
   */
  liveChatCounted?: boolean;
  /**
   * The key this session's Live Chat start was recorded under, so the same session's end can be
   * recorded against the model's Live Now counter when the chat is over.
   */
  liveChatKey?: string;
  /**
   * True once this session's end has been recorded against the Live Now counter — however the
   * chat ended, and however often the window is opened on the finished transcript afterwards.
   */
  liveChatEnded?: boolean;
  /**
   * True while her "just a photo of mine, or a current selfie?" question is still open
   * (`photo:ask` in `chat-replies.ts`): the visitor's next message about a photograph answers it —
   * *selfie* sends two freshly generated ones, *photo* sends a frame from her album.
   */
  pendingPhotoAsk?: boolean;
  /**
   * When she is due to say something on her own if the visitor stays quiet (requirements B and H),
   * and how many times she already has — she waits a little longer every time.
   */
  followUpAt: number;
  followUps: number;
  /**
   * When the visitor last wrote to her, or the moment she opened the window on them (requirement D):
   * the silence she measures her own patience against. A visitor who has said nothing for
   * `AI_CHAT_INTEREST_MS` has answered her with their silence, and she closes the session.
   */
  lastVisitorAt: number;
  /** How many times she has asked for a shoot in this session (requirement G). */
  pitches: number;
  /** When the session ended, for the close form (requirements E, F and K). */
  closedAt: number;
  /** What the visitor thought of the chat, once they have said it in the close form (requirement E). */
  feedback: AiChatFeedback | null;
  /**
   * The Romanised language the visitor writes in (`chat-language.ts`), once it has been read from
   * their own words: `bn`, `hi`, `ur`, `fa`, `ar`, `tr`, `es` or `ms`, and `''` while the
   * conversation is in English. She keeps answering in it for the rest of the session — the way a
   * person does once the other side has switched.
   */
  language: RomanisedLanguageCode | '';
}

/** The two-hour maximum of one chat session. */
export const AI_CHAT_SESSION_MS = 2 * 60 * 60 * 1000;

/**
 * The remaining-time marks she announces, in minutes before the end. The 15-minute mark starts the
 * reminders, then every five minutes, then the last minute on its own.
 */
export const AI_CHAT_REMINDER_MARKS: readonly number[] = [15, 10, 5, 1];

/** How many messages one session keeps in memory and in the transcript. */
export const AI_CHAT_MESSAGE_LIMIT = 400;

/**
 * B — after this much time together she keeps the conversation going by herself: a chat that has
 * already lasted five minutes is a chat, and a woman in a chat says something of her own now and
 * then instead of waiting to be asked (requirements A and B).
 */
export const AI_CHAT_ENGAGED_MS = 5 * 60 * 1000;

/**
 * D — this much silence from the visitor and she reads it for what it is: they are not coming back
 * to this window. She says her goodbye and closes the session herself, and the close form of
 * requirement E comes up with it.
 */
export const AI_CHAT_INTEREST_MS = 3 * 60 * 1000;

/**
 * B and H — how long she stays quiet before she writes something the visitor did not ask for, and
 * the little extra she adds to the wait every time she has reached out in the same session.
 */
export const AI_CHAT_FOLLOWUP_MIN_MS = 45_000;
export const AI_CHAT_FOLLOWUP_MAX_MS = 75_000;
export const AI_CHAT_FOLLOWUP_STEP_MS = 20_000;

/** How many times she will reach out on her own in one session before she lets the window rest. */
export const AI_CHAT_FOLLOWUP_LIMIT = 6;

/**
 * How long a person needs to type a message (requirement A of the second brief): she is not a
 * machine that prints an answer out, so the wait before a bubble lands is the time a real person
 * would have spent typing that many characters on a phone — with a floor for a short line and a
 * ceiling so nobody waits forever.
 */
export const AI_CHAT_TYPING_PER_CHAR_MS = 34;
export const AI_CHAT_TYPING_MIN_MS = 2_400;
export const AI_CHAT_TYPING_MAX_MS = 7_200;

/** The random salt on every wait, so two chats never feel timed by the same machine. */
export const AI_CHAT_JITTER_MS = 500;

/**
 * A — how long she "types" a message of this many characters: a person's speed on a phone, kept
 * inside the floor and the ceiling so a one-word reply is never instant and a long one is never a
 * two-minute wait.
 */
export function typingTimeFor(
  textLength: number,
  perCharMs = AI_CHAT_TYPING_PER_CHAR_MS,
  floorMs = AI_CHAT_TYPING_MIN_MS,
  ceilingMs = AI_CHAT_TYPING_MAX_MS,
): number {
  const wanted = Math.round(Math.max(0, textLength) * Math.max(0, perCharMs));
  const low = Math.max(0, floorMs);
  const high = Math.max(low, ceilingMs);
  return Math.min(Math.max(wanted, low), high);
}

/**
 * Requirement D of the second brief: sometimes she is not at her phone when the message arrives and
 * only picks it up three to seven seconds later — before a single letter of "typing" shows.
 */
export const AI_CHAT_AWAY_MIN_MS = 3_000;
export const AI_CHAT_AWAY_MAX_MS = 7_000;
export const AI_CHAT_AWAY_CHANCE = 0.45;

/** And sometimes she stops mid-thought: the typing indicator goes, then comes back. */
export const AI_CHAT_MID_PAUSE_CHANCE = 0.3;
export const AI_CHAT_MID_PAUSE_MIN_MS = 2_000;
export const AI_CHAT_MID_PAUSE_MAX_MS = 5_000;

/** Requirement C: her answer may arrive as several messages, two to four seconds apart. */
export const AI_CHAT_GAP_MIN_MS = 2_000;
export const AI_CHAT_GAP_MAX_MS = 4_000;

/**
 * A selfie is taken, not picked: when her camera answers, she is quiet for a few seconds while the
 * photograph is made, the way a person is quiet while they aim a phone at themselves.
 */
export const AI_CHAT_SELFIE_MIN_MS = 4_000;
export const AI_CHAT_SELFIE_MAX_MS = 9_000;

/** How much of her answer goes into one bubble before the next one starts. */
export const AI_CHAT_BUBBLE_MAX_CHARS = 240;

/** Requirement F: her introduction takes three to five seconds before it starts. */
export const AI_CHAT_INTRO_MIN_MS = 3_000;
export const AI_CHAT_INTRO_MAX_MS = 5_000;

/**
 * E — the longest comment the close form takes. It is a thought about a chat, not an essay, and the
 * session mirror in `sessionStorage` has to hold it with everything else.
 */
export const AI_CHAT_FEEDBACK_COMMENT_LIMIT = 600;

/** Boundaries of one attachment: 8 MB for a picture, 16 MB for a document. */
export const AI_CHAT_PHOTO_LIMIT_BYTES = 8 * 1024 * 1024;
export const AI_CHAT_DOCUMENT_LIMIT_BYTES = 16 * 1024 * 1024;
