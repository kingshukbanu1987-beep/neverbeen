import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  OnInit,
  computed,
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
import { readDocumentBytes } from './chat-analysis';
import { splitLocation } from './chat-knowledge';
import { buildChatFeedbackFacts } from './chat-summary';
import { ChatIdentity } from './chat-identity';
import { ChatIdentityPrompt } from './chat-identity-prompt';
import { ChatFeedbackCard } from './chat-feedback';
import { ChatHistory } from './chat-history';
import {
  AI_CHAT_DOCUMENT_LIMIT_BYTES,
  AI_CHAT_PHOTO_LIMIT_BYTES,
  AI_CHAT_REACTIONS,
  AiChatAttachment,
  AiChatFeedback,
  AiChatMessage,
  AiChatReaction,
  AiChatReplyQuote,
  reactionEmoji,
  replyQuoteOf,
} from './chat-types';

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
  imports: [RouterLink, ChatAutoScroll, ChatIdentityPrompt, ChatFeedbackCard, ChatHistory],
  templateUrl: './ai-model-chat.html',
  styleUrl: './ai-model-chat.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(document:keydown)': 'onDocumentKeydown($event)',
  },
})
export class AiModelChatDialog implements OnInit, AfterViewInit {
  protected readonly chat = inject(AiModelChatService);
  /** The window itself, so a click on a reply quote can jump back to the quoted bubble. */
  private readonly host = inject(ElementRef<HTMLElement>);
  private readonly destroyRef = inject(DestroyRef);

  readonly model = input.required<AiModelProfile>();
  readonly closed = output<void>();

  protected readonly reactions = AI_CHAT_REACTIONS;
  protected readonly welcomeLine = CHAT_WELCOME_LINE;
  protected readonly reactionEmoji = reactionEmoji;

  private readonly composer = viewChild<ElementRef<HTMLTextAreaElement>>('composer');
  private readonly photoInput = viewChild<ElementRef<HTMLInputElement>>('photoInput');
  private readonly cameraInput = viewChild<ElementRef<HTMLInputElement>>('cameraInput');
  private readonly documentInput = viewChild<ElementRef<HTMLInputElement>>('documentInput');
  /** E and F — the close form itself, so Escape can be handed to its Close button. */
  private readonly feedbackCard = viewChild(ChatFeedbackCard);

  protected readonly draft = signal('');
  /** The whole chat history sheet, open over the window. */
  protected readonly historyOpen = signal(false);
  protected readonly pickerFor = signal<string | null>(null);
  /** The message the visitor has chosen to reply over — the quote the composer will send. */
  protected readonly replyingTo = signal<AiChatReplyQuote | null>(null);
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

  /**
   * E and K — the numbers and her note behind the close form: the time together, the messages both
   * of them sent and the photographs that went between them.
   */
  protected readonly facts = computed(() =>
    buildChatFeedbackFacts({ model: this.model(), session: this.chat.session()! }),
  );

  protected readonly country = computed(() => splitLocation(this.model().location).country);
  protected readonly city = computed(() => splitLocation(this.model().location).city);
  protected readonly canSend = computed(
    () =>
      !this.sessionOver() &&
      !this.sending() &&
      (this.draft().trim().length > 0 || Boolean(this.chat.draftAttachment())),
  );

  /**
   * The window opens its own two-hour session the moment it is mounted: a page only has to render
   * `<app-ai-model-chat [model]>` and everything else — the clock, the reminders, her answers —
   * follows. `openChat()` is idempotent per model, so closing and reopening the window continues the
   * same active session. Completed sessions reopen with a fresh identity form.
   */
  ngOnInit(): void {
    this.chat.openChat(this.model());
  }

  /**
   * On a phone her card scrolls away with the messages (see the phone block of the stylesheet):
   * the component measures the card so the transcript can be padded by its height, and keeps the
   * window the size of the visible screen while the keyboard is up.
   */
  ngAfterViewInit(): void {
    const root = this.host.nativeElement as HTMLElement;
    const panel = root.querySelector<HTMLElement>('.chat-panel');
    const profile = root.querySelector<HTMLElement>('.chat-profile');

    if (panel && profile && typeof ResizeObserver !== 'undefined') {
      const measure = (): void =>
        panel.style.setProperty('--chat-profile-h', `${profile.offsetHeight}px`);
      const observer = new ResizeObserver(measure);
      observer.observe(profile);
      measure();
      this.destroyRef.onDestroy(() => observer.disconnect());
    }

    const viewport = typeof window !== 'undefined' ? window.visualViewport : null;
    const backdrop = root.querySelector<HTMLElement>('.chat-backdrop');
    if (viewport && backdrop) {
      const follow = (): void => {
        // A pinch-zoom is the visitor's own doing: only the keyboard resizes the window.
        if (viewport.scale > 1.01) {
          backdrop.style.removeProperty('--chat-viewport-height');
          backdrop.style.removeProperty('--chat-viewport-top');
          return;
        }
        backdrop.style.setProperty('--chat-viewport-height', `${viewport.height}px`);
        backdrop.style.setProperty('--chat-viewport-top', `${viewport.offsetTop}px`);
      };
      viewport.addEventListener('resize', follow);
      viewport.addEventListener('scroll', follow);
      follow();
      this.destroyRef.onDestroy(() => {
        viewport.removeEventListener('resize', follow);
        viewport.removeEventListener('scroll', follow);
      });
    }
  }

  /** Moves her card up with the transcript: it leaves the screen exactly as fast as the messages. */
  protected onMessagesScroll(event: Event): void {
    const profile = (this.host.nativeElement as HTMLElement).querySelector<HTMLElement>(
      '.chat-profile',
    );
    profile?.style.setProperty('--chat-scroll', `${(event.target as HTMLElement).scrollTop}px`);
  }

  /** Focus the composer when the window opens, so typing starts straight away. */
  protected focusComposer(): void {
    this.composer()?.nativeElement.focus();
  }

  protected close(): void {
    this.chat.closeChat();
    this.closed.emit();
  }

  /**
   * E — the ✕, the backdrop and Escape all ask the same question before the window goes: has this
   * visitor been in a chat that has started? Then the close form comes up first, with the two faces,
   * the counts, the stars and the comments box, and the window closes when they close it.
   */
  protected requestClose(): void {
    const session = this.session();
    if (session?.identity && !session.closed && !this.chat.feedbackOpen()) {
      this.chat.openFeedback();
      return;
    }
    this.close();
  }

  /**
   * E, F and K — the Close button of the form: what the visitor gave is kept with the session, the
   * form is put away, and a window they were leaving closes with it. A window that ended by itself
   * stays where it is, with her goodbye and the transcript still in it.
   */
  protected onFeedbackClosed(feedback: AiChatFeedback | null): void {
    if (feedback) this.chat.recordFeedback(this.model(), feedback);
    const ended = this.sessionOver();
    if (!ended) this.chat.endVisitorSession();
    this.chat.dismissFeedback();
    if (!ended) this.close();
  }

  /** Escape, handed to the form: the visitor's rating and words are still theirs to send. */
  protected closeFeedback(): void {
    this.feedbackCard()?.close();
  }

  /** Opens the whole chat history over the window. */
  protected openHistory(): void {
    if (this.session()) this.historyOpen.set(true);
  }

  protected closeHistory(): void {
    this.historyOpen.set(false);
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

  protected onBackdropClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) this.requestClose();
  }

  protected onDocumentKeydown(event: KeyboardEvent): void {
    if (event.key !== 'Escape' || event.defaultPrevented) return;
    // The history sheet is the top layer: Escape takes the visitor back to the conversation.
    if (this.historyOpen()) {
      this.closeHistory();
      return;
    }
    // F — the form is never dismissed by itself, but a visitor who presses Escape has answered it
    // the same way they answer the Close button: what they gave is sent, and then the form goes.
    if (this.chat.feedbackOpen()) {
      this.closeFeedback();
      return;
    }
    this.requestClose();
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
    const replyTo = this.replyingTo();
    this.draft.set('');
    this.replyingTo.set(null);
    this.sending.set(true);
    try {
      await this.chat.sendMessage(this.model(), text, replyTo);
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

  protected async onDocumentPicked(event: Event): Promise<void> {
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
      // The desk reads the document itself when it can: its own bytes travel with the message (up to
      // a few megabytes), so a brief or an invoice is read rather than thanked for.
      ...(await readDocumentBytes(file)),
    };
    this.chat.setDraftAttachment(attachment);
    this.readError.set('');
  }

  // ------------------------------------------------------------------ reactions

  protected toggleReactionPicker(messageId: string): void {
    this.pickerFor.set(this.pickerFor() === messageId ? null : messageId);
    this.replyingTo.set(null);
  }

  /** The Instagram habit: a double click on a bubble loves the message — theirs or hers. */
  protected onBubbleDoubleClick(message: AiChatMessage): void {
    if (message.pending) return;
    this.chat.reactToMessage(this.model(), message.id, 'love');
  }

  /** One of the seven expressions, on a photograph or a text message, from either side. */
  protected react(message: AiChatMessage, reaction: AiChatReaction): void {
    this.pickerFor.set(null);
    this.chat.reactToMessage(this.model(), message.id, reaction);
  }

  // ------------------------------------------------------------------ replies

  /** Choosing a message to reply over — the Instagram reply, quote and all. */
  protected startReply(message: AiChatMessage): void {
    this.pickerFor.set(null);
    this.replyingTo.set(this.replyingTo()?.id === message.id ? null : replyQuoteOf(message));
    this.focusComposer();
  }

  protected cancelReply(): void {
    this.replyingTo.set(null);
  }

  /** Who the quoted message was written by, as the reply strip and the quote head say it. */
  protected quoteAuthor(quote: AiChatReplyQuote): string {
    if (quote.author === 'user') return 'You';
    if (quote.author === 'model') return this.model().name.split(' ')[0];
    return 'NeverBeen';
  }

  /** A click on the quote jumps back to the message it quotes, the way it does in Instagram. */
  protected scrollToMessage(messageId: string): void {
    const bubble = this.host.nativeElement.querySelector(`[data-message-id="${messageId}"]`);
    bubble?.scrollIntoView({ behavior: 'smooth', block: 'center' });
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

  /**
   * True while a typing indicator is on screen — the window's header says "typing" exactly when a
   * bubble is showing it, so the seconds before she picks her phone up stay quiet (requirement D of
   * the second brief).
   */
  protected readonly typingNow = computed(() => this.thinking() && !this.chat.away());

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
