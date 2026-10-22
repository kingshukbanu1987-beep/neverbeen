import { Injectable, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs/operators';

/** Where the visitor was standing in the AI Models directory when she opened a model profile. */
export interface AiModelsDirectoryMemory {
  /** How far the directory was scrolled, in CSS pixels. */
  scrollY: number;
  /** The search query the directory was filtered by. */
  search: string;
  /** The running order the cards were sorted by. */
  sort: string;
  /** The availability chip the directory was filtered by. */
  availability: string;
}

/** The tab's saved return position — one directory, one slot. */
export const AI_MODELS_DIRECTORY_MEMORY_KEY = 'neverbeen_ai_models_directory_position';

/** The directory itself; everything below it is one of its model pages. */
const DIRECTORY_PATH = '/ai-models';

/**
 * Remembers exactly where a visitor was standing in the AI Models directory when she opened one of
 * its cards, so that coming back — with the browser's Back button or with a profile page's own
 * "All AI models" link — lands her on that same card instead of at the top of the page. The search,
 * sort and availability filter she had chosen travel with the position, because they decide where
 * the cards sit in the first place.
 *
 * The memory lives in `sessionStorage`, so it belongs to this tab only, and it is dropped as soon
 * as the visitor lands anywhere outside the directory and its model pages: a fresh visit from the
 * site's navigation starts at the top, exactly as before.
 */
@Injectable({ providedIn: 'root' })
export class AiModelsDirectoryMemoryService {
  private readonly router = inject(Router);

  constructor() {
    // A detour through a model profile is what the memory is for. Landing anywhere else in the
    // site (the home page, the collection, the community…) makes it stale, so drop it there.
    this.router.events
      .pipe(
        filter((event): event is NavigationEnd => event instanceof NavigationEnd),
        takeUntilDestroyed(),
      )
      .subscribe((event) => {
        if (!this.staysInsideDirectory(event.urlAfterRedirects)) this.clear();
      });
  }

  /** Saves the directory as it stands, for the round trip to a model profile. */
  remember(memory: AiModelsDirectoryMemory): void {
    const storage = this.storage();
    if (!storage) return;
    try {
      storage.setItem(AI_MODELS_DIRECTORY_MEMORY_KEY, JSON.stringify(memory));
    } catch {
      // A full or blocked storage only means the directory opens at the top next time.
    }
  }

  /** The saved position, or `null` when there is nothing valid to go back to. */
  recall(): AiModelsDirectoryMemory | null {
    const storage = this.storage();
    if (!storage) return null;
    try {
      const raw = storage.getItem(AI_MODELS_DIRECTORY_MEMORY_KEY);
      if (!raw) return null;
      const parsed: unknown = JSON.parse(raw);
      if (this.isMemory(parsed)) return parsed;
      this.clear();
      return null;
    } catch {
      this.clear();
      return null;
    }
  }

  /** Drops the saved position — e.g. once the visitor leaves the directory's own pages. */
  clear(): void {
    try {
      this.storage()?.removeItem(AI_MODELS_DIRECTORY_MEMORY_KEY);
    } catch {
      // Nothing to do: an unreadable storage cannot hold a stale position either.
    }
  }

  /** True for `/ai-models` and every model page below it — the only pages that keep the memory. */
  private staysInsideDirectory(url: string): boolean {
    const path = (url.split(/[?#]/, 1)[0] || '/').replace(/\/+$/, '') || '/';
    return path === DIRECTORY_PATH || path.startsWith(`${DIRECTORY_PATH}/`);
  }

  private isMemory(value: unknown): value is AiModelsDirectoryMemory {
    if (!value || typeof value !== 'object') return false;
    const memory = value as Partial<Record<keyof AiModelsDirectoryMemory, unknown>>;
    return (
      typeof memory.scrollY === 'number' &&
      Number.isFinite(memory.scrollY) &&
      memory.scrollY >= 0 &&
      typeof memory.search === 'string' &&
      typeof memory.sort === 'string' &&
      typeof memory.availability === 'string'
    );
  }

  private storage(): Storage | null {
    try {
      return typeof sessionStorage === 'undefined' ? null : sessionStorage;
    } catch {
      return null;
    }
  }
}
