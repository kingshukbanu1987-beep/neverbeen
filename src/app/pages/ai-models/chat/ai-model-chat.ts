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
import { ModelVerifiedTick } from '../../../shared/model-verified-tick/model-verified-tick';
import { AiModelProfile, aiModelProfiles } from '../ai-model-data';
import { CHAT_WELCOME_LINE } from './chat-replies';
import { AiChatMessageAction, AiChatMessageMenuItem, chatMessageMenu } from './chat-message-menu';
import { readDocumentBytes } from './chat-analysis';
import { splitLocation } from './chat-knowledge';
import { buildChatFeedbackFacts } from './chat-summary';
import { ChatIdentity } from './chat-identity';
import { ChatIdentityPrompt } from './chat-identity-prompt';
import { requiresRegisteredChat } from './live-chat-policy';
import { ChatFeedbackCard } from './chat-feedback';
import { ChatHistory } from './chat-history';
import {
  AI_CHAT_DOCUMENT_LIMIT_BYTES,
  AI_CHAT_LONG_PRESS_MS,
  AI_CHAT_PHOTO_LIMIT_BYTES,
  AI_CHAT_VIDEO_LIMIT_BYTES,
  AI_CHAT_REACTIONS,
  AiChatAttachment,
  AiChatFeedback,
  AiChatMessage,
  AiChatReaction,
  AiChatReplyQuote,
  LIVE_CHAT_PLANS,
  LiveChatPlan,
  chatMessageBody,
  reactionEmoji,
  replyQuoteOf,
} from './chat-types';

/** The message menu as it is open: where it sits on the window, and the actions it offers. */
interface ActionMenuState {
  messageId: string;
  left: number;
  top: number;
  /** True when the menu opens above the point it was called from, because there is no room below. */
  above: boolean;
  items: readonly AiChatMessageMenuItem[];
}

/** How far a finger may wander before a press stops being a long press (it has become a scroll). */
const LONG_PRESS_SLOP_PX = 10;
/** The menu's width and the height of one of its rows, for placing it inside the window. */
const ACTION_MENU_WIDTH_PX = 220;
const ACTION_MENU_ROW_PX = 44;
const ACTION_MENU_EDGE_PX = 8;

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
  imports: [
    RouterLink,
    ChatAutoScroll,
    ChatIdentityPrompt,
    ChatFeedbackCard,
    ChatHistory,
    ModelVerifiedTick,
  ],
  templateUrl: './ai-model-chat.html',
  styleUrl: './ai-model-chat.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(document:keydown)': 'onDocumentKeydown($event)',
    '(document:pointerdown)': 'onDocumentPointerDown($event)',
    '(window:resize)': 'closeActionMenu()',
  },
})
export class AiModelChatDialog implements OnInit, AfterViewInit {
  protected readonly chat = inject(AiModelChatService);
  /** The window itself, so a click on a reply quote can jump back to the quoted bubble. */
  private readonly host = inject(ElementRef<HTMLElement>);
  private readonly destroyRef = inject(DestroyRef);

  /** The window's own element, typed, for the few places that look inside it. */
  private get root(): HTMLElement {
    return this.host.nativeElement as HTMLElement;
  }

  readonly model = input.required<AiModelProfile>();
  /** Access is selected before this dialog mounts; legacy preserves direct integrations and old tests. */
  readonly plan = input<LiveChatPlan | 'legacy'>('legacy');
  /** A completed Community profile skips the public name-and-photo prompt for member chat. */
  readonly registeredIdentity = input<ChatIdentity | null>(null);
  readonly closed = output<void>();
  /** Instagram's Forward: the visitor sent a message on to another model. The host opens her chat. */
  readonly forwardTo = output<AiModelProfile>();

  protected readonly reactions = AI_CHAT_REACTIONS;
  protected readonly welcomeLine = CHAT_WELCOME_LINE;
  protected readonly reactionEmoji = reactionEmoji;

  private readonly infoToggle = viewChild<ElementRef<HTMLButtonElement>>('infoToggle');
  private readonly infoBack = viewChild<ElementRef<HTMLButtonElement>>('infoBack');
  private readonly composer = viewChild<ElementRef<HTMLTextAreaElement>>('composer');
  private readonly photoInput = viewChild<ElementRef<HTMLInputElement>>('photoInput');
  private readonly cameraInput = viewChild<ElementRef<HTMLInputElement>>('cameraInput');
  private readonly videoInput = viewChild<ElementRef<HTMLInputElement>>('videoInput');
  private readonly documentInput = viewChild<ElementRef<HTMLInputElement>>('documentInput');
  /** E and F — the close form itself, so Escape can be handed to its Close button. */
  private readonly feedbackCard = viewChild(ChatFeedbackCard);

  protected readonly draft = signal('');
  /** The whole chat history sheet, open over the window. */
  protected readonly historyOpen = signal(false);
  /** Phones: her information sheet, opened by the "›" beside her name in the header. */
  protected readonly infoOpen = signal(false);
  protected readonly pickerFor = signal<string | null>(null);
  /** The message the visitor has chosen to reply over — the quote the composer will send. */
  protected readonly replyingTo = signal<AiChatReplyQuote | null>(null);
  /** The message menu (right click, long press, or ⋯), while it is open. */
  protected readonly actionMenu = signal<ActionMenuState | null>(null);
  /** The message being forwarded, while the "Forward to" sheet is open. */
  protected readonly forwarding = signal<AiChatMessage | null>(null);
  /** The words in the composer that were forwarded from another chat, until they are sent. */
  private readonly forwardedDraft = signal<string | null>(null);
  /** A short confirmation ("Message copied") that fades on its own. */
  protected readonly toast = signal('');
  protected readonly readError = signal('');
  protected readonly sending = signal(false);

  /**
   * The transcript, newest last. The session holds one array and appends to it, so this always hands
   * out a fresh copy: a computed that returned the same array would keep its cached value and never
   * wake up the welcome card, the typing row or the auto-scroll directive.
   */
  protected readonly messages = computed<readonly AiChatMessage[]>(() =>
    (this.chat.session()?.messages ?? []).filter((message) => message.deletedForYou !== true),
  );

  /** The messages pinned to the top of the chat, oldest first; the banner shows the newest. */
  protected readonly pinnedMessages = computed<readonly AiChatMessage[]>(() =>
    this.messages().filter((message) => message.pinned && !message.unsent),
  );

  /** The newest pinned message, which the banner at the top of the chat shows. */
  protected readonly latestPinned = computed<AiChatMessage | null>(
    () => this.pinnedMessages().at(-1) ?? null,
  );

  /** The other models the visitor can forward a message to: every one but this model. */
  protected readonly forwardTargets = computed(() =>
    aiModelProfiles.filter((model) => model.slug !== this.model().slug),
  );

  protected readonly session = computed(() => this.chat.session());
  protected readonly activePlan = computed(() => this.session()?.plan ?? this.plan());
  protected readonly planDefinition = computed(() => {
    const plan = this.activePlan();
    return plan === 'legacy' ? null : LIVE_CHAT_PLANS[plan];
  });
  protected readonly mediaAllowed = computed(() => this.planDefinition()?.allowsMedia !== false);
  protected readonly sessionDuration = computed(
    () => this.session()?.durationMs ?? 2 * 60 * 60 * 1000,
  );
  protected readonly thinking = computed(() => this.chat.thinking());
  protected readonly closedReason = computed(() => this.chat.session()?.closed ?? '');
  protected readonly sessionOver = computed(() => Boolean(this.chat.session()?.closed));
  protected readonly remaining = computed(() => this.chat.remainingMs());
  protected readonly urgent = computed(
    () => this.remaining() <= Math.min(5 * 60 * 1000, this.sessionDuration() * 0.15),
  );
  protected readonly warning = computed(
    () => this.remaining() <= Math.min(15 * 60 * 1000, this.sessionDuration() * 0.34),
  );

  /** The same availability wording as her card and her profile page. */
  protected readonly availabilityState = computed<'available' | 'unavailable' | 'future'>(() => {
    const availability = (this.model().availability ?? '').trim().toLocaleLowerCase();
    if (/unavailable|fully booked|not accepting/.test(availability)) return 'unavailable';
    if (/future|looking for|coming soon/.test(availability)) return 'future';
    return 'available';
  });

  protected readonly availabilityLabel = computed(() => {
    switch (this.availabilityState()) {
      case 'unavailable':
        return 'Currently Unavailable';
      case 'future':
        return 'Looking for Future Contract';
      default:
        return 'Available for Contract';
    }
  });

  /** Her personal details for the information sheet — only the ones that have a value. */
  protected readonly infoDetails = computed(() => {
    const model = this.model();
    return [
      { label: 'Age', value: model.age ? `${model.age} years` : '' },
      { label: 'Height', value: model.height },
      { label: 'Weight', value: model.weight },
      { label: 'Body shape', value: model.bodyShape },
    ].filter((detail) => detail.value);
  });

  protected readonly infoMeasurements = computed(() => {
    const model = this.model();
    return [
      { label: 'Bust', value: model.bust },
      { label: 'Waist', value: model.waist },
      { label: 'Hip', value: model.hip },
    ].filter((detail) => detail.value);
  });

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
  /** Exclusive and Premium models carry a blue tick beside their name, in every line of this window. */
  protected readonly registeredOnly = computed(() => requiresRegisteredChat(this.model()));
  protected readonly canSend = computed(
    () =>
      !this.sessionOver() &&
      !this.sending() &&
      (this.draft().trim().length > 0 || Boolean(this.chat.draftAttachment())),
  );

  /**
   * The window opens the session entitlement chosen in the access screen. Free Chat continues to
   * the existing name-and-photo form; Registered User gets its identity from the verified Community
   * profile and can begin immediately after the profile review.
   */
  ngOnInit(): void {
    this.chat.openChat(this.model(), this.plan());
    const identity = this.registeredIdentity();
    if (identity) this.chat.setIdentity(this.model(), identity);
    // A message forwarded from another model's chat waits in the composer, ready to be sent here.
    const forwarded = this.chat.takeForward(this.model().slug);
    if (forwarded) {
      this.draft.set(forwarded);
      this.forwardedDraft.set(forwarded);
    }
    // The press and toast timers belong to this window: none of them may fire after it is gone.
    this.destroyRef.onDestroy(() => {
      this.cancelPress();
      if (this.toastTimer !== null) clearTimeout(this.toastTimer);
    });
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
    // The menu is pinned to a point on the screen: a scrolled transcript leaves it behind.
    this.closeActionMenu();
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
   * E — the ✕ asks the same question before the window goes: has this visitor been in a chat that
   * has started? Then the close form comes up first, with the two faces, the counts, the stars and
   * the comments box, and the window closes when they close it. A chat that has started can only be
   * left through that form: while it is open, ✕ does nothing, so the session is always ended.
   */
  protected requestClose(): void {
    const session = this.session();
    if (session?.identity && !session.closed) {
      if (!this.chat.feedbackOpen()) this.chat.openFeedback();
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

  /** Phones: shows her information over the chat. */
  protected openInfo(): void {
    this.infoOpen.set(true);
    setTimeout(() => this.infoBack()?.nativeElement.focus(), 0);
  }

  /** Back to the conversation, with focus where the visitor left it. */
  protected closeInfo(): void {
    this.infoOpen.set(false);
    setTimeout(() => this.infoToggle()?.nativeElement.focus(), 0);
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

  protected onDocumentKeydown(event: KeyboardEvent): void {
    if (event.key !== 'Escape' || event.defaultPrevented) return;
    // The message menu and the forward sheet are the topmost layers: Escape closes them first.
    if (this.actionMenu()) {
      this.closeActionMenu();
      return;
    }
    if (this.forwarding()) {
      this.closeForward();
      return;
    }
    // The information sheet is a layer of its own: Escape takes the visitor back to the chat.
    if (this.infoOpen()) {
      this.closeInfo();
      return;
    }
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
    // Escape does not close the window. Only the ✕ does (or the Close button of the form), so a
    // stray key press cannot leave a live chat running with nothing on screen.
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
    // A forwarded message stays marked as forwarded, unless the visitor has changed its words.
    const forwardedText = this.forwardedDraft();
    const forwarded = forwardedText !== null && text.trim() === forwardedText.trim();
    this.forwardedDraft.set(null);
    this.draft.set('');
    this.replyingTo.set(null);
    this.sending.set(true);
    try {
      await this.chat.sendMessage(this.model(), text, replyTo, { forwarded });
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

  protected pickVideo(): void {
    this.videoInput()?.nativeElement.click();
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

  /** Only Premium sessions may share a short video. Object URLs are intentionally transient and
   * never copied into session storage or sent to an AI reader. */
  protected onVideoPicked(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    if (!this.mediaAllowed()) {
      this.readError.set(
        'This chat plan is text-only. Choose the Premium plan to share photos or videos.',
      );
      return;
    }
    if (!file.type.startsWith('video/')) {
      this.readError.set('Choose a video file to share with this Premium chat.');
      return;
    }
    if (file.size > AI_CHAT_VIDEO_LIMIT_BYTES) {
      this.readError.set('That video is larger than 32 MB — choose a shorter or smaller video.');
      return;
    }
    this.chat.setDraftAttachment({
      kind: 'video',
      name: file.name || 'Video',
      type: file.type,
      size: file.size,
      source: 'upload',
      preview: URL.createObjectURL(file),
      // An object URL only works in this browser session and must never be persisted.
      ephemeral: true,
    });
    this.readError.set('');
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

  // ------------------------------------------------------------------ message menu

  /** The actions a message offers right now. Empty when it has no menu (typing, notices, reminders). */
  private menuItemsFor(message: AiChatMessage): AiChatMessageMenuItem[] {
    return chatMessageMenu(message, { canReply: !this.sessionOver(), now: Date.now() });
  }

  protected hasMenu(message: AiChatMessage): boolean {
    return this.menuItemsFor(message).length > 0;
  }

  /** Opens the menu of one message, with its top-left corner placed near the point it was asked from. */
  private openActionMenu(message: AiChatMessage, x: number, y: number): void {
    const items = this.menuItemsFor(message);
    if (items.length === 0) return;
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const height = items.length * ACTION_MENU_ROW_PX + 12;
    const left = Math.min(
      Math.max(ACTION_MENU_EDGE_PX, x - ACTION_MENU_WIDTH_PX / 2),
      Math.max(ACTION_MENU_EDGE_PX, viewportWidth - ACTION_MENU_WIDTH_PX - ACTION_MENU_EDGE_PX),
    );
    const above = y + ACTION_MENU_EDGE_PX + height > viewportHeight;
    const top = above
      ? Math.max(ACTION_MENU_EDGE_PX, y - ACTION_MENU_EDGE_PX)
      : y + ACTION_MENU_EDGE_PX;
    this.pickerFor.set(null);
    this.actionMenu.set({ messageId: message.id, left, top, above, items });
    // The first action takes the focus, so the keyboard can carry on from the menu.
    setTimeout(() => this.root.querySelector<HTMLElement>('.chat-action-item')?.focus(), 0);
  }

  protected closeActionMenu(): void {
    if (this.actionMenu()) this.actionMenu.set(null);
  }

  /** A right click on a bubble opens its menu in place of the browser's own. */
  protected onBubbleContextMenu(event: MouseEvent, message: AiChatMessage): void {
    if (!this.hasMenu(message)) return;
    event.preventDefault();
    this.cancelPress();
    this.openActionMenu(message, event.clientX, event.clientY);
  }

  /** The ⋯ beside the message: the same menu for a keyboard, or for anyone who finds it there. */
  protected openMenuFromButton(event: Event, message: AiChatMessage): void {
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    this.openActionMenu(message, rect.left + rect.width / 2, rect.bottom);
  }

  /**
   * A long press — about half a second with the finger (or the mouse button) held on a bubble — opens
   * its menu. A press that moves has become a scroll or a text selection, and is left alone.
   */
  private pressTimer: ReturnType<typeof setTimeout> | null = null;
  private pressOrigin: { x: number; y: number } | null = null;

  protected onBubblePointerDown(event: PointerEvent, message: AiChatMessage): void {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    this.cancelPress();
    if (!this.hasMenu(message)) return;
    const bubble = event.currentTarget as HTMLElement;
    this.pressOrigin = { x: event.clientX, y: event.clientY };
    this.pressTimer = setTimeout(() => {
      this.pressTimer = null;
      this.pressOrigin = null;
      const rect = bubble.getBoundingClientRect();
      this.openActionMenu(message, rect.left + rect.width / 2, rect.top);
    }, AI_CHAT_LONG_PRESS_MS);
  }

  protected onBubblePointerMove(event: PointerEvent): void {
    if (!this.pressOrigin) return;
    const dx = event.clientX - this.pressOrigin.x;
    const dy = event.clientY - this.pressOrigin.y;
    if (Math.hypot(dx, dy) > LONG_PRESS_SLOP_PX) this.cancelPress();
  }

  /** Lifting the finger, or the browser taking over the gesture, ends the press. */
  protected cancelPress(): void {
    if (this.pressTimer !== null) clearTimeout(this.pressTimer);
    this.pressTimer = null;
    this.pressOrigin = null;
  }

  /** A press anywhere outside the open menu closes it. */
  protected onDocumentPointerDown(event: Event): void {
    if (!this.actionMenu()) return;
    const target = event.target as Element | null;
    if (target?.closest?.('.chat-action-menu')) return;
    this.closeActionMenu();
  }

  /** Up and down move between the actions, as they do on a native menu. */
  protected onActionMenuKeydown(event: KeyboardEvent): void {
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
    const items = Array.from(this.root.querySelectorAll<HTMLElement>('.chat-action-item'));
    if (items.length === 0) return;
    event.preventDefault();
    const current = items.indexOf(document.activeElement as HTMLElement);
    const step = event.key === 'ArrowDown' ? 1 : -1;
    const next = (current + step + items.length) % items.length;
    items[next].focus();
  }

  /** Runs one action of the open menu on the message it was opened for. */
  protected runMenuAction(item: AiChatMessageMenuItem): void {
    const menu = this.actionMenu();
    this.closeActionMenu();
    const message = menu
      ? this.messages().find((candidate) => candidate.id === menu.messageId)
      : null;
    if (!message) return;
    this.performAction(item.id, message);
  }

  private performAction(action: AiChatMessageAction, message: AiChatMessage): void {
    const model = this.model();
    switch (action) {
      case 'reply':
        this.replyingTo.set(replyQuoteOf(message));
        this.focusComposer();
        return;
      case 'forward':
        this.forwarding.set(message);
        setTimeout(() => this.root.querySelector<HTMLElement>('.chat-forward-target')?.focus(), 0);
        return;
      case 'copy':
        void this.copyMessage(message);
        return;
      case 'delete':
        if (this.chat.deleteForYou(model, message.id)) this.dropReplyTo(message.id);
        return;
      case 'unsend':
        if (this.chat.unsendMessage(model, message.id)) this.dropReplyTo(message.id);
        return;
      case 'pin':
      case 'unpin': {
        const result = this.chat.togglePin(model, message.id);
        if (result === 'pinned') this.flashToast('Message pinned');
        if (result === 'unpinned') this.flashToast('Message unpinned');
        return;
      }
    }
  }

  /** A message that is gone cannot stay the one being replied to. */
  private dropReplyTo(messageId: string): void {
    if (this.replyingTo()?.id === messageId) this.replyingTo.set(null);
  }

  /** Copy: the words of the message go to the clipboard, and the visitor is told so. */
  protected async copyMessage(message: AiChatMessage): Promise<void> {
    const body = chatMessageBody(message);
    if (!body) return;
    try {
      await navigator.clipboard.writeText(body);
      this.flashToast('Message copied');
    } catch {
      this.chat.notice.set(
        'This browser would not copy the message. Select it and copy it by hand.',
      );
    }
  }

  private toastTimer: ReturnType<typeof setTimeout> | null = null;

  private flashToast(text: string): void {
    this.toast.set(text);
    if (this.toastTimer !== null) clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => {
      this.toast.set('');
      this.toastTimer = null;
    }, 1800);
  }

  // ------------------------------------------------------------------ forwarding

  protected closeForward(): void {
    this.forwarding.set(null);
  }

  /**
   * Forward to another model: her words wait in that model's chat, and this window hands over to
   * it. The host opens that model's chat (through its access screen), and the words are in the
   * composer there, ready for the visitor to send.
   */
  protected chooseForwardTarget(target: AiModelProfile): void {
    const message = this.forwarding();
    const body = message ? chatMessageBody(message) : '';
    this.forwarding.set(null);
    if (!body) return;
    this.chat.stageForward(target.slug, body);
    this.chat.closeChat();
    this.forwardTo.emit(target);
  }

  /** The words of a message as the banners and the forward sheet show them. */
  protected previewOf(message: AiChatMessage): string {
    const body = chatMessageBody(message);
    if (body) return body;
    if (message.unsent) return 'Message unsent';
    switch (message.attachment?.kind) {
      case 'photo':
        return '📷 Photograph';
      case 'video':
        return '🎬 Video';
      case 'document':
        return `📄 ${message.attachment.name}`;
      default:
        return 'Message';
    }
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

  /** The line an unsent message leaves in its place, as Instagram words it. */
  protected unsentLabel(message: AiChatMessage): string {
    if (message.author === 'user') return 'You unsent a message';
    return `${this.model().name.split(' ')[0]} unsent a message`;
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
