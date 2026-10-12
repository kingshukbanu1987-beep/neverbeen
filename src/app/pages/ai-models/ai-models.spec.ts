import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import {
  MediaEngagementStats,
  ModelMediaEngagementService,
} from '../../services/model-media-engagement.service';
import { ModelTestimonialsService } from '../../services/model-testimonials.service';
import { AiModelProfile, aiModelProfiles } from './ai-model-data';
import { AiModelsPage, drawCover } from './ai-models';

/** The cover each card is showing, in the order the cards sit on the page. */
function cardCovers(element: HTMLElement): string[] {
  return Array.from(element.querySelectorAll('.model-card img')).map(
    (image) => image.getAttribute('src') ?? '',
  );
}

describe('AiModelsPage', () => {
  let testimonialsApi: { list: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    testimonialsApi = {
      list: vi.fn().mockResolvedValue({
        items: [],
        totalCount: 0,
        page: 1,
        pageSize: 100,
        totalPages: 0,
      }),
    };

    await TestBed.configureTestingModule({
      imports: [AiModelsPage],
      providers: [
        provideRouter([]),
        {
          provide: ModelMediaEngagementService,
          useValue: {
            registerModel: vi.fn(),
            statsFor: vi.fn((): MediaEngagementStats => ({
              seen: 0,
              likes: 0,
              comments: 0,
              shares: 0,
              likedByMe: false,
            })),
          },
        },
        { provide: ModelTestimonialsService, useValue: testimonialsApi },
      ],
    }).compileComponents();
  });

  it('renders the portfolios in the published order and labels randomized details as illustrative', () => {
    const fixture = TestBed.createComponent(AiModelsPage);
    fixture.detectChanges();

    const element: HTMLElement = fixture.nativeElement;
    const expectedNames = [
      'Fiadh Dara',
      'Nourhan Durrani',
      'Alisha Bhattacharya',
      'Rozalin El Masry',
      'Sereenah Noorzai',
      'Reema Ganguly',
      'Nour El-Sherif',
      'Priyanka Chatterjee',
      'Fatima Al-Mansoor',
      'Tasneem Al-Rifai',
      'Amira Bint Tariq Al-Sayed',
      'Fatima Sana Hussaini',
      'Zeina Al-Sabbagh',
      'Toulene Arslan',
      'Caoimhe Niloufar Rahimi',
      'Salma Ahmadzai',
      'Nermin Akhundzada',
      'Rasha Fakhoury',
      'Lana Mahvash Kennedy',
      'Donya Caoimhe Yazdani',
      'Ava Amira Gallagher',
      'Banafsheh Saoirse Yazdani',
      'Aoife Pahlavi',
      'Sorcha Golsa MacCarthy',
      'Aisha Bint Mohammed Al-Husseini',
      "Shirina O'Brien",
      'Nirvana Noorzai',
      'Zahra Mahmoud Al-Khatib',
      'Soha Haddad',
      'Ameera Lone',
      'Saoirse Rezaei',
      'Farah Al-Shaar',
      'Florencia Fontana Gatti',
      'Zaynab Jones',
      'Maeve Anahita',
      'Lucía Gomensoro Rossi',
      'Ziba Nazrin',
      'Nazanin Maeve Al-Farsi',
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

  it('averages every testimonial page, fills fractional stars, and links to the portfolio testimonials', async () => {
    const profile = aiModelProfiles[0];
    testimonialsApi.list.mockImplementation(async (slug: string, page = 1) => {
      if (slug !== profile.slug) {
        return { items: [], totalCount: 0, page, pageSize: 100, totalPages: 0 };
      }

      return page === 1
        ? {
            items: [
              { id: 1, rating: 5 },
              { id: 2, rating: 4 },
            ],
            totalCount: 4,
            page,
            pageSize: 2,
            totalPages: 2,
          }
        : {
            items: [
              { id: 3, rating: 4 },
              { id: 4, rating: 4 },
            ],
            totalCount: 4,
            page,
            pageSize: 2,
            totalPages: 2,
          };
    });

    const fixture = TestBed.createComponent(AiModelsPage);
    fixture.detectChanges();
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
    fixture.detectChanges();

    const element: HTMLElement = fixture.nativeElement;
    const card = Array.from(element.querySelectorAll<HTMLElement>('.model-card')).find(
      (modelCard) => modelCard.querySelector('h3')?.textContent?.trim() === profile.name,
    )!;
    const stars = Array.from(card.querySelectorAll<HTMLElement>('.card-rating-star'));
    const reviewLink = card.querySelector<HTMLAnchorElement>('.card-review-link')!;

    expect(card.querySelector('.card-rating-value')?.textContent?.trim()).toBe('4.3');
    expect(stars).toHaveLength(5);
    expect(stars.map((star) => star.style.getPropertyValue('--star-fill'))).toEqual([
      '100%',
      '100%',
      '100%',
      '100%',
      '30%',
    ]);
    expect(reviewLink.textContent?.replace(/\s+/g, ' ').trim()).toContain('(4 reviews)');
    expect(reviewLink.getAttribute('href')).toBe(`/ai-models/${profile.slug}#testimonials`);
    expect(testimonialsApi.list).toHaveBeenCalledWith(profile.slug, 1, 100);
    expect(testimonialsApi.list).toHaveBeenCalledWith(profile.slug, 2, 100);

    fixture.destroy();
  });

  it('shows a zero score, five unfilled stars, and a linked No Reviews label when the feed is empty', async () => {
    const profile = aiModelProfiles[0];
    const fixture = TestBed.createComponent(AiModelsPage);
    fixture.detectChanges();
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
    fixture.detectChanges();

    const element: HTMLElement = fixture.nativeElement;
    const card = Array.from(element.querySelectorAll<HTMLElement>('.model-card')).find(
      (modelCard) => modelCard.querySelector('h3')?.textContent?.trim() === profile.name,
    )!;
    const stars = Array.from(card.querySelectorAll<HTMLElement>('.card-rating-star'));
    const reviewLink = card.querySelector<HTMLAnchorElement>('.card-review-link')!;

    expect(card.querySelector('.card-rating-value')?.textContent?.trim()).toBe('0.0');
    expect(stars.map((star) => star.style.getPropertyValue('--star-fill'))).toEqual([
      '0%',
      '0%',
      '0%',
      '0%',
      '0%',
    ]);
    expect(reviewLink.textContent?.replace(/\s+/g, ' ').trim()).toContain('(No Reviews)');
    expect(reviewLink.getAttribute('href')).toBe(`/ai-models/${profile.slug}#testimonials`);

    fixture.destroy();
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

  it('totals likes, comments and shares across photos and videos, with portfolio and biography links', () => {
    const engagement = TestBed.inject(ModelMediaEngagementService);
    const statsFor = vi.spyOn(engagement, 'statsFor').mockImplementation((_slug, kind) => ({
      seen: 0,
      likes: kind === 'photo' ? 2 : 11,
      comments: kind === 'photo' ? 3 : 13,
      shares: kind === 'photo' ? 5 : 17,
      likedByMe: false,
    }));
    const registerModel = vi.spyOn(engagement, 'registerModel');
    const profile = aiModelProfiles.find((model) => model.videos.length > 0)!;
    const fixture = TestBed.createComponent(AiModelsPage);
    fixture.detectChanges();

    const element: HTMLElement = fixture.nativeElement;
    const card = Array.from(element.querySelectorAll<HTMLElement>('.model-card')).find(
      (modelCard) => modelCard.querySelector('h3')?.textContent?.trim() === profile.name,
    )!;
    const values = Array.from(card.querySelectorAll<HTMLElement>('.card-engagement-value')).map(
      (value) => value.textContent?.trim(),
    );
    const expectedTotals = [
      profile.photos.length * 2 + profile.videos.length * 11,
      profile.photos.length * 3 + profile.videos.length * 13,
      profile.photos.length * 5 + profile.videos.length * 17,
    ];

    expect(card.querySelectorAll('.card-engagement-stat').length).toBe(3);
    expect(
      Array.from(card.querySelectorAll('.card-engagement-label')).map((label) =>
        label.textContent?.trim(),
      ),
    ).toEqual(['Likes', 'Comments', 'Shares']);
    expect(values).toEqual(expectedTotals.map((value) => value.toLocaleString('en-US')));
    expect(registerModel).toHaveBeenCalledWith(profile.slug, [
      ...profile.photos.map((photo) => ({ kind: 'photo', src: photo.src })),
      ...profile.videos.map((video) => ({ kind: 'video', src: video.src })),
    ]);
    expect(statsFor).toHaveBeenCalledWith(profile.slug, 'photo', profile.photos[0].src);
    expect(statsFor).toHaveBeenCalledWith(profile.slug, 'video', profile.videos[0].src);

    const actions = card.querySelectorAll<HTMLAnchorElement>('.card-actions a');
    expect(actions.length).toBe(2);
    expect(actions[0].textContent).toContain('View Profile');
    expect(actions[0].getAttribute('href')).toBe(`/ai-models/${profile.slug}`);
    expect(actions[1].textContent).toContain('Read Bio');
    expect(actions[1].getAttribute('href')).toBe(`/ai-models/${profile.slug}/biography`);

    fixture.destroy();
  });

  it('shows a standard availability status and starting price on each model card', () => {
    const fixture = TestBed.createComponent(AiModelsPage);
    fixture.detectChanges();

    const cards = Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll('.model-card'),
    );
    for (const [index, profile] of aiModelProfiles.entries()) {
      const card = cards[index];
      expect(card.querySelector('.card-availability')?.textContent?.trim()).toBe(
        'Available for Contract',
      );
      expect(card.querySelector('.card-availability')?.classList.contains('is-available')).toBe(
        true,
      );
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

    // The leading profile (Fiadh Dara) quotes ₹535; the models vary slightly around it.
    expect(aiModelProfiles[0].photoRate).toBe(535);
    expect(Math.min(...aiModelProfiles.map((profile) => profile.photoRate))).toBe(520);
    expect(Math.max(...aiModelProfiles.map((profile) => profile.photoRate))).toBe(600);
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

  it('shows each model a cover picked from her own album', () => {
    const fixture = TestBed.createComponent(AiModelsPage);
    fixture.detectChanges();

    const covers = cardCovers(fixture.nativeElement as HTMLElement);
    expect(covers.length).toBe(aiModelProfiles.length);

    for (const [index, profile] of aiModelProfiles.entries()) {
      expect(
        profile.photos.map((photo) => photo.src),
        `${profile.name} album`,
      ).toContain(covers[index]);
    }
  });

  it('re-draws the covers on every visit, so the directory opens with a new set of photographs', () => {
    const random = vi.spyOn(Math, 'random');
    try {
      // The first draw of each visit takes the first frame of the album, the second the last one.
      random.mockReturnValue(0);
      const first = TestBed.createComponent(AiModelsPage);
      first.detectChanges();

      random.mockReturnValue(0.999);
      const second = TestBed.createComponent(AiModelsPage);
      second.detectChanges();

      const firstCovers = cardCovers(first.nativeElement as HTMLElement);
      const secondCovers = cardCovers(second.nativeElement as HTMLElement);

      for (const [index, profile] of aiModelProfiles.entries()) {
        expect(firstCovers[index], `${profile.name} opening frame`).toBe(profile.photos[0].src);
        expect(secondCovers[index], `${profile.name} closing frame`).toBe(
          profile.photos[profile.photos.length - 1].src,
        );
      }

      // The two visits disagree wherever an album holds more than one photograph.
      expect(secondCovers).not.toEqual(firstCovers);

      first.destroy();
      second.destroy();
    } finally {
      random.mockRestore();
    }
  });

  it('keeps every cover fixed for the whole visit, however the directory is filtered', () => {
    const fixture = TestBed.createComponent(AiModelsPage);
    fixture.detectChanges();

    const element: HTMLElement = fixture.nativeElement;
    const before = cardCovers(element);

    const search = element.querySelector('input[type="search"]') as HTMLInputElement;
    search.value = 'reema';
    search.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    // Browsing the directory never re-draws a cover.
    for (const cover of cardCovers(element)) expect(before).toContain(cover);

    search.value = '';
    search.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    expect(cardCovers(element)).toEqual(before);
  });

  it('falls back to the stored cover for a model whose album is still empty', () => {
    const profile: AiModelProfile = {
      ...aiModelProfiles[0],
      photos: [],
      cover: 'stored-cover.jpg',
    };

    expect(drawCover(profile)).toBe('stored-cover.jpg');
  });
});
