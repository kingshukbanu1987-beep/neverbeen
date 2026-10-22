import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { afterEach, vi } from 'vitest';
import { routes } from '../../app.routes';
import { destinations } from '../../models/site-content';
import { DESTINATION_MEMO_INTERVAL_SECONDS, Destinations } from './destinations';

/** Destinations added when the atlas grew beyond the original eighteen. */
const addedDestinations = [
  'Netherlands',
  'Austria',
  'Canada',
  'United States of America',
  'Maldives',
  'Thailand',
  'Malaysia',
  'Singapore',
  'Indonesia',
  'Australia',
  'Denmark',
  'Finland',
  'Japan',
  'Korea',
  'Brazil',
];

describe('Destinations memo slideshow', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Destinations],
      providers: [provideRouter(routes)],
    }).compileComponents();
  });

  afterEach(() => {
    vi.useRealTimers();
    TestBed.resetTestingModule();
  });

  function create() {
    const fixture = TestBed.createComponent(Destinations);
    fixture.detectChanges();
    return fixture;
  }

  it('renders one destination memo at a time in an ultra-modern white full-width stage', () => {
    const fixture = create();
    const element: HTMLElement = fixture.nativeElement;
    const component = fixture.componentInstance;

    expect(component['total']).toBe(destinations.length);
    expect(element.querySelectorAll('.stage-shell .layer').length).toBe(2);
    expect(element.querySelectorAll('.stage-shell .layer.on').length).toBe(1);
    expect(element.querySelectorAll('.memo-text').length).toBe(1);

    const first = destinations[0];
    expect(element.querySelector('.memo-text .tag')?.textContent?.trim()).toBe(first.country);
    expect(element.querySelector('.memo-text h3')?.textContent?.trim()).toBe(first.name);
    expect(element.querySelector('.memo-text p')?.textContent?.trim()).toBe(first.caption);

    const cta = element.querySelector<HTMLAnchorElement>('.memo-text a.memo-cta')!;
    expect(cta).toBeTruthy();
    expect(cta.getAttribute('href')).toBe(`/destinations/${first.slug}`);

    const img = element.querySelector<HTMLImageElement>('.layer.on img')!;
    expect(img.getAttribute('src')).toBe(first.image);
    expect(img.getAttribute('alt')).toContain(first.name);

    fixture.destroy();
  });

  it('steps through every destination memo and links each one to its guide page', () => {
    const fixture = create();
    const element: HTMLElement = fixture.nativeElement;
    const nextBtn = element.querySelectorAll<HTMLButtonElement>('.controls .nav')[1];

    for (const [index, destination] of destinations.entries()) {
      expect(fixture.componentInstance['index']()).toBe(index);
      const cta = element.querySelector<HTMLAnchorElement>('.memo-text a.memo-cta')!;
      expect(cta.getAttribute('href'), destination.name).toBe(`/destinations/${destination.slug}`);

      const image = element.querySelector<HTMLImageElement>('.layer.on img');
      expect(image?.getAttribute('src'), destination.name).toBe(destination.image);
      expect(image?.getAttribute('alt'), destination.name).toContain(destination.name);

      nextBtn.click();
      fixture.detectChanges();
    }

    // Wraps back to the first destination memo after the full cycle.
    expect(fixture.componentInstance['index']()).toBe(0);
    fixture.destroy();
  });

  it('advances every five seconds by default', () => {
    vi.useFakeTimers();
    const fixture = create();
    const component = fixture.componentInstance;

    expect(DESTINATION_MEMO_INTERVAL_SECONDS).toBe(5);
    expect(component['intervalSeconds']()).toBe(5);
    expect(component['index']()).toBe(0);

    vi.advanceTimersByTime(4900);
    expect(component['index']()).toBe(0);

    vi.advanceTimersByTime(100);
    expect(component['index']()).toBe(1);

    vi.advanceTimersByTime(5000);
    expect(component['index']()).toBe(2);

    fixture.destroy();
  });

  it('includes every destination added to the popular destinations atlas', () => {
    const fixture = create();
    const slides = fixture.componentInstance['slides'];

    for (const name of addedDestinations) {
      const destination = slides.find((place) => place.name === name || place.country === name);
      expect(destination, name).toBeDefined();
    }
    fixture.destroy();
  });
});
