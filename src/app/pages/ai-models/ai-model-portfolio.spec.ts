import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { signal } from '@angular/core';
import { of } from 'rxjs';
import { CommunityService } from '../../services/community.service';
import { ModelMediaEngagementService } from '../../services/model-media-engagement.service';
import { ModelTestimonialsService } from '../../services/model-testimonials.service';
import { compactCount, exactCount } from '../../shared/exact-count-popover';
import { AiModelProfile, aiModelProfiles } from './ai-model-data';
import { AiModelBiographyPage } from './biography/ai-model-biography';
import { AiModelAllPhotosPage } from './all-photos/ai-model-all-photos';
import { AiModelPortfolioPage, PREVIEW_LIMIT, shufflePhotos } from './ai-model-portfolio';
import { AiModelPortfolioDocumentPage } from './portfolio-document/ai-model-portfolio-document';
import { AiModelVideoPlayer, formatTime } from './video/ai-model-video-player';

const testRoutes = [
  {
    path: 'ai-models/:slug/biography',
    component: AiModelBiographyPage,
  },
  {
    path: 'ai-models/:slug/photos',
    component: AiModelAllPhotosPage,
  },
  {
    path: 'ai-models/:slug',
    component: AiModelPortfolioPage,
  },
];

/** Builds a temporary portfolio so multi-photograph behaviour can be exercised. */
function withPhotos(count: number, videoCount = 0): AiModelProfile {
  const photos = Array.from({ length: count }, (_, index) => ({
    src: `/NeverBeenModels/TestStudioModel/frame-${index + 1}.jpg`,
    caption: index === 0 ? 'Studio cover frame' : `Frame ${index + 1} caption`,
  }));
  const videos = Array.from({ length: videoCount }, (_, index) => ({
    src: `/NeverBeenModels/TestStudioModel/video/clip-${index + 1}.mp4`,
    fileName: `clip-${index + 1}.mp4`,
    caption: index === 0 ? 'Studio reel' : `Clip ${index + 1} caption`,
    poster: '',
    type: 'video/mp4',
  }));
  const profile: AiModelProfile = {
    slug: 'test-studio-model',
    name: 'Test Studio Model',
    cover: photos[0]?.src ?? '',
    album: 'TestStudioModel',
    location: 'George Town, Malaysia',
    age: '29',
    height: '170 cm',
    weight: '58 kg',
    bodyShape: 'Hourglass',
    bust: '85 cm',
    waist: '64 cm',
    hip: '92 cm',
    handle: '@test.studio.model',
    tags: ['Editorial', 'Campaign'],
    availability: 'Open for bookings',
    order: 99,
    photoRate: 550,
    photoNote: 'Rates are in INR per photograph.',
    bio: 'A temporary portfolio used by the unit test suite.',
    illustrative: true,
    gallery: photos.slice(1).map((photo) => photo.src),
    photos,
    videos,
  };

  aiModelProfiles.push(profile);
  return profile;
}

function release(profile: AiModelProfile): void {
  const index = aiModelProfiles.indexOf(profile);
  if (index >= 0) aiModelProfiles.splice(index, 1);
}

async function openPortfolio(slug: string): Promise<RouterTestingHarness> {
  const harness = await RouterTestingHarness.create(`/ai-models/${slug}`);
  harness.detectChanges();
  return harness;
}

/** The album is shuffled per visit, so every assertion reads the order the page is showing. */
function shownOrder(element: HTMLElement): string[] {
  return Array.from(element.querySelectorAll('.grid-tile img')).map(
    (image) => image.getAttribute('src') ?? '',
  );
}

describe('AiModelPortfolioPage', () => {
  let session: {
    authenticated: ReturnType<typeof signal<boolean>>;
    guest: ReturnType<typeof signal<boolean>>;
    user: ReturnType<typeof signal<any>>;
  };
  let testimonialsApi: {
    list: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    session = {
      authenticated: signal(false),
      guest: signal(false),
      user: signal<any>(null),
    };
    testimonialsApi = {
      list: vi.fn().mockResolvedValue({
        items: [],
        totalCount: 0,
        page: 1,
        pageSize: 50,
        totalPages: 0,
      }),
      create: vi.fn(),
    };

    const communityMock = {
      isAuthenticated: () => session.authenticated(),
      guestBrowsing: () => session.guest(),
      currentUser: () => session.user(),
      token: () => null,
      apiLive: false,
      apiUrl: 'https://neverbeen-api.test',
      checkApiOnline: vi.fn().mockResolvedValue(false),
      startOAuthRedirect: vi.fn().mockReturnValue(false),
      signInWithGoogle: vi.fn(),
      loginWithOAuth: vi.fn(),
      completeGoogleSignIn: vi.fn(),
      awaitGoogleIdentity: vi.fn(),
      cancelGoogleIdentity: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [AiModelPortfolioPage],
      providers: [
        provideRouter(testRoutes),
        { provide: CommunityService, useValue: communityMock },
        { provide: ModelTestimonialsService, useValue: testimonialsApi },
      ],
    }).compileComponents();
  });

  it('shows the model details and one Instagram-style tile per album photograph', async () => {
    const profile = withPhotos(3);
    const harness = await openPortfolio(profile.slug);
    const element = harness.routeNativeElement as HTMLElement;

    try {
      expect(element.querySelector('h1')?.textContent?.trim()).toBe('Test Studio Model');
      expect(element.textContent).toContain('@test.studio.model');
      expect(element.textContent).toContain('Available for Contract');
      expect(element.textContent).toContain('170 cm');

      const tiles = element.querySelectorAll('.grid-tile');
      expect(tiles.length).toBe(3);

      // The album is shuffled per visit, so the tiles are the same photographs in a new order.
      const shown = Array.from(tiles).map((tile) => tile.querySelector('img')?.getAttribute('src'));
      expect([...shown].sort()).toEqual(profile.photos.map((photo) => photo.src).sort());
      expect(new Set(shown).size).toBe(3);
      expect(tiles[0].getAttribute('aria-label')).toContain('portfolio photograph 1');

      const tags = Array.from(element.querySelectorAll('.tag-list li')).map((tag) =>
        tag.textContent?.trim(),
      );
      expect(tags).toEqual(['Editorial', 'Campaign']);
    } finally {
      release(profile);
    }
  });

  it('shows the same Live Now / past chats split pill beside the Live Chat button', async () => {
    const profile = withPhotos(1);
    const harness = await openPortfolio(profile.slug);
    const element = harness.routeNativeElement as HTMLElement;

    try {
      const cta = element.querySelector<HTMLElement>('.chat-cta')!;
      const pill = cta.querySelector<HTMLElement>('app-model-live-chat-pill .card-live-pill');
      expect(pill).not.toBeNull();
      expect(cta.querySelector('.action-chat')?.nextElementSibling?.tagName).toBe(
        'APP-MODEL-LIVE-CHAT-PILL',
      );
      expect(pill!.querySelector('.is-now .card-live-pill-word')?.textContent?.trim()).toBe(
        'Live Now',
      );
      expect(pill!.querySelector('.is-past .card-live-pill-bubble svg')).not.toBeNull();
      expect(pill!.getAttribute('aria-label')).toContain('live now');
    } finally {
      release(profile);
    }
  });

  it('puts Live Chat under her name, and Read full Biography directly above Rent Me (requirement E)', async () => {
    const profile = withPhotos(1);
    const harness = await openPortfolio(profile.slug);
    const element = harness.routeNativeElement as HTMLElement;

    try {
      const chat = element.querySelector<HTMLButtonElement>('.action-chat');
      const name = element.querySelector<HTMLElement>('#portfolio-title');
      expect(chat?.textContent?.trim()).toBe('Live Chat');
      // E — a quiet pill 1.7× smaller than the button it was, with its own restrained animation.
      expect(chat?.classList.contains('is-hero')).toBe(true);

      // It stands directly under the model's name, and no longer down among the action buttons.
      const cta = chat?.closest('.chat-cta');
      expect(cta?.parentElement?.classList.contains('identity-copy')).toBe(true);
      expect(name?.nextElementSibling).toBe(cta);
      expect(chat?.closest('.rent-action-stack')).toBeNull();

      const link = element.querySelector<HTMLAnchorElement>('.biography-link');
      const rent = element.querySelector<HTMLButtonElement>('.action-rent');
      expect(link?.tagName).toBe('A');
      expect(link?.textContent).toContain('Read full Biography');
      expect(link?.getAttribute('href')).toBe(`/ai-models/${profile.slug}/biography`);
      expect(link?.parentElement?.classList.contains('rent-action-stack')).toBe(true);
      // With the chat button out of the stack, the biography link sits directly above Rent Me.
      expect(link?.nextElementSibling).toBe(rent);
    } finally {
      release(profile);
    }
  });

  it('shows the model city and country instead of the generic model label', async () => {
    const profile = withPhotos(1);
    const harness = await openPortfolio(profile.slug);
    const element = harness.routeNativeElement as HTMLElement;

    try {
      expect(element.querySelector('.model-location')?.textContent?.trim()).toBe(
        'George Town · Malaysia',
      );
      expect(element.textContent).not.toContain('NeverBeen AI model');
    } finally {
      release(profile);
    }
  });

  it('shows a compact Google Community sign-in card without a guest option for visitors', async () => {
    const profile = withPhotos(0);
    const harness = await openPortfolio(profile.slug);
    const element = harness.routeNativeElement as HTMLElement;

    try {
      expect(element.querySelector('.community-auth-card')).not.toBeNull();
      expect(element.querySelector('.community-auth-card')?.textContent).toContain(
        'Sign in with Google',
      );
      expect(element.querySelector('.community-auth-card .guest-explore-btn')).toBeNull();
      expect(element.querySelector('.testimonial-form')).toBeNull();
    } finally {
      release(profile);
    }
  });

  it('does not allow the seeded guest session to publish a testimonial', async () => {
    const profile = withPhotos(0);
    session.guest.set(true);
    session.user.set({ status: 'Active', profileComplete: true });
    const harness = await openPortfolio(profile.slug);
    const element = harness.routeNativeElement as HTMLElement;

    try {
      expect(element.querySelector('.testimonial-form')).toBeNull();
      expect(element.querySelector('.community-auth-card')).not.toBeNull();
    } finally {
      release(profile);
    }
  });

  it('requires a complete active member session and validates headline, quote, and half-star rating', async () => {
    const profile = withPhotos(0);
    session.authenticated.set(true);
    session.user.set({ status: 'Active', profileComplete: true });
    const harness = await openPortfolio(profile.slug);
    const element = harness.routeNativeElement as HTMLElement;

    try {
      expect(element.querySelector('.testimonial-form')).not.toBeNull();
      expect(element.querySelector('.community-auth-card')).toBeNull();

      const headline = element.querySelector<HTMLInputElement>('#testimonial-headline')!;
      headline.value = 'A thoughtful and memorable collaboration';
      headline.dispatchEvent(new Event('input', { bubbles: true }));
      const testimonial = element.querySelector<HTMLTextAreaElement>('#testimonial-copy')!;
      testimonial.value = 'The process felt thoughtful, professional, and genuinely collaborative.';
      testimonial.dispatchEvent(new Event('input', { bubbles: true }));
      element
        .querySelector<HTMLButtonElement>('[aria-label="Set rating to 3.5 out of 5 stars"]')
        ?.click();
      harness.detectChanges();

      const publish = element.querySelector<HTMLButtonElement>('.publish-testimonial-button')!;
      expect(publish.disabled).toBe(false);
      expect(element.querySelector('.rating-value')?.textContent?.trim()).toBe('3.5 / 5');
    } finally {
      release(profile);
    }
  });

  it('publishes a valid testimonial and shows the returned quote in the feed', async () => {
    const profile = withPhotos(0);
    session.authenticated.set(true);
    session.user.set({ status: 'Active', profileComplete: true });
    const created = {
      id: 83,
      modelSlug: profile.slug,
      headline: 'A wonderful creative partnership',
      text: 'The collaboration felt thoughtful, professional, and genuinely creative.',
      rating: 4.5,
      createdAtUtc: '2025-05-12T15:30:00.000Z',
      author: {
        id: 7,
        uniqueId: '89201534010000000007',
        fullName: 'Sam Rivera',
        city: 'Lisbon',
        country: 'Portugal',
        activeStatus: 'Active',
      },
    };
    testimonialsApi.create.mockResolvedValue(created);
    const harness = await openPortfolio(profile.slug);
    await harness.fixture.whenStable();
    harness.detectChanges();
    const element = harness.routeNativeElement as HTMLElement;

    try {
      const headline = element.querySelector<HTMLInputElement>('#testimonial-headline')!;
      headline.value = created.headline;
      headline.dispatchEvent(new Event('input', { bubbles: true }));
      const quote = element.querySelector<HTMLTextAreaElement>('#testimonial-copy')!;
      quote.value = created.text;
      quote.dispatchEvent(new Event('input', { bubbles: true }));
      element
        .querySelector<HTMLButtonElement>('[aria-label="Set rating to 4.5 out of 5 stars"]')
        ?.click();
      harness.detectChanges();

      const form = element.querySelector<HTMLFormElement>('.testimonial-form')!;
      form.dispatchEvent(new SubmitEvent('submit', { bubbles: true, cancelable: true }));
      await harness.fixture.whenStable();
      harness.detectChanges();

      expect(testimonialsApi.create).toHaveBeenCalledWith(profile.slug, {
        headline: created.headline,
        text: created.text,
        rating: 4.5,
      });
      expect(element.querySelector('.testimonial-headline')?.textContent?.trim()).toBe(
        created.headline,
      );
      expect(element.querySelector('.submit-success')?.textContent).toContain('published');
    } finally {
      release(profile);
    }
  });

  it('renders quotes, half-star scores, member status, location, timestamp, and Community profile links', async () => {
    const profile = withPhotos(0);
    testimonialsApi.list.mockResolvedValue({
      items: [
        {
          id: 52,
          modelSlug: profile.slug,
          headline: 'A wonderful creative partnership',
          text: 'The collaboration felt thoughtful, professional, and genuinely creative.',
          rating: 4.5,
          createdAtUtc: '2025-05-12T15:30:00.000Z',
          author: {
            id: 7,
            uniqueId: '89201534010000000007',
            fullName: 'Sam Rivera',
            profilePhotoUrl: 'https://images.example.test/sam.jpg',
            city: 'Lisbon',
            country: 'Portugal',
            activeStatus: 'Active',
            isVerified: true,
          },
        },
      ],
      totalCount: 1,
      page: 1,
      pageSize: 50,
      totalPages: 1,
    });
    const harness = await openPortfolio(profile.slug);
    await harness.fixture.whenStable();
    harness.detectChanges();
    const element = harness.routeNativeElement as HTMLElement;

    try {
      expect(element.querySelector('#testimonials')).not.toBeNull();
      expect(element.querySelector('.testimonial-headline')?.textContent?.trim()).toBe(
        'A wonderful creative partnership',
      );
      expect(element.querySelector('blockquote')?.textContent).toContain(
        'thoughtful, professional',
      );
      expect(element.querySelectorAll('.display-star.is-full').length).toBe(4);
      expect(element.querySelectorAll('.display-star.is-half').length).toBe(1);
      expect(element.querySelector('.author-status')?.textContent).toContain('Active');
      expect(element.querySelector('.author-location')?.textContent).toContain('Lisbon, Portugal');
      expect(element.querySelector('time')?.getAttribute('datetime')).toBe(
        '2025-05-12T15:30:00.000Z',
      );
      expect(element.querySelector('.testimonial-author-name')?.getAttribute('href')).toContain(
        'id=89201534010000000007',
      );
      expect(element.querySelector('.testimonial-avatar-link')?.getAttribute('href')).toContain(
        'id=89201534010000000007',
      );
    } finally {
      release(profile);
    }
  });

  it('expands a tile in a pop-up, locks scrolling and closes on Escape', async () => {
    const profile = withPhotos(3);
    const harness = await openPortfolio(profile.slug);
    const element = harness.routeNativeElement as HTMLElement;

    try {
      const tile = element.querySelectorAll<HTMLButtonElement>('.grid-tile')[1];
      const opened = tile.querySelector('img')?.getAttribute('src');
      tile.focus();
      tile.click();
      harness.detectChanges();

      const lightbox = element.querySelector('.lightbox');
      expect(lightbox).not.toBeNull();
      expect(lightbox?.getAttribute('aria-modal')).toBe('true');
      expect(lightbox?.querySelector('.lightbox-image')?.getAttribute('src')).toBe(opened);
      expect(profile.photos.some((photo) => photo.src === opened)).toBe(true);
      expect(lightbox?.querySelector('.lightbox-counter')?.textContent).toContain('02');
      expect(document.activeElement?.classList.contains('lightbox-close')).toBe(true);
      expect(document.body.style.overflow).toBe('hidden');

      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
      harness.detectChanges();

      expect(element.querySelector('.lightbox')).toBeNull();
      expect(document.body.style.overflow).toBe('');
      expect(document.activeElement?.classList.contains('grid-tile')).toBe(true);
    } finally {
      release(profile);
    }
  });

  it('dismisses the pop-up when the dark space around the photograph is clicked', async () => {
    const profile = withPhotos(2);
    const harness = await openPortfolio(profile.slug);
    const element = harness.routeNativeElement as HTMLElement;

    try {
      (element.querySelectorAll('.grid-tile')[0] as HTMLButtonElement).click();
      harness.detectChanges();
      expect(element.querySelector('.lightbox')).not.toBeNull();

      element.querySelector<HTMLElement>('.lightbox')?.click();
      harness.detectChanges();
      expect(element.querySelector('.lightbox')).toBeNull();
    } finally {
      release(profile);
    }
  });

  it('browses the album with the arrow keys, wrapping at both ends', async () => {
    const profile = withPhotos(3);
    const harness = await openPortfolio(profile.slug);
    const element = harness.routeNativeElement as HTMLElement;
    const counter = () => element.querySelector('.lightbox-counter')?.textContent?.trim();
    const order = shownOrder(element);

    try {
      (element.querySelectorAll('.grid-tile')[0] as HTMLButtonElement).click();
      harness.detectChanges();
      expect(counter()).toBe('01 / 03');

      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }));
      harness.detectChanges();
      expect(counter()).toBe('02 / 03');

      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft' }));
      harness.detectChanges();
      expect(counter()).toBe('01 / 03');

      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft' }));
      harness.detectChanges();
      expect(counter()).toBe('03 / 03');
      expect(element.querySelector('.lightbox-image')?.getAttribute('src')).toBe(order[2]);
    } finally {
      release(profile);
    }
  });

  it('jumps to a photograph from the thumbnail strip and the arrow buttons', async () => {
    const profile = withPhotos(4);
    const harness = await openPortfolio(profile.slug);
    const element = harness.routeNativeElement as HTMLElement;
    const order = shownOrder(element);

    try {
      (element.querySelectorAll('.grid-tile')[0] as HTMLButtonElement).click();
      harness.detectChanges();

      const thumbs = element.querySelectorAll<HTMLButtonElement>('.lightbox-thumb');
      expect(thumbs.length).toBe(4);
      thumbs[2].click();
      harness.detectChanges();

      expect(element.querySelector('.lightbox-counter')?.textContent?.trim()).toBe('03 / 04');
      expect(element.querySelectorAll('.lightbox-thumb')[2].classList).toContain('is-active');

      (element.querySelector('.lightbox-next') as HTMLButtonElement).click();
      harness.detectChanges();
      expect(element.querySelector('.lightbox-image')?.getAttribute('src')).toBe(order[3]);

      (element.querySelector('.lightbox-prev') as HTMLButtonElement).click();
      harness.detectChanges();
      expect(element.querySelector('.lightbox-image')?.getAttribute('src')).toBe(order[2]);
    } finally {
      release(profile);
    }
  });

  it('switches between the grid and feed layouts, keeping captions in the feed', async () => {
    const profile = withPhotos(2);
    const harness = await openPortfolio(profile.slug);
    const element = harness.routeNativeElement as HTMLElement;
    const order = shownOrder(element);

    try {
      expect(element.querySelector('.portfolio-grid')).not.toBeNull();

      const feedButton = Array.from(
        element.querySelectorAll<HTMLButtonElement>('.view-switch button'),
      ).find((button) => button.textContent?.includes('Feed'));
      feedButton?.click();
      harness.detectChanges();

      expect(element.querySelector('.portfolio-grid')).toBeNull();
      const feedItems = element.querySelectorAll('.feed-item');
      expect(feedItems.length).toBe(2);
      // The feed follows the shuffled order, so its captions are the album's captions.
      const expectedCaptions = order.map(
        (src) => profile.photos.find((photo) => photo.src === src)?.caption ?? '',
      );
      for (const [index, caption] of expectedCaptions.entries()) {
        expect(feedItems[index].textContent).toContain(caption);
      }

      element.querySelector<HTMLButtonElement>('.feed-photo')?.click();
      harness.detectChanges();
      expect(element.querySelector('.lightbox')).not.toBeNull();
    } finally {
      release(profile);
    }
  });

  it('shows seen, likes, comments and shares in one row just above the photographs', async () => {
    const profile = withPhotos(3, 2);
    const harness = await openPortfolio(profile.slug);
    const element = harness.routeNativeElement as HTMLElement;
    const engagement = TestBed.inject(ModelMediaEngagementService);

    try {
      await engagement.loadStats(profile.slug);
      harness.detectChanges();

      const row = element.querySelector('.gallery-engagement')!;
      expect(row).not.toBeNull();
      expect(
        Array.from(row.querySelectorAll<HTMLElement>('.gallery-engagement-label')).map((label) =>
          label.textContent?.trim(),
        ),
      ).toEqual(['Seen', 'Likes', 'Comments', 'Shares']);

      // The row reads after the gallery heading and before the first photograph.
      const heading = element.querySelector('.gallery-heading')!;
      const grid = element.querySelector('.portfolio-grid')!;
      expect(heading.compareDocumentPosition(row) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
      expect(row.compareDocumentPosition(grid) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();

      // Seen, likes, comments and shares cover every photograph and every clip.
      const expectedTotals = { seen: 0, likes: 0, comments: 0, shares: 0 };
      for (const photo of profile.photos) {
        const stats = engagement.statsFor(profile.slug, 'photo', photo.src);
        expectedTotals.seen += stats.seen;
        expectedTotals.likes += stats.likes;
        expectedTotals.comments += stats.comments;
        expectedTotals.shares += stats.shares;
      }
      for (const video of profile.videos) {
        const stats = engagement.statsFor(profile.slug, 'video', video.src);
        expectedTotals.seen += stats.seen;
        expectedTotals.likes += stats.likes;
        expectedTotals.comments += stats.comments;
        expectedTotals.shares += stats.shares;
      }
      expect(expectedTotals.seen).toBeGreaterThan(0);

      // Long totals read compactly (21.4K) and open their exact figure on a click.
      const values = Array.from(row.querySelectorAll<HTMLElement>('.gallery-engagement-value')).map(
        (value) => value.textContent?.trim(),
      );
      expect(values).toEqual([
        compactCount(expectedTotals.seen),
        compactCount(expectedTotals.likes),
        compactCount(expectedTotals.comments),
        compactCount(expectedTotals.shares),
      ]);

      const seen = row.querySelector<HTMLButtonElement>('.gallery-stat-seen .compact-count')!;
      seen.click();
      harness.detectChanges();
      expect(element.querySelector('.ecp-card')?.textContent?.trim()).toBe(
        exactCount(expectedTotals.seen),
      );
    } finally {
      release(profile);
    }
  });

  it('shows twelve photographs from a larger album, the twelfth opening the complete album', async () => {
    const profile = withPhotos(20);
    const harness = await openPortfolio(profile.slug);
    const element = harness.routeNativeElement as HTMLElement;

    try {
      expect(PREVIEW_LIMIT).toBe(12);
      const tiles = element.querySelectorAll<HTMLElement>('.portfolio-grid .grid-tile');
      expect(tiles.length).toBe(12);

      // Twelve different photographs, all from the album.
      const shown = shownOrder(element);
      const album = new Set(profile.photos.map((photo) => photo.src));
      expect(new Set(shown).size).toBe(12);
      expect(shown.every((src) => album.has(src))).toBe(true);

      // Eleven tiles open the viewer; the twelfth is the View All link.
      expect(element.querySelectorAll('.portfolio-grid button.grid-tile').length).toBe(11);
      const viewAll = tiles[11];
      expect(viewAll.tagName).toBe('A');
      expect(viewAll.classList).toContain('view-all-tile');
      expect(viewAll.getAttribute('href')).toBe('/ai-models/test-studio-model/photos');
      expect(viewAll.textContent).toContain('View All');
      expect(viewAll.textContent).toContain('+8');
      expect(viewAll.getAttribute('aria-label')).toBe(
        'View all 20 photographs of Test Studio Model',
      );

      // The counts still describe the whole album.
      expect(element.querySelector('.gallery-count')?.textContent).toContain('20');
      expect(element.querySelector('.gallery-intro')?.textContent).toContain('20');
    } finally {
      release(profile);
    }
  });

  it('teases her Premium Content blurred and watermarked, scattered through the grid', async () => {
    const profile = withPhotos(20);
    profile.premiumPhotos = Array.from({ length: 6 }, (_, index) => ({
      src: `/NeverBeenModels/TestStudioModel/PremiumContent/frame-${index + 1}.jpg`,
      caption: '',
    }));
    const harness = await openPortfolio(profile.slug);
    const element = harness.routeNativeElement as HTMLElement;

    try {
      // At least four of her six Premium Content frames appear — never one after another.
      const tiles = Array.from(element.querySelectorAll<HTMLElement>('.portfolio-grid > *'));
      const teaserPositions = tiles
        .map((tile, index) => (tile.classList.contains('premium-teaser-tile') ? index : -1))
        .filter((index) => index >= 0);
      expect(teaserPositions.length).toBe(4);
      for (const position of teaserPositions) {
        expect(tiles[position + 1]?.classList.contains('premium-teaser-tile')).toBe(false);
      }

      // Every teaser carries the diagonal watermark and never opens the lightbox.
      for (const tile of tiles.filter((tile) => tile.classList.contains('premium-teaser-tile'))) {
        expect(tile.textContent).toContain('Premium Content');
        expect(tile.textContent).toContain('Only available in Paid Premium Chat');
        expect(tile.querySelector('button')).toBeNull();
        expect(tile.querySelector('img')?.getAttribute('src')).toContain('PremiumContent');
      }

      // The View All door still closes the grid, and the album photographs still open.
      expect(tiles.at(-1)?.classList).toContain('view-all-tile');
      expect(element.querySelectorAll('.portfolio-grid button.grid-tile').length).toBe(11);

      // The feed layout teases the same locked frames.
      Array.from(element.querySelectorAll<HTMLButtonElement>('.view-switch button'))
        .find((button) => button.textContent?.includes('Feed'))
        ?.click();
      harness.detectChanges();
      expect(element.querySelectorAll('.premium-teaser-item').length).toBe(4);
      expect(element.querySelectorAll('button.feed-photo').length).toBe(11);
    } finally {
      release(profile);
    }
  });

  it('shows an album of twelve or fewer photographs whole, without a View All tile', async () => {
    const profile = withPhotos(12);
    const harness = await openPortfolio(profile.slug);
    const element = harness.routeNativeElement as HTMLElement;

    try {
      expect(element.querySelectorAll('.portfolio-grid button.grid-tile').length).toBe(12);
      expect(element.querySelector('.view-all-tile')).toBeNull();
    } finally {
      release(profile);
    }
  });

  it('offers View All on the twelfth photograph of the feed layout too', async () => {
    const profile = withPhotos(15);
    const harness = await openPortfolio(profile.slug);
    const element = harness.routeNativeElement as HTMLElement;

    try {
      Array.from(element.querySelectorAll<HTMLButtonElement>('.view-switch button'))
        .find((button) => button.textContent?.includes('Feed'))
        ?.click();
      harness.detectChanges();

      const items = element.querySelectorAll('.feed-item');
      expect(items.length).toBe(12);
      expect(items[11].classList).toContain('view-all-item');
      const link = items[11].querySelector<HTMLAnchorElement>('a.view-all-tile');
      expect(link?.getAttribute('href')).toBe('/ai-models/test-studio-model/photos');
      expect(link?.textContent).toContain('+3');
      expect(element.querySelectorAll('button.feed-photo').length).toBe(11);
    } finally {
      release(profile);
    }
  });

  it('browses the twelve shown photographs in the viewer and links to the complete album', async () => {
    const profile = withPhotos(20);
    const harness = await openPortfolio(profile.slug);
    const element = harness.routeNativeElement as HTMLElement;

    try {
      (element.querySelectorAll('.grid-tile')[0] as HTMLButtonElement).click();
      harness.detectChanges();

      expect(element.querySelector('.lightbox-counter')?.textContent?.trim()).toBe('01 / 12');
      expect(element.querySelectorAll('.lightbox-thumb').length).toBe(12);
      expect(element.querySelector('.zoom-dock')).not.toBeNull();
      const albumLink = element.querySelector<HTMLAnchorElement>('.viewer-album-link');
      expect(albumLink?.getAttribute('href')).toBe('/ai-models/test-studio-model/photos');
      expect(albumLink?.textContent).toContain('20');

      // Browsing wraps within the twelve shown photographs.
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft' }));
      harness.detectChanges();
      expect(element.querySelector('.lightbox-counter')?.textContent?.trim()).toBe('12 / 12');
    } finally {
      release(profile);
    }
  });

  it('opens the complete album page from the View All tile', async () => {
    const profile = withPhotos(20);
    const harness = await openPortfolio(profile.slug);

    try {
      const element = harness.routeNativeElement as HTMLElement;
      element.querySelector<HTMLAnchorElement>('.view-all-tile')!.click();
      await harness.fixture.whenStable();
      harness.detectChanges();

      const album = harness.routeNativeElement as HTMLElement;
      expect(album.querySelectorAll('.mosaic-tile').length).toBe(20);
      expect(album.querySelector('.album-dock .dock-link')?.getAttribute('href')).toBe(
        '/ai-models/test-studio-model#photos',
      );
    } finally {
      release(profile);
    }
  });

  it('lands straight on the gallery when coming back from the complete album', async () => {
    const profile = withPhotos(20);
    const scrollTo = vi.spyOn(window, 'scrollTo').mockImplementation(() => undefined);

    try {
      const harness = await RouterTestingHarness.create(`/ai-models/${profile.slug}#photos`);
      harness.detectChanges();
      await harness.fixture.whenStable();

      const element = harness.routeNativeElement as HTMLElement;
      expect(element.querySelector('.gallery-section #photos')).not.toBeNull();
      expect(scrollTo).toHaveBeenCalledWith(expect.objectContaining({ behavior: 'instant' }));
    } finally {
      scrollTo.mockRestore();
      release(profile);
    }
  });

  it('points at the album folder when a model has no photographs yet', async () => {
    const profile = withPhotos(0);
    const harness = await openPortfolio(profile.slug);
    const element = harness.routeNativeElement as HTMLElement;

    try {
      const pending = element.querySelector('.gallery-pending');
      expect(pending).not.toBeNull();
      expect(pending?.textContent).toContain('public/NeverBeenModels/TestStudioModel');
      expect(element.querySelectorAll('.grid-tile').length).toBe(0);
    } finally {
      release(profile);
    }
  });

  it('renders the generated albums from public/NeverBeenModels', async () => {
    for (const profile of aiModelProfiles) {
      expect(profile.album, `${profile.name} album folder`).not.toBe('');
      // A freshly created album folder is empty until its photographs arrive.
      if (profile.photos.length === 0) continue;
      expect(profile.photos[0].src).toContain(`/NeverBeenModels/${profile.album}/`);
    }

    const nourhan = aiModelProfiles.find((profile) => profile.slug === 'nourhan-durrani');
    expect(nourhan).toBeTruthy();
    expect(nourhan?.album).toBe('NourhanDurrani');
    expect(nourhan?.handle).toBe('@nourhan.durrani');
    expect(nourhan?.tags.length).toBeGreaterThan(0);
  });
});

/**
 * The shuffle is per visit, so these tests render the page component directly — two instances are
 * two visits, where RouterTestingHarness would only allow one visit per test.
 */
describe('AiModelPortfolioPage portfolio document actions', () => {
  let session: {
    authenticated: ReturnType<typeof signal<boolean>>;
    guest: ReturnType<typeof signal<boolean>>;
    user: ReturnType<typeof signal<any>>;
  };

  beforeEach(async () => {
    session = {
      authenticated: signal(false),
      guest: signal(false),
      user: signal<any>(null),
    };
    const communityMock = {
      isAuthenticated: () => session.authenticated(),
      guestBrowsing: () => session.guest(),
      currentUser: () => session.user(),
      token: () => null,
      apiLive: false,
      apiUrl: 'https://neverbeen-api.test',
      checkApiOnline: vi.fn().mockResolvedValue(false),
      startOAuthRedirect: vi.fn().mockReturnValue(false),
      signInWithGoogle: vi.fn(),
      loginWithOAuth: vi.fn(),
      completeGoogleSignIn: vi.fn(),
      awaitGoogleIdentity: vi.fn(),
      cancelGoogleIdentity: vi.fn(),
    };
    await TestBed.configureTestingModule({
      imports: [AiModelPortfolioPage, AiModelPortfolioDocumentPage],
      providers: [
        provideRouter([
          ...testRoutes,
          {
            path: 'ai-models/:slug/portfolio',
            component: AiModelPortfolioDocumentPage,
          },
        ]),
        { provide: CommunityService, useValue: communityMock },
        {
          provide: ModelTestimonialsService,
          useValue: {
            list: vi.fn().mockResolvedValue({
              items: [],
              totalCount: 0,
              page: 1,
              pageSize: 50,
              totalPages: 0,
            }),
            create: vi.fn(),
          },
        },
      ],
    }).compileComponents();
  });

  it('offers Watch Portfolio and Download Portfolio where the old portfolio button was', async () => {
    const profile = withPhotos(2);
    try {
      const harness = await openPortfolio(profile.slug);
      const element = harness.routeNativeElement!;
      const labels = Array.from(element.querySelectorAll('.profile-actions .action-button')).map(
        (button) => (button.textContent ?? '').trim(),
      );
      const joined = labels.join(' | ');
      expect(joined).toContain('Watch Portfolio');
      expect(joined).toContain('Download Portfolio');
      // The retired portfolio button is gone.
      expect(labels.join(' ')).not.toMatch(/AI Portfolio|All portfolios/i);
    } finally {
      release(profile);
    }
  });

  it('opens the portfolio document page from Watch Portfolio', async () => {
    const profile = withPhotos(2);
    try {
      const harness = await openPortfolio(profile.slug);
      const watch =
        harness.routeNativeElement!.querySelector<HTMLButtonElement>('.action-watch-portfolio')!;
      watch.click();
      await harness.fixture.whenStable();
      harness.detectChanges();
      // The model has no generated document, so the white notice page is shown.
      expect(harness.routeNativeElement!.querySelector('.portfolio-missing-page')).toBeTruthy();
      expect(harness.routeNativeElement!.textContent).toContain('Portfolio not Available');
    } finally {
      release(profile);
    }
  });

  it('downloads the PDF when the model has a portfolio document', async () => {
    const profile = withPhotos(2);
    profile.portfolio = {
      url: '/NeverBeenModels/TestStudioModel/Portfolio/TestStudioModel_Portfolio.pdf',
      fileName: 'TestStudioModel_Portfolio.pdf',
      downloadName: 'NeverBeen-Portfolio-Test-Studio-Model.pdf',
      pages: 24,
      orientation: 'portrait',
      style: 'solar-editorial',
      styleName: 'Solar Editorial',
      generatedAt: '2026-02-02T10:00:00.000Z',
      sizeBytes: 1234567,
    };
    const clicks: string[] = [];
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
      this: HTMLAnchorElement,
    ) {
      clicks.push(`${this.getAttribute('download')}@${this.getAttribute('href')}`);
    });
    try {
      const harness = await openPortfolio(profile.slug);
      const download = harness.routeNativeElement!.querySelector<HTMLButtonElement>(
        '.action-download-portfolio',
      )!;
      expect(download.classList.contains('is-missing')).toBe(false);
      download.click();
      expect(clicks).toHaveLength(1);
      expect(clicks[0]).toContain('NeverBeen-Portfolio-Test-Studio-Model.pdf');
      expect(clicks[0]).toContain('/NeverBeenModels/TestStudioModel/Portfolio/');
    } finally {
      clickSpy.mockRestore();
      release(profile);
    }
  });

  it('sends a model without a document to the white notice page from Download Portfolio', async () => {
    const profile = withPhotos(2);
    try {
      const harness = await openPortfolio(profile.slug);
      const download = harness.routeNativeElement!.querySelector<HTMLButtonElement>(
        '.action-download-portfolio',
      )!;
      expect(download.classList.contains('is-missing')).toBe(true);
      download.click();
      await harness.fixture.whenStable();
      harness.detectChanges();
      expect(harness.routeNativeElement!.querySelector('.portfolio-missing-page')).toBeTruthy();
      expect(harness.routeNativeElement!.textContent).toContain(
        'connect with the NeverBeen support team',
      );
    } finally {
      release(profile);
    }
  });
});

describe('AiModelPortfolioPage photo shuffle', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AiModelPortfolioPage],
      providers: [
        provideRouter([]),
        {
          provide: CommunityService,
          useValue: {
            isAuthenticated: () => false,
            guestBrowsing: () => false,
            currentUser: () => null,
            apiUrl: 'https://neverbeen-api.test',
          },
        },
        {
          provide: ModelTestimonialsService,
          useValue: {
            list: vi.fn().mockResolvedValue({
              items: [],
              totalCount: 0,
              page: 1,
              pageSize: 50,
              totalPages: 0,
            }),
            create: vi.fn(),
          },
        },
        {
          provide: ActivatedRoute,
          useValue: {
            paramMap: of(convertToParamMap({ slug: 'test-studio-model' })),
            snapshot: { paramMap: convertToParamMap({ slug: 'test-studio-model' }) },
          },
        },
      ],
    }).compileComponents();
  });

  function visit(): string[] {
    const fixture = TestBed.createComponent(AiModelPortfolioPage);
    fixture.detectChanges();
    return shownOrder(fixture.nativeElement as HTMLElement);
  }

  it('re-arranges the album on every visit without losing or duplicating a frame', () => {
    const profile = withPhotos(4);
    const random = vi.spyOn(Math, 'random');
    // Each visit to a 4-photo album consumes three random numbers.
    random.mockReturnValueOnce(0).mockReturnValueOnce(0).mockReturnValueOnce(0);
    random.mockReturnValueOnce(0.9).mockReturnValueOnce(0.9).mockReturnValueOnce(0.9);

    try {
      const firstOrder = visit();
      const secondOrder = visit();

      for (const order of [firstOrder, secondOrder]) {
        expect(order.length).toBe(4);
        expect([...order].sort()).toEqual(profile.photos.map((photo) => photo.src).sort());
      }

      expect(secondOrder).not.toEqual(firstOrder);
    } finally {
      random.mockRestore();
      release(profile);
    }
  });

  it('re-arranges the grid when the visitor asks for another shuffle', () => {
    const profile = withPhotos(4);
    const random = vi.spyOn(Math, 'random');
    // The first draw puts the album in its natural order; the second reverses it.
    random.mockReturnValueOnce(0).mockReturnValueOnce(0).mockReturnValueOnce(0);
    random.mockReturnValueOnce(0.9).mockReturnValueOnce(0.9).mockReturnValueOnce(0.9);

    try {
      const fixture = TestBed.createComponent(AiModelPortfolioPage);
      fixture.detectChanges();
      const element = fixture.nativeElement as HTMLElement;
      const before = shownOrder(element);
      const tiles = element.querySelectorAll('.grid-tile');
      expect(tiles.length).toBe(4);

      const shuffle = element.querySelector<HTMLButtonElement>('.shuffle-button');
      expect(shuffle, 'shuffle button').toBeTruthy();
      shuffle!.click();
      fixture.detectChanges();

      const after = shownOrder(element);
      expect(after).not.toEqual(before);
      expect([...after].sort()).toEqual(profile.photos.map((photo) => photo.src).sort());
      expect(element.querySelectorAll('.grid-tile').length).toBe(4);
    } finally {
      random.mockRestore();
      release(profile);
    }
  });

  it('draws a different twelve from a larger album on every visit and every shuffle', () => {
    const profile = withPhotos(20);
    const random = vi.spyOn(Math, 'random');

    try {
      // Draws near 1 keep the album order; draws of 0 rotate it by one photograph.
      random.mockReturnValue(0.999);
      const fixture = TestBed.createComponent(AiModelPortfolioPage);
      fixture.detectChanges();
      const element = fixture.nativeElement as HTMLElement;
      const first = shownOrder(element);
      expect(first).toEqual(profile.photos.slice(0, 12).map((photo) => photo.src));

      random.mockReturnValue(0);
      element.querySelector<HTMLButtonElement>('.shuffle-button')!.click();
      fixture.detectChanges();
      const second = shownOrder(element);
      expect(second).toEqual(profile.photos.slice(1, 13).map((photo) => photo.src));
      expect(element.querySelectorAll('.grid-tile').length).toBe(12);
      expect(element.querySelector('.view-all-tile')).not.toBeNull();
    } finally {
      random.mockRestore();
      release(profile);
    }
  });

  it('shufflePhotos returns a permutation and leaves the album untouched', () => {
    const profile = withPhotos(6);
    const album = profile.photos;

    try {
      const shuffled = shufflePhotos(album);
      expect(shuffled.length).toBe(album.length);
      expect([...shuffled].sort((a, b) => a.src.localeCompare(b.src))).toEqual(
        [...album].sort((a, b) => a.src.localeCompare(b.src)),
      );
      expect(shuffled).not.toBe(album);
      expect(album[0].src).toBe('/NeverBeenModels/TestStudioModel/frame-1.jpg');
    } finally {
      release(profile);
    }
  });
});

/** The player is rendered on its own, as the portfolio renders it, so its controls can be driven. */
describe('AiModelVideoPlayer', () => {
  const clips = [
    {
      src: '/NeverBeenModels/TestStudioModel/video/clip-1.mp4',
      fileName: 'clip-1.mp4',
      caption: 'Studio reel',
      poster: '',
      type: 'video/mp4',
    },
    {
      src: '/NeverBeenModels/TestStudioModel/video/clip-2.mp4',
      fileName: 'clip-2.mp4',
      caption: '',
      poster: '/NeverBeenModels/TestStudioModel/video/clip-2.jpg',
      type: 'video/mp4',
    },
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [AiModelVideoPlayer] }).compileComponents();
  });

  /** Built without rendering first, so a test can install its spies before playback starts. */
  function open(startIndex = 0, render = true) {
    const fixture = TestBed.createComponent(AiModelVideoPlayer);
    fixture.componentRef.setInput('videos', clips);
    fixture.componentRef.setInput('startIndex', startIndex);
    fixture.componentRef.setInput('modelName', 'Test Studio Model');
    fixture.componentRef.setInput('modelHandle', '@test.studio.model');
    if (render) fixture.detectChanges();
    return { fixture, element: fixture.nativeElement as HTMLElement };
  }

  it('plays the tapped clip and offers every playback control', () => {
    const playSpy = vi
      .spyOn(HTMLMediaElement.prototype, 'play')
      .mockImplementation(() => Promise.resolve());
    const { fixture, element } = open(0, false);
    fixture.detectChanges();
    const video = element.querySelector('video');

    expect(video?.getAttribute('src')).toBe(clips[0].src);
    // The player draws its own controls, so the browser's are switched off.
    expect(video?.hasAttribute('controls')).toBe(false);

    const labels = Array.from(element.querySelectorAll('[aria-label]')).map((node) =>
      node.getAttribute('aria-label'),
    );
    // Play/pause share one control, so it reads as "Pause video" while the clip is running.
    expect(labels.some((label) => /^(Play|Pause) video$/.test(label ?? ''))).toBe(true);
    expect(labels).toContain('Stop video');
    expect(labels).toContain('Seek within the clip');
    expect(labels).toContain('Volume');
    expect(labels).toContain('Playback speed');
    expect(labels).toContain('Play full screen');
    expect(element.querySelectorAll('.player-speed option').length).toBeGreaterThan(1);

    const download = element.querySelector<HTMLAnchorElement>('.player-download');
    expect(download?.getAttribute('href')).toBe(clips[0].src);
    expect(download?.hasAttribute('download')).toBe(true);
    expect(download?.getAttribute('download')).toBe('clip-1.mp4');
    expect(download?.getAttribute('type')).toBe('video/mp4');

    // Play and pause share one control; the label follows what the clip is actually doing.
    const toggle = Array.from(element.querySelectorAll<HTMLButtonElement>('.player-control')).find(
      (button) => /^(Play|Pause) video$/.test(button.getAttribute('aria-label') ?? ''),
    );
    expect(toggle, 'play/pause control').toBeTruthy();

    // Whatever the autoplay policy decides, the big badge is there to start the clip by hand.
    const badge = element.querySelector<HTMLButtonElement>('.player-big-play');
    expect(badge?.textContent).toContain('Play');

    playSpy.mockClear();
    badge!.click();
    expect(playSpy).toHaveBeenCalled();

    playSpy.mockRestore();
  });

  it('plays the tapped clip on open, then pauses, resumes and stops', () => {
    const playSpy = vi
      .spyOn(HTMLMediaElement.prototype, 'play')
      .mockImplementation(() => Promise.resolve());
    const pauseSpy = vi
      .spyOn(HTMLMediaElement.prototype, 'pause')
      .mockImplementation(() => undefined);

    try {
      const { fixture, element } = open();
      const video = element.querySelector('video') as HTMLVideoElement;
      const player = fixture.componentInstance as unknown as {
        pause(): void;
        play(): void;
        stop(): void;
      };

      // Opening the player starts the tapped clip on its own.
      expect(playSpy).toHaveBeenCalled();

      player.pause();
      expect(pauseSpy).toHaveBeenCalled();

      const playsBeforeResume = playSpy.mock.calls.length;
      player.play();
      expect(playSpy.mock.calls.length).toBe(playsBeforeResume + 1);

      video.currentTime = 42;
      player.stop();
      expect(pauseSpy.mock.calls.length).toBeGreaterThan(1);
      expect(video.currentTime).toBe(0);
    } finally {
      playSpy.mockRestore();
      pauseSpy.mockRestore();
    }
  });

  it('keeps the counter, volume and speed in step with the clip', () => {
    const { fixture, element } = open();
    const counter = () => element.querySelector('.player-counter')?.textContent?.trim();

    expect(counter()).toBe('01 / 02');

    (element.querySelector('.player-next') as HTMLButtonElement).click();
    fixture.detectChanges();

    const switched = element.querySelector('video') as HTMLVideoElement;
    expect(switched.getAttribute('src')).toBe(clips[1].src);
    expect(counter()).toBe('02 / 02');

    (element.querySelector('.player-prev') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(element.querySelector('video')?.getAttribute('src')).toBe(clips[0].src);
    expect(counter()).toBe('01 / 02');

    const video = element.querySelector('video') as HTMLVideoElement;
    const volume = element.querySelector<HTMLInputElement>('.player-volume');
    expect(volume?.value).toBe('100');
    volume!.value = '40';
    volume!.dispatchEvent(new Event('input'));
    expect(video.volume).toBeCloseTo(0.4);

    const speed = element.querySelector<HTMLSelectElement>('.player-speed select');
    speed!.value = '1.5';
    speed!.dispatchEvent(new Event('change'));
    expect(video.playbackRate).toBe(1.5);
  });

  it('falls back to muted playback when the browser refuses sound', async () => {
    const refusal = Object.assign(new Error('play() failed'), { name: 'NotAllowedError' });
    const playSpy = vi.spyOn(HTMLMediaElement.prototype, 'play').mockRejectedValueOnce(refusal);

    try {
      const { fixture, element } = open();
      const video = element.querySelector('video') as HTMLVideoElement;

      // The refused attempt is retried muted, so the clip plays in the pop-up either way.
      await Promise.resolve();
      await Promise.resolve();
      fixture.detectChanges();

      expect(playSpy.mock.calls.length).toBeGreaterThan(1);
      expect(video.muted).toBe(true);

      const note = element.querySelector('.player-muted-note') as HTMLButtonElement;
      expect(note?.textContent).toContain('muted');

      // One tap on the note (or the speaker) brings the sound back.
      note.click();
      fixture.detectChanges();
      expect(video.muted).toBe(false);
      expect(element.querySelector('.player-muted-note')).toBeNull();
    } finally {
      playSpy.mockRestore();
    }
  });

  it('closes with the ✕ button, Escape and reports it to the portfolio', () => {
    const { fixture, element } = open();
    const closed = vi.fn();
    fixture.componentInstance.closed.subscribe(closed);

    (element.querySelector('.player-close') as HTMLButtonElement).click();
    expect(closed).toHaveBeenCalledTimes(1);

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(closed).toHaveBeenCalledTimes(2);
  });

  it('only puts on its full-screen looks when the browser grants full screen', async () => {
    const { fixture, element } = open();
    const panel = element.querySelector('.player-panel') as HTMLElement;
    const button = element.querySelector('.player-fullscreen') as HTMLButtonElement;

    // A browser that refuses the request (a sandboxed frame, a locked screen) must not flip the
    // player into its immersive looks — the bar and the foot have to stay reachable.
    Object.assign(panel, { requestFullscreen: () => Promise.reject(new Error('denied')) });
    button.click();
    await Promise.resolve();
    await Promise.resolve();
    fixture.detectChanges();
    expect(panel.classList.contains('is-fullscreen')).toBe(false);

    // A browser that grants it flips the player into its immersive full-viewport layout while
    // retaining the bar, transport controls and clip tools.
    Object.assign(panel, { requestFullscreen: () => Promise.resolve() });
    button.click();
    await Promise.resolve();
    await Promise.resolve();
    fixture.detectChanges();
    expect(panel.classList.contains('is-fullscreen')).toBe(true);
  });

  it('formats the readouts for short and long clips', () => {
    expect(formatTime(0)).toBe('0:00');
    expect(formatTime(5.4)).toBe('0:05');
    expect(formatTime(65)).toBe('1:05');
    expect(formatTime(3725)).toBe('1:02:05');
    expect(formatTime(Number.NaN)).toBe('0:00');
  });
});

describe('AiModelPortfolioPage video reel', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AiModelPortfolioPage],
      providers: [provideRouter(testRoutes)],
    }).compileComponents();
  });

  it('shows a tile per clip in the album video folder, under the personal details', async () => {
    const profile = withPhotos(2, 3);
    const harness = await openPortfolio(profile.slug);
    const element = harness.routeNativeElement as HTMLElement;

    try {
      const reel = element.querySelector('.video-section');
      expect(reel).not.toBeNull();

      // The reel sits below the profile header (the personal details) and above the gallery.
      const sections = Array.from(
        element.querySelectorAll('.profile-header, .video-section, .gallery-section'),
      );
      expect(sections.map((section) => section.className.split(' ')[0])).toEqual([
        'profile-header',
        'video-section',
        'gallery-section',
      ]);

      // The reel names the album folder the clips are read from.
      expect(reel?.textContent).toContain('TestStudioModel');
      expect(reel?.textContent).toContain('video');
      expect(element.querySelector('.video-count')?.textContent).toContain('3');

      const tiles = element.querySelectorAll('.video-tile');
      expect(tiles.length).toBe(3);
      const preview = tiles[0].querySelector('video');
      expect(preview?.getAttribute('src')).toContain(profile.videos[0].src);
      expect(preview?.hasAttribute('autoplay')).toBe(false);
      expect(preview?.hasAttribute('loop')).toBe(false);
      expect(tiles[0].getAttribute('aria-label')).toContain('Play');
      expect(element.textContent).toContain('Studio reel');

      const stats = Array.from(element.querySelectorAll('.profile-stats dt')).map((term) =>
        term.textContent?.trim(),
      );
      expect(stats).toContain('Videos');
    } finally {
      release(profile);
    }
  });

  it('opens the player on the tapped clip and closes it again', async () => {
    const profile = withPhotos(1, 2);
    const harness = await openPortfolio(profile.slug);
    const element = harness.routeNativeElement as HTMLElement;

    try {
      expect(element.querySelector('app-ai-model-video-player')).toBeNull();

      const tile = element.querySelectorAll<HTMLButtonElement>('.video-tile')[1];
      tile.focus();
      tile.click();
      harness.detectChanges();

      const player = element.querySelector('app-ai-model-video-player');
      expect(player).not.toBeNull();
      expect(player?.querySelector('video')?.getAttribute('src')).toBe(profile.videos[1].src);
      expect(player?.querySelector('.player-counter')?.textContent?.trim()).toBe('02 / 02');
      expect(document.body.style.overflow).toBe('hidden');

      (player?.querySelector('.player-close') as HTMLButtonElement).click();
      harness.detectChanges();

      expect(element.querySelector('app-ai-model-video-player')).toBeNull();
      expect(document.body.style.overflow).toBe('');
      expect(document.activeElement?.classList.contains('video-tile')).toBe(true);
    } finally {
      release(profile);
    }
  });

  it('opens the player for the first clip too, where the index is zero', async () => {
    const profile = withPhotos(1, 2);
    const harness = await openPortfolio(profile.slug);
    const element = harness.routeNativeElement as HTMLElement;

    try {
      // Index 0 is falsy — the pop-up must not be skipped because of that.
      element.querySelectorAll<HTMLButtonElement>('.video-tile')[0].click();
      harness.detectChanges();

      const player = element.querySelector('app-ai-model-video-player');
      expect(player, 'player for the first clip').not.toBeNull();
      expect(player?.querySelector('video')?.getAttribute('src')).toBe(profile.videos[0].src);
      expect(player?.querySelector('.player-counter')?.textContent?.trim()).toBe('01 / 02');
    } finally {
      release(profile);
    }
  });

  it('leaves the reel out for a model whose video folder is still empty', async () => {
    const profile = withPhotos(2, 0);
    const harness = await openPortfolio(profile.slug);
    const element = harness.routeNativeElement as HTMLElement;

    try {
      expect(element.querySelector('.video-section')).toBeNull();
      expect(element.querySelectorAll('.video-tile').length).toBe(0);
      expect(element.querySelectorAll('.grid-tile').length).toBe(2);
    } finally {
      release(profile);
    }
  });

  it('publishes every clip the album video folder holds', () => {
    for (const profile of aiModelProfiles) {
      for (const clip of profile.videos) {
        expect(clip.src).toContain(`/NeverBeenModels/${profile.album}/video/`);
        expect(clip.fileName.length).toBeGreaterThan(0);
        expect(clip.type.startsWith('video/')).toBe(true);
      }
    }
  });
});
