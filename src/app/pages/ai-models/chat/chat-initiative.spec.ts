import { describe, expect, it } from 'vitest';
import {
  AI_CHAT_ENGAGED_MS,
  AI_CHAT_INTEREST_MS,
  AiChatMessage,
} from './chat-types';
import { asksSomething, chatInitiative, visitorMessages } from './chat-initiative';

const startedAt = Date.UTC(2026, 9, 13, 20, 0, 0);
let counter = 0;

/** One message of the transcript, `at` counted from the moment the form was filled in. */
function message(
  author: AiChatMessage['author'],
  text: string,
  at: number,
  kind: AiChatMessage['kind'] = 'message',
): AiChatMessage {
  counter += 1;
  return {
    id: `m${counter}`,
    author,
    text,
    at: startedAt + at,
    kind,
    attachment: null,
    reaction: null,
    reactionBy: null,
    pending: false,
    revealedChars: text.length,
    sources: [],
    intent: '',
  };
}

describe('A — she says her hello and waits', () => {
  it('gives her no floor at all while every word in the transcript is hers', () => {
    const initiative = chatInitiative({
      messages: [
        message('model', 'Hey Rahul — I am Alisha.', 1_000),
        message('model', 'Everything of me lives inside the NeverBeen Multiverse.', 4_000),
      ],
      startedAt,
      lastVisitorAt: startedAt,
      now: startedAt + 2 * 60_000,
    });

    expect(initiative.heardFrom).toBe(false);
    expect(initiative.reason).toBe('');
    // The visitor's silence is theirs to break — this is not a subject, a question or a long chat.
    expect(initiative.silenceMs).toBe(2 * 60_000);
    expect(initiative.disinterested).toBe(false);
  });
});

describe('B — the three situations that give her the floor', () => {
  it('keeps it shut in a young conversation with no subject and no question', () => {
    const messages = [
      message('model', 'Hey Rahul — I am Alisha.', 1_000),
      message('user', 'Hello', 30_000),
    ];
    const initiative = chatInitiative({
      messages,
      startedAt,
      lastVisitorAt: startedAt + 30_000,
      now: startedAt + 2 * 60_000,
    });

    expect(initiative.heardFrom).toBe(true);
    expect(initiative.reason).toBe('');
    expect(initiative.topic).toBe('');
  });

  it('continues the subject the two of them keep coming back to', () => {
    const messages = [
      message('model', 'Hey Rahul.', 1_000),
      message('user', 'I love to travel — I am always somewhere new', 30_000),
    ];
    const initiative = chatInitiative({
      messages,
      startedAt,
      lastVisitorAt: startedAt + 30_000,
      now: startedAt + 2 * 60_000,
    });

    expect(initiative.reason).toBe('topic');
    expect(initiative.topic).toBe('travel');
  });

  it('has something to add once the visitor has asked her something', () => {
    const messages = [
      message('model', 'Hey Rahul.', 1_000),
      message('user', 'Are you really there', 30_000),
    ];
    const initiative = chatInitiative({
      messages,
      startedAt,
      lastVisitorAt: startedAt + 30_000,
      now: startedAt + 90_000,
    });

    expect(initiative.reason).toBe('question');
  });

  it('keeps a conversation older than five minutes going whoever is talking', () => {
    const messages = [
      message('model', 'Hey Rahul.', 1_000),
      message('user', 'Hello', 30_000),
    ];
    const initiative = chatInitiative({
      messages,
      startedAt,
      lastVisitorAt: startedAt + 30_000,
      now: startedAt + AI_CHAT_ENGAGED_MS + 1_000,
    });

    expect(initiative.reason).toBe('session');
  });

  it('counts only the visitor’s own words as hearing from them', () => {
    const messages = [
      message('system', 'This is a private two-hour chat with an AI model.', 500, 'notice'),
      message('system', 'One minute left.', 900, 'reminder'),
      message('model', 'Hey Rahul.', 1_000),
      message('user', 'Hi', 20_000),
    ];

    expect(visitorMessages(messages)).toHaveLength(1);
    expect(
      chatInitiative({ messages, startedAt, lastVisitorAt: startedAt + 20_000, now: startedAt + 30_000 })
        .heardFrom,
    ).toBe(true);
  });
});

describe('D — the silence she reads as an answer', () => {
  it('is not an answer yet at two minutes fifty-nine', () => {
    const initiative = chatInitiative({
      messages: [message('user', 'Hello', 1_000)],
      startedAt,
      lastVisitorAt: startedAt + 1_000,
      now: startedAt + 1_000 + AI_CHAT_INTEREST_MS - 1_000,
    });

    expect(initiative.disinterested).toBe(false);
  });

  it('is an answer at three minutes, measured from the visitor’s last message', () => {
    const initiative = chatInitiative({
      messages: [
        message('model', 'Tell me about your day.', 1_000),
        message('user', 'Hello', 1_000),
      ],
      startedAt,
      lastVisitorAt: startedAt + 1_000,
      now: startedAt + 1_000 + AI_CHAT_INTEREST_MS,
    });

    expect(initiative.disinterested).toBe(true);
    expect(initiative.silenceMs).toBe(AI_CHAT_INTEREST_MS);
  });

  it('is measured from her hello when the visitor never wrote a word', () => {
    const initiative = chatInitiative({
      messages: [message('model', 'Hey Rahul — I am Alisha.', 4_000)],
      startedAt,
      lastVisitorAt: 0,
      now: startedAt + AI_CHAT_INTEREST_MS,
    });

    expect(initiative.heardFrom).toBe(false);
    expect(initiative.disinterested).toBe(true);
  });

  it('never ends a session that has not started', () => {
    const initiative = chatInitiative({
      messages: [],
      startedAt: 0,
      lastVisitorAt: 0,
      now: startedAt + 10 * 60_000,
    });

    expect(initiative.silenceMs).toBe(0);
    expect(initiative.disinterested).toBe(false);
  });
});

describe('asksSomething', () => {
  it('hears a question with a mark and one without', () => {
    expect(asksSomething('What is the capital of India?')).toBe(true);
    expect(asksSomething('Tell me about your childhood')).toBe(true);
    expect(asksSomething('how old are you')).toBe(true);
    expect(asksSomething('Send me a photo')).toBe(true);
  });

  it('does not hear a question in a statement, a greeting or an empty line', () => {
    expect(asksSomething('Hello there')).toBe(false);
    expect(asksSomething('I am fine, thank you')).toBe(false);
    expect(asksSomething('   ')).toBe(false);
  });
});
