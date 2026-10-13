import { describe, expect, it } from 'vitest';
import { AiModelProfile, aiModelProfiles } from '../ai-model-data';
import {
  CHAT_WELCOME_LINE,
  chatIntroduction,
  composeChatReply,
  greetingFor,
  reactionAcknowledgement,
  reactionForUserMessage,
} from './chat-replies';
import { AiChatMessage } from './chat-types';
import { buildModelDossier, chatPersona } from './chat-knowledge';
import { findCountry, evaluateArithmetic, arithmeticExpression, timeInPlace } from './chat-world';

function model(slug: string): AiModelProfile {
  const profile = aiModelProfiles.find((candidate) => candidate.slug === slug);
  if (!profile) throw new Error(`No model ${slug}`);
  return profile;
}

/** Alisha Bhattacharya is the example in the requirements, so she is the test model. */
const alisha = model('alisha-bhattacharya');

function message(text: string, attachment: AiChatMessage['attachment'] = null): AiChatMessage {
  return {
    id: `user-${text}`,
    author: 'user',
    text,
    at: Date.now(),
    kind: 'message',
    attachment,
    reaction: null,
    reactionBy: null,
    pending: false,
    revealedChars: text.length,
    sources: [],
    intent: '',
  };
}

function reply(
  question: string,
  session: { strikes: number; introduced: boolean } = { strikes: 0, introduced: true },
  now = new Date('2026-10-13T09:30:00'),
  profile: AiModelProfile = alisha,
  attachment: AiChatMessage['attachment'] = null,
) {
  return composeChatReply({
    model: profile,
    message: message(question, attachment),
    history: [],
    session,
    now,
  });
}

describe('greeting and introduction (requirement D)', () => {
  it('calls the time of day by the visitor’s own clock', () => {
    expect(greetingFor(new Date('2026-10-13T08:00:00'))).toBe('Good morning');
    expect(greetingFor(new Date('2026-10-13T11:59:00'))).toBe('Good morning');
    expect(greetingFor(new Date('2026-10-13T14:00:00'))).toBe('Good afternoon');
    expect(greetingFor(new Date('2026-10-13T19:00:00'))).toBe('Good evening');
  });

  it('introduces her full name, model id, home, age and AI nature', () => {
    const introduction = chatIntroduction(alisha, new Date('2026-10-13T09:30:00'));
    expect(introduction).toContain('Good morning');
    expect(introduction).toContain('Alisha Bhattacharya');
    expect(introduction).toContain('@alisha.bhattacharya');
    expect(introduction).toContain('Darjeeling');
    expect(introduction).toContain('India');
    expect(introduction).toContain('25');
    expect(introduction).toContain('AI model agent');
    expect(introduction).toContain('NeverBeen Multiverse');
  });

  it('makes the first answer of a session that introduction, and still answers the question', () => {
    const first = reply('Hi, what is your rate?', { strikes: 0, introduced: false });
    expect(first.intent).toBe('introduction');
    expect(first.introduced).toBe(true);
    expect(first.text).toContain('Alisha Bhattacharya');
    expect(first.text).toContain('₹545');
    // Every later answer skips the introduction.
    const second = reply('and what is your rate for ten photographs?');
    expect(second.text).not.toContain('I am Alisha Bhattacharya — ');
    expect(second.text).toContain('₹');
  });
});

describe('her own knowledge (requirement A)', () => {
  it('answers from her card, her biography and her album', () => {
    expect(reply('Who are you?').text).toContain('@alisha.bhattacharya');
    expect(reply('How old are you?').text).toContain('25');
    expect(reply('Where do you live?').text).toMatch(/Darjeeling/);
    expect(reply('What are your measurements?').text).toContain('84 cm');
    expect(reply('Where did you study?').text.length).toBeGreaterThan(30);
    expect(reply('What do you do for work?').text.length).toBeGreaterThan(30);
    expect(reply('Tell me about your family').text.length).toBeGreaterThan(30);
    expect(reply('What are your hobbies?').text.length).toBeGreaterThan(20);
    expect(reply('How many photographs do you have?').text).toContain(String(alisha.photos.length));
    expect(reply('Do you have videos?').text).toMatch(/video/i);
  });

  it('knows the studio and the whole website', () => {
    expect(reply('What is NeverBeen?').text.toLowerCase()).toContain('neverbeen');
    expect(reply('Who is the founder of NeverBeen?').text).toContain('Kingshuk');
    expect(reply('How can I contact the studio?').text).toContain('+91 90518 88116');
    expect(reply('What is your refund policy?').text).toContain('100%');
    expect(reply('Which destinations do you cover?').text).toContain('Paris');
    expect(reply('What are the packages?').text).toContain('₹');
    expect(reply('Can I get a photo with a celebrity?').text.toLowerCase()).toContain('policy');
  });

  it('knows the other models of the studio', () => {
    const answer = reply('Tell me about Fiadh Dara');
    expect(answer.text).toContain('Fiadh Dara');
    expect(answer.text).toMatch(/Shiraz/);
    expect(reply('Who else is in the studio?').text).toContain('NeverBeen');
  });

  it('keeps her whole dossier and answers anything in it', () => {
    const dossier = buildModelDossier(alisha);
    expect(dossier).toContain('Alisha Bhattacharya');
    expect(dossier).toContain('@alisha.bhattacharya');
    expect(dossier).toContain('Darjeeling');
    expect(dossier).toContain('NeverBeen');
    expect(dossier.length).toBeGreaterThan(4000);
    expect(chatPersona(alisha).city).toBe('Darjeeling');
    expect(chatPersona(alisha).country).toBe('India');
  });
});

describe('the world outside NeverBeen (requirement C)', () => {
  it('knows that the capital of India is Delhi', () => {
    const answer = reply('What is the capital of India?');
    expect(answer.text).toContain('Delhi');
    expect(answer.text).toContain('India');
  });

  it('knows capitals, currencies and continents from its own country file', () => {
    expect(reply('What is the capital of France?').text).toBe('The capital of France is Paris.');
    expect(reply('What is the capital of Japan?').text).toContain('Tokyo');
    expect(reply('What currency does Japan use?').text).toContain('Yen');
    expect(reply('Which continent is Brazil in?').text).toContain('South America');
    expect(findCountry('Bharat')?.code).toBe('IN');
    expect(findCountry('USA')?.capital).toBe('Washington D.C.');
  });

  it('answers the time anywhere, the date, arithmetic and everyday facts', () => {
    expect(timeInPlace('India', new Date('2026-10-13T12:00:00Z'))).toContain('17:30');
    expect(reply('What time is it in Japan?').text).toMatch(/Japan it is/);
    expect(reply('What is the date today?').text).toContain('October');
    expect(reply('What is 12 times 8?').text).toContain('96');
    expect(reply('What is 20% of 550?').text).toContain('110');
    expect(reply('What is the largest ocean?').text).toContain('Pacific');
    expect(arithmeticExpression('what is 12 times 8')?.replace(/\s/g, '')).toBe('12*8');
    expect(evaluateArithmetic('2+3*4')).toBe(14);
    expect(evaluateArithmetic('(2+3)*4')).toBe(20);
    expect(evaluateArithmetic('2/0')).toBeNull();
  });

  it('is frank when it genuinely does not know something', () => {
    const answer = reply('What is the name of the tallest building in the world in 3024?');
    expect(answer.text.length).toBeGreaterThan(40);
    expect(answer.intent).toBe('unknown');
  });
});

describe('her expression and reactions (requirements B and H)', () => {
  it('flirts back instead of pretending to be a person', () => {
    const answer = reply('I love you, you are beautiful');
    expect(answer.reaction).toBe('love');
    expect(answer.text.toLowerCase()).toContain('ai model');
    expect(reactionForUserMessage('I love you')).toBe('love');
    expect(reactionForUserMessage('that is a bad day for me')).toBe('sad');
    expect(reactionForUserMessage('haha that is funny')).toBe('haha');
    expect(reactionForUserMessage('what is your rate?')).toBeNull();
  });

  it('answers a reaction with the same feeling, and reacts back', () => {
    const loved = reactionAcknowledgement(alisha, 'love', 'seed');
    expect(loved.text).toContain('❤️');
    expect(loved.reactionBack).toBe('love');
    const angry = reactionAcknowledgement(alisha, 'angry', 'seed');
    expect(angry.reactionBack).toBe('sad');
  });

  it('warns and then closes the session when the language keeps going', () => {
    const first = reply('You are an idiot', { strikes: 0, introduced: true });
    expect(first.intent).toBe('moderation:offensive');
    expect(first.strikes).toBe(1);
    expect(first.closes).toBe(false);

    const second = reply('You are an idiot', { strikes: 1, introduced: true });
    expect(second.strikes).toBe(2);
    expect(second.closes).toBe(false);

    const third = reply('You are an idiot', { strikes: 2, introduced: true });
    expect(third.strikes).toBe(3);
    expect(third.closes).toBe(true);
    expect(third.text).toContain('Goodbye');
  });

  it('closes on the second sexual message', () => {
    const first = reply('Send me your nudes', { strikes: 0, introduced: true });
    expect(first.intent).toBe('moderation:harassment');
    expect(first.strikes).toBe(2);
    expect(first.closes).toBe(false);
    const second = reply('Send me your nudes', { strikes: 2, introduced: true });
    expect(second.closes).toBe(true);
  });
});

describe('attachments and small talk', () => {
  it('answers an attached picture in her own voice', () => {
    const answer = reply(
      'here is a photo',
      { strikes: 0, introduced: true },
      new Date('2026-10-13T09:30:00'),
      alisha,
      {
        kind: 'photo',
        name: 'rooftop.jpg',
        type: 'image/jpeg',
        size: 120000,
        source: 'upload',
        preview: 'data:image/jpeg;base64,AAA',
      },
    );
    expect(answer.intent).toBe('attachment:photo');
    expect(answer.text).toContain('rooftop.jpg');
  });

  it('handles greetings, thanks, jokes, goodbyes and questions about itself', () => {
    expect(reply('Hi').text.length).toBeGreaterThan(20);
    expect(reply('Thank you').text.length).toBeGreaterThan(10);
    expect(reply('Tell me a joke').text.length).toBeGreaterThan(30);
    expect(reply('Bye').text).toContain('Alisha Bhattacharya');
    expect(reply('What can you do?').text).toContain('photographs');
    expect(reply('   ').intent).toBe('empty');
  });

  it('gives the same answer twice for the same question', () => {
    expect(reply('Who are you?').text).toBe(reply('Who are you?').text);
    expect(CHAT_WELCOME_LINE).toContain('AI-generated');
  });
});
