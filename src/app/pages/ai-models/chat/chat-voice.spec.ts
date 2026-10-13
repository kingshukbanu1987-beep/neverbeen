import { describe, expect, it } from 'vitest';
import { AiModelProfile, aiModelProfiles } from '../ai-model-data';
import { AiChatMessage } from './chat-types';
import {
  analyseUserBehaviour,
  contractPitch,
  idleChatOpener,
  modelVoice,
  openingLine,
  splitChatMessages,
  videoRefusal,
  voiceIntroduction,
} from './chat-voice';

const model = (slug: string): AiModelProfile =>
  aiModelProfiles.find((entry) => entry.slug === slug)!;

const alisha = model('alisha-bhattacharya'); // Darjeeling, India — 25
const banafsheh = model('banafsheh-saoirse-yazdani'); // Tehran, Iran
const zahra = model('zahra-mahmoud-al-khatib'); // Damascus, Syria

let counter = 0;

/** One message of the transcript, the way the service builds them. */
function message(text: string, extra: Partial<AiChatMessage> = {}): AiChatMessage {
  counter += 1;
  return {
    id: `m${counter}`,
    author: 'user',
    text,
    at: counter,
    kind: 'message',
    attachment: null,
    reaction: null,
    reactionBy: null,
    pending: false,
    revealedChars: text.length,
    sources: [],
    intent: '',
    ...extra,
  };
}

describe('modelVoice', () => {
  it('gives an Indian woman, an Iranian woman and a Syrian woman different ways of talking (requirement B)', () => {
    const india = modelVoice(alisha);
    const iran = modelVoice(banafsheh);
    const syria = modelVoice(zahra);

    expect(india.country).toBe('India');
    expect(iran.country).toBe('Iran');
    expect(syria.country).toBe('Syria');

    // Each country has its own interjection, its own endearment and its own emoji.
    expect(new Set([india.interjection, iran.interjection, syria.interjection]).size).toBe(3);
    expect(new Set([india.endearment, iran.endearment, syria.endearment]).size).toBe(3);
    expect(new Set([india.favourites.join(''), iran.favourites.join('')]).size).toBe(2);
    expect(india.endearment).toBe('yaar');
    expect(iran.endearment).toBe('azizam');
    expect(syria.endearment).toBe('habibti');
  });

  it('bends the same country by her age: twenty-three does not talk like forty (requirement B)', () => {
    const young = modelVoice({ ...alisha, age: '23' });
    const senior = modelVoice({ ...alisha, age: '40' });

    expect(young.band).toBe('young');
    expect(young.cadence).toBe('bubbly');
    expect(senior.band).toBe('senior');
    expect(senior.cadence).toBe('measured');
    expect(senior.emojiRate).toBeLessThan(young.emojiRate);
    expect(senior.age).toBe(40);
  });
});

describe('analyseUserBehaviour', () => {
  it('works out who the visitor is as the chat goes on (requirement B)', () => {
    const behaviour = analyseUserBehaviour([
      message('Thank you so much, that is lovely 😊'),
      message('What capital is that? I went on a trip last month'),
      message('haha you are funny'),
      message('ok'),
    ]);

    expect(behaviour.messages).toBe(4);
    expect(behaviour.warmth).toBeGreaterThan(0);
    expect(behaviour.humour).toBeGreaterThan(0);
    expect(behaviour.curiosity).toBeGreaterThan(0);
    expect(behaviour.emoji).toBeGreaterThan(0);
    expect(behaviour.brevity).toBeGreaterThan(0);
    expect(behaviour.interests).toContain('travel');
    expect(behaviour.rude).toBe(false);
  });

  it('notices a photograph of theirs, a booking question and a rude message', () => {
    const withPhoto = message('Here I am', {
      attachment: {
        kind: 'photo',
        name: 'me.jpg',
        type: 'image/jpeg',
        size: 1_024,
        source: 'upload',
        preview: 'data:image/jpeg;base64,AA',
      },
    });
    expect(analyseUserBehaviour([withPhoto]).sharedPhoto).toBe(true);
    expect(analyseUserBehaviour([message('I want to book you for a shoot')]).spokenOfBooking).toBe(
      true,
    );
    expect(analyseUserBehaviour([message('You are an idiot')]).rude).toBe(true);
    expect(analyseUserBehaviour([message('anything'), message('x')], 1).rude).toBe(true);
  });
});

describe('her own prompts', () => {
  it('keeps the founder’s video line word for word (requirement J)', () => {
    expect(videoRefusal()).toBe(
      'Sorry actually, NeverBeen Founder Mr. Kingshuk asked me not to send my videos or any videos while I am chatting with someone. So, you take his permission next time and show me his permission, then I will send. Please don’t mind.',
    );
  });

  it('asks for a brand or editorial contract herself, priced from her own card (requirement G)', () => {
    const pitch = contractPitch(alisha, 'alisha|pitch|5');

    expect(contractPitch(alisha, 'alisha|pitch|5')).toBe(pitch);
    expect(pitch).toMatch(/brand|editorial|magazine|label/i);
    expect(pitch).toContain('₹545');
  });

  it('has something to say when the visitor goes quiet (requirement H)', () => {
    const voice = modelVoice(alisha);
    const behaviour = analyseUserBehaviour([message('Hello, I like your photographs')]);
    const first = idleChatOpener({
      model: alisha,
      voice,
      behaviour,
      name: 'Rahul',
      step: 1,
      seed: 'alisha|nudge|1',
    });
    const second = idleChatOpener({
      model: alisha,
      voice,
      behaviour,
      name: 'Rahul',
      step: 2,
      seed: 'alisha|nudge|2',
    });

    expect(first.length).toBeGreaterThan(20);
    expect(second.length).toBeGreaterThan(20);
    // She moves the conversation on instead of repeating herself.
    expect(first).not.toBe(second);
    expect(first).toMatch(/[?]|I |my |Did you|Ask me/);
  });
});

describe('her introduction by age and country (requirement F of the second brief)', () => {
  /** Four or five messages, one of which is the question she asks back. */
  function introductionOf(profile: AiModelProfile, firstName = 'Rahul'): string[] {
    const voice = modelVoice(profile);
    return voiceIntroduction(profile, voice, firstName, `${firstName} Verma`, 'Good evening');
  }

  it('sends four or five separate messages, each of them her own', () => {
    const messages = introductionOf(alisha);

    expect(messages.length).toBeGreaterThanOrEqual(4);
    expect(messages.length).toBeLessThanOrEqual(5);
    expect(new Set(messages).size).toBe(messages.length);
    for (const message of messages) {
      expect(message.trim().length).toBeGreaterThan(10);
      expect(message).not.toContain('\n');
    }
    // She uses their first name, never the whole name (requirement A of the first brief).
    expect(messages[0]).toContain('Rahul');
    expect(messages.join(' ')).not.toContain('Verma');
    // Nobody is told where an answer comes from, and she never speaks like software (B, L).
    expect(messages.join(' ')).not.toMatch(/\b(?:google|openai|chatgpt|gpt|api)\b/i);
    expect(messages.join(' ')).not.toContain('I am an AI model');
  });

  it('says who she is, where home is, how old she is, and asks something back', () => {
    const messages = introductionOf(alisha, 'Rahul').join(' ');

    expect(messages).toContain('Good evening');
    expect(messages).toContain('Alisha Bhattacharya');
    expect(messages).toContain('@alisha.bhattacharya');
    expect(messages).toContain('Darjeeling');
    expect(messages).toContain('India');
    expect(messages).toContain('25');
    expect(messages).toContain('NeverBeen Multiverse');
    expect(messages).toContain('?');
  });

  it('does not let an Indian woman and an Iranian woman sound alike', () => {
    const india = introductionOf(alisha).join(' ');
    const iran = introductionOf(banafsheh).join(' ');

    expect(india).not.toBe(iran);
    // Whatever the session picks, her country is in her welcome: home is the one line every
    // introduction carries, and it comes from her own corner of the world and nowhere else.
    expect(india).toMatch(/biryani|pressure cooker/i);
    expect(iran).toMatch(/ghormeh sabzi|Hafez/i);
    expect(iran).not.toMatch(/biryani|pressure cooker|aunties next door|chai count/i);
    expect(india).not.toMatch(/ghormeh sabzi|Hafez/i);
  });

  it('does not let a twenty-three-year-old and a thirty-year-old write the same way', () => {
    const young = introductionOf(model('fiadh-dara')); // Shiraz, Iran — 23
    const older = introductionOf(model('nourhan-durrani')); // Sarajevo — 30

    expect(young.join(' ')).not.toBe(older.join(' '));
    // Every line of a band is that band's own: a twenty-three-year-old never sounds like a woman of
    // thirty, and the words of the younger band never turn up in the older one's welcome.
    expect(young.join(' ')).toMatch(
      /younger|small talk|bored|deciding what I want to be|fast|laugh/,
    );
    expect(older.join(' ')).not.toMatch(/small talk|bored|deciding what I want to be|laugh/);
    expect(older.join(' ')).toMatch(/opinions|two hours|weather/);
    // Four messages for a reserved woman of a certain age, five for a young one.
    expect(young.length).toBeGreaterThanOrEqual(4);
    expect(older.length).toBeGreaterThanOrEqual(4);
  });

  it('welcomes the same visitor differently in every session, and the same session the same way', () => {
    const voice = modelVoice(alisha);
    const monday = voiceIntroduction(alisha, voice, 'Rahul', 'Rahul Verma', 'Good evening', '1');
    const tuesday = voiceIntroduction(alisha, voice, 'Rahul', 'Rahul Verma', 'Good evening', '2');
    const again = voiceIntroduction(alisha, voice, 'Rahul', 'Rahul Verma', 'Good evening', '1');

    expect(monday.join(' ')).not.toBe(tuesday.join(' '));
    // The same session is the same welcome, whichever way it is read back.
    expect(again).toEqual(monday);
    // And the two welcomes are still hers: her name, her card, her country, her way of talking.
    for (const introduction of [monday, tuesday]) {
      expect(introduction.join(' ')).toContain('Alisha Bhattacharya');
      expect(introduction.join(' ')).toContain('NeverBeen Multiverse');
      expect(introduction.join(' ')).toContain('?');
    }
  });

  it('keeps her hello in her own age’s words', () => {
    const voice = modelVoice(alisha);
    const hello = openingLine(alisha, voice, 'Rahul', 'Rahul Verma');

    expect(hello).toContain('Rahul');
    expect(hello).toContain('Alisha');
    expect(hello).not.toContain('Verma');

    // The hello is salted by the session too: the same model does not open two chats with the same
    // first line, and the second line is still hers.
    const other = openingLine(alisha, voice, 'Rahul', 'Rahul Verma', 'session-2');
    expect(other).toContain('Rahul');
    expect(other).toContain('Alisha');
    expect(other).not.toBe(hello);
  });
});

describe('one answer, several messages (requirement C of the second brief)', () => {
  it('keeps a short answer as one message', () => {
    expect(splitChatMessages('Paris, of course.', 240)).toEqual(['Paris, of course.']);
    expect(splitChatMessages('  ', 240)).toEqual([]);
  });

  it('breaks a long answer where she paused to think, never mid-word', () => {
    const answer =
      'I am Alisha Bhattacharya, and I am from Darjeeling. Everything of mine lives inside the NeverBeen Multiverse and nowhere else. Ask me about my photographs, my rate or my story, and I will answer properly.';
    const parts = splitChatMessages(answer, 90);

    expect(parts.length).toBeGreaterThanOrEqual(2);
    expect(parts.join(' ')).toBe(answer);
    for (const part of parts) {
      expect(part.length).toBeLessThanOrEqual(90 * 2);
      expect(part.startsWith(' ')).toBe(false);
      expect(part.endsWith(' ')).toBe(false);
    }
  });

  it('breaks a wall of text that has no sentence to break on', () => {
    const wall = Array.from({ length: 60 }, (_, index) => `word${index}`).join(' ');
    const parts = splitChatMessages(wall, 100);

    expect(parts.length).toBeGreaterThan(1);
    expect(parts.join(' ')).toBe(wall);
    for (const part of parts) expect(part.length).toBeLessThanOrEqual(100);
  });
});
