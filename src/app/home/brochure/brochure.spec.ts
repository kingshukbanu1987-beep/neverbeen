import { TestBed } from '@angular/core/testing';
import { afterEach, vi } from 'vitest';
import { BROCHURE_MEMO_INTERVAL_MS, BROCHURE_MEMO_INTERVAL_SECONDS, Brochure } from './brochure';
import { BROCHURE_SLIDE_PAGE_NUMBERS, brochureSlides } from './brochure-slides';

describe('Brochure', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Brochure],
    }).compileComponents();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('displays the 22 requested brochure pages in order', () => {
    expect(brochureSlides.map((s) => s.page)).toEqual([...BROCHURE_SLIDE_PAGE_NUMBERS]);
    expect(BROCHURE_SLIDE_PAGE_NUMBERS).toEqual([
      6, 8, 9, 12, 13, 16, 17, 20, 21, 23, 25, 27, 33, 34, 36, 37, 39, 40, 44, 46, 47, 49,
    ]);
  });

  it('places the Explore the NeverBeen Brochure button right below the section description', () => {
    const fixture = TestBed.createComponent(Brochure);
    fixture.detectChanges();
    const element: HTMLElement = fixture.nativeElement;

    const lede = element.querySelector<HTMLElement>('.intro .lede')!;
    const actions = element.querySelector<HTMLElement>('.intro .actions')!;
    const brochureBtn = actions?.querySelector<HTMLAnchorElement>('a.btn-ghost')!;

    expect(lede).toBeTruthy();
    expect(lede.nextElementSibling).toBe(actions);
    expect(brochureBtn).toBeTruthy();
    expect(brochureBtn.textContent?.trim()).toBe('Explore the NeverBeen Brochure');
    expect(brochureBtn.getAttribute('href')).toBe('/documentation');
  });

  it('places the slideshow stage-shell outside .container so it spans maximum screen width', () => {
    const fixture = TestBed.createComponent(Brochure);
    fixture.detectChanges();
    const element: HTMLElement = fixture.nativeElement;

    const stageShell = element.querySelector<HTMLElement>('.stage-shell')!;
    expect(stageShell).toBeTruthy();
    expect(stageShell.closest('.container')).toBeNull();
  });

  it('auto-advances each brochure memo every 5 seconds and supports next/previous controls', () => {
    vi.useFakeTimers();
    const fixture = TestBed.createComponent(Brochure);
    fixture.detectChanges();
    const element: HTMLElement = fixture.nativeElement;

    expect(BROCHURE_MEMO_INTERVAL_SECONDS).toBe(5);
    expect(BROCHURE_MEMO_INTERVAL_MS).toBe(5000);
    expect(element.querySelector('.slide.is-active h3')?.textContent?.trim()).toContain(
      brochureSlides[0].name,
    );

    vi.advanceTimersByTime(BROCHURE_MEMO_INTERVAL_MS);
    fixture.detectChanges();
    expect(element.querySelector('.slide.is-active h3')?.textContent?.trim()).toContain(
      brochureSlides[1].name,
    );

    element.querySelector<HTMLButtonElement>('button.nav.prev')!.click();
    fixture.detectChanges();
    expect(element.querySelector('.slide.is-active h3')?.textContent?.trim()).toContain(
      brochureSlides[0].name,
    );
  });
});
