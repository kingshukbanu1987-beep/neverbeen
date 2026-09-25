import { Injectable, computed, signal } from '@angular/core';

export const MAINTENANCE_KEY = 'neverbeen_maintenance';
/** Optional static file (public/maintenance.json) — lets a deployed build take the whole site down for every visitor. */
export const MAINTENANCE_REMOTE_URL = '/maintenance.json';

export type MaintenanceTemplate = 'critical' | 'scheduled' | 'release' | 'custom';
export type MaintenanceTheme = 'aurora' | 'midnight' | 'sunrise' | 'paper';

export interface MaintenanceUpdate {
  id: number;
  atUtc: string;
  text: string;
}

export interface MaintenancePageContent {
  template: MaintenanceTemplate;
  title: string;
  message: string;
  theme: MaintenanceTheme;
  showLogo: boolean;
  showCountdown: boolean;
  showProgress: boolean;
  showUpdates: boolean;
  updates: MaintenanceUpdate[];
  showContact: boolean;
  contactEmail: string;
  showNotify: boolean;
  signature: string;
}

export interface MaintenanceSchedule {
  /** A downtime window is armed (running now or scheduled). */
  enabled: boolean;
  startUtc: string | null;
  /** null = until an administrator ends it manually. */
  endUtc: string | null;
  reason: string;
  /** Show a warning banner to visitors this many minutes before a scheduled start (0 = off). */
  warnBeforeMinutes: number;
}

export interface MaintenanceHistoryEntry {
  id: number;
  startUtc: string;
  endUtc: string | null;
  title: string;
  reason: string;
  endedBy: 'admin' | 'schedule' | 'cancelled' | null;
}

export interface MaintenanceState {
  updatedUtc: string;
  schedule: MaintenanceSchedule;
  page: MaintenancePageContent;
  history: MaintenanceHistoryEntry[];
  subscribers: { email: string; atUtc: string }[];
}

export type MaintenanceStatus = 'live' | 'scheduled' | 'down';

export const MAINTENANCE_TEMPLATES: Record<MaintenanceTemplate, { label: string; icon: string; title: string; message: string }> = {
  critical: {
    label: 'Critical update',
    icon: '🚨',
    title: 'Critical updates are going on — we will be back shortly',
    message: 'We are rolling out an important update to keep NeverBeen fast and secure. The website is temporarily unavailable while our team completes the work. Thank you for your patience.',
  },
  scheduled: {
    label: 'Scheduled maintenance',
    icon: '🛠️',
    title: 'Scheduled maintenance in progress',
    message: 'NeverBeen is down for planned maintenance. Your photographs, profile and community posts are safe — everything will be exactly where you left it when we are back.',
  },
  release: {
    label: 'New release',
    icon: '🚀',
    title: 'Something new is arriving at NeverBeen',
    message: 'We are launching a new release with fresh features for travellers and the community. Hang tight — the doors re-open in a moment.',
  },
  custom: {
    label: 'Custom',
    icon: '✍️',
    title: 'We will be back soon',
    message: 'The website is temporarily unavailable.',
  },
};

export const MAINTENANCE_THEMES: Record<MaintenanceTheme, { label: string; swatch: string }> = {
  aurora: { label: 'Aurora', swatch: 'linear-gradient(135deg,#0f172a,#1e1b4b 45%,#064e3b)' },
  midnight: { label: 'Midnight', swatch: 'linear-gradient(135deg,#020617,#111827)' },
  sunrise: { label: 'Sunrise', swatch: 'linear-gradient(135deg,#fb923c,#f43f5e 55%,#7c3aed)' },
  paper: { label: 'Paper', swatch: 'linear-gradient(135deg,#faf6f0,#e7dccb)' },
};

export function defaultMaintenanceState(): MaintenanceState {
  const t = MAINTENANCE_TEMPLATES.critical;
  return {
    updatedUtc: new Date(0).toISOString(),
    schedule: { enabled: false, startUtc: null, endUtc: null, reason: '', warnBeforeMinutes: 60 },
    page: {
      template: 'critical',
      title: t.title,
      message: t.message,
      theme: 'aurora',
      showLogo: true,
      showCountdown: true,
      showProgress: true,
      showUpdates: true,
      updates: [],
      showContact: true,
      contactEmail: 'hello@neverbeen.studio',
      showNotify: true,
      signature: '— The NeverBeen team',
    },
    history: [],
    subscribers: [],
  };
}

/** Paths that stay reachable while the site is down, so administrators can sign in and bring it back. */
export const MAINTENANCE_BYPASS = ['/admin', '/login'];

export function isBypassPath(url: string): boolean {
  const path = (url || '/').split(/[?#]/)[0];
  return MAINTENANCE_BYPASS.some((p) => path === p || path.startsWith(p + '/'));
}

/**
 * Site downtime ("maintenance mode") for critical releases.
 *
 * The window and the page content are stored in localStorage (effective in this
 * browser immediately) and can be exported as `maintenance.json`, which — when
 * deployed next to index.html — takes the site down for every visitor. Whichever
 * of the two was updated most recently wins.
 */
@Injectable({ providedIn: 'root' })
export class MaintenanceService {
  readonly state = signal<MaintenanceState>(this.load());
  readonly remote = signal<MaintenanceState | null>(null);
  readonly remoteChecked = signal<'pending' | 'found' | 'absent'>('pending');
  readonly now = signal(Date.now());

  constructor() {
    if (typeof window === 'undefined') return;
    window.addEventListener('storage', (e) => {
      if (e.key === MAINTENANCE_KEY) this.state.set(this.load());
    });
    setInterval(() => this.now.set(Date.now()), 5000);
    void this.fetchRemote();
    setInterval(() => void this.fetchRemote(), 120_000);
  }

  /** The configuration currently in force (local or deployed, newest wins). */
  readonly effective = computed<MaintenanceState>(() => {
    const local = this.state();
    const remote = this.remote();
    if (remote && Date.parse(remote.updatedUtc) > Date.parse(local.updatedUtc)) return remote;
    return local;
  });

  readonly status = computed<MaintenanceStatus>(() => statusOf(this.effective().schedule, this.now()));
  readonly isDown = computed(() => this.status() === 'down');

  /** Upcoming downtime within its warning window (for the visitor banner). */
  readonly upcomingWarning = computed(() => {
    const s = this.effective().schedule;
    if (this.status() !== 'scheduled' || !s.startUtc || !s.warnBeforeMinutes) return null;
    const start = Date.parse(s.startUtc);
    const msLeft = start - this.now();
    if (msLeft > s.warnBeforeMinutes * 60_000) return null;
    return { startUtc: s.startUtc, endUtc: s.endUtc, minutes: Math.max(1, Math.round(msLeft / 60_000)) };
  });

  // ------------------------------------------------------------------ admin actions

  updatePage(patch: Partial<MaintenancePageContent>): void {
    this.mutate((s) => ({ ...s, page: { ...s.page, ...patch } }));
  }

  applyTemplate(template: MaintenanceTemplate): void {
    const t = MAINTENANCE_TEMPLATES[template];
    this.updatePage(template === 'custom' ? { template } : { template, title: t.title, message: t.message });
  }

  addUpdate(text: string): void {
    const clean = text.trim();
    if (!clean) return;
    this.mutate((s) => ({ ...s, page: { ...s.page, updates: [{ id: Date.now(), atUtc: new Date().toISOString(), text: clean }, ...s.page.updates].slice(0, 20) } }));
  }

  removeUpdate(id: number): void {
    this.mutate((s) => ({ ...s, page: { ...s.page, updates: s.page.updates.filter((u) => u.id !== id) } }));
  }

  /** Arms a downtime window. `startUtc` null = immediately. */
  schedule(startUtc: string | null, endUtc: string | null, reason: string, warnBeforeMinutes: number): void {
    const start = startUtc ?? new Date().toISOString();
    this.closeOpenHistory('cancelled');
    this.mutate((s) => ({
      ...s,
      schedule: { enabled: true, startUtc: start, endUtc, reason: reason.trim(), warnBeforeMinutes },
      history: [{ id: Date.now(), startUtc: start, endUtc, title: s.page.title, reason: reason.trim(), endedBy: null }, ...s.history].slice(0, 50),
    }));
  }

  /** Ends a running downtime, or cancels a scheduled one. */
  end(): void {
    const wasDown = this.status() === 'down';
    const nowIso = new Date().toISOString();
    this.mutate((s) => ({
      ...s,
      schedule: { ...s.schedule, enabled: false },
      history: s.history.map((h, i) => (i === 0 && h.endedBy === null ? { ...h, endUtc: wasDown ? nowIso : h.endUtc, endedBy: wasDown ? 'admin' : 'cancelled' } : h)),
    }));
  }

  extend(minutes: number): void {
    this.mutate((s) => {
      const base = s.schedule.endUtc ? Math.max(Date.parse(s.schedule.endUtc), Date.now()) : Date.now();
      const endUtc = new Date(base + minutes * 60_000).toISOString();
      return { ...s, schedule: { ...s.schedule, endUtc }, history: s.history.map((h, i) => (i === 0 && h.endedBy === null ? { ...h, endUtc } : h)) };
    });
  }

  subscribe(email: string): boolean {
    const e = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) return false;
    if (this.state().subscribers.some((x) => x.email === e)) return true;
    // Subscribing is a visitor action: keep the admin "updatedUtc" untouched.
    this.state.update((s) => ({ ...s, subscribers: [...s.subscribers, { email: e, atUtc: new Date().toISOString() }] }));
    this.save();
    return true;
  }

  clearSubscribers(): void {
    this.state.update((s) => ({ ...s, subscribers: [] }));
    this.save();
  }

  /** History with windows that ended on schedule marked as such. */
  readonly history = computed(() =>
    this.state().history.map((h) => (h.endedBy === null && h.endUtc && Date.parse(h.endUtc) <= this.now() ? { ...h, endedBy: 'schedule' as const } : h)),
  );

  /** Publishable file for site-wide downtime (drop into /public and deploy). */
  exportFile(): Pick<MaintenanceState, 'updatedUtc' | 'schedule' | 'page'> {
    const s = this.state();
    return { updatedUtc: new Date().toISOString(), schedule: s.schedule, page: s.page };
  }

  async fetchRemote(): Promise<void> {
    try {
      if (typeof fetch === 'undefined') return;
      const res = await fetch(`${MAINTENANCE_REMOTE_URL}?t=${Date.now()}`, { cache: 'no-store' });
      if (!res.ok || !(res.headers.get('content-type') ?? '').includes('json')) {
        this.remoteChecked.set('absent');
        return;
      }
      const data = (await res.json()) as Partial<MaintenanceState>;
      const base = defaultMaintenanceState();
      if (!data || typeof data !== 'object' || !data.schedule) {
        this.remoteChecked.set('absent');
        return;
      }
      this.remote.set({ ...base, ...data, schedule: { ...base.schedule, ...data.schedule }, page: { ...base.page, ...(data.page ?? {}) }, history: [], subscribers: [] });
      this.remoteChecked.set('found');
    } catch {
      this.remoteChecked.set('absent');
    }
  }

  // ------------------------------------------------------------------ internals

  private closeOpenHistory(by: 'cancelled'): void {
    this.state.update((s) => ({ ...s, history: s.history.map((h) => (h.endedBy === null && (!h.endUtc || Date.parse(h.endUtc) > Date.now()) ? { ...h, endedBy: by, endUtc: h.endUtc ?? new Date().toISOString() } : h)) }));
  }

  private mutate(fn: (s: MaintenanceState) => MaintenanceState): void {
    this.state.update((s) => ({ ...fn(s), updatedUtc: new Date().toISOString() }));
    this.now.set(Date.now());
    this.save();
  }

  private load(): MaintenanceState {
    const base = defaultMaintenanceState();
    try {
      const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(MAINTENANCE_KEY) : null;
      if (!raw) return base;
      const p = JSON.parse(raw) as Partial<MaintenanceState>;
      return {
        updatedUtc: p.updatedUtc ?? base.updatedUtc,
        schedule: { ...base.schedule, ...(p.schedule ?? {}) },
        page: { ...base.page, ...(p.page ?? {}) },
        history: Array.isArray(p.history) ? p.history : [],
        subscribers: Array.isArray(p.subscribers) ? p.subscribers : [],
      };
    } catch {
      return base;
    }
  }

  private save(): void {
    try {
      localStorage.setItem(MAINTENANCE_KEY, JSON.stringify(this.state()));
    } catch {
      /* ignore */
    }
  }
}

export function statusOf(s: MaintenanceSchedule, now: number): MaintenanceStatus {
  if (!s.enabled) return 'live';
  const start = s.startUtc ? Date.parse(s.startUtc) : 0;
  const end = s.endUtc ? Date.parse(s.endUtc) : Infinity;
  if (now >= end) return 'live';
  if (now < start) return 'scheduled';
  return 'down';
}
