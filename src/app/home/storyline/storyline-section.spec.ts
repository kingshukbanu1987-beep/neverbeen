import { TestBed } from '@angular/core/testing';
import { afterEach, vi } from 'vitest';
import {
  STORYLINE_MEMO_INTERVAL_MS,
  STORYLINE_MEMO_INTERVAL_SECONDS,
  StorylineSection,
} from './storyline-section';
import { storylineSlides } from './storyline-slides';

describe('StorylineSection', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StorylineSection],
    }).compileComponents();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('displays all nine stories from storyline-of-parallel-universe in order', () => {
    expect(storylineSlides.length).toBe(9);
    expect(storylineSlides.map((s) => s.id)).toEqual([
      'london-wedding-revisited',
      'vienna-birthday-missed',
      'paris-solo-dream',
      'switzerland-honeymoon',
      'amazon-university-reunion',
      'italy-wedding-dream',
      'everest-solo-dream',
      'banaras-european-couple-dream',
      'norway-anniversary-dream',
    ]);
  });

  it('places Read the Stories of Parallel Universe button right below the section description', () => {
    const fixture = TestBed.createComponent(StorylineSection);
    fixture.detectChanges();
    const element: HTMLElement = fixture.nativeElement;

    const lede = element.querySelector<HTMLElement>('.intro .lede')!;
    const actions = element.querySelector<HTMLElement>('.intro .actions')!;
    const storylineBtn = actions?.querySelector<HTMLAnchorElement>('a.btn-brochure')!;

    expect(lede).toBeTruthy();
    expect(lede.nextElementSibling).toBe(actions);
    expect(storylineBtn).toBeTruthy();
    expect(storylineBtn.textContent?.replace(/\s+/g, ' ').trim()).toBe(
      'Read the Stories of Parallel Universe',
    );
    expect(storylineBtn.querySelector('em')?.textContent).toBe('Parallel Universe');
    expect(storylineBtn.getAttribute('href')).toBe('/storyline-of-parallel-universe');
  });

  it('places the slideshow stage-shell outside .container so it spans maximum screen width', () => {
    const fixture = TestBed.createComponent(StorylineSection);
    fixture.detectChanges();
    const element: HTMLElement = fixture.nativeElement;

    const stageShell = element.querySelector<HTMLElement>('.stage-shell')!;
    expect(stageShell).toBeTruthy();
    expect(stageShell.closest('.container')).toBeNull();
  });

  it('auto-advances each story memo every 5 seconds and supports next/previous controls', () => {
    vi.useFakeTimers();
    const fixture = TestBed.createComponent(StorylineSection);
    fixture.detectChanges();
    const element: HTMLElement = fixture.nativeElement;

    expect(STORYLINE_MEMO_INTERVAL_SECONDS).toBe(5);
    expect(STORYLINE_MEMO_INTERVAL_MS).toBe(5000);
    expect(element.querySelector('.slide.is-active h3')?.textContent?.trim()).toBe(
      storylineSlides[0].title,
    );

    vi.advanceTimersByTime(STORYLINE_MEMO_INTERVAL_MS);
    fixture.detectChanges();
    expect(element.querySelector('.slide.is-active h3')?.textContent?.trim()).toBe(
      storylineSlides[1].title,
    );

    element.querySelector<HTMLButtonElement>('button.nav.prev')!.click();
    fixture.detectChanges();
    expect(element.querySelector('.slide.is-active h3')?.textContent?.trim()).toBe(
      storylineSlides[0].title,
    );
  });
});
