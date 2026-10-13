import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { aiModelProfiles } from '../pages/ai-models/ai-model-data';
import { AI_CHAT_SESSION_MS } from '../pages/ai-models/chat/chat-types';
import {
  AI_CHAT_STORAGE_KEY,
  AiModelChatService,
  chatReminderText,
  formatRemaining,
} from './ai-model-chat.service';

const alisha = aiModelProfiles.find((model) => model.slug === 'alisha-bhattacharya')!;

/** The studio with no OpenAI key: every request to the chat endpoint fails, so her own engine answers. */
function withoutStudioAi(): void {
  vi.stubGlobal(
    'fetch',
    vi
      .fn()
      .mockResolvedValue(
        new Response(JSON.stringify({ ok: false, error: 'ai-unavailable' }), { status: 503 }),
      ),
  );
}

function service(): AiModelChatService {
  const instance = TestBed.inject(AiModelChatService);
  instance.pacing.thinkingMs = 0;
  instance.pacing.revealMs = 0;
  return instance;
}

function transcript(chat: AiModelChatService): string {
  return (chat.session()?.messages ?? []).map((message) => message.text).join('\n');
}

describe('AiModelChatService', () => {
  beforeEach(() => {
    sessionStorage.clear();
    withoutStudioAi();
    TestBed.configureTestingModule({});
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
    sessionStorage.clear();
  });

  it('counts the two hours down in the top-right corner format', () => {
    expect(formatRemaining(7_200_000)).toBe('02:00:00');
    expect(formatRemaining(3_599_000)).toBe('59:59');
    expect(formatRemaining(59_000)).toBe('0:59');
    expect(formatRemaining(-5)).toBe('0:00');
  });

  it('starts a two-hour session, introduces her on the first message and keeps the transcript', async () => {
    const chat = service();
    chat.openChat(alisha);

    const session = chat.session()!;
    expect(session.endsAt - session.startedAt).toBe(AI_CHAT_SESSION_MS);
    expect(chat.canSend()).toBe(true);
    expect(chat.timeLeftLabel()).toBe('02:00:00');

    await chat.sendMessage(alisha, 'Hello there');

    const messages = chat.session()!.messages;
    expect(messages.filter((message) => message.author === 'user')).toHaveLength(1);
    const hers = messages.filter((message) => message.author === 'model');
    expect(hers).toHaveLength(1);
    expect(hers[0].text).toContain('Alisha Bhattacharya');
    expect(hers[0].text).toContain('NeverBeen Multiverse');
    expect(hers[0].pending).toBe(false);
    expect(chat.session()!.introduced).toBe(true);
  });

  it('remembers the session across a refresh of the page', async () => {
    const chat = service();
    chat.openChat(alisha);
    await chat.sendMessage(alisha, 'Who are you?');
    chat.closeChat();

    // A second service instance stands in for a reloaded page: it restores this tab's session.
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    const restored = service();
    const session = restored.sessionOf(alisha.slug)!;
    expect(session.messages.length).toBeGreaterThan(2);
    expect(session.introduced).toBe(true);
    expect(session.endsAt).toBeGreaterThan(Date.now());

    restored.openChat(alisha);
    expect(transcript(restored)).toContain('Alisha Bhattacharya');
    expect(restored.timeLeftLabel()).toMatch(/^0[12]:/);
  });

  it('reminds her visitor at 15, 10, 5 and 1 minutes, then closes on the two-hour limit', async () => {
    vi.useFakeTimers();
    const chat = service();
    chat.openChat(alisha);

    vi.advanceTimersByTime(105 * 60 * 1000 + 1000); // 1 h 45 min in: fifteen minutes left
    let reminders = chat.session()!.messages.filter((message) => message.kind === 'reminder');
    expect(reminders).toHaveLength(1);
    expect(reminders[0].text).toContain('15 minutes remaining');
    expect(chat.session()!.reminders).toEqual([15]);
    expect(chat.timeLeftLabel()).toBe('14:59');

    vi.advanceTimersByTime(5 * 60 * 1000);
    vi.advanceTimersByTime(5 * 60 * 1000);
    vi.advanceTimersByTime(4 * 60 * 1000);
    reminders = chat.session()!.messages.filter((message) => message.kind === 'reminder');
    expect(reminders.map((message) => message.text)).toEqual([
      chatReminderText(15),
      chatReminderText(10),
      chatReminderText(5),
      chatReminderText(1),
    ]);
    expect(chat.session()!.reminders).toEqual([15, 10, 5, 1]);

    vi.advanceTimersByTime(61 * 1000);
    expect(chat.session()!.closed).toBe('timeout');
    expect(chat.canSend()).toBe(false);
    expect(transcript(chat)).toContain('Our two hours are up');
  });

  it('warns once, twice, and then says goodbye and closes the chat (requirement B)', async () => {
    const chat = service();
    chat.openChat(alisha);

    await chat.sendMessage(alisha, 'You are an idiot');
    expect(chat.session()!.strikes).toBe(1);
    expect(chat.session()!.closed).toBe('');
    expect(transcript(chat)).toContain('I will not be spoken to like that');

    await chat.sendMessage(alisha, 'You are an idiot');
    expect(chat.session()!.strikes).toBe(2);
    expect(chat.session()!.closed).toBe('');

    await chat.sendMessage(alisha, 'You are an idiot');
    expect(chat.session()!.strikes).toBe(3);
    expect(chat.session()!.closed).toBe('blocked');
    expect(transcript(chat)).toContain('Goodbye');
    expect(chat.canSend()).toBe(false);

    // A fresh session starts clean, with a new two-hour clock.
    chat.startNewSession(alisha);
    expect(chat.session()!.strikes).toBe(0);
    expect(chat.session()!.closed).toBe('');
    expect(chat.session()!.introduced).toBe(false);
  });

  it('lets the visitor react to her message, and answers with the same feeling back', async () => {
    const chat = service();
    chat.openChat(alisha);
    await chat.sendMessage(alisha, 'Hello');

    const herMessage = chat.session()!.messages.find((message) => message.author === 'model')!;
    chat.reactToMessage(alisha, herMessage.id, 'love');

    expect(herMessage.reaction).toBe('love');
    expect(herMessage.reactionBy).toBe('user');

    const answer = chat
      .session()!
      .messages.filter((message) => message.author === 'model')
      .at(-1)!;
    expect(answer.text).toContain('❤️');
    const userMessage = chat.session()!.messages.find((message) => message.author === 'user')!;
    expect(userMessage.reaction).toBe('love');
    expect(userMessage.reactionBy).toBe('model');
  });

  it('answers through the studio’s OpenAI service when it is configured, with sources', async () => {
    const encoder = new TextEncoder();
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(
          encoder.encode(
            'data: {"sources":[{"title":"Google result","url":"https://example.com"}]}\n\n',
          ),
        );
        controller.enqueue(encoder.encode('data: {"delta":"Delhi"}\n\n'));
        controller.enqueue(
          encoder.encode('data: {"delta":", of course."}\n\ndata: {"done":true}\n\n'),
        );
        controller.close();
      },
    });
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue(
          new Response(stream, { status: 200, headers: { 'content-type': 'text/event-stream' } }),
        ),
    );

    const chat = service();
    chat.openChat(alisha);
    await chat.sendMessage(alisha, 'Hello');
    await chat.sendMessage(alisha, 'What is the capital of India?');

    const answer = chat
      .session()!
      .messages.filter((message) => message.author === 'model')
      .at(-1)!;
    expect(answer.text).toBe('Delhi, of course.');
    expect(answer.sources).toEqual([{ title: 'Google result', url: 'https://example.com' }]);
    expect(answer.intent).toBe('openai');
  });

  it('falls back to her own engine when the studio has no key, and remembers that', async () => {
    const chat = service();
    chat.openChat(alisha);
    await chat.sendMessage(alisha, 'Hello');
    await chat.sendMessage(alisha, 'What is the capital of India?');

    expect(chat.remoteUnavailable()).toBe(true);
    const answer = chat
      .session()!
      .messages.filter((message) => message.author === 'model')
      .at(-1)!;
    expect(answer.text).toContain('Delhi');
    expect(chat.session()!.messages.some((message) => message.kind === 'message')).toBe(true);
  });

  it('keeps the session in this tab’s storage, without picture previews when they are large', async () => {
    const chat = service();
    chat.openChat(alisha);
    chat.setDraftAttachment({
      kind: 'photo',
      name: 'huge.jpg',
      type: 'image/jpeg',
      size: 400_000,
      source: 'upload',
      preview: `data:image/jpeg;base64,${'A'.repeat(200_000)}`,
    });
    await chat.sendMessage(alisha, 'Look at this');

    const stored = sessionStorage.getItem(AI_CHAT_STORAGE_KEY);
    expect(stored).toBeTruthy();
    const parsed = JSON.parse(stored!) as { sessions: Record<string, { messages: unknown[] }> };
    expect(parsed.sessions[alisha.slug].messages.length).toBeGreaterThan(2);
    // The preview itself is dropped: a session must never fill the tab's storage.
    expect(stored!.length).toBeLessThan(200_000);
  });

  it('ignores a send when no window is open or the session has ended', async () => {
    const chat = service();
    chat.openChat(alisha);
    chat.closeChat();
    await chat.sendMessage(alisha, 'Are you there?');
    expect(chat.sessionOf(alisha.slug)!.messages).toHaveLength(1); // just the studio notice
  });
});
