import { describe, expect, it } from 'vitest';
import {
  CHAT_IDENTITY_AVATAR_BYTES,
  CHAT_NAME_MAX_LENGTH,
  CHAT_NAME_MIN_LENGTH,
  chatNameError,
  cleanChatName,
  firstNameOf,
  isValidChatName,
  shortNameOf,
} from './chat-identity';

describe('the name the visitor gives her (requirement A)', () => {
  it('takes three to fourteen characters and nothing shorter or longer', () => {
    expect(CHAT_NAME_MIN_LENGTH).toBe(3);
    expect(CHAT_NAME_MAX_LENGTH).toBe(14);

    expect(isValidChatName('Rahul')).toBe(true);
    expect(isValidChatName('Rahul Verma')).toBe(true);
    expect(isValidChatName('Rahul Verma Singh')).toBe(false); // seventeen
    expect(isValidChatName('Al')).toBe(false);
    expect(isValidChatName('')).toBe(false);
    expect(isValidChatName('123')).toBe(false);
  });

  it('explains itself when the name will not do', () => {
    expect(chatNameError('')).toContain('Your name');
    expect(chatNameError('Al')).toContain('At least 3');
    expect(chatNameError('Rahul Verma Singh')).toContain('14');
    expect(chatNameError('123')).toContain('Letters');
    expect(chatNameError('  Rahul   Verma ')).toBe('');
  });

  it('tidies the whitespace and keeps only the first name for her to use', () => {
    expect(cleanChatName('  Rahul   Verma  ')).toBe('Rahul Verma');
    expect(cleanChatName(null as unknown as string)).toBe('');
    expect(firstNameOf('Rahul Verma')).toBe('Rahul');
    expect(firstNameOf('  Rahul  ')).toBe('Rahul');
    expect(firstNameOf('')).toBe('');
    expect(shortNameOf('Rahul Verma Singh')).toBe('Rahul');
  });

  it('keeps their photograph to about 100 KB', () => {
    expect(CHAT_IDENTITY_AVATAR_BYTES).toBe(100 * 1024);
  });
});
