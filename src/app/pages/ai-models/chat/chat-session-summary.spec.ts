import { ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { aiModelProfiles } from '../ai-model-data';
import { ChatSessionSummary } from './chat-summary';
import { ChatSessionSummaryCard } from './chat-session-summary';

const alisha = aiModelProfiles.find((model) => model.slug === 'alisha-bhattacharya')!;
const VISITOR_AVATAR = 'data:image/jpeg;base64,AAAA';

const summary: ChatSessionSummary = {
  minutes: 42,
  together: '42 minutes',
  messages: 9,
  photos: 2,
  headline: 'That was a good chat.',
  experience: 'You ask questions the way I like them asked.',
  highlights: ['travel', 'your photograph'],
  rating: 4,
  sheEnded: false,
};

interface Harness {
  fixture: ComponentFixture<ChatSessionSummaryCard>;
  element: HTMLElement;
  closed: number;
}

function card(withVisitor = true, report: ChatSessionSummary = summary): Harness {
  const fixture = TestBed.createComponent(ChatSessionSummaryCard);
  fixture.componentRef.setInput('model', alisha);
  fixture.componentRef.setInput('summary', report);
  fixture.componentRef.setInput(
    'visitor',
    withVisitor ? { name: 'Rahul Verma', avatar: VISITOR_AVATAR } : null,
  );
  fixture.detectChanges();
  const harness: Harness = { fixture, element: fixture.nativeElement as HTMLElement, closed: 0 };
  fixture.componentInstance.closed.subscribe(() => {
    harness.closed += 1;
  });
  return harness;
}

describe('ChatSessionSummaryCard', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [ChatSessionSummaryCard] }).compileComponents();
  });

  it('closes the session with both faces, the time they spent and her honest verdict (requirement K)', () => {
    const harness = card();
    const element = harness.element;
    const text = element.textContent ?? '';

    // Her photograph and the visitor's, side by side.
    const faces = element.querySelectorAll('.farewell-face img');
    expect(faces).toHaveLength(2);
    expect(faces[0].getAttribute('src')).toBe(alisha.cover);
    expect(faces[1].getAttribute('src')).toBe(VISITOR_AVATAR);
    expect(element.querySelector('.farewell-face.is-visitor i')?.textContent).toContain('Rahul');

    // The time together, her headline, her paragraph and what the chat was about.
    expect(element.querySelector('.farewell-together')?.textContent).toContain('42 minutes');
    expect(text).toContain('That was a good chat.');
    expect(text).toContain('You ask questions the way I like them asked.');
    expect(
      Array.from(element.querySelectorAll('.farewell-chips li')).map((chip) => chip.textContent),
    ).toEqual(['travel', 'your photograph']);

    // The numbers, and her rating out of five.
    expect(element.querySelectorAll('.farewell-stats li')).toHaveLength(3);
    expect(text).toContain('9');
    expect(text).toContain('4/5');
    expect(element.querySelectorAll('.farewell-rating .is-lit')).toHaveLength(4);
  });

  it('puts the card away when the visitor closes it', () => {
    const harness = card();

    const close = harness.element.querySelector<HTMLButtonElement>('.farewell-close')!;
    expect(close.textContent).toContain('Close');
    close.click();
    harness.fixture.detectChanges();

    expect(harness.closed).toBe(1);
  });

  it('draws a quiet visit and a session she ended without a visitor photograph', () => {
    const harness = card(false, {
      ...summary,
      messages: 0,
      photos: 0,
      rating: 1,
      sheEnded: true,
      headline: 'I ended that one early.',
      highlights: ['a very quiet visit'],
    });
    const element = harness.element;

    expect(element.querySelectorAll('.farewell-face img')).toHaveLength(1);
    expect(element.textContent).toContain('I ended that one early.');
    expect(element.querySelectorAll('.farewell-rating .is-lit')).toHaveLength(1);
    expect(element.querySelectorAll('.farewell-chips li')).toHaveLength(1);
  });
});
