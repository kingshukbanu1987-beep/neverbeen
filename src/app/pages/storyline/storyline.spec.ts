import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { StorylinePage } from './storyline';

describe('StorylinePage', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StorylinePage],
      providers: [provideRouter([])],
    }).compileComponents();
  });

  function create() {
    const fixture = TestBed.createComponent(StorylinePage);
    fixture.detectChanges();
    return fixture;
  }

  it('presents the parallel-universe title and clearly labels fictional stories and images', () => {
    const element: HTMLElement = create().nativeElement;

    expect(element.querySelector('h1')?.textContent).toContain('The Storyline of');
    expect(element.querySelector('h1')?.textContent).toContain('Parallel Universe');
    expect(element.querySelector('.transparency')?.textContent).toContain('fictional examples');
    expect(element.querySelector('.transparency')?.textContent).toContain('AI-generated');
    expect(element.querySelector('.transparency')?.textContent).toContain('not real customer');
  });

  it('shows the first three albums with exactly four pictures in each', () => {
    const element: HTMLElement = create().nativeElement;
    const albums = Array.from(element.querySelectorAll<HTMLElement>('.story-album'));

    expect(albums.map((album) => album.id)).toEqual([
      'switzerland-honeymoon',
      'paris-solo-dream',
      'amazon-university-reunion',
    ]);
    expect(albums.every((album) => album.querySelectorAll('.album-photo').length === 4)).toBe(true);
    expect(element.querySelectorAll('.photo-label')).toHaveLength(12);
    expect(element.querySelectorAll('.album-index a')).toHaveLength(3);
  });

  it('keeps the Dutch, Paris and university-friends storylines and removes later albums', () => {
    const element: HTMLElement = create().nativeElement;
    const albums = Array.from(element.querySelectorAll<HTMLElement>('.story-album'));
    const copy = element.textContent ?? '';

    expect(albums[0].textContent).toContain('Switzerland');
    expect(albums[0].textContent).toContain('work pressure');
    expect(albums[1].textContent).toContain('Paris, France');
    expect(albums[1].textContent).toContain('middle-class family');
    expect(albums[2].textContent).toContain('Amazon Rainforest');
    expect(albums[2].textContent).toContain('3 men & 2 women');
    expect(albums[2].textContent).toContain('university');

    expect(copy).not.toContain('The Iyer family');
    expect(copy).not.toContain('Meera & Arjun');
    expect(copy).not.toContain('Helen & James');
    expect(copy).not.toContain('Clara');
    expect(copy).not.toContain('Elisabeth');
  });

  it('explains that barriers to travel are broader than money and avoids promising a real trip', () => {
    const element: HTMLElement = create().nativeElement;
    const copy = element.textContent ?? '';

    expect(copy).toContain('Money is only one part of the journey.');
    expect(copy).toContain('hundreds of thousands');
    expect(copy).toContain('work pressure');
    expect(copy).toContain('health or mobility');
    expect(copy).toContain('NeverBeen cannot remove those barriers');
    expect(copy).toContain('It can honour the longing; it cannot replace the journey.');
  });

  it('offers a route back to the NeverBeen request and how-it-works section', () => {
    const element: HTMLElement = create().nativeElement;
    const links = Array.from(element.querySelectorAll<HTMLAnchorElement>('a'));

    expect(links.some((link) => link.textContent?.includes('Tell us about your somewhere'))).toBe(
      true,
    );
    expect(links.some((link) => link.textContent?.includes('See how NeverBeen works'))).toBe(true);
    expect(
      links
        .find((link) => link.textContent?.includes('Tell us about your somewhere'))
        ?.getAttribute('href'),
    ).toBe('/#contact');
  });
});
