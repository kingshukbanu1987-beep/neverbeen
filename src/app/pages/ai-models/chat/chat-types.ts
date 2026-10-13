/**
 * The shape of one AI model chat: the messages, the attachments, the reactions and the session
 * rules. Shared by the chat window (`ai-model-chat.ts`), the reply engine (`chat-replies.ts`), the
 * moderation layer (`chat-moderation.ts`) and the session service
 * (`src/app/services/ai-model-chat.service.ts`).
 */
import { ChatIdentity } from './chat-identity';

/** Who wrote a message: the model, the visitor, or NeverBeen itself (reminders and notices). */
export type AiChatAuthor = 'model' | 'user' | 'system';

/**
 * `message` — a normal chat bubble.
 * `reminder` — the session-time reminder, shown in the middle of the window.
 * `notice` — a studio notice (session started, session ended, community rules).
 */
export type AiChatMessageKind = 'message' | 'reminder' | 'notice';

/** The six reactions of the Instagram-style tray, in tray order. */
export type AiChatReaction = 'like' | 'love' | 'haha' | 'wow' | 'sad' | 'angry';

export interface AiChatReactionOption {
  id: AiChatReaction;
  emoji: string;
  /** Accessible label, e.g. "Love". */
  label: string;
}

export const AI_CHAT_REACTIONS: readonly AiChatReactionOption[] = [
  { id: 'like', emoji: '👍', label: 'Like' },
  { id: 'love', emoji: '❤️', label: 'Love' },
  { id: 'haha', emoji: '😂', label: 'Haha' },
  { id: 'wow', emoji: '😮', label: 'Wow' },
  { id: 'sad', emoji: '😢', label: 'Sad' },
  { id: 'angry', emoji: '😡', label: 'Angry' },
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
   * Data URL used to preview a picture inside its bubble. Empty for documents, and dropped when a
   * session is restored without room for it (see `compactSessions` in the chat service).
   */
  preview: string;
}

/** One source behind an answer taken from outside NeverBeen (a Google result). */
export interface AiChatSource {
  title: string;
  url: string;
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
  /** True while her answer is still being revealed word by word. */
  pending: boolean;
  /**
   * How much of `text` the window may reveal so far — the Messenger-style "typing" reveal. The full
   * answer is already in `text`, so the transcript, the exported session and the tests never see a
   * half-written sentence; only the bubble renders `revealedChars` characters while `pending`.
   */
  revealedChars: number;
  /** Google results behind the answer, shown beneath her bubble. */
  sources: AiChatSource[];
  /** Set on her messages: the intent the reply engine recognised. */
  intent: string;
}

/** Why a chat session can no longer be written to. */
export type AiChatClosedReason = '' | 'timeout' | 'blocked' | 'restarted';

/** One visit's chat with one model: at most two hours, and never more than one at a time. */
export interface AiChatSession {
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
   * When she is due to say something on her own if the visitor stays quiet (requirement H), and how
   * many times she already has — she waits a little longer every time.
   */
  nudgeAt: number;
  nudges: number;
  /** How many times she has asked for a shoot in this session (requirement G). */
  pitches: number;
  /** When the session ended, for the summary card (requirement K). */
  closedAt: number;
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

/** How long she stays quiet before she says something herself (requirement H). */
export const AI_CHAT_IDLE_MIN_MS = 11_000;
export const AI_CHAT_IDLE_MAX_MS = 19_000;

/** How many times she will reach out on her own in one session before she lets the window rest. */
export const AI_CHAT_NUDGE_LIMIT = 6;

/** How long she "types" before her answer starts arriving (requirement I): four to five seconds. */
export const AI_CHAT_TYPING_MS = 4_400;
export const AI_CHAT_TYPING_JITTER_MS = 600;

/** Boundaries of one attachment: 8 MB for a picture, 16 MB for a document. */
export const AI_CHAT_PHOTO_LIMIT_BYTES = 8 * 1024 * 1024;
export const AI_CHAT_DOCUMENT_LIMIT_BYTES = 16 * 1024 * 1024;
