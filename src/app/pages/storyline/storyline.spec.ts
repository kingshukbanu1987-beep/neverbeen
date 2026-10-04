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

  it('shows the original and requested albums with the right sequence and all 241 frames', () => {
    const element: HTMLElement = create().nativeElement;
    const albums = Array.from(element.querySelectorAll<HTMLElement>('.story-album'));

    expect(albums.map((album) => album.id)).toEqual([
      'london-wedding-revisited',
      'vienna-birthday-missed',
      'paris-solo-dream',
      'switzerland-honeymoon',
      'amazon-university-reunion',
      'italy-wedding-dream',
      'everest-solo-dream',
      'banaras-european-couple-dream',
      'norway-anniversary-dream',
    ]);
    expect(
      albums.map((album) => album.querySelector('.cover-photo-button img')?.getAttribute('src')),
    ).toEqual([
      '/storyline/17-helen-james-london-registry.jpg',
      '/storyline/21-clara-vienna-birthday-dinner.jpg',
      '/storyline/02-ananya-paris-seine.jpg',
      '/storyline/01-lotte-bram-lake-brienz.jpg',
      '/storyline/09-five-friends-amazon-river.jpg',
      '/storyline/13-meera-arjun-tuscany-courtyard.jpg',
      '/storyline/25-elisabeth-everest-trail.jpg',
      '/storyline/29-ingrid-peter-varanasi-riverfront.jpg',
      '/storyline/33-asha-ravi-norway-fjord.jpg',
    ]);
    expect(
      albums.map((album) => album.querySelector('.cover-index strong')?.textContent?.trim()),
    ).toEqual(['01', '02', '03', '04', '05', '06', '07', '08', '09']);
    expect(albums.map((album) => album.querySelectorAll('.album-photo').length)).toEqual([
      73, 74, 70, 4, 4, 4, 4, 4, 4,
    ]);
    expect(
      albums.every((album) => album.querySelectorAll('.cover-photo-button').length === 1),
    ).toBe(true);
    expect(
      albums.every(
        (album) =>
          album.querySelector<HTMLImageElement>('.album-photo img')?.getAttribute('src') ===
          album.querySelector<HTMLImageElement>('.cover-photo-button img')?.getAttribute('src'),
      ),
    ).toBe(true);
    expect(element.querySelectorAll('.photo-label, .lightbox-ai-label')).toHaveLength(0);
    expect(element.querySelectorAll('.album-photo img')).toHaveLength(241);
    expect(element.querySelectorAll('.album-index')).toHaveLength(0);
    expect(element.querySelector('.albums-heading')?.textContent).toContain('Nine stories');
    expect(element.querySelector('.albums-heading')?.textContent).toContain(
      'two hundred and forty-one imagined frames',
    );
    expect(element.querySelector('.albums-heading')?.textContent).not.toContain(
      'Album sizes vary',
    );
    expect(albums[0].querySelector('.cover-frame-count')?.textContent).toContain('73 FRAMES');
    expect(albums[1].querySelector('.cover-frame-count')?.textContent).toContain('74 FRAMES');
    expect(albums[2].querySelector('.cover-frame-count')?.textContent).toContain('70 FRAMES');
  });

  it('adds ten mixed-style Paris photos matching Ananya to Storyline 3', () => {
    const element: HTMLElement = create().nativeElement;
    const parisAlbum = element.querySelector<HTMLElement>('#paris-solo-dream')!;
    const galleryImages = Array.from(
      parisAlbum.querySelectorAll<HTMLImageElement>('.album-photo img'),
    );
    const addedPhotoSources = [
      '/storyline/197-ananya-paris-portrait-trocadero.jpg',
      '/storyline/198-ananya-paris-wide-notredame.jpg',
      '/storyline/199-ananya-paris-macro-croissant.jpg',
      '/storyline/200-ananya-paris-selfie-montmartre.jpg',
      '/storyline/201-ananya-paris-selfie-local-cafe.jpg',
      '/storyline/202-ananya-paris-portrait-bridge.jpg',
      '/storyline/203-ananya-paris-wide-gardens.jpg',
      '/storyline/204-ananya-paris-macro-jewelry.jpg',
      '/storyline/205-ananya-paris-selfie-local-market.jpg',
      '/storyline/206-ananya-paris-bookstore-portrait.jpg',
    ];
    const removedPhotoSources = [
      '/storyline/199-ananya-paris-macro-croissant.jpg',
      '/storyline/206-ananya-paris-bookstore-portrait.jpg',
    ];
    const retainedPhotoSources = addedPhotoSources.filter(
      (src) => !removedPhotoSources.includes(src),
    );
    const addedPhotos = galleryImages.filter((image) =>
      addedPhotoSources.includes(image.getAttribute('src') ?? ''),
    );
    const addedDescriptions = addedPhotos.map((image) => image.alt).join(' ');

    expect(galleryImages).toHaveLength(70);
    expect(addedPhotos).toHaveLength(8);
    expect(addedPhotos.map((image) => image.getAttribute('src')).sort()).toEqual(
      [...retainedPhotoSources].sort(),
    );
    expect(addedPhotos.every((image) => image.alt.includes('Ananya'))).toBe(true);
    expect(addedDescriptions).toMatch(/portrait/i);
    expect(addedDescriptions).toMatch(/wide-angle/i);
    expect(addedDescriptions).toMatch(/selfie/i);
    expect(addedDescriptions).toMatch(/waiter|vendor|market/i);
    expect(
      addedPhotos
        .filter((image) => /selfie/i.test(image.alt))
        .every((image) => /phone is not visible/i.test(image.alt)),
    ).toBe(true);
    expect(parisAlbum.querySelector('.cover-frame-count')?.textContent).toContain('70 FRAMES');
    expect(parisAlbum.querySelector('.cover-index strong')?.textContent?.trim()).toBe('03');
  });

  it('adds ten tilted winter mobile selfies matching Ananya to Storyline 3', () => {
    const element: HTMLElement = create().nativeElement;
    const parisAlbum = element.querySelector<HTMLElement>('#paris-solo-dream')!;
    const galleryImages = Array.from(
      parisAlbum.querySelectorAll<HTMLImageElement>('.album-photo img'),
    );
    const addedPhotoSources = [
      '/storyline/207-ananya-paris-winter-selfie-tilted-street.jpg',
      '/storyline/208-ananya-paris-winter-selfie-local-bookseller.jpg',
      '/storyline/209-ananya-paris-winter-selfie-tilted-nightlights.jpg',
      '/storyline/210-ananya-paris-winter-selfie-local-baker.jpg',
      '/storyline/211-ananya-paris-winter-selfie-metro.jpg',
      '/storyline/212-ananya-paris-winter-selfie-local-florist.jpg',
      '/storyline/213-ananya-paris-winter-selfie-tilted-close.jpg',
      '/storyline/214-ananya-paris-winter-selfie-tilted-tower.jpg',
      '/storyline/215-ananya-paris-winter-selfie-local-barista.jpg',
      '/storyline/216-ananya-paris-winter-selfie-tilted-seine.jpg',
    ];
    const addedPhotos = galleryImages.filter((image) =>
      addedPhotoSources.includes(image.getAttribute('src') ?? ''),
    );
    const addedDescriptions = addedPhotos.map((image) => image.alt).join(' ');

    expect(galleryImages).toHaveLength(70);
    expect(addedPhotos).toHaveLength(10);
    expect(addedPhotos.map((image) => image.getAttribute('src')).sort()).toEqual(
      [...addedPhotoSources].sort(),
    );
    expect(addedPhotos.every((image) => image.alt.includes('Ananya'))).toBe(true);
    expect(addedPhotos.every((image) => /selfie/i.test(image.alt))).toBe(true);
    expect(addedPhotos.every((image) => /phone is not visible/i.test(image.alt))).toBe(true);
    expect(addedPhotos.every((image) => /winter/i.test(image.alt))).toBe(true);
    expect(addedDescriptions).toMatch(/tilted/i);
    expect(addedDescriptions).toMatch(/bookseller/i);
    expect(addedDescriptions).toMatch(/baker/i);
    expect(addedDescriptions).toMatch(/florist/i);
    expect(addedDescriptions).toMatch(/barista/i);
    expect(parisAlbum.querySelector('.cover-frame-count')?.textContent).toContain('70 FRAMES');
  });

  it('adds ten tilted winter selfies with locals at French landmarks to Storyline 3', () => {
    const element: HTMLElement = create().nativeElement;
    const parisAlbum = element.querySelector<HTMLElement>('#paris-solo-dream')!;
    const galleryImages = Array.from(
      parisAlbum.querySelectorAll<HTMLImageElement>('.album-photo img'),
    );
    const addedPhotoSources = [
      '/storyline/217-ananya-france-winter-selfie-louvre-local.jpg',
      '/storyline/218-ananya-france-winter-selfie-arc-local.jpg',
      '/storyline/219-ananya-france-winter-selfie-eiffel-local.jpg',
      '/storyline/220-ananya-france-winter-selfie-notredame-local.jpg',
      '/storyline/221-ananya-france-winter-selfie-sacrecoeur-local.jpg',
      '/storyline/222-ananya-france-winter-selfie-versailles-local.jpg',
      '/storyline/223-ananya-france-winter-selfie-montstmichel-local.jpg',
      '/storyline/224-ananya-france-winter-selfie-nice-local.jpg',
      '/storyline/225-ananya-france-winter-selfie-strasbourg-local.jpg',
      '/storyline/226-ananya-france-winter-selfie-moulinrouge-local.jpg',
    ];
    const addedPhotos = galleryImages.filter((image) =>
      addedPhotoSources.includes(image.getAttribute('src') ?? ''),
    );
    const addedDescriptions = addedPhotos.map((image) => image.alt).join(' ');

    expect(galleryImages).toHaveLength(70);
    expect(addedPhotos).toHaveLength(10);
    expect(addedPhotos.map((image) => image.getAttribute('src')).sort()).toEqual(
      [...addedPhotoSources].sort(),
    );
    expect(addedPhotos.every((image) => image.alt.includes('Ananya'))).toBe(true);
    expect(addedPhotos.every((image) => /selfie/i.test(image.alt))).toBe(true);
    expect(addedPhotos.every((image) => /phone is not visible/i.test(image.alt))).toBe(true);
    expect(addedPhotos.every((image) => /winter/i.test(image.alt))).toBe(true);
    expect(addedPhotos.every((image) => /tilted/i.test(image.alt))).toBe(true);
    expect(addedPhotos.every((image) => /local/i.test(image.alt))).toBe(true);
    expect(addedDescriptions).toMatch(/Louvre/i);
    expect(addedDescriptions).toMatch(/Arc de Triomphe/i);
    expect(addedDescriptions).toMatch(/Eiffel/i);
    expect(addedDescriptions).toMatch(/Notre-Dame/i);
    expect(addedDescriptions).toMatch(/Sacré-Cœur/i);
    expect(addedDescriptions).toMatch(/Versailles/i);
    expect(addedDescriptions).toMatch(/Mont Saint-Michel/i);
    expect(addedDescriptions).toMatch(/Nice/i);
    expect(addedDescriptions).toMatch(/Strasbourg/i);
    expect(addedDescriptions).toMatch(/Moulin Rouge/i);
    expect(parisAlbum.querySelector('.cover-frame-count')?.textContent).toContain('70 FRAMES');
  });

  it('adds ten tilted winter selfies with locals at Paris stations, cafés and landmarks to Storyline 3', () => {
    const element: HTMLElement = create().nativeElement;
    const parisAlbum = element.querySelector<HTMLElement>('#paris-solo-dream')!;
    const galleryImages = Array.from(
      parisAlbum.querySelectorAll<HTMLImageElement>('.album-photo img'),
    );
    const addedPhotoSources = [
      '/storyline/227-ananya-paris-winter-selfie-metro-local.jpg',
      '/storyline/228-ananya-paris-winter-selfie-busstation-local.jpg',
      '/storyline/229-ananya-paris-winter-selfie-cafe-local.jpg',
      '/storyline/230-ananya-paris-winter-selfie-trainstation-local.jpg',
      '/storyline/231-ananya-paris-winter-selfie-eiffel-local.jpg',
      '/storyline/232-ananya-paris-winter-selfie-church-local.jpg',
      '/storyline/233-ananya-paris-winter-selfie-metroplatform-local.jpg',
      '/storyline/234-ananya-paris-winter-selfie-garedelyon-local.jpg',
      '/storyline/235-ananya-paris-winter-selfie-cafeterrace-local.jpg',
      '/storyline/236-ananya-paris-winter-selfie-saintsulpice-local.jpg',
    ];
    const addedPhotos = galleryImages.filter((image) =>
      addedPhotoSources.includes(image.getAttribute('src') ?? ''),
    );
    const addedDescriptions = addedPhotos.map((image) => image.alt).join(' ');

    expect(galleryImages).toHaveLength(70);
    expect(addedPhotos).toHaveLength(10);
    expect(addedPhotos.map((image) => image.getAttribute('src')).sort()).toEqual(
      [...addedPhotoSources].sort(),
    );
    expect(addedPhotos.every((image) => image.alt.includes('Ananya'))).toBe(true);
    expect(addedPhotos.every((image) => /selfie/i.test(image.alt))).toBe(true);
    expect(addedPhotos.every((image) => /phone is not visible/i.test(image.alt))).toBe(true);
    expect(addedPhotos.every((image) => /winter/i.test(image.alt))).toBe(true);
    expect(addedPhotos.every((image) => /tilted/i.test(image.alt))).toBe(true);
    expect(addedPhotos.every((image) => /local/i.test(image.alt))).toBe(true);
    expect(addedDescriptions).toMatch(/Métro/i);
    expect(addedDescriptions).toMatch(/bus station/i);
    expect(addedDescriptions).toMatch(/café/i);
    expect(addedDescriptions).toMatch(/train station/i);
    expect(addedDescriptions).toMatch(/Eiffel Tower/i);
    expect(addedDescriptions).toMatch(/church/i);
    expect(parisAlbum.querySelector('.cover-frame-count')?.textContent).toContain('70 FRAMES');
  });

  it('adds ten tilted night-flash full-figure photos with locals in Paris to Storyline 3', () => {
    const element: HTMLElement = create().nativeElement;
    const parisAlbum = element.querySelector<HTMLElement>('#paris-solo-dream')!;
    const galleryImages = Array.from(
      parisAlbum.querySelectorAll<HTMLImageElement>('.album-photo img'),
    );
    const addedPhotoSources = [
      '/storyline/237-ananya-paris-nightflash-metro-full.jpg',
      '/storyline/238-ananya-paris-nightflash-busstation-full.jpg',
      '/storyline/239-ananya-paris-nightflash-cafe-full.jpg',
      '/storyline/240-ananya-paris-nightflash-trainstation-full.jpg',
      '/storyline/241-ananya-paris-nightflash-eiffel-full.jpg',
      '/storyline/242-ananya-paris-nightflash-church-full.jpg',
      '/storyline/243-ananya-paris-nightflash-metroplatform-full.jpg',
      '/storyline/244-ananya-paris-nightflash-garedelyon-full.jpg',
      '/storyline/245-ananya-paris-nightflash-cafeterrace-full.jpg',
      '/storyline/246-ananya-paris-nightflash-saintsulpice-full.jpg',
    ];
    const addedPhotos = galleryImages.filter((image) =>
      addedPhotoSources.includes(image.getAttribute('src') ?? ''),
    );
    const addedDescriptions = addedPhotos.map((image) => image.alt).join(' ');

    expect(galleryImages).toHaveLength(70);
    expect(addedPhotos).toHaveLength(10);
    expect(addedPhotos.map((image) => image.getAttribute('src')).sort()).toEqual(
      [...addedPhotoSources].sort(),
    );
    expect(addedPhotos.every((image) => image.alt.includes('Ananya'))).toBe(true);
    expect(addedPhotos.every((image) => /full-figure/i.test(image.alt))).toBe(true);
    expect(addedPhotos.every((image) => /night/i.test(image.alt))).toBe(true);
    expect(addedPhotos.every((image) => /flash/i.test(image.alt))).toBe(true);
    expect(addedPhotos.every((image) => /tilted/i.test(image.alt))).toBe(true);
    expect(addedPhotos.every((image) => /winter/i.test(image.alt))).toBe(true);
    expect(addedPhotos.every((image) => /local/i.test(image.alt))).toBe(true);
    expect(addedDescriptions).toMatch(/Métro/i);
    expect(addedDescriptions).toMatch(/bus station/i);
    expect(addedDescriptions).toMatch(/café/i);
    expect(addedDescriptions).toMatch(/train station/i);
    expect(addedDescriptions).toMatch(/Eiffel Tower/i);
    expect(addedDescriptions).toMatch(/church/i);
    expect(parisAlbum.querySelector('.cover-frame-count')?.textContent).toContain('70 FRAMES');
  });

  it('adds ten more tilted night-flash full-figure photos with locals in Paris to Storyline 3', () => {
    const element: HTMLElement = create().nativeElement;
    const parisAlbum = element.querySelector<HTMLElement>('#paris-solo-dream')!;
    const galleryImages = Array.from(
      parisAlbum.querySelectorAll<HTMLImageElement>('.album-photo img'),
    );
    const addedPhotoSources = [
      '/storyline/247-ananya-paris-nightflash-metro-full.jpg',
      '/storyline/248-ananya-paris-nightflash-busstation-full.jpg',
      '/storyline/249-ananya-paris-nightflash-cafe-full.jpg',
      '/storyline/250-ananya-paris-nightflash-trainstation-full.jpg',
      '/storyline/251-ananya-paris-nightflash-eiffel-full.jpg',
      '/storyline/252-ananya-paris-nightflash-church-full.jpg',
      '/storyline/253-ananya-paris-nightflash-metroplatform-full.jpg',
      '/storyline/254-ananya-paris-nightflash-garedelyon-full.jpg',
      '/storyline/255-ananya-paris-nightflash-cafeterrace-full.jpg',
      '/storyline/256-ananya-paris-nightflash-saintsulpice-full.jpg',
    ];
    const addedPhotos = galleryImages.filter((image) =>
      addedPhotoSources.includes(image.getAttribute('src') ?? ''),
    );
    const addedDescriptions = addedPhotos.map((image) => image.alt).join(' ');

    expect(galleryImages).toHaveLength(70);
    expect(addedPhotos).toHaveLength(10);
    expect(addedPhotos.map((image) => image.getAttribute('src')).sort()).toEqual(
      [...addedPhotoSources].sort(),
    );
    expect(addedPhotos.every((image) => image.alt.includes('Ananya'))).toBe(true);
    expect(addedPhotos.every((image) => /full-figure/i.test(image.alt))).toBe(true);
    expect(addedPhotos.every((image) => /night/i.test(image.alt))).toBe(true);
    expect(addedPhotos.every((image) => /flash/i.test(image.alt))).toBe(true);
    expect(addedPhotos.every((image) => /tilted/i.test(image.alt))).toBe(true);
    expect(addedPhotos.every((image) => /winter/i.test(image.alt))).toBe(true);
    expect(addedPhotos.every((image) => /local/i.test(image.alt))).toBe(true);
    expect(addedDescriptions).toMatch(/Métro/i);
    expect(addedDescriptions).toMatch(/bus station/i);
    expect(addedDescriptions).toMatch(/café/i);
    expect(addedDescriptions).toMatch(/train station/i);
    expect(addedDescriptions).toMatch(/Eiffel Tower/i);
    expect(addedDescriptions).toMatch(/church/i);
    expect(parisAlbum.querySelector('.cover-frame-count')?.textContent).toContain('70 FRAMES');
  });

  it('adds ten tilted early-morning full-figure photos of Ananya with a red Delsey trolley at CDG Airport to Storyline 3', () => {
    const element: HTMLElement = create().nativeElement;
    const parisAlbum = element.querySelector<HTMLElement>('#paris-solo-dream')!;
    const galleryImages = Array.from(
      parisAlbum.querySelectorAll<HTMLImageElement>('.album-photo img'),
    );
    const addedPhotoSources = [
      '/storyline/257-ananya-cdg-morning-terminal-full.jpg',
      '/storyline/258-ananya-cdg-morning-checkin-full.jpg',
      '/storyline/259-ananya-cdg-morning-security-full.jpg',
      '/storyline/260-ananya-cdg-morning-gate-full.jpg',
      '/storyline/261-ananya-cdg-morning-exterior-full.jpg',
      '/storyline/262-ananya-cdg-morning-cdgval-full.jpg',
      '/storyline/263-ananya-cdg-morning-cafe-full.jpg',
      '/storyline/264-ananya-cdg-morning-arrivals-full.jpg',
      '/storyline/265-ananya-cdg-morning-baggage-full.jpg',
      '/storyline/266-ananya-cdg-morning-rerb-full.jpg',
    ];
    const addedPhotos = galleryImages.filter((image) =>
      addedPhotoSources.includes(image.getAttribute('src') ?? ''),
    );
    const addedDescriptions = addedPhotos.map((image) => image.alt).join(' ');

    expect(galleryImages).toHaveLength(70);
    expect(addedPhotos).toHaveLength(10);
    expect(addedPhotos.map((image) => image.getAttribute('src')).sort()).toEqual(
      [...addedPhotoSources].sort(),
    );
    expect(addedPhotos.every((image) => image.alt.includes('Ananya'))).toBe(true);
    expect(addedPhotos.every((image) => /full-figure/i.test(image.alt))).toBe(true);
    expect(addedPhotos.every((image) => /tilted/i.test(image.alt))).toBe(true);
    expect(addedPhotos.every((image) => /winter/i.test(image.alt))).toBe(true);
    expect(addedPhotos.every((image) => /local/i.test(image.alt))).toBe(true);
    expect(addedPhotos.every((image) => /early-morning/i.test(image.alt))).toBe(true);
    expect(addedPhotos.every((image) => /CDG Airport/i.test(image.alt))).toBe(true);
    expect(addedPhotos.every((image) => /red Delsey Paris cabin trolley/i.test(image.alt))).toBe(
      true,
    );
    expect(parisAlbum.querySelector('.cover-frame-count')?.textContent).toContain('70 FRAMES');
  });

  it('removes the requested picture IDs from Storyline 3', () => {
    const element: HTMLElement = create().nativeElement;
    const parisAlbum = element.querySelector<HTMLElement>('#paris-solo-dream')!;
    const galleryImages = Array.from(
      parisAlbum.querySelectorAll<HTMLImageElement>('.album-photo img'),
    );
    // IDs refer to the numbered frames in the Paris album before removal (cover is 1).
    const removedPictureSources = [
      '/storyline/07-ananya-cafe.jpg', // 3
      '/storyline/08-ananya-montmartre.jpg', // 4
      '/storyline/199-ananya-paris-macro-croissant.jpg', // 7
      '/storyline/206-ananya-paris-bookstore-portrait.jpg', // 14
    ];

    expect(galleryImages).toHaveLength(70);
    expect(
      removedPictureSources.every(
        (src) => !galleryImages.some((image) => image.getAttribute('src') === src),
      ),
    ).toBe(true);
    expect(parisAlbum.querySelector('.cover-frame-count')?.textContent).toContain('70 FRAMES');
  });

  it('keeps the Storyline 6 cover and shuffles the remaining photo order', () => {
    const element: HTMLElement = create().nativeElement;
    const londonAlbum = element.querySelector<HTMLElement>('#london-wedding-revisited')!;
    const coverSource = londonAlbum
      .querySelector<HTMLImageElement>('.cover-photo-button img')
      ?.getAttribute('src');
    const gallerySources = Array.from(
      londonAlbum.querySelectorAll<HTMLImageElement>('.album-photo img'),
    ).map((image) => image.getAttribute('src'));

    expect(coverSource).toBe('/storyline/17-helen-james-london-registry.jpg');
    expect(gallerySources).toHaveLength(73);
    expect(gallerySources[0]).toBe(coverSource);
    expect(new Set(gallerySources).size).toBe(73);
    expect(gallerySources.slice(1, 5)).not.toEqual([
      '/storyline/18-helen-james-london-register.jpg',
      '/storyline/19-helen-james-london-reception.jpg',
      '/storyline/20-helen-james-london-thames.jpg',
      '/storyline/37-helen-james-london-confetti.jpg',
    ]);
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

    expect(galleryImages).toHaveLength(73);
    expect(
      removedPictureSources.every(
        (src) => !galleryImages.some((image) => image.getAttribute('src') === src),
      ),
    ).toBe(true);
    expect(londonAlbum.querySelector('.cover-frame-count')?.textContent).toContain('73 FRAMES');
  });

  it('adds ten mobile-camera wedding photos with matching outfits and family moments to Storyline 6', () => {
    const element: HTMLElement = create().nativeElement;
    const londonAlbum = element.querySelector<HTMLElement>('#london-wedding-revisited')!;
    const galleryImages = Array.from(
      londonAlbum.querySelectorAll<HTMLImageElement>('.album-photo img'),
    );
    const addedPhotoSources = [
      '/storyline/97-helen-james-mobile-family-registry.jpg',
      '/storyline/98-helen-mother-bride-mobile-portrait.jpg',
      '/storyline/99-helen-james-wedding-rings-mobile-macro.jpg',
      '/storyline/100-helen-james-parents-breakfast-mobile-candid.jpg',
      '/storyline/101-helen-james-registry-room-mobile-wide-angle.jpg',
      '/storyline/102-helen-james-mobile-couple-portrait.jpg',
      '/storyline/103-helen-james-father-boutonniere-mobile-portrait.jpg',
      '/storyline/104-helen-james-family-registry-wide-phone.jpg',
      '/storyline/105-helen-james-bouquet-mobile-macro.jpg',
      '/storyline/106-helen-james-parents-mobile-group-selfie.jpg',
    ];
    const addedPhotos = galleryImages.filter((image) =>
      addedPhotoSources.includes(image.getAttribute('src') ?? ''),
    );
    const addedDescriptions = addedPhotos.map((image) => image.alt).join(' ');

    expect(addedPhotos).toHaveLength(10);
    expect(addedPhotos.map((image) => image.getAttribute('src')).sort()).toEqual(
      [...addedPhotoSources].sort(),
    );
    expect(addedPhotos.every((image) => image.alt.includes('Helen'))).toBe(true);
    expect(addedDescriptions).toMatch(/mobile|smartphone|phone/i);
    expect(addedDescriptions).toMatch(/macro/i);
    expect(addedDescriptions).toMatch(/portrait/i);
    expect(addedDescriptions).toMatch(/wide-angle/i);
    expect(addedDescriptions).toMatch(/selfie/i);
    expect(addedDescriptions).toMatch(/parents/i);
    expect(addedDescriptions).toMatch(/mother/i);
    expect(addedDescriptions).toMatch(/father/i);
    expect(londonAlbum.querySelector('.cover-frame-count')?.textContent).toContain('73 FRAMES');
  });

  it('adds ten black-and-white mobile photos with varied wedding framing to Storyline 6', () => {
    const element: HTMLElement = create().nativeElement;
    const londonAlbum = element.querySelector<HTMLElement>('#london-wedding-revisited')!;
    const galleryImages = Array.from(
      londonAlbum.querySelectorAll<HTMLImageElement>('.album-photo img'),
    );
    const blackAndWhiteSources = [
      '/storyline/107-helen-james-black-white-mobile-family-wide.jpg',
      '/storyline/108-helen-mother-bride-black-white-phone-portrait.jpg',
      '/storyline/109-helen-james-wedding-rings-bw-phone-macro.jpg',
      '/storyline/110-helen-james-parents-wedding-breakfast-bw.jpg',
      '/storyline/111-helen-james-registry-room-bw-wide-phone.jpg',
      '/storyline/112-helen-james-black-white-mobile-close-portrait.jpg',
      '/storyline/113-helen-james-father-bw-mobile-wedding-moment.jpg',
      '/storyline/114-helen-james-black-white-registry-exit-wide.jpg',
      '/storyline/115-helen-james-wedding-details-bw-phone-macro.jpg',
      '/storyline/116-helen-james-parents-black-white-phone-candid.jpg',
    ];
    const blackAndWhitePhotos = galleryImages.filter((image) =>
      blackAndWhiteSources.includes(image.getAttribute('src') ?? ''),
    );
    const descriptions = blackAndWhitePhotos.map((image) => image.alt).join(' ');

    expect(blackAndWhitePhotos).toHaveLength(10);
    expect(blackAndWhitePhotos.map((image) => image.getAttribute('src')).sort()).toEqual(
      [...blackAndWhiteSources].sort(),
    );
    expect(blackAndWhitePhotos.every((image) => /black-and-white/i.test(image.alt))).toBe(true);
    expect(blackAndWhitePhotos.every((image) => /mobile|smartphone|phone/i.test(image.alt))).toBe(
      true,
    );
    expect(blackAndWhitePhotos.every((image) => image.alt.includes('Helen'))).toBe(true);
    expect(descriptions).toMatch(/macro/i);
    expect(descriptions).toMatch(/portrait/i);
    expect(descriptions).toMatch(/wide-angle/i);
    expect(descriptions).toMatch(/parents/i);
    expect(londonAlbum.querySelector('.cover-frame-count')?.textContent).toContain('73 FRAMES');
  });

  it('keeps nine of the ten mobile-camera birthday photos with matching outfits and friends moments in Storyline 7', () => {
    const element: HTMLElement = create().nativeElement;
    const viennaAlbum = element.querySelector<HTMLElement>('#vienna-birthday-missed')!;
    const galleryImages = Array.from(
      viennaAlbum.querySelectorAll<HTMLImageElement>('.album-photo img'),
    );
    const addedPhotoSources = [
      '/storyline/117-clara-vienna-birthday-cake-mobile-macro.jpg',
      '/storyline/118-clara-vienna-birthday-portrait-mobile.jpg',
      '/storyline/119-clara-vienna-birthday-wide-mobile.jpg',
      '/storyline/120-clara-vienna-friends-group-selfie-mobile.jpg',
      '/storyline/121-clara-vienna-birthday-over-shoulder-mobile.jpg',
      '/storyline/122-clara-vienna-friends-street-wide-mobile.jpg',
      '/storyline/123-clara-vienna-toast-hands-mobile-macro.jpg',
      '/storyline/124-clara-vienna-friends-portrait-mobile.jpg',
      '/storyline/125-clara-vienna-birthday-laugh-mobile.jpg',
      '/storyline/126-clara-vienna-friends-night-portrait-mobile.jpg',
    ];
    // Frames removed from this batch when the requested picture IDs were deleted.
    const removedPhotoSources = [
      '/storyline/122-clara-vienna-friends-street-wide-mobile.jpg', // was frame 10
    ];
    const retainedPhotoSources = addedPhotoSources.filter(
      (src) => !removedPhotoSources.includes(src),
    );
    const addedPhotos = galleryImages.filter((image) =>
      addedPhotoSources.includes(image.getAttribute('src') ?? ''),
    );
    const addedDescriptions = addedPhotos.map((image) => image.alt).join(' ');

    expect(galleryImages).toHaveLength(74);
    expect(addedPhotos).toHaveLength(9);
    expect(addedPhotos.map((image) => image.getAttribute('src')).sort()).toEqual(
      [...retainedPhotoSources].sort(),
    );
    expect(addedPhotos.every((image) => image.alt.includes('Clara'))).toBe(true);
    expect(addedPhotos.every((image) => /mobile/i.test(image.alt))).toBe(true);
    expect(addedDescriptions).toMatch(/macro/i);
    expect(addedDescriptions).toMatch(/portrait/i);
    expect(addedDescriptions).toMatch(/wide-angle/i);
    expect(addedDescriptions).toMatch(/selfie/i);
    expect(addedDescriptions).toMatch(/friends/i);
    expect(viennaAlbum.querySelector('.cover-frame-count')?.textContent).toContain('74 FRAMES');
  });

  it('keeps nine of the ten tilted macro-style solo and friends photos in Storyline 7', () => {
    const element: HTMLElement = create().nativeElement;
    const viennaAlbum = element.querySelector<HTMLElement>('#vienna-birthday-missed')!;
    const galleryImages = Array.from(
      viennaAlbum.querySelectorAll<HTMLImageElement>('.album-photo img'),
    );
    const addedPhotoSources = [
      '/storyline/127-clara-vienna-solo-mobile-macro-front.jpg',
      '/storyline/128-clara-vienna-solo-mobile-macro-profile.jpg',
      '/storyline/129-clara-vienna-solo-mobile-over-shoulder.jpg',
      '/storyline/130-clara-vienna-solo-mobile-low-angle-laugh.jpg',
      '/storyline/131-clara-vienna-solo-mobile-awkward-crop.jpg',
      '/storyline/132-clara-vienna-friends-mobile-cheek-laugh.jpg',
      '/storyline/133-clara-vienna-friends-mobile-huddle-crop.jpg',
      '/storyline/134-clara-vienna-friends-mobile-toast-low.jpg',
      '/storyline/135-clara-vienna-friends-mobile-street-walk.jpg',
      '/storyline/136-clara-vienna-friends-mobile-night-hug.jpg',
    ];
    // Frames removed from this batch when the requested picture IDs were deleted.
    const removedPhotoSources = [
      '/storyline/136-clara-vienna-friends-mobile-night-hug.jpg', // was frame 24
    ];
    const retainedPhotoSources = addedPhotoSources.filter(
      (src) => !removedPhotoSources.includes(src),
    );
    const addedPhotos = galleryImages.filter((image) =>
      addedPhotoSources.includes(image.getAttribute('src') ?? ''),
    );
    const addedDescriptions = addedPhotos.map((image) => image.alt).join(' ');

    expect(galleryImages).toHaveLength(74);
    expect(addedPhotos).toHaveLength(9);
    expect(addedPhotos.map((image) => image.getAttribute('src')).sort()).toEqual(
      [...retainedPhotoSources].sort(),
    );
    expect(addedPhotos.every((image) => image.alt.includes('Clara'))).toBe(true);
    expect(addedPhotos.every((image) => /mobile/i.test(image.alt))).toBe(true);
    expect(addedPhotos.every((image) => /tilted/i.test(image.alt))).toBe(true);
    expect(addedDescriptions).toMatch(/macro/i);
    expect(addedDescriptions).toMatch(/portrait/i);
    expect(addedDescriptions).toMatch(/friends/i);
    expect(viennaAlbum.querySelector('.cover-frame-count')?.textContent).toContain('74 FRAMES');
  });

  it('keeps seven of the ten tilted macro-style solos and girlfriends moments in Storyline 7', () => {
    const element: HTMLElement = create().nativeElement;
    const viennaAlbum = element.querySelector<HTMLElement>('#vienna-birthday-missed')!;
    const galleryImages = Array.from(
      viennaAlbum.querySelectorAll<HTMLImageElement>('.album-photo img'),
    );
    const addedPhotoSources = [
      '/storyline/137-clara-vienna-solo-mobile-macro-smile.jpg',
      '/storyline/138-clara-vienna-solo-mobile-macro-three-quarter.jpg',
      '/storyline/139-clara-vienna-solo-mobile-macro-back-view.jpg',
      '/storyline/140-clara-vienna-solo-mobile-macro-candle-glow.jpg',
      '/storyline/141-clara-vienna-solo-mobile-macro-window.jpg',
      '/storyline/142-clara-vienna-girlfriends-mobile-selfie.jpg',
      '/storyline/143-clara-vienna-girlfriends-mobile-embrace.jpg',
      '/storyline/144-clara-vienna-girlfriends-mobile-toast-macro.jpg',
      '/storyline/145-clara-vienna-girlfriends-mobile-street-arm.jpg',
      '/storyline/146-clara-vienna-girlfriends-mobile-night-huddle.jpg',
    ];
    // Frames removed from this batch when the requested picture IDs were deleted.
    const removedPhotoSources = [
      '/storyline/137-clara-vienna-solo-mobile-macro-smile.jpg', // was frame 25
      '/storyline/138-clara-vienna-solo-mobile-macro-three-quarter.jpg', // was frame 26
      '/storyline/145-clara-vienna-girlfriends-mobile-street-arm.jpg', // was frame 33
    ];
    const retainedPhotoSources = addedPhotoSources.filter(
      (src) => !removedPhotoSources.includes(src),
    );
    const addedPhotos = galleryImages.filter((image) =>
      addedPhotoSources.includes(image.getAttribute('src') ?? ''),
    );
    const addedDescriptions = addedPhotos.map((image) => image.alt).join(' ');

    expect(galleryImages).toHaveLength(74);
    expect(addedPhotos).toHaveLength(7);
    expect(addedPhotos.map((image) => image.getAttribute('src')).sort()).toEqual(
      [...retainedPhotoSources].sort(),
    );
    expect(addedPhotos.every((image) => image.alt.includes('Clara'))).toBe(true);
    expect(addedPhotos.every((image) => /mobile/i.test(image.alt))).toBe(true);
    expect(addedPhotos.every((image) => /tilted/i.test(image.alt))).toBe(true);
    expect(addedDescriptions).toMatch(/macro/i);
    expect(addedDescriptions).toMatch(/portrait/i);
    expect(addedDescriptions).toMatch(/female friends/i);
    expect(viennaAlbum.querySelector('.cover-frame-count')?.textContent).toContain('74 FRAMES');
  });

  it('keeps eight of the ten tilted candid talking portraits of Clara in Storyline 7', () => {
    const element: HTMLElement = create().nativeElement;
    const viennaAlbum = element.querySelector<HTMLElement>('#vienna-birthday-missed')!;
    const galleryImages = Array.from(
      viennaAlbum.querySelectorAll<HTMLImageElement>('.album-photo img'),
    );
    const addedPhotoSources = [
      '/storyline/147-clara-vienna-solo-mobile-candid-talking.jpg',
      '/storyline/148-clara-vienna-solo-mobile-candid-gesture.jpg',
      '/storyline/149-clara-vienna-solo-mobile-candid-profile-talk.jpg',
      '/storyline/150-clara-vienna-solo-mobile-candid-across-table.jpg',
      '/storyline/151-clara-vienna-solo-mobile-candid-low-story.jpg',
      '/storyline/152-clara-vienna-solo-mobile-candid-chin-hand.jpg',
      '/storyline/153-clara-vienna-solo-mobile-candid-lane-talk.jpg',
      '/storyline/154-clara-vienna-solo-mobile-candid-night-laugh.jpg',
      '/storyline/155-clara-vienna-solo-mobile-candid-lean-cake.jpg',
      '/storyline/156-clara-vienna-solo-mobile-candid-window-talk.jpg',
    ];
    // Frames removed from this batch when the requested picture IDs were deleted.
    const removedPhotoSources = [
      '/storyline/148-clara-vienna-solo-mobile-candid-gesture.jpg', // was frame 36
      '/storyline/154-clara-vienna-solo-mobile-candid-night-laugh.jpg', // was frame 42
    ];
    const retainedPhotoSources = addedPhotoSources.filter(
      (src) => !removedPhotoSources.includes(src),
    );
    const addedPhotos = galleryImages.filter((image) =>
      addedPhotoSources.includes(image.getAttribute('src') ?? ''),
    );
    const addedDescriptions = addedPhotos.map((image) => image.alt).join(' ');

    expect(galleryImages).toHaveLength(74);
    expect(addedPhotos).toHaveLength(8);
    expect(addedPhotos.map((image) => image.getAttribute('src')).sort()).toEqual(
      [...retainedPhotoSources].sort(),
    );
    expect(addedPhotos.every((image) => image.alt.includes('Clara'))).toBe(true);
    expect(addedPhotos.every((image) => /mobile/i.test(image.alt))).toBe(true);
    expect(addedPhotos.every((image) => /tilted/i.test(image.alt))).toBe(true);
    expect(addedPhotos.every((image) => /candid/i.test(image.alt))).toBe(true);
    expect(addedDescriptions).toMatch(/macro/i);
    expect(addedDescriptions).toMatch(/portrait/i);
    expect(addedDescriptions).toMatch(/talk/i);
    expect(viennaAlbum.querySelector('.cover-frame-count')?.textContent).toContain('74 FRAMES');
  });

  it('keeps eight of the ten tilted dinner and food macro photos in Storyline 7', () => {
    const element: HTMLElement = create().nativeElement;
    const viennaAlbum = element.querySelector<HTMLElement>('#vienna-birthday-missed')!;
    const galleryImages = Array.from(
      viennaAlbum.querySelectorAll<HTMLImageElement>('.album-photo img'),
    );
    const addedPhotoSources = [
      '/storyline/157-clara-vienna-dinner-mobile-macro-wine-pour.jpg',
      '/storyline/158-clara-vienna-dinner-mobile-macro-cake-slice.jpg',
      '/storyline/159-clara-vienna-dinner-mobile-candid-first-bite.jpg',
      '/storyline/160-clara-vienna-dinner-mobile-tilted-table-spread.jpg',
      '/storyline/161-clara-vienna-dinner-mobile-macro-serving-hands.jpg',
      '/storyline/162-clara-vienna-dinner-mobile-macro-glasses-clink.jpg',
      '/storyline/163-clara-vienna-dinner-mobile-macro-dessert-clara.jpg',
      '/storyline/164-clara-vienna-dinner-mobile-candid-pasta-laugh.jpg',
      '/storyline/165-clara-vienna-dinner-mobile-candid-share-bite.jpg',
      '/storyline/166-clara-vienna-dinner-mobile-macro-after-coffee.jpg',
    ];
    // Frames removed from this batch when the requested picture IDs were deleted.
    const removedPhotoSources = [
      '/storyline/157-clara-vienna-dinner-mobile-macro-wine-pour.jpg', // was frame 45
      '/storyline/162-clara-vienna-dinner-mobile-macro-glasses-clink.jpg', // was frame 50
    ];
    const retainedPhotoSources = addedPhotoSources.filter(
      (src) => !removedPhotoSources.includes(src),
    );
    const addedPhotos = galleryImages.filter((image) =>
      addedPhotoSources.includes(image.getAttribute('src') ?? ''),
    );
    const addedDescriptions = addedPhotos.map((image) => image.alt).join(' ');

    expect(galleryImages).toHaveLength(74);
    expect(addedPhotos).toHaveLength(8);
    expect(addedPhotos.map((image) => image.getAttribute('src')).sort()).toEqual(
      [...retainedPhotoSources].sort(),
    );
    expect(addedPhotos.every((image) => image.alt.includes('Clara'))).toBe(true);
    expect(addedPhotos.every((image) => /mobile/i.test(image.alt))).toBe(true);
    expect(addedPhotos.every((image) => /tilted/i.test(image.alt))).toBe(true);
    expect(addedDescriptions).toMatch(/macro/i);
    expect(addedDescriptions).toMatch(/candid/i);
    expect(addedDescriptions).toMatch(/dinner/i);
    expect(addedDescriptions).toMatch(/cake|pasta|wine|espresso/i);
    expect(viennaAlbum.querySelector('.cover-frame-count')?.textContent).toContain('74 FRAMES');
  });

  it('adds ten tilted cake-cutting celebration photos to Storyline 7', () => {
    const element: HTMLElement = create().nativeElement;
    const viennaAlbum = element.querySelector<HTMLElement>('#vienna-birthday-missed')!;
    const galleryImages = Array.from(
      viennaAlbum.querySelectorAll<HTMLImageElement>('.album-photo img'),
    );
    const addedPhotoSources = [
      '/storyline/167-clara-vienna-cake-mobile-macro-cut.jpg',
      '/storyline/168-clara-vienna-cake-mobile-macro-hands-knife.jpg',
      '/storyline/169-clara-vienna-cake-mobile-macro-candles-blow.jpg',
      '/storyline/170-clara-vienna-cake-mobile-portrait-plate.jpg',
      '/storyline/171-clara-vienna-cake-mobile-portrait-cheer.jpg',
      '/storyline/172-clara-vienna-cake-mobile-portrait-clap.jpg',
      '/storyline/173-clara-vienna-cake-mobile-wide-cheer.jpg',
      '/storyline/174-clara-vienna-cake-mobile-wide-room.jpg',
      '/storyline/175-clara-vienna-cake-mobile-wide-toast.jpg',
      '/storyline/176-clara-vienna-cake-mobile-candid-first-slice.jpg',
    ];
    const addedPhotos = galleryImages.filter((image) =>
      addedPhotoSources.includes(image.getAttribute('src') ?? ''),
    );
    const addedDescriptions = addedPhotos.map((image) => image.alt).join(' ');

    expect(galleryImages).toHaveLength(74);
    expect(addedPhotos).toHaveLength(10);
    expect(addedPhotos.map((image) => image.getAttribute('src')).sort()).toEqual(
      [...addedPhotoSources].sort(),
    );
    expect(addedPhotos.every((image) => image.alt.includes('Clara'))).toBe(true);
    expect(addedPhotos.every((image) => /mobile/i.test(image.alt))).toBe(true);
    expect(addedPhotos.every((image) => /tilted/i.test(image.alt))).toBe(true);
    expect(addedDescriptions).toMatch(/macro/i);
    expect(addedDescriptions).toMatch(/portrait/i);
    expect(addedDescriptions).toMatch(/wide-angle/i);
    expect(addedDescriptions).toMatch(/cake/i);
    expect(viennaAlbum.querySelector('.cover-frame-count')?.textContent).toContain('74 FRAMES');
  });

  it('adds ten tilted standing portraits of Clara around the restaurant to Storyline 7', () => {
    const element: HTMLElement = create().nativeElement;
    const viennaAlbum = element.querySelector<HTMLElement>('#vienna-birthday-missed')!;
    const galleryImages = Array.from(
      viennaAlbum.querySelectorAll<HTMLImageElement>('.album-photo img'),
    );
    const addedPhotoSources = [
      '/storyline/177-clara-vienna-standing-mobile-macro-window.jpg',
      '/storyline/178-clara-vienna-standing-mobile-portrait-coatrack.jpg',
      '/storyline/179-clara-vienna-standing-mobile-macro-archway.jpg',
      '/storyline/180-clara-vienna-standing-mobile-portrait-bar.jpg',
      '/storyline/181-clara-vienna-standing-mobile-macro-doorway.jpg',
      '/storyline/182-clara-vienna-standing-mobile-portrait-table.jpg',
      '/storyline/183-clara-vienna-standing-mobile-macro-hair.jpg',
      '/storyline/184-clara-vienna-standing-mobile-portrait-hallway.jpg',
      '/storyline/185-clara-vienna-standing-mobile-macro-wineglass.jpg',
      '/storyline/186-clara-vienna-standing-mobile-portrait-dessert.jpg',
    ];
    const addedPhotos = galleryImages.filter((image) =>
      addedPhotoSources.includes(image.getAttribute('src') ?? ''),
    );
    const addedDescriptions = addedPhotos.map((image) => image.alt).join(' ');

    expect(galleryImages).toHaveLength(74);
    expect(addedPhotos).toHaveLength(10);
    expect(addedPhotos.map((image) => image.getAttribute('src')).sort()).toEqual(
      [...addedPhotoSources].sort(),
    );
    expect(addedPhotos.every((image) => image.alt.includes('Clara'))).toBe(true);
    expect(addedPhotos.every((image) => /mobile/i.test(image.alt))).toBe(true);
    expect(addedPhotos.every((image) => /tilted/i.test(image.alt))).toBe(true);
    expect(addedPhotos.every((image) => /standing/i.test(image.alt))).toBe(true);
    expect(addedDescriptions).toMatch(/macro/i);
    expect(addedDescriptions).toMatch(/portrait/i);
    expect(addedDescriptions).toMatch(/candid/i);
    expect(viennaAlbum.querySelector('.cover-frame-count')?.textContent).toContain('74 FRAMES');
  });

  it('adds ten tilted friends pose-group portraits to Storyline 7', () => {
    const element: HTMLElement = create().nativeElement;
    const viennaAlbum = element.querySelector<HTMLElement>('#vienna-birthday-missed')!;
    const galleryImages = Array.from(
      viennaAlbum.querySelectorAll<HTMLImageElement>('.album-photo img'),
    );
    const addedPhotoSources = [
      '/storyline/187-clara-vienna-posegroup-mobile-funny-faces.jpg',
      '/storyline/188-clara-vienna-posegroup-mobile-serious-bar.jpg',
      '/storyline/189-clara-vienna-posegroup-mobile-happy-window.jpg',
      '/storyline/190-clara-vienna-posegroup-mobile-funny-photobomb.jpg',
      '/storyline/191-clara-vienna-posegroup-mobile-serious-archway.jpg',
      '/storyline/192-clara-vienna-posegroup-mobile-happy-jump.jpg',
      '/storyline/193-clara-vienna-posegroup-mobile-funny-cakesteal.jpg',
      '/storyline/194-clara-vienna-posegroup-mobile-serious-lineup.jpg',
      '/storyline/195-clara-vienna-posegroup-mobile-happy-hug.jpg',
      '/storyline/196-clara-vienna-posegroup-mobile-funny-toast.jpg',
    ];
    const addedPhotos = galleryImages.filter((image) =>
      addedPhotoSources.includes(image.getAttribute('src') ?? ''),
    );
    const addedDescriptions = addedPhotos.map((image) => image.alt).join(' ');

    expect(galleryImages).toHaveLength(74);
    expect(addedPhotos).toHaveLength(10);
    expect(addedPhotos.map((image) => image.getAttribute('src')).sort()).toEqual(
      [...addedPhotoSources].sort(),
    );
    expect(addedPhotos.every((image) => image.alt.includes('Clara'))).toBe(true);
    expect(addedPhotos.every((image) => /mobile/i.test(image.alt))).toBe(true);
    expect(addedPhotos.every((image) => /tilted/i.test(image.alt))).toBe(true);
    expect(addedPhotos.every((image) => /friends/i.test(image.alt))).toBe(true);
    expect(addedDescriptions).toMatch(/portrait/i);
    expect(addedDescriptions).toMatch(/candid/i);
    expect(addedDescriptions).toMatch(/funny/i);
    expect(addedDescriptions).toMatch(/serious/i);
    expect(addedDescriptions).toMatch(/happy/i);
    expect(viennaAlbum.querySelector('.cover-frame-count')?.textContent).toContain('74 FRAMES');
  });

  it('keeps the Storyline 7 cover and shuffles the remaining photo order', () => {
    const element: HTMLElement = create().nativeElement;
    const viennaAlbum = element.querySelector<HTMLElement>('#vienna-birthday-missed')!;
    const coverSource = viennaAlbum
      .querySelector<HTMLImageElement>('.cover-photo-button img')
      ?.getAttribute('src');
    const gallerySources = Array.from(
      viennaAlbum.querySelectorAll<HTMLImageElement>('.album-photo img'),
    ).map((image) => image.getAttribute('src'));

    expect(coverSource).toBe('/storyline/21-clara-vienna-birthday-dinner.jpg');
    expect(gallerySources).toHaveLength(74);
    expect(gallerySources[0]).toBe(coverSource);
    expect(new Set(gallerySources).size).toBe(74);
    expect(gallerySources.slice(1, 5)).not.toEqual([
      '/storyline/22-clara-vienna-birthday-candles.jpg',
      '/storyline/23-clara-vienna-friends.jpg',
      '/storyline/24-clara-vienna-toast.jpg',
      '/storyline/117-clara-vienna-birthday-cake-mobile-macro.jpg',
    ]);
    const frameNumbers = gallerySources.map((src) => Number(src?.split('/').pop()?.split('-')[0]));
    expect(frameNumbers).not.toEqual([...frameNumbers].sort((a, b) => a - b));
    expect(
      Array.from(viennaAlbum.querySelectorAll('.photo-number')).map((number) =>
        number.textContent?.trim(),
      ),
    ).toEqual(Array.from({ length: 74 }, (_, index) => String(index + 1).padStart(2, '0')));
  });

  it('removes the requested picture IDs from Storyline 7', () => {
    const element: HTMLElement = create().nativeElement;
    const viennaAlbum = element.querySelector<HTMLElement>('#vienna-birthday-missed')!;
    const galleryImages = Array.from(
      viennaAlbum.querySelectorAll<HTMLImageElement>('.album-photo img'),
    );
    // IDs refer to the numbered frames in the Vienna album before removal (cover is 1).
    const removedPictureSources = [
      '/storyline/23-clara-vienna-friends.jpg', // 3
      '/storyline/122-clara-vienna-friends-street-wide-mobile.jpg', // 10
      '/storyline/136-clara-vienna-friends-mobile-night-hug.jpg', // 24
      '/storyline/137-clara-vienna-solo-mobile-macro-smile.jpg', // 25
      '/storyline/138-clara-vienna-solo-mobile-macro-three-quarter.jpg', // 26
      '/storyline/145-clara-vienna-girlfriends-mobile-street-arm.jpg', // 33
      '/storyline/148-clara-vienna-solo-mobile-candid-gesture.jpg', // 36
      '/storyline/154-clara-vienna-solo-mobile-candid-night-laugh.jpg', // 42
      '/storyline/157-clara-vienna-dinner-mobile-macro-wine-pour.jpg', // 45
      '/storyline/162-clara-vienna-dinner-mobile-macro-glasses-clink.jpg', // 50
    ];

    expect(galleryImages).toHaveLength(74);
    expect(
      removedPictureSources.every(
        (src) => !galleryImages.some((image) => image.getAttribute('src') === src),
      ),
    ).toBe(true);
    expect(viennaAlbum.querySelector('.cover-frame-count')?.textContent).toContain('74 FRAMES');
    expect(viennaAlbum.textContent).toContain('seventy-four casual mobile-style snapshots');
  });

  it('keeps Helen’s existing solo portrait batch in Storyline 6', () => {
    const element: HTMLElement = create().nativeElement;
    const londonAlbum = element.querySelector<HTMLElement>('#london-wedding-revisited')!;
    const galleryImages = Array.from(
      londonAlbum.querySelectorAll<HTMLImageElement>('.album-photo img'),
    );
    const soloPortraitSources = [
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
    ];
    const soloPortraits = galleryImages.filter((image) =>
      soloPortraitSources.includes(image.getAttribute('src') ?? ''),
    );

    expect(galleryImages).toHaveLength(73);
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
    expect(soloPortraits).toHaveLength(10);
    expect(soloPortraits.map((image) => image.getAttribute('src')).sort()).toEqual(
      [...soloPortraitSources].sort(),
    );
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
    ).toEqual(Array.from({ length: 73 }, (_, index) => String(index + 1).padStart(2, '0')));
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

    expect(galleryImages).toHaveLength(73);
    expect(couplePortraits.map((image) => image.getAttribute('src')).sort()).toEqual(
      [
        '/storyline/77-helen-james-wedding-mobile-macro-candid-laugh.jpg',
        '/storyline/79-helen-james-wedding-mobile-macro-over-shoulder.jpg',
        '/storyline/80-helen-james-wedding-mobile-macro-high-angle.jpg',
        '/storyline/82-helen-james-wedding-mobile-macro-forehead-kiss.jpg',
        '/storyline/83-helen-james-wedding-mobile-macro-laughing-selfie.jpg',
        '/storyline/84-helen-james-wedding-mobile-macro-back-view.jpg',
        '/storyline/85-helen-james-wedding-mobile-macro-thames-profile.jpg',
        '/storyline/86-helen-james-wedding-mobile-macro-courtyard-embrace.jpg',
      ].sort(),
    );
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
    const familyPortraits = galleryImages.filter((image) =>
      /\/(?:8[7-9]|9[0-6])-helen-wedding-mobile-macro-/.test(image.getAttribute('src') ?? ''),
    );

    expect(galleryImages).toHaveLength(73);
    expect(familyPortraits.map((image) => image.getAttribute('src')).sort()).toEqual(
      [
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
      ].sort(),
    );
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
    const photoButtons = Array.from(
      londonAlbum.querySelectorAll<HTMLButtonElement>('.photo-open-button'),
    );
    const selectedSource = '/storyline/116-helen-james-parents-black-white-phone-candid.jpg';
    const selectedPhotoIndex = galleryImages.findIndex(
      (image) => image.getAttribute('src') === selectedSource,
    );
    expect(selectedPhotoIndex).toBeGreaterThanOrEqual(0);
    photoButtons[selectedPhotoIndex].click();
    fixture.detectChanges();

    expect(element.querySelector('.story-lightbox figure img')?.getAttribute('src')).toBe(
      selectedSource,
    );
    expect(element.querySelector('.lightbox-position')?.textContent).toContain(
      `${selectedPhotoIndex + 1} / 73`,
    );
    expect(element.querySelector('.lightbox-arrow.previous')?.getAttribute('aria-label')).toBe(
      'Previous photo in this story',
    );
    expect(element.querySelector('.lightbox-arrow.next')?.getAttribute('aria-label')).toBe(
      'Next photo in this story',
    );

    const previousSource =
      selectedPhotoIndex === 0
        ? galleryImages[galleryImages.length - 1].getAttribute('src')
        : galleryImages[selectedPhotoIndex - 1].getAttribute('src');
    (element.querySelector('.lightbox-arrow.previous') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(element.querySelector('.story-lightbox figure img')?.getAttribute('src')).toBe(
      previousSource,
    );
    expect(element.querySelector('.lightbox-position')?.textContent).toContain(
      `${selectedPhotoIndex === 0 ? galleryImages.length : selectedPhotoIndex} / 73`,
    );

    (element.querySelector('.lightbox-arrow.next') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(element.querySelector('.story-lightbox figure img')?.getAttribute('src')).toBe(
      selectedSource,
    );
    (element.querySelector('.lightbox-arrow.next') as HTMLButtonElement).click();
    fixture.detectChanges();
    const nextSource =
      selectedPhotoIndex === galleryImages.length - 1
        ? galleryImages[0].getAttribute('src')
        : galleryImages[selectedPhotoIndex + 1].getAttribute('src');
    expect(element.querySelector('.story-lightbox figure img')?.getAttribute('src')).toBe(
      nextSource,
    );
    expect(element.querySelector('.lightbox-position')?.textContent).toContain(
      `${selectedPhotoIndex === galleryImages.length - 1 ? 1 : selectedPhotoIndex + 2} / 73`,
    );
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
    expect(firstContent.querySelector('.story-copy')).toBeTruthy();
    expect(firstContent.querySelector('.story-notes')).toBeTruthy();
    expect(firstContent.querySelector('.story-notes .why-card')).toBeTruthy();
    expect(firstContent.querySelector('.story-notes .story-quote')).toBeTruthy();
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
      expect(album.querySelector('.cover-photo-hint')?.textContent).toContain('EXTEND STORYLINE');
      expect(album.querySelector('.cover-photo-hint')?.textContent).not.toContain(
        'AI ILLUSTRATION',
      );
      expect(album.querySelector('.story-cover h3')?.textContent?.trim()).toBeTruthy();
      expect(album.querySelector('.cover-location-name')?.textContent?.trim()).toBeTruthy();
      expect(album.querySelector('.cover-people')?.textContent?.trim()).toBeTruthy();
    }

    expect(albums[0].querySelector('.story-cover')?.textContent).toContain(
      'The wedding album with a few pages left blank',
    );
    expect(albums[0].querySelector('.cover-location-name')?.textContent).toContain('London');
    expect(albums[0].querySelector('.cover-people')?.textContent).toContain('Helen & James');
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

  it('expands a collapsed storyline when the cover area is clicked', () => {
    const fixture = create();
    const element: HTMLElement = fixture.nativeElement;
    const firstAlbum = element.querySelector<HTMLElement>('.story-album')!;
    const coverButton = firstAlbum.querySelector<HTMLButtonElement>('.cover-photo-button')!;
    const layout = firstAlbum.querySelector<HTMLElement>('.album-layout')!;
    const toggle = firstAlbum.querySelector<HTMLButtonElement>('.album-toggle')!;

    expect(layout.hidden).toBe(true);
    expect(coverButton.getAttribute('aria-expanded')).toBe('false');
    coverButton.click();
    fixture.detectChanges();

    expect(layout.hidden).toBe(false);
    expect(coverButton.getAttribute('aria-expanded')).toBe('true');
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    expect(element.querySelector('.story-lightbox')).toBeNull();

    coverButton.click();
    fixture.detectChanges();
    expect(layout.hidden).toBe(false);
  });

  it('opens gallery photos and navigates within the selected story using controls and keyboard', () => {
    const fixture = create();
    const element: HTMLElement = fixture.nativeElement;
    const firstAlbum = element.querySelector<HTMLElement>('#switzerland-honeymoon')!;
    const extendButton = firstAlbum.querySelector<HTMLButtonElement>('.album-toggle')!;
    const photoButtons = firstAlbum.querySelectorAll<HTMLButtonElement>('.photo-open-button');
    const press = (key: string) => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key }));
      fixture.detectChanges();
    };

    extendButton.click();
    fixture.detectChanges();
    photoButtons[2].click();
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

    expect(albums[0].textContent).toContain('London, United Kingdom');
    expect(albums[0].textContent).toContain('old wedding pictures');
    expect(albums[0].textContent).toContain('photographs that truly document it');
    expect(albums[0].textContent).toContain('not restorations or recovered images');

    expect(albums[1].textContent).toContain('Vienna, Austria');
    expect(albums[1].textContent).toContain('COVID restrictions');
    expect(albums[1].textContent).toContain('twenty-fifth birthday');
    expect(albums[1].textContent).toContain('friends');

    expect(albums[2].textContent).toContain('Paris, France');
    expect(albums[2].textContent).toContain('middle-class family');

    expect(albums[3].textContent).toContain('Switzerland');
    expect(albums[3].textContent).toContain('work pressure');

    expect(albums[4].textContent).toContain('Amazon Rainforest');
    expect(albums[4].textContent).toContain('3 men & 2 women');
    expect(albums[4].textContent).toContain('university');

    expect(albums[5].textContent).toContain('Tuscany, Italy');
    expect(albums[5].textContent).toContain('Meera died in an accident');
    expect(albums[5].textContent).toContain('wedding never happened');
    expect(albums[5].textContent).toContain('fictional keepsake');

    expect(albums[6].textContent).toContain('Everest Region, Nepal');
    expect(albums[6].textContent).toContain('Work pressure');
    expect(albums[6].textContent).toContain('solo trek');
    expect(albums[6].textContent).toContain('not evidence that she travelled');
    expect(albums[6].textContent).toContain('not climb a summit');
    expect(albums[6].querySelectorAll('.album-photo img')[0].getAttribute('src')).toBe(
      '/storyline/25-elisabeth-everest-trail.jpg',
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
