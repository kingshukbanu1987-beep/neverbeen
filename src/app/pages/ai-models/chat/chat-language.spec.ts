import { describe, expect, it } from 'vitest';
import { aiModelProfiles } from '../ai-model-data';
import {
  ROMANISED_LANGUAGE_BOOKS,
  detectChatLanguage,
  glossRomanised,
  languageForModel,
  readChatLanguage,
  romanisedReply,
} from './chat-language';

const alisha = aiModelProfiles.find((model) => model.slug === 'alisha-bhattacharya')!; // Kolkata
const noorhan = aiModelProfiles.find((model) => model.slug === 'nourhan-durrani')!; // Sarajevo
const leila =
  aiModelProfiles.find((model) => /Iran/.test(model.location ?? '')) ?? aiModelProfiles[0];

describe('the Romanised languages her visitors write in', () => {
  it('gives each model the language of her own country', () => {
    expect(languageForModel(alisha)).toBe('bn');
    expect(languageForModel(leila)).toBe('fa');
    // Bosnia is not one of the books: her visitors are read one message at a time instead.
    expect(languageForModel(noorhan)).toBe('');
  });

  it('reads "ami khete jabo" as Bengali and writes it back in English', () => {
    const reading = detectChatLanguage('ami khete jabo', alisha);
    expect(reading.code).toBe('bn');
    expect(reading.confidence).toBe('own');
    expect(glossRomanised('ami khete jabo', 'bn')).toContain('i am going to eat');
  });

  it('reads the Romanised languages of the other countries too', () => {
    expect(detectChatLanguage('kemon acho?', alisha).code).toBe('bn');
    expect(detectChatLanguage('kya haal hai, kaise ho?', alisha).code).toBe('hi');
    expect(detectChatLanguage('shukriya, aap kaise hain?', alisha).code).toBe('ur');
    expect(detectChatLanguage('salam, chetori? chi khabar?', leila).code).toBe('fa');
    expect(detectChatLanguage('ahlan, shu akhbarak habibi?').code).toBe('ar');
    expect(detectChatLanguage('selam, nasilsin?').code).toBe('tr');
    expect(detectChatLanguage('hola, como estas?').code).toBe('es');
    expect(detectChatLanguage('hai, apa khabar awak?').code).toBe('ms');
  });

  it('leaves plain English alone — no language, and nothing translated', async () => {
    expect(detectChatLanguage('what is your rate for a shoot?', alisha).confidence).toBe('none');
    await expect(
      readChatLanguage('hello, how are you doing today?', alisha, '', { allowNetwork: false }),
    ).resolves.toBeNull();
  });

  it('answers in the visitor’s own language and nowhere else', async () => {
    const reading = await readChatLanguage('ami tomake bhalobashi', alisha, '', {
      allowNetwork: false,
    });
    expect(reading?.romanised).toBe(true);
    expect(reading?.code).toBe('bn');

    const answer = romanisedReply({
      code: 'bn',
      intent: 'affection',
      model: alisha,
      seed: 'seed',
      opening: true,
    });
    expect(answer?.text).toMatch(/[A-Za-z]/);
    expect(answer?.text.toLowerCase()).not.toContain('i am an ai');
    // The switch line comes first when the visitor has just changed language.
    expect(answer?.text.split('\n')[0]).toMatch(/bujhte parchi|Bangla/i);
  });

  it('writes her own details into every language', () => {
    const answer = romanisedReply({ code: 'fa', intent: 'intro', model: leila, seed: 'x' });
    expect(answer?.text).toContain(leila.name);
    expect(answer?.text).toContain('NeverBeen');
  });

  it('never sends the same line twice in one conversation', () => {
    const first = romanisedReply({ code: 'bn', intent: 'affection', model: alisha, seed: 'a' });
    const second = romanisedReply({
      code: 'bn',
      intent: 'affection',
      model: alisha,
      seed: 'b',
      sent: first ? [first.text] : [],
    });
    expect(second?.text).not.toBe(first?.text);
  });

  it('keeps a book for every language it names', () => {
    expect(Object.keys(ROMANISED_LANGUAGE_BOOKS).sort()).toEqual([
      'ar',
      'bn',
      'es',
      'fa',
      'hi',
      'ms',
      'tr',
      'ur',
    ]);
    for (const book of Object.values(ROMANISED_LANGUAGE_BOOKS)) {
      expect(book.markers.length).toBeGreaterThan(5);
      expect(book.replies.unknown.length).toBeGreaterThan(0);
      expect(book.replies.intro[0]).toContain('{name}');
    }
  });
});
