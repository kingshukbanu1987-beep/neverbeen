import { Component, DestroyRef, ElementRef, computed, inject, signal, viewChild } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { SelectValueSync } from '../../../shared/select-value-sync';
import { OverlayPortal } from '../shared/overlay-portal';
import { timeAgo } from '../shared/admin-insights.service';
import { AdminMailService, LABELS, ME, MailAttachment, MailLabel, MailMessage, signatureText } from './admin-mail.service';
import { dateGroup, fileKind, formatBytes, fullDate, initials, isImage, isPdf, listTime, renderMessage } from './mail-utils';

type Filter = 'all' | 'unread' | 'starred' | 'important' | 'attachments';

interface Preview {
  items: MailAttachment[];
  index: number;
}

/**
 * Admin Mail — Inbox and Sent (same screen, `data.folder` decides which).
 * Two-pane layout: searchable, filterable message list on the left, full conversation
 * with attachments, read receipts and quick reply on the right.
 */
@Component({
  selector: 'app-admin-mail-folder',
  imports: [RouterLink, SelectValueSync, OverlayPortal],
  templateUrl: './mail-folder.html',
  styleUrls: ['../shared/admin-grid.css', './mail.css'],
  host: { '(document:keydown)': 'onKey($event)' },
})
export class AdminMailFolder {
  protected readonly mail = inject(AdminMailService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly sanitizer = inject(DomSanitizer);
  private readonly destroyRef = inject(DestroyRef);

  readonly folder: 'inbox' | 'sent' = this.route.snapshot?.data?.['folder'] === 'sent' ? 'sent' : 'inbox';
  protected readonly isInbox = this.folder === 'inbox';

  protected readonly query = signal('');
  protected readonly filter = signal<Filter>('all');
  protected readonly label = signal<MailLabel | ''>('');
  protected readonly sort = signal<'newest' | 'oldest'>('newest');
  protected readonly selected = signal<Set<string>>(new Set());
  protected readonly openId = signal<string | null>(null);
  protected readonly expanded = signal<Set<string>>(new Set());
  protected readonly showDetails = signal<Set<string>>(new Set());
  protected readonly quickReply = signal('');
  protected readonly preview = signal<Preview | null>(null);
  protected readonly notice = signal<{ text: string; undo?: () => void } | null>(null);
  protected readonly justSentId = signal<string | null>(null);

  private readonly searchBox = viewChild<ElementRef<HTMLInputElement>>('searchBox');
  private noticeTimer: ReturnType<typeof setTimeout> | null = null;
  private previewUrl: string | null = null;

  protected readonly labels = LABELS;
  protected readonly labelKeys = Object.keys(LABELS) as MailLabel[];
  protected readonly filters: { key: Filter; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'unread', label: 'Unread' },
    { key: 'starred', label: '★ Starred' },
    { key: 'important', label: '❗ Important' },
    { key: 'attachments', label: '📎 Files' },
  ];

  protected readonly source = computed(() => (this.isInbox ? this.mail.inbox() : this.mail.sent()));

  protected readonly list = computed(() => {
    const q = this.query().trim().toLowerCase();
    const f = this.filter();
    const lab = this.label();
    const out = this.source().filter((m) => {
      if (f === 'unread' && m.read) return false;
      if (f === 'starred' && !m.starred) return false;
      if (f === 'important' && !m.important) return false;
      if (f === 'attachments' && !m.attachments.length) return false;
      if (lab && !m.labels.includes(lab)) return false;
      if (!q) return true;
      const people = [m.from, ...m.to, ...m.cc].map((id) => `${this.mail.person(id).name} ${this.mail.person(id).email}`).join(' ');
      return `${people} ${m.subject} ${m.body} ${m.attachments.map((a) => a.name).join(' ')}`.toLowerCase().includes(q);
    });
    return this.sort() === 'oldest' ? [...out].reverse() : out;
  });

  protected readonly groups = computed(() => {
    const groups: { label: string; items: MailMessage[] }[] = [];
    for (const m of this.list()) {
      const g = dateGroup(m.sentAtUtc);
      const last = groups[groups.length - 1];
      if (last && last.label === g) last.items.push(m);
      else groups.push({ label: g, items: [m] });
    }
    return groups;
  });

  protected readonly unread = computed(() => this.source().filter((m) => !m.read).length);
  protected readonly open = computed(() => this.mail.byId(this.openId()));
  protected readonly thread = computed(() => {
    const o = this.open();
    return o ? this.mail.thread(o.threadId) : [];
  });
  /** Newest message of the open conversation — what Reply / Reply all answer. */
  protected readonly latest = computed(() => {
    const t = this.thread();
    return t.length ? t[t.length - 1] : this.open();
  });
  protected readonly position = computed(() => this.list().findIndex((m) => m.id === this.openId()));
  protected readonly allChecked = computed(() => this.list().length > 0 && this.list().every((m) => this.selected().has(m.id)));
  protected readonly someChecked = computed(() => this.selected().size > 0);
  protected readonly selectedMessages = computed(() => this.list().filter((m) => this.selected().has(m.id)));
  protected readonly previewItem = computed(() => {
    const p = this.preview();
    return p ? p.items[p.index] : null;
  });
  protected readonly previewText = computed(() => {
    const a = this.previewItem();
    if (!a?.dataUrl || isImage(a.mime, a.name) || isPdf(a.mime, a.name)) return '';
    return decodeDataUrl(a.dataUrl);
  });
  protected readonly previewPdf = signal<SafeResourceUrl | null>(null);

  constructor() {
    const sub = this.route.queryParamMap?.subscribe((p) => {
      const id = p.get('m');
      if (id !== this.openId()) this.openId.set(id);
      if (id) this.markOpened(id);
      const sent = p.get('sent');
      if (sent && this.mail.byId(sent)) this.showSentBanner(sent);
    });
    this.destroyRef.onDestroy(() => {
      sub?.unsubscribe();
      if (this.noticeTimer) clearTimeout(this.noticeTimer);
      this.revokePreview();
    });
  }

  /* ------------------------------ helpers for template ------------------------------ */

  protected readonly initials = initials;
  protected readonly listTime = listTime;
  protected readonly fullDate = fullDate;
  protected readonly timeAgo = timeAgo;
  protected readonly formatBytes = formatBytes;
  protected readonly fileKind = fileKind;
  protected readonly isImage = isImage;
  protected readonly ME = ME;

  protected person(id: string) {
    return this.mail.person(id);
  }

  protected rowName(m: MailMessage): string {
    if (this.isInbox) return this.mail.person(m.from).name;
    const all = [...m.to, ...m.cc];
    const first = all.slice(0, 2).map((id) => this.mail.person(id).name.split(' ')[0]);
    return `To: ${first.join(', ')}${all.length > 2 ? ` +${all.length - 2}` : ''}`;
  }

  protected rowAvatar(m: MailMessage) {
    return this.mail.person(this.isInbox ? m.from : m.to[0]);
  }

  protected threadCount(m: MailMessage): number {
    return this.mail.thread(m.threadId).length;
  }

  protected html(body: string): string {
    return renderMessage(body);
  }

  protected recipients(m: MailMessage, kind: 'to' | 'cc' | 'bcc'): string {
    return m[kind].map((id) => this.mail.displayName(id)).join(', ');
  }

  protected receipt(m: MailMessage): { read: string[]; unread: string[] } {
    const all = [...m.to, ...m.cc, ...m.bcc];
    return {
      read: all.filter((id) => m.readBy.includes(id)).map((id) => this.mail.person(id).name),
      unread: all.filter((id) => !m.readBy.includes(id)).map((id) => this.mail.person(id).name),
    };
  }

  protected isExpanded(m: MailMessage, i: number): boolean {
    return i === this.thread().length - 1 || m.id === this.openId() || this.expanded().has(m.id);
  }

  protected toggleExpanded(id: string): void {
    this.expanded.update((s) => toggled(s, id));
  }

  protected toggleDetails(id: string): void {
    this.showDetails.update((s) => toggled(s, id));
  }

  /* ------------------------------ list actions ------------------------------ */

  protected openMsg(m: MailMessage): void {
    this.openId.set(m.id);
    this.quickReply.set('');
    this.expanded.set(new Set());
    this.markOpened(m.id);
    void this.router.navigate([], { relativeTo: this.route, queryParams: { m: m.id }, replaceUrl: true });
  }

  protected closeMsg(): void {
    this.openId.set(null);
    void this.router.navigate([], { relativeTo: this.route, queryParams: {}, replaceUrl: true });
  }

  private markOpened(id: string): void {
    const m = this.mail.byId(id);
    if (m && m.folder === 'inbox' && !m.read) this.mail.setRead([id], true);
  }

  protected step(delta: number): void {
    const list = this.list();
    if (!list.length) return;
    const i = this.position();
    const next = list[Math.min(list.length - 1, Math.max(0, i < 0 ? 0 : i + delta))];
    if (next) this.openMsg(next);
  }

  protected toggleSel(id: string): void {
    this.selected.update((s) => toggled(s, id));
  }

  protected toggleAll(): void {
    this.selected.set(this.allChecked() ? new Set() : new Set(this.list().map((m) => m.id)));
  }

  protected star(e: Event, m: MailMessage): void {
    e.stopPropagation();
    this.mail.toggleStar(m.id);
  }

  protected markRead(ids: string[], read: boolean): void {
    this.mail.setRead(ids, read);
    this.flash(`${ids.length === 1 ? 'Conversation' : `${ids.length} conversations`} marked as ${read ? 'read' : 'unread'}.`);
  }

  protected markUnreadAndClose(m: MailMessage): void {
    this.mail.setRead([m.id], false);
    this.closeMsg();
  }

  protected bulk(action: 'read' | 'unread' | 'star' | 'unstar' | 'delete'): void {
    const ids = [...this.selected()];
    if (!ids.length) return;
    if (action === 'read' || action === 'unread') this.markRead(ids, action === 'read');
    else if (action === 'star' || action === 'unstar') this.mail.setStarred(ids, action === 'star');
    else this.remove(ids);
    this.selected.set(new Set());
  }

  protected remove(ids: string[]): void {
    this.mail.remove(ids);
    if (this.openId() && ids.includes(this.openId()!)) this.closeMsg();
    this.selected.update((s) => new Set([...s].filter((x) => !ids.includes(x))));
    this.flash(`${ids.length === 1 ? 'Conversation' : `${ids.length} conversations`} moved to Bin.`, () => this.mail.restore(ids));
  }

  protected checkNew(): void {
    const m = this.mail.checkForNew();
    this.flash(m ? `New message from ${this.mail.person(m.from).name}` : 'You’re all caught up — no new messages.');
  }

  protected clearFilters(): void {
    this.query.set('');
    this.filter.set('all');
    this.label.set('');
  }

  /* ------------------------------ reading actions ------------------------------ */

  protected reply(mode: 'reply' | 'replyAll' | 'forward', m: MailMessage): void {
    void this.router.navigate(['/admin/mail/compose'], { queryParams: { [mode]: m.id } });
  }

  protected canReplyAll(m: MailMessage): boolean {
    return [...m.to, ...m.cc].filter((x) => x !== ME).length > (m.from === ME ? 1 : 0);
  }

  protected sendQuickReply(): void {
    const o = this.open();
    const text = this.quickReply().trim();
    if (!o || !text) return;
    const draft = this.mail.draftFrom(this.latest()?.id ?? o.id, 'reply');
    if (!draft) return;
    const sent = this.mail.send({ ...draft, body: text + signatureText + draft.body });
    this.quickReply.set('');
    this.flash(`Reply sent to ${sent.to.map((id) => this.mail.person(id).name).join(', ')}.`, () => this.mail.unsend(sent.id));
  }

  protected onQuickKey(e: KeyboardEvent): void {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      this.sendQuickReply();
    }
  }

  /* ------------------------------ attachments ------------------------------ */

  protected openPreview(items: MailAttachment[], index: number): void {
    const viewable = items.filter((a) => !!a.dataUrl);
    const target = items[index];
    const i = viewable.indexOf(target);
    if (i < 0) return;
    this.preview.set({ items: viewable, index: i });
    this.loadPdf();
  }

  protected previewStep(delta: number): void {
    const p = this.preview();
    if (!p) return;
    this.preview.set({ ...p, index: (p.index + delta + p.items.length) % p.items.length });
    this.loadPdf();
  }

  protected closePreview(): void {
    this.preview.set(null);
    this.revokePreview();
  }

  private loadPdf(): void {
    this.revokePreview();
    const a = this.previewItem();
    if (!a?.dataUrl || !isPdf(a.mime, a.name)) return;
    let url = a.dataUrl;
    try {
      if (typeof URL.createObjectURL === 'function') {
        url = URL.createObjectURL(dataUrlToBlob(a.dataUrl));
        this.previewUrl = url;
      }
    } catch {
      /* fall back to the data URL */
    }
    this.previewPdf.set(this.sanitizer.bypassSecurityTrustResourceUrl(url));
  }

  private revokePreview(): void {
    if (this.previewUrl) URL.revokeObjectURL?.(this.previewUrl);
    this.previewUrl = null;
    this.previewPdf.set(null);
  }

  protected canPreview(a: MailAttachment): boolean {
    return !!a.dataUrl;
  }

  protected download(a: MailAttachment): void {
    if (!a.dataUrl) return;
    const link = document.createElement('a');
    link.href = a.dataUrl;
    link.download = a.name;
    link.rel = 'noopener';
    document.body.appendChild(link);
    link.click();
    link.remove();
  }

  protected downloadAll(list: MailAttachment[]): void {
    const files = list.filter((a) => a.dataUrl);
    files.forEach((a) => this.download(a));
    this.flash(`Downloading ${files.length} file${files.length === 1 ? '' : 's'}…`);
  }

  protected totalSize(list: MailAttachment[]): string {
    return formatBytes(list.reduce((s, a) => s + a.size, 0));
  }

  /* ------------------------------ notices ------------------------------ */

  private showSentBanner(id: string): void {
    this.justSentId.set(id);
    const m = this.mail.byId(id);
    const names = m ? [...m.to, ...m.cc, ...m.bcc].map((x) => this.mail.person(x).name) : [];
    this.flash(
      `Message sent to ${names.slice(0, 2).join(', ')}${names.length > 2 ? ` +${names.length - 2}` : ''}.`,
      () => {
        this.mail.unsend(id);
        void this.router.navigate(['/admin/mail/compose']);
      },
      10_000,
    );
    this.openId.set(id);
  }

  protected flash(text: string, undo?: () => void, ms = 6000): void {
    this.notice.set({ text, undo });
    if (this.noticeTimer) clearTimeout(this.noticeTimer);
    this.noticeTimer = setTimeout(() => this.notice.set(null), ms);
  }

  protected undoNotice(): void {
    const n = this.notice();
    n?.undo?.();
    this.notice.set(null);
  }

  /* ------------------------------ keyboard ------------------------------ */

  protected onKey(e: KeyboardEvent): void {
    if (this.preview()) {
      if (e.key === 'Escape') this.closePreview();
      else if (e.key === 'ArrowRight') this.previewStep(1);
      else if (e.key === 'ArrowLeft') this.previewStep(-1);
      return;
    }
    const t = e.target as HTMLElement | null;
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (t && (/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName) || t.isContentEditable)) {
      if (e.key === 'Escape') t.blur();
      return;
    }
    const o = this.open();
    switch (e.key) {
      case 'j':
      case 'ArrowDown':
        e.preventDefault();
        this.step(1);
        break;
      case 'k':
      case 'ArrowUp':
        e.preventDefault();
        this.step(-1);
        break;
      case '/':
        e.preventDefault();
        this.searchBox()?.nativeElement.focus();
        break;
      case 'c':
        void this.router.navigate(['/admin/mail/compose']);
        break;
      case 'Escape':
        if (o) this.closeMsg();
        break;
      case 'r':
        if (o) this.reply('reply', o);
        break;
      case 'a':
        if (o) this.reply('replyAll', o);
        break;
      case 'f':
        if (o) this.reply('forward', o);
        break;
      case 's':
        if (o) this.mail.toggleStar(o.id);
        break;
      case 'u':
        if (o && this.isInbox) this.markUnreadAndClose(o);
        break;
      case '#':
      case 'Delete':
        if (o) this.remove([o.id]);
        break;
    }
  }
}

function toggled(s: Set<string>, id: string): Set<string> {
  const n = new Set(s);
  if (n.has(id)) n.delete(id);
  else n.add(id);
  return n;
}

function decodeDataUrl(url: string): string {
  const i = url.indexOf(',');
  const head = url.slice(0, i);
  const body = url.slice(i + 1);
  try {
    return head.includes(';base64') ? decodeURIComponent(escape(atob(body))) : decodeURIComponent(body);
  } catch {
    return '';
  }
}

function dataUrlToBlob(url: string): Blob {
  const i = url.indexOf(',');
  const mime = /data:([^;,]+)/.exec(url.slice(0, i))?.[1] ?? 'application/octet-stream';
  const bin = atob(url.slice(i + 1));
  const bytes = new Uint8Array(bin.length);
  for (let k = 0; k < bin.length; k++) bytes[k] = bin.charCodeAt(k);
  return new Blob([bytes], { type: mime });
}
