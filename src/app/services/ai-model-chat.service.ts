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
 * - **The answer (requirements A, B, C, D, F).** The model's own engine (`chat-replies.ts`) answers
 *   instantly. When the studio has configured its OpenAI key, `POST /api/ai-chat` answers instead —
 *   streamed, word by word, with live Google results when a search key is configured — and every
 *   failure lands back on the local engine, so the chat always answers.
 * - **The person on the other side (requirement A).** The window's form hands over a name and a
 *   photograph before the two hours start; both live on the session, her answers use the first name,
 *   and their photograph stands beside every message they send.
 * - **Her own initiative (requirements G, H).** She greets the visitor the moment the form is
 *   filled, she speaks up again when they go quiet for eleven to nineteen seconds, and once the
 *   conversation has warmed up she asks them herself for a shoot.
 */
import { Injectable, computed, signal } from '@angular/core';
import { AiModelProfile, aiModelProfiles } from '../pages/ai-models/ai-model-data';
import {
  composeChatReply,
  greetingFor,
  reactionAcknowledgement,
} from '../pages/ai-models/chat/chat-replies';
import {
  AI_CHAT_IDLE_MAX_MS,
  AI_CHAT_IDLE_MIN_MS,
  AI_CHAT_MESSAGE_LIMIT,
  AI_CHAT_NUDGE_LIMIT,
  AI_CHAT_REMINDER_MARKS,
  AI_CHAT_SESSION_MS,
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
  AiChatMessage,
  AiChatReaction,
  AiChatSession,
  AiChatSource,
} from '../pages/ai-models/chat/chat-types';
import { ChatIdentity, firstNameOf } from '../pages/ai-models/chat/chat-identity';
import { readChatPhotoFacts } from '../pages/ai-models/chat/chat-photo';
import { pickChatSelfie } from '../pages/ai-models/chat/chat-selfie';
import {
  analyseUserBehaviour,
  contractPitch,
  idleChatOpener,
  modelVoice,
  splitChatMessages,
  voiceIntroduction,
} from '../pages/ai-models/chat/chat-voice';
import { seededBetween } from '../pages/ai-models/chat/chat-random';
import { buildModelDossier } from '../pages/ai-models/chat/chat-knowledge';

/** Where a session is kept between visits: one browser tab, and gone when it closes. */
export const AI_CHAT_STORAGE_KEY = 'nb.ai-model-chat.v1';

/** The largest picture preview kept in the restored session. */
const PREVIEW_PERSIST_LIMIT = 180_000;

/** The reminder she writes in the middle of the transcript, in her own voice. */
export function chatReminderText(minutes: number): string {
  if (minutes === 1) {
    return '⏳ One minute left. Our two hours are nearly gone — say the important thing now, and rent me for a shoot if you want the real thing.';
  }
  return `⏳ ${minutes} minutes remaining of our two hours. If you want me for a shoot, tell me now and I will keep the light on for you.`;
}

/** The notice that ends the session when the two hours are up. */
export const CHAT_TIMEOUT_TEXT =
  '⌛ Our two hours are up, so this chat closes here. Start a new chat whenever you like — I will be exactly this pleased to see you.';

export interface AiChatRemoteReply {
  text: string;
  sources: AiChatSource[];
}

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

  /** True once `POST /api/ai-chat` has answered "no key configured" — the local engine takes over. */
  readonly remoteUnavailable = signal(false);

  /** A picture or document waiting in the composer. */
  readonly draftAttachment = signal<AiChatAttachment | null>(null);

  /** A friendly line about the last attachment or send problem. */
  readonly notice = signal('');

  /**
   * True once the visitor has introduced themselves (requirement A) — before that the window shows
   * the form instead of the conversation, and the two hours have not started.
   */
  readonly identified = computed(() => Boolean(this.session()?.identity));

  /** True while the summary card of a finished session is on screen (requirement K). */
  readonly summaryOpen = signal(false);

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

  private readonly sessions = new Map<string, AiChatSession>();
  private readonly dossiers = new Map<string, string>();
  private timer: ReturnType<typeof setInterval> | null = null;
  private revealTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    this.restore();
  }

  // ------------------------------------------------------------------ window

  /** Opens one model's chat window, creating her two-hour session the first time. */
  openChat(model: AiModelProfile): void {
    if (this.openSlug() === model.slug) return;
    const session = this.sessionFor(model);
    this.openSlug.set(model.slug);
    this.view(session);
    this.draftAttachment.set(null);
    this.notice.set('');
    // Opening an older session catches its clock up: the countdown, the reminders it has not
    // announced yet, and the two-hour close if the time ran out while the window was shut.
    this.tick();
    this.startClock();
    this.persist();
  }

  /** Closes the window. The session, its clock and its transcript stay alive. */
  closeChat(): void {
    this.openSlug.set(null);
    this.session.set(null);
    this.draftAttachment.set(null);
    this.summaryOpen.set(false);
    this.stopClock();
  }

  /**
   * A — the visitor's name and photograph, from the form in front of the window. This is the moment
   * the two hours start, and the moment she says something first: a woman opening a chat does not
   * wait to be spoken to.
   */
  setIdentity(model: AiModelProfile, identity: ChatIdentity): void {
    const session = this.sessionFor(model);
    if (session.identity) return;

    const now = Date.now();
    session.identity = { name: identity.name, avatar: identity.avatar };
    session.startedAt = now;
    session.endsAt = now + AI_CHAT_SESSION_MS;
    session.nudgeAt = now + this.idleDelay(1);
    // Her introduction (requirement F of the second brief) is her opening, so the first question the
    // visitor asks is answered as a question and not with a second introduction.
    session.introduced = true;
    this.remainingMs.set(AI_CHAT_SESSION_MS);
    this.summaryOpen.set(false);
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
    );
    void this.introduceFirst(session, parts);
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
   * Starts a fresh two-hour session for a model, from the "start a new chat" button. The visitor's
   * name and photograph are asked for again — a new session is a new introduction.
   */
  startNewSession(model: AiModelProfile): void {
    const session = this.createSession(model.slug);
    this.sessions.set(model.slug, session);
    this.openSlug.set(model.slug);
    this.view(session);
    this.draftAttachment.set(null);
    this.notice.set('');
    this.summaryOpen.set(false);
    this.remainingMs.set(AI_CHAT_SESSION_MS);
    this.startClock();
    this.persist();
  }

  /** K — closes the summary card, leaving the ended window behind it. */
  dismissSummary(): void {
    this.summaryOpen.set(false);
  }

  /** The transcript of a model's session, whether or not her window is open. */
  sessionOf(slug: string): AiChatSession | null {
    return this.sessions.get(slug) ?? null;
  }

  // ------------------------------------------------------------------ the composer

  /** Puts a picked picture or document into the composer. */
  setDraftAttachment(attachment: AiChatAttachment | null): void {
    this.draftAttachment.set(attachment);
    if (attachment) this.notice.set('');
  }

  /** Sends whatever is in the composer: the text, the attached picture or document, or both. */
  async sendMessage(model: AiModelProfile, rawText: string): Promise<void> {
    const session = this.sessionFor(model);
    if (this.openSlug() !== model.slug || session.closed) return;
    if (!session.identity) {
      this.notice.set('Your name and one photograph first — then I am all yours.');
      return;
    }

    const attachment = this.draftAttachment();
    const text = rawText.trim();
    if (!text && !attachment) return;

    // F — a photograph is read before it is answered: the frame, the light and what is in it.
    const photo =
      attachment?.kind === 'photo' && attachment.preview
        ? await readChatPhotoFacts(attachment.preview)
        : null;

    const userMessage = newMessage({
      author: 'user',
      text: text || `Sent a ${attachment?.kind === 'document' ? 'document' : 'photograph'}`,
      attachment,
    });
    this.appendMessage(session, userMessage);
    this.draftAttachment.set(null);
    this.notice.set('');
    this.thinking.set(true);
    // She is listening again: the silence that makes her speak up starts from this message.
    session.nudgeAt = Date.now() + this.idleDelay(session.nudges + 1);
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
   * The visitor reacts to one of her messages (requirement H). She answers the reaction in words and
   * gives the same reaction back to the visitor's last message, the way a person would.
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

    const lastUserMessage = [...session.messages]
      .reverse()
      .find((message) => message.author === 'user');
    const acknowledgement = reactionAcknowledgement(
      model,
      reaction,
      `${messageId}-${reaction}-${session.messages.length}`,
    );
    if (lastUserMessage && acknowledgement.reactionBack) {
      lastUserMessage.reaction = acknowledgement.reactionBack;
      lastUserMessage.reactionBy = 'model';
    }

    this.touch(session);
    void this.deliver(session, [acknowledgement.text], {
      intent: `reaction:${reaction}`,
      away: false,
    });
  }

  // ------------------------------------------------------------------ clock

  /** Recomputes the countdown, announces any reminder that has become due, and ends the session. */
  private tick(): void {
    const slug = this.openSlug();
    if (!slug) return;
    const session = this.sessions.get(slug);
    if (!session) return;

    // The two hours have not started: the visitor is still filling in the form in front of the
    // window, and there is nothing for her to do but wait for them.
    if (session.endsAt === 0) {
      this.remainingMs.set(AI_CHAT_SESSION_MS);
      return;
    }

    const remaining = session.endsAt - Date.now();
    this.remainingMs.set(Math.max(0, remaining));

    if (session.closed) return;
    if (remaining <= 0) {
      this.endSession(session, 'timeout', CHAT_TIMEOUT_TEXT);
      return;
    }

    const minutesLeft = remaining / 60_000;
    const due = AI_CHAT_REMINDER_MARKS.filter(
      (mark) => minutesLeft <= mark && !session.reminders.includes(mark),
    ).sort((a, b) => b - a);

    for (const mark of due) {
      session.reminders.push(mark);
      this.appendMessage(
        session,
        newMessage({ author: 'system', text: chatReminderText(mark), kind: 'reminder' }),
      );
    }
    if (due.length > 0) this.syncClock();

    this.nudge(session);
  }

  /**
   * H — the visitor has gone quiet, so she says something herself: about her, about them, about the
   * world, or a question of her own. She waits a little longer every time, and stops after a few.
   */
  private nudge(session: AiChatSession): void {
    if (!session.identity || session.nudges >= AI_CHAT_NUDGE_LIMIT) return;
    if (this.thinking() || session.messages.some((message) => message.pending)) return;
    if (Date.now() < session.nudgeAt) return;

    const last = [...session.messages].reverse().find((message) => message.kind === 'message');
    if (!last || last.author !== 'model') return;

    session.nudges += 1;
    session.nudgeAt = Date.now() + this.idleDelay(session.nudges + 1);

    const model = this.openModel();
    const text = idleChatOpener({
      model,
      voice: modelVoice(model),
      behaviour: analyseUserBehaviour(session.messages, session.strikes),
      name: firstNameOf(session.identity.name),
      step: session.nudges,
      seed: `${session.slug}|nudge|${session.nudges}|${session.messages.length}`,
    });

    // She speaks up on her own: the pause that makes it feel like a message from her rather than an
    // answer is the away pause of requirement D, and here it is always on.
    void this.deliver(session, [text], { intent: 'idle' });
  }

  /** The model of the open window — the one every session change is applied to. */
  private openModel(): AiModelProfile {
    const slug = this.openSlug();
    const model = aiModelProfiles.find((candidate) => candidate.slug === slug);
    if (!model) throw new Error('No model is open in the chat window.');
    return model;
  }

  /** Eleven to nineteen seconds of silence before she speaks up, a little longer each time. */
  private idleDelay(step: number): number {
    const window = Math.min(60_000, (step - 1) * 9_000);
    return seededBetween(
      `${this.openSlug()}|idle|${step}|${Math.round(Math.random() * 1e6)}`,
      AI_CHAT_IDLE_MIN_MS + window,
      AI_CHAT_IDLE_MAX_MS + window,
    );
  }

  /** Ends a session — the two hours are up, or she has said goodbye for good. */
  private endSession(session: AiChatSession, reason: AiChatClosedReason, message?: string): void {
    if (session.closed) return;
    session.closed = reason;
    session.closedAt = Date.now();
    if (message) {
      this.appendMessage(
        session,
        newMessage({ author: 'system', text: message, kind: 'reminder' }),
      );
    }
    this.thinking.set(false);
    // K — a session that ends is a session she reports on: the summary card comes up over the
    // window, with the two faces, the time they spent and her own paragraph about it.
    this.summaryOpen.set(true);
    this.syncClock();
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
    if (session) this.remainingMs.set(Math.max(0, session.endsAt - Date.now()));
    this.persist();
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

    const local = composeChatReply({
      model,
      message: userMessage,
      history: session.messages,
      session: { strikes: session.strikes, introduced: session.introduced, identity: user },
      user,
      photo,
      canSendSelfie: model.photos.length > 0 || Boolean(model.cover),
      now: new Date(),
    });
    session.strikes = local.strikes;
    const wasIntroduced = session.introduced;
    session.introduced = local.introduced;

    // Safety and identity come first and are never delegated: a warning must not be reworded, and
    // the first answer of the session is always her scripted introduction (requirement D).
    const mustBeLocal =
      local.intent.startsWith('moderation:') || !wasIntroduced || userMessage.attachment !== null;

    this.touch(session);

    // B — the studio's OpenAI and Google keys answer when they are configured. The words arrive as
    // one finished answer here and are typed out like her own; no part of the stream is ever shown
    // word by word (requirement A of the second brief).
    let answerText = local.text;
    let answerSources: readonly AiChatSource[] = [];
    let intent = local.intent;
    if (!mustBeLocal) {
      const remote = await this.streamRemoteReply(model, session, userMessage);
      if (remote) {
        answerText = remote.text;
        answerSources = remote.sources;
        intent = 'openai';
      }
    }

    // E — a selfie goes out as a photograph, not as a promise of one.
    let selfie: AiChatAttachment | null = null;
    if (answerText === local.text && local.selfie) {
      const alreadySent = session.messages
        .map((message) => message.attachment)
        .filter((attachment) => attachment?.selfie === true)
        .map((attachment) => attachment?.preview ?? '');
      const shot = pickChatSelfie(
        model,
        `${userMessage.id}|${session.messages.length}`,
        alreadySent,
      );
      if (shot) {
        selfie = {
          kind: 'photo',
          name: `${model.slug}-selfie.jpg`,
          type: 'image/jpeg',
          size: 0,
          source: 'camera',
          preview: shot.photo,
          selfie: true,
        };
      }
    }

    if (userMessage && local.reaction) {
      userMessage.reaction = local.reaction;
      userMessage.reactionBy = 'model';
    }

    // C — the answer arrives as one message or as several, each one typed in front of the visitor
    // and landing whole. A selfie is one message: a photograph is not split in two.
    const parts = selfie ? [answerText] : splitChatMessages(answerText, this.pacing.bubbleMaxChars);
    await this.deliver(session, parts, { intent, sources: answerSources, attachment: selfie });

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
      /** False for her own scripted openings, where a random away pause would only be a delay. */
      away?: boolean;
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
        sources: index === 0 ? [...(options.sources ?? [])] : [],
        attachment: index === 0 ? (options.attachment ?? null) : null,
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

    const typing = this.typingMsFor(text);
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

  /** Takes a message that has not arrived yet back out of the transcript, and counts the change. */
  private removeMessage(session: AiChatSession, message: AiChatMessage): void {
    const at = session.messages.indexOf(message);
    if (at < 0) return;
    session.messages.splice(at, 1);
    this.touch(session);
  }

  /** A — how long she needs to type this message, with the salt of requirement D on every wait. */
  private typingMsFor(text: string): number {
    const { perCharMs, floorMs, ceilingMs, jitterMs } = this.pacing;
    const base = typingTimeFor(text.length, perCharMs, floorMs, ceilingMs);
    if (jitterMs <= 0) return base;
    return Math.max(0, base + Math.round((Math.random() * 2 - 1) * jitterMs));
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
   * Streams an answer from `POST /api/ai-chat`. Returns `null` — so the local engine answers — when
   * the studio has no key configured, when the service is unreachable, or when the stream carries
   * no text at all.
   */
  private async streamRemoteReply(
    model: AiModelProfile,
    session: AiChatSession,
    userMessage: AiChatMessage,
  ): Promise<AiChatRemoteReply | null> {
    if (this.remoteUnavailable() || typeof fetch !== 'function') return null;

    const attachment = userMessage.attachment;
    const identity = session.identity;
    const body = {
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
      dossier: this.dossierFor(model),
      question: userMessage.text,
      history: session.messages
        .filter(
          (message) =>
            message.kind === 'message' && message.text.trim().length > 0 && !message.pending,
        )
        .slice(-12)
        .map((message) => ({
          role: message.author === 'user' ? ('user' as const) : ('model' as const),
          text: message.text.slice(0, 800),
        })),
      attachment:
        attachment && attachment.kind === 'photo' && attachment.preview.startsWith('data:')
          ? {
              kind: attachment.kind,
              name: attachment.name,
              type: attachment.type,
              dataUrl: attachment.preview,
            }
          : attachment
            ? { kind: attachment.kind, name: attachment.name, type: attachment.type, dataUrl: '' }
            : null,
    };

    let response: Response;
    try {
      response = await fetch('/api/ai-chat', {
        method: 'POST',
        headers: { 'content-type': 'application/json', accept: 'text/event-stream' },
        body: JSON.stringify(body),
      });
    } catch {
      this.remoteUnavailable.set(true);
      return null;
    }

    if (!response.ok || !response.body) {
      // 503 is the studio saying "no key configured"; anything else is treated the same way — the
      // chat keeps working, it simply answers from the model's own engine.
      this.remoteUnavailable.set(true);
      return null;
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    const sources: AiChatSource[] = [];
    let buffer = '';
    let text = '';

    try {
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const events = buffer.split('\n\n');
        buffer = events.pop() ?? '';
        for (const event of events) {
          for (const line of event.split('\n')) {
            if (!line.startsWith('data:')) continue;
            const payload = line.slice(5).trim();
            if (!payload || payload === '[DONE]') continue;
            try {
              const parsed = JSON.parse(payload) as {
                delta?: string;
                sources?: AiChatSource[];
                error?: string;
              };
              if (parsed.error) return null;
              // The deltas are collected into one finished answer; the window never shows them
              // arriving one at a time (requirement A of the second brief).
              if (parsed.delta) text += parsed.delta;
              if (parsed.sources) sources.splice(0, sources.length, ...parsed.sources);
            } catch {
              // A partial or unknown event is ignored; the next chunk completes it.
            }
          }
        }
      }
    } catch {
      if (text.length === 0) return null;
    }

    if (text.trim().length === 0) return null;
    return { text: text.trim(), sources };
  }

  // ------------------------------------------------------------------ sessions

  private createSession(slug: string): AiChatSession {
    // The clock does not start here: it starts when the visitor has introduced themselves
    // (requirement A), so nobody loses their two hours to a form.
    return {
      slug,
      identity: null,
      startedAt: 0,
      endsAt: 0,
      messages: [
        newMessage({
          author: 'system',
          text: '🔒 This is a private two-hour chat with an AI model of the NeverBeen Multiverse. Nothing here is real outside NeverBeen, and the studio reads nothing of it.',
          kind: 'notice',
        }),
      ],
      strikes: 0,
      closed: '',
      reminders: [],
      introduced: false,
      nudgeAt: 0,
      nudges: 0,
      pitches: 0,
      closedAt: 0,
    };
  }

  private sessionFor(model: AiModelProfile): AiChatSession {
    let session = this.sessions.get(model.slug);
    if (!session) {
      session = this.createSession(model.slug);
      this.sessions.set(model.slug, session);
      this.persist();
    }
    return session;
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
            const keepPreview =
              !stripPreviews && message.attachment.preview.length <= PREVIEW_PERSIST_LIMIT;
            return {
              ...message,
              pending: false,
              attachment: keepPreview ? message.attachment : { ...message.attachment, preview: '' },
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
        this.sessions.set(slug, {
          slug,
          identity: session.identity ?? null,
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
          nudgeAt: session.nudgeAt ?? 0,
          nudges: session.nudges ?? 0,
          pitches: session.pitches ?? 0,
          closedAt: session.closedAt ?? 0,
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
