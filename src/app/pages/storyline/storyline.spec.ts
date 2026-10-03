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

  it('presents the parallel-universe title and clearly labels fictional stories and illustrative images', () => {
    const element: HTMLElement = create().nativeElement;

    expect(element.querySelector('h1')?.textContent).toContain('The Storyline of');
    expect(element.querySelector('h1')?.textContent).toContain('Parallel Universe');
    expect(element.querySelector('.transparency')?.textContent).toContain('fictional examples');
    expect(element.querySelector('.transparency')?.textContent).toContain('AI-generated');
    expect(element.querySelector('.transparency')?.textContent).toContain('not real customer');
  });

  it('shows eight albums with exactly four pictures in each album', () => {
    const element: HTMLElement = create().nativeElement;
    const albums = Array.from(element.querySelectorAll<HTMLElement>('.story-album'));

    expect(albums).toHaveLength(8);
    expect(albums.every((album) => album.querySelectorAll('.album-photo').length === 4)).toBe(true);
    expect(element.querySelectorAll('.photo-label')).toHaveLength(32);
    expect(element.querySelectorAll('.album-index a')).toHaveLength(8);
  });

  it('includes the reunion, family preview, wedding, birthday and Everest storylines', () => {
    const element: HTMLElement = create().nativeElement;
    const albums = Array.from(element.querySelectorAll<HTMLElement>('.story-album'));

    expect(albums[2].textContent).toContain('Amazon Rainforest');
    expect(albums[2].textContent).toContain('3 men & 2 women');
    expect(albums[2].textContent).toContain('university');

    expect(albums[3].textContent).toContain('Singapore');
    expect(albums[3].textContent).toContain('The Iyer family');
    expect(albums[3].textContent?.toLowerCase()).toContain('before they pack');

    expect(albums[4].textContent).toContain('Tuscany, Italy');
    expect(albums[4].textContent).toContain('Meera died in an accident');
    expect(albums[4].querySelector('.content-note')?.textContent).toContain('bereavement');

    expect(albums[5].textContent).toContain('London, United Kingdom');
    expect(albums[5].textContent).toContain('old photographs');

    expect(albums[6].textContent).toContain('Vienna, Austria');
    expect(albums[6].textContent).toContain('COVID restrictions');
    expect(albums[6].textContent).toContain('twenty-five');

    expect(albums[7].textContent).toContain('Everest Region, Nepal');
    expect(albums[7].textContent).toContain('Her job was demanding');
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
