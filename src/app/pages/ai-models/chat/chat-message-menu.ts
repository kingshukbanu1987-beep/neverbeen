/**
 * The Instagram message menu: which actions a message offers, in the order they are shown. The
 * window opens it on a right click or after a long press of about half a second on a bubble
 * (`ai-model-chat.ts`); this file decides what is on it, so the rules can be read and tested apart
 * from the page.
 *
 * Order, as the visitor sees it: Reply, Forward, Copy, Delete for you, Unsend (their own messages,
 * within two minutes of sending), Pin — and Unpin in place of Pin on a pinned message.
 */
import { AiChatMessage, canUnsendMessage, chatMessageBody } from './chat-types';

export type AiChatMessageAction =
  'reply' | 'forward' | 'copy' | 'delete' | 'unsend' | 'pin' | 'unpin';

export interface AiChatMessageMenuItem {
  id: AiChatMessageAction;
  label: string;
}

export interface AiChatMessageMenuOptions {
  /** The moment the menu is opened — the two-minute unsend window is measured from it. */
  now?: number;
  /** Whether the composer is open, so a reply can be written (a closed chat takes no replies). */
  canReply?: boolean;
}

/** The actions on one message, in menu order. Empty when the message has no menu at all. */
export function chatMessageMenu(
  message: AiChatMessage,
  options: AiChatMessageMenuOptions = {},
): AiChatMessageMenuItem[] {
  // Only a bubble that has landed can be acted on: the typing row, notices and reminders are not
  // messages the visitor writes or deletes.
  if (message.kind !== 'message' || message.pending) return [];

  // An unsent message is an empty placeholder: the only thing left to do with it is hide it.
  if (message.unsent) return [{ id: 'delete', label: 'Delete for you' }];

  const items: AiChatMessageMenuItem[] = [];
  if (options.canReply !== false) items.push({ id: 'reply', label: 'Reply' });
  // Forwarding passes on words; a photograph or document with no words has nothing to pass on.
  if (chatMessageBody(message)) {
    items.push({ id: 'forward', label: 'Forward' });
    items.push({ id: 'copy', label: 'Copy' });
  }
  items.push({ id: 'delete', label: 'Delete for you' });
  if (canUnsendMessage(message, options.now ?? Date.now())) {
    items.push({ id: 'unsend', label: 'Unsend' });
  }
  items.push(message.pinned ? { id: 'unpin', label: 'Unpin' } : { id: 'pin', label: 'Pin' });
  return items;
}
