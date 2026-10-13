import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { ModelMediaEngagementService } from '../../../services/model-media-engagement.service';
import { compactCount, exactCount } from '../../../shared/exact-count-popover';
import { AiModelProfile, aiModelProfiles } from '../ai-model-data';
import { AiModelAllPhotosPage } from './ai-model-all-photos';

@Component({ template: '<p class="portfolio-stub">Portfolio</p>' })
class PortfolioStub {}

/**
 * Builds a temporary model so the album page can be exercised with any number of photographs —
 * and, when asked, with clips too, because the seen total covers the whole model's media.
 */
function withPhotos(count: number, videoCount = 0): AiModelProfile {
  const photos = Array.from({ length: count }, (_, index) => ({
    src: `/NeverBeenModels/TestAlbumModel/frame-${index + 1}.jpg`,
    caption: `Frame ${index + 1} caption`,
  }));
  const videos = Array.from({ length: videoCount }, (_, index) => ({
    src: `/NeverBeenModels/TestAlbumModel/video/clip-${index + 1}.mp4`,
    fileName: `clip-${index + 1}.mp4`,
    caption: `Clip ${index + 1} caption`,
    poster: '',
    type: 'video/mp4',
  }));
  const profile: AiModelProfile = {
    slug: 'test-album-model',
    name: 'Test Album Model',
    cover: photos[0]?.src ?? '',
    album: 'TestAlbumModel',
    location: 'Valletta, Malta',
    age: '27',
    height: '172 cm',
    weight: '57 kg',
    bodyShape: 'Hourglass',
    bust: '86 cm',
    waist: '63 cm',
    hip: '91 cm',
    handle: '@test.album.model',
    tags: ['Editorial'],
    availability: 'Open for bookings',
    order: 98,
    photoRate: 500,
    photoNote: 'Rates are in INR per photograph.',
    bio: 'A temporary album used by the unit test suite.',
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

describe('AiModelAllPhotosPage', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      providers: [
        provideRouter([
          { path: 'ai-models/:slug/photos', component: AiModelAllPhotosPage },
          { path: 'ai-models/:slug', component: PortfolioStub },
        ]),
      ],
    }).compileComponents();
  });

  async function openAlbum(slug: string): Promise<RouterTestingHarness> {
    const harness = await RouterTestingHarness.create(`/ai-models/${slug}/photos`);
    harness.detectChanges();
    await harness.fixture.whenStable();
    harness.detectChanges();
    return harness;
  }

  it('lays out every photograph of the album in a mosaic of differently sized tiles', async () => {
    const profile = withPhotos(20);
    const harness = await openAlbum(profile.slug);
    const element = harness.routeNativeElement as HTMLElement;

    try {
      expect(element.querySelector('h1')?.textContent?.trim()).toBe('Test Album Model');

      // The headline row counts how often the model's media has been seen, not her photographs.
      const albumStats = element.querySelector('.album-count')!;
      const labels = Array.from(albumStats.querySelectorAll<HTMLElement>('.album-count-label')).map(
        (label) => label.textContent?.trim(),
      );
      expect(labels).toEqual(['Seen', 'Likes', 'Comments', 'Shares']);
      expect(albumStats.textContent).not.toContain('Photograph');

      const tiles = Array.from(element.querySelectorAll<HTMLElement>('.mosaic-tile'));
      expect(tiles.length).toBe(20);

      // The whole album, in its own order — the cover opens the mosaic.
      const shown = tiles.map((tile) => tile.querySelector('img')?.getAttribute('src'));
      expect(shown).toEqual(profile.photos.map((photo) => photo.src));

      // Each tile's cell knows where it sits in every layout, and the tiles come in several sizes.
      const cells = Array.from(element.querySelectorAll<HTMLElement>('.mosaic-cell'));
      expect(cells.length).toBe(20);
      const desktopSpans = new Set(
        cells.map(
          (cell) =>
            `${cell.style.getPropertyValue('--c4').split('span')[1]}x${
              cell.style.getPropertyValue('--r4').split('span')[1]
            }`,
        ),
      );
      expect(desktopSpans.size).toBeGreaterThanOrEqual(3);
      expect(cells[0].style.getPropertyValue('--c4')).toBe('1 / span 3');
      expect(cells[0].style.getPropertyValue('--c2')).not.toBe('');
      expect(cells[0].style.getPropertyValue('--r3')).not.toBe('');

      // Photographs near the top load at once, the rest lazily.
      expect(tiles[0].querySelector('img')?.getAttribute('loading')).toBe('eager');
      expect(tiles[19].querySelector('img')?.getAttribute('loading')).toBe('lazy');
    } finally {
      release(profile);
    }
  });

  it('shows seen, likes, comments and shares across the whole model in one four-stat row', async () => {
    const profile = withPhotos(5, 2);
    const harness = await openAlbum(profile.slug);
    const element = harness.routeNativeElement as HTMLElement;
    const engagement = TestBed.inject(ModelMediaEngagementService);

    try {
      await engagement.loadStats(profile.slug);
      harness.detectChanges();

      const albumStats = element.querySelector('.album-count')!;
      const labels = Array.from(albumStats.querySelectorAll<HTMLElement>('.album-count-label')).map(
        (label) => label.textContent?.trim(),
      );
      expect(labels).toEqual(['Seen', 'Likes', 'Comments', 'Shares']);
      expect(albumStats.querySelectorAll('.album-stat').length).toBe(4);

      // The seen figure covers the album's photographs *and* the model's clips.
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
      const values = Array.from(
        albumStats.querySelectorAll<HTMLElement>('.album-count-number'),
      ).map((value) => value.textContent?.trim());

      expect(values).toEqual([
        compactCount(expectedTotals.seen),
        compactCount(expectedTotals.likes),
        compactCount(expectedTotals.comments),
        compactCount(expectedTotals.shares),
      ]);

      const seen = albumStats.querySelector<HTMLButtonElement>('.album-stat-seen .compact-count')!;
      seen.click();
      harness.detectChanges();
      expect(element.querySelector('.ecp-card')?.textContent?.trim()).toBe(
        exactCount(expectedTotals.seen),
      );
    } finally {
      release(profile);
    }
  });

  it('keeps a floating button that leads back to the portfolio gallery', async () => {
    const profile = withPhotos(14);
    const harness = await openAlbum(profile.slug);
    const element = harness.routeNativeElement as HTMLElement;

    try {
      const back = element.querySelector<HTMLAnchorElement>('.album-dock .dock-link')!;
      expect(back).not.toBeNull();
      expect(back.textContent).toContain('Back to portfolio');
      expect(back.textContent).toContain('Test Album Model');
      expect(back.getAttribute('href')).toBe('/ai-models/test-album-model#photos');

      back.click();
      await harness.fixture.whenStable();
      harness.detectChanges();
      expect(harness.routeNativeElement?.querySelector('.portfolio-stub')).not.toBeNull();
    } finally {
      release(profile);
    }
  });

  it('opens any photograph in the zoomable viewer, browsing the whole album', async () => {
    const profile = withPhotos(20);
    const harness = await openAlbum(profile.slug);
    const element = harness.routeNativeElement as HTMLElement;

    try {
      const tile = element.querySelectorAll<HTMLButtonElement>('.mosaic-tile')[4];
      tile.focus();
      tile.click();
      harness.detectChanges();
      await harness.fixture.whenStable();
      harness.detectChanges();

      const viewer = element.querySelector('.lightbox');
      expect(viewer?.getAttribute('aria-modal')).toBe('true');
      expect(
        element.querySelector('.lightbox-counter')?.textContent?.replace(/\s+/g, ' ').trim(),
      ).toBe('05 / 20');
      expect(element.querySelector('.lightbox-image')?.getAttribute('src')).toBe(
        profile.photos[4].src,
      );
      expect(element.querySelector('.zoom-dock')).not.toBeNull();
      expect(element.querySelectorAll('.lightbox-thumb').length).toBe(20);
      // The album page already shows every photograph, so there is no "View all" link here.
      expect(element.querySelector('.viewer-album-link')).toBeNull();
      expect(document.body.style.overflow).toBe('hidden');

      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      harness.detectChanges();
      await harness.fixture.whenStable();
      harness.detectChanges();

      expect(element.querySelector('.lightbox')).toBeNull();
      expect(document.body.style.overflow).toBe('');
      expect(document.activeElement).toBe(tile);
    } finally {
      release(profile);
    }
  });

  it('fades each tile in once its photograph has loaded', async () => {
    const profile = withPhotos(3);
    const harness = await openAlbum(profile.slug);
    const element = harness.routeNativeElement as HTMLElement;

    try {
      const tile = element.querySelector<HTMLElement>('.mosaic-tile')!;
      expect(tile.classList.contains('is-settled')).toBe(false);
      tile.querySelector('img')!.dispatchEvent(new Event('load'));
      harness.detectChanges();
      expect(tile.classList.contains('is-settled')).toBe(true);

      // A photograph that fails to load still drops its shimmer.
      const broken = element.querySelectorAll<HTMLElement>('.mosaic-tile')[2];
      broken.querySelector('img')!.dispatchEvent(new Event('error'));
      harness.detectChanges();
      expect(broken.classList.contains('is-settled')).toBe(true);
    } finally {
      release(profile);
    }
  });

  it('explains where photographs go while the album is still empty', async () => {
    const profile = withPhotos(0);
    const harness = await openAlbum(profile.slug);
    const element = harness.routeNativeElement as HTMLElement;

    try {
      expect(element.querySelectorAll('.mosaic-tile').length).toBe(0);
      expect(element.querySelector('.album-pending')?.textContent).toContain(
        'public/NeverBeenModels/TestAlbumModel',
      );
      expect(element.querySelector('.album-dock')).not.toBeNull();
    } finally {
      release(profile);
    }
  });

  it('shows a friendly not-found state for an unknown model', async () => {
    const harness = await openAlbum('nobody-by-this-name');
    const element = harness.routeNativeElement as HTMLElement;

    expect(element.querySelector('.album-not-found h1')?.textContent).toContain('out of frame');
    expect(element.querySelector('.album-directory-link')?.getAttribute('href')).toBe('/ai-models');
    expect(element.querySelector('.album-dock')).toBeNull();
  });
});
