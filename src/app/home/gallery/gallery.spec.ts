import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { collectionPhotos } from '../../pages/collection/collection-photos';
import { GALLERY_PHOTO_COUNT, Gallery } from './gallery';

describe('Gallery (Home page "Explore Gallery" section)', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Gallery],
      providers: [provideRouter([])],
    }).compileComponents();
  });

  afterEach(() => vi.restoreAllMocks());

  function render(): HTMLElement {
    const fixture = TestBed.createComponent(Gallery);
    fixture.detectChanges();
    return fixture.nativeElement;
  }

  function sources(element: HTMLElement): string[] {
    return Array.from(element.querySelectorAll<HTMLImageElement>('.wall img')).map(
      (image) => image.getAttribute('src') ?? '',
    );
  }

  it('shows exactly 20 photographs', () => {
    expect(GALLERY_PHOTO_COUNT).toBe(20);
    expect(sources(render())).toHaveLength(20);
  });

  it('only shows photographs from the Neverbeen Collection, without repeats', () => {
    const shown = sources(render());
    const collection = new Set(collectionPhotos.map((photo) => photo.src));

    shown.forEach((src) => expect(collection.has(src)).toBe(true));
    expect(new Set(shown).size).toBe(shown.length);
  });

  it('describes every photograph for screen readers', () => {
    const images = Array.from(render().querySelectorAll<HTMLImageElement>('.wall img'));

    images.forEach((image) => expect(image.getAttribute('alt')?.length ?? 0).toBeGreaterThan(5));
  });

  it('captions each tile with its title and place', () => {
    const element = render();
    const first = element.querySelector('.wall figcaption') as HTMLElement;
    const photo = collectionPhotos.find((p) => first.textContent?.includes(p.title));

    expect(photo).toBeDefined();
    expect(first.textContent).toContain(photo!.caption.split(':')[0].trim());
  });

  it('makes a new random selection every time the page loads', () => {
    // Two page loads with different random draws must not show the same set of photographs.
    const draw = vi.spyOn(Math, 'random');

    draw.mockImplementation(() => 0.05);
    const firstLoad = sources(render());

    draw.mockImplementation(() => 0.95);
    const secondLoad = sources(render());

    expect(firstLoad).toHaveLength(20);
    expect(secondLoad).toHaveLength(20);
    expect(secondLoad).not.toEqual(firstLoad);
  });

  it('keeps the selection stable while the page stays open', () => {
    const fixture = TestBed.createComponent(Gallery);
    fixture.detectChanges();
    const before = sources(fixture.nativeElement);

    fixture.detectChanges();

    expect(sources(fixture.nativeElement)).toEqual(before);
  });

  it('links to the full Neverbeen Collection', () => {
    const link = render().querySelector<HTMLAnchorElement>('.wall-note a');

    expect(link?.getAttribute('href')).toBe('/collection');
    expect(render().querySelector('.wall-note')?.textContent).toContain(
      `20 of ${collectionPhotos.length} photographs`,
    );
  });
});
