import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Audience } from './audience';
import { audienceProfiles, privacyPromises } from '../../models/site-content';

describe('Audience', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Audience],
      providers: [provideRouter([])],
    }).compileComponents();
  });

  function create() {
    const fixture = TestBed.createComponent(Audience);
    fixture.detectChanges();
    return fixture;
  }

  it('renders every audience segment with its tagline', () => {
    const element: HTMLElement = create().nativeElement;
    const cards = element.querySelectorAll('.card:not(.invite)');

    expect(cards.length).toBe(audienceProfiles.length);
    expect(element.querySelector('.card.invite .btn')).not.toBeNull();
    for (const profile of audienceProfiles) {
      expect(element.textContent).toContain(profile.name);
      expect(element.textContent).toContain(profile.tagline);
    }
  });

  it('renders every card photograph as a local asset with descriptive alt text', () => {
    const element: HTMLElement = create().nativeElement;
    const images = Array.from(element.querySelectorAll<HTMLImageElement>('.card img'));

    expect(images.length).toBe(audienceProfiles.length);
    for (const image of images) {
      const source = image.getAttribute('src') ?? image.src;
      expect(source).toContain('/audience/');
      expect(image.getAttribute('alt')?.length ?? 0).toBeGreaterThan(10);
    }
  });

  it('styles the secondary calls to action like the primary request button', () => {
    const element: HTMLElement = create().nativeElement;
    const linkByText = (label: string) =>
      Array.from(element.querySelectorAll<HTMLAnchorElement>('a.btn')).find(
        (link) => link.textContent?.trim() === label,
      );

    const primary = linkByText('Start your NeverBeen request');

    expect(primary?.classList.contains('btn-gold')).toBe(true);
    for (const label of ['See how it works', 'See packages', 'Create my vacation']) {
      const secondary = linkByText(label);
      expect(secondary).toBeDefined();
      expect(secondary?.className).toBe(primary?.className);
    }
    expect(element.querySelectorAll('a.btn-ghost, a.btn-primary').length).toBe(0);
  });

  it('shows the age note and every privacy promise', () => {
    const element: HTMLElement = create().nativeElement;

    expect(element.querySelector('.age-note')?.textContent).toContain("Your age doesn't matter");
    expect(element.querySelectorAll('.promises li').length).toBe(privacyPromises.length);
    expect(element.textContent?.toLowerCase()).toContain('model contract permission');
  });

  it('opens a lightbox for a card and closes it again', () => {
    const fixture = create();
    const element: HTMLElement = fixture.nativeElement;

    expect(element.querySelector('.lightbox')).toBeNull();

    (element.querySelector('.card .expand') as HTMLButtonElement).click();
    fixture.detectChanges();

    const lightbox = element.querySelector('.lightbox');
    expect(lightbox).not.toBeNull();
    expect(lightbox?.textContent).toContain(audienceProfiles[0].tagline);

    (element.querySelector('.lightbox-close') as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(element.querySelector('.lightbox')).toBeNull();
  });

  it('closes the lightbox on Escape', () => {
    const fixture = create();
    const element: HTMLElement = fixture.nativeElement;

    (element.querySelector('.card .expand') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(element.querySelector('.lightbox')).not.toBeNull();

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    fixture.detectChanges();

    expect(element.querySelector('.lightbox')).toBeNull();
  });
});
