import { describe, expect, it } from 'vitest';
import { readVisitorMessage, repairedToken } from './chat-input';

describe('reading what the visitor typed (typing mistakes)', () => {
  it('writes the everyday short forms out', () => {
    expect(repairedToken('u r so cute')).toBe('you are so cute');
    expect(repairedToken('pls tell me abt ur work')).toBe('please tell me about your work');
    // Her everyday words of another language are never "repaired" away — "yaar" is left alone.
    expect(repairedToken('thnx yaar')).toBe('thanks yaar');
  });

  it('collapses letters people stretch when they are excited', () => {
    const reading = readVisitorMessage('yesssss soooooo beautifulllll');
    expect(reading.analysed).toBe('yes so beautiful');
    expect(reading.repaired).toBe(true);
  });

  it('repairs a word one mistake away from a word the chat listens for', () => {
    expect(repairedToken('you are beutifull today')).toBe('you are beautiful today');
    expect(repairedToken('do you have a boyfrind')).toBe('do you have a boyfriend');
    expect(repairedToken('tell me about your biograhy')).toBe('tell me about your biography');
    expect(repairedToken('i saw ur photograps')).toBe('i saw your photograph');
  });

  it('keeps the visitor’s own words, punctuation and casing in the original', () => {
    const reading = readVisitorMessage('Hey! Are you there??? 😊');
    expect(reading.original).toBe('Hey! Are you there??? 😊');
    expect(reading.analysed).toContain('you');
    // Short words that are already words are left exactly as they are.
    expect(repairedToken('the cat sat on a mat')).toBe('the cat sat on a mat');
  });

  it('never touches a single-letter word in the middle of a sentence it cannot read', () => {
    expect(repairedToken('Zara has 3 dogs')).toBe('zara has 3 dogs');
  });
});
