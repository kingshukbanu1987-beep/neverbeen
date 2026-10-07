import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { of } from 'rxjs';
import { AiModelProfile, aiModelProfiles } from './ai-model-data';
import { AiModelPortfolioPage, shufflePhotos } from './ai-model-portfolio';
import { AiModelVideoPlayer, formatTime } from './video/ai-model-video-player';

const testRoutes = [
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
describe('AiModelPortfolioPage photo shuffle', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AiModelPortfolioPage],
      providers: [
        provideRouter([]),
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
