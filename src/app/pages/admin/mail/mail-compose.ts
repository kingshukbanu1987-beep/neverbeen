import { Component, DestroyRef, ElementRef, computed, effect, inject, signal, untracked, viewChild } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AdminConfirmDialog } from '../shared/admin-confirm-dialog';
import { AdminMailService, GROUPS, MailAttachment, MailDraft, mailId, signatureText } from './admin-mail.service';
import { MailRecipients, RecipientField } from './mail-recipients';
import { ATTACH_RULES, fileKind, formatBytes, initials, isAllowedFile, isImage, renderMessage } from './mail-utils';

interface Upload {
  att: MailAttachment;
  progress: number;
  done: boolean;
}

type Confirm = 'discard' | 'noSubject' | 'forgotAttachment';

const EMOJIS = ['👍', '🙏', '✅', '❗', '🎉', '🚀', '🙂', '😊', '👀', '🔥', '📌', '📎', '🛡️', '⚠️', '💡', '🕒'];

/**
 * Admin Mail — Compose. Send a message to one or more other admins with To / Cc / Bcc chips,
 * a subject, lightly formatted text, and documents or pictures as attachments.
 */
@Component({
  selector: 'app-admin-mail-compose',
  imports: [RouterLink, MailRecipients, AdminConfirmDialog],
  templateUrl: './mail-compose.html',
  styleUrls: ['../shared/admin-grid.css', './mail.css'],
})
export class AdminMailCompose {
  protected readonly mail = inject(AdminMailService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly to = signal<string[]>([]);
  protected readonly cc = signal<string[]>([]);
  protected readonly bcc = signal<string[]>([]);
  protected readonly badTo = signal<string[]>([]);
  protected readonly badCc = signal<string[]>([]);
  protected readonly badBcc = signal<string[]>([]);
  protected readonly subject = signal('');
  protected readonly body = signal('');
  protected readonly uploads = signal<Upload[]>([]);
  protected readonly important = signal(false);
  protected readonly requestReceipt = signal(false);
  protected readonly signature = signal(true);
  protected readonly showCc = signal(false);
  protected readonly showBcc = signal(false);
  protected readonly previewMode = signal(false);
  protected readonly showEmoji = signal(false);
  protected readonly dragging = signal(false);
  protected readonly errors = signal<string[]>([]);
  protected readonly fileErrors = signal<string[]>([]);
  protected readonly savedAt = signal<string | null>(null);
  protected readonly restored = signal(false);
  protected readonly confirm = signal<Confirm | null>(null);
  protected readonly dirQuery = signal('');
  protected readonly mode = signal<MailDraft['mode']>('new');
  protected readonly replyToId = signal<string | undefined>(undefined);

  protected readonly toField = viewChild<MailRecipients>('toField');
  private readonly bodyBox = viewChild<ElementRef<HTMLTextAreaElement>>('bodyBox');
  private readonly fileInput = viewChild<ElementRef<HTMLInputElement>>('fileInput');
  private readonly imageInput = viewChild<ElementRef<HTMLInputElement>>('imageInput');

  protected readonly rules = ATTACH_RULES;
  protected readonly groups = GROUPS;
  protected readonly emojis = EMOJIS;
  protected readonly initials = initials;
  protected readonly formatBytes = formatBytes;
  protected readonly fileKind = fileKind;
  protected readonly isImage = isImage;

  private saveTimer: ReturnType<typeof setTimeout> | null = null;
  private sending = false;
  private dragDepth = 0;

  protected readonly allRecipients = computed(() => [...this.to(), ...this.cc(), ...this.bcc()]);
  protected readonly invalidCount = computed(() => this.badTo().length + this.badCc().length + this.badBcc().length);
  protected readonly uploading = computed(() => this.uploads().some((u) => !u.done));
  protected readonly totalBytes = computed(() => this.uploads().reduce((s, u) => s + u.att.size, 0));
  protected readonly bodyHtml = computed(() => renderMessage(this.body() + (this.signature() ? signatureText : '')));
  protected readonly wordCount = computed(() => (this.body().trim() ? this.body().trim().split(/\s+/).length : 0));
  protected readonly hasContent = computed(
    () => this.allRecipients().length > 0 || !!this.subject().trim() || !!this.body().trim() || this.uploads().length > 0,
  );
  protected readonly canSend = computed(() => this.to().length + this.cc().length + this.bcc().length > 0 && !this.invalidCount() && !this.uploading());
  protected readonly directory = computed(() => this.mail.search(this.dirQuery()));
  protected readonly heading = computed(() =>
    this.mode() === 'reply' ? 'Reply' : this.mode() === 'replyAll' ? 'Reply all' : this.mode() === 'forward' ? 'Forward' : 'New message',
  );

  constructor() {
    this.init();

    // Auto-save the draft ~0.8 s after the last change.
    let first = true;
    effect(() => {
      const d = this.snapshot();
      if (first) {
        first = false;
        return;
      }
      untracked(() => this.scheduleSave(d));
    });
    this.destroyRef.onDestroy(() => {
      if (this.saveTimer) {
        clearTimeout(this.saveTimer);
        if (!this.sending && this.hasContent()) this.mail.saveDraft(this.snapshot());
      }
    });
  }

  private init(): void {
    const p = this.route.snapshot?.queryParamMap;
    const replyMode = (['reply', 'replyAll', 'forward'] as const).find((k) => p?.get(k));
    let d: MailDraft | null = null;
    if (replyMode) d = this.mail.draftFrom(p!.get(replyMode)!, replyMode);
    else if (this.mail.draft()) {
      d = this.mail.draft();
      this.restored.set(true);
      this.savedAt.set(d?.savedAtUtc ?? null);
    }
    const toParam = p?.get('to');
    if (!d && toParam) d = { ...this.mail.emptyDraft(), to: toParam.split(',').filter((id) => this.mail.resolve(id)) };
    if (d) this.apply(d);
  }

  private apply(d: MailDraft): void {
    this.to.set(d.to);
    this.cc.set(d.cc);
    this.bcc.set(d.bcc);
    this.subject.set(d.subject);
    this.body.set(d.body);
    this.uploads.set(d.attachments.map((att) => ({ att, progress: 100, done: true })));
    this.important.set(d.important);
    this.requestReceipt.set(d.requestReceipt);
    this.mode.set(d.mode ?? 'new');
    this.replyToId.set(d.replyToId);
    this.showCc.set(d.cc.length > 0);
    this.showBcc.set(d.bcc.length > 0);
  }

  private snapshot(): MailDraft {
    return {
      to: this.to(),
      cc: this.cc(),
      bcc: this.bcc(),
      subject: this.subject(),
      body: this.body(),
      attachments: this.uploads()
        .filter((u) => u.done)
        .map((u) => u.att),
      important: this.important(),
      requestReceipt: this.requestReceipt(),
      mode: this.mode(),
      replyToId: this.replyToId(),
    };
  }

  private scheduleSave(d: MailDraft): void {
    if (this.saveTimer) clearTimeout(this.saveTimer);
    this.saveTimer = setTimeout(() => {
      this.saveTimer = null;
      if (this.sending) return;
      if (this.hasContent()) {
        this.mail.saveDraft(d);
        this.savedAt.set(new Date().toISOString());
      }
    }, 800);
  }

  protected savedLabel(): string {
    const s = this.savedAt();
    return s ? new Date(s).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : '';
  }

  /* ------------------------------ recipients ------------------------------ */

  private lineSignal(f: RecipientField) {
    return f === 'to' ? this.to : f === 'cc' ? this.cc : this.bcc;
  }

  /** Someone can only be on one line: adding to To removes them from Cc / Bcc (and vice versa). */
  protected claimed(id: string, on: RecipientField): void {
    for (const f of ['to', 'cc', 'bcc'] as RecipientField[]) {
      if (f !== on) this.lineSignal(f).update((l) => l.filter((x) => x !== id));
    }
    this.errors.set([]);
  }

  protected move(e: { id: string; from: RecipientField; to: RecipientField }): void {
    this.lineSignal(e.from).update((l) => l.filter((x) => x !== e.id));
    this.lineSignal(e.to).update((l) => (l.includes(e.id) ? l : [...l, e.id]));
  }

  protected lineOf(id: string): RecipientField | null {
    return this.to().includes(id) ? 'to' : this.cc().includes(id) ? 'cc' : this.bcc().includes(id) ? 'bcc' : null;
  }

  /** Directory buttons: add to / remove from a line. */
  protected toggleLine(id: string, line: RecipientField): void {
    if (this.lineOf(id) === line) {
      this.lineSignal(line).update((l) => l.filter((x) => x !== id));
      return;
    }
    if (line === 'cc') this.showCc.set(true);
    if (line === 'bcc') this.showBcc.set(true);
    this.lineSignal(line).update((l) => [...l, id]);
    this.claimed(id, line);
  }

  protected addGroup(groupId: string, line: RecipientField): void {
    const g = GROUPS.find((x) => x.id === groupId);
    if (!g) return;
    if (line === 'cc') this.showCc.set(true);
    for (const id of g.members) {
      if (this.lineOf(id) !== line) {
        this.lineSignal(line).update((l) => [...l, id]);
        this.claimed(id, line);
      }
    }
  }

  protected othersThan(line: RecipientField): string[] {
    return this.allRecipients().filter((id) => this.lineOf(id) !== line);
  }

  /* ------------------------------ formatting ------------------------------ */

  protected format(kind: 'bold' | 'italic' | 'ul' | 'ol' | 'quote' | 'link'): void {
    const ta = this.bodyBox()?.nativeElement;
    const text = this.body();
    const start = ta?.selectionStart ?? text.length;
    const end = ta?.selectionEnd ?? text.length;
    const sel = text.slice(start, end);
    let insert = sel;
    let selStart = start;
    let selEnd = end;
    if (kind === 'bold' || kind === 'italic') {
      const mark = kind === 'bold' ? '**' : '_';
      const inner = sel || (kind === 'bold' ? 'bold text' : 'italic text');
      insert = `${mark}${inner}${mark}`;
      selStart = start + mark.length;
      selEnd = selStart + inner.length;
    } else if (kind === 'link') {
      const label = sel || 'link text';
      insert = `[${label}](https://)`;
      selStart = start + label.length + 3;
      selEnd = selStart + 8;
    } else {
      const lines = (sel || '').split('\n');
      insert = lines.map((l, i) => (kind === 'ul' ? '- ' : kind === 'ol' ? `${i + 1}. ` : '> ') + l).join('\n');
      const needsBreak = start > 0 && text[start - 1] !== '\n';
      if (needsBreak) insert = '\n' + insert;
      selStart = selEnd = start + insert.length;
    }
    this.body.set(text.slice(0, start) + insert + text.slice(end));
    this.previewMode.set(false);
    queueMicrotask(() => {
      const box = this.bodyBox()?.nativeElement;
      box?.focus();
      box?.setSelectionRange(selStart, selEnd);
    });
  }

  protected insertEmoji(e: string): void {
    const ta = this.bodyBox()?.nativeElement;
    const text = this.body();
    const pos = ta?.selectionStart ?? text.length;
    this.body.set(text.slice(0, pos) + e + text.slice(pos));
    this.showEmoji.set(false);
    queueMicrotask(() => {
      ta?.focus();
      ta?.setSelectionRange(pos + e.length, pos + e.length);
    });
  }

  protected onBodyKey(e: KeyboardEvent): void {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      this.trySend();
    } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
      e.preventDefault();
      this.format('bold');
    } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'i') {
      e.preventDefault();
      this.format('italic');
    }
  }

  protected onGlobalKey(e: KeyboardEvent): void {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      this.trySend();
    }
  }

  /* ------------------------------ attachments ------------------------------ */

  protected pickFiles(images = false): void {
    (images ? this.imageInput() : this.fileInput())?.nativeElement.click();
  }

  protected onFilesChosen(e: Event): void {
    const input = e.target as HTMLInputElement;
    this.addFiles(Array.from(input.files ?? []));
    input.value = '';
  }

  /** Validates and reads files (documents or pictures) into attachments with a progress bar. */
  addFiles(files: File[]): void {
    const errs: string[] = [];
    for (const file of files) {
      const current = this.uploads();
      const mime = file.type || 'application/octet-stream';
      if (!isAllowedFile(file.name, mime)) {
        errs.push(`“${file.name}” — this file type can’t be attached.`);
        continue;
      }
      if (file.size > ATTACH_RULES.maxFileBytes) {
        errs.push(`“${file.name}” is ${formatBytes(file.size)} — the limit is ${formatBytes(ATTACH_RULES.maxFileBytes)} per file.`);
        continue;
      }
      if (current.length >= ATTACH_RULES.maxFiles) {
        errs.push(`You can attach up to ${ATTACH_RULES.maxFiles} files.`);
        break;
      }
      if (current.reduce((s, u) => s + u.att.size, 0) + file.size > ATTACH_RULES.maxTotalBytes) {
        errs.push(`“${file.name}” would take the total over ${formatBytes(ATTACH_RULES.maxTotalBytes)}.`);
        continue;
      }
      if (current.some((u) => u.att.name === file.name && u.att.size === file.size)) {
        errs.push(`“${file.name}” is already attached.`);
        continue;
      }
      const att: MailAttachment = { id: mailId('a'), name: file.name, mime, size: file.size };
      this.uploads.update((l) => [...l, { att, progress: 0, done: false }]);
      this.read(file, att.id);
    }
    this.fileErrors.set(errs);
  }

  private read(file: File, id: string): void {
    const patch = (p: Partial<Upload>, att?: Partial<MailAttachment>) =>
      this.uploads.update((l) => l.map((u) => (u.att.id === id ? { ...u, ...p, att: { ...u.att, ...att } } : u)));
    const reader = new FileReader();
    reader.onprogress = (ev) => {
      if (ev.lengthComputable) patch({ progress: Math.round((ev.loaded / ev.total) * 100) });
    };
    reader.onload = () => patch({ progress: 100, done: true }, { dataUrl: String(reader.result) });
    reader.onerror = () => {
      this.uploads.update((l) => l.filter((u) => u.att.id !== id));
      this.fileErrors.update((e) => [...e, `“${file.name}” could not be read.`]);
    };
    reader.readAsDataURL(file);
  }

  protected removeUpload(id: string): void {
    this.uploads.update((l) => l.filter((u) => u.att.id !== id));
  }

  protected onDragEnter(e: DragEvent): void {
    if (!e.dataTransfer?.types?.includes('Files')) return;
    e.preventDefault();
    this.dragDepth++;
    this.dragging.set(true);
  }

  protected onDragOver(e: DragEvent): void {
    if (e.dataTransfer?.types?.includes('Files')) e.preventDefault();
  }

  protected onDragLeave(): void {
    this.dragDepth = Math.max(0, this.dragDepth - 1);
    if (!this.dragDepth) this.dragging.set(false);
  }

  protected onDropFiles(e: DragEvent): void {
    if (!e.dataTransfer?.files?.length) return;
    e.preventDefault();
    this.dragDepth = 0;
    this.dragging.set(false);
    this.addFiles(Array.from(e.dataTransfer.files));
  }

  /** Paste a screenshot straight into the message → it is attached as a picture. */
  protected onPaste(e: ClipboardEvent): void {
    const files = Array.from(e.clipboardData?.files ?? []);
    if (!files.length) return;
    e.preventDefault();
    this.addFiles(files.map((f, i) => (f.name && f.name !== 'image.png' ? f : new File([f], `pasted-image-${Date.now()}-${i + 1}.png`, { type: f.type }))));
  }

  /* ------------------------------ send ------------------------------ */

  trySend(skip: Confirm[] = []): void {
    const errs: string[] = [];
    if (!this.allRecipients().length) errs.push('Add at least one admin in To, Cc or Bcc.');
    if (this.invalidCount()) errs.push('Remove the addresses marked ⚠ — admin mail can only be sent to other NeverBeen admins.');
    if (this.uploading()) errs.push('Please wait until all attachments have finished uploading.');
    this.errors.set(errs);
    if (errs.length) {
      if (!this.allRecipients().length) this.toField()?.focus();
      return;
    }
    if (!this.subject().trim() && !skip.includes('noSubject')) {
      this.confirm.set('noSubject');
      return;
    }
    if (!this.uploads().length && /\b(attach(ed|ment|ing)?|enclosed)\b/i.test(this.bodyWithoutQuote()) && !skip.includes('forgotAttachment')) {
      this.confirm.set('forgotAttachment');
      return;
    }
    this.send();
  }

  private pendingSkips: Confirm[] = [];

  protected confirmed(): void {
    const c = this.confirm();
    this.confirm.set(null);
    if (c === 'discard') {
      this.discard();
      return;
    }
    if (c) this.pendingSkips = [...this.pendingSkips, c];
    this.trySend(this.pendingSkips);
  }

  protected cancelled(): void {
    const c = this.confirm();
    this.confirm.set(null);
    this.pendingSkips = [];
    if (c === 'forgotAttachment') this.pickFiles();
  }

  private bodyWithoutQuote(): string {
    return this.body()
      .split('\n')
      .filter((l) => !l.startsWith('>'))
      .join('\n')
      .split('---------- Forwarded message')[0];
  }

  private finalBody(): string {
    const text = this.body();
    if (!this.signature() || text.includes(signatureText.trim())) return text;
    const cut = text.search(/\n\nOn [^\n]+ wrote:|\n\n---------- Forwarded message/);
    return cut >= 0 ? text.slice(0, cut).replace(/\s+$/, '') + signatureText + text.slice(cut) : text.replace(/\s+$/, '') + signatureText;
  }

  private send(): void {
    this.sending = true;
    if (this.saveTimer) clearTimeout(this.saveTimer);
    this.saveTimer = null;
    const msg = this.mail.send({ ...this.snapshot(), body: this.finalBody() });
    this.pendingSkips = [];
    void this.router.navigate(['/admin/mail/sent'], { queryParams: { m: msg.id, sent: msg.id } });
  }

  protected askDiscard(): void {
    if (this.hasContent()) this.confirm.set('discard');
    else this.discard();
  }

  private discard(): void {
    this.sending = true;
    if (this.saveTimer) clearTimeout(this.saveTimer);
    this.saveTimer = null;
    this.mail.discardDraft();
    void this.router.navigate(['/admin/mail/inbox']);
  }

  protected startFresh(): void {
    this.apply(this.mail.emptyDraft());
    this.mail.discardDraft();
    this.restored.set(false);
    this.savedAt.set(null);
    this.errors.set([]);
    this.fileErrors.set([]);
  }

  protected confirmText(c: Confirm): { heading: string; message: string; label: string; tone: 'danger' | 'dark' | 'violet' } {
    if (c === 'discard') return { heading: 'Discard this message?', message: 'The draft, its recipients and attachments will be deleted.', label: 'Discard', tone: 'danger' };
    if (c === 'noSubject') return { heading: 'Send without a subject?', message: 'A subject helps other admins find and prioritise your message.', label: 'Send anyway', tone: 'dark' };
    return {
      heading: 'Did you forget an attachment?',
      message: 'Your message mentions an attachment, but no file is attached. Choose Cancel to pick a file now.',
      label: 'Send without it',
      tone: 'violet',
    };
  }
}
