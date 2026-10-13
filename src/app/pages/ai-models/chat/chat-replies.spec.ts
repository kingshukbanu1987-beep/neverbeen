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
import { ChatTurnReading } from './chat-analysis';
import { buildModelDossier, chatPersona } from './chat-knowledge';
import { videoRefusal } from './chat-voice';
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

  it('introduces her name, her model id and where the whole of her lives — and nothing she was not asked for (requirement C)', () => {
    const introduction = chatIntroduction(alisha, new Date('2026-10-13T09:30:00'));
    expect(introduction).toContain('Good morning');
    expect(introduction).toContain('Alisha Bhattacharya');
    expect(introduction).toContain('@alisha.bhattacharya');
    // L — no bot line: she says the same thing the way a woman would say it.
    expect(introduction).not.toContain('I am an AI model');
    expect(introduction).toContain('not pretending otherwise');
    expect(introduction).toContain('NeverBeen Multiverse');
    // C — her home, her age and her album are answers, not an introduction: she keeps them for the
    // visitor who asks for them (see "her own knowledge" below).
    expect(introduction).not.toContain('Darjeeling');
    expect(introduction).not.toContain('India');
    expect(introduction).not.toMatch(/\b25\b/);
    expect(introduction).not.toMatch(
      /\b\d+\s+(?:photographs?|photos?|pictures?|videos?|frames?)\b/i,
    );
  });

  it('makes the first answer of a session that introduction, and still answers the question', () => {
    const first = reply('Hi, what is your rate?', { strikes: 0, introduced: false });
    expect(first.intent).toBe('introduction');
    expect(first.introduced).toBe(true);
    expect(first.text).toContain('Alisha Bhattacharya');
    expect(first.text).toContain('₹545');
    // Every later answer skips the introduction.
    const second = reply('and what is your rate for ten photographs?');
    expect(second.text).not.toContain('Alisha Bhattacharya');
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
    // J — the founder's wording, exactly, with nothing of her own added to it.
    expect(reply('Do you have videos?').text).toBe(videoRefusal());
    expect(reply('send me a clip of you').text).toBe(videoRefusal());
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
    // Her answers carry her own mood on top of the fact (requirement C).
    expect(reply('What is the capital of France?').text).toContain(
      'The capital of France is Paris.',
    );
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
  it('answers a smiley sent on its own, and sends one when it is asked for (requirement D)', () => {
    const bare = reply('😊');
    expect(bare.text.length).toBeGreaterThan(20);
    expect(bare.text).toMatch(/[\u{1F300}-\u{1FAFF}]/u);
    expect(bare.text).not.toContain('I do not know that one');

    const hearts = reply('❤️❤️');
    expect(hearts.text).not.toContain('I do not know that one');

    const asked = reply('send me a smiley');
    expect(asked.text).toMatch(/[\u{1F300}-\u{1FAFF}]/u);
    expect(asked.text).not.toContain('I do not know that one');
  });

  it('flirts back instead of pretending to be a person', () => {
    const answer = reply('I love you, you are beautiful');
    expect(answer.reaction).toBe('love');
    // She never claims to be a woman living down the road, and never says "I am an AI model".
    expect(answer.text.toLowerCase()).toContain('neverbeen');
    expect(answer.text.toLowerCase()).not.toContain('i am an ai model');
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

  it('answers a compliment like a woman, not like a machine (the studio’s own example)', () => {
    const answer = reply('you are very beautiful');
    expect(answer.intent).not.toBe('unknown');
    // Nothing about capitals, currencies or what she is good at — she blushes and asks something.
    expect(answer.text.toLowerCase()).not.toContain('capital');
    expect(answer.text.toLowerCase()).not.toContain('currency');
    expect(answer.text.toLowerCase()).not.toContain('i will shine');
    expect(answer.text.split('\n').length).toBeGreaterThan(1);
    // Warm, in her own words, and with a question of her own at the end.
    expect(answer.text).toMatch(
      /thank|blush|pink|smil|charming|insufferable|kind|lovely|pretty|beautiful/i,
    );
    expect(answer.text).toMatch(/\?/);
  });

  it('reads a compliment through spelling mistakes and stretched letters', () => {
    const straight = reply('you are very beautiful');
    const typed = reply('u r sooooo beutifull!!');
    expect(typed.intent).not.toBe('unknown');
    expect(typed.text).not.toContain('i am not sure i follow you');
    expect(straight.intent).toBe(typed.intent);
  });

  it('answers a personal question as herself, never with “it is on the website”', () => {
    for (const question of [
      'do you have a boyfriend?',
      'tell me about your studies',
      'how did your career start?',
      'what is your dream?',
    ]) {
      const answer = reply(question);
      expect(answer.intent).toBe('biography');
      expect(answer.text.toLowerCase()).not.toContain('would rather quote it');
      expect(answer.text.toLowerCase()).not.toContain('on the website');
      expect(answer.text).toMatch(/\?/);
    }
  });

  it('never repeats the same sentence twice in one conversation', () => {
    const said = 'achha — you say that very easily. thank you, i have gone a little pink.';
    const historyHome: AiChatMessage[] = [
      {
        id: 'm1',
        author: 'model',
        text: said,
        at: Date.now(),
        kind: 'message',
        attachment: null,
        reaction: null,
        reactionBy: null,
        pending: false,
        revealedChars: said.length,
        sources: [],
        intent: 'affection',
      },
    ];
    const answer = composeChatReply({
      model: alisha,
      message: message('you are very beautiful'),
      history: historyHome,
      session: { strikes: 0, introduced: true },
      now: new Date('2026-10-13T09:30:00'),
    });
    expect(answer.text).not.toContain('you say that very easily');
  });

  it('asks again instead of listing what she knows when a message makes no sense', () => {
    const answer = reply('zzz qqq wwww');
    expect(answer.intent).toBe('unknown');
    expect(answer.text.toLowerCase()).not.toContain('capital');
    expect(answer.text.toLowerCase()).not.toContain('currenc');
    expect(answer.text.toLowerCase()).not.toContain('i do not know that one');
    expect(answer.text).toMatch(/\?/);
  });

  it('answers a Romanised message in that language and nowhere else', () => {
    const answer = composeChatReply({
      model: alisha,
      message: message('ami tomake bhalobashi'),
      history: [],
      session: { strikes: 0, introduced: true },
      language: {
        code: 'bn',
        label: 'Bengali',
        english: 'i love you',
        romanised: true,
        source: 'books',
        fresh: true,
      },
      now: new Date('2026-10-13T09:30:00'),
    });
    expect(answer.intent).toBe('language:bn:affection');
    expect(answer.text).toMatch(/[A-Za-z]/);
    expect(answer.text.toLowerCase()).not.toContain('thank you');
    expect(answer.text).not.toContain('I ');
  });

  it('introduces herself in the visitor’s language on the first Bengali message', () => {
    const answer = composeChatReply({
      model: alisha,
      message: message('kemon acho?'),
      history: [],
      session: { strikes: 0, introduced: false },
      language: {
        code: 'bn',
        label: 'Bengali',
        english: 'how are you',
        romanised: true,
        source: 'books',
        fresh: true,
      },
      now: new Date('2026-10-13T09:30:00'),
    });
    expect(answer.intent).toBe('language:bn:intro');
    expect(answer.introduced).toBe(true);
    expect(answer.text).toContain('Alisha Bhattacharya');
  });
});

describe('the reading comes before the answer (nothing is answered before it is read)', () => {
  /** The window's own reading, replaced by what the studio's desk made of the same turn. */
  function reading(overrides: Partial<ChatTurnReading>): ChatTurnReading {
    return {
      source: 'studio',
      provider: 'gemini',
      english: '',
      language: '',
      languageName: '',
      romanised: false,
      intent: 'other',
      sentiment: 'neutral',
      tone: '',
      about: '',
      wants: '',
      attachment: '',
      advice: '',
      ...overrides,
    };
  }

  function replyWith(
    text: string,
    turnReading: ChatTurnReading,
    attachment: AiChatMessage['attachment'] = null,
  ) {
    return composeChatReply({
      model: alisha,
      message: message(text, attachment),
      history: [],
      session: { strikes: 0, introduced: true },
      reading: turnReading,
      now: new Date('2026-10-13T09:30:00'),
    });
  }

  it('answers the meaning the desk found, not the letters that were typed', () => {
    // The message itself is a compliment a spell-checker would give up on: the desk read it first.
    const answer = replyWith(
      'u r sooooooooo beutifull',
      reading({
        english: 'You are very beautiful.',
        intent: 'compliment',
        sentiment: 'warm',
      }),
    );

    expect(answer.text).toMatch(
      /thank|blush|pink|smil|charming|insufferable|kind|lovely|pretty|beautiful/i,
    );
    expect(answer.text).toMatch(/\?/);
  });

  it('understands a language the studio has no book for, and still answers in English', () => {
    const answer = replyWith(
      'shoot panam evlo',
      reading({
        english: 'How much do you charge for a shoot?',
        // A language the studio has no book for: the desk's English is what she answers.
        language: '',
        languageName: 'Tamil',
        romanised: true,
        intent: 'studio',
      }),
    );

    expect(answer.intent).not.toContain('language:');
    expect(answer.text).toContain('₹');
  });

  it('reacts to what the desk saw inside the photograph the visitor sent', () => {
    const answer = replyWith(
      'here is one of me',
      reading({
        english: 'Here is a photograph of me.',
        intent: 'photo',
        attachment: 'A man on a beach at sunset, standing in the water, shot from behind.',
      }),
      {
        kind: 'photo',
        name: 'beach.jpg',
        type: 'image/jpeg',
        size: 100,
        source: 'upload',
        preview: 'data:image/jpeg;base64,AAAA',
      },
    );

    expect(answer.intent).toBe('attachment:photo');
    expect(answer.text).toContain('beach at sunset');
    expect(answer.text).toMatch(/\?/);
  });

  it('answers a document it has actually read, rather than thanking them for the file', () => {
    const answer = replyWith(
      'here is the brief',
      reading({
        english: 'Here is the brief for the shoot.',
        intent: 'document',
        attachment:
          'A two-page PDF: a creative brief for a beach editorial in Goa, budget ₹40,000.',
      }),
      {
        kind: 'document',
        name: 'brief.pdf',
        type: 'application/pdf',
        size: 900,
        source: 'file',
        preview: '',
        fileData: 'data:application/pdf;base64,JVBERi0xLjQK',
      },
    );

    expect(answer.text).toContain('creative brief');
    expect(answer.text).not.toContain('tell me what is inside it');
  });

  it('takes the selfie for the word “selfie”, and sends the album for “photos”', () => {
    const posed = replyWith(
      'send me a selfie',
      reading({ english: 'Send me a selfie.', intent: 'selfie' }),
    );
    expect(posed.selfie).toBe(true);
    expect(posed.selfieMoment?.place.length).toBeGreaterThan(5);
    expect(posed.selfieMoment?.flaw.length).toBeGreaterThan(5);
    // The caption says where and how it was taken, in the same moment.
    expect(posed.text).toContain(posed.selfieMoment!.place);
    expect(posed.text).toContain(posed.selfieMoment!.flaw);

    const album = replyWith(
      'can I see your photos?',
      reading({ english: 'Show me your photos.', intent: 'selfie' }),
    );
    expect(album.selfie).toBe(true);
    expect(album.selfieMoment).toBeUndefined();
  });
});
