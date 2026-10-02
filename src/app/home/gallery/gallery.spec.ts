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

  it('shows exactly 20 distinct photographs from the Neverbeen Collection', () => {
    const element: HTMLElement = create().nativeElement;
    const collectionSources = new Set(collectionPhotos.map((photo) => photo.src));
    const sources = sourcesOf(element);

    expect(sources.length).toBe(GALLERY_PHOTO_COUNT);
    expect(new Set(sources).size).toBe(GALLERY_PHOTO_COUNT);
    for (const src of sources) {
      expect(collectionSources.has(src)).toBe(true);
    }
    expect(element.querySelectorAll('.mosaic figure').length).toBe(GALLERY_PHOTO_COUNT);
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

  it('tells the visitor the sample size and links to the whole collection', () => {
    const element: HTMLElement = create().nativeElement;

    expect(element.querySelector('.mosaic-note')?.textContent).toContain(
      `Showing ${GALLERY_PHOTO_COUNT} of ${collectionPhotos.length}`,
    );
    expect(element.querySelector('.mosaic-note a')?.getAttribute('href')).toBe('/collection');
  });
});
