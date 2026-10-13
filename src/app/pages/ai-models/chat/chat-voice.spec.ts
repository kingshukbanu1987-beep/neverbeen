import { describe, expect, it } from 'vitest';
import { AiModelProfile, aiModelProfiles } from '../ai-model-data';
import { AiChatMessage } from './chat-types';
import {
  analyseUserBehaviour,
  contractPitch,
  idleChatOpener,
  modelVoice,
  videoRefusal,
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
