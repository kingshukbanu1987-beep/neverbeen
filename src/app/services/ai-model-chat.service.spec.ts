import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { aiModelProfiles } from '../pages/ai-models/ai-model-data';
import { ChatIdentity } from '../pages/ai-models/chat/chat-identity';
import { AI_CHAT_NUDGE_LIMIT, AI_CHAT_SESSION_MS } from '../pages/ai-models/chat/chat-types';
import {
  AI_CHAT_STORAGE_KEY,
  AiModelChatService,
  chatReminderText,
  formatRemaining,
} from './ai-model-chat.service';
import { silenceChatPacing } from './ai-model-chat.testing';

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

/** A one-pixel photograph, standing in for what the form reduces to about 100 KB. */
const VISITOR_PHOTO =
  'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwcJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/wAALCAABAAEBAREA/8QAFAABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFBEBAAAAAAAAAAAAAAAAAAAAAP/aAAwDAQACEQMRAD8AmwA/9k=';

const VISITOR: ChatIdentity = { name: 'Rahul Verma', avatar: VISITOR_PHOTO };

function service(): AiModelChatService {
  const instance = TestBed.inject(AiModelChatService);
  silenceChatPacing(instance);
  return instance;
}

/** Opens her window and fills in the form in front of it — the way the page's window does. */
function open(chat: AiModelChatService, model = alisha): void {
  chat.openChat(model);
  chat.setIdentity(model, VISITOR);
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

  it('opens the two hours when the visitor introduces themselves, and speaks first (requirement A)', async () => {
    const chat = service();
    chat.openChat(alisha);

    // The window holds nothing but the studio's privacy notice: nobody has told her who she is
    // talking to, so she has not said a word.
    expect(chat.identified()).toBe(false);
    expect(chat.session()!.messages).toHaveLength(1);
    await chat.sendMessage(alisha, 'Are you there?');
    expect(chat.session()!.messages).toHaveLength(1);
    expect(chat.notice()).toContain('name and one photograph');

    const asked = Date.now();
    chat.setIdentity(alisha, VISITOR);

    const session = chat.session()!;
    expect(chat.identified()).toBe(true);
    expect(chat.visitorName()).toBe('Rahul Verma');
    expect(session.identity!.avatar).toBe(VISITOR_PHOTO);
    expect(session.startedAt).toBeGreaterThanOrEqual(asked);
    expect(session.endsAt - session.startedAt).toBe(AI_CHAT_SESSION_MS);
    expect(chat.canSend()).toBe(true);
    expect(chat.timeLeftLabel()).toBe('02:00:00');

    // She speaks first — and she speaks to Rahul, not to a window (the first name only), in the
    // several messages her age and her country would send (requirement F of the second brief).
    const opening = session.messages.filter((message) => message.intent === 'opening');
    expect(opening.length).toBeGreaterThanOrEqual(4);
    expect(opening[0].text).toContain('Rahul');
    expect(opening[0].text).not.toContain('Verma');
    expect(opening.every((message) => !message.pending)).toBe(true);
    expect(opening.map((message) => message.text).join(' ')).toContain('NeverBeen Multiverse');
    expect(chat.thinking()).toBe(false);

    await chat.sendMessage(alisha, 'Hello there');

    const messages = chat.session()!.messages;
    expect(messages.filter((message) => message.author === 'user')).toHaveLength(1);
    const hers = messages.filter((message) => message.author === 'model');
    expect(hers).toHaveLength(opening.length + 1);
    expect(hers[hers.length - 1].text.length).toBeGreaterThan(0);
    expect(hers[hers.length - 1].pending).toBe(false);

    // A second introduction would be a duplicate, and the form is only asked for once.
    chat.setIdentity(alisha, { name: 'Somebody Else', avatar: VISITOR_PHOTO });
    expect(chat.visitorName()).toBe('Rahul Verma');
    expect(chat.session()!.messages).toHaveLength(messages.length);
  });

  it('keeps the conversation going when the visitor goes quiet (requirement H)', async () => {
    vi.useFakeTimers();
    const chat = service();
    open(chat);

    await chat.sendMessage(alisha, 'Tell me about your day');
    const before = chat.session()!.messages.length;

    // Ten seconds is not enough; somewhere inside the next ten she says something else herself.
    vi.advanceTimersByTime(10_000);
    expect(chat.session()!.nudges).toBe(0);

    vi.advanceTimersByTime(10_000);
    const nudges = chat.session()!.messages.filter((message) => message.intent === 'idle');
    expect(nudges.length).toBeGreaterThan(0);
    expect(chat.session()!.messages.length).toBeGreaterThan(before);
    expect(nudges[0].text).toMatch(/\?|I /);
    expect(nudges[0].pending).toBe(false);

    // She never becomes a machine gun: the session caps how many times she reaches out.
    vi.advanceTimersByTime(10 * 60 * 1000);
    expect(chat.session()!.nudges).toBeLessThanOrEqual(AI_CHAT_NUDGE_LIMIT);
    expect(
      chat.session()!.messages.filter((message) => message.intent === 'idle').length,
    ).toBeLessThanOrEqual(AI_CHAT_NUDGE_LIMIT);
  });

  it('holds the typing indicator for the time a person needs, then lands the answer whole (requirement A)', async () => {
    vi.useFakeTimers();
    const chat = TestBed.inject(AiModelChatService);
    silenceChatPacing(chat);
    open(chat);
    // A message of any length takes four and a half seconds to type here: the test is about what
    // the window does during the wait, not about the length of her answer.
    Object.assign(chat.pacing, { perCharMs: 0, floorMs: 4_500, ceilingMs: 4_500 });

    const sending = chat.sendMessage(alisha, 'What is the capital of India?');

    await vi.advanceTimersByTimeAsync(4_300);
    expect(chat.thinking()).toBe(true);
    const waiting = chat.session()!.messages.at(-1)!;
    expect(waiting.author).toBe('model');
    expect(waiting.pending).toBe(true);
    // The answer is written and ready — and the window is showing none of it. No first word, no
    // letter-by-letter reveal: only the typing indicator.
    expect(waiting.revealedChars).toBe(0);
    expect(waiting.text.length).toBeGreaterThan(0);

    await vi.advanceTimersByTimeAsync(900);
    await sending;
    expect(chat.thinking()).toBe(false);
    const answer = chat.session()!.messages.at(-1)!;
    expect(answer.pending).toBe(false);
    expect(answer.revealedChars).toBe(answer.text.length);
    expect(answer.text).toContain('Delhi');
  });

  it('introduces herself message by message, three to five seconds after the form is filled in (requirement F)', async () => {
    vi.useFakeTimers();
    const chat = TestBed.inject(AiModelChatService);
    silenceChatPacing(chat);
    chat.openChat(alisha);
    Object.assign(chat.pacing, {
      floorMs: 1_000,
      ceilingMs: 1_000,
      gapMinMs: 2_000,
      gapMaxMs: 2_000,
      introMinMs: 3_000,
      introMaxMs: 3_000,
    });

    chat.setIdentity(alisha, VISITOR);
    // Only the studio's notice: she has not started yet.
    expect(chat.session()!.messages).toHaveLength(1);
    expect(chat.thinking()).toBe(true);

    await vi.advanceTimersByTimeAsync(2_900);
    expect(chat.session()!.messages).toHaveLength(1);

    await vi.advanceTimersByTimeAsync(1_200); // 4.1 s: the first message of the introduction
    expect(chat.session()!.messages).toHaveLength(2);
    expect(chat.session()!.messages[1].text).toContain('Rahul');
    expect(chat.session()!.messages[1].pending).toBe(false);

    // The next message waits out its two-second gap, types, and lands on its own.
    await vi.advanceTimersByTimeAsync(3_000);
    expect(chat.session()!.messages).toHaveLength(3);

    await vi.advanceTimersByTimeAsync(30_000);
    const her = chat
      .session()!
      .messages.filter((message) => message.author === 'model' && message.intent === 'opening');
    expect(her.length).toBeGreaterThanOrEqual(4);
    expect(her.length).toBeLessThanOrEqual(5);
    expect(her.every((message) => !message.pending)).toBe(true);
    expect(her.every((message) => message.revealedChars === message.text.length)).toBe(true);
  });

  it('sends a long answer as several messages, one after the other (requirement C)', async () => {
    const chat = service();
    open(chat);

    // Short messages force her answer to be split the way a talkative person splits one.
    chat.pacing.bubbleMaxChars = 40;
    await chat.sendMessage(alisha, 'Tell me about the studio');

    const answers = chat
      .session()!
      .messages.filter((message) => message.author === 'model' && message.intent !== 'opening');
    expect(answers.length).toBeGreaterThanOrEqual(2);
    for (const message of answers) {
      expect(message.pending).toBe(false);
      expect(message.revealedChars).toBe(message.text.length);
      expect(message.text.length).toBeGreaterThan(0);
    }
    // Nothing is answered in one wall of text when the visitor is watching.
    const said = answers.map((message) => message.text).join(' ');
    expect(said.length).toBeGreaterThan(answers[0].text.length);
  });

  it('sometimes waits before typing and sometimes stops mid-thought (requirement D)', async () => {
    vi.useFakeTimers();
    const chat = TestBed.inject(AiModelChatService);
    silenceChatPacing(chat);
    open(chat);
    Object.assign(chat.pacing, {
      perCharMs: 0,
      floorMs: 2_000,
      ceilingMs: 2_000,
      awayChance: 1,
      awayMinMs: 4_000,
      awayMaxMs: 4_000,
      midPauseChance: 1,
      midPauseMinMs: 2_000,
      midPauseMaxMs: 2_000,
    });
    const before = chat.session()!.messages.length;

    const sending = chat.sendMessage(alisha, 'Where are you from?');

    // She is not at her phone yet: nothing on screen but the visitor's own message.
    await vi.advanceTimersByTimeAsync(3_900);
    expect(chat.session()!.messages).toHaveLength(before + 1);
    expect(chat.session()!.messages.at(-1)!.author).toBe('user');

    await vi.advanceTimersByTimeAsync(200); // 4.1 s: she picked the phone up and is typing
    const typing = chat.session()!.messages.at(-1)!;
    expect(typing.author).toBe('model');
    expect(typing.pending).toBe(true);
    expect(typing.revealedChars).toBe(0);

    // She stops mid-thought a second in: the typing indicator goes with her.
    await vi.advanceTimersByTimeAsync(1_000);
    expect(chat.session()!.messages.at(-1)!.author).toBe('user');

    await vi.advanceTimersByTimeAsync(1_500);
    expect(chat.session()!.messages.at(-1)!.author).toBe('user');

    await vi.advanceTimersByTimeAsync(700); // she picks the thought up again
    expect(chat.session()!.messages.at(-1)!.author).toBe('model');
    expect(chat.session()!.messages.at(-1)!.pending).toBe(true);

    await vi.advanceTimersByTimeAsync(1_200);
    await sending;
    expect(chat.session()!.messages.at(-1)!.pending).toBe(false);
  });

  it('never tells the visitor where an answer came from, and never speaks like software (requirements B and L)', async () => {
    const chat = service();
    open(chat);

    await chat.sendMessage(alisha, 'What is the capital of Japan?');
    await chat.sendMessage(alisha, 'Who is the president of the United States?');
    await chat.sendMessage(alisha, 'Tell me about the studio');
    await chat.sendMessage(alisha, 'Send me a selfie');

    const said = chat
      .session()!
      .messages.filter((message) => message.author === 'model' && message.intent !== 'opening')
      .map((message) => message.text)
      .join(' ');
    expect(said.length).toBeGreaterThan(0);
    expect(said).not.toMatch(/\b(?:google|openai|chatgpt|gpt|api|bing|search engine)\b/i);
    expect(said).not.toMatch(/\b(?:neverbeen) (?:ai|api|engine|service|knowledge base)\b/i);
    expect(said).not.toContain('from my biography');
    expect(said).not.toContain('I am an AI model');
    expect(said).not.toContain('As an AI');
  });

  it('answers a selfie request with one of her own photographs (requirements E and F)', async () => {
    const chat = service();
    open(chat);

    await chat.sendMessage(alisha, 'Send me a selfie please');
    const shot = chat
      .session()!
      .messages.filter((message) => message.author === 'model')
      .at(-1)!;
    expect(shot.attachment?.selfie).toBe(true);
    expect(shot.attachment?.kind).toBe('photo');
    expect(shot.attachment?.preview.length).toBeGreaterThan(0); // one of her own album frames
    // It came off a phone, not out of the studio: the caption says where and what went wrong.
    expect(shot.text.length).toBeGreaterThan(10);

    // A photograph from the visitor is answered, and their own picture stays beside their message.
    chat.setDraftAttachment({
      kind: 'photo',
      name: 'me.jpg',
      type: 'image/jpeg',
      size: 1_024,
      source: 'upload',
      preview: VISITOR_PHOTO,
    });
    await chat.sendMessage(alisha, 'Look at this');
    const reply = chat
      .session()!
      .messages.filter((message) => message.author === 'model')
      .at(-1)!;
    expect(reply.intent).toBe('attachment:photo');
    expect(reply.text).toContain('me.jpg');
  });

  it('asks the visitor for a contract herself once the chat has warmed up (requirement G)', async () => {
    const chat = service();
    open(chat);

    for (let sent = 1; sent <= 5; sent += 1) await chat.sendMessage(alisha, `Message ${sent}`);

    const pitches = chat.session()!.messages.filter((message) => message.intent === 'contract');
    expect(pitches).toHaveLength(1);
    expect(chat.session()!.pitches).toBe(1);
    expect(pitches[0].text.length).toBeGreaterThan(20);

    for (let sent = 6; sent <= 13; sent += 1) await chat.sendMessage(alisha, `Message ${sent}`);
    expect(chat.session()!.pitches).toBe(2);
    expect(
      chat.session()!.messages.filter((message) => message.intent === 'contract'),
    ).toHaveLength(2);

    // She asks for work, she does not beg for it: twice is the whole session's worth.
    for (let sent = 14; sent <= 20; sent += 1) await chat.sendMessage(alisha, `Message ${sent}`);
    expect(chat.session()!.pitches).toBe(2);
  });

  it('remembers the session across a refresh of the page', async () => {
    const chat = service();
    open(chat);
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
    open(chat);

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
    open(chat);

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

    // K — the session report comes up over the window, and the Close button puts it away.
    expect(chat.session()!.closedAt).toBeGreaterThan(0);
    expect(chat.summaryOpen()).toBe(true);
    chat.dismissSummary();
    expect(chat.summaryOpen()).toBe(false);

    // A fresh session starts clean, with a new two-hour clock.
    chat.startNewSession(alisha);
    expect(chat.session()!.strikes).toBe(0);
    expect(chat.session()!.closed).toBe('');
    expect(chat.session()!.introduced).toBe(false);
  });

  it('lets the visitor react to her message, and answers with the same feeling back', async () => {
    const chat = service();
    open(chat);
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
    // Every request gets its own stream — one Response cannot be read twice.
    const studioReply = (): Response => {
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
      return new Response(stream, {
        status: 200,
        headers: { 'content-type': 'text/event-stream' },
      });
    };
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation(() => Promise.resolve(studioReply())),
    );

    const chat = service();
    open(chat);
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
    open(chat);
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
    open(chat);
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
    expect(parsed.sessions[alisha.slug].messages.length).toBeGreaterThan(3);
    // The preview itself is dropped: a session must never fill the tab's storage.
    expect(stored!.length).toBeLessThan(200_000);
  });

  it('ignores a send when no window is open or the session has ended', async () => {
    const chat = service();
    open(chat);
    chat.closeChat();
    await chat.sendMessage(alisha, 'Are you there?');
    // The privacy notice and her own introduction, and nothing more.
    const messages = chat.sessionOf(alisha.slug)!.messages;
    expect(messages.filter((message) => message.author === 'user')).toHaveLength(0);
    expect(messages.filter((message) => message.author === 'model').length).toBeGreaterThanOrEqual(
      4,
    );
  });
});
