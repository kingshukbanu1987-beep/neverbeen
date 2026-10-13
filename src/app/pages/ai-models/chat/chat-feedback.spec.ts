import { ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { aiModelProfiles } from '../ai-model-data';
import { AiChatClosedReason, AiChatFeedback } from './chat-types';
import { ChatFeedbackCard } from './chat-feedback';
import { ChatFeedbackFacts } from './chat-summary';

const alisha = aiModelProfiles.find((model) => model.slug === 'alisha-bhattacharya')!;
const VISITOR_PHOTO = 'data:image/jpeg;base64,AAAA';

const facts: ChatFeedbackFacts = {
  together: '42 minutes',
  total: 9,
  yours: 4,
  hers: 5,
  photos: 2,
  herPhotos: 1,
  yourPhotos: 1,
  summary: {
    minutes: 42,
    together: '42 minutes',
    messages: 4,
    photos: 2,
    headline: 'That was a good chat.',
    experience: 'You ask questions the way I like them asked — one after another, no small talk.',
    highlights: ['travel', 'your photograph'],
    rating: 4,
    sheEnded: false,
  },
};

interface Harness {
  fixture: ComponentFixture<ChatFeedbackCard>;
  element: HTMLElement;
  closed: (AiChatFeedback | null)[];
}

function card(reason: AiChatClosedReason = '', withVisitor = true): Harness {
  const fixture = TestBed.createComponent(ChatFeedbackCard);
  fixture.componentRef.setInput('model', alisha);
  fixture.componentRef.setInput('facts', facts);
  fixture.componentRef.setInput('reason', reason);
  fixture.componentRef.setInput(
    'visitor',
    withVisitor ? { name: 'Rahul Verma', avatar: VISITOR_PHOTO } : null,
  );
  fixture.detectChanges();

  const harness: Harness = {
    fixture,
    element: fixture.nativeElement as HTMLElement,
    closed: [],
  };
  fixture.componentInstance.closed.subscribe((feedback) => harness.closed.push(feedback));
  return harness;
}

function stars(element: HTMLElement): HTMLButtonElement[] {
  return Array.from(element.querySelectorAll<HTMLButtonElement>('.feedback-star'));
}

describe('ChatFeedbackCard', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [ChatFeedbackCard] }).compileComponents();
  });

  it('frames the two of them, the time together and the numbers of the session (requirement E)', () => {
    const harness = card();
    const element = harness.element;
    const text = element.textContent ?? '';

    // Both photographs, both names.
    const faces = element.querySelectorAll('.feedback-face img');
    expect(faces).toHaveLength(2);
    expect(faces[0].getAttribute('src')).toBe(alisha.cover);
    expect(faces[1].getAttribute('src')).toBe(VISITOR_PHOTO);
    expect(element.querySelector('.feedback-face b')?.textContent).toContain('Alisha');
    expect(element.querySelector('.feedback-face.is-visitor b')?.textContent).toContain(
      'Rahul Verma',
    );

    // The total chat duration, and the messages on both sides of it.
    expect(text).toContain('42 minutes');
    const stats = Array.from(element.querySelectorAll('.feedback-stats li')).map((tile) => ({
      value: tile.querySelector('b')?.textContent?.trim(),
      label: tile.querySelector('i')?.textContent?.trim(),
    }));
    expect(stats).toEqual([
      { value: '9', label: 'messages exchanged' },
      { value: '4', label: 'your messages' },
      { value: '5', label: 'her messages' },
      { value: '2', label: 'photographs shared' },
    ]);
    expect(element.querySelector('.feedback-photo-line')?.textContent).toContain(
      'one from you, one from her',
    );

    // Her own note about the chat is folded into the same card (requirement K).
    const note = element.querySelector('.feedback-note')!;
    expect(note.querySelector('blockquote')?.textContent).toContain('You ask questions');
    expect(note.querySelectorAll('.feedback-note-stars .is-lit')).toHaveLength(4);
    expect(note.querySelector('.feedback-note-rating')?.textContent).toContain('4/5');
    expect(Array.from(note.querySelectorAll('.feedback-note-chips li')).map((chip) => chip.textContent)).toEqual([
      'travel',
      'your photograph',
    ]);
  });

  it('asks for the stars and the words, and sends what was given from the Close button (requirement E)', () => {
    const harness = card();
    const element = harness.element;
    const picker = stars(element);

    expect(picker).toHaveLength(5);
    expect(element.querySelector('.feedback-rating-label')?.textContent).toContain('Tap a star');
    expect(element.querySelectorAll('.feedback-star.is-lit')).toHaveLength(0);

    // The pointer previews a rating without giving it.
    picker[4].dispatchEvent(new MouseEvent('mouseenter'));
    harness.fixture.detectChanges();
    expect(element.querySelectorAll('.feedback-star.is-lit')).toHaveLength(5);
    expect(element.querySelector('.feedback-rating-label')?.textContent).toContain(
      'One of my favourite chats.',
    );
    picker[4].dispatchEvent(new MouseEvent('mouseleave'));
    harness.fixture.detectChanges();
    expect(element.querySelectorAll('.feedback-star.is-lit')).toHaveLength(0);

    // Four stars, and a sentence to go with them.
    picker[3].click();
    harness.fixture.detectChanges();
    expect(element.querySelectorAll('.feedback-star.is-lit')).toHaveLength(4);
    expect(picker[3].getAttribute('aria-checked')).toBe('true');
    expect(element.querySelector('.feedback-rating-label')?.textContent).toContain(
      'I enjoyed that.',
    );

    const box = element.querySelector<HTMLTextAreaElement>('.feedback-comments-box')!;
    expect(box.getAttribute('maxlength')).toBe('600');
    box.value = 'A lovely chat — she was kind.';
    box.dispatchEvent(new Event('input'));
    harness.fixture.detectChanges();
    expect(element.querySelector('.feedback-comments-count')?.textContent).toContain('/600');

    element.querySelector<HTMLButtonElement>('.feedback-close')!.click();
    expect(harness.closed).toHaveLength(1);
    expect(harness.closed[0]).toMatchObject({
      rating: 4,
      comments: 'A lovely chat — she was kind.',
    });
  });

  it('takes a rating back when the same star is chosen twice, and sends nothing from an empty form', () => {
    const harness = card();
    const element = harness.element;

    stars(element)[2].click();
    harness.fixture.detectChanges();
    expect(element.querySelectorAll('.feedback-star.is-lit')).toHaveLength(3);
    stars(element)[2].click();
    harness.fixture.detectChanges();
    expect(element.querySelectorAll('.feedback-star.is-lit')).toHaveLength(0);
    expect(element.querySelector('.feedback-rating-label')?.textContent).toContain('Tap a star');

    // A form that was never filled in sends nothing: the visitor owes her nothing.
    element.querySelector<HTMLButtonElement>('.feedback-close')!.click();
    expect(harness.closed).toEqual([null]);
  });

  it('takes a comment with no stars, and bounds the comment to the form’s own limit', () => {
    const harness = card();
    const element = harness.element;
    const box = element.querySelector<HTMLTextAreaElement>('.feedback-comments-box')!;

    box.value = 'x'.repeat(900);
    box.dispatchEvent(new Event('input'));
    harness.fixture.detectChanges();
    box.value = 'Just here for the photographs.';
    box.dispatchEvent(new Event('input'));
    harness.fixture.detectChanges();

    element.querySelector<HTMLButtonElement>('.feedback-close')!.click();
    expect(harness.closed[0]).toMatchObject({ rating: 0, comments: 'Just here for the photographs.' });
  });

  it('says how the session ended, in the studio’s own words', () => {
    const quiet = card('inactive');
    expect(quiet.element.querySelector('.feedback-ending')?.textContent).toContain(
      'three quiet minutes',
    );

    const blocked = card('blocked');
    expect(blocked.element.querySelector('.feedback-ending')?.textContent).toContain(
      'closes for good after a rude message',
    );

    const timeout = card('timeout');
    expect(timeout.element.querySelector('.feedback-ending')?.textContent).toContain(
      'two hours ran out',
    );

    // The visitor's own ✕: the form says so, and it asks after their name.
    const visitor = card('');
    expect(visitor.element.querySelector('.feedback-ending')?.textContent).toContain(
      'You closed the window',
    );
    expect(visitor.element.querySelector('#chat-feedback-title')?.textContent).toContain('Rahul');
  });

  it('offers the whole chat history beside Close, without closing the form', () => {
    const harness = card();
    const requests: void[] = [];
    harness.fixture.componentInstance.historyRequested.subscribe(() => requests.push(undefined));

    const history = harness.element.querySelector<HTMLButtonElement>('.feedback-history')!;
    expect(history).not.toBeNull();
    expect(history.textContent).toContain('Chat history');
    // The Close button still ends the form; the history button sits beside it in the same row.
    expect(history.closest('.feedback-actions')?.querySelector('.feedback-close')).not.toBeNull();

    history.click();
    expect(requests).toHaveLength(1);
    expect(harness.closed).toHaveLength(0);
  });

  it('draws itself without a visitor photograph, and without a name to use', () => {
    const harness = card('inactive', false);
    const element = harness.element;

    expect(element.querySelectorAll('.feedback-face img')).toHaveLength(1);
    expect(element.querySelector('.feedback-face.is-visitor b')?.textContent).toContain('You');
    expect(element.querySelector('#chat-feedback-title')?.textContent).toBe('How was your chat?');
  });
});
