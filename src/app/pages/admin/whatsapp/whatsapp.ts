import { Component, DestroyRef, ElementRef, computed, inject, signal, viewChild } from '@angular/core';
import { AdminAuditService } from '../../../services/admin-audit.service';

export const WHATSAPP_WEB_URL = 'https://web.whatsapp.com/';
export const WHATSAPP_WINDOW_NAME = 'neverbeen-whatsapp-web';
const RECENT_KEY = 'neverbeen_admin_whatsapp_recent';

type WaState = 'idle' | 'open' | 'closed' | 'blocked';

interface RecentChat {
  phone: string;
  atUtc: string;
}

const TEMPLATES: { label: string; text: string }[] = [
  { label: '🚧 Maintenance alert', text: 'Hi, this is the NeverBeen admin team. We are running planned maintenance today — the site may be briefly unavailable. Thanks for your patience!' },
  { label: '🛡️ Safety follow-up', text: 'Hi, this is NeverBeen Trust & Safety following up on your recent report. Could you share a few more details so we can help?' },
  { label: '🪪 Verify identity', text: 'Hi, this is NeverBeen. To keep the community safe we need to verify your identity — please complete the check in your profile.' },
  { label: '🔥 Incident update', text: 'Incident update: the issue is identified and a fix is rolling out. Next update in 30 minutes.' },
];

/**
 * Admin > WhatsApp — opens WhatsApp Web for the admin. WhatsApp does not allow
 * web.whatsapp.com to be embedded inside other websites (it sends anti-framing
 * headers), so it opens in its own window docked exactly over this wide panel.
 * The admin links it by scanning the QR code with their phone, as in any browser.
 */
@Component({
  selector: 'app-admin-whatsapp',
  templateUrl: './whatsapp.html',
  styleUrl: './whatsapp.css',
})
export class AdminWhatsApp {
  private readonly audit = inject(AdminAuditService);
  private readonly stage = viewChild<ElementRef<HTMLElement>>('stage');

  protected readonly url = WHATSAPP_WEB_URL;
  protected readonly templates = TEMPLATES;
  protected readonly state = signal<WaState>('idle');
  protected readonly phone = signal('');
  protected readonly message = signal('');
  protected readonly chatError = signal<string | null>(null);
  protected readonly recent = signal<RecentChat[]>(this.loadRecent());

  private win: Window | null = null;
  private poll: ReturnType<typeof setInterval> | undefined;

  protected readonly digits = computed(() => this.phone().replace(/\D/g, ''));
  protected readonly phoneValid = computed(() => this.digits().length >= 8 && this.digits().length <= 15);

  constructor() {
    inject(DestroyRef).onDestroy(() => clearInterval(this.poll));
  }

  /** Window features that place the WhatsApp window over the wide panel. */
  dockFeatures(): string {
    const el = this.stage()?.nativeElement;
    const r = el?.getBoundingClientRect();
    const chromeX = Math.max(0, (window.outerWidth - window.innerWidth) / 2);
    const chromeY = Math.max(0, window.outerHeight - window.innerHeight - chromeX);
    const left = Math.round(window.screenX + chromeX + (r?.left ?? 0));
    const top = Math.round(window.screenY + chromeY + Math.max(0, r?.top ?? 0));
    const width = Math.round(Math.max(760, r?.width ?? 1000));
    const height = Math.round(Math.max(560, Math.min(r?.height ?? 700, window.innerHeight - Math.max(0, r?.top ?? 0))));
    return `popup=yes,width=${width},height=${height},left=${left},top=${top}`;
  }

  /** Open (or focus) WhatsApp Web docked over the panel. */
  open(target = WHATSAPP_WEB_URL): void {
    if (this.win && !this.win.closed && target === WHATSAPP_WEB_URL) {
      this.win.focus();
      return;
    }
    const w = window.open(target, WHATSAPP_WINDOW_NAME, this.dockFeatures());
    if (!w) {
      this.state.set('blocked');
      return;
    }
    this.win = w;
    try {
      w.opener = null;
    } catch {
      /* cross-origin — ignore */
    }
    w.focus();
    this.state.set('open');
    this.watch();
    this.audit.log({ category: 'operations', action: 'Opened WhatsApp Web', targetLabel: target === WHATSAPP_WEB_URL ? 'WhatsApp Web' : 'WhatsApp chat' });
  }

  /** Close and re-open the window so it fits the panel again (the WhatsApp session is kept). */
  redock(): void {
    this.win?.close();
    this.win = null;
    this.open();
  }

  focusWindow(): void {
    if (this.win && !this.win.closed) this.win.focus();
    else this.open();
  }

  closeWindow(): void {
    this.win?.close();
    this.win = null;
    clearInterval(this.poll);
    this.state.set('closed');
  }

  protected openTab(): void {
    window.open(WHATSAPP_WEB_URL, '_blank', 'noopener');
    this.audit.log({ category: 'operations', action: 'Opened WhatsApp Web in a new tab', targetLabel: 'WhatsApp Web' });
  }

  protected startChat(): void {
    this.chatError.set(null);
    if (!this.phoneValid()) {
      this.chatError.set('Enter the full number with country code, e.g. +91 98765 43210.');
      return;
    }
    const q = new URLSearchParams({ phone: this.digits() });
    if (this.message().trim()) q.set('text', this.message().trim());
    this.win?.close();
    this.win = null;
    this.open(`https://web.whatsapp.com/send?${q.toString()}`);
    const phone = '+' + this.digits();
    const next = [{ phone, atUtc: new Date().toISOString() }, ...this.recent().filter((r) => r.phone !== phone)].slice(0, 6);
    this.recent.set(next);
    try {
      localStorage.setItem(RECENT_KEY, JSON.stringify(next));
    } catch {
      /* ignore */
    }
  }

  protected useRecent(r: RecentChat): void {
    this.phone.set(r.phone);
  }

  protected clearRecent(): void {
    this.recent.set([]);
    try {
      localStorage.removeItem(RECENT_KEY);
    } catch {
      /* ignore */
    }
  }

  protected ago(iso: string): string {
    const m = Math.round((Date.now() - Date.parse(iso)) / 60_000);
    if (m < 1) return 'just now';
    if (m < 60) return `${m} min ago`;
    const h = Math.round(m / 60);
    return h < 24 ? `${h} h ago` : `${Math.round(h / 24)} d ago`;
  }

  private watch(): void {
    clearInterval(this.poll);
    this.poll = setInterval(() => {
      if (!this.win || this.win.closed) {
        clearInterval(this.poll);
        this.win = null;
        this.state.set('closed');
      }
    }, 1000);
  }

  private loadRecent(): RecentChat[] {
    try {
      const raw = localStorage.getItem(RECENT_KEY);
      const list = raw ? JSON.parse(raw) : [];
      return Array.isArray(list) ? list : [];
    } catch {
      return [];
    }
  }
}
