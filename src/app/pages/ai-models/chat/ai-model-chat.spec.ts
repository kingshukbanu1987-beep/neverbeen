import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AiModelChatService } from '../../../services/ai-model-chat.service';
import { silenceChatPacing } from '../../../services/ai-model-chat.testing';
import { aiModelProfiles } from '../ai-model-data';
import { requiresRegisteredChat } from './live-chat-policy';
import { AiModelChatDialog } from './ai-model-chat';

const alisha = aiModelProfiles.find((model) => model.slug === 'alisha-bhattacharya')!;

/** The visitor of the form in front of the window: two words, so she uses the first one only. */
const VISITOR_NAME = 'Rahul Verma';

interface Harness {
  fixture: ComponentFixture<AiModelChatDialog>;
  element: HTMLElement;
  chat: AiModelChatService;
}

/** A one-pixel visitor photograph — what the form would have reduced to about 100 KB. */
const VISITOR_PHOTO =
  'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwcJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/wAALCAABAAEBAREA/8QAFAABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFBEBAAAAAAAAAAAAAAAAAAAAAP/aAAwDAQACEQMRAD8AmwA/9k=';

/**
 * Opens the window the way a page does, and — unless asked otherwise — fills in the form in front
 * of it, so the two hours start and she opens the conversation.
 */
async function openChat(model = alisha, { identify = true } = {}): Promise<Harness> {
  const chat = TestBed.inject(AiModelChatService);
  silenceChatPacing(chat);
  chat.openChat(model);

  const fixture = TestBed.createComponent(AiModelChatDialog);
  fixture.componentRef.setInput('model', model);
  fixture.detectChanges();
  const harness: Harness = { fixture, element: fixture.nativeElement as HTMLElement, chat };

  if (identify) {
    chat.setIdentity(model, { name: VISITOR_NAME, avatar: VISITOR_PHOTO });
    fixture.detectChanges();
    await vi.waitFor(() => {
      fixture.detectChanges();
      expect(chat.thinking()).toBe(false);
    });
    fixture.detectChanges();
  }
  return harness;
}

/** Types into the composer and submits the form, the way a visitor does. */
async function send(harness: Harness, text: string): Promise<void> {
  const textarea = harness.element.querySelector<HTMLTextAreaElement>('.chat-input')!;
  textarea.value = text;
  textarea.dispatchEvent(new Event('input'));
  harness.fixture.detectChanges();
  harness.element
    .querySelector<HTMLFormElement>('.chat-composer')!
    .dispatchEvent(new Event('submit'));
  await vi.waitFor(() => {
    harness.fixture.detectChanges();
    expect(harness.element.querySelector('.chat-composer')).not.toBeNull();
  });
  await vi.waitFor(() => {
    harness.fixture.detectChanges();
    expect(harness.chat.thinking()).toBe(false);
  });
  harness.fixture.detectChanges();
}

describe('AiModelChatDialog', () => {
  beforeEach(async () => {
    sessionStorage.clear();
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response('{"ok":false}', { status: 503 })),
    );
    await TestBed.configureTestingModule({
      imports: [AiModelChatDialog],
      providers: [provideRouter([])],
    }).compileComponents();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
    sessionStorage.clear();
  });

  it('opens on her round photograph, her name, her model id, her country and city and View Profile', async () => {
    const harness = await openChat();
    const element = harness.element;

    expect(element.querySelector('.chat-profile-photo img')?.getAttribute('src')).toBe(
      alisha.cover,
    );
    expect(element.querySelector('#chat-model-name')?.textContent?.trim()).toBe(
      'Alisha Bhattacharya',
    );
    expect(element.querySelector('.chat-profile-handle')?.textContent?.trim()).toBe(
      '@alisha.bhattacharya',
    );
    const place = element.querySelector('.chat-profile-place')?.textContent ?? '';
    expect(place).toContain('India');
    expect(place).toContain('Darjeeling');

    const viewProfile = element.querySelector<HTMLButtonElement>('.chat-view-profile')!;
    expect(viewProfile.textContent).toContain('View Profile');

    // The two-hour countdown sits in the top-right corner of the window.
    expect(element.querySelector('.chat-clock-value')?.textContent?.trim()).toBe('02:00:00');
    expect(element.querySelector('.chat-clock')?.getAttribute('aria-label')).toContain('02:00:00');
  });

  it('shows a "›" beside her name that opens her information sheet, with a way back to the chat', async () => {
    const harness = await openChat();
    const { element, fixture } = harness;

    const more = element.querySelector<HTMLButtonElement>('.chat-bar-name .chat-bar-more')!;
    expect(more).not.toBeNull();
    expect(more.getAttribute('aria-label')).toContain('Alisha Bhattacharya');
    expect(element.querySelector('.chat-info')).toBeNull();

    more.click();
    fixture.detectChanges();
    const sheet = element.querySelector<HTMLElement>('.chat-info')!;
    expect(sheet).not.toBeNull();
    expect(sheet.querySelector('h2')?.textContent?.trim()).toBe('Alisha Bhattacharya');
    expect(sheet.textContent).toContain(alisha.height);
    expect(sheet.textContent).toContain(alisha.bodyShape);
    const actions = Array.from(
      sheet.querySelectorAll<HTMLButtonElement>('.chat-info-actions button'),
    ).map((button) => button.textContent!.trim());
    expect(actions).toEqual(['Show Premium Content', 'Chat History', 'Back to chat']);

    // Back — by the button in the bar, and by the one at the foot of the sheet.
    sheet.querySelector<HTMLButtonElement>('.chat-info-back')!.click();
    fixture.detectChanges();
    expect(element.querySelector('.chat-info')).toBeNull();

    more.click();
    fixture.detectChanges();
    element.querySelector<HTMLButtonElement>('.chat-info-return')!.click();
    fixture.detectChanges();
    expect(element.querySelector('.chat-info')).toBeNull();

    // Escape goes back to the chat as well, instead of closing the window.
    more.click();
    fixture.detectChanges();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    fixture.detectChanges();
    expect(element.querySelector('.chat-info')).toBeNull();
    expect(element.querySelector('.chat-panel')).not.toBeNull();
  });

  it('offers Show Premium Content, Chat History and Back to chat on her information sheet', async () => {
    const harness = await openChat();
    const { element, fixture } = harness;

    element.querySelector<HTMLButtonElement>('.chat-bar-more')!.click();
    fixture.detectChanges();
    const sheet = element.querySelector<HTMLElement>('.chat-info')!;

    // First: the premium door. For now pressing it does nothing at all.
    const premium = sheet.querySelector<HTMLButtonElement>('.chat-info-premium')!;
    expect(premium.textContent).toContain('Show Premium Content');
    premium.click();
    fixture.detectChanges();
    expect(element.querySelector('.chat-info')).not.toBeNull();
    expect(element.querySelector('app-chat-history')).toBeNull();
    expect(harness.chat.openSlug()).toBe('alisha-bhattacharya');

    // Second: the whole chat history, the same sheet the wide screen opens from its side panel.
    const history = sheet.querySelector<HTMLButtonElement>('.chat-info-history')!;
    expect(history.textContent).toContain('Chat History');
    history.click();
    fixture.detectChanges();
    expect(element.querySelector('app-chat-history')).not.toBeNull();

    // Its Escape closes the history first and leaves her information open under it.
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    fixture.detectChanges();
    expect(element.querySelector('app-chat-history')).toBeNull();
    expect(element.querySelector('.chat-info')).not.toBeNull();

    // Third: back to the chat itself.
    element.querySelector<HTMLButtonElement>('.chat-info-return')!.click();
    fixture.detectChanges();
    expect(element.querySelector('.chat-info')).toBeNull();
    expect(element.querySelector('.chat-panel')).not.toBeNull();
  });

  it('opens her information from View Profile on a wide window, the same as the "›"', async () => {
    // jsdom's matchMedia never matches, so stub a wide screen for this test.
    const previousMatchMedia = window.matchMedia;
    const wideScreenList: MediaQueryList = {
      matches: true,
      media: '(min-width: 900px)',
      onchange: null,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      addListener: () => undefined,
      removeListener: () => undefined,
      dispatchEvent: () => false,
    } as unknown as MediaQueryList;
    window.matchMedia = (() => wideScreenList) as unknown as typeof window.matchMedia;
    try {
      const harness = await openChat();
      const { element, fixture } = harness;

      element.querySelector<HTMLButtonElement>('.chat-view-profile')!.click();
      fixture.detectChanges();
      const sheet = element.querySelector<HTMLElement>('.chat-info')!;
      expect(sheet).not.toBeNull();
      expect(sheet.querySelector('h2')?.textContent?.trim()).toBe('Alisha Bhattacharya');

      // Back to chat returns to the conversation, and the window stays open.
      sheet.querySelector<HTMLButtonElement>('.chat-info-return')!.click();
      fixture.detectChanges();
      expect(element.querySelector('.chat-info')).toBeNull();
      expect(element.querySelector('.chat-panel')).not.toBeNull();
    } finally {
      window.matchMedia = previousMatchMedia;
    }
  });

  it('takes View Profile to her full profile page on a phone', async () => {
    const harness = await openChat();
    const router = TestBed.inject(Router);
    const navigate = vi.spyOn(router, 'navigate').mockResolvedValue(true);

    harness.element.querySelector<HTMLButtonElement>('.chat-view-profile')!.click();
    harness.fixture.detectChanges();
    expect(navigate).toHaveBeenCalledWith(['/ai-models', 'alisha-bhattacharya']);
    expect(harness.element.querySelector('.chat-info')).toBeNull();
  });

  it('puts her information in a side column and keeps the chat alone on the right (wide screens)', async () => {
    const harness = await openChat();
    const element = harness.element;

    // The markup the wide, landscape layout is built from: her column, then the conversation.
    const side = element.querySelector('.chat-side');
    expect(side).toBeTruthy();
    expect(side?.querySelector('.chat-bar')).toBeTruthy();
    expect(side?.querySelector('.chat-profile')).toBeTruthy();

    const conversation = element.querySelector('.chat-conversation');
    expect(conversation).toBeTruthy();
    // The right-hand column is the conversation and nothing else — no copy of her card, no bar.
    expect(conversation?.querySelector('.chat-messages')).toBeTruthy();
    expect(conversation?.querySelector('.chat-footer .chat-composer')).toBeTruthy();
    expect(conversation?.querySelector('.chat-profile')).toBeNull();
    expect(conversation?.querySelector('.chat-bar')).toBeNull();
  });

  it('closes the whole window from the ✕ of the “Before we start” form', async () => {
    const harness = await openChat(alisha, { identify: false });
    const closed: number[] = [];
    harness.fixture.componentInstance.closed.subscribe(() => closed.push(1));

    const close = harness.element.querySelector<HTMLButtonElement>('.gate-close')!;
    expect(close).toBeTruthy();
    close.click();
    harness.fixture.detectChanges();
    expect(closed.length).toBe(1);
    // E — nothing has been said yet, so there is no chat to ask about: the window simply goes.
    expect(harness.element.querySelector('app-chat-feedback')).toBeNull();
    expect(harness.chat.openSlug()).toBeNull();
  });

  it('offers the camera, a photograph and a document next to the composer', async () => {
    const harness = await openChat();
    const labels = Array.from(harness.element.querySelectorAll('.chat-composer-tools button')).map(
      (button) => button.getAttribute('aria-label'),
    );
    expect(labels).toEqual([
      'Take a photo with the camera',
      'Attach a photograph',
      'Attach a document',
    ]);

    const camera = harness.element.querySelector<HTMLInputElement>('input[capture="environment"]')!;
    expect(camera).not.toBeNull();
    expect(camera.getAttribute('accept')).toBe('image/*');
  });

  it('shows her introduction and the visitor’s own message as soon as the first message is sent', async () => {
    const harness = await openChat();
    await send(harness, 'Hello, who are you?');

    const text = harness.element.textContent ?? '';
    expect(text).toContain('Alisha Bhattacharya');
    expect(text).toContain('NeverBeen Multiverse');

    // She greeted the visitor first (requirement H of the first brief, F of the second): her
    // introduction arrives as several messages, and her answer follows them.
    const outgoing = harness.element.querySelectorAll('.chat-bubble.is-outgoing');
    const incoming = harness.element.querySelectorAll('.chat-bubble.is-incoming');
    expect(outgoing.length).toBe(1);
    expect(outgoing[0].textContent).toContain('Hello, who are you?');
    expect(incoming.length).toBeGreaterThanOrEqual(5);
    // A — she opened with their first name, and only their first name.
    expect(incoming[0].textContent).toContain('Rahul');
    expect(incoming[0].textContent).not.toContain('Verma');
    // Her own introduction carries her name and model id; the answer is the bubble after it.
    const said = Array.from(incoming)
      .map((bubble) => bubble.textContent ?? '')
      .join('\n');
    expect(said).toContain('@alisha.bhattacharya');
    expect(text).not.toContain('I am an AI model');
    expect(text).not.toContain('from my biography');

    // Her bubble is the light grey one, the visitor's the dark violet one.
    expect(incoming[0].classList.contains('is-incoming')).toBe(true);
    expect(outgoing[0].classList.contains('is-outgoing')).toBe(true);
  });

  it('shows her name and “typing” for four to five seconds before the answer appears (requirement I)', async () => {
    const harness = await openChat();
    // The real pacing, with the typing time pinned down so the wait is exactly four and a half
    // seconds — and long enough, so nothing in her answer is split into a second message.
    Object.assign(harness.chat.pacing, {
      perCharMs: 0,
      floorMs: 4_500,
      ceilingMs: 4_500,
      jitterMs: 0,
    });

    const textarea = harness.element.querySelector<HTMLTextAreaElement>('.chat-input')!;
    textarea.value = 'Tell me about Darjeeling';
    textarea.dispatchEvent(new Event('input'));
    harness.fixture.detectChanges();
    harness.element
      .querySelector<HTMLFormElement>('.chat-composer')!
      .dispatchEvent(new Event('submit'));
    harness.fixture.detectChanges();

    // Her name is in the window and she is typing — the visitor's own name is in the bar, hers on
    // the typing bubble, so nobody is guessing who is about to speak.
    // The bar shows her typing the moment the message is on its way, and the indicator itself
    // appears in the bubble that is about to become her answer.
    expect(harness.element.querySelector('.chat-bar-copy i')?.textContent).toContain(
      'Alisha is typing',
    );
    await vi.waitFor(() => {
      harness.fixture.detectChanges();
      expect(harness.element.querySelector('.chat-typing-copy')?.textContent).toBe(
        'Alisha is typing',
      );
    });
    harness.fixture.detectChanges();
    // Her bubble holds not one letter of the answer while it is being typed.
    const incoming = harness.element.querySelectorAll('.chat-bubble.is-incoming');
    const typingBubble = incoming[incoming.length - 1];
    expect(typingBubble.querySelector('.chat-bubble-text')).toBeNull();
    expect(typingBubble.querySelector('.chat-typing')).not.toBeNull();
    expect(harness.element.querySelector('.chat-clock-value')?.textContent?.trim()).toBe(
      '02:00:00',
    );

    // She takes her four to five seconds, and only then does the answer arrive.
    await vi.waitFor(
      () => {
        harness.fixture.detectChanges();
        expect(harness.chat.thinking()).toBe(false);
      },
      { timeout: 8_000, interval: 100 },
    );
    harness.fixture.detectChanges();

    expect(harness.element.querySelector('.chat-typing-copy')).toBeNull();
    const bubbles = harness.element.querySelectorAll('.chat-bubble.is-incoming');
    // A — four or five messages of introduction and one answer, and nothing else.
    expect(bubbles.length).toBeGreaterThanOrEqual(5);
    expect(bubbles[bubbles.length - 1].textContent?.trim().length ?? 0).toBeGreaterThan(0);
    expect(harness.element.textContent).toContain('Chatting with Rahul · active now');
    expect(harness.chat.remainingMs()).toBeLessThanOrEqual(2 * 60 * 60 * 1000);
  });

  it('opens on the conversation itself — no welcome copy and no static questions', async () => {
    const harness = await openChat();
    const text = harness.element.textContent ?? '';

    expect(harness.element.querySelector('.chat-welcome')).toBeNull();
    expect(harness.element.querySelector('.chat-suggestions')).toBeNull();
    // The only button in the transcript is her reaction control — no canned question in sight.
    expect(harness.element.querySelectorAll('.chat-messages .chat-suggestions')).toHaveLength(0);
    expect(text).not.toContain('from her own portfolio');
    expect(text).not.toContain('Tell me about yourself');
    expect(text).not.toContain('What is the capital of India?');

    // The composer is ready the moment the window opens.
    expect(harness.element.querySelector('.chat-composer')).not.toBeNull();
    expect(harness.element.querySelector('.chat-clock-value')?.textContent?.trim()).toBe(
      '02:00:00',
    );
  });

  it('stamps every message with its time and shows the day it was written', async () => {
    const harness = await openChat();
    await send(harness, 'Hi');

    const times = Array.from(harness.element.querySelectorAll('.chat-time')).map(
      (stamp) => stamp.textContent?.trim() ?? '',
    );
    expect(times.length).toBeGreaterThan(0);
    for (const stamp of times) expect(stamp).toMatch(/^\d{2}:\d{2}$/);
    expect(harness.element.querySelector('.chat-day')?.textContent).toMatch(/Today, \d{2}:\d{2}/);
  });

  it('sends with Enter and keeps Shift+Enter as a new line', async () => {
    const harness = await openChat();
    const textarea = harness.element.querySelector<HTMLTextAreaElement>('.chat-input')!;

    textarea.value = 'Hello';
    textarea.dispatchEvent(new Event('input'));
    textarea.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', shiftKey: true }));
    harness.fixture.detectChanges();
    // Shift+Enter writes a new line; nothing is sent.
    expect(harness.element.querySelectorAll('.chat-bubble.is-outgoing').length).toBe(0);

    textarea.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    await vi.waitFor(() => {
      harness.fixture.detectChanges();
      expect(harness.element.querySelectorAll('.chat-bubble.is-outgoing').length).toBe(1);
    });
  });

  it('reacts to her answer with the Instagram tray, and shows her reaction back', async () => {
    const harness = await openChat();
    await send(harness, 'Hello');

    harness.element.querySelector<HTMLButtonElement>('.chat-react-button')!.click();
    harness.fixture.detectChanges();
    const tray = harness.element.querySelectorAll('.chat-reaction-option');
    // The seven expressions: like, dislike, love, smile, angry, cry, happy.
    expect(tray.length).toBe(7);

    harness.element.querySelectorAll<HTMLButtonElement>('.chat-reaction-option')[2].click();
    await vi.waitFor(() => {
      harness.fixture.detectChanges();
      const badge = harness.element.querySelector('.chat-bubble.is-incoming .chat-bubble-reaction');
      expect(badge?.textContent?.trim()).toBe('❤️');
      expect(badge?.getAttribute('title')).toBe('You reacted ❤️');
    });

    // She reacts back on the visitor's own message (requirement H).
    await vi.waitFor(() => {
      harness.fixture.detectChanges();
      expect(
        harness.element
          .querySelector('.chat-row.is-outgoing .chat-reaction-note')
          ?.textContent?.trim(),
      ).toBe('Alisha reacted ❤️');
    });
    // Both sides carry their own stamp: the visitor's on her answer, hers on the visitor's message.
    expect(
      harness.element
        .querySelector('.chat-bubble.is-incoming .chat-bubble-reaction')
        ?.getAttribute('title'),
    ).toBe('You reacted ❤️');
    expect(
      harness.element
        .querySelector('.chat-bubble.is-outgoing .chat-bubble-reaction')
        ?.getAttribute('title'),
    ).toBe('Alisha reacted ❤️');
  });

  it('lets the visitor react to their own message too, and she answers with an expression', async () => {
    const harness = await openChat();
    await send(harness, 'Hello');

    const outgoingRow = harness.element.querySelector('.chat-row.is-outgoing')!;
    outgoingRow.querySelector<HTMLButtonElement>('.chat-react-button')!.click();
    harness.fixture.detectChanges();
    const tray = outgoingRow.querySelectorAll<HTMLButtonElement>('.chat-reaction-option');
    expect(tray.length).toBe(7);

    // Smile — the fourth of the seven expressions.
    tray[3].click();
    await vi.waitFor(() => {
      harness.fixture.detectChanges();
      const badge = outgoingRow.querySelector('.chat-bubble-reaction');
      expect(badge?.textContent?.trim()).toBe('😊');
      expect(badge?.getAttribute('title')).toBe('You reacted 😊');
    });

    // Her answer carries the same expression back, on her most recent message.
    const incomingBadges = Array.from(
      harness.element.querySelectorAll('.chat-bubble.is-incoming .chat-bubble-reaction'),
    );
    expect(
      incomingBadges.some((badge) => badge.getAttribute('title') === 'Alisha reacted 😊'),
    ).toBe(true);
  });

  it('replies over a chosen message, Instagram style, and she replies over theirs', async () => {
    const harness = await openChat();
    await send(harness, 'Tell me about your city');

    const herRow = Array.from(harness.element.querySelectorAll('.chat-row')).find(
      (row) => !row.classList.contains('is-outgoing'),
    )!;
    herRow.querySelector<HTMLButtonElement>('.chat-reply-button')!.click();
    harness.fixture.detectChanges();

    const strip = harness.element.querySelector('.chat-reply-strip');
    expect(strip?.textContent).toContain('Replying to Alisha');
    expect(strip?.textContent?.trim().length ?? 0).toBeGreaterThan(20);

    await send(harness, 'Tell me more about that');

    // The visitor's bubble carries the quote of her message at its top.
    const outgoingQuotes = Array.from(
      harness.element.querySelectorAll('.chat-bubble.is-outgoing .chat-reply-quote'),
    );
    expect(outgoingQuotes.length).toBeGreaterThan(0);
    expect(outgoingQuotes.at(-1)?.textContent).toContain('Alisha');

    // …and her answer quotes the visitor's message right back.
    const incomingQuotes = Array.from(
      harness.element.querySelectorAll('.chat-bubble.is-incoming .chat-reply-quote'),
    );
    expect(incomingQuotes.length).toBeGreaterThan(0);
    expect(incomingQuotes.at(-1)?.textContent).toContain('You');
    expect(incomingQuotes.at(-1)?.textContent).toContain('Tell me more about that');
  });

  it('shows a quiet placeholder where a generated photograph was, once the session has ended', async () => {
    const harness = await openChat();
    await send(harness, 'send me a selfie please');

    const session = harness.chat.sessionOf(alisha.slug)!;
    const shot = session.messages.find((message) => message.attachment?.selfie === true)!;
    expect(shot).toBeTruthy();
    // As the live service's photographs are: browser-only, and dropped with the session.
    shot.attachment = { ...shot.attachment!, ephemeral: true };

    harness.chat.endVisitorSession();
    harness.fixture.detectChanges();

    expect(shot.attachment?.preview).toBe('');
    expect(harness.element.querySelector('.chat-bubble-photo.is-gone')?.textContent).toContain(
      'deleted when this chat session ended',
    );
  });

  it('attaches a document to a message and shows it in the bubble', async () => {
    const harness = await openChat();
    const input = harness.element.querySelector<HTMLInputElement>('input[accept*=".pdf"]')!;
    const file = new File(['brief'], 'creative-brief.pdf', { type: 'application/pdf' });

    Object.defineProperty(input, 'files', { value: [file], configurable: true });
    input.dispatchEvent(new Event('change'));

    // The document is read into bytes before it becomes a draft, so the reading desk can open it
    // before she answers it — the draft appears as soon as that read is done.
    await vi.waitFor(() => {
      harness.fixture.detectChanges();
      expect(harness.element.querySelector('.chat-draft')?.textContent).toContain(
        'creative-brief.pdf',
      );
    });

    await send(harness, 'Here is the brief');
    const bubble = harness.element.querySelector('.chat-bubble.is-outgoing')!;
    expect(bubble.querySelector('.chat-bubble-file')?.textContent).toContain('creative-brief.pdf');
  });

  it('keeps a started window open until its Close button is pressed: outside clicks and Escape do nothing (requirement E)', async () => {
    const harness = await openChat();
    const closes: number[] = [];
    harness.fixture.componentInstance.closed.subscribe(() => closes.push(1));

    // A click on the backdrop, outside the window, does nothing: the window and the chat stay.
    harness.element
      .querySelector('.chat-backdrop')!
      .dispatchEvent(new MouseEvent('click', { bubbles: true }));
    harness.fixture.detectChanges();
    expect(harness.element.querySelector('.chat-panel')).not.toBeNull();
    expect(harness.element.querySelector('app-chat-feedback')).toBeNull();
    expect(harness.chat.openSlug()).toBe(alisha.slug);

    // Escape does nothing either: a stray key press must not leave a live chat behind.
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    harness.fixture.detectChanges();
    expect(harness.element.querySelector('.chat-panel')).not.toBeNull();
    expect(harness.element.querySelector('app-chat-feedback')).toBeNull();
    expect(harness.chat.openSlug()).toBe(alisha.slug);
    expect(closes.length).toBe(0);

    // ✕ asks for the close form first. Pressing ✕ again, or clicking outside while the form is
    // open, leaves the form and the window exactly as they were.
    harness.element.querySelector<HTMLButtonElement>('.chat-close')!.click();
    harness.fixture.detectChanges();
    expect(harness.element.querySelector('app-chat-feedback')).not.toBeNull();
    harness.element.querySelector<HTMLButtonElement>('.chat-close')!.click();
    harness.element
      .querySelector('.chat-backdrop')!
      .dispatchEvent(new MouseEvent('click', { bubbles: true }));
    harness.fixture.detectChanges();
    expect(harness.element.querySelector('app-chat-feedback')).not.toBeNull();
    expect(harness.chat.openSlug()).toBe(alisha.slug);
    expect(closes.length).toBe(0);

    // The Close button of the form is the way out: the session is ended, then the window goes.
    harness.element.querySelector<HTMLButtonElement>('.feedback-close')!.click();
    harness.fixture.detectChanges();
    expect(closes.length).toBe(1);
    expect(harness.chat.openSlug()).toBeNull();
    // The session is ended, not left running behind the window.
    expect(harness.chat.sessionOf(alisha.slug)?.closed).toBe('visitor');
  });

  it('still closes a chat that has not started (no name yet) straight away with ✕ (requirement E)', async () => {
    const harness = await openChat(alisha, { identify: false });
    harness.element.querySelector<HTMLButtonElement>('.chat-close')!.click();
    harness.fixture.detectChanges();
    expect(harness.chat.openSlug()).toBeNull();
    expect(harness.element.querySelector('app-chat-feedback')).toBeNull();
  });

  it('shows the ultra-modern reminder in the middle of the chat when fifteen minutes are left', async () => {
    vi.useFakeTimers();
    const harness = await openChat();
    // D — the visitor is still in the window, writing every couple of minutes, so the session keeps
    // its two hours and the reminders come round as they always did.
    for (let passed = 0; passed < 104; passed += 2) {
      vi.advanceTimersByTime(2 * 60 * 1000);
      await harness.chat.sendMessage(alisha, 'Still here, tell me something');
    }
    vi.advanceTimersByTime(60 * 1000 + 1000);
    harness.fixture.detectChanges();

    const reminder = harness.element.querySelector('.chat-reminder');
    expect(reminder?.textContent).toContain('15 minutes remaining');
    expect(harness.element.querySelector('.chat-clock-value')?.textContent?.trim()).toBe('14:59');
  });

  it('opens her own session and asks who she is talking to before anything else', async () => {
    const harness = await openChat(alisha, { identify: false });
    const element = harness.element;

    expect(harness.chat.openSlug()).toBe(alisha.slug);
    expect(harness.chat.session()?.slug).toBe(alisha.slug);
    expect(harness.chat.identified()).toBe(false);

    // A — the form comes first: her photograph and name are asked for before the conversation.
    const gate = element.querySelector('.gate');
    expect(gate).not.toBeNull();
    expect(gate?.textContent).toContain('Before we start');
    expect(element.querySelector('.gate-start')).not.toBeNull();
    expect(harness.chat.session()?.messages.length).toBe(1);

    // The window is not listening yet, and the clock has not started.
    await harness.chat.sendMessage(alisha, 'Hello?');
    expect(harness.chat.session()?.messages.length).toBe(1);

    // Once the form is filled in, the two hours start and she speaks first (requirement H).
    harness.chat.setIdentity(alisha, { name: VISITOR_NAME, avatar: VISITOR_PHOTO });
    harness.fixture.detectChanges();
    await vi.waitFor(() => {
      harness.fixture.detectChanges();
      expect(harness.chat.thinking()).toBe(false);
    });
    harness.fixture.detectChanges();

    expect(harness.chat.identified()).toBe(true);
    expect(element.querySelector('.gate')).toBeNull();
    expect(harness.chat.session()?.messages.length).toBeGreaterThanOrEqual(5);
    const herFirst = element.querySelectorAll('.chat-bubble.is-incoming');
    expect(herFirst.length).toBeGreaterThanOrEqual(4);
    expect(Array.from(herFirst, (bubble) => bubble.textContent).join(' ')).toContain('Alisha');
    expect(element.querySelector('.chat-clock-value')?.textContent?.trim()).toBe('02:00:00');
  });

  it('counts the two hours down once the visitor has introduced themselves', async () => {
    vi.useFakeTimers();
    const harness = await openChat(alisha, { identify: false });
    harness.chat.setIdentity(alisha, { name: VISITOR_NAME, avatar: VISITOR_PHOTO });
    harness.fixture.detectChanges();

    expect(harness.element.querySelector('.chat-clock-value')?.textContent?.trim()).toBe(
      '02:00:00',
    );

    vi.advanceTimersByTime(1000);
    harness.fixture.detectChanges();
    expect(harness.element.querySelector('.chat-clock-value')?.textContent?.trim()).toBe(
      '01:59:59',
    );

    vi.advanceTimersByTime(30_000);
    harness.fixture.detectChanges();
    expect(harness.element.querySelector('.chat-clock-value')?.textContent?.trim()).toBe(
      '01:59:29',
    );
  });

  it('asks for feedback when the visitor closes the window, and waits for their Close button (requirements E and F)', async () => {
    vi.useFakeTimers();
    const harness = await openChat(alisha, { identify: false });
    harness.chat.setIdentity(alisha, { name: VISITOR_NAME, avatar: VISITOR_PHOTO });
    harness.fixture.detectChanges();
    await harness.chat.sendMessage(alisha, 'Hello there');
    harness.fixture.detectChanges();
    expect(harness.element.querySelector('app-chat-feedback')).toBeNull();

    // ✕ — the visitor is leaving a chat that has started, so the form comes up first and the window
    // waits behind it.
    harness.element.querySelector<HTMLButtonElement>('.chat-close')!.click();
    harness.fixture.detectChanges();
    expect(harness.element.querySelector('app-chat-feedback')).not.toBeNull();
    expect(harness.chat.openSlug()).toBe(alisha.slug);

    // F — the form is a form, not a toast: seven seconds used to close the whole window, and a
    // minute of clock now changes nothing at all.
    vi.advanceTimersByTime(60_000);
    harness.fixture.detectChanges();
    expect(harness.element.querySelector('app-chat-feedback')).not.toBeNull();
    expect(harness.chat.openSlug()).toBe(alisha.slug);

    // E — both of them in one frame, and the numbers of the session underneath.
    const form = harness.element.querySelector('app-chat-feedback')!;
    expect(form.querySelectorAll('.feedback-face img')).toHaveLength(2);
    const copy = form.textContent ?? '';
    expect(copy).toContain('Alisha Bhattacharya');
    expect(copy).toContain(VISITOR_NAME);
    expect(copy).toContain('together');
    expect(copy).not.toContain('02:00:00');
    const stats = Array.from(form.querySelectorAll('.feedback-stats li')).map(
      (tile) => tile.textContent?.replace(/\s+/g, ' ').trim() ?? '',
    );
    expect(stats).toHaveLength(4);
    expect(stats[0]).toContain('messages exchanged');
    expect(stats[1]).toContain('your messages');
    expect(stats[2]).toContain('her messages');
    expect(stats[3]).toContain('photographs shared');
    expect(form.querySelectorAll('.feedback-star')).toHaveLength(5);

    // E — four stars and a sentence, then the Close button at the end of the form.
    form.querySelectorAll<HTMLButtonElement>('.feedback-star')[3].click();
    harness.fixture.detectChanges();
    expect(form.querySelectorAll('.feedback-star.is-lit')).toHaveLength(4);
    const box = form.querySelector<HTMLTextAreaElement>('.feedback-comments-box')!;
    box.value = 'A lovely chat — she was kind.';
    box.dispatchEvent(new Event('input'));
    form.querySelector<HTMLButtonElement>('.feedback-close')!.click();
    harness.fixture.detectChanges();

    expect(harness.chat.feedbackFor(alisha.slug)).toMatchObject({
      rating: 4,
      comments: 'A lovely chat — she was kind.',
    });
    expect(harness.element.querySelector('app-chat-feedback')).toBeNull();
    expect(harness.chat.openSlug()).toBeNull();
    expect(harness.chat.sessionOf(alisha.slug)?.closed).toBe('visitor');
    harness.fixture.destroy();
    const reopened = await openChat(alisha, { identify: false });
    expect(reopened.element.querySelector('app-chat-identity-prompt')).not.toBeNull();
    expect(reopened.chat.session()?.identity).toBeNull();
    expect(reopened.chat.session()?.personalMemory?.answers).toEqual({});
  });

  it('brings the same form up when she ends the chat herself, and leaves the ended window behind it (requirements D, E and F)', async () => {
    vi.useFakeTimers();
    const harness = await openChat(alisha, { identify: false });
    harness.chat.setIdentity(alisha, { name: VISITOR_NAME, avatar: VISITOR_PHOTO });
    harness.fixture.detectChanges();
    expect(harness.element.querySelector('app-chat-feedback')).toBeNull();

    // Three quiet minutes: the visitor is not coming back, and she says so and closes the session.
    vi.advanceTimersByTime(3 * 60 * 1000 + 1_000);
    harness.fixture.detectChanges();

    expect(harness.chat.session()?.closed).toBe('inactive');
    expect(harness.element.querySelector('app-chat-feedback')).not.toBeNull();
    const copy = harness.element.textContent ?? '';
    expect(copy).toContain('three quiet minutes');
    // Her goodbye is in the conversation behind the form: her own words, in her own bubble.
    const goodbye = harness.chat
      .session()!
      .messages.find((message) => message.intent === 'goodbye');
    expect(goodbye?.text.length ?? 0).toBeGreaterThan(40);
    expect(harness.element.querySelector('.chat-messages')?.textContent).toContain(
      goodbye!.text.slice(0, 24),
    );

    // F — and it is still there a minute later: only the Close button ends it.
    vi.advanceTimersByTime(60_000);
    harness.fixture.detectChanges();
    expect(harness.element.querySelector('app-chat-feedback')).not.toBeNull();

    harness.element.querySelector<HTMLButtonElement>('.feedback-close')!.click();
    harness.fixture.detectChanges();
    // The window she ended stays where it is, with her goodbye and the way to start again.
    expect(harness.element.querySelector('app-chat-feedback')).toBeNull();
    expect(harness.chat.openSlug()).toBe(alisha.slug);
    expect(harness.element.querySelector('.chat-ended')?.textContent).toContain('gone quiet');
    expect(harness.element.querySelector('.chat-ended-button')).not.toBeNull();
  });

  it('answers a visitor who opened the window from the page, without a session being prepared for it', async () => {
    // Regression: the pages only set their own signal, so the window has to open its own session —
    // otherwise nothing could be sent and she never answered.
    const chat = TestBed.inject(AiModelChatService);
    silenceChatPacing(chat);

    const fixture = TestBed.createComponent(AiModelChatDialog);
    fixture.componentRef.setInput('model', alisha);
    fixture.detectChanges();
    const harness: Harness = { fixture, element: fixture.nativeElement as HTMLElement, chat };

    // The window asked who she is talking to; the visitor answered the form.
    chat.setIdentity(alisha, { name: VISITOR_NAME, avatar: VISITOR_PHOTO });
    fixture.detectChanges();
    await vi.waitFor(() => {
      fixture.detectChanges();
      expect(chat.thinking()).toBe(false);
    });
    fixture.detectChanges();

    await send(harness, 'Are you really there?');

    expect(harness.element.querySelectorAll('.chat-bubble.is-outgoing').length).toBe(1);
    expect(
      harness.element.querySelectorAll('.chat-bubble.is-incoming').length,
    ).toBeGreaterThanOrEqual(5);
    expect(harness.element.textContent).toContain('Alisha Bhattacharya');
    expect(harness.element.textContent).toContain('NeverBeen Multiverse');

    // A — their photograph is beside their own messages, hers beside hers.
    const visitorPhoto = harness.element.querySelector('.chat-row.is-outgoing .chat-row-photo img');
    expect(visitorPhoto?.getAttribute('src')).toBe(VISITOR_PHOTO);
    expect(
      harness.element
        .querySelector('.chat-row:not(.is-outgoing) .chat-row-photo img')
        ?.getAttribute('src'),
    ).toBe(alisha.cover);

    // She keeps the session she opened, so the countdown carries on from where it was.
    expect(chat.canSend()).toBe(true);
    expect(harness.element.querySelector('.chat-clock-value')?.textContent?.trim()).not.toBe(
      '0:00',
    );
  });

  it('closes the conversation for good after the third rude message, and can start a new one', async () => {
    const harness = await openChat();
    await send(harness, 'You are an idiot');
    await send(harness, 'You are an idiot');
    await send(harness, 'You are an idiot');

    expect(harness.element.querySelector('.chat-ended')?.textContent).toContain(
      'She ended this session',
    );
    expect(harness.element.querySelector('.chat-composer')).toBeNull();

    // E, F and K — the close form comes up over the window with her own note folded inside it, and
    // the visitor's Close button is what puts it away.
    expect(harness.element.querySelector('app-chat-feedback')).not.toBeNull();
    expect(harness.element.textContent).toContain('spent');
    expect(
      harness.element.querySelector('.feedback-note blockquote')?.textContent?.length,
    ).toBeGreaterThan(40);
    harness.element.querySelector<HTMLButtonElement>('.feedback-close')!.click();
    harness.fixture.detectChanges();
    expect(harness.element.querySelector('app-chat-feedback')).toBeNull();

    harness.element.querySelector<HTMLButtonElement>('.chat-ended-button')!.click();
    await vi.waitFor(() => {
      harness.fixture.detectChanges();
      // A new session is a new introduction: the form comes back before the composer does.
      expect(harness.element.querySelector('.gate')).not.toBeNull();
    });
    harness.chat.setIdentity(alisha, { name: VISITOR_NAME, avatar: VISITOR_PHOTO });
    await vi.waitFor(() => {
      harness.fixture.detectChanges();
      expect(harness.element.querySelector('.chat-composer')).not.toBeNull();
    });
    expect(harness.element.querySelector('.chat-clock-value')?.textContent?.trim()).toBe(
      '02:00:00',
    );
    // A fresh session starts on nothing but her own introduction.
    expect(harness.element.querySelectorAll('.chat-bubble').length).toBeGreaterThanOrEqual(4);
    expect(harness.element.querySelector('.chat-bubble')?.textContent).toContain('Alisha');
  });
  // ------------------------------------------------------------ the Instagram message menu

  /** The labels of the menu that is open on the window, in the order they are shown. */
  function menuLabels(element: HTMLElement): string[] {
    return Array.from(element.querySelectorAll<HTMLElement>('.chat-action-item')).map((item) =>
      item.textContent!.trim(),
    );
  }

  /** Opens the menu of a bubble with a right click, the way a mouse does it. */
  function rightClick(harness: Harness, bubble: Element): boolean {
    const event = new MouseEvent('contextmenu', {
      bubbles: true,
      cancelable: true,
      clientX: 120,
      clientY: 200,
    });
    const proceed = bubble.dispatchEvent(event);
    harness.fixture.detectChanges();
    return proceed;
  }

  /** Presses a menu action by its label, the way a visitor taps it. */
  function chooseAction(harness: Harness, label: string): void {
    const item = Array.from(
      harness.element.querySelectorAll<HTMLButtonElement>('.chat-action-item'),
    ).find((candidate) => candidate.textContent?.trim() === label);
    expect(item, `menu action "${label}"`).toBeTruthy();
    item!.click();
    harness.fixture.detectChanges();
  }

  /** Her latest bubble, and the visitor's latest bubble. */
  const hersOf = (harness: Harness): HTMLElement =>
    Array.from(harness.element.querySelectorAll<HTMLElement>('.chat-bubble.is-incoming')).at(-1)!;
  const mineOf = (harness: Harness): HTMLElement =>
    Array.from(harness.element.querySelectorAll<HTMLElement>('.chat-bubble.is-outgoing')).at(-1)!;

  it('opens the menu on a right click, with the actions in Instagram order', async () => {
    const harness = await openChat();
    await send(harness, 'Hello');

    const proceed = rightClick(harness, mineOf(harness));
    // The browser's own menu is replaced by the chat's.
    expect(proceed).toBe(false);
    expect(menuLabels(harness.element)).toEqual([
      'Reply',
      'Forward',
      'Copy',
      'Delete for you',
      'Unsend',
      'Pin',
    ]);

    // Escape takes the menu away first.
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    harness.fixture.detectChanges();
    expect(harness.element.querySelector('.chat-action-menu')).toBeNull();
  });

  it('offers no Unsend on her message, and only the actions that fit her words', async () => {
    const harness = await openChat();
    await send(harness, 'Hello');

    rightClick(harness, hersOf(harness));
    expect(menuLabels(harness.element)).toEqual([
      'Reply',
      'Forward',
      'Copy',
      'Delete for you',
      'Pin',
    ]);
  });

  it('opens the same menu after a long press of about half a second, and not before', async () => {
    const harness = await openChat();
    await send(harness, 'Hello');
    const bubble = mineOf(harness);

    bubble.dispatchEvent(
      Object.assign(new Event('pointerdown', { bubbles: true }), {
        clientX: 50,
        clientY: 60,
        button: 0,
        pointerType: 'touch',
      }),
    );
    await new Promise((resolve) => setTimeout(resolve, 250));
    harness.fixture.detectChanges();
    expect(harness.element.querySelector('.chat-action-menu')).toBeNull();

    await vi.waitFor(() => {
      harness.fixture.detectChanges();
      expect(harness.element.querySelector('.chat-action-menu')).not.toBeNull();
    });
    expect(menuLabels(harness.element)).toContain('Unsend');
  });

  it('does not open the menu when the finger moves before the half second is up (a scroll)', async () => {
    const harness = await openChat();
    await send(harness, 'Hello');
    const bubble = mineOf(harness);

    bubble.dispatchEvent(
      Object.assign(new Event('pointerdown', { bubbles: true }), {
        clientX: 50,
        clientY: 60,
        button: 0,
        pointerType: 'touch',
      }),
    );
    bubble.dispatchEvent(
      Object.assign(new Event('pointermove', { bubbles: true }), { clientX: 50, clientY: 110 }),
    );
    await new Promise((resolve) => setTimeout(resolve, 650));
    harness.fixture.detectChanges();
    expect(harness.element.querySelector('.chat-action-menu')).toBeNull();
  });

  it('opens the same menu from the ⋯ beside a message, for the keyboard', async () => {
    const harness = await openChat();
    await send(harness, 'Hello');

    harness.element
      .querySelector<HTMLButtonElement>('.chat-row:not(.is-outgoing) .chat-more-button')!
      .click();
    harness.fixture.detectChanges();
    expect(menuLabels(harness.element)).toContain('Reply');
  });

  it('closes the menu when the visitor presses anywhere else', async () => {
    const harness = await openChat();
    await send(harness, 'Hello');
    rightClick(harness, mineOf(harness));
    expect(harness.element.querySelector('.chat-action-menu')).not.toBeNull();

    document.body.dispatchEvent(new Event('pointerdown', { bubbles: true }));
    harness.fixture.detectChanges();
    expect(harness.element.querySelector('.chat-action-menu')).toBeNull();
  });

  it('replies over a message chosen from the menu', async () => {
    const harness = await openChat();
    await send(harness, 'Tell me about your city');

    rightClick(harness, hersOf(harness));
    chooseAction(harness, 'Reply');

    expect(harness.element.querySelector('.chat-action-menu')).toBeNull();
    expect(harness.element.querySelector('.chat-reply-strip')?.textContent).toContain(
      'Replying to Alisha',
    );
  });

  it('copies the words of a message to the clipboard', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } });
    try {
      const harness = await openChat();
      await send(harness, 'Copy this exact line');

      rightClick(harness, mineOf(harness));
      chooseAction(harness, 'Copy');

      await vi.waitFor(() => expect(writeText).toHaveBeenCalledWith('Copy this exact line'));
      harness.fixture.detectChanges();
      expect(harness.element.querySelector('.chat-toast')?.textContent).toContain('Message copied');
    } finally {
      delete (navigator as unknown as { clipboard?: unknown }).clipboard;
    }
  });

  it('deletes a message for the visitor only: it leaves the window, and the model keeps it', async () => {
    const harness = await openChat();
    await send(harness, 'Take this back');
    const before = harness.element.querySelectorAll('.chat-bubble.is-outgoing').length;

    rightClick(harness, mineOf(harness));
    chooseAction(harness, 'Delete for you');

    expect(harness.element.querySelectorAll('.chat-bubble.is-outgoing').length).toBe(before - 1);
    expect(harness.element.textContent).not.toContain('Take this back');
    const kept = harness.chat
      .sessionOf(alisha.slug)!
      .messages.find((message) => message.text === 'Take this back');
    expect(kept?.deletedForYou).toBe(true);
  });

  it('unsends a message inside two minutes, and takes the Unsend action away after that', async () => {
    const harness = await openChat();
    await send(harness, 'I wrote this by mistake');

    rightClick(harness, mineOf(harness));
    chooseAction(harness, 'Unsend');

    const bubble = mineOf(harness);
    expect(bubble.querySelector('.chat-unsent')?.textContent).toContain('You unsent a message');
    expect(bubble.textContent).not.toContain('I wrote this by mistake');

    // A message from two minutes ago can no longer be unsent.
    await send(harness, 'Sent long ago');
    const old = harness.chat
      .sessionOf(alisha.slug)!
      .messages.filter((message) => message.author === 'user')
      .at(-1)!;
    old.at = Date.now() - 2 * 60 * 1000 - 1000;
    rightClick(harness, mineOf(harness));
    expect(menuLabels(harness.element)).not.toContain('Unsend');
  });

  it('pins a message to the top of the chat, and unpins it again', async () => {
    const harness = await openChat();
    await send(harness, 'Remember this');

    rightClick(harness, mineOf(harness));
    chooseAction(harness, 'Pin');

    const banner = harness.element.querySelector<HTMLButtonElement>('.chat-pinned');
    expect(banner).not.toBeNull();
    expect(banner?.textContent).toContain('Pinned message');
    expect(banner?.textContent).toContain('Remember this');
    expect(harness.element.querySelector('.chat-pin-note')).not.toBeNull();

    rightClick(harness, mineOf(harness));
    chooseAction(harness, 'Unpin');
    expect(harness.element.querySelector('.chat-pinned')).toBeNull();
  });

  it('forwards a message to another model: a sheet lists the others, and her chat gets the words', async () => {
    const harness = await openChat();
    await send(harness, 'Hello');
    const forwarded = vi.fn();
    const subscription = harness.fixture.componentInstance.forwardTo.subscribe(forwarded);

    rightClick(harness, mineOf(harness));
    chooseAction(harness, 'Forward');

    const sheet = harness.element.querySelector<HTMLElement>('.chat-forward')!;
    expect(sheet).not.toBeNull();
    // Every model but this one.
    expect(sheet.querySelectorAll('.chat-forward-target').length).toBe(aiModelProfiles.length - 1);
    expect(
      sheet.querySelector('.chat-forward-target[aria-label="Forward to Alisha Bhattacharya"]'),
    ).toBeNull();

    const target = aiModelProfiles.find((model) => model.slug !== alisha.slug)!;
    sheet
      .querySelector<HTMLButtonElement>(
        `.chat-forward-target[aria-label="Forward to ${target.name}"]`,
      )!
      .click();
    harness.fixture.detectChanges();

    expect(forwarded).toHaveBeenCalledWith(expect.objectContaining({ slug: target.slug }));
    expect(harness.chat.takeForward(target.slug)).toBe('Hello');
    expect(harness.element.querySelector('.chat-forward')).toBeNull();
    subscription.unsubscribe();
  });

  it('puts a forwarded message in the composer of the chat it is sent to, marked as forwarded', async () => {
    const chat = TestBed.inject(AiModelChatService);
    silenceChatPacing(chat);
    chat.stageForward(alisha.slug, 'Have a look at this brief');

    const fixture = TestBed.createComponent(AiModelChatDialog);
    fixture.componentRef.setInput('model', alisha);
    fixture.detectChanges();
    const harness: Harness = { fixture, element: fixture.nativeElement as HTMLElement, chat };
    chat.setIdentity(alisha, { name: VISITOR_NAME, avatar: VISITOR_PHOTO });
    await vi.waitFor(() => {
      fixture.detectChanges();
      expect(chat.thinking()).toBe(false);
    });
    fixture.detectChanges();

    const textarea = harness.element.querySelector<HTMLTextAreaElement>('.chat-input')!;
    expect(textarea.value).toBe('Have a look at this brief');

    await send(harness, 'Have a look at this brief');
    const sent = mineOf(harness);
    expect(sent.querySelector('.chat-forwarded')?.textContent).toContain('Forwarded');
  });

  it('marks a Premium model with the blue tick in the header, the profile and every response', async () => {
    const harness = await openChat(alisha);
    expect(harness.element.querySelector('.chat-bar-name .model-verified-tick')).not.toBeNull();
    expect(harness.element.querySelector('#chat-model-name .model-verified-tick')).not.toBeNull();

    await send(harness, 'Hello, who are you?');
    const replies = Array.from(harness.element.querySelectorAll('.chat-row:not(.is-outgoing)'));
    expect(replies.length).toBeGreaterThan(0);
    for (const row of replies) {
      const tag = row.querySelector('.chat-author-tag');
      expect(tag?.querySelector('b')?.textContent?.trim()).toBe(alisha.name);
      expect(tag?.querySelector('.model-verified-tick')).not.toBeNull();
    }
    expect(harness.element.querySelector('.chat-row.is-outgoing .chat-author-tag')).toBeNull();
  });

  it('shows no blue tick for a Free model', async () => {
    const ordinary = aiModelProfiles.find((model) => !requiresRegisteredChat(model))!;
    const harness = await openChat(ordinary);
    expect(harness.element.querySelector('.model-verified-tick')).toBeNull();
    expect(harness.element.querySelector('.chat-author-tag')).toBeNull();
  });
});
