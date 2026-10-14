import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AiModelChatService } from '../../../services/ai-model-chat.service';
import { silenceChatPacing } from '../../../services/ai-model-chat.testing';
import { aiModelProfiles } from '../ai-model-data';
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

    const viewProfile = element.querySelector<HTMLAnchorElement>('.chat-view-profile')!;
    expect(viewProfile.textContent).toContain('View Profile');
    expect(viewProfile.getAttribute('href')).toBe('/ai-models/alisha-bhattacharya');

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
    expect(sheet.querySelector('.chat-info-profile')?.getAttribute('href')).toBe(
      '/ai-models/alisha-bhattacharya',
    );

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

  it('asks before a window that has started goes: Escape, the backdrop and ✕ all open the close form (requirement E)', async () => {
    const harness = await openChat();
    const closes: number[] = [];
    harness.fixture.componentInstance.closed.subscribe(() => closes.push(1));

    // Escape — a chat that has started is asked about before the window goes.
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    harness.fixture.detectChanges();
    expect(harness.element.querySelector('app-chat-feedback')).not.toBeNull();
    expect(closes.length).toBe(0);
    expect(harness.chat.openSlug()).toBe(alisha.slug);

    // The Close button at the end of the form is the way out — for the form and the window with it.
    harness.element.querySelector<HTMLButtonElement>('.feedback-close')!.click();
    harness.fixture.detectChanges();
    expect(closes.length).toBe(1);
    expect(harness.chat.openSlug()).toBeNull();

    // ✕ — the same question, the same answer.
    const second = await openChat();
    second.element.querySelector<HTMLButtonElement>('.chat-close')!.click();
    second.fixture.detectChanges();
    expect(second.element.querySelector('app-chat-feedback')).not.toBeNull();
    second.element.querySelector<HTMLButtonElement>('.feedback-close')!.click();
    second.fixture.detectChanges();
    expect(second.chat.openSlug()).toBeNull();

    // The backdrop — and there is nothing to answer with, so the form closes on its Close button
    // and the window behind it closes too.
    const third = await openChat();
    third.element
      .querySelector('.chat-backdrop')!
      .dispatchEvent(new MouseEvent('click', { bubbles: true }));
    third.fixture.detectChanges();
    expect(third.element.querySelector('app-chat-feedback')).not.toBeNull();
    third.element.querySelector<HTMLButtonElement>('.feedback-close')!.click();
    third.fixture.detectChanges();
    expect(third.chat.openSlug()).toBeNull();
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
});
