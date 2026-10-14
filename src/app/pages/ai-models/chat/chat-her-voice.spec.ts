import { describe, expect, it } from 'vitest';
import { BOT_LINE_PATTERNS, botLineIn, herOwnWords, readsLikeABot } from './chat-her-voice';

describe('requirement L — never a bot line', () => {
  it('names the phrase that gives a chatbot away, and stays quiet on her own words', () => {
    expect(botLineIn('As an AI, I cannot browse the internet.')).toBe('as-an-ai');
    expect(botLineIn('I am a language model, so I have no feelings about it.')).toBe('i-am-an-ai');
    expect(botLineIn('How can I help you today?')).toBe('how-can-i-help');
    expect(botLineIn('My database says Darjeeling is beautiful in October.')).toBe('my-database');
    expect(botLineIn('Google Gemini wrote this line.')).toBe('google-api');
    expect(botLineIn('I hope this helps!')).toBe('hope-this-helps');
    expect(botLineIn('Assistant: Darjeeling is lovely this time of year.')).toBe('role-label');

    // Her own voice — a compliment, a fact, her job as a model — is not a bot line.
    expect(botLineIn('You are very beautiful, and I wanted you to know it.')).toBe('');
    expect(botLineIn('Delhi, of course. Have you been there?')).toBe('');
    expect(
      botLineIn('I model for the NeverBeen studio, and I am a Gemini, if you believe in that.'),
    ).toBe('');
    expect(botLineIn('I am not sure, honestly. What do you think?')).toBe('');
    expect(readsLikeABot('As an AI model of the NeverBeen studio.')).toBe(true);
    expect(readsLikeABot('It is raining here and I am under a blanket.')).toBe(false);
  });

  it('never fires on the words this chat actually uses', () => {
    const herOwn: readonly string[] = [
      'Send me a line — or a photograph — and I will answer properly.',
      'Hmm, I am not sure I follow you. Tell me again in another way — what did you mean?',
      'Darjeeling in October is mist and tea and me complaining about the cold. Where are you?',
      'I am an AI model, but I am also Alisha — and I would rather talk about you.',
    ];
    for (const line of herOwn.slice(0, 3)) expect(botLineIn(line)).toBe('');
    // The one line she must never say: the label is exactly what the guard is for.
    expect(botLineIn(herOwn[3])).toBe('i-am-an-ai');
    expect(BOT_LINE_PATTERNS.length).toBeGreaterThan(15);
  });

  it('leaves a text that is already hers exactly as it was', () => {
    const line = 'Delhi, of course 😊\n\nHave you been? I want to hear it from you.';
    expect(herOwnWords(line)).toBe(line);
    expect(herOwnWords('')).toBe('');
  });

  it('takes the bot line out and keeps the rest of what she said', () => {
    expect(
      herOwnWords(
        'As an AI, I cannot browse the internet. But Darjeeling is beautiful in October.',
      ),
    ).toBe('But Darjeeling is beautiful in October.');
    expect(herOwnWords('I am an AI model here to help.\n\nHow can I help you today?')).toBe('');
    expect(
      herOwnWords(
        'That tea garden is my favourite place. I hope this helps!\n\nWhat does your street look like?',
      ),
    ).toBe('That tea garden is my favourite place.\n\nWhat does your street look like?');
    // Markdown is a model's habit too: the words stay, the furniture goes.
    expect(herOwnWords('**That** is _exactly_ it.')).toBe('That is exactly it.');
    expect(herOwnWords('- Tea first\n- Then the mountains')).toBe('Tea first Then the mountains');
  });
});
