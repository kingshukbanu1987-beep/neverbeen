import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { AiModelProfile, aiModelProfiles } from './ai-model-data';
import { AiModelPortfolioPage } from './ai-model-portfolio';

const testRoutes = [
  {
    path: 'ai-models/:slug',
    component: AiModelPortfolioPage,
  },
];

/** Builds a temporary portfolio so multi-photograph behaviour can be exercised. */
function withPhotos(count: number): AiModelProfile {
  const photos = Array.from({ length: count }, (_, index) => ({
    src: `/NeverBeenModels/TestStudioModel/frame-${index + 1}.jpg`,
    caption: index === 0 ? 'Studio cover frame' : `Frame ${index + 1} caption`,
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
    handle: '@test.studio.model',
    tags: ['Editorial', 'Campaign'],
    availability: 'Open for bookings',
    bio: 'A temporary portfolio used by the unit test suite.',
    illustrative: true,
    gallery: photos.slice(1).map((photo) => photo.src),
    photos,
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

describe('AiModelPortfolioPage', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AiModelPortfolioPage],
      providers: [provideRouter(testRoutes)],
    }).compileComponents();
  });

  it('shows the model details and one Instagram-style tile per album photograph', async () => {
    const profile = withPhotos(3);
    const harness = await openPortfolio(profile.slug);
    const element = harness.routeNativeElement as HTMLElement;

    try {
      expect(element.querySelector('h1')?.textContent?.trim()).toBe('Test Studio Model');
      expect(element.textContent).toContain('@test.studio.model');
      expect(element.textContent).toContain('Open for bookings');
      expect(element.textContent).toContain('170 cm');

      const tiles = element.querySelectorAll('.grid-tile');
      expect(tiles.length).toBe(3);
      expect(tiles[0].querySelector('img')?.getAttribute('src')).toBe(profile.photos[0].src);
      expect(tiles[0].getAttribute('aria-label')).toContain('portfolio photograph 1');

      const tags = Array.from(element.querySelectorAll('.tag-list li')).map((tag) =>
        tag.textContent?.trim(),
      );
      expect(tags).toEqual(['Editorial', 'Campaign']);
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
      tile.focus();
      tile.click();
      harness.detectChanges();

      const lightbox = element.querySelector('.lightbox');
      expect(lightbox).not.toBeNull();
      expect(lightbox?.getAttribute('aria-modal')).toBe('true');
      expect(lightbox?.querySelector('.lightbox-image')?.getAttribute('src')).toBe(
        profile.photos[1].src,
      );
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
      expect(element.querySelector('.lightbox-image')?.getAttribute('src')).toBe(
        profile.photos[2].src,
      );
    } finally {
      release(profile);
    }
  });

  it('jumps to a photograph from the thumbnail strip and the arrow buttons', async () => {
    const profile = withPhotos(4);
    const harness = await openPortfolio(profile.slug);
    const element = harness.routeNativeElement as HTMLElement;

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
      expect(element.querySelector('.lightbox-image')?.getAttribute('src')).toBe(
        profile.photos[3].src,
      );

      (element.querySelector('.lightbox-prev') as HTMLButtonElement).click();
      harness.detectChanges();
      expect(element.querySelector('.lightbox-image')?.getAttribute('src')).toBe(
        profile.photos[2].src,
      );
    } finally {
      release(profile);
    }
  });

  it('switches between the grid and feed layouts, keeping captions in the feed', async () => {
    const profile = withPhotos(2);
    const harness = await openPortfolio(profile.slug);
    const element = harness.routeNativeElement as HTMLElement;

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
      expect(feedItems[0].textContent).toContain('Studio cover frame');

      element.querySelector<HTMLButtonElement>('.feed-photo')?.click();
      harness.detectChanges();
      expect(element.querySelector('.lightbox')).not.toBeNull();
    } finally {
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
      expect(profile.photos.length, `${profile.name} photographs`).toBeGreaterThan(0);
      expect(profile.photos[0].src).toContain(`/NeverBeenModels/${profile.album}/`);
    }

    const nourhan = aiModelProfiles.find((profile) => profile.slug === 'nourhan-durrani');
    expect(nourhan).toBeTruthy();
    expect(nourhan?.album).toBe('NourhanDurrani');
    expect(nourhan?.handle).toBe('@nourhan.durrani');
    expect(nourhan?.tags.length).toBeGreaterThan(0);
  });
});
