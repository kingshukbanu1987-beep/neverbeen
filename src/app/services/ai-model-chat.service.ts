/**
 * One chat session per model: the memory of the conversation, the two-hour clock, the removal
 * notices, the reactions and the trip to the studio's AI service.
 *
 * - **The session (requirement E).** Every message of a session is kept here — the window, her
 *   answers and the transcript the next answer is built from — and mirrored into `sessionStorage`,
 *   so a refresh, a route change or a return visit continues the same conversation for as long as
 *   the two hours last.
 * - **The two-hour limit (requirement F).** `endsAt` is fixed when the session starts. The clock
 *   lives here rather than in the window, so closing and reopening the chat never restarts it, and
 *   the reminders are announced exactly once each, in the middle of the transcript.
 * - **The reading before the answer.** Nothing the visitor sends is answered before it has been
 *   read: `chat-analysis.ts` reads the words (the studio's own books, and `POST /api/ai-read` —
 *   Google Translate, Gemini, OpenAI — when the studio has those keys), the frame of an attached
 *   photograph and the bytes of an attached document. The reading is what her answer is built from.
 * - **The answer (requirements A, B, C, D, F).** The model's own engine (`chat-replies.ts`) answers
 *   instantly. When the NeverBeen Web API has its `GEMINI_API_KEY`, the backend answers instead:
 *   the visitor's message travels with the model's character profile (her
 *   `personality/characterdatabase.json`) to `POST /neverbeen-api/api/ai-chat`, the API calls
 *   Google Gemini (`gemini-2.5-flash`) with the key that only the server knows, and returns her
 *   finished answer. Every failure lands back on the local engine, so the chat always answers.
 * - **Her selfies (requirement E).** When the visitor asks for a selfie by name, the window calls
 *   the **`livechatselfiesandphotos`** service (`POST /api/livechatselfiesandphotos`) and it
 *   generates **two fresh photographs of her**: same
 *   outfit, same ambience, different poses and styles, light chosen from her own country, city
 *   and current hour, stamped with her timestamp and the phone watermark. They are never stored —
 *   browser memory only, flagged `ephemeral`, and scrubbed from the transcript the moment the
 *   session ends. A plain request for *a photo* makes her ask first: just a photo of her from the
 *   album, or a current selfie? Without an image key her album frame goes out instead.
 * - **A new welcome every time.** Her introduction is seeded by the moment the visitor's form was
 *   filled in, so the same model opens the same chat differently on every visit.
 * - **The person on the other side (requirement A).** The window's form hands over a name and a
 *   photograph before the two hours start; both live on the session, her answers use the first name,
 *   and their photograph stands beside every message they send.
 * - **Her own initiative (requirements A, B, D, G).** She greets the visitor the moment the form is
 *   filled and then waits: nothing of her own goes out again until they have written to her. After
 *   that she keeps the conversation going exactly when `chat-initiative.ts` gives her the floor —
 *   the session has run past five minutes, a subject is in play, or they asked her something — and
 *   three quiet minutes after their last message she reads the silence for what it is, says goodbye
 *   and closes the session herself. Once the conversation has warmed up she asks them for a shoot.
 * - **The close form (requirements E, F, K).** A session that ends — the two hours, her goodbye, or
 *   the visitor pressing ✕ — brings up `chat-feedback.*`: the two faces, the time together, the
 *   counts and the visitor's own stars and words. It stays until they close it.
 */
import {
  newPersonalMemory,
  restorePersonalMemory,
  rememberPersonalAnswer,
  nextPersonalTopic,
  personalQuestionFor,
  markPersonalQuestion,
  personalRecall,
  PersonalTopic,
} from '../pages/ai-models/chat/chat-personal-memory';
import { Injectable, computed, inject, signal } from '@angular/core';
import { AiModelProfile, aiModelProfiles } from '../pages/ai-models/ai-model-data';
import {
  composeChatReply,
  greetingFor,
  reactionAcknowledgement,
} from '../pages/ai-models/chat/chat-replies';
import {
  AI_CHAT_SELFIE_MAX_MS,
  AI_CHAT_SELFIE_MIN_MS,
  AI_CHAT_MESSAGE_LIMIT,
  AI_CHAT_FOLLOWUP_LIMIT,
  AI_CHAT_FOLLOWUP_MAX_MS,
  AI_CHAT_FOLLOWUP_MIN_MS,
  AI_CHAT_FOLLOWUP_STEP_MS,
  AI_CHAT_FEEDBACK_COMMENT_LIMIT,
  AI_CHAT_INTEREST_MS,
  AI_CHAT_REMINDER_MARKS,
  AI_CHAT_SESSION_MS,
  LIVE_CHAT_PLANS,
  LiveChatPlan,
  AI_CHAT_AWAY_CHANCE,
  AI_CHAT_AWAY_MAX_MS,
  AI_CHAT_AWAY_MIN_MS,
  AI_CHAT_BUBBLE_MAX_CHARS,
  AI_CHAT_GAP_MAX_MS,
  AI_CHAT_GAP_MIN_MS,
  AI_CHAT_INTRO_MAX_MS,
  AI_CHAT_INTRO_MIN_MS,
  AI_CHAT_JITTER_MS,
  AI_CHAT_MID_PAUSE_CHANCE,
  AI_CHAT_MID_PAUSE_MAX_MS,
  AI_CHAT_MID_PAUSE_MIN_MS,
  AI_CHAT_TYPING_MAX_MS,
  AI_CHAT_TYPING_MIN_MS,
  AI_CHAT_TYPING_PER_CHAR_MS,
  typingTimeFor,
  AiChatAttachment,
  AiChatClosedReason,
  AiChatFeedback,
  AiChatMessage,
  AiChatReaction,
  AiChatReplyQuote,
  AiChatSession,
  AiChatSource,
  replyQuoteOf,
} from '../pages/ai-models/chat/chat-types';
import { ChatInitiative, chatInitiative } from '../pages/ai-models/chat/chat-initiative';
import { ModelLiveChatService } from './model-live-chat.service';
import { ChatIdentity, firstNameOf, isValidChatName } from '../pages/ai-models/chat/chat-identity';
import { readChatPhotoFacts } from '../pages/ai-models/chat/chat-photo';
import {
  analyseVisitorTurn,
  localTurnReading,
  readingForAnswer,
  readingFromStudio,
  ChatTurnReading,
} from '../pages/ai-models/chat/chat-analysis';
import {
  generateChatSelfie,
  pickChatSelfie,
  pickSelfieMoment,
  readSelfieReference,
  selfieCaption,
  selfieReference,
} from '../pages/ai-models/chat/chat-selfie';
import {
  GeneratedLiveChatSelfies,
  generateLiveChatSelfies,
} from '../pages/ai-models/chat/chat-live-selfies';
import {
  analyseUserBehaviour,
  contractPitch,
  disinterestFarewell,
  idleChatOpener,
  modelVoice,
  splitChatMessages,
  voiceIntroduction,
} from '../pages/ai-models/chat/chat-voice';
import { seededBetween } from '../pages/ai-models/chat/chat-random';
import { buildModelDossier } from '../pages/ai-models/chat/chat-knowledge';
import { loadCharacterDatabase } from '../pages/ai-models/chat/character-database';
import {
  ChatVisitorLanguage,
  ROMANISED_LANGUAGE_BOOKS,
  RomanisedLanguageCode,
  readChatLanguage,
  romanisedIdleLine,
} from '../pages/ai-models/chat/chat-language';

/** Where a session is kept between visits: one browser tab, and gone when it closes. */
export const AI_CHAT_STORAGE_KEY = 'nb.ai-model-chat.v1';

/** The largest picture preview kept in the restored session. */
const PREVIEW_PERSIST_LIMIT = 180_000;

/** The reminder she writes in the middle of the transcript, in her own voice. */
export function chatReminderText(minutes: number, durationMinutes = 120): string {
  const duration = durationMinutes === 120 ? 'two hours' : `${Math.round(durationMinutes)}-minute chat`;
  if (minutes === 1) {
    return `⏳ One minute left. Our ${duration} is nearly gone — say the important thing now, and rent me for a shoot if you want the real thing.`;
  }
  return `⏳ ${minutes} minutes remaining of our ${duration}. If you want me for a shoot, tell me now and I will keep the light on for you.`;
}

/** The legacy notice that ends a two-hour session; current plans use `timeoutTextFor`. */
export const CHAT_TIMEOUT_TEXT =
  '⌛ Our two hours are up, so this chat closes here. Start a new chat whenever you like — I will be exactly this pleased to see you.';

export interface AiChatRemoteReply {
  text: string;
  sources: AiChatSource[];
}

/**
 * The AI Chat endpoint of the NeverBeen Web API, through the site's same-origin `/neverbeen-api`
 * proxy (the Cloudflare Worker in production, `proxy.conf.json` in development). The Gemini key
 * lives only in the API's `GEMINI_API_KEY` environment variable — never in the website.
 */
export const AI_CHAT_BACKEND_ENDPOINT = '/neverbeen-api/api/ai-chat';

/** The longest dossier the backend reads; anything after it is never used, so it is not sent. */
export const AI_CHAT_BACKEND_DOSSIER_LIMIT = 12_000;

/**
 * Answers that mean the backend cannot answer at all right now — no key configured (503), or the
 * endpoint is not deployed yet (404/405). The window stops asking for the rest of the visit. Any
 * other failure (a busy minute, a timeout, a refused answer) only skips the backend for that turn.
 */
const AI_CHAT_BACKEND_OFF_STATUSES = new Set([404, 405, 501, 503]);

interface PersistedChat {
  version: number;
  sessions: Record<string, AiChatSession>;
}

function newMessage(
  partial: Partial<AiChatMessage> & { author: AiChatMessage['author']; text: string },
): AiChatMessage {
  return {
    id: `${partial.author}-${Date.now()}-${Math.round(Math.random() * 1e6)}`,
    at: Date.now(),
    kind: 'message',
    attachment: null,
    reaction: null,
    reactionBy: null,
    replyTo: null,
    pending: false,
    revealedChars: partial.text.length,
    sources: [],
    intent: '',
    ...partial,
  };
}

@Injectable({ providedIn: 'root' })
export class AiModelChatService {
  /** The model whose chat window is open, or `null` when no window is open. */
  readonly openSlug = signal<string | null>(null);

  /** The session of the open chat — the transcript the window renders. */
  readonly session = signal<AiChatSession | null>(null);

  /** True while she is composing an answer. */
  readonly thinking = signal(false);

  /**
   * True while she is away from her phone — the three to seven seconds of requirement D, before a
   * single letter of "typing" appears. The window keeps its typing indicator off in this state: in a
   * real chat nobody is typing while the phone is in another room.
   */
  readonly away = signal(false);

  /** Milliseconds left of the two hours, kept up to date while a window is open. */
  readonly remainingMs = signal(AI_CHAT_SESSION_MS);

  /**
   * True once the backend AI Chat (`POST /neverbeen-api/api/ai-chat`) has said it cannot answer —
   * no `GEMINI_API_KEY` configured, or the endpoint is missing — so the local engine takes over.
   */
  readonly remoteUnavailable = signal(false);

  /**
   * True once the reading desk has said it cannot read a turn (no key, refused, offline) — the
   * window reads the turns itself from then on, exactly as it did before there was a desk.
   */
  readonly readDeskUnavailable = signal(false);

  /** True once her camera has said it cannot take a selfie — her album answers after that. */
  readonly selfieCameraUnavailable = signal(false);

  /** A picture or document waiting in the composer. */
  readonly draftAttachment = signal<AiChatAttachment | null>(null);

  /** A friendly line about the last attachment or send problem. */
  readonly notice = signal('');

  /**
   * True once the visitor has introduced themselves (requirement A) — before that the window shows
   * the form instead of the conversation, and the two hours have not started.
   */
  readonly identified = computed(() => Boolean(this.session()?.identity));

  /**
   * True while the close form is on screen: her own report of the session and the visitor's stars
   * and words (requirements E, F and K). It comes up when she ends the chat, and when the visitor
   * presses ✕ on a session that has started — and it stays there until they close it.
   */
  readonly feedbackOpen = signal(false);

  /** The visitor's first name, for the window's chips and its header. */
  readonly visitorName = computed(() => this.session()?.identity?.name ?? '');

  /**
   * How a person types, not how a machine answers (requirements A, C, D and F of the second brief):
   * she needs about the time a human thumb needs for that many characters, she sometimes was not at
   * her phone when the message arrived, she sometimes stops mid-thought, and a long answer arrives
   * as several messages with a pause between them. The window keeps these values; the tests set them
   * to zero.
   */
  readonly pacing = {
    /** How long one character takes to type, and the floor and ceiling around it. */
    perCharMs: AI_CHAT_TYPING_PER_CHAR_MS,
    floorMs: AI_CHAT_TYPING_MIN_MS,
    ceilingMs: AI_CHAT_TYPING_MAX_MS,
    /** The salt on every wait, so nothing feels clocked by the same machine. */
    jitterMs: AI_CHAT_JITTER_MS,
    /** How often she was away from her phone, and how long that pause looks like. */
    awayChance: AI_CHAT_AWAY_CHANCE,
    awayMinMs: AI_CHAT_AWAY_MIN_MS,
    awayMaxMs: AI_CHAT_AWAY_MAX_MS,
    /** How often she stops mid-thought, with the typing indicator going and coming back. */
    midPauseChance: AI_CHAT_MID_PAUSE_CHANCE,
    midPauseMinMs: AI_CHAT_MID_PAUSE_MIN_MS,
    midPauseMaxMs: AI_CHAT_MID_PAUSE_MAX_MS,
    /** The gap between two messages of the same answer. */
    gapMinMs: AI_CHAT_GAP_MIN_MS,
    gapMaxMs: AI_CHAT_GAP_MAX_MS,
    /** How long she is quiet while she takes a selfie — a photograph is not typed. */
    selfieMinMs: AI_CHAT_SELFIE_MIN_MS,
    selfieMaxMs: AI_CHAT_SELFIE_MAX_MS,
    /** When her introduction starts after the visitor filled in the form. */
    introMinMs: AI_CHAT_INTRO_MIN_MS,
    introMaxMs: AI_CHAT_INTRO_MAX_MS,
    /** How much of a long answer goes into one message. */
    bubbleMaxChars: AI_CHAT_BUBBLE_MAX_CHARS,
  };

  /** `01:59:31`-style countdown for the top-right corner of the chat window. */
  readonly timeLeftLabel = computed(() => formatRemaining(this.remainingMs()));

  /** True while the open session can still be written to. */
  readonly canSend = computed(() => {
    const session = this.session();
    return Boolean(session && !session.closed);
  });

  /** The model cards' Live Chat counter: each new two-hour session is recorded here once. */
  private readonly liveChats = inject(ModelLiveChatService);
  private readonly sessions = new Map<string, AiChatSession>();
  private readonly dossiers = new Map<string, string>();
  private timer: ReturnType<typeof setInterval> | null = null;
  private revealTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    this.restore();
  }

  // ------------------------------------------------------------------ window

  /**
   * Opens one model's chat window. A plan is fixed before the identity form appears: this is what
   * makes a Free Chat two minutes and a Community member chat forty-five minutes, even after the
   * window is closed and reopened. The default keeps pre-plan saved sessions and direct embeds
   * compatible with the original two-hour experience.
   */
  openChat(model: AiModelProfile, plan: LiveChatPlan | 'legacy' = 'legacy'): void {
    const previous = this.sessions.get(model.slug);
    if (
      previous &&
      this.openSlug() === model.slug &&
      !previous.closed &&
      this.sessionPlan(previous) === plan
    )
      return;

    // A completed, expired, or differently entitled conversation must never reuse an identity or
    // its clock. The previous live count is retired before a new plan can begin.
    if (
      previous &&
      (previous.closed ||
        (previous.endsAt > 0 && previous.endsAt <= Date.now()) ||
        this.sessionPlan(previous) !== plan)
    ) {
      this.recordLiveChatEnd(previous);
      this.sessions.set(model.slug, this.createSession(model.slug, plan));
    }
    this.feedbackOpen.set(false);
    const session = this.sessionFor(model, plan);
    this.openSlug.set(model.slug);
    this.view(session);
    this.draftAttachment.set(null);
    this.notice.set('');
    // Opening an older session catches its clock up: the countdown, the reminders it has not
    // announced yet, and a timeout that elapsed while the window was shut.
    this.tick();
    this.startClock();
    this.persist();
  }

  /** Closes the window. The session, its clock and its transcript stay alive. */
  closeChat(): void {
    this.openSlug.set(null);
    this.session.set(null);
    this.draftAttachment.set(null);
    this.feedbackOpen.set(false);
    this.stopClock();
  }

  /**
   * A — the visitor's name and photograph, from the form in front of the window. This is the moment
   * the two hours start, and the moment she says something first: a woman opening a chat does not
   * wait to be spoken to.
   */
  setIdentity(model: AiModelProfile, identity: ChatIdentity): void {
    const session = this.sessionFor(model);
    if (session.identity || session.closed || !isValidChatName(identity.name) || !identity.avatar)
      return;

    const now = Date.now();
    session.identity = { name: identity.name, avatar: identity.avatar };
    session.startedAt = now;
    session.endsAt = now + this.sessionDuration(session);
    // A and D — the three minutes she gives the visitor to answer her hello start now.
    session.lastVisitorAt = now;
    session.followUpAt = now + this.followUpDelay(1);
    // Her introduction (requirement F of the second brief) is her opening, so the first question the
    // visitor asks is answered as a question and not with a second introduction.
    session.introduced = true;
    // The Live Now counter on the model's card: one count per session, recorded as it starts,
    // under the session's own key so the very same session can be taken off when it ends.
    if (!session.liveChatCounted) {
      session.liveChatCounted = true;
      session.liveChatKey = newLiveChatSessionKey();
      void this.liveChats.recordStart(model.slug, session.liveChatKey);
    }
    this.remainingMs.set(this.sessionDuration(session));
    this.feedbackOpen.set(false);
    this.touch(session);
    this.startClock();

    const voice = modelVoice(model);
    const firstName = firstNameOf(identity.name);
    // F — the introduction is written for her own age and country, and it is several messages.
    const parts = voiceIntroduction(
      model,
      voice,
      firstName,
      identity.name,
      greetingFor(new Date(now)),
      // The welcome is never the same twice: the moment this chat started, and a breath of chance,
      // decide how she says hello, which of her lines she uses and which of her album's numbers she
      // mentions. A model who opened the window in the morning does not open it the same way at
      // night, and never the same way twice in a row.
      this.welcomeSeed(now),
    );
    void this.introduceFirst(session, parts);
  }

  /** The salt on one session's welcome, so no two chats are opened with the same words. */
  private welcomeSeed(now: number): string {
    return `${now}|${Math.round(Math.random() * 1e9)}`;
  }

  /**
   * F — her introduction: three to five seconds of quiet (the window sits on the conversation), then
   * one message at a time, two to four seconds apart, with "typing" in front of each.
   */
  private async introduceFirst(session: AiChatSession, parts: readonly string[]): Promise<void> {
    if (this.silent) {
      // A test, or a studio that has switched every wait off: the delivery is written in one go and
      // nothing is left hanging in a promise.
      void this.deliver(session, parts, { intent: 'opening', away: false });
      return;
    }
    this.thinking.set(true);
    try {
      const first = this.between(this.pacing.introMinMs, this.pacing.introMaxMs);
      if (first > 0) await delay(first);
      await this.deliver(session, parts, { intent: 'opening', away: false });
    } finally {
      this.thinking.set(false);
      this.syncClock();
    }
  }

  /**
   * Starts a fresh session with the same entitlement already selected for this model. The visitor's
   * name and photograph are asked for again — a new session is a new introduction.
   */
  startNewSession(model: AiModelProfile): void {
    // The session being replaced comes off the model's Live Now counter if it never did.
    const previous = this.sessions.get(model.slug);
    if (previous) this.recordLiveChatEnd(previous);
    const session = this.createSession(model.slug, previous ? this.sessionPlan(previous) : 'legacy');
    this.sessions.set(model.slug, session);
    this.openSlug.set(model.slug);
    this.view(session);
    this.draftAttachment.set(null);
    this.notice.set('');
    this.feedbackOpen.set(false);
    this.remainingMs.set(this.sessionDuration(session));
    this.startClock();
    this.persist();
  }

  /**
   * E — the visitor pressed ✕ on a window they have been chatting in: the close form comes up in
   * front of it instead of the window simply disappearing, and the window itself is closed by the
   * window's Close button (or by the code that called this, see `AiModelChatDialog`).
   */
  openFeedback(): void {
    this.feedbackOpen.set(true);
  }

  /** Explicitly ending a chat differs from temporarily hiding its window. */
  endVisitorSession(): void {
    const slug = this.openSlug();
    const session = slug ? this.sessions.get(slug) : null;
    if (session?.identity) this.endSession(session, 'visitor');
  }

  /** E and K — puts the close form away, leaving the session behind it exactly as it was. */
  dismissFeedback(): void {
    this.feedbackOpen.set(false);
  }

  /**
   * E — what the visitor thought of the chat, kept on the session and mirrored into this tab's
   * storage with the rest of it, so the studio keeps their stars and their words with the
   * transcript they belong to.
   */
  recordFeedback(model: AiModelProfile, feedback: { rating: number; comments: string }): void {
    const session = this.sessionFor(model);
    const rating = Math.max(0, Math.min(5, Math.round(feedback.rating)));
    const comments = feedback.comments.trim().slice(0, AI_CHAT_FEEDBACK_COMMENT_LIMIT);
    if (rating <= 0 && comments.length === 0) return;
    session.feedback = { rating, comments, at: Date.now() } satisfies AiChatFeedback;
    this.touch(session);
  }

  /** The feedback of a model's session, whether or not her window is open. */
  feedbackFor(slug: string): AiChatFeedback | null {
    return this.sessions.get(slug)?.feedback ?? null;
  }

  /** The transcript of a model's session, whether or not her window is open. */
  sessionOf(slug: string): AiChatSession | null {
    return this.sessions.get(slug) ?? null;
  }

  // ------------------------------------------------------------------ the composer

  /** Puts a picked attachment into the composer, enforcing the Free Chat text-only boundary. */
  setDraftAttachment(attachment: AiChatAttachment | null): void {
    const session = this.session();
    if (attachment && session && this.sessionPlan(session) === 'free') {
      this.draftAttachment.set(null);
      this.notice.set('Free Chat is text-only. Choose Registered User to share photos or videos.');
      return;
    }
    this.draftAttachment.set(attachment);
    if (attachment) this.notice.set('');
  }

  /** Sends whatever is in the composer: the text, the attached picture or document, or both.
   *  `replyTo` is the message the visitor chose to reply over — the Instagram reply quote that
   *  rides at the top of their bubble. */
  async sendMessage(
    model: AiModelProfile,
    rawText: string,
    replyTo: AiChatReplyQuote | null = null,
  ): Promise<void> {
    const session = this.sessionFor(model);
    if (this.openSlug() !== model.slug || session.closed) return;
    if (session.endsAt > 0 && session.endsAt <= Date.now()) {
      this.endSession(session, 'timeout', this.timeoutTextFor(session));
      return;
    }
    if (!session.identity) {
      this.notice.set('Your name and one photograph first — then I am all yours.');
      return;
    }

    let attachment = this.draftAttachment();
    if (attachment && this.sessionPlan(session) === 'free') {
      // This is deliberately checked again at send time: the UI hides controls for Free Chat, but
      // a stale draft or a crafted event must not bypass the plan boundary.
      attachment = null;
      this.draftAttachment.set(null);
      this.notice.set('Free Chat is text-only. Photos and videos are available to registered members.');
    }
    const text = rawText.trim();
    if (!text && !attachment) return;

    // F — a photograph is read before it is answered: the frame, the light and what is in it.
    const photo =
      attachment?.kind === 'photo' && attachment.preview
        ? await readChatPhotoFacts(attachment.preview)
        : null;

    const userMessage = newMessage({
      author: 'user',
      text:
        text ||
        `Sent a ${
          attachment?.kind === 'document'
            ? 'document'
            : attachment?.kind === 'video'
              ? 'video'
              : 'photograph'
        }`,
      attachment,
      replyTo,
    });
    this.appendMessage(session, userMessage);
    this.draftAttachment.set(null);
    this.notice.set('');
    this.thinking.set(true);
    // D — the three quiet minutes are measured from the visitor's own last word, and B — hearing
    // from them gives her the floor again, a while from now.
    session.lastVisitorAt = Date.now();
    session.followUps = 0;
    session.followUpAt = Date.now() + this.followUpDelay(1);
    // The visitor's own message is on screen at once — the wait before her answer belongs to her
    // (requirement D), not to their own message.
    this.syncClock();

    try {
      await this.answer(model, session, userMessage, photo);
    } finally {
      this.thinking.set(false);
      this.syncClock();
    }
  }

  // ------------------------------------------------------------------ reactions

  /**
   * The visitor reacts to a message or a photograph with one of the seven expressions — hers or
   * theirs (requirement H). She answers a reaction on **her** message in words, replying over the
   * very message it was about, and gives the same feeling back on the visitor's own last message,
   * the way a person would. A reaction on the visitor's own message is simply seen: her expression
   * lands on her most recent message, with nothing to say about it.
   */
  reactToMessage(model: AiModelProfile, messageId: string, reaction: AiChatReaction): void {
    const session = this.sessionFor(model);
    const target = session.messages.find((message) => message.id === messageId);
    if (!target) return;

    const replaced = target.reaction === reaction;
    target.reaction = replaced ? null : reaction;
    target.reactionBy = replaced ? null : 'user';
    this.touch(session);

    if (replaced) return;

    const acknowledgement = reactionAcknowledgement(
      model,
      reaction,
      `${messageId}-${reaction}-${session.messages.length}`,
    );

    if (target.author === 'model') {
      const lastUserMessage = [...session.messages]
        .reverse()
        .find((message) => message.author === 'user');
      if (lastUserMessage && acknowledgement.reactionBack) {
        lastUserMessage.reaction = acknowledgement.reactionBack;
        lastUserMessage.reactionBy = 'model';
      }

      this.touch(session);
      // Her words over the message the visitor reacted to — she replies *to* it, Instagram style.
      void this.deliver(session, [acknowledgement.text], {
        intent: `reaction:${reaction}`,
        away: false,
        replyTo: replyQuoteOf(target),
      });
      return;
    }

    // Their own message or photograph: she does not write about it, she only answers with an
    // expression of her own on her last message.
    const lastModelMessage = [...session.messages]
      .reverse()
      .find((message) => message.author === 'model' && message.kind === 'message');
    if (lastModelMessage) {
      lastModelMessage.reaction = reaction;
      lastModelMessage.reactionBy = 'model';
      this.touch(session);
    }
  }

  // ------------------------------------------------------------------ clock

  /** Recomputes the countdown, announces any reminder that has become due, and ends the session. */
  private tick(): void {
    const slug = this.openSlug();
    if (!slug) return;
    const session = this.sessions.get(slug);
    if (!session) return;

    // The clock has not started: the visitor is still filling in the form in front of the
    // window, and there is nothing for her to do but wait for their plan's allotted time.
    if (session.endsAt === 0) {
      this.remainingMs.set(this.sessionDuration(session));
      return;
    }

    // An ended session's clock is frozen at the moment it ended: it never counts on.
    if (session.closed) {
      this.remainingMs.set(this.remainingOf(session));
      this.stopClock();
      return;
    }

    const remaining = session.endsAt - Date.now();
    this.remainingMs.set(Math.max(0, remaining));
    if (remaining <= 0) {
      this.endSession(session, 'timeout', this.timeoutTextFor(session));
      return;
    }

    const minutesLeft = remaining / 60_000;
    const due = this.reminderMarksFor(session)
      .filter((mark) => minutesLeft <= mark && !session.reminders.includes(mark))
      .sort((a, b) => b - a);

    for (const mark of due) {
      session.reminders.push(mark);
      this.appendMessage(
        session,
        newMessage({
          author: 'system',
          text: chatReminderText(mark, this.sessionDuration(session) / 60_000),
          kind: 'reminder',
        }),
      );
    }
    if (due.length > 0) this.syncClock();

    // The close form is over the window: nothing of hers is written behind it.
    if (this.feedbackOpen()) return;

    const initiative = chatInitiative({
      messages: session.messages,
      startedAt: session.startedAt,
      lastVisitorAt: session.lastVisitorAt,
      now: Date.now(),
    });

    // D — the silence has lasted long enough to be an answer: she closes it herself.
    if (this.mayEndForSilence(session, initiative)) {
      this.endForDisinterest(session);
      return;
    }

    // B — a conversation worth continuing: she says the next thing herself.
    this.speakUp(session, initiative);
  }

  /**
   * D — true when nothing is in flight and the visitor's silence has become long enough to read:
   * she only ends a session she is not in the middle of answering, and never one that has ended
   * already.
   */
  private mayEndForSilence(session: AiChatSession, initiative: ChatInitiative): boolean {
    if (!initiative.disinterested || !session.identity || session.closed) return false;
    if (this.thinking()) return false;
    return !session.messages.some((message) => message.pending);
  }

  /**
   * D — she has waited three minutes for an answer that is not coming. She says so in her own words
   * and closes the session with it: the window stops taking messages, and the close form of
   * requirement E comes up over it.
   */
  private endForDisinterest(session: AiChatSession): void {
    const model = this.openModel();
    const text = disinterestFarewell({
      model,
      voice: modelVoice(model),
      name: session.identity ? firstNameOf(session.identity.name) : '',
      seed: `${session.slug}|${session.startedAt}|farewell`,
    });
    this.appendMessage(session, newMessage({ author: 'model', text, intent: 'goodbye' }));
    this.endSession(session, 'inactive');
  }

  /**
   * A, B and H — she says something the visitor did not ask for, which happens only when
   * `chat-initiative.ts` says she has the floor: they have written to her at least once (A), and
   * the session has run past five minutes, a subject is in play, or they asked her something (B).
   * She waits a little longer every time and stops after a few, so a silent window never turns into
   * a woman talking to herself.
   */
  private speakUp(session: AiChatSession, initiative: ChatInitiative): void {
    if (!initiative.reason) return;
    if (!session.identity) return;
    if (session.followUps >= AI_CHAT_FOLLOWUP_LIMIT) return;
    if (this.thinking() || session.messages.some((message) => message.pending)) return;
    if (Date.now() < session.followUpAt) return;

    const last = [...session.messages].reverse().find((message) => message.kind === 'message');
    if (!last || last.author !== 'model') return;

    session.followUps += 1;
    session.followUpAt = Date.now() + this.followUpDelay(session.followUps + 1);

    const model = this.openModel();
    const text = idleChatOpener({
      model,
      voice: modelVoice(model),
      behaviour: analyseUserBehaviour(session.messages, session.strikes),
      name: firstNameOf(session.identity.name),
      step: session.followUps,
      reason: initiative.reason,
      topic: initiative.topic,
      seed: `${session.slug}|nudge|${session.followUps}|${session.messages.length}`,
    });

    // She speaks up on her own: the pause that makes it feel like a message from her rather than an
    // answer is the away pause of requirement D, and here it is always on.
    const localised =
      session.language && ROMANISED_LANGUAGE_BOOKS[session.language]
        ? romanisedIdleLine(session.language, `${session.slug}|idle|${session.followUps}`)
        : null;
    void this.deliver(session, [localised ?? text], { intent: 'idle' });
  }

  /** The model of the open window — the one every session change is applied to. */
  private openModel(): AiModelProfile {
    const slug = this.openSlug();
    const model = aiModelProfiles.find((candidate) => candidate.slug === slug);
    if (!model) throw new Error('No model is open in the chat window.');
    return model;
  }

  /**
   * B — how long she waits before saying something of her own: forty-five to seventy-five seconds,
   * and a little longer every time she has already spoken in this session, so a long silence is
   * never filled twice at the same rhythm.
   */
  private followUpDelay(step: number): number {
    const window = Math.min(AI_CHAT_INTEREST_MS, Math.max(0, step - 1) * AI_CHAT_FOLLOWUP_STEP_MS);
    return seededBetween(
      `${this.openSlug()}|follow-up|${step}|${Math.round(Math.random() * 1e6)}`,
      AI_CHAT_FOLLOWUP_MIN_MS + window,
      AI_CHAT_FOLLOWUP_MAX_MS + window,
    );
  }

  /** Ends a session — the two hours are up, or she has said goodbye for good. */
  private endSession(session: AiChatSession, reason: AiChatClosedReason, message?: string): void {
    if (session.closed) return;
    session.closed = reason;
    session.closedAt = Date.now();
    // Every ending — her goodbye, the visitor's ✕, the two hours — comes off the model's Live Now
    // counter the moment it happens, so every open directory sees the number come down.
    this.recordLiveChatEnd(session);
    // The photographs `livechatselfiesandphotos` generated were never stored anywhere: they lived
    // only in this browser, and the moment the session ends — by her, by the visitor, or by the
    // two hours — their bytes are dropped from the transcript for good.
    for (const sessionMessage of session.messages) {
      if (sessionMessage.attachment?.ephemeral) {
        sessionMessage.attachment = { ...sessionMessage.attachment, preview: '', fileData: '' };
      }
    }
    if (message) {
      this.appendMessage(
        session,
        newMessage({ author: 'system', text: message, kind: 'reminder' }),
      );
    }
    this.thinking.set(false);
    // The timer stops with the session: nothing ticks after this, and the figure stays frozen.
    this.stopClock();
    // E, F and K — a session that ends is a session the visitor is asked about: the close form
    // comes up over the window with the two faces, the time they spent and the counts, her own note
    // about the chat, and the visitor's stars and words. It stays there until they close it.
    this.feedbackOpen.set(true);
    this.syncClock();
  }

  /**
   * Takes a finished session off its model's Live Now counter, exactly once. A session recorded
   * before the start/end split carries no key; the server's own two-hour expiry retires it.
   */
  private recordLiveChatEnd(session: AiChatSession): void {
    if (!session.liveChatCounted || session.liveChatEnded) return;
    session.liveChatEnded = true;
    if (session.liveChatKey) void this.liveChats.recordEnd(session.slug, session.liveChatKey);
  }

  /**
   * The window's copy of a session. The sessions map holds the canonical object; the signal holds a
   * shallow copy, so a signal consumer re-renders while the map stays the single source of truth for
   * the strikes, the clock and the transcript.
   */
  private view(session: AiChatSession | null): void {
    this.session.set(session ? { ...session } : null);
  }

  /** Rebuilds the countdown after a change that did not come from the clock. */
  private syncClock(): void {
    const slug = this.openSlug();
    if (!slug) return;
    const session = this.sessions.get(slug) ?? null;
    this.view(session);
    if (session) this.remainingMs.set(this.remainingOf(session));
    this.persist();
  }

  /**
   * What the countdown shows for a session: the time left right now while it runs, and the time
   * that was left at the moment it ended once it has — frozen, whatever the real clock does.
   */
  private remainingOf(session: AiChatSession): number {
    const reference = session.closed ? session.closedAt || Date.now() : Date.now();
    return Math.max(0, session.endsAt - reference);
  }

  private startClock(): void {
    this.stopClock();
    this.timer = setInterval(() => this.tick(), 1000);
  }

  private stopClock(): void {
    if (this.timer !== null) clearInterval(this.timer);
    this.timer = null;
  }

  // ------------------------------------------------------------------ answering

  /** Her answer: OpenAI with live Google results when configured, her own engine otherwise. */
  private async answer(
    model: AiModelProfile,
    session: AiChatSession,
    userMessage: AiChatMessage,
    photo: Awaited<ReturnType<typeof readChatPhotoFacts>> = null,
  ): Promise<void> {
    const identity = session.identity;
    const user = identity ? { name: identity.name, firstName: firstNameOf(identity.name) } : null;

    // B — nothing is answered before it has been read. The studio's own books read the message
    // instantly, the reading desk reads it properly (Google Translate, then Gemini or OpenAI, when
    // the studio has those keys) together with the frame of an attached photograph and the bytes of
    // an attached document, and the whole answer is built from that reading.
    const books = await readChatLanguage(userMessage.text, model, session.language, {
      allowNetwork: false,
    });
    const reading = await this.readVisitorTurn(model, session, userMessage, user, photo, books);
    const language = await this.readVisitorLanguage(
      model,
      session,
      userMessage.text,
      reading,
      books,
    );

    const local = composeChatReply({
      model,
      message: userMessage,
      history: session.messages,
      session: {
        strikes: session.strikes,
        introduced: session.introduced,
        identity: user,
        pendingPhotoAsk: session.pendingPhotoAsk,
      },
      user,
      photo,
      reading,
      canSendSelfie: model.photos.length > 0 || Boolean(model.cover),
      language,
      now: new Date(),
    });
    session.strikes = local.strikes;
    const wasIntroduced = session.introduced;
    session.introduced = local.introduced;
    // Her "photo or a current selfie?" question opens when she asks it, and closes the moment the
    // visitor answers with either of them.
    if (local.photoAsk) session.pendingPhotoAsk = true;
    else if (local.intent === 'selfie') session.pendingPhotoAsk = false;

    // Safety and identity come first and are never delegated: a warning must not be reworded, and
    // the first answer of the session is always her scripted introduction (requirement D).
    const mustBeLocal =
      local.intent.startsWith('moderation:') ||
      // Her answer in the visitor's own Romanised language is written by her own books: an English
      // answer from the studio's OpenAI model would break the language she has settled into.
      local.intent.startsWith('language:') ||
      // A photograph is a decision the window carries out — her open photo question, and the trip
      // to `livechatselfiesandphotos` behind the word "selfie" — so neither may be reworded away.
      Boolean(local.photoAsk) ||
      Boolean(local.selfie) ||
      !wasIntroduced ||
      userMessage.attachment !== null;

    const memory = (session.personalMemory ??= newPersonalMemory());
    const safeTurn = !local.intent.startsWith('moderation:');
    if (safeTurn)
      rememberPersonalAnswer(memory, userMessage.text, userMessage.attachment?.kind === 'photo');
    const visitorTurns = session.messages.filter((message) => message.author === 'user').length;
    const topic =
      safeTurn && !local.closes && !local.selfie
        ? nextPersonalTopic(memory, session.startedAt, Date.now(), visitorTurns)
        : '';
    const personalQuestion = topic ? personalQuestionFor(model, topic, userMessage.id) : '';

    this.touch(session);

    // B — the backend answers with Gemini when its `GEMINI_API_KEY` is configured. The words arrive
    // as one finished answer and are typed out like her own; nothing is ever shown word by word
    // (requirement A of the second brief).
    let answerText =
      (safeTurn && !local.selfie && !language?.romanised
        ? personalRecall(memory, userMessage.text)
        : '') || local.text;
    let answerSources: readonly AiChatSource[] = [];
    let intent = local.intent;
    if (!mustBeLocal) {
      const remote = await this.requestBackendReply(model, session, userMessage, reading, topic);
      if (remote) {
        answerText = remote.text;
        answerSources = remote.sources;
        intent = 'gemini';
      }
    }

    // The fallback asks the same single question as the AI, never a questionnaire.
    if (personalQuestion && intent !== 'gemini') answerText += `\n\n${personalQuestion}`;

    // E — a selfie goes out as photographs, not as a promise of one: `livechatselfiesandphotos`
    // generates two of them (same outfit, same ambience, different poses), and they are sent as
    // two ephemeral bubbles that live only in this browser.
    let selfie: AiChatAttachment | null = null;
    let liveExtras: AiChatAttachment[] = [];
    if (answerText === local.text && local.selfie) {
      const alreadySent = session.messages
        .map((message) => message.attachment)
        .filter((attachment) => attachment?.selfie === true)
        .map((attachment) => attachment?.preview ?? '');
      const seed = `${userMessage.id}|${session.messages.length}`;
      // The word "selfie" means she takes them now, through the live service; a resolved "photo"
      // means her album, and the album frame is the answer.
      const moment = local.selfieMoment ?? pickSelfieMoment(seed);
      const shot = pickChatSelfie(model, seed, alreadySent);

      if (local.liveSelfie) {
        const live = await this.takeLiveSelfies(model, moment, seed);
        if (live) {
          // The caption says where the service actually photographed her — her own streets, her
          // own hour — rather than the moment that was guessed before the photographs existed.
          answerText = selfieCaption(
            model,
            {
              photo: live.images[0],
              place: live.place || moment.place,
              flaw: live.flaw || moment.flaw,
            },
            seed,
            user?.firstName ?? '',
          );
          const generated = live.images.map((image, index): AiChatAttachment => ({
            kind: 'photo',
            name: `${model.slug}-live-selfie-${index + 1}.png`,
            type: 'image/png',
            size: 0,
            source: 'camera',
            preview: image,
            selfie: true,
            // Never stored: browser memory only, scrubbed when this session ends.
            ephemeral: true,
          }));
          selfie = generated[0] ?? null;
          liveExtras = generated.slice(1);
        }
      }

      if (!selfie) {
        // Her old camera (one photograph), and then her own album — a visitor who asks for a
        // photograph always gets one, even where no image key is configured.
        const taken = local.selfieMoment ? await this.takeSelfie(model, moment) : null;
        const preview = taken ?? shot?.photo ?? '';
        if (preview) {
          selfie = {
            kind: 'photo',
            name: `${model.slug}-selfie.${taken ? 'png' : 'jpg'}`,
            type: taken ? 'image/png' : 'image/jpeg',
            size: 0,
            source: 'camera',
            preview,
            selfie: true,
          };
        }
      }
    }

    if (userMessage && local.reaction) {
      userMessage.reaction = local.reaction;
      userMessage.reactionBy = 'model';
    }

    // Her reply over the message the visitor replied to: the quote rides at the top of her bubble
    // the way it does in an Instagram chat.
    const outgoingQuote = userMessage.replyTo ? replyQuoteOf(userMessage) : null;

    // C — the answer arrives as one message or as several, each one typed in front of the visitor
    // and landing whole. A selfie is one message: a photograph is not split in two — the second
    // photograph of the pair follows as a message of its own.
    const parts = selfie ? [answerText] : splitChatMessages(answerText, this.pacing.bubbleMaxChars);
    await this.deliver(session, parts, {
      intent,
      sources: answerSources,
      attachment: selfie,
      replyTo: outgoingQuote,
      // Who read the visitor's message before she answered it — the studio's reading desk, or the
      // window's own reader. Part of the transcript, so the studio can see the desk at work.
      analysedBy: reading.provider,
    });
    for (const extra of liveExtras) {
      await this.deliver(session, [''], { intent, attachment: extra });
    }

    if (topic && !session.closed) {
      markPersonalQuestion(memory, topic, Date.now(), visitorTurns);
      this.touch(session);
    }

    if (local.closes) {
      this.endSession(
        session,
        'blocked',
        '🚪 She has closed the chat. Start a new session whenever you are ready to be polite.',
      );
      return;
    }

    this.syncClock();
    await this.maybePitch(model, session);
  }

  /**
   * G — once the conversation has warmed up she asks for work herself: a brand promotion or an
   * editorial set, priced from her own card. Twice at most in one session, and never after the
   * visitor has been rude.
   */
  private async maybePitch(model: AiModelProfile, session: AiChatSession): Promise<void> {
    if (session.closed || session.strikes > 0 || session.pitches >= 2) return;

    const theirs = session.messages.filter(
      (message) => message.author === 'user' && message.kind === 'message',
    ).length;
    if (![5, 13].includes(theirs)) return;

    session.pitches += 1;
    const text = contractPitch(model, `${session.slug}|pitch|${theirs}`);
    await this.deliver(session, splitChatMessages(text, this.pacing.bubbleMaxChars), {
      intent: 'contract',
    });
  }

  /**
   * C — her answer as the visitor experiences it: one message, or two or three of them, each one
   * typed in front of them and each one landing whole. Nothing here prints a sentence out letter by
   * letter: the wait is the typing, and the message arrives in one piece (requirement A).
   *
   * The order of a single message is the order of a real chat (requirement D): sometimes she was not
   * at her phone yet, so nothing shows at all for three to seven seconds; then her name and "typing"
   * appear; sometimes she stops mid-thought and the indicator goes with her before it comes back; and
   * then the message lands.
   */
  private async deliver(
    session: AiChatSession,
    parts: readonly string[],
    options: {
      intent?: string;
      sources?: readonly AiChatSource[];
      attachment?: AiChatAttachment | null;
      /** The message this answer replies over — the quote at the top of the first bubble. */
      replyTo?: AiChatReplyQuote | null;
      /** False for her own scripted openings, where a random away pause would only be a delay. */
      away?: boolean;
      /** Who read the visitor's message before this answer was written. */
      analysedBy?: string;
    } = {},
  ): Promise<AiChatMessage | null> {
    let first: AiChatMessage | null = null;
    const silent = this.silent;

    if (!silent && parts.length > 0 && options.away !== false && !session.closed) {
      // D — she was somewhere else when the message arrived: nothing types until she picks it up.
      const away = this.awayPauseMs();
      if (away > 0) {
        this.away.set(true);
        try {
          await delay(away);
        } finally {
          this.away.set(false);
        }
      }
    }

    for (const [index, text] of parts.entries()) {
      if (session.closed) break;
      // C — the messages of one answer follow each other with the pause it takes to send the next
      // thought, and the typing indicator is up in front of each one.
      if (index > 0 && !silent) {
        const gap = this.between(this.pacing.gapMinMs, this.pacing.gapMaxMs);
        if (gap > 0) await delay(gap);
      }

      const message = newMessage({
        author: 'model',
        text: '',
        pending: true,
        revealedChars: 0,
        intent: options.intent ?? '',
        analysedBy: options.analysedBy ?? '',
        sources: index === 0 ? [...(options.sources ?? [])] : [],
        attachment: index === 0 ? (options.attachment ?? null) : null,
        replyTo: index === 0 ? (options.replyTo ?? null) : null,
      });
      this.appendMessage(session, message);
      if (index === 0) first = message;
      if (silent) this.writeMessage(message, session, text);
      else await this.typeOut(message, session, text);
    }

    return first;
  }

  /** The message as the visitor sees it the moment it lands: complete, and not a character short. */
  private writeMessage(message: AiChatMessage, session: AiChatSession, text: string): void {
    message.text = text;
    message.pending = false;
    message.revealedChars = text.length;
    this.touch(session);
  }

  /**
   * A — one message: the wait a person needs to type that many characters, with the typing indicator
   * up, and then the whole message at once.
   */
  private async typeOut(
    message: AiChatMessage,
    session: AiChatSession,
    text: string,
  ): Promise<void> {
    message.text = text;
    message.pending = true;
    message.revealedChars = 0;
    this.touch(session);

    const typing = this.typingMsFor(text, session);
    const half = Math.round(typing / 2);
    const stops = typing >= 2_000 && this.midPauseChance() > 0;

    if (stops) {
      // D — she stopped mid-thought: the indicator goes with her, and comes back when she picks the
      // thought up again.
      await delay(half);
      this.removeMessage(session, message);
      await delay(this.between(this.pacing.midPauseMinMs, this.pacing.midPauseMaxMs));
      // The two hours can run out while she is away from the thought: the message is not put back
      // into a transcript that has already closed.
      if (session.closed) return;
      this.appendMessage(session, message);
      await delay(typing - half);
    } else if (typing > 0) {
      await delay(typing);
    }

    // The message appears as a whole. No reveal, no stream, no typewriter.
    message.revealedChars = text.length;
    message.pending = false;
    this.touch(session);
  }

  /**
   * The reading desk's own reading of the language, as the chat's language layer wants it: only for
   * a language the studio keeps a book for, and only when the visitor wrote it in Latin letters —
   * a message in its own script is answered in English, exactly as it is today.
   */
  private deskLanguage(
    reading: ChatTurnReading | null,
    session: AiChatSession,
  ): ChatVisitorLanguage | null {
    if (!readingFromStudio(reading) || !reading?.romanised) return null;
    const code = reading.language as RomanisedLanguageCode | '';
    if (!code || !ROMANISED_LANGUAGE_BOOKS[code]) return null;

    return {
      code,
      label: ROMANISED_LANGUAGE_BOOKS[code].english,
      english: reading.english || '',
      romanised: true,
      source: reading.provider === 'google-translate' ? 'google' : 'books+google',
      fresh: code !== session.language,
    };
  }

  /**
   * B — one turn read before it is answered: the window's own reading of it, then the studio's
   * reading desk, which puts the words through Google Translate and the turn through Gemini or
   * OpenAI, and looks at an attached photograph or document while it is there. When the studio has
   * no key — or the desk cannot be reached — the window's own reading stands and is used exactly as
   * it always was.
   */
  private async readVisitorTurn(
    model: AiModelProfile,
    session: AiChatSession,
    message: AiChatMessage,
    user: { name: string; firstName: string } | null,
    photo: Awaited<ReturnType<typeof readChatPhotoFacts>>,
    books: ChatVisitorLanguage | null,
  ): Promise<ChatTurnReading> {
    const reading = await analyseVisitorTurn({
      text: message.text,
      attachment: message.attachment,
      model,
      user,
      history: session.messages,
      language: books,
      photo,
      allowNetwork: this.readingDeskAllowed(),
    });
    if (!readingFromStudio(reading)) {
      // The desk has nothing to say: no key configured, or it is not answering. She does not ask it
      // again for every message of the conversation.
      this.readDeskUnavailable.set(true);
    }
    return reading;
  }

  /**
   * E — she takes the selfie now. Her own profile photograph is fetched, downscaled and handed to
   * the studio's camera together with the moment she is in, and the photograph that comes back is
   * what the visitor sees. She is quiet for a few seconds while it is taken — a photograph is not
   * typed. When the studio has no image key, or the camera refuses, `null` comes back and one of her
   * album frames goes out instead.
   */
  private async takeSelfie(
    model: AiModelProfile,
    moment: { place: string; flaw: string },
  ): Promise<string | null> {
    // Her camera is its own service: whether the reading desk answered has nothing to do with
    // whether she can take a photograph.
    if (this.selfieCameraUnavailable()) return null;

    const reference = await readSelfieReference(selfieReference(model));
    if (!reference) {
      this.selfieCameraUnavailable.set(true);
      return null;
    }

    const started = Date.now();
    const taken = await generateChatSelfie({ model, moment, reference });
    if (!taken) {
      this.selfieCameraUnavailable.set(true);
      return null;
    }

    // The wait a person needs to aim a phone at herself, when the camera answered faster than that.
    await this.waitOutSelfiePace(started);
    return taken.image;
  }

  /**
   * E — the two live photographs from **`livechatselfiesandphotos`**: her own profile photograph
   * is fetched as the likeness and handed to the service with the moment she is in, and two fresh
   * frames come back — same outfit, same ambience, different poses, stamped with her local
   * timestamp and the phone watermark. They live only in the browser. Returns `null` when the
   * studio has no image key or the service cannot answer, and the chat then falls back to her old
   * camera and finally to her album, so a visitor who asks always gets a photograph.
   */
  private async takeLiveSelfies(
    model: AiModelProfile,
    moment: { place: string; flaw: string },
    seed: string,
  ): Promise<GeneratedLiveChatSelfies | null> {
    if (this.selfieCameraUnavailable()) return null;

    const reference = await readSelfieReference(selfieReference(model));
    if (!reference) {
      this.selfieCameraUnavailable.set(true);
      return null;
    }

    const started = Date.now();
    const live = await generateLiveChatSelfies({ model, moment, reference, seed });
    if (!live) return null;

    // The wait two frames deserve — she held the phone up twice and checked them both.
    await this.waitOutSelfiePace(started);
    return live;
  }

  /** The wait a person needs to take a photograph, when it was taken faster than that. */
  private async waitOutSelfiePace(started: number): Promise<void> {
    if (this.silent) return;
    const wanted = this.between(this.pacing.selfieMinMs, this.pacing.selfieMaxMs);
    const remaining = wanted - (Date.now() - started);
    if (remaining > 0) await delay(remaining);
  }

  /** True when the reading desk may be asked for a reading (a browser, online, and not refused yet). */
  private readingDeskAllowed(): boolean {
    if (this.readDeskUnavailable()) return false;
    return this.languageNetworkAllowed();
  }

  /**
   * The language of one visitor message. The reading desk's own reading of it comes first — Google
   * Translate has already named the language and written the message out in English — then the
   * studio's books, and Google is asked from the window only when neither could read enough of the
   * message. Whichever read it, the answer is remembered on the session, so she speaks the visitor's
   * language from then on — including for the lines she writes on her own when they go quiet.
   */
  private async readVisitorLanguage(
    model: AiModelProfile,
    session: AiChatSession,
    text: string,
    reading: ChatTurnReading | null = null,
    books: ChatVisitorLanguage | null = null,
  ): Promise<ChatVisitorLanguage | null> {
    const fromDesk = this.deskLanguage(reading, session);
    if (fromDesk) {
      session.language = fromDesk.code;
      return fromDesk;
    }

    const local =
      books ?? (await readChatLanguage(text, model, session.language, { allowNetwork: false }));
    const read = local?.romanised
      ? local
      : await readChatLanguage(text, model, session.language, {
          allowNetwork: this.languageNetworkAllowed(),
        });
    if (read?.romanised) {
      session.language = read.code;
      return read;
    }
    // Nothing new was read: if she is already speaking their language, she stays in it and reads
    // this message as it is.
    if (session.language && ROMANISED_LANGUAGE_BOOKS[session.language]) {
      return {
        code: session.language,
        label: ROMANISED_LANGUAGE_BOOKS[session.language].english,
        english: text,
        romanised: true,
        source: 'books',
        fresh: false,
      };
    }
    return null;
  }

  /** True when asking Google for a reading is reasonable (a browser, online, not in a test). */
  private languageNetworkAllowed(): boolean {
    if (typeof navigator !== 'undefined' && navigator.onLine === false) return false;
    return typeof fetch === 'function';
  }

  /** Takes a message that has not arrived yet back out of the transcript, and counts the change. */
  private removeMessage(session: AiChatSession, message: AiChatMessage): void {
    const at = session.messages.indexOf(message);
    if (at < 0) return;
    session.messages.splice(at, 1);
    this.touch(session);
  }

  /** A — how long she needs to type this message, with the salt of requirement D on every wait. */
  private typingMsFor(text: string, session: AiChatSession): number {
    const { perCharMs, floorMs, ceilingMs, jitterMs } = this.pacing;
    const base = typingTimeFor(text.length, perCharMs, floorMs, ceilingMs);
    // Registered User sessions are deliberately more responsive, while the same natural pacing is
    // retained for Free and legacy sessions. A test can still silence every wait through `pacing`.
    const entitlementSpeed = this.sessionPlan(session) === 'registered' ? 0.65 : 1;
    const paced = Math.round(base * entitlementSpeed);
    if (jitterMs <= 0) return paced;
    return Math.max(0, paced + Math.round((Math.random() * 2 - 1) * jitterMs * entitlementSpeed));
  }

  /**
   * True when every wait is switched off — the tests, and nothing else. In that state the whole
   * delivery is written in one go, so a page of tests never waits for a second of wall clock.
   */
  private get silent(): boolean {
    const p = this.pacing;
    return (
      p.perCharMs <= 0 &&
      p.floorMs <= 0 &&
      p.ceilingMs <= 0 &&
      p.gapMaxMs <= 0 &&
      p.selfieMaxMs <= 0 &&
      p.awayChance <= 0 &&
      p.midPauseChance <= 0 &&
      p.introMaxMs <= 0
    );
  }

  /** D — the three to seven seconds before a single letter of typing appears, sometimes. */
  private awayPauseMs(): number {
    const { awayChance, awayMinMs, awayMaxMs } = this.pacing;
    if (awayChance <= 0 || awayMinMs <= 0 || Math.random() > awayChance) return 0;
    return this.between(awayMinMs, awayMaxMs);
  }

  /** D — how often she stops mid-thought; zero turns it off entirely, which is what the tests do. */
  private midPauseChance(): number {
    const { midPauseChance } = this.pacing;
    if (midPauseChance <= 0) return 0;
    return Math.random() < midPauseChance ? 1 : 0;
  }

  /** A whole number between two bounds of the pacing table. */
  private between(min: number, max: number): number {
    if (max <= min) return Math.max(0, Math.round(min));
    return Math.round(min + Math.random() * (max - min));
  }

  /**
   * Asks the NeverBeen Web API for her answer (`POST /neverbeen-api/api/ai-chat`).
   *
   * The request carries the visitor's input together with the model's **character profile** — her
   * `public/NeverBeenModels/<Album>/personality/characterdatabase.json`, loaded (and cached) by
   * `loadCharacterDatabase()` with the editor's `_doc` notes dropped — plus her card, the visitor,
   * the reading of the turn and the recent conversation. The backend calls Google Gemini
   * (`gemini-2.5-flash`) with its secret `GEMINI_API_KEY` and answers
   * `{ ok: true, reply, provider: 'gemini', model }`.
   *
   * Returns `null` — so the local engine answers — when the backend is not configured, unreachable,
   * refuses, or sends back no text.
   */
  private async requestBackendReply(
    model: AiModelProfile,
    session: AiChatSession,
    userMessage: AiChatMessage,
    reading: ChatTurnReading | null = null,
    personalTopic: PersonalTopic | '' = '',
  ): Promise<AiChatRemoteReply | null> {
    if (this.remoteUnavailable() || typeof fetch !== 'function') return null;

    const identity = session.identity;
    // Free Chat carries a short, basic working context; registered conversations retain a deeper
    // context for the model's answer. The transcript remains visible to both plans.
    const historyLimit = this.sessionPlan(session) === 'registered' ? 24 : 6;
    // Her character profile never fails to load: a missing or broken file falls back to the
    // built-in joyful default, exactly as the database's own `fallbackWhenFileMissing` promises.
    const characterProfile = await loadCharacterDatabase(model);
    const body = {
      // The visitor's input — what she answers.
      message: userMessage.text,
      // Her character profile (`personality/characterdatabase.json`): her main rule engine.
      characterProfile,
      personal: { answers: session.personalMemory?.answers ?? {}, nextTopic: personalTopic },
      // A — the visitor travels with every turn, so the answer comes back addressed to them.
      user: identity
        ? { name: identity.name, firstName: firstNameOf(identity.name) }
        : { name: '', firstName: '' },
      model: {
        slug: model.slug,
        name: model.name,
        handle: model.handle,
        location: model.location,
        age: model.age,
      },
      dossier: this.dossierFor(model).slice(0, AI_CHAT_BACKEND_DOSSIER_LIMIT),
      // What the reading desk made of this turn: the answer is to the meaning, not the letters.
      reading: reading ? readingForAnswer(reading) : null,
      history: session.messages
        .filter(
          (message) =>
            message.kind === 'message' && message.text.trim().length > 0 && !message.pending,
        )
        .slice(-historyLimit)
        .map((message) => ({
          role: message.author === 'user' ? ('user' as const) : ('model' as const),
          text: message.text.slice(0, 800),
        })),
    };

    let response: Response;
    try {
      response = await fetch(AI_CHAT_BACKEND_ENDPOINT, {
        method: 'POST',
        headers: { 'content-type': 'application/json', accept: 'application/json' },
        body: JSON.stringify(body),
      });
    } catch {
      // Offline for a moment: this turn is hers alone, the next one asks the backend again.
      return null;
    }

    if (!response.ok) {
      if (AI_CHAT_BACKEND_OFF_STATUSES.has(response.status)) this.remoteUnavailable.set(true);
      return null;
    }

    let payload: { ok?: boolean; reply?: unknown } | null = null;
    try {
      payload = (await response.json()) as { ok?: boolean; reply?: unknown };
    } catch {
      return null;
    }

    const text = typeof payload?.reply === 'string' ? payload.reply.trim() : '';
    if (payload?.ok === false || text.length === 0) return null;
    return { text, sources: [] };
  }

  // ------------------------------------------------------------------ sessions

  private createSession(slug: string, plan: LiveChatPlan | 'legacy' = 'legacy'): AiChatSession {
    // The clock does not start here: it starts when the visitor has introduced themselves, so no
    // one loses their selected chat time to a form.
    const durationMs = plan === 'legacy' ? AI_CHAT_SESSION_MS : LIVE_CHAT_PLANS[plan].durationMs;
    const durationLabel = plan === 'legacy' ? 'two-hour' : LIVE_CHAT_PLANS[plan].durationLabel;
    return {
      slug,
      plan,
      durationMs,
      identity: null,
      personalMemory: newPersonalMemory(),
      startedAt: 0,
      endsAt: 0,
      messages: [
        newMessage({
          author: 'system',
          text: `🔒 This is a private ${durationLabel} chat with an AI model of the NeverBeen Multiverse. Nothing here is real outside NeverBeen, and the studio reads nothing of it.`,
          kind: 'notice',
        }),
      ],
      strikes: 0,
      closed: '',
      reminders: [],
      introduced: false,
      pendingPhotoAsk: false,
      followUpAt: 0,
      followUps: 0,
      lastVisitorAt: 0,
      pitches: 0,
      closedAt: 0,
      feedback: null,
      language: '',
    };
  }

  private sessionFor(
    model: AiModelProfile,
    plan: LiveChatPlan | 'legacy' = 'legacy',
  ): AiChatSession {
    let session = this.sessions.get(model.slug);
    if (!session) {
      session = this.createSession(model.slug, plan);
      this.sessions.set(model.slug, session);
      this.persist();
    }
    return session;
  }

  /** Backward-compatible plan lookup for conversations stored before access plans existed. */
  private sessionPlan(session: AiChatSession): LiveChatPlan | 'legacy' {
    return session.plan === 'free' || session.plan === 'registered' ? session.plan : 'legacy';
  }

  private sessionDuration(session: AiChatSession): number {
    if (Number.isFinite(session.durationMs) && (session.durationMs ?? 0) > 0) {
      return Math.floor(session.durationMs!);
    }
    const plan = this.sessionPlan(session);
    return plan === 'legacy' ? AI_CHAT_SESSION_MS : LIVE_CHAT_PLANS[plan].durationMs;
  }

  private reminderMarksFor(session: AiChatSession): readonly number[] {
    const durationMinutes = this.sessionDuration(session) / 60_000;
    return AI_CHAT_REMINDER_MARKS.filter((mark) => mark < durationMinutes);
  }

  private timeoutTextFor(session: AiChatSession): string {
    const plan = this.sessionPlan(session);
    if (plan === 'legacy') return CHAT_TIMEOUT_TEXT;
    const label = LIVE_CHAT_PLANS[plan].durationLabel;
    return `⌛ Your ${label} ${LIVE_CHAT_PLANS[plan].label.toLocaleLowerCase()} is up, so this chat closes here. Start another chat whenever you are ready.`;
  }

  private appendMessage(session: AiChatSession, message: AiChatMessage): void {
    session.messages.push(message);
    if (session.messages.length > AI_CHAT_MESSAGE_LIMIT) {
      session.messages.splice(0, session.messages.length - AI_CHAT_MESSAGE_LIMIT);
    }
  }

  /** One place where a change reaches the window's signal and the stored session. */
  private touch(session: AiChatSession, persist = true): void {
    if (this.openSlug() === session.slug) this.view(session);
    if (persist) this.persist();
  }

  // ------------------------------------------------------------------ her memory of the website

  private dossierFor(model: AiModelProfile): string {
    let dossier = this.dossiers.get(model.slug);
    if (!dossier) {
      dossier = buildModelDossier(model);
      this.dossiers.set(model.slug, dossier);
    }
    return dossier;
  }

  // ------------------------------------------------------------------ storage

  /** Mirrors every session into `sessionStorage`, dropping picture previews when space runs out. */
  private persist(): void {
    const save = (stripPreviews: boolean): void => {
      const payload: PersistedChat = { version: 1, sessions: {} };
      for (const [slug, session] of this.sessions) {
        payload.sessions[slug] = {
          ...session,
          messages: session.messages.map((message) => {
            if (!message.attachment) return { ...message, pending: false };
            // A picture's preview and a document's own bytes are both far too large for the tab's
            // storage, so either of them is dropped (and the bubble keeps the file's name) as soon
            // as it would not fit — and a photograph generated by `livechatselfiesandphotos` is
            // never written to storage at all: it lives only in the browser and is dropped when
            // the session ends.
            const ephemeral = message.attachment.ephemeral === true;
            const keepPreview =
              !stripPreviews &&
              !ephemeral &&
              message.attachment.preview.length <= PREVIEW_PERSIST_LIMIT;
            const keepFileData =
              !stripPreviews &&
              !ephemeral &&
              (message.attachment.fileData?.length ?? 0) <= PREVIEW_PERSIST_LIMIT;
            return {
              ...message,
              pending: false,
              attachment: {
                ...message.attachment,
                preview: keepPreview ? message.attachment.preview : '',
                fileData: keepFileData ? message.attachment.fileData : '',
              },
            };
          }),
        };
      }
      sessionStorage.setItem(AI_CHAT_STORAGE_KEY, JSON.stringify(payload));
    };

    try {
      save(false);
    } catch {
      try {
        save(true);
      } catch {
        // A browser with no storage (private mode, disabled cookies) simply keeps the chat in memory.
      }
    }
  }

  /** Brings back the sessions of this tab — the conversation, the strikes and the countdown. */
  private restore(): void {
    let raw: string | null = null;
    try {
      raw = sessionStorage.getItem(AI_CHAT_STORAGE_KEY);
    } catch {
      return;
    }
    if (!raw) return;

    try {
      const parsed = JSON.parse(raw) as PersistedChat;
      if (!parsed || parsed.version !== 1 || typeof parsed.sessions !== 'object') return;
      for (const [slug, session] of Object.entries(parsed.sessions ?? {})) {
        if (!session || typeof session.endsAt !== 'number' || !Array.isArray(session.messages))
          continue;
        const restoredPlan: LiveChatPlan | 'legacy' =
          session.plan === 'free' || session.plan === 'registered' ? session.plan : 'legacy';
        this.sessions.set(slug, {
          slug,
          plan: restoredPlan,
          durationMs:
            Number.isFinite(session.durationMs) && (session.durationMs ?? 0) > 0
              ? session.durationMs
              : restoredPlan === 'legacy'
                ? AI_CHAT_SESSION_MS
                : LIVE_CHAT_PLANS[restoredPlan].durationMs,
          identity: session.identity ?? null,
          personalMemory: restorePersonalMemory(session.personalMemory),
          startedAt: session.startedAt ?? Date.now(),
          endsAt: session.endsAt,
          messages: session.messages.map((message) => ({
            ...message,
            pending: false,
            revealedChars: message.text?.length ?? 0,
            sources: message.sources ?? [],
          })),
          strikes: session.strikes ?? 0,
          closed: session.closed ?? '',
          reminders: Array.isArray(session.reminders) ? session.reminders : [],
          introduced: Boolean(session.introduced),
          pendingPhotoAsk: Boolean(session.pendingPhotoAsk),
          followUpAt: session.followUpAt ?? 0,
          followUps: session.followUps ?? 0,
          // A session stored before her own initiative changed shape is measured from the moment it
          // started: the visitor's silence is the same silence, whichever version wrote it.
          lastVisitorAt: session.lastVisitorAt ?? session.startedAt ?? 0,
          pitches: session.pitches ?? 0,
          closedAt: session.closedAt ?? 0,
          feedback: session.feedback ?? null,
          language: session.language ?? '',
          liveChatCounted: session.liveChatCounted === true,
          liveChatKey: typeof session.liveChatKey === 'string' ? session.liveChatKey : undefined,
          liveChatEnded: session.liveChatEnded === true,
        });
      }
    } catch {
      // A corrupted entry is ignored: a fresh chat is better than a broken window.
    }
  }
}

/** `7250000` → `02:00:50`; under an hour it shows `M:SS`. */
export function formatRemaining(milliseconds: number): string {
  const total = Math.max(0, Math.ceil(milliseconds / 1000));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  const pad = (value: number): string => String(value).padStart(2, '0');
  return hours > 0 ? `${pad(hours)}:${pad(minutes)}:${pad(seconds)}` : `${minutes}:${pad(seconds)}`;
}

function delay(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

/** The key one Live Chat session is counted under — unguessable, and unique to the session. */
function newLiveChatSessionKey(): string {
  const cryptoApi = globalThis.crypto;
  if (cryptoApi && typeof cryptoApi.randomUUID === 'function') return cryptoApi.randomUUID();
  return `lc-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}
