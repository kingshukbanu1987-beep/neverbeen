import { DOCUMENT } from '@angular/common';
import { TestBed } from '@angular/core/testing';
import { SiteConfigService } from '../../services/site-config.service';
import { promotionSlides } from './promotion-slides';
import { MEMO_INTERVAL_SECONDS, Multiverse } from './multiverse';

const config = (overrides: Record<string, unknown> = {}) => ({
  text: (_component: string, field: string) => `text:${field}`,
  get: (component: string, field: string) => overrides[`${component}.${field}`],
  flag: (component: string, field: string) => {
    const value = overrides[`${component}.${field}`];
    return value === undefined ? true : !!value;
  },
});

const setup = (document: unknown, overrides: Record<string, unknown> = {}) => {
  TestBed.configureTestingModule({
    providers: [
      { provide: DOCUMENT, useValue: document },
      { provide: SiteConfigService, useValue: config(overrides) },
    ],
  });
  return TestBed.runInInjectionContext(() => new Multiverse());
};

const fakeDocument = () => ({
  defaultView: {
    document: { hidden: false },
    addEventListener: () => {},
    removeEventListener: () => {},
    Image: class {},
  },
});

describe('The NeverBeen Multiverse Studio slideshow', () => {
  afterEach(() => {
    TestBed.resetTestingModule();
  });

  it('shows exactly one memo at a time, taken from the promotion manifest', () => {
    const studio = setup(fakeDocument());
    const layers = studio['layersView']();
    expect(layers.length).toBe(2);
    expect(layers.filter((layer) => layer !== null).length).toBe(1);
    expect(studio['activeLayerView']()).toBe(0);
    expect(studio['total']).toBe(promotionSlides.length);
    const shown = layers[0];
    expect(promotionSlides.some((slide) => slide.src === shown?.src)).toBe(true);
    expect(shown?.header.length).toBeGreaterThan(0);
    expect(shown?.copy.length).toBeGreaterThan(0);
  });

  it('moves to the next and previous memo, wrapping around the shuffled order', () => {
    const studio = setup(fakeDocument());
    const total = studio['total'];

    expect(studio['index']()).toBe(0);
    studio['next']();
    expect(studio['index']()).toBe(1);
    expect(studio['activeLayerView']()).toBe(1);
    // The newly shown layer carries the second memo.
    expect(studio['layersView']()[1]?.src).toBe(studio['slides'][1].src);

    studio['previous']();
    expect(studio['index']()).toBe(0);

    studio['previous']();
    expect(studio['index']()).toBe(total - 1);
    studio['next']();
    expect(studio['index']()).toBe(0);
  });

  it('advances every five seconds by default and honours the published pace', () => {
    vi.useFakeTimers();
    const studio = setup(fakeDocument());
    expect(MEMO_INTERVAL_SECONDS).toBe(5);
    expect(studio['intervalSeconds']()).toBe(5);

    vi.advanceTimersByTime(4900);
    expect(studio['index']()).toBe(0);
    vi.advanceTimersByTime(100);
    expect(studio['index']()).toBe(1);
    vi.advanceTimersByTime(5000);
    expect(studio['index']()).toBe(2);

    studio['ngOnDestroy']();
    vi.useRealTimers();
  });

  it('reads a published pace', () => {
    expect(setup(fakeDocument(), { 'home.multiverse.seconds': 7 })['intervalSeconds']()).toBe(7);
  });

  it('never leaves the 2–20 second range', () => {
    expect(setup(fakeDocument(), { 'home.multiverse.seconds': 0 })['intervalSeconds']()).toBe(2);
    TestBed.resetTestingModule();
    expect(setup(fakeDocument(), { 'home.multiverse.seconds': 900 })['intervalSeconds']()).toBe(20);
  });

  it('stays on one memo when autoplay is switched off', () => {
    vi.useFakeTimers();
    const studio = setup(fakeDocument(), { 'home.multiverse.autoplay': false });
    vi.advanceTimersByTime(15000);
    expect(studio['index']()).toBe(0);
    // Visitors can still step through the memos themselves.
    studio['next']();
    expect(studio['index']()).toBe(1);
    studio['ngOnDestroy']();
    vi.useRealTimers();
  });

  it('renders one memo panel with its big header, small copy and both controls', () => {
    // The real DOCUMENT (jsdom) so TestBed can render; only the CMS is stubbed.
    TestBed.configureTestingModule({
      providers: [{ provide: SiteConfigService, useValue: config() }],
    });
    const fixture = TestBed.createComponent(Multiverse);
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;

    expect(element.querySelectorAll('.layer').length).toBe(2);
    expect(element.querySelectorAll('.layer.on').length).toBe(1);
    expect(element.querySelectorAll('.layer.on img').length).toBe(1);
    expect(element.querySelectorAll('.memo-text').length).toBe(1);

    const header = element.querySelector('.memo-text h3')?.textContent?.trim();
    const copy = element.querySelector('.memo-text p')?.textContent?.trim();
    expect(header?.length).toBeGreaterThan(12);
    expect(copy?.length).toBeGreaterThan(12);
    expect(element.querySelector('.tag')?.textContent?.trim().length).toBeGreaterThan(2);

    const buttons = [...element.querySelectorAll('.nav')].map((b) => b.getAttribute('aria-label'));
    expect(buttons).toEqual(['Previous memo', 'Next memo']);

    // The next control shows a different memo, the previous one returns.
    const first = element.querySelector('.layer.on img')?.getAttribute('src');
    (element.querySelectorAll('.nav')[1] as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(element.querySelector('.layer.on img')?.getAttribute('src')).not.toBe(first);
    expect(element.querySelectorAll('.memo-text').length).toBe(1);

    (element.querySelectorAll('.nav')[0] as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(element.querySelector('.layer.on img')?.getAttribute('src')).toBe(first);

    fixture.destroy();
  });

  it('orders the memos at random without repeating one inside a visit', () => {
    const studio = setup(fakeDocument());
    const sources = studio['slides'].map((slide) => slide.src);
    expect(sources.length).toBe(promotionSlides.length);
    expect(new Set(sources).size).toBe(promotionSlides.length);
  });
});
