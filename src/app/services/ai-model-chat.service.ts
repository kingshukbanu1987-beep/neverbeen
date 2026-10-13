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
 * - **The answer (requirements A, B, C, D).** The model's own engine (`chat-replies.ts`) answers
 *   instantly. When the studio has configured its OpenAI key, `POST /api/ai-chat` answers instead —
 *   streamed, word by word, with live Google results when a search key is configured — and every
 *   failure lands back on the local engine, so the chat always answers.
 */
import { Injectable, computed, signal } from '@angular/core';
import { AiModelProfile } from '../pages/ai-models/ai-model-data';
import { composeChatReply, reactionAcknowledgement } from '../pages/ai-models/chat/chat-replies';
import {
  AI_CHAT_MESSAGE_LIMIT,
  AI_CHAT_REMINDER_MARKS,
  AI_CHAT_SESSION_MS,
  AiChatAttachment,
  AiChatClosedReason,
  AiChatMessage,
  AiChatReaction,
  AiChatSession,
  AiChatSource,
} from '../pages/ai-models/chat/chat-types';
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

  /** Milliseconds left of the two hours, kept up to date while a window is open. */
  readonly remainingMs = signal(AI_CHAT_SESSION_MS);

  /** True once `POST /api/ai-chat` has answered "no key configured" — the local engine takes over. */
  readonly remoteUnavailable = signal(false);

  /** A picture or document waiting in the composer. */
  readonly draftAttachment = signal<AiChatAttachment | null>(null);

  /** A friendly line about the last attachment or send problem. */
  readonly notice = signal('');

  /**
   * The cosmetic timing of an answer: how long she "thinks" before the first word, and how fast the
   * words then arrive. The window keeps these values; the tests set them to zero.
   */
  readonly pacing = { thinkingMs: 620, revealMs: 22 };

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
    this.stopClock();
  }

  /** Starts a fresh two-hour session for a model, from the "start a new chat" button. */
  startNewSession(model: AiModelProfile): void {
    const session = this.createSession(model.slug);
    this.sessions.set(model.slug, session);
    this.openSlug.set(model.slug);
    this.view(session);
    this.draftAttachment.set(null);
    this.notice.set('');
    this.remainingMs.set(AI_CHAT_SESSION_MS);
    this.startClock();
    this.persist();
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

    const attachment = this.draftAttachment();
    const text = rawText.trim();
    if (!text && !attachment) return;

    const userMessage = newMessage({
      author: 'user',
      text: text || `Sent a ${attachment?.kind === 'document' ? 'document' : 'photograph'}`,
      attachment,
    });
    this.appendMessage(session, userMessage);
    this.draftAttachment.set(null);
    this.notice.set('');
    this.thinking.set(true);
    this.persist();

    try {
      await this.answer(model, session, userMessage);
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

    const herMessage = newMessage({
      author: 'model',
      text: acknowledgement.text,
      pending: true,
      revealedChars: 0,
      intent: `reaction:${reaction}`,
    });
    this.appendMessage(session, herMessage);
    void this.reveal(herMessage, session, acknowledgement.text);
  }

  // ------------------------------------------------------------------ clock

  /** Recomputes the countdown, announces any reminder that has become due, and ends the session. */
  private tick(): void {
    const slug = this.openSlug();
    if (!slug) return;
    const session = this.sessions.get(slug);
    if (!session) return;

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
  }

  /** Ends a session — the two hours are up, or she has said goodbye for good. */
  private endSession(session: AiChatSession, reason: AiChatClosedReason, message?: string): void {
    if (session.closed) return;
    session.closed = reason;
    if (message) {
      this.appendMessage(
        session,
        newMessage({ author: 'system', text: message, kind: 'reminder' }),
      );
    }
    this.thinking.set(false);
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
  ): Promise<void> {
    const local = composeChatReply({
      model,
      message: userMessage,
      history: session.messages,
      session: { strikes: session.strikes, introduced: session.introduced },
      now: new Date(),
    });
    session.strikes = local.strikes;
    const wasIntroduced = session.introduced;
    session.introduced = local.introduced;

    // Safety and identity come first and are never delegated: a warning must not be reworded, and
    // the first answer of the session is always her scripted introduction (requirement D).
    const mustBeLocal =
      local.intent.startsWith('moderation:') || !wasIntroduced || userMessage.attachment !== null;

    const herMessage = newMessage({ author: 'model', text: '', pending: true, revealedChars: 0 });
    this.appendMessage(session, herMessage);

    this.touch(session);

    let spoken = false;
    if (!mustBeLocal) {
      const remote = await this.streamRemoteReply(model, session, userMessage, herMessage);
      if (remote) {
        herMessage.text = remote.text;
        herMessage.sources = remote.sources;
        herMessage.pending = false;
        herMessage.revealedChars = remote.text.length;
        spoken = true;
      }
    }

    if (!spoken) {
      herMessage.text = local.text;
      herMessage.intent = local.intent;
      if (userMessage && local.reaction) {
        userMessage.reaction = local.reaction;
        userMessage.reactionBy = 'model';
      }
      await this.reveal(herMessage, session, local.text);
    } else {
      herMessage.intent = 'openai';
      if (local.reaction) {
        userMessage.reaction = local.reaction;
        userMessage.reactionBy = 'model';
      }
    }

    if (local.closes) {
      this.endSession(
        session,
        'blocked',
        '🚪 She has closed the chat. Start a new session whenever you are ready to be polite.',
      );
    } else {
      this.syncClock();
    }
  }

  /** Reveals a finished answer word by word — the Messenger-style "typing" (requirement H's realism). */
  private async reveal(
    message: AiChatMessage,
    session: AiChatSession,
    text: string,
  ): Promise<void> {
    message.text = text;
    message.pending = true;
    message.revealedChars = 0;
    this.touch(session);

    this.touch(session);

    if (this.pacing.thinkingMs > 0) await delay(this.pacing.thinkingMs);

    const step = Math.max(4, Math.round(text.length / 90));
    while (message.revealedChars < text.length) {
      message.revealedChars = Math.min(text.length, message.revealedChars + step);
      this.touch(session, false);
      if (this.pacing.revealMs > 0) await delay(this.pacing.revealMs);
    }

    message.revealedChars = text.length;
    message.pending = false;
    this.touch(session);
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
    herMessage: AiChatMessage,
  ): Promise<AiChatRemoteReply | null> {
    if (this.remoteUnavailable() || typeof fetch !== 'function') return null;

    const attachment = userMessage.attachment;
    const body = {
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
              if (parsed.delta) {
                text += parsed.delta;
                herMessage.text = text;
                herMessage.revealedChars = text.length;
                this.touch(session, false);
              }
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
    const startedAt = Date.now();
    return {
      slug,
      startedAt,
      endsAt: startedAt + AI_CHAT_SESSION_MS,
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
