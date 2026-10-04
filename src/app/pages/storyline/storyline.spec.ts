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

  it('shows the original and requested albums with the right sequence and all 85 frames', () => {
    const element: HTMLElement = create().nativeElement;
    const albums = Array.from(element.querySelectorAll<HTMLElement>('.story-album'));

    expect(albums.map((album) => album.id)).toEqual([
      'switzerland-honeymoon',
      'paris-solo-dream',
      'amazon-university-reunion',
      'italy-wedding-dream',
      'london-wedding-revisited',
      'vienna-birthday-missed',
      'everest-solo-dream',
      'banaras-european-couple-dream',
      'norway-anniversary-dream',
    ]);
    expect(
      albums.map((album) => album.querySelector('.cover-photo-button img')?.getAttribute('src')),
    ).toEqual([
      '/storyline/01-lotte-bram-lake-brienz.jpg',
      '/storyline/02-ananya-paris-seine.jpg',
      '/storyline/09-five-friends-amazon-river.jpg',
      '/storyline/13-meera-arjun-tuscany-courtyard.jpg',
      '/storyline/17-helen-james-london-registry.jpg',
      '/storyline/21-clara-vienna-birthday-dinner.jpg',
      '/storyline/25-elisabeth-everest-trail.jpg',
      '/storyline/29-ingrid-peter-varanasi-riverfront.jpg',
      '/storyline/33-asha-ravi-norway-fjord.jpg',
    ]);
    expect(
      albums.map((album) => album.querySelector('.cover-index strong')?.textContent?.trim()),
    ).toEqual(['01', '02', '03', '05', '06', '07', '08', '10', '11']);
    expect(albums.map((album) => album.querySelectorAll('.album-photo').length)).toEqual([
      3, 3, 3, 3, 52, 3, 3, 3, 3,
    ]);
    expect(
      albums.every((album) => album.querySelectorAll('.cover-photo-button').length === 1),
    ).toBe(true);
    expect(element.querySelectorAll('.photo-label, .lightbox-ai-label')).toHaveLength(0);
    expect(
      element.querySelectorAll('.cover-photo-button img').length +
        element.querySelectorAll('.album-photo img').length,
    ).toBe(85);
    expect(element.querySelectorAll('.album-index a')).toHaveLength(9);
    expect(element.querySelector<HTMLAnchorElement>('.album-index a')?.getAttribute('href')).toBe(
      '/storyline-of-parallel-universe#switzerland-honeymoon',
    );
    expect(element.querySelector('.albums-heading')?.textContent).toContain('Nine stories');
    expect(element.querySelector('.albums-heading')?.textContent).toContain(
      'eighty-five imagined frames',
    );
    expect(albums[4].querySelector('.cover-frame-count')?.textContent).toContain('53 FRAMES');
  });

  it('removes the requested picture IDs from Storyline 6', () => {
    const element: HTMLElement = create().nativeElement;
    const londonAlbum = element.querySelector<HTMLElement>('#london-wedding-revisited')!;
    const galleryImages = Array.from(
      londonAlbum.querySelectorAll<HTMLImageElement>('.album-photo img'),
    );
    // IDs refer to the numbered frames in the London album before removal (cover is 1).
    const removedPictureSources = [
      '/storyline/38-helen-james-london-black-cab.jpg', // 6
      '/storyline/40-helen-james-london-pub-toast.jpg', // 7
      '/storyline/42-helen-james-london-rainy-street.jpg', // 8
      '/storyline/45-helen-james-london-vintage-snapshot.jpg', // 9
      '/storyline/78-helen-james-wedding-mobile-macro-side-whisper.jpg', // 41
      '/storyline/81-helen-james-wedding-mobile-macro-low-angle.jpg', // 44
    ];

    expect(galleryImages).toHaveLength(52);
    expect(
      removedPictureSources.every(
        (src) => !galleryImages.some((image) => image.getAttribute('src') === src),
      ),
    ).toBe(true);
    expect(londonAlbum.querySelector('.cover-frame-count')?.textContent).toContain('53 FRAMES');
  });

  it('keeps Helen’s existing solo portrait batch in Storyline 6', () => {
    const element: HTMLElement = create().nativeElement;
    const londonAlbum = element.querySelector<HTMLElement>('#london-wedding-revisited')!;
    const galleryImages = Array.from(
      londonAlbum.querySelectorAll<HTMLImageElement>('.album-photo img'),
    );
    const soloPortraits = galleryImages.slice(24, 34);

    expect(galleryImages).toHaveLength(52);
    expect(
      londonAlbum.querySelector('img[src="/storyline/46-helen-james-london-album-memory.jpg"]'),
    ).toBeNull();
    expect(
      [
        '/storyline/39-helen-james-london-thames-walk.jpg',
        '/storyline/41-helen-james-london-first-dance.jpg',
        '/storyline/43-helen-james-london-monochrome-portrait.jpg',
        '/storyline/44-helen-james-london-wedding-breakfast.jpg',
      ].every((src) => !galleryImages.some((image) => image.getAttribute('src') === src)),
    ).toBe(true);
    expect(soloPortraits.map((image) => image.getAttribute('src'))).toEqual([
      '/storyline/67-helen-london-wedding-mobile-macro-front.jpg',
      '/storyline/68-helen-london-wedding-mobile-macro-three-quarter.jpg',
      '/storyline/69-helen-london-wedding-mobile-macro-profile.jpg',
      '/storyline/70-helen-london-wedding-mobile-macro-bouquet.jpg',
      '/storyline/71-helen-london-wedding-mobile-macro-over-shoulder.jpg',
      '/storyline/72-helen-london-wedding-mobile-macro-low-angle.jpg',
      '/storyline/73-helen-london-wedding-mobile-macro-laugh.jpg',
      '/storyline/74-helen-london-wedding-mobile-macro-back-view.jpg',
      '/storyline/75-helen-london-wedding-mobile-macro-window.jpg',
      '/storyline/76-helen-london-wedding-mobile-macro-courtyard.jpg',
    ]);
    expect(
      soloPortraits.every(
        (image) =>
          image.alt.includes('Helen') &&
          image.alt.includes('portrait') &&
          !image.alt.includes('James'),
      ),
    ).toBe(true);
    expect(
      Array.from(londonAlbum.querySelectorAll('.photo-number')).map((number) =>
        number.textContent?.trim(),
      ),
    ).toEqual(Array.from({ length: 52 }, (_, index) => String(index + 2).padStart(2, '0')));
  });

  it('retains the earlier romantic couple portrait batch in Storyline 6', () => {
    const element: HTMLElement = create().nativeElement;
    const londonAlbum = element.querySelector<HTMLElement>('#london-wedding-revisited')!;
    const galleryImages = Array.from(
      londonAlbum.querySelectorAll<HTMLImageElement>('.album-photo img'),
    );
    const couplePortraits = galleryImages.filter((image) =>
      image.getAttribute('src')?.includes('helen-james-wedding-mobile-macro'),
    );

    expect(galleryImages).toHaveLength(52);
    expect(couplePortraits.map((image) => image.getAttribute('src'))).toEqual([
      '/storyline/77-helen-james-wedding-mobile-macro-candid-laugh.jpg',
      '/storyline/79-helen-james-wedding-mobile-macro-over-shoulder.jpg',
      '/storyline/80-helen-james-wedding-mobile-macro-high-angle.jpg',
      '/storyline/82-helen-james-wedding-mobile-macro-forehead-kiss.jpg',
      '/storyline/83-helen-james-wedding-mobile-macro-laughing-selfie.jpg',
      '/storyline/84-helen-james-wedding-mobile-macro-back-view.jpg',
      '/storyline/85-helen-james-wedding-mobile-macro-thames-profile.jpg',
      '/storyline/86-helen-james-wedding-mobile-macro-courtyard-embrace.jpg',
    ]);
    expect(
      couplePortraits.every(
        (image) =>
          image.alt.includes('Helen') &&
          image.alt.includes('James') &&
          image.alt.includes('portrait'),
      ),
    ).toBe(true);
  });

  it('adds happy close portraits of Helen with friends and family and navigates within Storyline 6', () => {
    const fixture = create();
    const element: HTMLElement = fixture.nativeElement;
    const londonAlbum = element.querySelector<HTMLElement>('#london-wedding-revisited')!;
    const galleryImages = Array.from(
      londonAlbum.querySelectorAll<HTMLImageElement>('.album-photo img'),
    );
    const familyPortraits = galleryImages.slice(-10);

    expect(galleryImages).toHaveLength(52);
    expect(familyPortraits.map((image) => image.getAttribute('src'))).toEqual([
      '/storyline/87-helen-wedding-mobile-macro-friends-laugh.jpg',
      '/storyline/88-helen-wedding-mobile-macro-mother-embrace.jpg',
      '/storyline/89-helen-wedding-mobile-macro-sister-whisper.jpg',
      '/storyline/90-helen-wedding-mobile-macro-bouquet-friend.jpg',
      '/storyline/91-helen-wedding-mobile-macro-family-toast.jpg',
      '/storyline/92-helen-wedding-mobile-macro-back-view-friend.jpg',
      '/storyline/93-helen-wedding-mobile-macro-mother-profile.jpg',
      '/storyline/94-helen-wedding-mobile-macro-window-friend.jpg',
      '/storyline/95-helen-wedding-mobile-macro-courtyard-friends.jpg',
      '/storyline/96-helen-wedding-mobile-macro-laugh-over-shoulder.jpg',
    ]);
    expect(
      familyPortraits.every(
        (image) =>
          image.alt.includes('Helen') &&
          image.alt.includes('portrait') &&
          !image.alt.includes('James'),
      ),
    ).toBe(true);
    expect(familyPortraits.some((image) => /friend|mother|relative/i.test(image.alt))).toBe(true);

    londonAlbum.querySelector<HTMLButtonElement>('.album-toggle')!.click();
    fixture.detectChanges();
    const photoButtons = londonAlbum.querySelectorAll<HTMLButtonElement>('.photo-open-button');
    photoButtons[51].click();
    fixture.detectChanges();

    expect(element.querySelector('.story-lightbox figure img')?.getAttribute('src')).toBe(
      '/storyline/96-helen-wedding-mobile-macro-laugh-over-shoulder.jpg',
    );
    expect(element.querySelector('.lightbox-position')?.textContent).toContain('53 / 53');
    expect(element.querySelector('.lightbox-arrow.previous')?.getAttribute('aria-label')).toBe(
      'Previous photo in this story',
    );
    expect(element.querySelector('.lightbox-arrow.next')?.getAttribute('aria-label')).toBe(
      'Next photo in this story',
    );

    (element.querySelector('.lightbox-arrow.previous') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(element.querySelector('.story-lightbox figure img')?.getAttribute('src')).toBe(
      '/storyline/95-helen-wedding-mobile-macro-courtyard-friends.jpg',
    );
    expect(element.querySelector('.lightbox-position')?.textContent).toContain('52 / 53');

    (element.querySelector('.lightbox-arrow.next') as HTMLButtonElement).click();
    fixture.detectChanges();
    (element.querySelector('.lightbox-arrow.next') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(element.querySelector('.story-lightbox figure img')?.getAttribute('src')).toBe(
      '/storyline/17-helen-james-london-registry.jpg',
    );
    expect(element.querySelector('.lightbox-position')?.textContent).toContain('1 / 53');
    (element.querySelector('.lightbox-close') as HTMLButtonElement).click();
    fixture.detectChanges();
  });

  it('collapses every storyline by default and lets each one extend independently', () => {
    const fixture = create();
    const element: HTMLElement = fixture.nativeElement;
    const albums = Array.from(element.querySelectorAll<HTMLElement>('.story-album'));
    const firstButton = albums[0].querySelector<HTMLButtonElement>('.album-toggle')!;
    const secondButton = albums[1].querySelector<HTMLButtonElement>('.album-toggle')!;
    const firstContent = albums[0].querySelector<HTMLElement>('.album-layout')!;

    expect(element.querySelectorAll('.album-toggle')).toHaveLength(9);
    expect(
      albums.every(
        (album) => album.querySelector('.album-toggle')?.getAttribute('aria-expanded') === 'false',
      ),
    ).toBe(true);
    expect(albums.every((album) => album.querySelector<HTMLElement>('.album-layout')?.hidden)).toBe(
      true,
    );
    expect(firstButton.getAttribute('aria-controls')).toBe(firstContent.id);
    expect(firstContent.hidden).toBe(true);

    firstButton.click();
    fixture.detectChanges();

    expect(firstButton.getAttribute('aria-expanded')).toBe('true');
    expect(firstButton.textContent).toContain('Collapse storyline');
    expect(firstContent.hidden).toBe(false);
    expect(secondButton.getAttribute('aria-expanded')).toBe('false');
    expect(albums[1].querySelector<HTMLElement>('.album-layout')?.hidden).toBe(true);

    firstButton.click();
    fixture.detectChanges();

    expect(firstButton.getAttribute('aria-expanded')).toBe('false');
    expect(firstButton.textContent).toContain('Extend storyline');
    expect(firstContent.hidden).toBe(true);
  });

  it('keeps a cover photo, story title, destination, and characters visible on every collapsed card', () => {
    const element: HTMLElement = create().nativeElement;
    const albums = Array.from(element.querySelectorAll<HTMLElement>('.story-album'));

    expect(albums).toHaveLength(9);
    for (const album of albums) {
      expect(album.querySelector<HTMLElement>('.album-layout')?.hidden).toBe(true);
      const coverImage = album.querySelector<HTMLImageElement>('.cover-photo-button img')!;
      expect(coverImage.getAttribute('src')).toContain('/storyline/');
      expect(getComputedStyle(coverImage).opacity).toBe('1');
      expect(album.querySelector('.cover-photo-hint')?.textContent).toContain('OPEN COVER');
      expect(album.querySelector('.cover-photo-hint')?.textContent).not.toContain(
        'AI ILLUSTRATION',
      );
      expect(album.querySelector('.story-cover h3')?.textContent?.trim()).toBeTruthy();
      expect(album.querySelector('.cover-location-name')?.textContent?.trim()).toBeTruthy();
      expect(album.querySelector('.cover-people')?.textContent?.trim()).toBeTruthy();
    }

    expect(albums[0].querySelector('.story-cover')?.textContent).toContain(
      'The honeymoon that kept getting postponed',
    );
    expect(albums[0].querySelector('.cover-location-name')?.textContent).toContain('Switzerland');
    expect(albums[0].querySelector('.cover-people')?.textContent).toContain('Lotte & Bram');
  });

  it('keeps the reason section at the bottom, after every story and the closing call to action', () => {
    const element: HTMLElement = create().nativeElement;
    const sections = Array.from(element.querySelectorAll<HTMLElement>('.storyline-page > section'));

    expect(sections.at(-1)?.classList.contains('barriers')).toBe(true);
    expect(sections.indexOf(element.querySelector('.story-albums')!)).toBeLessThan(
      sections.indexOf(element.querySelector('.barriers')!),
    );
    expect(sections.indexOf(element.querySelector('.storyline-close')!)).toBeLessThan(
      sections.indexOf(element.querySelector('.barriers')!),
    );
  });

  it('opens a collapsed story cover in the image lightbox and closes on a backdrop click', () => {
    const fixture = create();
    const element: HTMLElement = fixture.nativeElement;
    const firstAlbum = element.querySelector<HTMLElement>('.story-album')!;
    const coverButton = firstAlbum.querySelector<HTMLButtonElement>('.cover-photo-button')!;
    const originalOverflow = document.body.style.overflow;

    expect(firstAlbum.querySelector<HTMLElement>('.album-layout')?.hidden).toBe(true);
    coverButton.click();
    fixture.detectChanges();

    const lightbox = element.querySelector<HTMLElement>('.story-lightbox');
    expect(lightbox?.getAttribute('aria-modal')).toBe('true');
    expect(lightbox?.querySelector('figure img')?.getAttribute('src')).toBe(
      coverButton.querySelector('img')?.getAttribute('src'),
    );
    expect(document.body.style.overflow).toBe('hidden');

    lightbox?.click();
    fixture.detectChanges();

    expect(element.querySelector('.story-lightbox')).toBeNull();
    expect(document.body.style.overflow).toBe(originalOverflow);
    expect(document.activeElement).toBe(coverButton);
  });

  it('opens gallery photos and navigates within the selected story using controls and keyboard', () => {
    const fixture = create();
    const element: HTMLElement = fixture.nativeElement;
    const firstAlbum = element.querySelector<HTMLElement>('.story-album')!;
    const extendButton = firstAlbum.querySelector<HTMLButtonElement>('.album-toggle')!;
    const photoButtons = firstAlbum.querySelectorAll<HTMLButtonElement>('.photo-open-button');
    const press = (key: string) => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key }));
      fixture.detectChanges();
    };

    extendButton.click();
    fixture.detectChanges();
    photoButtons[1].click();
    fixture.detectChanges();

    expect(element.querySelector('.story-lightbox figure img')?.getAttribute('src')).toBe(
      '/storyline/04-lotte-bram-train.jpg',
    );
    expect(firstAlbum.querySelectorAll('.photo-label')).toHaveLength(0);
    expect(element.querySelectorAll('.lightbox-ai-label')).toHaveLength(0);
    expect(element.querySelector('.story-lightbox')?.textContent).not.toMatch(/AI illustration/i);
    expect(element.querySelector('.lightbox-position')?.textContent).toContain('3 / 4');

    (element.querySelector('.lightbox-arrow.next') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(element.querySelector('.story-lightbox figure img')?.getAttribute('src')).toBe(
      '/storyline/05-lotte-bram-mountain-cafe.jpg',
    );

    press('ArrowLeft');
    expect(element.querySelector('.story-lightbox figure img')?.getAttribute('src')).toBe(
      '/storyline/04-lotte-bram-train.jpg',
    );

    press('Escape');
    expect(element.querySelector('.story-lightbox')).toBeNull();
    expect(document.body.style.overflow).toBe('');
  });

  it('keeps the original storylines, adds the requested albums, and excludes the unrequested Singapore story', () => {
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

    expect(albums[3].textContent).toContain('Tuscany, Italy');
    expect(albums[3].textContent).toContain('Meera died in an accident');
    expect(albums[3].textContent).toContain('wedding never happened');
    expect(albums[3].textContent).toContain('fictional keepsake');

    expect(albums[4].textContent).toContain('London, United Kingdom');
    expect(albums[4].textContent).toContain('old wedding pictures');
    expect(albums[4].textContent).toContain('photographs that truly document it');
    expect(albums[4].textContent).toContain('not restorations or recovered images');

    expect(albums[5].textContent).toContain('Vienna, Austria');
    expect(albums[5].textContent).toContain('COVID restrictions');
    expect(albums[5].textContent).toContain('twenty-fifth birthday');
    expect(albums[5].textContent).toContain('friends');

    expect(albums[6].textContent).toContain('Everest Region, Nepal');
    expect(albums[6].textContent).toContain('Work pressure');
    expect(albums[6].textContent).toContain('solo trek');
    expect(albums[6].textContent).toContain('not evidence that she travelled');
    expect(albums[6].textContent).toContain('not climb a summit');
    expect(albums[6].querySelectorAll('.album-photo img')[0].getAttribute('src')).toBe(
      '/storyline/26-elisabeth-everest-village-stop.jpg',
    );

    expect(albums[7].textContent).toContain('Benaras (Varanasi), India');
    expect(albums[7].textContent).toContain('visa applications');
    expect(albums[7].textContent).toContain('refused several times');
    expect(albums[7].textContent).toContain('They never made the visit');
    expect(albums[7].textContent).toContain('not evidence of a trip or visa approval');

    expect(albums[8].textContent).toContain('50th wedding anniversary');
    expect(albums[8].textContent).toContain('admitted to hospital');
    expect(albums[8].textContent).toContain('trip on hold');
    expect(albums[8].textContent).toContain('not a completed visit');
    expect(albums[8].textContent).toContain('Asha has recovered');

    expect(copy).not.toContain('The Iyer family');
    expect(copy).not.toContain('Singapore');
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
