import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { firstValueFrom, timeout } from 'rxjs';
import { environment } from '../../environments/environment';

/** One model's Live Chat count, as `GET /api/models/live-chats` returns it. */
export interface ModelLiveChatCountDto {
  modelSlug: string;
  liveChatCount: number;
}

/** The answer of `POST /api/models/{slug}/live-chats`: the count after the new chat was recorded. */
export interface ModelLiveChatStartDto {
  modelSlug: string;
  liveChatCount: number;
}

export type LiveChatCountStatus = 'idle' | 'loading' | 'ready' | 'error';

/**
 * How many Live Chats each AI model has started, shown on the model's directory card beside the
 * Live Chat button.
 *
 * - **Reads.** One request loads every model's count for the directory
 *   (`GET /api/models/live-chats`, see docs/patches/neverbeen-api-model-live-chat-count.patch).
 * - **Writes.** The chat window records one start when a visitor's two-hour session begins
 *   (`POST /api/models/{slug}/live-chats`). The chat service records each session once.
 * - **Failure.** When the API is unreachable or has not been deployed with this feature yet, the
 *   status becomes `error` and the cards hide the counter rather than show a made-up number.
 */
@Injectable({ providedIn: 'root' })
export class ModelLiveChatService {
  private readonly http = inject(HttpClient, { optional: true });
  private readonly apiBase = environment.apiBaseUrl.replace(/\/+$/, '');

  private readonly countsState = signal<Readonly<Record<string, number>>>({});
  private readonly statusState = signal<LiveChatCountStatus>('idle');

  /** Every model's count, keyed by model slug. */
  readonly counts = this.countsState.asReadonly();
  /** Whether the directory's counts have been loaded. */
  readonly status = this.statusState.asReadonly();

  private inFlight: Promise<void> | null = null;

  /** The count of one model, or `null` while it is not known yet. */
  countFor(modelSlug: string): number | null {
    return this.countsState()[modelSlug] ?? null;
  }

  /** Loads every model's Live Chat count. Never throws; concurrent calls share one request. */
  load(): Promise<void> {
    if (this.inFlight) return this.inFlight;
    if (!this.http) {
      this.statusState.set('error');
      return Promise.resolve();
    }

    this.statusState.set('loading');
    this.inFlight = (async () => {
      try {
        const rows = await firstValueFrom(
          this.http!.get<ModelLiveChatCountDto[]>(`${this.apiBase}/api/models/live-chats`).pipe(
            timeout({ first: 15_000 }),
          ),
        );
        const next: Record<string, number> = {};
        for (const row of Array.isArray(rows) ? rows : []) {
          if (row?.modelSlug) next[row.modelSlug] = toCount(row.liveChatCount);
        }
        this.countsState.set(next);
        this.statusState.set('ready');
      } catch {
        this.statusState.set('error');
      } finally {
        this.inFlight = null;
      }
    })();
    return this.inFlight;
  }

  /**
   * Records that a visitor has started a Live Chat with a model, and takes the count the API
   * answers with. Resolves to `null` when the API cannot be reached; the chat itself never waits
   * on it.
   */
  async recordStart(modelSlug: string): Promise<number | null> {
    if (!this.http || !modelSlug) return null;
    try {
      const result = await firstValueFrom(
        this.http
          .post<ModelLiveChatStartDto>(
            `${this.apiBase}/api/models/${encodeURIComponent(modelSlug)}/live-chats`,
            {},
          )
          .pipe(timeout({ first: 15_000 })),
      );
      const count = toCount(result?.liveChatCount);
      this.countsState.update((current) => ({ ...current, [modelSlug]: count }));
      return count;
    } catch {
      return null;
    }
  }
}

function toCount(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;
}
