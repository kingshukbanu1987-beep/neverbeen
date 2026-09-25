import { DestroyRef, Injectable, computed, inject, signal } from '@angular/core';

/* ============================================================================
 * Announcements — notices published by NeverBeen admins to every user or to a
 * targeted audience (geography / country / city / gender / age / verified, or a
 * particular user / group of users). Stored client-side like the rest of the
 * Admin Console. Live announcements with the "In-app banner" channel are shown
 * to matching visitors by the site announcement bar.
 * ========================================================================== */

export const ANNOUNCEMENTS_KEY = 'neverbeen_announcements';
export const ANNOUNCEMENTS_DISMISSED_KEY = 'neverbeen_announcements_dismissed';

export type AnnCategory = 'general' | 'feature' | 'safety' | 'maintenance' | 'event' | 'policy' | 'community';
export type AnnPriority = 'normal' | 'high' | 'critical';
export type AnnChannel = 'banner' | 'inbox' | 'push' | 'email';
export type AnnState = 'draft' | 'published' | 'cancelled';
export type AnnStatus = 'live' | 'scheduled' | 'draft' | 'expired' | 'cancelled';
export type AudienceMode = 'all' | 'filtered' | 'users';

export interface AnnAudience {
  mode: AudienceMode;
  /** Geography — world regions (see REGIONS). */
  regions: string[];
  countries: string[];
  cities: string[];
  genders: string[];
  ageMin: number | null;
  ageMax: number | null;
  verifiedOnly: boolean;
  /** Particular user(s) / group of users (mode "users"). */
  userIds: number[];
  /** Names of the user groups that were added (display only — members are expanded into userIds). */
  groupNames: string[];
}

export interface AnnHistory {
  atUtc: string;
  by: string;
  action: string;
}

export interface Announcement {
  id: string;
  title: string;
  body: string;
  category: AnnCategory;
  priority: AnnPriority;
  channels: AnnChannel[];
  audience: AnnAudience;
  state: AnnState;
  /** Admin id of the author ("me" = the signed-in admin). */
  createdBy: string;
  createdAtUtc: string;
  updatedAtUtc: string;
  sendAtUtc: string;
  expiresAtUtc: string | null;
  ctaLabel?: string;
  ctaUrl?: string;
  pinned: boolean;
  /** Recipients frozen at publish time (seed data is counted live). */
  recipients?: number;
  /** Final delivery / open / click rates used to simulate engagement over time. */
  rates: { delivered: number; open: number; click: number };
  cancelledAtUtc?: string;
  endedEarly?: boolean;
  history: AnnHistory[];
}

/** Minimal member profile used to decide whether an announcement reaches someone. */
export interface AudienceProfile {
  id: number;
  country: string;
  city: string;
  gender: string;
  age: number | null;
  isVerified: boolean;
}

export const ANN_CATEGORY_META: Record<AnnCategory, { label: string; icon: string; tone: string }> = {
  general: { label: 'General', icon: '📢', tone: 'info' },
  feature: { label: 'New feature', icon: '✨', tone: 'violet' },
  safety: { label: 'Safety', icon: '🛡️', tone: 'danger' },
  maintenance: { label: 'Maintenance', icon: '🛠️', tone: 'warn' },
  event: { label: 'Event', icon: '🎉', tone: 'ok' },
  policy: { label: 'Policy', icon: '📜', tone: '' },
  community: { label: 'Community', icon: '🤝', tone: 'info' },
};

export const ANN_PRIORITY_META: Record<AnnPriority, { label: string; tone: string }> = {
  normal: { label: 'Normal', tone: '' },
  high: { label: 'High', tone: 'warn' },
  critical: { label: 'Critical', tone: 'danger' },
};

export const ANN_CHANNEL_META: Record<AnnChannel, { label: string; icon: string; hint: string }> = {
  banner: { label: 'In-app banner', icon: '🪧', hint: 'Slim banner at the top of the website' },
  inbox: { label: 'Notifications', icon: '🔔', hint: 'Bell / notification centre' },
  push: { label: 'Push', icon: '📱', hint: 'Mobile & browser push notification' },
  email: { label: 'Email', icon: '✉️', hint: 'Sent to the member’s verified email' },
};

export const ANN_STATUS_META: Record<AnnStatus, { label: string; tone: string; icon: string }> = {
  live: { label: 'Live', tone: 'ok', icon: '●' },
  scheduled: { label: 'Scheduled', tone: 'violet', icon: '⏱' },
  draft: { label: 'Draft', tone: '', icon: '✎' },
  expired: { label: 'Ended', tone: 'info', icon: '✓' },
  cancelled: { label: 'Cancelled', tone: 'danger', icon: '⊘' },
};

/** Geography: world regions and their countries. */
export const REGIONS: { name: string; icon: string; countries: string[] }[] = [
  { name: 'South Asia', icon: '🕌', countries: ['India', 'Pakistan', 'Bangladesh', 'Sri Lanka', 'Nepal', 'Bhutan', 'Maldives', 'Afghanistan'] },
  { name: 'East Asia', icon: '⛩️', countries: ['Japan', 'China', 'South Korea', 'Taiwan', 'Hong Kong', 'Mongolia'] },
  { name: 'Southeast Asia', icon: '🌴', countries: ['Singapore', 'Malaysia', 'Thailand', 'Indonesia', 'Vietnam', 'Philippines', 'Cambodia', 'Myanmar', 'Laos'] },
  { name: 'Middle East', icon: '🏜️', countries: ['United Arab Emirates', 'Saudi Arabia', 'Qatar', 'Oman', 'Kuwait', 'Bahrain', 'Israel', 'Jordan', 'Turkey', 'Iran'] },
  {
    name: 'Europe',
    icon: '🏰',
    countries: ['France', 'Italy', 'Ireland', 'Germany', 'Portugal', 'Switzerland', 'United Kingdom', 'Spain', 'Netherlands', 'Belgium', 'Austria', 'Sweden', 'Norway', 'Denmark', 'Finland', 'Poland', 'Greece', 'Czech Republic'],
  },
  { name: 'North America', icon: '🗽', countries: ['United States', 'Canada', 'Mexico'] },
  { name: 'South America', icon: '🌎', countries: ['Brazil', 'Argentina', 'Chile', 'Peru', 'Colombia'] },
  { name: 'Africa', icon: '🦁', countries: ['South Africa', 'Kenya', 'Nigeria', 'Egypt', 'Morocco', 'Ghana', 'Tanzania'] },
  { name: 'Oceania', icon: '🦘', countries: ['Australia', 'New Zealand', 'Fiji'] },
];

export function regionOf(country: string): string {
  const c = (country || '').trim().toLowerCase();
  return REGIONS.find((r) => r.countries.some((x) => x.toLowerCase() === c))?.name ?? 'Other';
}

export function emptyAudience(mode: AudienceMode = 'all'): AnnAudience {
  return { mode, regions: [], countries: [], cities: [], genders: [], ageMin: null, ageMax: null, verifiedOnly: false, userIds: [], groupNames: [] };
}

/** Does this announcement audience include the given member? */
export function matchesAudience(a: AnnAudience, p: AudienceProfile): boolean {
  if (a.mode === 'all') return true;
  if (a.mode === 'users') return a.userIds.includes(p.id);
  const eq = (list: string[], v: string) => list.some((x) => x.toLowerCase() === (v || '').trim().toLowerCase());
  if (a.regions.length && !a.regions.includes(regionOf(p.country))) return false;
  if (a.countries.length && !eq(a.countries, p.country)) return false;
  if (a.cities.length && !eq(a.cities, p.city)) return false;
  if (a.genders.length && !eq(a.genders, p.gender)) return false;
  if (a.ageMin !== null || a.ageMax !== null) {
    if (p.age === null) return false;
    if (a.ageMin !== null && p.age < a.ageMin) return false;
    if (a.ageMax !== null && p.age > a.ageMax) return false;
  }
  if (a.verifiedOnly && !p.isVerified) return false;
  return true;
}

/** Human summary of an audience, e.g. "Europe · Female · Age 25–40 · Verified only". */
export function describeAudience(a: AnnAudience): string {
  if (a.mode === 'all') return 'All users';
  if (a.mode === 'users') {
    const n = a.userIds.length;
    const who = `${n} selected user${n === 1 ? '' : 's'}`;
    return a.groupNames.length ? `${who} · ${a.groupNames.join(', ')}` : who;
  }
  const parts: string[] = [];
  if (a.regions.length) parts.push(a.regions.join(', '));
  if (a.countries.length) parts.push(a.countries.length > 3 ? `${a.countries.length} countries` : a.countries.join(', '));
  if (a.cities.length) parts.push(a.cities.length > 3 ? `${a.cities.length} cities` : a.cities.join(', '));
  if (a.genders.length) parts.push(a.genders.join(' & '));
  if (a.ageMin !== null && a.ageMax !== null) parts.push(`Age ${a.ageMin}–${a.ageMax}`);
  else if (a.ageMin !== null) parts.push(`Age ${a.ageMin}+`);
  else if (a.ageMax !== null) parts.push(`Age ≤ ${a.ageMax}`);
  if (a.verifiedOnly) parts.push('Verified only');
  return parts.length ? parts.join(' · ') : 'All users (no filters)';
}

export function statusOf(a: Announcement, now = Date.now()): AnnStatus {
  if (a.state === 'draft') return 'draft';
  if (a.state === 'cancelled') return a.endedEarly ? 'expired' : 'cancelled';
  if (Date.parse(a.sendAtUtc) > now) return 'scheduled';
  if (a.expiresAtUtc && Date.parse(a.expiresAtUtc) <= now) return 'expired';
  return 'live';
}

export interface AnnStats {
  recipients: number;
  delivered: number;
  opened: number;
  clicked: number;
  openRate: number;
  clickRate: number;
}

/** Engagement grows after sending (fast delivery, opens ramp up over the first hours). */
export function statsOf(a: Announcement, recipients: number, now = Date.now()): AnnStats {
  const st = statusOf(a, now);
  const sent = st === 'live' || st === 'expired' || (a.state === 'cancelled' && !!a.endedEarly);
  if (!sent) return { recipients, delivered: 0, opened: 0, clicked: 0, openRate: 0, clickRate: 0 };
  const end = Math.min(now, a.cancelledAtUtc ? Date.parse(a.cancelledAtUtc) : now, a.expiresAtUtc ? Date.parse(a.expiresAtUtc) : now);
  const hours = Math.max(0, (end - Date.parse(a.sendAtUtc)) / 3_600_000);
  const deliverRamp = 1 - Math.exp(-hours * 8);
  const openRamp = 1 - Math.exp(-hours / 5);
  const delivered = Math.round(recipients * a.rates.delivered * deliverRamp);
  const opened = Math.round(delivered * a.rates.open * openRamp);
  const clicked = a.ctaUrl ? Math.round(opened * a.rates.click * openRamp) : 0;
  return {
    recipients,
    delivered,
    opened,
    clicked,
    openRate: delivered ? Math.round((opened / delivered) * 1000) / 10 : 0,
    clickRate: opened ? Math.round((clicked / opened) * 1000) / 10 : 0,
  };
}

const H = 3_600_000;
const D = 24 * H;

function seed(now: number): Announcement[] {
  const iso = (ms: number) => new Date(ms).toISOString();
  const mk = (
    id: string,
    by: string,
    title: string,
    body: string,
    category: AnnCategory,
    priority: AnnPriority,
    channels: AnnChannel[],
    audience: Partial<AnnAudience>,
    sendOffset: number,
    lifetime: number | null,
    extra: Partial<Announcement> = {},
  ): Announcement => {
    const sendAt = now + sendOffset;
    const created = sendAt - (2 + (id.charCodeAt(id.length - 1) % 20)) * H;
    const state: AnnState = extra.state ?? 'published';
    const history: AnnHistory[] = [{ atUtc: iso(created), by, action: 'Created draft' }];
    if (state === 'published') history.push({ atUtc: iso(Math.min(sendAt, now) - 5 * 60_000), by, action: sendOffset > 0 ? 'Scheduled' : 'Published' });
    if (state === 'cancelled' && extra.cancelledAtUtc) history.push({ atUtc: extra.cancelledAtUtc, by, action: extra.endedEarly ? 'Ended early' : 'Cancelled before sending' });
    return {
      id,
      title,
      body,
      category,
      priority,
      channels,
      audience: { ...emptyAudience(), ...audience },
      state,
      createdBy: by,
      createdAtUtc: iso(created),
      updatedAtUtc: iso(Math.min(now, sendAt)),
      sendAtUtc: iso(sendAt),
      expiresAtUtc: lifetime === null ? null : iso(sendAt + lifetime),
      pinned: false,
      rates: { delivered: 0.985, open: 0.52, click: 0.18 },
      history,
      ...extra,
    };
  };

  return [
    mk('an-1008', 'priya', 'Beware of fake “NeverBeen Support” accounts', 'Our team will **never** ask for your password, OTP or payment details by message. Report any profile claiming to be NeverBeen Support using the ⋯ menu → Report.', 'safety', 'critical', ['inbox', 'push', 'email'], { mode: 'all' }, -20 * H, 10 * D, {
      pinned: true,
      ctaLabel: 'How to spot scams',
      ctaUrl: '/help',
      rates: { delivered: 0.992, open: 0.71, click: 0.24 },
    }),
    mk('an-1010', 'meera', 'Women Travellers Circle — monthly online meetup', 'Join fellow women travellers every first Sunday for trip swaps, safety tips and itinerary reviews. This month: solo travel in Japan with Kenji’s guest speakers.', 'event', 'normal', ['inbox', 'push'], { mode: 'filtered', genders: ['Female'], ageMin: 25, ageMax: 40 }, -6 * H, 12 * D, {
      ctaLabel: 'Reserve a seat',
      ctaUrl: '/community',
      rates: { delivered: 0.984, open: 0.63, click: 0.31 },
    }),
    mk('an-1001', 'priya', 'Stay safe when meeting fellow travellers', 'Meet in public places, share your plans with a friend and use in-app messages until you feel comfortable. Our new Safety Centre has checklists for first meetups.', 'safety', 'high', ['inbox', 'push', 'email'], { mode: 'all' }, -2 * D, 14 * D, {
      ctaLabel: 'Open Safety Centre',
      ctaUrl: '/help',
      rates: { delivered: 0.989, open: 0.58, click: 0.21 },
    }),
    mk('an-1003', 'ananya', 'Travel Feeds are now live for Pakistan & Bangladesh', 'Discover trending journeys from Lahore, Hunza, Dhaka and Cox’s Bazar in your Travel Feeds — share your own stories to get featured.', 'community', 'normal', ['banner', 'inbox'], { mode: 'filtered', countries: ['Pakistan', 'Bangladesh'] }, -5 * D, 14 * D, {
      ctaLabel: 'Explore feeds',
      ctaUrl: '/travel-feeds',
      rates: { delivered: 0.978, open: 0.66, click: 0.34 },
    }),
    mk('an-1005', 'sofia', 'Europe travellers meetup — Lisbon, 18 October', 'Members in Europe: join us in Lisbon for a sunset walking tour and dinner in Alfama. Limited to 40 places — verified members get priority.', 'event', 'normal', ['banner', 'inbox', 'email'], { mode: 'filtered', regions: ['Europe'] }, -3 * D, 21 * D, {
      ctaLabel: 'RSVP',
      ctaUrl: '/community',
      rates: { delivered: 0.995, open: 0.81, click: 0.46 },
    }),
    mk('an-1012', 'ananya', 'Thank you, top storytellers! 🏆', 'Your journeys inspired thousands of members this month. As a thank-you you’ll get early access to Collections and a “Top Storyteller” badge on your profile.', 'community', 'normal', ['inbox', 'email'], { mode: 'users', userIds: [101, 102, 103, 104, 105, 106, 107, 108], groupNames: ['Top contributors'] }, -8 * D, 30 * D, {
      rates: { delivered: 1, open: 0.88, click: 0.5 },
    }),
    mk('an-1009', 'daniel', 'Protect your account with 2-step verification', 'Add a second step when signing in from a new device. It takes 30 seconds and blocks 99% of account-takeover attempts.', 'feature', 'high', ['inbox', 'email'], { mode: 'filtered', verifiedOnly: true }, 26 * H, 14 * D, {
      ctaLabel: 'Turn on 2-step verification',
      ctaUrl: '/profile',
    }),
    mk('an-1002', 'arjun', 'Planned maintenance — Saturday 02:00–03:00 IST', 'NeverBeen will be read-only for up to an hour while we upgrade our database. Posts and messages you draft will be saved and sent automatically afterwards.', 'maintenance', 'high', ['inbox', 'email'], { mode: 'all' }, 2 * D + 5 * H, 2 * D),
    mk('an-1015', 'sofia', 'Monsoon travel tips for South Asia', 'Heading out this season? Pack light rain gear, check road closures on our destination pages and keep an offline copy of your itinerary.', 'general', 'normal', ['inbox', 'push'], { mode: 'filtered', regions: ['South Asia'], ageMin: 30 }, -26 * H, 7 * D, {
      ctaLabel: 'Read the guide',
      ctaUrl: '/travel-feeds',
      rates: { delivered: 0.981, open: 0.49, click: 0.16 },
    }),
    mk('an-1004', 'kenji', 'Dark mode is here for your profile', 'Easier on the eyes at night — switch between light, dark and automatic themes from Profile → Settings → Appearance.', 'feature', 'normal', ['inbox', 'push'], { mode: 'all' }, -12 * D, 10 * D, {
      rates: { delivered: 0.987, open: 0.55, click: 0.12 },
    }),
    mk('an-1006', 'farhan', 'Complete your profile to get 3× more companion matches', 'Members with a photo, bio and 3+ interests receive three times more companion requests. It only takes two minutes.', 'community', 'normal', ['inbox', 'push'], { mode: 'filtered', ageMax: 29 }, -20 * D, 7 * D, {
      ctaLabel: 'Complete profile',
      ctaUrl: '/profile',
      rates: { delivered: 0.983, open: 0.47, click: 0.28 },
    }),
    mk('an-1007', 'rahul', 'We’ve updated our Privacy Policy', 'We clarified how location data is used for companion suggestions and added new controls to download or delete your data. Nothing changes about how we share data — we don’t sell it.', 'policy', 'high', ['inbox', 'email'], { mode: 'all' }, -30 * D, 14 * D, {
      ctaLabel: 'Read the policy',
      ctaUrl: '/privacy',
      rates: { delivered: 0.991, open: 0.39, click: 0.09 },
    }),
    mk('an-1013', 'kenji', 'Beta: AI trip planner for Bengaluru & Mumbai', 'Be among the first to try our AI-assisted itinerary builder. Tell it your dates and interests — it drafts a day-by-day plan you can share with companions.', 'feature', 'normal', ['inbox', 'push'], { mode: 'filtered', countries: ['India'], cities: ['Bengaluru', 'Mumbai'] }, 3 * D, 14 * D, {
      state: 'cancelled',
      cancelledAtUtc: new Date(now - 10 * H).toISOString(),
    }),
    mk('an-1014', 'arjun', 'Photo uploads are fully restored', 'Yesterday’s upload delays have been fixed. If a post failed to publish, you can retry it from Profile → Drafts. Sorry for the inconvenience!', 'maintenance', 'normal', ['inbox'], { mode: 'all' }, -45 * D, 5 * D, {
      rates: { delivered: 0.99, open: 0.44, click: 0 },
    }),
    mk('an-1016', 'priya', 'Weekend flash giveaway — misfired audience', 'This giveaway notice was sent to the wrong segment and was ended early by Trust & Safety.', 'event', 'normal', ['inbox', 'push'], { mode: 'filtered', countries: ['India'], genders: ['Male'] }, -16 * D, 3 * D, {
      state: 'cancelled',
      endedEarly: true,
      cancelledAtUtc: new Date(now - 16 * D + 40 * 60_000).toISOString(),
      rates: { delivered: 0.97, open: 0.3, click: 0.05 },
    }),
    mk('an-1011', 'zoya', 'Holiday season: refund & payout timelines', 'Refunds requested between 20 Dec and 2 Jan may take up to 10 business days because of bank holidays. Payouts to hosts are not affected.', 'general', 'normal', ['inbox', 'email'], { mode: 'filtered', countries: ['India'] }, 30 * D, 20 * D, {
      state: 'draft',
    }),
  ];
}

interface Stored {
  items: Announcement[];
}

/** Announcement store (Admin Console → Announcement, and the site announcement bar). */
@Injectable({ providedIn: 'root' })
export class AnnouncementsService {
  /** Current time, refreshed every 30 s so scheduled items go live and stats update. */
  readonly now = signal(Date.now());
  readonly items = signal<Announcement[]>(this.load());
  readonly dismissed = signal<string[]>(this.loadDismissed());

  constructor() {
    if (typeof window === 'undefined') return;
    const id = window.setInterval(() => this.now.set(Date.now()), 30_000);
    inject(DestroyRef).onDestroy(() => window.clearInterval(id));
  }

  readonly scheduledCount = computed(() => {
    const now = this.now();
    return this.items().filter((a) => statusOf(a, now) === 'scheduled').length;
  });

  readonly liveCount = computed(() => {
    const now = this.now();
    return this.items().filter((a) => statusOf(a, now) === 'live').length;
  });

  byId(id: string | null | undefined): Announcement | undefined {
    return id ? this.items().find((a) => a.id === id) : undefined;
  }

  status(a: Announcement): AnnStatus {
    return statusOf(a, this.now());
  }

  /** Create a draft or publish (now / scheduled). */
  create(input: Omit<Announcement, 'id' | 'createdAtUtc' | 'updatedAtUtc' | 'history' | 'rates' | 'pinned' | 'createdBy'> & { pinned?: boolean; createdBy?: string }): Announcement {
    const now = new Date().toISOString();
    const by = input.createdBy ?? 'me';
    const r = (Date.now() % 997) / 997;
    const a: Announcement = {
      ...input,
      id: 'an-' + Date.now().toString(36) + Math.floor(Math.random() * 1e4).toString(36),
      createdBy: by,
      pinned: input.pinned ?? false,
      createdAtUtc: now,
      updatedAtUtc: now,
      rates: { delivered: 0.98 + r * 0.015, open: 0.45 + r * 0.25, click: 0.12 + r * 0.2 },
      history: [{ atUtc: now, by, action: input.state === 'draft' ? 'Saved as draft' : Date.parse(input.sendAtUtc) > Date.now() + 60_000 ? 'Scheduled' : 'Published' }],
    };
    this.items.update((l) => [a, ...l]);
    this.persist();
    return a;
  }

  /** Update an existing draft / scheduled announcement. */
  update(id: string, patch: Partial<Announcement>, action = 'Edited'): Announcement | undefined {
    let out: Announcement | undefined;
    const now = new Date().toISOString();
    this.items.update((l) =>
      l.map((a) => {
        if (a.id !== id) return a;
        out = { ...a, ...patch, id: a.id, updatedAtUtc: now, history: [...a.history, { atUtc: now, by: 'me', action }] };
        return out;
      }),
    );
    this.persist();
    return out;
  }

  publishNow(id: string, recipients: number): void {
    this.update(id, { state: 'published', sendAtUtc: new Date().toISOString(), recipients }, 'Published now');
  }

  cancel(id: string): void {
    this.update(id, { state: 'cancelled', cancelledAtUtc: new Date().toISOString(), endedEarly: false }, 'Cancelled before sending');
  }

  /** End a live announcement early (stops the banner & further notifications). */
  endNow(id: string): void {
    this.update(id, { state: 'cancelled', cancelledAtUtc: new Date().toISOString(), endedEarly: true }, 'Ended early');
  }

  togglePin(id: string): void {
    const a = this.byId(id);
    if (a) this.update(id, { pinned: !a.pinned }, a.pinned ? 'Unpinned' : 'Pinned');
  }

  remove(ids: string[]): Announcement[] {
    const set = new Set(ids);
    const removed = this.items().filter((a) => set.has(a.id));
    this.items.update((l) => l.filter((a) => !set.has(a.id)));
    this.persist();
    return removed;
  }

  restore(list: Announcement[]): void {
    const ids = new Set(this.items().map((a) => a.id));
    this.items.update((l) => [...list.filter((a) => !ids.has(a.id)), ...l]);
    this.persist();
  }

  /** Live banner announcements for a visitor (null = signed-out: only "All users" announcements). */
  forViewer(profile: AudienceProfile | null): Announcement[] {
    const now = this.now();
    const dismissed = new Set(this.dismissed());
    const rank = { critical: 0, high: 1, normal: 2 } as const;
    return this.items()
      .filter((a) => a.channels.includes('banner') && statusOf(a, now) === 'live' && !dismissed.has(a.id))
      .filter((a) => (profile ? matchesAudience(a.audience, profile) : a.audience.mode === 'all'))
      .sort((a, b) => rank[a.priority] - rank[b.priority] || Date.parse(b.sendAtUtc) - Date.parse(a.sendAtUtc));
  }

  dismiss(id: string): void {
    this.dismissed.update((l) => (l.includes(id) ? l : [...l, id]));
    try {
      localStorage.setItem(ANNOUNCEMENTS_DISMISSED_KEY, JSON.stringify(this.dismissed()));
    } catch {
      /* storage unavailable */
    }
  }

  private load(): Announcement[] {
    try {
      const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(ANNOUNCEMENTS_KEY) : null;
      if (raw) {
        const parsed = JSON.parse(raw) as Stored;
        if (Array.isArray(parsed?.items)) return parsed.items;
      }
    } catch {
      /* fall back to seed */
    }
    return seed(Date.now());
  }

  private loadDismissed(): string[] {
    try {
      const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(ANNOUNCEMENTS_DISMISSED_KEY) : null;
      const list = raw ? JSON.parse(raw) : [];
      return Array.isArray(list) ? list : [];
    } catch {
      return [];
    }
  }

  private persist(): void {
    try {
      localStorage.setItem(ANNOUNCEMENTS_KEY, JSON.stringify({ items: this.items() } satisfies Stored));
    } catch {
      /* storage full / unavailable — kept in memory */
    }
  }
}
