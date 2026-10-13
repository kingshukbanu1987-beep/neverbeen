/**
 * A, B and D — the whole of her own initiative, in one place.
 *
 * The window's service used to fill every silence on a timer, which meant that a woman who had just
 * said hello to somebody who never answered kept talking to an empty room. The three requirements
 * that decide what she does instead are read here, from the transcript alone, so they can be tested
 * without a clock:
 *
 * - **A — she speaks first, and then she waits.** Her introduction is hers to send the moment the
 *   form in front of the window is filled in; after that, not one word of her own until the visitor
 *   has written something. `heardFrom` is that line, and nothing is written on her side of the
 *   window while it is false.
 * - **B — she keeps a conversation going.** Three situations give her the floor again: the session
 *   has already run `AI_CHAT_ENGAGED_MS` (five minutes), a subject they keep coming back to is in
 *   the transcript, or the visitor asked her something and she has an answer's worth more to say.
 *   `reason` is which one it is, and her follow-up is written for it.
 * - **D — she stops waiting.** `AI_CHAT_INTEREST_MS` (three minutes) of silence, measured from the
 *   visitor's last message, is an answer of its own: they are not interested in this chat, she says
 *   so kindly and closes the session. `disinterested` is that moment.
 */
import { AiChatMessage } from './chat-types';
import { AI_CHAT_ENGAGED_MS, AI_CHAT_INTEREST_MS } from './chat-types';
import { analyseUserBehaviour } from './chat-voice';

/** Why she may write again without being asked — the three situations of requirement B. */
export type ChatInitiativeReason = '' | 'session' | 'topic' | 'question';

export interface ChatInitiative {
  /**
   * A — the visitor has written at least once. Before that she has said her hello and is waiting: no
   * reminders, no small talk, no second introduction.
   */
  heardFrom: boolean;
  /** B — why she may write something of her own now; `''` means she may not. */
  reason: ChatInitiativeReason;
  /** B — the subject the two of them keep coming back to, when the transcript has one. */
  topic: string;
  /** D — how long the visitor has been quiet. */
  silenceMs: number;
  /** D — the silence has become an answer: she closes the session rather than keep talking. */
  disinterested: boolean;
}

/**
 * The opening words of a real question, for the messages that ask one without a question mark —
 * "tell me about your day", "what is your rate for a shoot".
 */
const QUESTION_OPENER =
  /^(?:what|why|how|when|where|who|which|whose|do|does|did|are|is|was|were|can|could|would|will|shall|should|may|have|has|had|tell me|give me|show me|send me|describe|explain|list)\b/i;

/** True when this message asks her something, whether or not it carries a question mark. */
export function asksSomething(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed) return false;
  if (/[?？]/u.test(trimmed)) return true;
  // A message that opens with a question word is a question even when the visitor forgot the mark.
  return QUESTION_OPENER.test(trimmed.replace(/^[^\p{L}\p{N}]+/u, ''));
}

/** The visitor's own messages, in order — the ones that count as hearing from them. */
export function visitorMessages(messages: readonly AiChatMessage[]): AiChatMessage[] {
  return messages.filter((message) => message.author === 'user' && message.kind === 'message');
}

/**
 * A, B and D read from one transcript. The caller brings the clock (`now`, `startedAt` and the
 * moment the visitor last wrote) so the window's service and the tests share exactly this logic.
 */
export function chatInitiative(options: {
  messages: readonly AiChatMessage[];
  /** When the visitor introduced themselves and the session's two hours began; 0 before that. */
  startedAt: number;
  /** When the visitor last wrote, or 0 when they never have. */
  lastVisitorAt: number;
  now: number;
}): ChatInitiative {
  const { messages, startedAt, lastVisitorAt, now } = options;
  const theirs = visitorMessages(messages);
  const heardFrom = theirs.length > 0;

  // D — the silence is measured from their last message. Somebody who never wrote is measured from
  // the moment she opened the window on them: her introduction was their invitation to answer.
  const since = lastVisitorAt > 0 ? lastVisitorAt : startedAt;
  const silenceMs = since > 0 ? Math.max(0, now - since) : 0;
  // Somebody who never wrote a word is as silent as somebody who stopped writing: both get the same
  // three minutes before she takes the hint.
  const disinterested = startedAt > 0 && silenceMs >= AI_CHAT_INTEREST_MS;

  if (!heardFrom) {
    return { heardFrom, reason: '', topic: '', silenceMs, disinterested };
  }

  const behaviour = analyseUserBehaviour(messages);
  const topic = behaviour.interests[0] ?? '';
  const last = theirs[theirs.length - 1];
  const asked = Boolean(last && asksSomething(last.text));

  // B — the session has run long enough that a person would say something on her own, or there is a
  // subject in play, or the visitor asked her something. Nothing else gives her the floor.
  const engaged = startedAt > 0 ? now - startedAt >= AI_CHAT_ENGAGED_MS : false;
  const reason: ChatInitiativeReason = engaged ? 'session' : topic ? 'topic' : asked ? 'question' : '';

  return { heardFrom, reason, topic, silenceMs, disinterested };
}
