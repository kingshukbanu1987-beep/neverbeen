import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { firstValueFrom, timeout } from 'rxjs';
import { environment } from '../../environments/environment';

/** One model's Live Chat counts, as `GET /api/models/live-chats` returns them. */
export interface ModelLiveChatCountDto {
  modelSlug: string;
  /** How many chat sessions are live with her right now. */
  liveNowCount?: number;
  /** How many chats have ended — the model's whole past-chat total. */
  pastChatCount?: number;
  /**
   * The single total of an API deployed before the Live Now / past-chat split. Every chat it
   * counted has long since run out its two hours, so the number is read as past chats.
   */
  liveChatCount?: number;
}

/** The answer of `POST /api/models/{slug}/live-chats` and `…/live-chats/end`: the fresh counts. */
export interface ModelLiveChatStartDto {
  modelSlug: string;
  liveNowCount?: number;
  pastChatCount?: number;
  liveChatCount?: number;
}

/** What one model's card shows: the chats live with her right now, and the chats already over. */
export interface ModelLiveChatCounts {
  liveNow: number;
  pastChats: number;
}

export type LiveChatCountStatus = 'idle' | 'loading' | 'ready' | 'error';

/**
 * How often the directory asks the API for fresh counts while it is on screen. A chat started or
 * ended on any other device shows up on every open directory within this window — no refresh.
 */
export const LIVE_CHAT_POLL_MS = 2_000;

/**
 * The Live Now and past-chat counters of every AI model, shown in the split pill beside each
 * card's Live Chat button.
 *
 * - **Reads.** One request loads every model's counts for the directory
 *   (`GET /api/models/live-chats`, see docs/patches/neverbeen-api-model-live-chat-count.patch),
 *   and `startPolling()` keeps re-reading it every {@link LIVE_CHAT_POLL_MS} (two seconds) while the directory
 *   is open, so a session started or ended anywhere else moves the counters without a refresh.
 * - **Writes.** The chat window records one start when a visitor's two-hour session begins
 *   (`POST /api/models/{slug}/live-chats`) and one end when that session is over
 *   (`POST /api/models/{slug}/live-chats/end`), both under the session's own key. Sessions that
 *   never say goodbye — a closed tab, a dead battery — expire server-side after the two hours.
 * - **Failure.** When the API is unreachable the last known counts stay on screen; a card that
 *   never had any shows the quiet default — `0` live now, `0` past chats.
 */
@Injectable({ providedIn: 'root' })
export class ModelLiveChatService {
  private readonly http = inject(HttpClient, { optional: true });
  private readonly apiBase = environment.apiBaseUrl.replace(/\/+$/, '');

  private readonly countsState = signal<Readonly<Record<string, ModelLiveChatCounts>>>({});
  private readonly statusState = signal<LiveChatCountStatus>('idle');

  /** Every model's counts, keyed by model slug. */
  readonly counts = this.countsState.asReadonly();
  /** Whether the directory's counts have been loaded. */
  readonly status = this.statusState.asReadonly();

  private inFlight: Promise<void> | null = null;
  private pollTimer: ReturnType<typeof setInterval> | null = null;
  private pollSubscribers = 0;
  /** A tab coming back into view reads the counts straight away instead of waiting out the poll. */
  private readonly onVisibilityChange = (): void => {
    if (typeof document === 'undefined' || document.visibilityState === 'visible') {
      void this.load();
    }
  };

  /** The counts of one model, or `null` while they are not known yet. */
  countsFor(modelSlug: string): ModelLiveChatCounts | null {
    return this.countsState()[modelSlug] ?? null;
  }

  /** Loads every model's counts. Never throws; concurrent calls share one request. */
  load(): Promise<void> {
    if (this.inFlight) return this.inFlight;
    if (!this.http) {
      this.statusState.set('error');
      return Promise.resolve();
    }

    // A refresh never blanks the directory: the counters keep the last known numbers while the
    // fresh ones are on their way, and only the very first load shows as loading.
    if (this.statusState() !== 'ready') this.statusState.set('loading');
    this.inFlight = (async () => {
      try {
        const rows = await firstValueFrom(
          this.http!.get<ModelLiveChatCountDto[]>(`${this.apiBase}/api/models/live-chats`).pipe(
            timeout({ first: 15_000 }),
          ),
        );
        const next: Record<string, ModelLiveChatCounts> = {};
        for (const row of Array.isArray(rows) ? rows : []) {
          if (row?.modelSlug) next[row.modelSlug] = toCounts(row);
        }
        this.countsState.set(next);
        this.statusState.set('ready');
      } catch {
        // A poll that fails keeps the last good counts on screen; only the first load errors out.
        if (this.statusState() !== 'ready') this.statusState.set('error');
      } finally {
        this.inFlight = null;
      }
    })();
    return this.inFlight;
  }

  /**
   * Keeps the counts live while a page shows them: the API is re-read every
   * {@link LIVE_CHAT_POLL_MS} (and the moment a hidden tab comes back), so a chat started or ended
   * on another device adjusts every visible counter by itself. Returns the stop function — each
   * caller stops its own subscription, and the timer only runs while someone is watching.
   */
  startPolling(): () => void {
    this.pollSubscribers += 1;
    if (this.pollSubscribers === 1 && this.http) {
      this.pollTimer = setInterval(() => {
        // A hidden tab does not poll; `visibilitychange` catches it up the moment it returns.
        if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
        void this.load();
      }, LIVE_CHAT_POLL_MS);
      if (typeof document !== 'undefined') {
        document.addEventListener('visibilitychange', this.onVisibilityChange);
      }
    }

    let stopped = false;
    return () => {
      if (stopped) return;
      stopped = true;
      this.pollSubscribers -= 1;
      if (this.pollSubscribers > 0) return;
      if (this.pollTimer !== null) {
        clearInterval(this.pollTimer);
        this.pollTimer = null;
      }
      if (typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', this.onVisibilityChange);
      }
    };
  }

  /**
   * Records that a visitor has started a Live Chat with a model, under the session's own key, and
   * takes the counts the API answers with. When the API cannot be reached the local counter still
   * moves — one more live now — and the next successful poll squares it with the server. The chat
   * itself never waits on this.
   */
  async recordStart(modelSlug: string, sessionKey: string): Promise<ModelLiveChatCounts | null> {
    if (!this.http || !modelSlug) return null;
    try {
      const result = await firstValueFrom(
        this.http
          .post<ModelLiveChatStartDto>(
            `${this.apiBase}/api/models/${encodeURIComponent(modelSlug)}/live-chats`,
            { sessionKey },
          )
          .pipe(timeout({ first: 15_000 })),
      );
      const counts = toCounts(result ?? {});
      this.countsState.update((current) => ({ ...current, [modelSlug]: counts }));
      return counts;
    } catch {
      this.adjustLocally(modelSlug, +1);
      return null;
    }
  }

  /**
   * Records that a Live Chat session has ended — her goodbye, the visitor's ✕, the two hours —
   * so every directory's Live Now counter can come down and the past-chat total go up. When the
   * API cannot be reached (or does not know the end route yet) the local counter is adjusted all
   * the same, and the server's own two-hour expiry keeps the other devices honest.
   */
  async recordEnd(modelSlug: string, sessionKey: string): Promise<ModelLiveChatCounts | null> {
    if (!this.http || !modelSlug || !sessionKey) return null;
    try {
      const result = await firstValueFrom(
        this.http
          .post<ModelLiveChatStartDto>(
            `${this.apiBase}/api/models/${encodeURIComponent(modelSlug)}/live-chats/end`,
            { sessionKey },
          )
          .pipe(timeout({ first: 15_000 })),
      );
      const counts = toCounts(result ?? {});
      this.countsState.update((current) => ({ ...current, [modelSlug]: counts }));
      return counts;
    } catch {
      this.adjustLocally(modelSlug, -1);
      return null;
    }
  }

  /** Moves one chat between live and past on this device alone, until a poll brings the truth. */
  private adjustLocally(modelSlug: string, direction: 1 | -1): void {
    this.countsState.update((current) => {
      const existing = current[modelSlug] ?? { liveNow: 0, pastChats: 0 };
      const next: ModelLiveChatCounts =
        direction > 0
          ? { liveNow: existing.liveNow + 1, pastChats: existing.pastChats }
          : {
              liveNow: Math.max(0, existing.liveNow - 1),
              pastChats: existing.liveNow > 0 ? existing.pastChats + 1 : existing.pastChats,
            };
      return { ...current, [modelSlug]: next };
    });
  }
}

/** Reads a counts row, whichever shape of the API wrote it. */
function toCounts(row: ModelLiveChatCountDto | ModelLiveChatStartDto): ModelLiveChatCounts {
  if (typeof row.liveNowCount === 'number' || typeof row.pastChatCount === 'number') {
    return { liveNow: toCount(row.liveNowCount), pastChats: toCount(row.pastChatCount) };
  }
  // The legacy single total: every chat it counted is long over, so they are all past chats.
  return { liveNow: 0, pastChats: toCount(row.liveChatCount) };
}

function toCount(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;
}
