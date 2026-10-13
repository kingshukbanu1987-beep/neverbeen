import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { AiModelChatService } from '../../../services/ai-model-chat.service';
import {
  readImageAsDataUrl,
  compressCommunityImage,
} from '../../../shared/community-image-compression';
import { ChatAutoScroll } from '../../../shared/chat-auto-scroll/chat-auto-scroll';
import { AiModelProfile } from '../ai-model-data';
import { CHAT_WELCOME_LINE } from './chat-replies';
import { splitLocation } from './chat-knowledge';
import { buildChatSessionSummary } from './chat-summary';
import { ChatIdentity } from './chat-identity';
import { ChatIdentityPrompt } from './chat-identity-prompt';
import { ChatSessionSummaryCard } from './chat-session-summary';
import {
  AI_CHAT_DOCUMENT_LIMIT_BYTES,
  AI_CHAT_PHOTO_LIMIT_BYTES,
  AI_CHAT_REACTIONS,
  AiChatAttachment,
  AiChatMessage,
  AiChatReaction,
  reactionEmoji,
} from './chat-types';

/** How long her goodbye stays on screen before the window closes itself (requirement B). */
export const CHAT_AUTO_CLOSE_MS = 7000;

/** The largest picture kept in a session: big enough to look sharp in the bubble. */
const CHAT_PREVIEW_BYTES = 320 * 1024;

const DATE_FORMAT = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});
const TIME_FORMAT = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit' });

/**
 * The live chat with one AI model (requirements A–H) — an Instagram-shaped window on a white page,
 * which opens on the conversation itself: no welcome copy, no canned questions, only her answers.
 * her round photograph, her name, her model id, her city and country and a grey **View Profile**
 * button above the conversation, her answers in light grey bubbles and the visitor's own in dark
 * violet, the two-hour countdown in the top-right corner, date-and-time stamps on every message,
 * reactions on both sides, and a composer that takes a photograph, the camera or a document.
 */
@Component({
  selector: 'app-ai-model-chat',
  imports: [RouterLink, ChatAutoScroll, ChatIdentityPrompt, ChatSessionSummaryCard],
  templateUrl: './ai-model-chat.html',
  styleUrl: './ai-model-chat.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(document:keydown)': 'onDocumentKeydown($event)',
  },
})
export class AiModelChatDialog implements OnInit, OnDestroy {
  protected readonly chat = inject(AiModelChatService);

  readonly model = input.required<AiModelProfile>();
  readonly closed = output<void>();

  protected readonly reactions = AI_CHAT_REACTIONS;
  protected readonly welcomeLine = CHAT_WELCOME_LINE;
  protected readonly reactionEmoji = reactionEmoji;

  private readonly composer = viewChild<ElementRef<HTMLTextAreaElement>>('composer');
  private readonly photoInput = viewChild<ElementRef<HTMLInputElement>>('photoInput');
  private readonly cameraInput = viewChild<ElementRef<HTMLInputElement>>('cameraInput');
  private readonly documentInput = viewChild<ElementRef<HTMLInputElement>>('documentInput');

  protected readonly draft = signal('');
  protected readonly pickerFor = signal<string | null>(null);
  protected readonly readError = signal('');
  protected readonly sending = signal(false);

  /**
   * The transcript, newest last. The session holds one array and appends to it, so this always hands
   * out a fresh copy: a computed that returned the same array would keep its cached value and never
   * wake up the welcome card, the typing row or the auto-scroll directive.
   */
  protected readonly messages = computed<readonly AiChatMessage[]>(() => [
    ...(this.chat.session()?.messages ?? []),
  ]);

  protected readonly session = computed(() => this.chat.session());
  protected readonly thinking = computed(() => this.chat.thinking());
  protected readonly closedReason = computed(() => this.chat.session()?.closed ?? '');
  protected readonly sessionOver = computed(() => Boolean(this.chat.session()?.closed));
  protected readonly remaining = computed(() => this.chat.remainingMs());
  protected readonly urgent = computed(() => this.remaining() <= 5 * 60 * 1000);
  protected readonly warning = computed(() => this.remaining() <= 15 * 60 * 1000);

  /** A — the form in front of the window, until the visitor has introduced themselves. */
  protected readonly needsIdentity = computed(() => !this.chat.identified());

  /** The visitor: their photograph beside their messages and their name in the header. */
  protected readonly identity = computed<ChatIdentity | null>(
    () => this.session()?.identity ?? null,
  );

  protected readonly visitorFirstName = computed(() => {
    const name = this.identity()?.name ?? '';
    return name ? name.split(' ')[0] : '';
  });

  /** K — her report on the finished session. */
  protected readonly summary = computed(() =>
    buildChatSessionSummary({ model: this.model(), session: this.chat.session()! }),
  );

  protected readonly country = computed(() => splitLocation(this.model().location).country);
  protected readonly city = computed(() => splitLocation(this.model().location).city);
  protected readonly canSend = computed(
    () =>
      !this.sessionOver() &&
      !this.sending() &&
      (this.draft().trim().length > 0 || Boolean(this.chat.draftAttachment())),
  );

  private autoCloseTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    // Requirement B: after her goodbye the window closes itself.
    effect(() => {
      if (this.closedReason() !== 'blocked') return;
      if (this.autoCloseTimer) clearTimeout(this.autoCloseTimer);
      this.autoCloseTimer = setTimeout(() => this.close(), CHAT_AUTO_CLOSE_MS);
    });
  }

  /**
   * The window opens its own two-hour session the moment it is mounted: a page only has to render
   * `<app-ai-model-chat [model]>` and everything else — the clock, the reminders, her answers —
   * follows. `openChat()` is idempotent per model, so closing and reopening the window continues the
   * same session instead of starting a second one.
   */
  ngOnInit(): void {
    this.chat.openChat(this.model());
  }

  ngOnDestroy(): void {
    if (this.autoCloseTimer) clearTimeout(this.autoCloseTimer);
  }

  /** Focus the composer when the window opens, so typing starts straight away. */
  protected focusComposer(): void {
    this.composer()?.nativeElement.focus();
  }

  protected close(): void {
    this.chat.closeChat();
    this.closed.emit();
  }

  protected startNewSession(): void {
    this.chat.startNewSession(this.model());
    this.draft.set('');
    this.readError.set('');
    this.focusComposer();
  }

  /** A — the visitor's name and photograph, handed to the session by the form. */
  protected confirmIdentity(identity: ChatIdentity): void {
    this.chat.setIdentity(this.model(), identity);
    this.focusComposer();
  }

  /** K — the summary card is put away; the window behind it stays closed. */
  protected closeSummary(): void {
    this.chat.dismissSummary();
  }

  protected onBackdropClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) this.close();
  }

  protected onDocumentKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape' && !event.defaultPrevented) this.close();
  }

  protected updateDraft(event: Event): void {
    this.draft.set((event.target as HTMLTextAreaElement).value);
  }

  /** Enter sends, Shift+Enter starts a new line — the Messenger habit. */
  protected onComposerKeydown(event: KeyboardEvent): void {
    if (event.key !== 'Enter' || event.shiftKey) return;
    event.preventDefault();
    void this.submit();
  }

  protected async submit(): Promise<void> {
    if (!this.canSend()) return;
    const text = this.draft();
    this.draft.set('');
    this.sending.set(true);
    try {
      await this.chat.sendMessage(this.model(), text);
    } finally {
      this.sending.set(false);
      this.focusComposer();
    }
  }

  // ------------------------------------------------------------------ attachments

  protected pickPhoto(): void {
    this.photoInput()?.nativeElement.click();
  }

  protected takePhoto(): void {
    this.cameraInput()?.nativeElement.click();
  }

  protected pickDocument(): void {
    this.documentInput()?.nativeElement.click();
  }

  protected clearAttachment(): void {
    this.chat.setDraftAttachment(null);
    this.readError.set('');
  }

  protected async onPhotoPicked(event: Event, source: 'upload' | 'camera'): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    if (file.size > AI_CHAT_PHOTO_LIMIT_BYTES) {
      this.readError.set(
        'That picture is larger than 8 MB — choose a smaller one, or take it with the camera.',
      );
      return;
    }
    try {
      const compressed = await compressCommunityImage(file, CHAT_PREVIEW_BYTES);
      const preview = await readImageAsDataUrl(compressed);
      this.chat.setDraftAttachment({
        kind: 'photo',
        name: file.name || (source === 'camera' ? 'Camera photo' : 'Photograph'),
        type: compressed.type || file.type,
        size: compressed.size,
        source,
        preview,
      });
      this.readError.set('');
    } catch {
      this.readError.set('That picture could not be read. Try a JPEG, PNG or WebP file.');
    }
  }

  protected onDocumentPicked(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    if (file.size > AI_CHAT_DOCUMENT_LIMIT_BYTES) {
      this.readError.set(
        'That document is larger than 16 MB — send a smaller file or describe it in a message.',
      );
      return;
    }
    const attachment: AiChatAttachment = {
      kind: 'document',
      name: file.name || 'Document',
      type: file.type || 'application/octet-stream',
      size: file.size,
      source: 'file',
      preview: '',
    };
    this.chat.setDraftAttachment(attachment);
    this.readError.set('');
  }

  // ------------------------------------------------------------------ reactions

  protected toggleReactionPicker(messageId: string): void {
    this.pickerFor.set(this.pickerFor() === messageId ? null : messageId);
  }

  /** The Instagram habit: a double click on her bubble loves the message. */
  protected onBubbleDoubleClick(message: AiChatMessage): void {
    if (message.author !== 'model' || message.pending) return;
    this.chat.reactToMessage(this.model(), message.id, 'love');
  }

  protected react(message: AiChatMessage, reaction: AiChatReaction): void {
    this.pickerFor.set(null);
    if (message.author !== 'model') return;
    this.chat.reactToMessage(this.model(), message.id, reaction);
  }

  // ------------------------------------------------------------------ rendering helpers

  /** What the bubble shows: nothing while she is "typing", then the revealed slice of the answer. */
  protected bubbleText(message: AiChatMessage): string {
    if (!message.pending) return message.text;
    return message.text.slice(0, Math.max(0, message.revealedChars));
  }

  /** I — the name she types under while her answer is still on its way. */
  protected typingLabel(): string {
    return `${this.model().name.split(' ')[0]} is typing`;
  }

  protected isTypingBubble(message: AiChatMessage): boolean {
    return message.pending && message.revealedChars === 0;
  }

  /** `14:32` — the stamp beside every message. */
  protected timeOf(message: AiChatMessage): string {
    return TIME_FORMAT.format(new Date(message.at));
  }

  /** `12 Oct 2026, 14:32` — the full stamp, kept in the message's tooltip. */
  protected stampOf(message: AiChatMessage): string {
    return `${DATE_FORMAT.format(new Date(message.at))}, ${TIME_FORMAT.format(new Date(message.at))}`;
  }

  /**
   * The Instagram date separator above a message: it appears when the day changes, or when the
   * window opens on an older conversation.
   */
  protected daySeparatorFor(index: number): string {
    const list = this.messages();
    const message = list[index];
    if (!message) return '';
    const previous = list[index - 1];
    const sameDay =
      previous && new Date(previous.at).toDateString() === new Date(message.at).toDateString();
    if (sameDay) return '';
    const day = new Date(message.at);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    if (day.toDateString() === today.toDateString()) return `Today, ${TIME_FORMAT.format(day)}`;
    if (day.toDateString() === yesterday.toDateString())
      return `Yesterday, ${TIME_FORMAT.format(day)}`;
    return `${DATE_FORMAT.format(day)}, ${TIME_FORMAT.format(day)}`;
  }

  protected reactionLabel(message: AiChatMessage): string {
    if (!message.reaction) return '';
    const who =
      message.reactionBy === 'user' ? 'You reacted' : `${this.model().name.split(' ')[0]} reacted`;
    const emoji = reactionEmoji(message.reaction);
    return `${who} ${emoji}`;
  }

  protected sizeLabel(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
}
