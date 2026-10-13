import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import { AiModelProfile } from '../ai-model-data';
import { ChatIdentity } from './chat-identity';
import { ChatFeedbackFacts } from './chat-summary';
import { AI_CHAT_FEEDBACK_COMMENT_LIMIT, AiChatClosedReason, AiChatFeedback } from './chat-types';

/** The five stars of the close form, in the order they are drawn. */
export const CHAT_FEEDBACK_STARS: readonly number[] = [1, 2, 3, 4, 5];

/** What each number of stars means, so a rating is never just a number. */
export const CHAT_FEEDBACK_RATING_LABELS: readonly string[] = [
  'Tap a star — one is honest, five is love.',
  'That was not for me.',
  'It was all right.',
  'A good chat.',
  'I enjoyed that.',
  'One of my favourite chats.',
];

/**
 * E and F — the close form of the chat window: what the two of them did with the time, and what the
 * visitor thought of it, in their own stars and their own words.
 *
 * The same card comes up both ways round (requirement E): when the visitor presses ✕ on a chat they
 * have been in, and when she is the one who ended the session — the two-hour limit, her goodbye to
 * a visitor who went quiet, or a rude visitor. It is a form, not a toast: nothing here closes itself
 * (requirement F), and the Close button at the end sends whatever the visitor gave — stars,
 * comments, or both — to the session before the window goes.
 *
 * Everything it shows comes from `buildChatFeedbackFacts()`: the time together, the messages
 * exchanged and whose they were, and the photographs that went back and forth between the two of
 * them. Her own note about the chat (requirement K) is kept in the card, folded away under the
 * visitor's own rating.
 */
@Component({
  selector: 'app-chat-feedback',
  templateUrl: './chat-feedback.html',
  styleUrl: './chat-feedback.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChatFeedbackCard {
  readonly model = input.required<AiModelProfile>();
  readonly facts = input.required<ChatFeedbackFacts>();
  readonly visitor = input<ChatIdentity | null>(null);
  /** Why the session ended — what the line under the faces says. */
  readonly reason = input<AiChatClosedReason>('');

  /** The visitor's feedback, or `null` when they closed the form without giving any. */
  readonly closed = output<AiChatFeedback | null>();

  /** The Chat history button: the window opens the whole transcript over this form. */
  readonly historyRequested = output<void>();

  protected readonly stars = CHAT_FEEDBACK_STARS;
  protected readonly ratingLabels = CHAT_FEEDBACK_RATING_LABELS;
  protected readonly commentLimit = AI_CHAT_FEEDBACK_COMMENT_LIMIT;
  protected readonly rating = signal(0);
  protected readonly comments = signal('');
  /** The star the pointer, or the keyboard, is on — the preview of what is being chosen. */
  protected readonly preview = signal(0);

  protected readonly modelFirstName = computed(() => this.model().name.split(' ')[0]);
  protected readonly visitorName = computed(() => this.visitor()?.name?.trim() || 'You');
  protected readonly visitorPhoto = computed(() => this.visitor()?.avatar ?? '');
  protected readonly visitorFirstName = computed(() =>
    this.visitorName() === 'You' ? '' : this.visitorName().split(' ')[0],
  );

  /** The question the form asks, by the visitor's own name when she knows it. */
  protected readonly title = computed(() =>
    this.visitorFirstName()
      ? `How was your chat, ${this.visitorFirstName()}?`
      : 'How was your chat?',
  );

  /** The line under the faces: what ended the session, in the studio's words. */
  protected readonly endingNote = computed(() => {
    switch (this.reason()) {
      case 'inactive':
        return `She waited three quiet minutes for an answer, then ended it herself — no offence taken.`;
      case 'blocked':
        return `She ended this one: a chat closes for good after a rude message.`;
      case 'timeout':
        return `Your two hours ran out, which is the one ending the clock decides.`;
      case 'restarted':
        return `This session was replaced by a new one.`;
      default:
        return `You closed the window — here is what the two of you did with the time.`;
    }
  });

  /** What the stars currently say, before and after a choice. */
  protected readonly ratingLabel = computed(() => {
    const lit = this.preview() || this.rating();
    return this.ratingLabels[lit] ?? this.ratingLabels[0];
  });

  /** The photographs line: the split, when there were any photographs at all. */
  protected readonly photoLine = computed(() => {
    const facts = this.facts();
    if (facts.photos === 0) return 'No photographs went back and forth in this one.';
    const mine = facts.yourPhotos === 1 ? 'one from you' : `${facts.yourPhotos} from you`;
    const hers = facts.herPhotos === 1 ? 'one from her' : `${facts.herPhotos} from her`;
    return `${mine}, ${hers}.`;
  });

  protected readonly herStars = computed(() => this.facts().summary.rating);

  /** The star the visitor is about to give, or has given — the lit row of the picker. */
  protected litStar(star: number): boolean {
    return star <= (this.preview() || this.rating());
  }

  protected choose(star: number): void {
    // Choosing the same star twice takes the choice back: a form nobody can un-answer is a form that
    // gets closed with a lie in it.
    this.rating.set(this.rating() === star ? 0 : star);
    this.preview.set(0);
  }

  protected updateComments(event: Event): void {
    this.comments.set((event.target as HTMLTextAreaElement).value.slice(0, this.commentLimit));
  }

  /**
   * The Chat history button beside Close: the whole transcript of the session — every message,
   * photograph and document — opens over the form, and Escape brings the form back.
   */
  protected openHistory(): void {
    this.historyRequested.emit();
  }

  /**
   * E and F — the Close button at the end, and the only thing that ends the form (Escape in the
   * window hands its keystroke here): it sends what was given, then lets the window go.
   */
  close(): void {
    const rating = this.rating();
    const comments = this.comments().trim();
    this.closed.emit(rating > 0 || comments.length > 0 ? { rating, comments, at: Date.now() } : null);
  }
}
