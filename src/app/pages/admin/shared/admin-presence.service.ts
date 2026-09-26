import { DestroyRef, Injectable, computed, inject, signal } from '@angular/core';
import { ADMINS, MY_ACCOUNT, MailAdmin } from '../mail/admin-mail.service';
import { seeded } from './admin-insights.service';

export type AdminPresenceStatus = 'online' | 'away' | 'offline';

export interface AdminPresence {
  admin: MailAdmin;
  status: AdminPresenceStatus;
  /** What the admin is doing right now (Admin Console section) — for live admins. */
  activity: string;
  /** Online since (live) or last seen (offline), ISO time. */
  sinceUtc: string;
  device: string;
  isMe: boolean;
}

const ACTIVITIES = [
  'Reviewing abuse reports',
  'In User Management',
  'Checking Website Health',
  'Reading Mail',
  'In Identity Checks',
  'Editing the Home page',
  'In Data Management',
  'Drafting an announcement',
  'On the Dashboard',
];
const DEVICES = ['💻 Chrome · macOS', '💻 Edge · Windows', '📱 Safari · iPhone', '💻 Firefox · Ubuntu', '📱 Chrome · Android'];

/** Refresh interval of the simulated live presence feed. */
export const PRESENCE_TICK_MS = 30_000;

function hash(s: string): number {
  let h = 2166136261;
  for (const ch of s) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return h >>> 0;
}

/**
 * Live presence of NeverBeen administrators (the side panel "Live admins" counter).
 * Admins marked online in the directory are live — some briefly go "away" (idle) and
 * their current Admin Console activity rotates as the feed refreshes. The signed-in
 * admin is always live on this device.
 */
@Injectable({ providedIn: 'root' })
export class AdminPresenceService {
  private readonly tick = signal(Math.floor(Date.now() / PRESENCE_TICK_MS));

  constructor() {
    if (typeof window === 'undefined') return;
    const id = window.setInterval(() => this.tick.set(Math.floor(Date.now() / PRESENCE_TICK_MS)), PRESENCE_TICK_MS);
    inject(DestroyRef).onDestroy(() => window.clearInterval(id));
  }

  readonly all = computed<AdminPresence[]>(() => {
    const t = this.tick();
    const now = t * PRESENCE_TICK_MS;
    const me: AdminPresence = {
      admin: MY_ACCOUNT,
      status: 'online',
      activity: 'You · this device',
      sinceUtc: new Date(now - 18 * 60_000).toISOString(),
      device: '💻 This browser',
      isMe: true,
    };
    const others = ADMINS.map<AdminPresence>((admin) => {
      const base = seeded(hash(admin.id));
      const minutes = 3 + Math.floor(base() * 170);
      const device = DEVICES[Math.floor(base() * DEVICES.length)];
      const r = seeded(hash(admin.id + ':' + Math.floor(t / 2)));
      if (!admin.online) {
        return { admin, status: 'offline', activity: '', sinceUtc: new Date(now - minutes * 9 * 60_000).toISOString(), device, isMe: false };
      }
      const away = r() < 0.18;
      return {
        admin,
        status: away ? 'away' : 'online',
        activity: away ? 'Idle for a few minutes' : ACTIVITIES[Math.floor(r() * ACTIVITIES.length)],
        sinceUtc: new Date(now - minutes * 60_000).toISOString(),
        device,
        isMe: false,
      };
    });
    const rank = { online: 0, away: 1, offline: 2 } as const;
    return [me, ...others.sort((a, b) => rank[a.status] - rank[b.status] || a.admin.name.localeCompare(b.admin.name))];
  });

  /** Admins signed in to the Admin Console right now (online or briefly away), including you. */
  readonly live = computed(() => this.all().filter((p) => p.status !== 'offline'));
  readonly liveCount = computed(() => this.live().length);
  readonly total = computed(() => this.all().length);
}
