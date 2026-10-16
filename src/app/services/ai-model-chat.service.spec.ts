import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { aiModelProfiles } from '../pages/ai-models/ai-model-data';
import { ChatIdentity } from '../pages/ai-models/chat/chat-identity';
import {
  AI_CHAT_FEEDBACK_COMMENT_LIMIT,
  AI_CHAT_FOLLOWUP_LIMIT,
  AI_CHAT_INTEREST_MS,
  AI_CHAT_SESSION_MS,
  AI_CHAT_UNSEND_WINDOW_MS,
  replyQuoteOf,
} from '../pages/ai-models/chat/chat-types';
import { clearCharacterDatabaseCache } from '../pages/ai-models/chat/character-database';
import { clearModelBiographyCache } from '../pages/ai-models/chat/chat-biography';
import {
  AI_CHAT_BACKEND_DOSSIER_LIMIT,
  AI_CHAT_BACKEND_ENDPOINT,
  AI_CHAT_BACKEND_RETRY_MS,
  AI_CHAT_STORAGE_KEY,
  AiModelChatService,
  chatReminderText,
  formatRemaining,
} from './ai-model-chat.service';
import { AI_READ_ENDPOINT } from '../pages/ai-models/chat/chat-analysis';
import { silenceChatPacing } from './ai-model-chat.testing';

const alisha = aiModelProfiles.find((model) => model.slug === 'alisha-bhattacharya')!;

/** The backend with no Gemini key: every request to the chat endpoint fails, so her own engine answers. */
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

  it.each([
    ['basic', 15],
    ['extended', 45],
    ['deep', 90],
    ['ultimate', 135],
  ] as const)('sets and retains the %s checkout duration', (paymentPackageId, minutes) => {
    const chat = service();
    chat.openChat(alisha, 'premium');
    chat.setIdentity(alisha, { ...VISITOR, paymentPackageId });
    const session = chat.session()!;
    expect(session.durationMs).toBe(minutes * 60_000);
    expect(session.endsAt - session.startedAt).toBe(minutes * 60_000);
    expect(chat.remainingMs()).toBe(minutes * 60_000);
    expect(session.messages[0].text).toContain(`${minutes} minutes`);
    chat.closeChat();
    chat.openChat(alisha, 'premium');
    expect(chat.session()?.durationMs).toBe(minutes * 60_000);
  });

  it('keeps the Premium Content Coverage of the checkout, also across a reload', () => {
    const chat = service();
    chat.openChat(alisha, 'premium');
    chat.setIdentity(alisha, {
      ...VISITOR,
      paymentPackageId: 'basic',
      premiumContentCoverage: true,
    });
    expect(chat.session()?.premiumContentCoverage).toBe(true);

    // A second service instance stands in for a reloaded page.
    const restored = TestBed.runInInjectionContext(() => new AiModelChatService());
    silenceChatPacing(restored);
    restored.openChat(alisha, 'premium');
    expect(restored.session()?.premiumContentCoverage).toBe(true);
    restored.closeChat();
  });

  it('leaves a Premium session without coverage when its checkout had none', () => {
    const chat = service();
    chat.openChat(alisha, 'premium');
    chat.setIdentity(alisha, {
      ...VISITOR,
      paymentPackageId: 'basic',
      premiumContentCoverage: false,
    });
    expect(chat.session()?.premiumContentCoverage).toBe(false);
    const restored = TestBed.runInInjectionContext(() => new AiModelChatService());
    silenceChatPacing(restored);
    restored.openChat(alisha, 'premium');
    expect(restored.session()?.premiumContentCoverage).toBe(false);
    restored.closeChat();
  });

  it('adds coverage bought at a later checkout to the Premium session still running', () => {
    const chat = service();
    chat.openChat(alisha, 'premium');
    chat.setIdentity(alisha, {
      ...VISITOR,
      paymentPackageId: 'basic',
      premiumContentCoverage: false,
    });
    const { startedAt, endsAt } = chat.session()!;

    // The window is reopened after a second checkout, this time with the coverage: the running
    // session is kept — the same clock — and gains the coverage.
    chat.closeChat();
    chat.openChat(alisha, 'premium');
    chat.setIdentity(alisha, {
      ...VISITOR,
      paymentPackageId: 'basic',
      premiumContentCoverage: true,
    });
    expect(chat.session()?.premiumContentCoverage).toBe(true);
    expect(chat.session()?.startedAt).toBe(startedAt);
    expect(chat.session()?.endsAt).toBe(endsAt);

    // A later checkout without the coverage never takes it away again.
    chat.setIdentity(alisha, {
      ...VISITOR,
      paymentPackageId: 'basic',
      premiumContentCoverage: false,
    });
    expect(chat.session()?.premiumContentCoverage).toBe(true);
  });

  it('grants Premium Content Coverage to Premium sessions only', () => {
    const chat = service();
    chat.openChat(alisha, 'registered');
    chat.setIdentity(alisha, { ...VISITOR, premiumContentCoverage: true });
    expect(chat.session()?.premiumContentCoverage).toBeFalsy();
  });

  it('starts fresh after a visitor ends the chat, requiring a new name and photo', async () => {
    const chat = service();
    open(chat);
    await chat.sendMessage(alisha, 'I am 31 years old');
    expect(chat.session()?.personalMemory?.answers.age).toBe('31');
    chat.endVisitorSession();
    expect(chat.session()?.closed).toBe('visitor');
    chat.closeChat();
    chat.openChat(alisha);
    expect(chat.identified()).toBe(false);
    expect(chat.session()?.identity).toBeNull();
    expect(chat.session()?.personalMemory?.answers).toEqual({});
    expect(chat.session()?.startedAt).toBe(0);
    expect(chat.session()?.messages.some((message) => message.author === 'user')).toBe(false);
    chat.setIdentity(alisha, VISITOR);
    expect(chat.identified()).toBe(true);
  });

  it('starts fresh when reopening a model-ended or expired session', () => {
    const chat = service();
    open(chat);
    const old = chat.sessionOf(alisha.slug)!;
    old.closed = 'inactive';
    chat.openChat(alisha); // Includes clicking Live Chat while the ended window is still present.
    expect(chat.session()?.identity).toBeNull();
    chat.setIdentity(alisha, VISITOR);
    chat.closeChat();
    chat.sessionOf(alisha.slug)!.endsAt = Date.now() - 1;
    chat.openChat(alisha);
    expect(chat.session()?.identity).toBeNull();
    expect(chat.feedbackOpen()).toBe(false);
  });

  it('keeps personal answers across active-session reloads', async () => {
    const chat = service();
    open(chat);
    await chat.sendMessage(alisha, 'My city is Kolkata');
    const restored = TestBed.runInInjectionContext(() => new AiModelChatService());
    silenceChatPacing(restored);
    restored.openChat(alisha);
    expect(restored.session()?.personalMemory?.answers.city).toBe('Kolkata');
    restored.closeChat();
  });

  it('asks personal questions gradually and remembers replies in the offline engine', async () => {
    const chat = service();
    open(chat);
    await chat.sendMessage(alisha, 'Hello');
    await chat.sendMessage(alisha, 'How are you?');
    // Keep lastVisitorAt current so this is not an idle-timeout test.
    chat.sessionOf(alisha.slug)!.startedAt = Date.now() - 121000;
    await chat.sendMessage(alisha, 'Tell me more');
    expect(chat.session()?.personalMemory?.pending).toBe('age');
    expect(chat.session()?.personalMemory?.asked).toEqual(['age']);
    await chat.sendMessage(alisha, '29');
    expect(chat.session()?.personalMemory?.answers.age).toBe('29');
    await chat.sendMessage(alisha, 'Do you remember my age?');
    const reply = chat
      .session()!
      .messages.filter((message) => message.author === 'model' && message.intent !== 'contract')
      .at(-1)!;
    expect(reply.text).toContain('29');
    expect(chat.session()?.personalMemory?.asked).toEqual(['age']);
  });

  it('answers a Romanised Bengali message in Bengali, and keeps the language (the studio’s example)', async () => {
    const chat = service();
    open(chat);
    await chat.sendMessage(alisha, 'ami tomake bhalobashi');

    const answer = (chat.session()?.messages ?? []).filter(
      (message) => message.author === 'model' && message.text.length > 0,
    );
    const last = answer[answer.length - 1];
    expect(last?.intent).toContain('language:bn');
    // Not English: her language is on the session, and the next message stays in it too.
    expect(last?.text).toMatch(/[A-Za-z]/);
    expect(last?.text).not.toContain('thank you');
    expect(chat.session()?.language).toBe('bn');

    await chat.sendMessage(alisha, 'kemon acho?');
    const again = (chat.session()?.messages ?? []).filter(
      (message) => message.author === 'model' && message.text.length > 0,
    );
    expect(again[again.length - 1]?.intent).toContain('language:bn');
  });

  it('leaves an English conversation in English', async () => {
    const chat = service();
    open(chat);
    await chat.sendMessage(alisha, 'what is your rate for a shoot?');
    expect(chat.session()?.language).toBe('');
    const answer = (chat.session()?.messages ?? []).filter(
      (message) => message.author === 'model' && message.text.length > 0,
    );
    expect(answer[answer.length - 1]?.intent).not.toContain('language:');
  });

  it('reads the turn before she answers it, and answers what the desk found', async () => {
    const readBodies: Record<string, unknown>[] = [];
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string, init?: RequestInit) => {
        if (url === '/api/ai-read') {
          readBodies.push(JSON.parse(String(init?.body ?? '{}')) as Record<string, unknown>);
          return new Response(
            JSON.stringify({
              ok: true,
              provider: 'gemini',
              reading: {
                english: 'You are very beautiful, and I wanted you to know it.',
                language: 'en',
                languageName: 'English',
                romanised: false,
                intent: 'compliment',
                sentiment: 'warm',
                tone: 'short and shy',
                about: 'a compliment about her looks',
                wants: 'something kind back',
                attachment: '',
                advice: 'Blush, tease him a little, and ask him about his day.',
                provider: 'gemini',
              },
            }),
            { status: 200, headers: { 'content-type': 'application/json' } },
          );
        }
        // The studio's answer endpoint is not configured: her own engine writes the answer.
        return new Response(JSON.stringify({ ok: false, error: 'ai-unavailable' }), {
          status: 503,
        });
      }),
    );

    const chat = service();
    open(chat);
    await chat.sendMessage(alisha, 'u r sooooooooo beutifull');

    // The turn was read first: her card, the visitor, and the message itself travelled to the desk.
    expect(readBodies.length).toBe(1);
    expect(String((readBodies[0]['model'] as Record<string, unknown>)['name'])).toContain('Alisha');
    expect((readBodies[0]['user'] as Record<string, unknown>)['firstName']).toBe('Rahul');
    expect(String(readBodies[0]['text'])).toBe('u r sooooooooo beutifull');

    // …and the answer is the one for what the visitor means, not for the letters they typed.
    const model = (chat.session()?.messages ?? []).filter(
      (message) => message.author === 'model' && message.kind === 'message',
    );
    const last = model[model.length - 1];
    expect(last?.text).toMatch(/thank|blush|pink|smil|charming|insufferable|kind|lovely|pink/i);
    expect(last?.text).toMatch(/\?/);
    // Who read the visitor's message is part of the transcript.
    expect(last?.analysedBy).toBe('gemini');
  });

  it('takes two live photographs through livechatselfiesandphotos when a selfie is asked for', async () => {
    const liveBodies: Record<string, unknown>[] = [];
    const cover = alisha.cover;
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string, init?: RequestInit) => {
        if (url === '/api/ai-read') {
          return new Response(JSON.stringify({ ok: false, error: 'analysis-unavailable' }), {
            status: 503,
          });
        }
        if (url === '/api/livechatselfiesandphotos') {
          liveBodies.push(JSON.parse(String(init?.body ?? '{}')) as Record<string, unknown>);
          return new Response(
            JSON.stringify({
              ok: true,
              provider: 'gemini',
              images: ['data:image/png;base64,QUJD', 'data:image/png;base64,QUJDMA=='],
              place: 'on the terrace in the evening light in Darjeeling',
              flaw: 'the horizon is crooked and I left it that way',
              timestamp: '13/10/2026 18:42',
              watermark: 'Shot on iPhone 18 Pro',
            }),
            { status: 200, headers: { 'content-type': 'application/json' } },
          );
        }
        // Her own profile photograph, from this site's own origin.
        expect(url).toBe(cover);
        return new Response('her-photograph', {
          status: 200,
          headers: { 'content-type': 'image/jpeg' },
        });
      }),
    );

    const chat = service();
    open(chat);
    await chat.sendMessage(alisha, 'send me a selfie please');

    const messages = (chat.session()?.messages ?? []).filter(
      (message) => message.author === 'model' && message.attachment?.selfie === true,
    );
    // Two photographs, same outfit and ambience, different poses — her response to a selfie.
    expect(messages).toHaveLength(2);
    expect(messages[0].attachment?.preview).toBe('data:image/png;base64,QUJD');
    expect(messages[1].attachment?.preview).toBe('data:image/png;base64,QUJDMA==');
    expect(messages[0].attachment?.source).toBe('camera');
    expect(messages[0].intent).toBe('selfie');
    // The caption says where the service actually photographed her — her own hour, her own city.
    expect(messages[0].text).toContain('terrace in the evening light in Darjeeling');

    // Her own photograph travelled as the likeness, together with her own time zone.
    expect(liveBodies).toHaveLength(1);
    expect(String(liveBodies[0]['reference'])).toMatch(/^data:image\/jpeg;base64,/);
    expect(String(liveBodies[0]['timezone'])).toBe('Asia/Kolkata');
    expect(String((liveBodies[0]['model'] as Record<string, unknown>)['location'])).toContain(
      'Darjeeling',
    );
    expect(String(liveBodies[0]['look'])).toContain(alisha.age);
  });

  it('keeps generated photographs in the browser only, and drops them when the session ends', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) => {
        if (url === '/api/ai-read') {
          return new Response(JSON.stringify({ ok: false, error: 'analysis-unavailable' }), {
            status: 503,
          });
        }
        if (url === '/api/livechatselfiesandphotos') {
          return new Response(
            JSON.stringify({
              ok: true,
              provider: 'gemini',
              images: ['data:image/png;base64,LIVEONE', 'data:image/png;base64,LIVETWO'],
              place: 'in my room, one lamp on',
              flaw: 'grainy, my phone is old',
            }),
            { status: 200, headers: { 'content-type': 'application/json' } },
          );
        }
        return new Response('her-photograph', {
          status: 200,
          headers: { 'content-type': 'image/jpeg' },
        });
      }),
    );

    const chat = service();
    open(chat);
    await chat.sendMessage(alisha, 'send me a selfie');

    const generated = (chat.session()?.messages ?? []).filter(
      (message) => message.attachment?.ephemeral === true,
    );
    expect(generated).toHaveLength(2);

    // Nothing of the photographs is ever written to storage — they live only in this browser.
    const stored = sessionStorage.getItem(AI_CHAT_STORAGE_KEY) ?? '';
    expect(stored).not.toContain('LIVEONE');
    expect(stored).not.toContain('LIVETWO');
    expect(stored).toContain('"ephemeral":true');
    // While the session lives, the photographs are on screen as they came back.
    expect(
      (chat.session()?.messages ?? []).some(
        (message) => message.attachment?.preview === 'data:image/png;base64,LIVEONE',
      ),
    ).toBe(true);

    // The moment the visitor ends the chat, their bytes are gone from the transcript for good.
    chat.endVisitorSession();
    expect(
      (chat.session()?.messages ?? []).some((message) =>
        message.attachment?.preview.startsWith('data:image/png;base64,LIVE'),
      ),
    ).toBe(false);
    const after = sessionStorage.getItem(AI_CHAT_STORAGE_KEY) ?? '';
    expect(after).not.toContain('LIVEONE');
    expect(after).not.toContain('LIVETWO');
  });

  it('asks “a photo, or a current selfie?” and sends whichever the visitor chooses', async () => {
    const chat = service();
    open(chat);

    await chat.sendMessage(alisha, 'send me a photo');
    const asked = chat
      .session()!
      .messages.filter((message) => message.author === 'model')
      .at(-1)!;
    expect(asked.intent).toBe('photo:ask');
    expect(asked.text).toMatch(/photo/i);
    expect(asked.text).toMatch(/selfie/i);
    expect(chat.session()!.pendingPhotoAsk).toBe(true);

    // "Just a photo" — a random frame from her album goes out.
    await chat.sendMessage(alisha, 'just a photo please');
    const album = chat
      .session()!
      .messages.filter((message) => message.author === 'model')
      .at(-1)!;
    expect(album.attachment?.selfie).toBe(true);
    expect(alisha.photos.map((photo) => photo.src)).toContain(album.attachment?.preview);
    expect(chat.session()!.pendingPhotoAsk).toBe(false);

    // Asked again, "selfie" takes the live path — with no image key the album answers instead,
    // but the question is closed the same way.
    await chat.sendMessage(alisha, 'send me a photo');
    expect(chat.session()!.pendingPhotoAsk).toBe(true);
    await chat.sendMessage(alisha, 'selfie');
    const fresh = chat
      .session()!
      .messages.filter((message) => message.author === 'model')
      .at(-1)!;
    expect(fresh.attachment?.selfie).toBe(true);
    expect(fresh.intent).toBe('selfie');
    expect(chat.session()!.pendingPhotoAsk).toBe(false);
  });

  it('answers over the message the visitor replied to, the way Instagram chat does', async () => {
    const chat = service();
    open(chat);
    await chat.sendMessage(alisha, 'Tell me about your city');

    const herMessage = chat
      .session()!
      .messages.filter(
        (message) => message.author === 'model' && message.kind === 'message' && message.text,
      )
      .at(-1)!;
    const quote = replyQuoteOf(herMessage);
    await chat.sendMessage(alisha, 'Tell me more about that', quote);

    const theirs = chat
      .session()!
      .messages.filter((message) => message.author === 'user')
      .at(-1)!;
    expect(theirs.replyTo?.id).toBe(herMessage.id);
    expect(theirs.replyTo?.author).toBe('model');

    // Her answer replies over their message — the quote rides at the top of her bubble.
    const answered = chat
      .session()!
      .messages.filter(
        (message) => message.author === 'model' && message.kind === 'message' && message.replyTo,
      )
      .at(-1)!;
    expect(answered.replyTo?.id).toBe(theirs.id);
    expect(answered.replyTo?.author).toBe('user');
    expect(answered.replyTo?.text).toContain('Tell me more about that');
  });

  it('sends one of her own album frames instead when the studio has no camera', async () => {
    withoutStudioAi();
    const chat = service();
    open(chat);
    await chat.sendMessage(alisha, 'send me a selfie right now');

    const messages = (chat.session()?.messages ?? []).filter(
      (message) => message.author === 'model' && message.attachment?.selfie === true,
    );
    const selfie = messages[messages.length - 1];
    expect(alisha.photos.map((photo) => photo.src)).toContain(selfie?.attachment?.preview);
  });

  it('welcomes the same visitor differently in every session', async () => {
    const first = service();
    open(first);
    const monday = transcript(first);

    sessionStorage.clear();
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});

    const second = service();
    open(second);
    const tuesday = transcript(second);

    expect(monday).toContain('Rahul');
    expect(tuesday).toContain('Rahul');
    expect(monday).not.toBe(tuesday);
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

  it('says her hello and then waits for the visitor instead of filling the silence (requirement A)', async () => {
    vi.useFakeTimers();
    const chat = service();
    open(chat);

    // She speaks first — four or five messages of her own — and then nothing of hers is written
    // while she waits to be answered.
    expect(
      chat.session()!.messages.filter((message) => message.intent === 'opening').length,
    ).toBeGreaterThanOrEqual(4);

    await vi.advanceTimersByTimeAsync(2 * 60 * 1000);
    expect(chat.session()!.messages.filter((message) => message.intent === 'idle')).toHaveLength(0);
    expect(chat.session()!.followUps).toBe(0);
  });

  it('reads three silent minutes as an answer and closes the session herself (requirement D)', async () => {
    vi.useFakeTimers();
    const chat = service();
    open(chat);

    await vi.advanceTimersByTimeAsync(AI_CHAT_INTEREST_MS - 1_000);
    expect(chat.session()!.closed).toBe('');

    await vi.advanceTimersByTimeAsync(2_000);
    const session = chat.session()!;
    expect(session.closed).toBe('inactive');
    expect(chat.canSend()).toBe(false);

    // She says goodbye in her own words, and then the close form of requirement E comes up with it.
    const goodbye = session.messages.filter((message) => message.intent === 'goodbye');
    expect(goodbye).toHaveLength(1);
    expect(goodbye[0].text.length).toBeGreaterThan(40);
    expect(goodbye[0].text).not.toMatch(/\b(?:google|openai|gpt|api)\b/i);
    expect(chat.feedbackOpen()).toBe(true);

    // Nothing else is written into a window she has closed.
    const written = session.messages.length;
    await vi.advanceTimersByTimeAsync(60_000);
    expect(chat.session()!.messages.length).toBe(written);
  });

  it('freezes the timer the moment a session ends and never counts on afterwards', async () => {
    vi.useFakeTimers();
    const chat = service();
    open(chat);

    await vi.advanceTimersByTimeAsync(60_000);
    chat.endVisitorSession();
    expect(chat.session()!.closed).toBe('visitor');

    const frozen = chat.timeLeftLabel();
    const frozenMs = chat.remainingMs();
    expect(frozenMs).toBeGreaterThan(0);

    // Neither the clock nor the passing minutes move a session that is over.
    await vi.advanceTimersByTimeAsync(5 * 60_000);
    expect(chat.timeLeftLabel()).toBe(frozen);
    expect(chat.remainingMs()).toBe(frozenMs);
  });

  it('does not fill a silence the conversation has not earned (requirements A and B)', async () => {
    vi.useFakeTimers();
    const chat = service();
    open(chat);

    // The visitor has written — so she is allowed to have the floor — but the session is young and
    // there is no subject and no question on the table: she waits instead of talking to herself.
    await chat.sendMessage(alisha, 'Hello');
    await vi.advanceTimersByTimeAsync(2 * 60 * 1000);

    expect(chat.session()!.messages.filter((message) => message.intent === 'idle')).toHaveLength(0);
    expect(chat.session()!.followUps).toBe(0);
  });

  it('keeps a conversation going when there is a subject in play (requirement B)', async () => {
    vi.useFakeTimers();
    const chat = service();
    open(chat);

    await chat.sendMessage(alisha, 'I love to travel — I am always somewhere new');
    await vi.advanceTimersByTimeAsync(2 * 60 * 1000);

    const idle = chat.session()!.messages.filter((message) => message.intent === 'idle');
    expect(idle.length).toBeGreaterThan(0);
    expect(idle[0].pending).toBe(false);
    // She continues the subject the visitor brought up rather than changing it.
    expect(idle[0].text).toMatch(/\?|travel|place|trip|somewhere/i);
    expect(chat.session()!.followUps).toBeGreaterThan(0);
    // The session is still open: she kept it going, she did not end it.
    expect(chat.session()!.closed).toBe('');
  });

  it('says something of her own in a long conversation, and only a few times (requirements B and H)', async () => {
    vi.useFakeTimers();
    const chat = service();
    open(chat);

    // Six minutes of a real conversation: a message every two minutes, each one answered.
    for (let sent = 0; sent < 3; sent += 1) {
      await chat.sendMessage(alisha, 'Nothing much, a quiet evening here');
      await vi.advanceTimersByTimeAsync(2 * 60 * 1000);
    }

    const idle = chat.session()!.messages.filter((message) => message.intent === 'idle');
    expect(idle.length).toBeGreaterThan(0);
    expect(idle.every((message) => !message.pending)).toBe(true);
    // She never becomes a machine gun: the session caps how many times she reaches out.
    expect(chat.session()!.followUps).toBeLessThanOrEqual(AI_CHAT_FOLLOWUP_LIMIT);
    expect(idle.length).toBeLessThanOrEqual(AI_CHAT_FOLLOWUP_LIMIT);
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

    /**
     * Requirement D — a visitor who is still in the window keeps the session alive: this stands in
     * for them and writes something well inside the three quiet minutes she allows, so the two-hour
     * clock is what the test is really measuring.
     */
    const keepThemHere = async (minutes: number): Promise<void> => {
      let left = minutes * 60 * 1000;
      while (left > 0) {
        const slice = Math.min(2 * 60 * 1000, left);
        await vi.advanceTimersByTimeAsync(slice);
        left -= slice;
        await chat.sendMessage(alisha, 'Still here, tell me something');
      }
    };

    await keepThemHere(105);
    await vi.advanceTimersByTimeAsync(1_000); // 1 h 45 min in: fifteen minutes left
    let reminders = chat.session()!.messages.filter((message) => message.kind === 'reminder');
    expect(reminders).toHaveLength(1);
    expect(reminders[0].text).toContain('15 minutes remaining');
    expect(chat.session()!.reminders).toEqual([15]);
    expect(chat.timeLeftLabel()).toBe('14:59');

    await keepThemHere(5);
    await keepThemHere(5);
    await keepThemHere(4);
    reminders = chat.session()!.messages.filter((message) => message.kind === 'reminder');
    expect(reminders.map((message) => message.text)).toEqual([
      chatReminderText(15),
      chatReminderText(10),
      chatReminderText(5),
      chatReminderText(1),
    ]);
    expect(chat.session()!.reminders).toEqual([15, 10, 5, 1]);

    await vi.advanceTimersByTimeAsync(61 * 1000);
    expect(chat.session()!.closed).toBe('timeout');
    expect(chat.canSend()).toBe(false);
    expect(transcript(chat)).toContain('Our two hours are up');
    // E and F — the close form comes up with the ending, and waits there for the visitor.
    expect(chat.feedbackOpen()).toBe(true);
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

    // E, F and K — the close form comes up over the window, and the visitor's Close button puts it
    // away: nothing on that form closes itself.
    expect(chat.session()!.closedAt).toBeGreaterThan(0);
    expect(chat.feedbackOpen()).toBe(true);
    chat.dismissFeedback();
    expect(chat.feedbackOpen()).toBe(false);

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

  it('answers through the backend’s Gemini chat, sending the message, her character profile and her biography', async () => {
    clearCharacterDatabaseCache();
    clearModelBiographyCache();
    const biographyFile = {
      meta: { _doc: 'notes', biographySource: 'Biography/biography.json' },
      profile: { _doc: 'notes', name: 'Alisha Bhattacharya', city: 'Darjeeling', age: '25' },
      biography: { summary: 'A fictional NeverBeen life.', hobbies: ['tea-garden walks'] },
    };
    const chatBodies: Record<string, any>[] = [];
    const profile = {
      _doc: 'editor notes are never sent',
      meta: { personaName: 'Joyful Sunshine' },
      corePersonality: { archetype: 'the joyful sunshine companion' },
    };
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input);
        if (url.endsWith('/AlishaBhattacharya/personality/characterdatabase.json')) {
          return Promise.resolve(new Response(JSON.stringify(profile), { status: 200 }));
        }
        if (url.endsWith('/AlishaBhattacharya/personality/biography.json')) {
          return Promise.resolve(new Response(JSON.stringify(biographyFile), { status: 200 }));
        }
        if (url === AI_CHAT_BACKEND_ENDPOINT) {
          chatBodies.push(JSON.parse(String(init?.body)));
          return Promise.resolve(
            new Response(
              JSON.stringify({
                ok: true,
                reply: 'Delhi, of course.',
                provider: 'gemini',
                model: 'gemini-3.6-flash',
              }),
              { status: 200, headers: { 'content-type': 'application/json' } },
            ),
          );
        }
        return Promise.resolve(new Response('{}', { status: 503 }));
      }),
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
    expect(answer.intent).toBe('gemini');

    // The browser never holds the key: the turn goes to the backend, through the same-origin proxy.
    expect(AI_CHAT_BACKEND_ENDPOINT).toBe('/neverbeen-api/api/ai-chat');
    const sent = chatBodies.at(-1)!;
    expect(sent['message']).toBe('What is the capital of India?');
    expect(sent['characterProfile'].meta.personaName).toBe('Joyful Sunshine');
    expect(sent['characterProfile'].corePersonality.archetype).toBe(
      'the joyful sunshine companion',
    );
    expect(sent['characterProfile'].meta.model.slug).toBe('alisha-bhattacharya');
    expect(sent['characterProfile']._doc).toBeUndefined();
    // Her biography (personality/biography.json) travels with every turn, notes stripped.
    expect(sent['biography'].profile.city).toBe('Darjeeling');
    expect(sent['biography'].biography.summary).toBe('A fictional NeverBeen life.');
    expect(sent['biography'].meta.model.slug).toBe('alisha-bhattacharya');
    expect(JSON.stringify(sent['biography'])).not.toContain('_doc');
    for (const body of chatBodies) {
      expect(body['biography']).toBeTruthy();
      expect(body['characterProfile']).toBeTruthy();
    }
    expect(sent['model'].slug).toBe('alisha-bhattacharya');
    expect(sent['user'].firstName).toBe('Rahul');
    expect(sent['dossier'].length).toBeLessThanOrEqual(AI_CHAT_BACKEND_DOSSIER_LIMIT);
    expect(JSON.stringify(sent)).not.toMatch(/GEMINI_API_KEY|x-goog-api-key/i);
    expect(chat.remoteUnavailable()).toBe(false);
  });

  it('skips the backend for one turn on a passing failure, and keeps asking it afterwards', async () => {
    clearCharacterDatabaseCache();
    clearModelBiographyCache();
    const chatBodies: Record<string, any>[] = [];
    let chatCalls = 0;
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
        if (String(input) === AI_CHAT_BACKEND_ENDPOINT) {
          chatCalls += 1;
          chatBodies.push(JSON.parse(String(init?.body)));
          return Promise.resolve(
            chatCalls === 1
              ? new Response(JSON.stringify({ ok: false, error: 'ai-failed' }), { status: 502 })
              : new Response(JSON.stringify({ ok: true, reply: 'Back again!' }), { status: 200 }),
          );
        }
        return Promise.resolve(new Response('{}', { status: 503 }));
      }),
    );

    const chat = service();
    open(chat);
    await chat.sendMessage(alisha, 'What is the capital of India?');
    expect(chatCalls).toBe(1);
    expect(chat.remoteUnavailable()).toBe(false);
    const fallback = chat
      .session()!
      .messages.filter((message) => message.author === 'model')
      .at(-1)!;
    expect(fallback.intent).not.toBe('gemini');
    expect(fallback.text).toContain('Delhi');

    await chat.sendMessage(alisha, 'And what about France?');
    const answer = chat
      .session()!
      .messages.filter((message) => message.author === 'model')
      .at(-1)!;
    expect(answer.text).toBe('Back again!');
    expect(chatCalls).toBe(2);
    // With no biography file reachable, her website profile still travels as her biography.
    for (const body of chatBodies) {
      expect(body['biography'].meta.biographySource).toBe('website-profile');
      expect(body['biography'].profile.name).toBe('Alisha Bhattacharya');
    }
  });

  it('sends every message the visitor writes to the backend, and says the answer it sends back', async () => {
    clearCharacterDatabaseCache();
    clearModelBiographyCache();
    const bodies: Record<string, any>[] = [];
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input);
        if (url === AI_CHAT_BACKEND_ENDPOINT) {
          const body = JSON.parse(String(init?.body)) as Record<string, any>;
          bodies.push(body);
          return new Response(
            JSON.stringify({ ok: true, reply: `Gemini answering turn ${bodies.length}.` }),
            { status: 200, headers: { 'content-type': 'application/json' } },
          );
        }
        // The reading desk reads the visitor's own language, and only for the message written in it.
        if (url === AI_READ_ENDPOINT) {
          const asked = String(
            (JSON.parse(String(init?.body ?? '{}')) as { text?: string }).text ?? '',
          );
          const romanised = asked === 'ami bhalo achi';
          return new Response(
            JSON.stringify({
              ok: true,
              provider: 'gemini',
              reading: romanised
                ? {
                    english: 'I am well.',
                    language: 'bn',
                    languageName: 'Bengali',
                    romanised: true,
                    intent: 'greeting',
                  }
                : {
                    english: asked,
                    language: 'en',
                    languageName: 'English',
                    romanised: false,
                    intent: 'greeting',
                  },
            }),
            { status: 200, headers: { 'content-type': 'application/json' } },
          );
        }
        return new Response(JSON.stringify({ ok: false, error: 'analysis-unavailable' }), {
          status: 503,
        });
      }),
    );

    const chat = service();
    open(chat);
    // A greeting, a photograph of their own, and a message in their own language: three different
    // kinds of turn, and every one of them belongs to the backend.
    await chat.sendMessage(alisha, 'Hello');
    chat.setDraftAttachment({
      kind: 'photo',
      name: 'me.jpg',
      type: 'image/jpeg',
      size: 1_024,
      source: 'upload',
      preview: VISITOR_PHOTO,
    });
    await chat.sendMessage(alisha, 'Look at this');
    await chat.sendMessage(alisha, 'ami bhalo achi');

    expect(bodies.map((body) => body['message'])).toEqual([
      'Hello',
      'Look at this',
      'ami bhalo achi',
    ]);
    for (const body of bodies) {
      // Her character database and her biography travel with every single message.
      expect(body['characterProfile']).toBeTruthy();
      expect(body['biography']).toBeTruthy();
      // B — nothing tells her where the words came from or that anything was read.
      expect(JSON.stringify(body)).not.toMatch(/GEMINI_API_KEY|x-goog-api-key/i);
    }
    // The language the visitor settled into travels with the turn that was written in it.
    expect(bodies[2]['language']).toEqual({ code: 'bn', label: 'Bengali', romanised: true });
    expect(bodies[0]['language']).toBeNull();

    // Her answers are the backend's words, not her engine's.
    const answers = chat
      .session()!
      .messages.filter((message) => message.author === 'model' && message.intent === 'gemini');
    expect(answers.map((message) => message.text)).toEqual([
      'Gemini answering turn 1.',
      'Gemini answering turn 2.',
      'Gemini answering turn 3.',
    ]);
  });

  it('takes a bot line out of the answer, and answers in her own words when that was all of it (requirement L)', async () => {
    let turn = 0;
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) => {
        if (String(input) === AI_CHAT_BACKEND_ENDPOINT) {
          turn += 1;
          const reply =
            turn === 1
              ? 'As an AI language model, I cannot browse the internet. But Darjeeling is mist and tea in October.'
              : 'I am an AI model here to help.\n\nHow can I help you today?';
          return new Response(JSON.stringify({ ok: true, reply }), {
            status: 200,
            headers: { 'content-type': 'application/json' },
          });
        }
        return new Response(JSON.stringify({ ok: false, error: 'analysis-unavailable' }), {
          status: 503,
        });
      }),
    );

    const chat = service();
    open(chat);
    await chat.sendMessage(alisha, 'Tell me about Darjeeling');
    const first = chat
      .session()!
      .messages.filter((message) => message.author === 'model')
      .at(-1)!;
    expect(first.text).toBe('But Darjeeling is mist and tea in October.');
    expect(first.intent).toBe('gemini');
    expect(first.text).not.toMatch(/\bas an ai\b|\blanguage model\b/i);

    // Nothing of the answer survived the guard: she answers from her own engine rather than pass a
    // chatbot's line on to the visitor.
    await chat.sendMessage(alisha, 'What can you do, exactly?');
    const second = chat
      .session()!
      .messages.filter((message) => message.author === 'model')
      .at(-1)!;
    expect(second.intent).not.toBe('gemini');
    expect(second.text.length).toBeGreaterThan(0);
    expect(second.text).not.toMatch(/\bas an ai\b|\bhere to help\b|\bhelp you today\b/i);
  });

  it('asks a backend that said it cannot answer again after the pause, never for the rest of the visit', async () => {
    vi.useFakeTimers();
    let calls = 0;
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) => {
        if (String(input) === AI_CHAT_BACKEND_ENDPOINT) {
          calls += 1;
          return calls === 1
            ? new Response(JSON.stringify({ ok: false, error: 'ai-unavailable' }), {
                status: 503,
              })
            : new Response(JSON.stringify({ ok: true, reply: 'Gemini is here.' }), {
                status: 200,
                headers: { 'content-type': 'application/json' },
              });
        }
        return new Response('{}', { status: 503 });
      }),
    );

    const chat = service();
    open(chat);
    await chat.sendMessage(alisha, 'Hello');
    expect(calls).toBe(1);
    expect(chat.remoteUnavailable()).toBe(true);

    // The pause is not over: this turn is hers, and nothing is sent.
    await chat.sendMessage(alisha, 'Are you there?');
    expect(calls).toBe(1);

    // The pause passes, and the very next message is Gemini's again — the studio sets its key and
    // the conversation picks it up without a reload.
    vi.setSystemTime(Date.now() + AI_CHAT_BACKEND_RETRY_MS + 1);
    await chat.sendMessage(alisha, 'Now?');
    expect(calls).toBe(2);
    expect(chat.remoteUnavailable()).toBe(false);
    expect(
      chat
        .session()!
        .messages.filter((message) => message.author === 'model')
        .at(-1)!.text,
    ).toBe('Gemini is here.');
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

  it('opens the close form on a session that has started, and keeps what the visitor gave it (requirements E and K)', async () => {
    const chat = service();
    open(chat);
    await chat.sendMessage(alisha, 'Hello there');

    expect(chat.feedbackOpen()).toBe(false);
    chat.openFeedback();
    expect(chat.feedbackOpen()).toBe(true);

    chat.recordFeedback(alisha, { rating: 4, comments: '  She was lovely to talk to.  ' });
    expect(chat.feedbackFor(alisha.slug)).toMatchObject({
      rating: 4,
      comments: 'She was lovely to talk to.',
    });
    // The feedback travels with the session into this tab's storage, so a refresh keeps it.
    expect(sessionStorage.getItem(AI_CHAT_STORAGE_KEY)).toContain('She was lovely to talk to.');

    chat.dismissFeedback();
    expect(chat.feedbackOpen()).toBe(false);
    // Closing the form never throws the session away: the conversation is still there.
    expect(chat.sessionOf(alisha.slug)!.messages.length).toBeGreaterThan(2);
  });

  it('keeps a rating with no comment, a comment with no rating, and ignores an empty form', async () => {
    const chat = service();
    open(chat);

    chat.recordFeedback(alisha, { rating: 5, comments: '   ' });
    expect(chat.feedbackFor(alisha.slug)).toMatchObject({ rating: 5, comments: '' });

    chat.recordFeedback(alisha, { rating: 0, comments: 'Just here for the photographs.' });
    expect(chat.feedbackFor(alisha.slug)).toMatchObject({
      rating: 0,
      comments: 'Just here for the photographs.',
    });

    chat.recordFeedback(alisha, { rating: 0, comments: '   ' });
    // The empty second form changed nothing: the first answer is the one that stands.
    expect(chat.feedbackFor(alisha.slug)!.comments).toBe('Just here for the photographs.');
  });

  it('bounds the stars to five and the comment to what the form can take', async () => {
    const chat = service();
    open(chat);

    chat.recordFeedback(alisha, { rating: 9, comments: 'x'.repeat(5000) });
    const kept = chat.feedbackFor(alisha.slug)!;
    expect(kept.rating).toBe(5);
    expect(kept.comments).toHaveLength(AI_CHAT_FEEDBACK_COMMENT_LIMIT);
    expect(kept.at).toBeGreaterThan(0);
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
  describe('message actions (Instagram menu)', () => {
    /** Sends one visitor message and returns it from the transcript. */
    async function sendOwn(chat: AiModelChatService, text: string, options = {}) {
      await chat.sendMessage(alisha, text, null, options);
      const messages = chat.sessionOf(alisha.slug)!.messages;
      return messages.filter((message) => message.author === 'user').at(-1)!;
    }

    it('unsends the visitor’s own message inside the two minutes, and clears its words', async () => {
      const chat = service();
      open(chat);
      const mine = await sendOwn(chat, 'I did not mean that');

      expect(chat.unsendMessage(alisha, mine.id)).toBe(true);
      const kept = chat.sessionOf(alisha.slug)!.messages.find((message) => message.id === mine.id)!;
      expect(kept.unsent).toBe(true);
      expect(kept.text).toBe('');
      expect(kept.attachment).toBeNull();
      expect(kept.reaction).toBeNull();
      // Nothing of the words is left in the transcript the model reads.
      expect(transcript(chat)).not.toContain('I did not mean that');
    });

    it('refuses to unsend after the two minutes, or a message the model wrote', async () => {
      const chat = service();
      open(chat);
      const mine = await sendOwn(chat, 'Too late to take back');

      const late = mine.at + AI_CHAT_UNSEND_WINDOW_MS + 1;
      expect(chat.unsendMessage(alisha, mine.id, late)).toBe(false);
      expect(mine.unsent).toBeUndefined();

      const hers = chat
        .sessionOf(alisha.slug)!
        .messages.find((message) => message.author === 'model')!;
      expect(chat.unsendMessage(alisha, hers.id)).toBe(false);
    });

    it('makes a reply that quoted the unsent message quote nothing', async () => {
      const chat = service();
      open(chat);
      const mine = await sendOwn(chat, 'Tell me about the mountains');
      const quoting = {
        id: 'answer-1',
        author: 'model' as const,
        text: 'About the mountains…',
        at: Date.now(),
        kind: 'message' as const,
        attachment: null,
        reaction: null,
        reactionBy: null,
        pending: false,
        revealedChars: 0,
        sources: [],
        replyTo: replyQuoteOf(mine),
        intent: '',
      };
      chat.sessionOf(alisha.slug)!.messages.push(quoting);

      chat.unsendMessage(alisha, mine.id);
      expect(quoting.replyTo?.text).toBe('');
    });

    it('deletes a message for the visitor only, and keeps it for the model', async () => {
      const chat = service();
      open(chat);
      const mine = await sendOwn(chat, 'Keep this one for me');

      expect(chat.deleteForYou(alisha, mine.id)).toBe(true);
      const kept = chat.sessionOf(alisha.slug)!.messages.find((message) => message.id === mine.id)!;
      expect(kept.deletedForYou).toBe(true);
      // The model's history still has it: the other side of an Instagram chat still sees it.
      expect(transcript(chat)).toContain('Keep this one for me');
    });

    it('pins up to three messages and refuses a fourth with a notice', async () => {
      const chat = service();
      open(chat);
      // Her introduction arrives in several messages: wait until there are four to pin.
      await vi.waitFor(() => {
        const count = chat
          .sessionOf(alisha.slug)!
          .messages.filter((m) => m.author === 'model').length;
        expect(count).toBeGreaterThanOrEqual(4);
      });
      const hers = chat.sessionOf(alisha.slug)!.messages.filter((m) => m.author === 'model');
      const pinnable = hers.slice(0, 4);

      expect(chat.togglePin(alisha, pinnable[0].id)).toBe('pinned');
      expect(chat.togglePin(alisha, pinnable[1].id)).toBe('pinned');
      expect(chat.togglePin(alisha, pinnable[2].id)).toBe('pinned');
      expect(chat.togglePin(alisha, pinnable[3].id)).toBe('limit');
      expect(chat.notice()).toContain('up to 3');
      expect(pinnable[3].pinned).toBeUndefined();

      expect(chat.togglePin(alisha, pinnable[0].id)).toBe('unpinned');
      expect(pinnable[0].pinned).toBeUndefined();
    });

    it('marks a message sent from a forward as forwarded, and no other', async () => {
      const chat = service();
      open(chat);
      const forwarded = await sendOwn(chat, 'Passed on from another chat', { forwarded: true });
      const typed = await sendOwn(chat, 'Typed here');
      expect(forwarded.forwarded).toBe(true);
      expect(typed.forwarded).toBeUndefined();
    });

    it('stages forwarded words for another model once, and hands them over only then', () => {
      const chat = service();
      const other = aiModelProfiles.find((model) => model.slug !== alisha.slug)!;

      chat.stageForward(other.slug, '   ');
      expect(chat.takeForward(other.slug)).toBeNull();

      chat.stageForward(other.slug, 'Have a look at this');
      expect(chat.takeForward(other.slug)).toBe('Have a look at this');
      expect(chat.takeForward(other.slug)).toBeNull();
    });
  });
});
