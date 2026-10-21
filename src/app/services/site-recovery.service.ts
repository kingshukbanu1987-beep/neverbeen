import { DOCUMENT } from '@angular/common';
import { DestroyRef, Injectable, inject } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs/operators';

/**
 * Keeps the website usable when a visitor comes back to a tab that has been open for a while.
 *
 * NeverBeen is a single-page application: the document that is running was downloaded when the
 * tab was opened, and a browser is free to keep it (or to freeze it, or to restore it from the
 * back-forward cache) for hours. Two things can go wrong with that old copy, and both look like
 * "the page is broken until I refresh":
 *
 *  1. A click on a lazy route (AI Models, Collection, Community …) does nothing, because the
 *     JavaScript chunk that route needs was replaced by a newer deployment and the request for
 *     it fails. The router rejects the navigation and the old page simply stays on screen.
 *  2. The page comes back with only the site header and the footer: the router never managed to
 *     build the page inside `<main>` (a failed/hung chunk, or a restore that resumed a dead
 *     application), so everything the visitor came back for is missing.
 *
 * In both cases the only thing that reliably repairs the tab is a fresh document, so this service
 * asks the browser for one — but only once per URL per tab session (the guard lives in
 * `sessionStorage`) so a visitor can never be bounced through a reload loop, and the guard is
 * cleared again as soon as that URL renders normally.
 */

/** sessionStorage prefix for the "already retried this URL in this tab" guard. */
export const RECOVERY_GUARD_PREFIX = 'neverbeen_page_recovery:';
/** How long a freshly loaded page may take to build its first page before we step in. */
export const FIRST_RENDER_GRACE_MS = 5_000;
/** Extra wait for a slow connection before the page is repaired on the first load. */
export const EMPTY_RECHECK_MS = 12_000;
/** A tab hidden for longer than this counts as "coming back to the website". */
export const RESUME_AFTER_MS = 60_000;

type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

@Injectable({ providedIn: 'root' })
export class SiteRecoveryService {
  private readonly document = inject(DOCUMENT);
  private readonly browser = inject(DOCUMENT).defaultView;
  private readonly router = inject(Router);

  private readonly timers = new Set<ReturnType<typeof setTimeout>>();
  /** Guards for this tab even when `sessionStorage` is unavailable (private mode). */
  private readonly attempted = new Set<string>();
  private started = false;
  private stopped = false;
  private hiddenAt = 0;
  private readonly loadedAt = Date.now();

  constructor() {
    inject(DestroyRef).onDestroy(() => this.stop());
    // A route that rendered normally clears its guard, so a later failure may be retried.
    this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe((event) => this.clearGuard(event.urlAfterRedirects || event.url));
  }

  // ------------------------------------------------------------------ public API

  /**
   * A navigation failed — most often because the lazy route's chunk is gone after a deployment.
   * Fetch a fresh document for the URL the visitor asked for. Returns true when a reload was
   * started (false when this URL was already retried in this tab).
   */
  recoverFailedNavigation(url: string | null | undefined): boolean {
    return this.recover(url, 'navigation failed');
  }

  /**
   * Ask the browser for a fresh document at `url` — a reload when it is the page already open,
   * a same-tab navigation otherwise. One attempt per URL per tab session.
   */
  recover(url: string | null | undefined, reason: string): boolean {
    const win = this.browser;
    if (!win || this.stopped) return false;
    const target = this.absolute(url);
    if (!target) return false;
    const guard = RECOVERY_GUARD_PREFIX + target;
    if (this.attempted.has(target) || this.isGuarded(guard)) return false;
    this.attempted.add(target);
    this.markGuarded(guard, reason);

    const here = this.absolute(win.location?.href);
    if (here === target) win.location.reload();
    else win.location.assign(target);
    return true;
  }

  /**
   * Watch the pages of this tab. Called once by the app shell after the first render: a page that
   * comes back after a while with nothing inside `<main>` (only the header and the footer) is
   * rebuilt here instead of waiting for the visitor to refresh by hand.
   */
  startContentWatch(): void {
    if (this.started || this.stopped) return;
    const win = this.browser;
    if (!win || typeof win.addEventListener !== 'function') return;
    this.started = true;

    // The visitor returned to the tab: if the page is empty, repair it straight away. A normal
    // load is left alone until it has had its grace period, so this can never fire while the
    // first page is still being built.
    win.addEventListener('pageshow', (event: PageTransitionEvent) => {
      const restored = event?.persisted === true;
      if (restored || Date.now() - this.loadedAt >= FIRST_RENDER_GRACE_MS) {
        this.checkRoutedContent(true);
      }
    });
    // `visibilitychange` is dispatched on the document and bubbles to the window.
    const visibilityTarget: Pick<Window, 'addEventListener'> =
      typeof (this.document as Partial<Document>).addEventListener === 'function'
        ? (this.document as Document)
        : win;
    visibilityTarget.addEventListener('visibilitychange', () => {
      if (this.document.visibilityState === 'hidden') {
        this.hiddenAt = Date.now();
        return;
      }
      const hiddenFor = this.hiddenAt ? Date.now() - this.hiddenAt : 0;
      this.hiddenAt = 0;
      if (hiddenFor >= RESUME_AFTER_MS) this.checkRoutedContent(true);
    });

    // A fresh document normally builds its page in the first moments; give a slow connection a
    // second chance before deciding that it never will.
    this.schedule(() => this.checkRoutedContent(false, 0), FIRST_RENDER_GRACE_MS);
  }

  /** Stops the watchers (the service lives as long as the application). */
  stop(): void {
    this.stopped = true;
    for (const timer of this.timers) clearTimeout(timer);
    this.timers.clear();
  }

  // ------------------------------------------------------------------ internals

  /**
   * The routed page is missing when the router outlet has no component after it. Some routes
   * (the maintenance page, the stand-alone admin pages) render no `<main>` at all — they are
   * simply skipped, never repaired.
   */
  private checkRoutedContent(immediate: boolean, attempt = 0): void {
    if (this.stopped) return;
    const main = this.document.querySelector?.('main');
    if (!main) return;
    if (this.hasRoutedContent(main)) {
      this.clearGuard(this.currentUrl());
      return;
    }
    if (this.document.visibilityState === 'hidden' && !immediate) return;
    // A navigation that is still running may simply be downloading a route's chunk on a slow
    // connection, so it gets one more chance. Anything else means the page will never appear.
    if (!immediate && attempt === 0 && this.router.getCurrentNavigation()) {
      this.schedule(() => this.checkRoutedContent(false, 1), EMPTY_RECHECK_MS);
      return;
    }
    this.recover(this.currentUrl(), 'the page came back empty');
  }

  private hasRoutedContent(main: Element): boolean {
    const outlet = main.querySelector('router-outlet');
    // The activated component is inserted as the outlet's next element sibling.
    if (outlet) return !!outlet.nextElementSibling;
    return !!main.firstElementChild;
  }

  /** The URL the visitor is looking at, without the origin. */
  private currentUrl(): string {
    const location = this.browser?.location;
    const here = location ? this.absolute(location.href) : null;
    return here ?? '';
  }

  private absolute(url: string | null | undefined): string | null {
    const raw = (url ?? '').trim();
    if (!raw) return null;
    const base =
      this.document.baseURI ||
      this.browser?.location?.href ||
      (typeof location !== 'undefined' ? location.href : '');
    try {
      return new URL(raw, base || undefined).href;
    } catch {
      return null;
    }
  }

  private schedule(task: () => void, delayMs: number): void {
    const timer = setTimeout(() => {
      this.timers.delete(timer);
      task();
    }, delayMs);
    this.timers.add(timer);
  }

  private storage(): StorageLike | null {
    try {
      return this.browser?.sessionStorage ?? null;
    } catch {
      return null;
    }
  }

  private isGuarded(key: string): boolean {
    const storage = this.storage();
    if (!storage) return false;
    try {
      return !!storage.getItem(key);
    } catch {
      return false;
    }
  }

  private markGuarded(key: string, reason: string): void {
    const storage = this.storage();
    if (!storage) return;
    try {
      storage.setItem(key, reason);
    } catch {
      /* quota / blocked storage — the in-memory set still protects this tab */
    }
  }

  private clearGuard(url: string | null | undefined): void {
    const target = this.absolute(url);
    const storage = this.storage();
    if (target) this.attempted.delete(target);
    if (!target || !storage) return;
    try {
      storage.removeItem(RECOVERY_GUARD_PREFIX + target);
    } catch {
      /* ignore */
    }
  }
}
