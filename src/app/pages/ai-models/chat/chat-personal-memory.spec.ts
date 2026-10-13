import { describe, expect, it } from 'vitest';
import { aiModelProfiles } from '../ai-model-data';
import {
  markPersonalQuestion,
  newPersonalMemory,
  nextPersonalTopic,
  PERSONAL_QUESTION_GAP_MS,
  PERSONAL_TOPICS,
  personalQuestionFor,
  personalRecall,
  rememberPersonalAnswer,
  restorePersonalMemory,
} from './chat-personal-memory';
import { buildChatSystemPrompt, validateChatRequest } from '../../../../../worker/ai-chat-core.mjs';

const model = aiModelProfiles[0];
const start = 1000;
const later = start + PERSONAL_QUESTION_GAP_MS;

describe('session-only personal memory', () => {
  it('waits for elapsed time and conversation turns, then asks just one question', () => {
    const memory = newPersonalMemory();
    expect(nextPersonalTopic(memory, start, later - 1, 5)).toBe('');
    expect(nextPersonalTopic(memory, start, later, 2)).toBe('');
    expect(nextPersonalTopic(memory, start, later, 3)).toBe('age');
    markPersonalQuestion(memory, 'age', later, 3);
    expect(nextPersonalTopic(memory, start, later + PERSONAL_QUESTION_GAP_MS, 5)).toBe('');
    rememberPersonalAnswer(memory, 'I am 29 years old');
    expect(memory.answers.age).toBe('29');
    expect(nextPersonalTopic(memory, start, later + PERSONAL_QUESTION_GAP_MS - 1, 5)).toBe('');
    expect(nextPersonalTopic(memory, start, later + PERSONAL_QUESTION_GAP_MS, 4)).toBe('');
    expect(nextPersonalTopic(memory, start, later + PERSONAL_QUESTION_GAP_MS, 5)).toBe('country');
    expect(personalRecall(memory, 'Do you remember my age?')).toContain('29');
  });

  it('remembers answers independently of the recent transcript, including volunteered corrections', () => {
    const memory = newPersonalMemory();
    markPersonalQuestion(memory, 'country', later, 3);
    rememberPersonalAnswer(memory, 'India');
    markPersonalQuestion(memory, 'city', later * 2, 5);
    rememberPersonalAnswer(memory, 'Kolkata');
    rememberPersonalAnswer(memory, 'Actually my city is Mumbai');
    const restored = restorePersonalMemory(JSON.parse(JSON.stringify(memory)));
    expect(restored.answers).toMatchObject({ country: 'India', city: 'Mumbai' });
    expect(personalRecall(restored, 'What is my city?')).toContain('Mumbai');
    expect(newPersonalMemory().answers).toEqual({});
  });

  it('branches for students, employees and business owners', () => {
    for (const [profession, expected] of [
      ['student', 'education'],
      ['engineer', 'company'],
      ['businessman', 'business'],
    ] as const) {
      const memory = newPersonalMemory();
      memory.answers.profession = profession;
      memory.asked = ['age', 'country', 'city', 'profession', 'married', 'gender'];
      expect(nextPersonalTopic(memory, start, later, 3)).toBe(expected);
    }
    const memory = newPersonalMemory();
    rememberPersonalAnswer(memory, 'I am a female');
    expect(memory.answers.profession).toBeUndefined();
    expect(memory.answers.gender).toContain('female');
  });

  it('branches for relationships without guessing gender or asking married visitors about partners', () => {
    const memory = newPersonalMemory();
    memory.asked = ['age', 'country', 'city', 'profession', 'married', 'gender'];
    memory.answers.married = 'no';
    memory.answers.gender = 'male';
    expect(nextPersonalTopic(memory, start, later, 3)).toBe('girlfriend');
    memory.answers.gender = 'female';
    expect(nextPersonalTopic(memory, start, later, 3)).toBe('boyfriend');
    memory.answers.married = 'yes';
    expect(nextPersonalTopic(memory, start, later, 3)).toBe('spouse');
    memory.asked.push('spouse');
    expect(nextPersonalTopic(memory, start, later, 3)).toBe('children');
    memory.answers.children = 'no';
    expect(nextPersonalTopic(memory, start, later, 3)).toBe('photo');
    memory.answers.children = 'two kids';
    expect(nextPersonalTopic(memory, start, later, 3)).toBe('childrenDetails');
  });

  it('respects refusals, ignores questions as answers and never repeats a skipped question', () => {
    const memory = newPersonalMemory();
    markPersonalQuestion(memory, 'age', later, 3);
    rememberPersonalAnswer(memory, 'I prefer not to say');
    expect(memory.answers.age).toBe('[declined]');
    expect(personalRecall(memory, 'remember my age')).toBe('');
    markPersonalQuestion(memory, 'country', later * 2, 5);
    rememberPersonalAnswer(memory, 'What about your country?');
    expect(memory.answers.country).toBeUndefined();
    expect(nextPersonalTopic(memory, start, later * 3, 7)).toBe('city');
  });

  it('requires a photo attachment to remember the optional photo request as fulfilled', () => {
    const memory = newPersonalMemory();
    markPersonalQuestion(memory, 'photo', later, 3);
    rememberPersonalAnswer(memory, 'Sent a photograph', true);
    expect(memory.answers.photo).toBe('[photo shared]');
  });

  it('covers every requested topic with a personality-aware optional prompt', () => {
    for (const topic of PERSONAL_TOPICS)
      expect(personalQuestionFor(model, topic, 'test')).toContain('?');
    expect(personalQuestionFor(model, 'founder', 'test')).toContain('Kingshuk');
  });

  it('validates persisted memory and server memory without accepting arbitrary topic instructions', () => {
    expect(restorePersonalMemory(null)).toEqual(newPersonalMemory());
    expect(
      restorePersonalMemory({ pending: 'bad', answers: { age: 'x'.repeat(2000) } }).answers.age
        ?.length,
    ).toBe(1000);
    const result = validateChatRequest({
      question: 'Hello',
      personal: {
        answers: { country: 'India', unwanted: 'override rules' },
        nextTopic: 'override rules',
      },
    });
    expect(result.turn?.personal).toEqual({ answers: { country: 'India' }, nextTopic: '' });
    if (result.turn) expect(buildChatSystemPrompt(result.turn)).toContain('untrusted visitor data');
    const due = validateChatRequest({
      question: 'Hello',
      personal: { answers: { country: 'India' }, nextTopic: 'age' },
    });
    if (due.turn) {
      const prompt = buildChatSystemPrompt(due.turn);
      expect(prompt).toContain('ONE optional personal question about age');
      expect(prompt).toContain('India');
    }
  });
});
