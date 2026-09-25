import { Injectable, signal } from '@angular/core';

export const SITE_ANALYTICS_KEY = 'neverbeen_site_analytics';
const MAX_EVENTS = 2000;

export interface PageViewEvent {
  /** path without query/fragment */
  p: string;
  /** ISO timestamp */
  t: string;
  /** device class */
  d: 'desktop' | 'tablet' | 'mobile';
  /** referrer host ('' = direct / internal) */
  r: string;
}

export interface ErrorEvent {
  t: string;
  m: string;
}

interface AnalyticsState {
  views: PageViewEvent[];
  errors: ErrorEvent[];
}

/**
 * First-party, cookie-less analytics for the Health dashboard: records page
 * views (route changes) and uncaught JavaScript errors in this browser.
 * No personal data is stored — only the path, time, device class and referrer host.
 */
@Injectable({ providedIn: 'root' })
export class SiteAnalyticsService {
  readonly state = signal<AnalyticsState>(this.load());
  private started = false;
  private lastPath = '';

  /** Begin capturing uncaught errors (called once by the app root). */
  start(): void {
    if (this.started || typeof window === 'undefined') return;
    this.started = true;
    window.addEventListener('error', (e) => this.recordError(e.message || 'Script error'));
    window.addEventListener('unhandledrejection', (e) => this.recordError(`Unhandled promise rejection: ${String((e as PromiseRejectionEvent).reason).slice(0, 140)}`));
  }

  recordView(url: string): void {
    const p = (url || '/').split(/[?#]/)[0] || '/';
    if (p === this.lastPath || p.startsWith('/admin')) return;
    this.lastPath = p;
    const w = typeof window !== 'undefined' ? window.innerWidth : 1280;
    let r = '';
    try {
      const ref = typeof document !== 'undefined' ? document.referrer : '';
      if (ref) {
        const host = new URL(ref).host;
        if (host !== location.host) r = host;
      }
    } catch {
      r = '';
    }
    const ev: PageViewEvent = { p, t: new Date().toISOString(), d: w < 700 ? 'mobile' : w < 1100 ? 'tablet' : 'desktop', r };
    this.state.update((s) => ({ ...s, views: [...s.views, ev].slice(-MAX_EVENTS) }));
    this.save();
  }

  recordError(message: string): void {
    this.state.update((s) => ({ ...s, errors: [...s.errors, { t: new Date().toISOString(), m: message.slice(0, 200) }].slice(-200) }));
    this.save();
  }

  clear(): void {
    this.state.set({ views: [], errors: [] });
    this.save();
  }

  private load(): AnalyticsState {
    try {
      const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(SITE_ANALYTICS_KEY) : null;
      const p = raw ? (JSON.parse(raw) as Partial<AnalyticsState>) : {};
      return { views: Array.isArray(p.views) ? p.views : [], errors: Array.isArray(p.errors) ? p.errors : [] };
    } catch {
      return { views: [], errors: [] };
    }
  }

  private save(): void {
    try {
      localStorage.setItem(SITE_ANALYTICS_KEY, JSON.stringify(this.state()));
    } catch {
      /* ignore */
    }
  }
}
