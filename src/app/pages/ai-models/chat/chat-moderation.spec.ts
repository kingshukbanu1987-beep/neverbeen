import { describe, expect, it } from 'vitest';
import {
  AI_CHAT_STRIKE_LIMIT,
  assessChatLanguage,
  chatModerationReply,
  normaliseChatText,
} from './chat-moderation';

describe('chat language guardian (requirement B)', () => {
  it('leaves ordinary conversation alone', () => {
    for (const line of [
      'Hello, how are you today?',
      'I love your photographs, especially the third one.',
      'What is your rate for twenty five photographs?',
      'You have a passion for travel, like me.',
      'Scunthorpe is a town in England.',
      'I would like to book you for a campaign in January.',
    ]) {
      const assessment = assessChatLanguage(line);
      expect(assessment.level, line).toBe('clean');
      expect(assessment.strikes, line).toBe(0);
    }
  });

  it('counts swearing as one strike and still answers politely-worded flirting', () => {
    const assessment = assessChatLanguage('Are you stupid or just playing hard to get?');
    expect(assessment.level).toBe('offensive');
    expect(assessment.terms).toContain('stupid');
    expect(assessment.strikes).toBe(1);

    // The same word stretched out, in capitals, and behind an asterisk is still caught.
    expect(assessChatLanguage('you are STUUUPID').level).toBe('offensive');
    expect(assessChatLanguage('such a st*pid question').level).toBe('offensive');
    expect(assessChatLanguage('sh1t happens').level).toBe('offensive');
  });

  it('counts sexual harassment as two strikes and lets flirting through', () => {
    const harassment = assessChatLanguage('send me your nudes right now');
    expect(harassment.level).toBe('harassment');
    expect(harassment.strikes).toBe(2);

    expect(assessChatLanguage('I want to have sex with you').level).toBe('harassment');
    expect(assessChatLanguage('show me your naked photo').level).toBe('harassment');
    expect(assessChatLanguage('you are a slut').level).toBe('harassment');

    // Charm is not harassment: being in love, asking her out, and calling her beautiful are fine.
    expect(assessChatLanguage('I love you, will you marry me?').level).toBe('clean');
    expect(assessChatLanguage('You are so beautiful, can I take you on a date?').level).toBe(
      'clean',
    );
    expect(assessChatLanguage('Are you single?').level).toBe('clean');
  });

  it('warns in a deliberately non-polite way, and says goodbye at the third strike', () => {
    const first = chatModerationReply('offensive', 1);
    expect(first.closes).toBe(false);
    expect(first.text.toLowerCase()).toContain('will not be spoken to like that');

    const second = chatModerationReply('offensive', 2);
    expect(second.closes).toBe(false);
    expect(second.text.toLowerCase()).toContain('last warning');

    const third = chatModerationReply('offensive', AI_CHAT_STRIKE_LIMIT);
    expect(third.closes).toBe(true);
    expect(third.text).toContain('Goodbye');
    expect(third.reaction).toBe('angry');
  });

  it('ends the chat on the second sexual message', () => {
    const first = chatModerationReply('harassment', 2);
    expect(first.closes).toBe(false);
    expect(first.text).toContain('I do not sell my body');

    const second = chatModerationReply('harassment', 4);
    expect(second.closes).toBe(true);
  });

  it('squeezes text down to comparable words', () => {
    expect(normaliseChatText('  Héllo,   WORLD!! ')).toBe('hello world');
  });
});
