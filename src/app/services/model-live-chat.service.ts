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
 * The Live Now and past-chat counters of every AI model, shown in the split pill beside each
 * card's Live Chat button.
 *
 * - **Reads.** One request loads every model's counts
 *   (`GET /api/models/live-chats`, see docs/patches/neverbeen-api-model-live-chat-count.patch).
 *   It is made when a page showing the pill opens — a visit, a refresh, a return to the page — and
 *   again when the visitor comes back to the tab (`watch()`). **Nothing is polled:** a page left
 *   open on screen asks the API for nothing, and keeps the numbers it loaded.
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
  /** Pages showing the counts; the visibility listener only runs while at least one watches. */
  private watchers = 0;
  /** A tab coming back into view re-reads the counts — the visitor's own return, not a poll. */
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
   * Keeps the counts current while a page shows them — **without any timer.** The counts are read
   * when the page opens ({@link load}), and this listener re-reads them the moment the visitor
   * comes back to the tab (the browser fires `visibilitychange` as the tab returns). A page left
   * open on screen asks for nothing further. Returns the stop function — each caller stops its own
   * subscription, and the listener only exists while someone is watching.
   */
  watch(): () => void {
    this.watchers += 1;
    if (this.watchers === 1 && this.http && typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', this.onVisibilityChange);
    }

    let stopped = false;
    return () => {
      if (stopped) return;
      stopped = true;
      this.watchers = Math.max(0, this.watchers - 1);
      if (this.watchers > 0) return;
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
