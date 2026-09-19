import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Collection } from './collection';
import { collectionPhotos } from './collection-photos';

describe('Collection', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Collection],
      providers: [provideRouter([])],
    }).compileComponents();
  });

  function create() {
    const fixture = TestBed.createComponent(Collection);
    fixture.detectChanges();
    return fixture;
  }

  function tiles(element: HTMLElement): HTMLButtonElement[] {
    return Array.from(element.querySelectorAll<HTMLButtonElement>('.tile'));
  }

  it('renders every photograph in the manifest as a gallery tile', () => {
    const element: HTMLElement = create().nativeElement;
    const images = Array.from(element.querySelectorAll<HTMLImageElement>('.tile img'));

    expect(tiles(element).length).toBe(collectionPhotos.length);
    expect(images.length).toBe(collectionPhotos.length);
    images.forEach((image, index) => {
      expect(image.getAttribute('src')).toBe(collectionPhotos[index].src);
      expect(image.getAttribute('alt')?.length ?? 0).toBeGreaterThan(5);
    });
  });

  it('shows a heading for every album', () => {
    const element: HTMLElement = create().nativeElement;
    const albums = [...new Set(collectionPhotos.map((photo) => photo.album).filter(Boolean))];
    const headings = Array.from(element.querySelectorAll('.album-heading h3')).map((node) =>
      node.textContent?.trim(),
    );

    expect(headings).toEqual(albums);
  });

  it('enlarges a photograph when its tile is clicked', () => {
    const fixture = create();
    const element: HTMLElement = fixture.nativeElement;

    expect(element.querySelector('.lightbox')).toBeNull();

    tiles(element)[2].click();
    fixture.detectChanges();

    const lightbox = element.querySelector('.lightbox');
    expect(lightbox).not.toBeNull();
    expect(lightbox?.querySelector('figure img')?.getAttribute('src')).toBe(
      collectionPhotos[2].src,
    );
    expect(lightbox?.textContent).toContain(collectionPhotos[2].title);
    expect(lightbox?.textContent).toContain('3 of ' + collectionPhotos.length);
    expect(document.body.style.overflow).toBe('hidden');
  });

  it('returns the photograph to normal size when clicking outside it', () => {
    const fixture = create();
    const element: HTMLElement = fixture.nativeElement;

    tiles(element)[0].click();
    fixture.detectChanges();
    expect(element.querySelector('.lightbox')).not.toBeNull();

    // Clicking the backdrop — anywhere outside the enlarged photograph — closes it.
    (element.querySelector('.lightbox') as HTMLElement).click();
    fixture.detectChanges();

    expect(element.querySelector('.lightbox')).toBeNull();
    expect(document.body.style.overflow).toBe('');
  });

  it('keeps the photograph enlarged when clicking the photograph itself', () => {
    const fixture = create();
    const element: HTMLElement = fixture.nativeElement;

    tiles(element)[0].click();
    fixture.detectChanges();

    (element.querySelector('.lightbox figure') as HTMLElement).click();
    fixture.detectChanges();

    expect(element.querySelector('.lightbox')).not.toBeNull();
  });

  it('closes on Escape and steps through the collection with the arrow keys', () => {
    const fixture = create();
    const element: HTMLElement = fixture.nativeElement;
    const press = (key: string) => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key }));
      fixture.detectChanges();
    };

    tiles(element)[0].click();
    fixture.detectChanges();

    press('ArrowRight');
    expect(element.querySelector('.lightbox figure img')?.getAttribute('src')).toBe(
      collectionPhotos[1].src,
    );

    press('ArrowLeft');
    press('ArrowLeft');
    expect(element.querySelector('.lightbox figure img')?.getAttribute('src')).toBe(
      collectionPhotos[collectionPhotos.length - 1].src,
    );

    press('Escape');
    expect(element.querySelector('.lightbox')).toBeNull();
    expect(document.body.style.overflow).toBe('');
  });

  it('does not close when the arrow buttons are used', () => {
    const fixture = create();
    const element: HTMLElement = fixture.nativeElement;

    tiles(element)[0].click();
    fixture.detectChanges();

    (element.querySelector('.lightbox-arrow.next') as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(element.querySelector('.lightbox')).not.toBeNull();
    expect(element.querySelector('.lightbox figure img')?.getAttribute('src')).toBe(
      collectionPhotos[1].src,
    );
  });
});
