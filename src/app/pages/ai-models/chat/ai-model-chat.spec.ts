import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AiModelChatService } from '../../../services/ai-model-chat.service';
import { aiModelProfiles } from '../ai-model-data';
import { AiModelChatDialog } from './ai-model-chat';

const alisha = aiModelProfiles.find((model) => model.slug === 'alisha-bhattacharya')!;

interface Harness {
  fixture: ComponentFixture<AiModelChatDialog>;
  element: HTMLElement;
  chat: AiModelChatService;
}

async function openChat(model = alisha): Promise<Harness> {
  const chat = TestBed.inject(AiModelChatService);
  chat.pacing.thinkingMs = 0;
  chat.pacing.revealMs = 0;
  chat.openChat(model);

  const fixture = TestBed.createComponent(AiModelChatDialog);
  fixture.componentRef.setInput('model', model);
  fixture.detectChanges();
  return { fixture, element: fixture.nativeElement as HTMLElement, chat };
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

    const outgoing = harness.element.querySelectorAll('.chat-bubble.is-outgoing');
    const incoming = harness.element.querySelectorAll('.chat-bubble.is-incoming');
    expect(outgoing.length).toBe(1);
    expect(outgoing[0].textContent).toContain('Hello, who are you?');
    expect(incoming.length).toBe(1);
    expect(incoming[0].textContent).toContain('AI model agent');

    // Her bubble is the light grey one, the visitor's the dark violet one.
    expect(incoming[0].classList.contains('is-incoming')).toBe(true);
    expect(outgoing[0].classList.contains('is-outgoing')).toBe(true);

    // The welcome card and its starter questions are gone once the conversation has started.
    expect(harness.element.querySelector('.chat-welcome')).toBeNull();
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
    expect(tray.length).toBe(6);

    harness.element.querySelectorAll<HTMLButtonElement>('.chat-reaction-option')[1].click();
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

  it('attaches a document to a message and shows it in the bubble', async () => {
    const harness = await openChat();
    const input = harness.element.querySelector<HTMLInputElement>('input[accept*=".pdf"]')!;
    const file = new File(['brief'], 'creative-brief.pdf', { type: 'application/pdf' });

    Object.defineProperty(input, 'files', { value: [file], configurable: true });
    input.dispatchEvent(new Event('change'));
    harness.fixture.detectChanges();

    expect(harness.element.querySelector('.chat-draft')?.textContent).toContain(
      'creative-brief.pdf',
    );

    await send(harness, 'Here is the brief');
    const bubble = harness.element.querySelector('.chat-bubble.is-outgoing')!;
    expect(bubble.querySelector('.chat-bubble-file')?.textContent).toContain('creative-brief.pdf');
  });

  it('closes the window on Escape and on the backdrop', async () => {
    const harness = await openChat();
    const closes: number[] = [];
    harness.fixture.componentInstance.closed.subscribe(() => closes.push(1));

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    harness.fixture.detectChanges();
    expect(closes.length).toBe(1);
    expect(harness.chat.openSlug()).toBeNull();

    const second = await openChat();
    const backdrop = second.element.querySelector('.chat-backdrop')!;
    backdrop.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    second.fixture.detectChanges();
    expect(second.chat.openSlug()).toBeNull();
  });

  it('shows the ultra-modern reminder in the middle of the chat when fifteen minutes are left', async () => {
    vi.useFakeTimers();
    const harness = await openChat();
    vi.advanceTimersByTime(105 * 60 * 1000 + 1000);
    harness.fixture.detectChanges();

    const reminder = harness.element.querySelector('.chat-reminder');
    expect(reminder?.textContent).toContain('15 minutes remaining');
    expect(harness.element.querySelector('.chat-clock-value')?.textContent?.trim()).toBe('14:59');
  });

  it('opens her two-hour session by itself and starts the clock, with no help from the page', async () => {
    vi.useFakeTimers();
    const chat = TestBed.inject(AiModelChatService);
    chat.pacing.thinkingMs = 0;
    chat.pacing.revealMs = 0;

    // A page only mounts the window; the session, the clock and the reminders are its own job.
    const fixture = TestBed.createComponent(AiModelChatDialog);
    fixture.componentRef.setInput('model', alisha);
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;

    expect(chat.openSlug()).toBe(alisha.slug);
    expect(chat.session()?.slug).toBe(alisha.slug);
    expect(element.querySelector('.chat-clock-value')?.textContent?.trim()).toBe('02:00:00');

    vi.advanceTimersByTime(1000);
    fixture.detectChanges();
    expect(element.querySelector('.chat-clock-value')?.textContent?.trim()).toBe('01:59:59');

    vi.advanceTimersByTime(30_000);
    fixture.detectChanges();
    expect(element.querySelector('.chat-clock-value')?.textContent?.trim()).toBe('01:59:29');
  });

  it('answers a visitor who opened the window from the page, without a session being prepared for it', async () => {
    // Regression: the pages only set their own signal, so the window has to open its own session —
    // otherwise nothing could be sent and she never answered.
    const chat = TestBed.inject(AiModelChatService);
    chat.pacing.thinkingMs = 0;
    chat.pacing.revealMs = 0;

    const fixture = TestBed.createComponent(AiModelChatDialog);
    fixture.componentRef.setInput('model', alisha);
    fixture.detectChanges();
    const harness: Harness = { fixture, element: fixture.nativeElement as HTMLElement, chat };

    await send(harness, 'Are you really there?');

    expect(harness.element.querySelectorAll('.chat-bubble.is-outgoing').length).toBe(1);
    expect(harness.element.querySelectorAll('.chat-bubble.is-incoming').length).toBe(1);
    expect(harness.element.textContent).toContain('Alisha Bhattacharya');
    expect(harness.element.textContent).toContain('NeverBeen Multiverse');

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

    harness.element.querySelector<HTMLButtonElement>('.chat-ended-button')!.click();
    await vi.waitFor(() => {
      harness.fixture.detectChanges();
      expect(harness.element.querySelector('.chat-composer')).not.toBeNull();
    });
    expect(harness.element.querySelector('.chat-clock-value')?.textContent?.trim()).toBe(
      '02:00:00',
    );
    expect(harness.element.querySelector('.chat-welcome')).not.toBeNull();
  });
});
