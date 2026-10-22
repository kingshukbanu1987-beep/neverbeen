import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { afterEach, vi } from 'vitest';
import { collectionPhotos } from '../../pages/collection/collection-photos';
import { GALLERY_PHOTO_COUNT, Gallery } from './gallery';

describe('Gallery', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Gallery],
      providers: [provideRouter([])],
    }).compileComponents();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  function create() {
    const fixture = TestBed.createComponent(Gallery);
    fixture.detectChanges();
    return fixture;
  }

  /** Deterministic replacement for Math.random, so a sample can be asserted. */
  function seedRandom(seed: number): void {
    let state = seed;
    vi.spyOn(Math, 'random').mockImplementation(() => {
      state = (state * 1664525 + 1013904223) % 4294967296;
      return state / 4294967296;
    });
  }

  function sourcesOf(element: HTMLElement): string[] {
    return Array.from(element.querySelectorAll<HTMLImageElement>('.mosaic img')).map(
      (image) => image.getAttribute('src') ?? '',
    );
  }

  it('shows 23 distinct photographs (20-25 range) from the Neverbeen Collection in a variable-size mosaic', () => {
    const element: HTMLElement = create().nativeElement;
    const collectionSources = new Set(collectionPhotos.map((photo) => photo.src));
    const sources = sourcesOf(element);

    expect(GALLERY_PHOTO_COUNT).toBeGreaterThanOrEqual(20);
    expect(GALLERY_PHOTO_COUNT).toBeLessThanOrEqual(25);
    expect(sources.length).toBe(GALLERY_PHOTO_COUNT);
    expect(new Set(sources).size).toBe(GALLERY_PHOTO_COUNT);
    for (const src of sources) {
      expect(collectionSources.has(src)).toBe(true);
    }

    const figures = Array.from(element.querySelectorAll<HTMLElement>('.mosaic figure'));
    expect(figures.length).toBe(GALLERY_PHOTO_COUNT);

    // Places the mosaic shell outside .container for maximum screen width.
    const mosaicShell = element.querySelector<HTMLElement>('.mosaic-shell')!;
    expect(mosaicShell).toBeTruthy();
    expect(mosaicShell.closest('.container')).toBeNull();

    // Assigns variable-size grid spans (--c4 / --r4) like the AI model View All page.
    const desktopSpans = new Set(
      figures.map(
        (fig) => `${fig.style.getPropertyValue('--c4')}|${fig.style.getPropertyValue('--r4')}`,
      ),
    );
    expect(desktopSpans.size).toBeGreaterThanOrEqual(3);
  });

  it('captions every sampled photograph with its title and place', () => {
    seedRandom(7);
    const element: HTMLElement = create().nativeElement;
    const figures = Array.from(element.querySelectorAll<HTMLElement>('.mosaic figure'));

    for (const figure of figures) {
      const photo = collectionPhotos.find(
        (candidate) => candidate.src === figure.querySelector('img')?.getAttribute('src'),
      );
      expect(photo, 'sampled photograph comes from the collection').toBeDefined();

      expect(figure.querySelector('figcaption strong')?.textContent?.trim()).toBe(photo!.title);
      expect(figure.querySelector('figcaption span')?.textContent?.trim()).toBe(
        photo!.caption.split(':')[0].trim(),
      );
      expect(figure.querySelector('img')?.getAttribute('alt')).toBe(photo!.alt);
    }
  });

  it('draws a fresh random set on every page load', () => {
    seedRandom(1);
    const firstLoad = sourcesOf(create().nativeElement);
    vi.restoreAllMocks();

    seedRandom(2);
    const secondLoad = sourcesOf(create().nativeElement);

    expect(firstLoad.length).toBe(GALLERY_PHOTO_COUNT);
    expect(secondLoad.length).toBe(GALLERY_PHOTO_COUNT);
    expect(firstLoad).not.toEqual(secondLoad);
  });

  it('places the Explore the NeverBeen Collection button right below the gallery description', () => {
    const element: HTMLElement = create().nativeElement;
    const heading = element.querySelector<HTMLElement>('app-section-heading')!;
    const actions = element.querySelector<HTMLElement>('.actions')!;
    const collectionBtn = actions?.querySelector<HTMLAnchorElement>('a.btn')!;

    expect(heading).toBeTruthy();
    expect(heading.nextElementSibling).toBe(actions);
    expect(collectionBtn).toBeTruthy();
    expect(collectionBtn.textContent?.trim()).toBe('Explore the NeverBeen Collection');
    expect(collectionBtn.getAttribute('href')).toBe('/collection');
  });

  it('tells the visitor the sample size and links to the whole collection', () => {
    const element: HTMLElement = create().nativeElement;

    expect(element.querySelector('.mosaic-note')?.textContent).toContain(
      `Showing ${GALLERY_PHOTO_COUNT} of ${collectionPhotos.length}`,
    );
    expect(element.querySelector('.mosaic-note a')?.getAttribute('href')).toBe('/collection');
  });
});
