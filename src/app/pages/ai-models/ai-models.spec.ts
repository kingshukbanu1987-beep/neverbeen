import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import {
  MediaEngagementStats,
  ModelMediaEngagementService,
} from '../../services/model-media-engagement.service';
import { ModelTestimonialsService } from '../../services/model-testimonials.service';
import { compactCount, exactCount } from '../../shared/exact-count-popover';
import { AiModelProfile, aiModelProfiles } from './ai-model-data';
import { AiModelsPage, drawCover } from './ai-models';
import { AiModelPhotoPreview } from './photo-preview/ai-model-photo-preview';

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
      'Ziba Nazrin',
      "Shirina O'Brien",
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
      'Toulene Arslan',
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
      'Zeina Al-Sabbagh',
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
    // The illustrative-profiles notice is on screen (its copy is the studio's legal warning).
    expect(element.querySelector('.profile-data-note')?.textContent).toContain('Prohibited');
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

  it('totals seen, likes, comments and shares across photos and videos, with portfolio and biography links', () => {
    const engagement = TestBed.inject(ModelMediaEngagementService);
    const statsFor = vi.spyOn(engagement, 'statsFor').mockImplementation((_slug, kind) => ({
      seen: kind === 'photo' ? 1004 : 1400,
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
      profile.photos.length * 1004 + profile.videos.length * 1400,
      profile.photos.length * 2 + profile.videos.length * 11,
      profile.photos.length * 3 + profile.videos.length * 13,
      profile.photos.length * 5 + profile.videos.length * 17,
    ];

    // Seen leads the row, before likes, comments and shares.
    expect(card.querySelectorAll('.card-engagement-stat').length).toBe(4);
    expect(
      Array.from(card.querySelectorAll('.card-engagement-label')).map((label) =>
        label.textContent?.trim(),
      ),
    ).toEqual(['Seen', 'Likes', 'Comments', 'Shares']);
    // Long totals are written compactly (21.4K), never as a full figure (21,400).
    expect(values).toEqual(expectedTotals.map((value) => compactCount(value)));
    expect(registerModel).toHaveBeenCalledWith(profile.slug, [
      ...profile.photos.map((photo) => ({ kind: 'photo', src: photo.src })),
      ...profile.videos.map((video) => ({ kind: 'video', src: video.src })),
    ]);
    expect(statsFor).toHaveBeenCalledWith(profile.slug, 'photo', profile.photos[0].src);
    expect(statsFor).toHaveBeenCalledWith(profile.slug, 'video', profile.videos[0].src);

    const actions = card.querySelectorAll<HTMLAnchorElement>('.card-actions a');
    expect(actions.length).toBe(3);
    expect(actions[0].textContent).toContain('View Profile');
    expect(actions[0].getAttribute('href')).toBe(`/ai-models/${profile.slug}`);
    expect(actions[1].textContent).toContain('View Portfolio');
    expect(actions[1].getAttribute('href')).toBe(`/ai-models/${profile.slug}/portfolio`);
    expect(actions[2].textContent).toContain('Read Bio');
    expect(actions[2].getAttribute('href')).toBe(`/ai-models/${profile.slug}/biography`);

    fixture.destroy();
  });

  it('reveals the exact figure of a card counter in the pop-up, then closes it again', () => {
    const engagement = TestBed.inject(ModelMediaEngagementService);
    vi.spyOn(engagement, 'statsFor').mockImplementation((_slug, kind) => ({
      seen: kind === 'photo' ? 1004 : 1400,
      likes: 0,
      comments: 0,
      shares: 0,
      likedByMe: false,
    }));
    const profile = aiModelProfiles.find((model) => model.videos.length > 0)!;
    const seenTotal = profile.photos.length * 1004 + profile.videos.length * 1400;
    const fixture = TestBed.createComponent(AiModelsPage);
    fixture.detectChanges();

    const element: HTMLElement = fixture.nativeElement;
    const card = Array.from(element.querySelectorAll<HTMLElement>('.model-card')).find(
      (modelCard) => modelCard.querySelector('h3')?.textContent?.trim() === profile.name,
    )!;
    const seen = card.querySelector<HTMLButtonElement>('.compact-count')!;

    expect(element.querySelector('.ecp-card')).toBeNull();
    expect(seen.textContent?.trim()).toBe(compactCount(seenTotal));

    seen.click();
    fixture.detectChanges();

    // The pop-up holds the exact figure — and only the figure.
    expect(element.querySelector('.ecp-card')?.textContent?.trim()).toBe(exactCount(seenTotal));
    expect(element.querySelector('.ecp-card')?.getAttribute('aria-label')).toBe(
      `Seen for ${profile.name}: ${exactCount(seenTotal)}`,
    );

    // Clicking anywhere else on the page closes it again.
    element
      .querySelector('.studio-hero')!
      .dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    fixture.detectChanges();
    expect(element.querySelector('.ecp-card')).toBeNull();

    fixture.destroy();
  });

  it('shows a standard availability status and starting price on each model card', () => {
    const fixture = TestBed.createComponent(AiModelsPage);
    fixture.detectChanges();

    const expectedLabel = (availability: string): string => {
      const state = availability.trim().toLocaleLowerCase();
      if (/unavailable|fully booked|not accepting/.test(state)) return 'Currently Unavailable';
      if (/future|looking for|coming soon/.test(state)) return 'Looking for Future Contract';
      return 'Available for Contract';
    };

    const cards = Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll('.model-card'),
    );
    for (const [index, profile] of aiModelProfiles.entries()) {
      const card = cards[index];
      const label = expectedLabel(profile.availability);
      expect(card.querySelector('.card-availability')?.textContent?.trim()).toBe(label);
      const stateClass =
        label === 'Currently Unavailable'
          ? 'is-unavailable'
          : label === 'Looking for Future Contract'
            ? 'is-future'
            : 'is-available';
      expect(card.querySelector('.card-availability')?.classList.contains(stateClass)).toBe(true);
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

  it('publishes a per-photo rate in INR for every model', () => {
    for (const profile of aiModelProfiles) {
      expect(profile.photoRate, `${profile.name} photo rate`).toBeGreaterThan(0);
      expect(profile.photoNote).toContain('INR');
    }

    // The models quote slightly different rates around the leading profile's figure.
    const rates = aiModelProfiles.map((profile) => profile.photoRate);
    expect(Math.min(...rates)).toBeGreaterThanOrEqual(500);
    expect(Math.max(...rates)).toBeLessThanOrEqual(1_000);
    expect(new Set(rates).size).toBeGreaterThan(1);
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

  it('puts Live Chat directly under the model name, with its live dot, out of the link row', () => {
    const fixture = TestBed.createComponent(AiModelsPage);
    fixture.detectChanges();

    const element: HTMLElement = fixture.nativeElement;
    const cards = Array.from(element.querySelectorAll<HTMLElement>('.model-card'));
    expect(cards.length).toBeGreaterThan(0);

    for (const card of cards) {
      const name = card.querySelector<HTMLElement>('.card-copy h3');
      const chat = card.querySelector<HTMLButtonElement>('.card-action-chat');
      expect(chat?.textContent?.trim()).toBe('Live Chat');
      // The small dot that pulses beside the words, so the button reads as live.
      expect(chat?.querySelector('.card-chat-dot')).toBeTruthy();

      // It now stands directly under the name of the model, and no longer down in the links row.
      const row = chat?.closest('.card-chat-row');
      expect(row?.parentElement?.classList.contains('card-copy')).toBe(true);
      expect(name?.nextElementSibling).toBe(row);
      expect(card.querySelector('.card-actions .card-action-chat')).toBeNull();
    }
  });

  it('offers the cinematic Preview on every card, stretched across the row under the counts', () => {
    const fixture = TestBed.createComponent(AiModelsPage);
    fixture.detectChanges();

    const element: HTMLElement = fixture.nativeElement;
    const cards = Array.from(element.querySelectorAll<HTMLElement>('.model-card'));
    expect(cards.length).toBe(aiModelProfiles.length);

    for (const [index, card] of cards.entries()) {
      const profile = aiModelProfiles[index];
      const preview = card.querySelector<HTMLButtonElement>('.card-preview');
      const counts = card.querySelector('.card-media-counts');

      if (profile.photos.length === 0) {
        // Nothing to play, nothing offered.
        expect(preview, `${profile.name} has no photographs`).toBeNull();
        continue;
      }

      expect(preview, `${profile.name} preview button`).toBeTruthy();
      expect(preview?.textContent?.replace(/\s+/g, ' ').trim()).toBe('▷ Preview');
      expect(preview?.getAttribute('aria-label')).toContain(profile.name);
      // It closes the block the counts open: one group, the button right under the two counts.
      expect(preview?.previousElementSibling).toBe(counts);
      expect(preview?.parentElement).toBe(counts?.parentElement);
      expect(preview?.parentElement?.classList.contains('card-meta')).toBe(true);
    }

    // One shared deck for the whole directory, held at the page level — never inside a card, which
    // clips and lifts what it holds and would trap the full-screen preview.
    const decks = element.querySelectorAll('app-ai-model-photo-preview');
    expect(decks.length).toBe(1);
    expect(decks[0].closest('.model-card')).toBeNull();

    fixture.destroy();
  });

  it('plays the album of the model whose card Preview was pressed, straight from the click', () => {
    // jsdom leaves HTMLMediaElement.play() unimplemented, so the deck is armed on a silent model.
    const profile = aiModelProfiles.find(
      (model) => model.photos.length > 1 && !model.previewMusic,
    )!;
    const fixture = TestBed.createComponent(AiModelsPage);
    fixture.detectChanges();

    const element: HTMLElement = fixture.nativeElement;
    const card = Array.from(element.querySelectorAll<HTMLElement>('.model-card'))[
      aiModelProfiles.indexOf(profile)
    ];
    const deck = fixture.debugElement.query(
      (node) => node.componentInstance instanceof AiModelPhotoPreview,
    )!.componentInstance as AiModelPhotoPreview;

    expect(deck.running()).toBe(false);
    expect(element.querySelector('.photo-preview')).toBeNull();

    card.querySelector<HTMLButtonElement>('.card-preview')!.click();

    // Nothing runs between the click and the start: the deck already holds her album, her name and
    // her music, so the browser keeps the gesture the full screen and the sound ask for.
    expect(deck.running()).toBe(true);
    expect(deck.photos()).toBe(profile.photos);
    expect(deck.modelName()).toBe(profile.name);
    expect(deck.modelLocation()).toBe(profile.location);
    expect(deck.musicSrc()).toBe(profile.previewMusic ?? '');

    fixture.detectChanges();
    expect(element.querySelector('.photo-preview')?.getAttribute('aria-label')).toBe(
      `${profile.name} photo preview`,
    );
    // The directory steps aside while her deck plays, exactly as the photo viewer does.
    expect(element.querySelector('main')?.hasAttribute('inert')).toBe(true);

    // Ending it puts the directory back exactly as it was.
    deck.stop(false);
    fixture.detectChanges();
    expect(deck.running()).toBe(false);
    expect(element.querySelector('.photo-preview')).toBeNull();
    expect(element.querySelector('main')?.hasAttribute('inert')).toBe(false);
    expect(document.body.style.overflow).toBe('');

    fixture.destroy();
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
