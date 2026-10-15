import type { PaymentPackageId } from './payment-packages';
/**
 * Who the visitor is (requirement A): the name she uses for them and the photograph that stands
 * beside their messages in the chat window.
 *
 * The form in front of the chat window is `chat-identity-prompt.*`; the rules live here so the
 * window, the service and the reply engine all agree on what a valid visitor looks like.
 */

import { assessChatLanguage } from './chat-moderation';

/** The visitor's name, as the form checks it. */
export const CHAT_NAME_MIN_LENGTH = 3;
export const CHAT_NAME_MAX_LENGTH = 14;

/** The picture the identity form keeps — reduced to about 100 KB before it is stored. */
export const CHAT_IDENTITY_AVATAR_BYTES = 100 * 1024;

export interface ChatIdentity {
  /** Selected checkout duration; only used for Premium sessions. */
  paymentPackageId?: PaymentPackageId;
  /** What the visitor typed, cleaned up: "Alisha Bhattacharya". */
  name: string;
  /** Data URL of their photograph, already reduced to about 100 KB. */
  avatar: string;
}

/** Collapses the whitespace a name can arrive with. */
export function cleanChatName(raw: string): string {
  return String(raw ?? '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** The reason the name is not acceptable yet, or `''` when it is. */
export function chatNameError(raw: string): string {
  const name = cleanChatName(raw);
  if (name.length === 0) return 'Your name, so I know who I am talking to.';
  const languageError = chatNameLanguageError(name);
  if (languageError) return languageError;
  if (name.length < CHAT_NAME_MIN_LENGTH) {
    return `At least ${CHAT_NAME_MIN_LENGTH} letters, please — initials are hard to talk to.`;
  }
  if (name.length > CHAT_NAME_MAX_LENGTH) {
    return `${CHAT_NAME_MAX_LENGTH} letters at most — a nickname will do.`;
  }
  if (!/\p{L}/u.test(name)) return 'Letters, please. That is not a name yet.';
  return '';
}

export function isValidChatName(raw: string): boolean {
  return chatNameError(raw) === '';
}

/**
 * "Alisha Bhattacharya" → "Alisha": she addresses the visitor by their first name only, exactly as
 * the requirement asks.
 */
export function firstNameOf(raw: string): string {
  const name = cleanChatName(raw);
  const [first = ''] = name.split(' ');
  return first;
}

/** A short, safe form of the visitor's name for the window's chips and the summary. */
export function shortNameOf(name: string): string {
  return firstNameOf(name).slice(0, CHAT_NAME_MAX_LENGTH);
}

/** Names use stricter rules than chat: standalone sexual terms are not names either. */
export function chatNameLanguageError(name: string): string {
  const normal = name
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/0/g, 'o')
    .replace(/[1!]/g, 'i')
    .replace(/3/g, 'e')
    .replace(/[4@]/g, 'a')
    .replace(/[5$]/g, 's')
    .replace(/7/g, 't');
  const sexual =
    /(?:^|[^a-z])(?:sex|sexy|sexual|xxx|porn|porno|nude|nudes|naked|boobs?|tits?|pussy|penis|vagina|dick|cock|cum|orgasm|horny|blowjob|handjob|milf|prostitute)(?:s)?(?=$|[^a-z])/;
  if (
    sexual.test(normal) ||
    sexual.test(normal.replace(/[*_#]/g, '')) ||
    assessChatLanguage(normal).level === 'harassment'
  ) {
    return 'Your name cannot contain sexual words. Please enter your name or a respectful nickname.';
  }
  if (assessChatLanguage(normal).level !== 'clean') {
    return 'Your name cannot contain offensive language or abusive slang. Please choose a respectful name.';
  }
  return '';
}
