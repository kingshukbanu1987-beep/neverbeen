import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { aiModelProfiles } from './ai-model-data';
import { AiModelsPage } from './ai-models';

describe('AiModelsPage', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AiModelsPage],
      providers: [provideRouter([])],
    }).compileComponents();
  });

  it('renders the portfolios in the published order and labels randomized details as illustrative', () => {
    const fixture = TestBed.createComponent(AiModelsPage);
    fixture.detectChanges();

    const element: HTMLElement = fixture.nativeElement;
    const expectedNames = [
      'Fiadh Dara',
      'Nourhan Durrani',
      'Nazanin Maeve Al-Farsi',
      'Sereenah Noorzai',
      'Alisha Bhattacharya',
      'Maeve Anahita',
      'Rozalin El Masry',
      'Ava Amira Gallagher',
      'Banafsheh Saoirse Yazdani',
      'Nirvana Noorzai',
      'Sorcha Golsa MacCarthy',
      'Fatima Sana Hussaini',
      'Zeina Al-Sabbagh',
      'Toulene Arslan',
      'Caoimhe Niloufar Rahimi',
      'Salma Ahmadzai',
      'Nermin Akhundzada',
      'Rasha Fakhoury',
      'Lana Mahvash Kennedy',
      'Donya Caoimhe Yazdani',
      'Priyanka Chatterjee',
      'Fatima Al-Mansoor',
      'Aoife Pahlavi',
      'Amira Bint Tariq Al-Sayed',
      'Aisha Bint Mohammed Al-Husseini',
      "Shirina O'Brien",
      'Tasneem Al-Rifai',
      'Zahra Mahmoud Al-Khatib',
      'Soha Haddad',
      'Ameera Lone',
      'Saoirse Rezaei',
      'Farah Al-Shaar',
      'Florencia Fontana Gatti',
      'Zaynab Jones',
      'Reema Ganguly',
      'Lucía Gomensoro Rossi',
      'Ziba Nazrin',
      'Nour El-Sherif',
      'Soraya Smith',
      'Zeina Al-Atassi',
      'Amina El-Maghraby',
      'Valentina Rodríguez Silva',
    ];

    expect(element.querySelector('h1')?.textContent).toContain('NeverBeen AI Models');
    expect(aiModelProfiles.map((profile) => profile.name)).toEqual(expectedNames);
    expect(aiModelProfiles.map((profile) => profile.order)).toEqual(
      Array.from({ length: expectedNames.length }, (_, index) => index + 1),
    );
    expect(element.querySelectorAll('.model-card').length).toBe(expectedNames.length);
    expect(element.querySelector('.empty-studio')).toBeNull();
    expect(element.querySelector('.profile-data-note')?.textContent).toContain('illustrative');
    expect(aiModelProfiles.every((profile) => profile.illustrative)).toBe(true);

    // The cards follow the data order, not the folder order.
    const cardNames = Array.from(element.querySelectorAll('.model-card h3')).map((heading) =>
      heading.textContent?.trim(),
    );
    expect(cardNames).toEqual(expectedNames);
  });

  it('shows how many photographs each portfolio holds, in large bold type on the cover', () => {
    const fixture = TestBed.createComponent(AiModelsPage);
    fixture.detectChanges();

    const element: HTMLElement = fixture.nativeElement;
    const cards = Array.from(element.querySelectorAll('.model-card'));

    for (const [index, profile] of aiModelProfiles.entries()) {
      const badge = cards[index].querySelector('.card-photo-count');
      expect(badge, `${profile.name} photo count`).toBeTruthy();
      expect(badge?.querySelector('b')?.textContent?.trim()).toBe(String(profile.photos.length));
      expect(badge?.querySelector('i')?.textContent?.trim()).toBe(
        profile.photos.length === 1 ? 'photograph' : 'photographs',
      );
      expect(badge?.getAttribute('aria-label')).toContain(String(profile.photos.length));

      const videoBadge = cards[index].querySelector('.card-video-count');
      expect(videoBadge, `${profile.name} video count`).toBeTruthy();
      expect(videoBadge?.querySelector('b')?.textContent?.trim()).toBe(
        String(profile.videos.length),
      );
      expect(videoBadge?.querySelector('i')?.textContent?.trim()).toBe(
        profile.videos.length === 1 ? 'video' : 'videos',
      );
      expect(videoBadge?.getAttribute('aria-label')).toContain(String(profile.videos.length));
    }
  });

  it('shows a standard availability status and starting price on each model card', () => {
    const fixture = TestBed.createComponent(AiModelsPage);
    fixture.detectChanges();

    const cards = Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll('.model-card'),
    );
    for (const [index, profile] of aiModelProfiles.entries()) {
      const card = cards[index];
      const availability = card.querySelector('.card-availability');
      const expectedLabel = /unavailable|fully booked|not accepting/i.test(profile.availability)
        ? 'Currently Unavailable'
        : /future|looking for|coming soon/i.test(profile.availability)
          ? 'Looking for Future Contract'
          : 'Available for Contract';
      const expectedClass = {
        'Currently Unavailable': 'is-unavailable',
        'Looking for Future Contract': 'is-future',
        'Available for Contract': 'is-available',
      }[expectedLabel];

      expect(availability?.textContent?.trim()).toBe(expectedLabel);
      expect(availability?.classList.contains(expectedClass)).toBe(true);
      expect(card.querySelector('.card-price-label')?.textContent?.trim()).toBe(
        'Starting Price / Photograph',
      );
      expect(card.querySelector('.card-price-value')?.textContent?.trim()).toBe(
        `₹${profile.photoRate.toLocaleString('en-IN')}`,
      );
    }
  });

  it('uses the green, red, and orange availability indicators for the three statuses', () => {
    const [available, unavailable, future] = aiModelProfiles;
    const previousAvailability = [
      available.availability,
      unavailable.availability,
      future.availability,
    ];

    try {
      available.availability = 'Open for bookings';
      unavailable.availability = 'Currently Unavailable';
      future.availability = 'Looking for Future Contract';

      const fixture = TestBed.createComponent(AiModelsPage);
      fixture.detectChanges();
      const cards = Array.from(
        (fixture.nativeElement as HTMLElement).querySelectorAll('.model-card'),
      );

      expect(cards[0].querySelector('.card-availability')?.textContent?.trim()).toBe(
        'Available for Contract',
      );
      expect(cards[0].querySelector('.card-availability')?.classList.contains('is-available')).toBe(
        true,
      );
      expect(cards[1].querySelector('.card-availability')?.textContent?.trim()).toBe(
        'Currently Unavailable',
      );
      expect(
        cards[1].querySelector('.card-availability')?.classList.contains('is-unavailable'),
      ).toBe(true);
      expect(cards[2].querySelector('.card-availability')?.textContent?.trim()).toBe(
        'Looking for Future Contract',
      );
      expect(cards[2].querySelector('.card-availability')?.classList.contains('is-future')).toBe(
        true,
      );
      fixture.destroy();
    } finally {
      [available.availability, unavailable.availability, future.availability] =
        previousAvailability;
    }
  });

  it('publishes a per-photo rate in INR for every model, starting at ₹550', () => {
    for (const profile of aiModelProfiles) {
      expect(profile.photoRate, `${profile.name} photo rate`).toBeGreaterThan(0);
      expect(profile.photoNote).toContain('INR');
    }

    // Rates sit in a tight band around ₹550, with a few individually raised profiles.
    expect(Math.min(...aiModelProfiles.map((profile) => profile.photoRate))).toBe(520);
    expect(Math.max(...aiModelProfiles.map((profile) => profile.photoRate))).toBe(755);
  });

  it('keeps the header to a short, graphic-free title', () => {
    const fixture = TestBed.createComponent(AiModelsPage);
    fixture.detectChanges();

    const element: HTMLElement = fixture.nativeElement;
    const hero = element.querySelector('.studio-hero');

    expect(hero?.querySelector('h1')?.textContent).toContain('NeverBeen AI Models');
    expect(hero?.textContent).toContain('model profiles');
    expect(hero?.textContent).toContain('per photograph');
    // The hero discloses that the models are AI creations, not real people.
    expect(hero?.textContent).toContain('None of the models below exists in reality');
    expect(hero?.textContent).toContain('created using');
    expect(hero?.textContent).toContain('artificial intelligence');

    // No decorative artwork, glow layers or scroll cue in the header.
    for (const selector of [
      '.hero-art',
      '.hero-gridlines',
      '.hero-glow',
      '.scroll-cue',
      '.hero-content',
      '.hero-footer',
    ]) {
      expect(element.querySelector(selector), selector).toBeNull();
    }
  });

  it('renders a designed portrait placeholder when an original cover is not available', () => {
    const fixture = TestBed.createComponent(AiModelsPage);
    fixture.detectChanges();

    const element: HTMLElement = fixture.nativeElement;
    const missingCoverIndex = aiModelProfiles.findIndex((profile) => !profile.cover);

    if (missingCoverIndex === -1) return;

    const card = element.querySelectorAll('.model-card')[missingCoverIndex];
    expect(card.querySelector('.card-portrait-placeholder')).toBeTruthy();
    expect(card.querySelector('img')).toBeNull();
  });
});
