import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AiModelHighlight, AiModelHighlightItem } from '../ai-model-data';
import { HIGHLIGHT_PHOTO_DURATION_MS, HighlightViewer } from './highlight-viewer';

function photo(name: string, caption = ''): AiModelHighlightItem {
  return {
    kind: 'photo',
    src: `/NeverBeenModels/TestStudioModel/Highlights/${name}.jpg`,
    type: '',
    poster: '',
    caption,
  };
}

const highlights: AiModelHighlight[] = [
  {
    id: 'shiraz-diaries',
    name: 'Shiraz Diaries',
    cover: '/NeverBeenModels/TestStudioModel/Highlights/01-evening-light.jpg',
    music: '/NeverBeenModels/TestStudioModel/Highlights/shiraz.mp3',
    items: [
      photo('01-evening-light', 'The last light on the Eram rooftops.'),
      photo('02-city-walk'),
      photo('03-golden-hour'),
    ],
    photoCount: 3,
    videoCount: 0,
  },
  {
    id: 'motion',
    name: 'Motion',
    cover: '/NeverBeenModels/TestStudioModel/Highlights/04-runway.jpg',
    music: '',
    items: [
      {
        kind: 'video',
        src: '/NeverBeenModels/TestStudioModel/Highlights/05-film.mp4',
        type: 'video/mp4',
        poster: '/NeverBeenModels/TestStudioModel/Highlights/05-film.jpg',
        caption: 'Six seconds of movement.',
      },
      photo('06-runway'),
    ],
    photoCount: 1,
    videoCount: 1,
  },
];

@Component({
  imports: [HighlightViewer],
  template: `
    <app-highlight-viewer
      [highlights]="highlights"
      [startIndex]="startIndex"
      modelName="Test Studio Model"
      modelHandle="@test.studio.model"
      modelCover="/NeverBeenModels/TestStudioModel/cover.jpg"
      fallbackMusic="/NeverBeenModels/TestStudioModel/theme.mp3"
      (closed)="closed = closed + 1"
    />
  `,
})
class ViewerHost {
  readonly highlights = highlights;
  readonly startIndex = 0;
  closed = 0;
}

describe('HighlightViewer', () => {
  let fixture: ComponentFixture<ViewerHost>;
  let element: HTMLElement;

  beforeEach(async () => {
    // jsdom has no media engine: the player's own calls are spied on, and the story's clock is the
    // only thing these tests need.
    vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue(undefined);
    vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => undefined);
    vi.spyOn(HTMLMediaElement.prototype, 'load').mockImplementation(() => undefined);

    await TestBed.configureTestingModule({ imports: [ViewerHost] }).compileComponents();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    document.body.style.overflow = '';
  });

  /** Opens the viewer with the story clock under the test's control. */
  function open(): void {
    vi.useFakeTimers();
    fixture = TestBed.createComponent(ViewerHost);
    element = fixture.nativeElement as HTMLElement;
    fixture.detectChanges();
  }

  const stage = () => element.querySelector<HTMLElement>('.story-stage');
  const surface = () => element.querySelector<HTMLElement>('.story-surface')!;
  const frames = () => Array.from(element.querySelectorAll<HTMLElement>('.story-media'));
  const image = () => element.querySelector<HTMLImageElement>('.story-media')!;
  const segments = () => Array.from(element.querySelectorAll<HTMLElement>('.story-segment'));
  const music = () => element.querySelector<HTMLAudioElement>('audio');
  const closed = () => fixture.componentInstance.closed;

  function pointer(type: 'pointerdown' | 'pointerup', x = 120, y = 420): void {
    surface().dispatchEvent(
      new PointerEvent(type, {
        pointerId: 1,
        pointerType: 'touch',
        isPrimary: true,
        clientX: x,
        clientY: y,
        button: 0,
        bubbles: true,
        cancelable: true,
      }),
    );
    fixture.detectChanges();
  }

  function tap(): void {
    pointer('pointerdown');
    pointer('pointerup');
  }

  it('opens in a portrait stage with the highlight, its first story and its music', () => {
    open();
    expect(stage()).not.toBeNull();
    expect(stage()?.classList.contains('story-stage')).toBe(true);
    expect(image().getAttribute('src')).toContain('01-evening-light.jpg');
    expect(segments().length).toBe(3);
    expect(element.querySelector('.story-identity-copy strong')?.textContent?.trim()).toBe(
      'Shiraz Diaries',
    );
    expect(element.querySelector('.story-sub')?.textContent).not.toContain('Never expires');
    expect(element.querySelector('.story-identity-copy strong')?.textContent).toContain('Shiraz Diaries');
    expect(element.querySelector('.story-sub')?.textContent).toContain('Test Studio Model');
    expect(element.querySelector('.story-caption')?.textContent).toContain(
      'The last light on the Eram rooftops.',
    );
    expect(music()?.getAttribute('src')).toBe(
      '/NeverBeenModels/TestStudioModel/Highlights/shiraz.mp3',
    );
    expect(element.querySelector('.story-sound')?.textContent).toContain('Soundtrack');
    expect(document.body.style.overflow).toBe('hidden');
  });

  it('has no likes, comments, seen counts, shares or downloads', () => {
    open();
    const text = element.textContent ?? '';
    expect(text).not.toMatch(/\blikes?\b/i);
    expect(text).not.toMatch(/\bcomments?\b/i);
    expect(text).not.toMatch(/\bshares?\b/i);
    expect(text).not.toMatch(/\bseen\b/i);
    expect(text).not.toMatch(/\bdownload/i);
    expect(element.querySelector('[aria-label*="like" i]')).toBeNull();
    expect(element.querySelector('[aria-label*="comment" i]')).toBeNull();
    expect(element.querySelector('[aria-label*="share" i]')).toBeNull();
  });

  it('moves to the next photograph after four seconds', () => {
    open();
    expect(image().getAttribute('src')).toContain('01-evening-light.jpg');

    vi.advanceTimersByTime(HIGHLIGHT_PHOTO_DURATION_MS - 100);
    fixture.detectChanges();
    expect(image().getAttribute('src')).toContain('01-evening-light.jpg');

    vi.advanceTimersByTime(100);
    fixture.detectChanges();
    expect(image().getAttribute('src')).toContain('02-city-walk.jpg');

    vi.advanceTimersByTime(HIGHLIGHT_PHOTO_DURATION_MS);
    fixture.detectChanges();
    expect(image().getAttribute('src')).toContain('03-golden-hour.jpg');
    expect(element.querySelectorAll('.story-segment.is-done').length).toBe(2);
  });

  it('jumps to the next story when the content is tapped', () => {
    open();
    tap();
    expect(image().getAttribute('src')).toContain('02-city-walk.jpg');

    tap();
    expect(image().getAttribute('src')).toContain('03-golden-hour.jpg');
    expect(element.querySelector('.story-counter')?.textContent?.trim()).toBe('3 / 3');

    // The last frame hands over to the next highlight.
    tap();
    expect(element.querySelector('.story-identity-copy strong')?.textContent?.trim()).toBe(
      'Motion',
    );
    expect(element.querySelector('video.story-media')?.getAttribute('src')).toContain(
      '05-film.mp4',
    );
  });

  it('pauses while a story is held and resumes without advancing', () => {
    open();
    pointer('pointerdown');
    vi.advanceTimersByTime(300);
    fixture.detectChanges();
    expect(stage()?.classList.contains('is-paused')).toBe(true);
    expect(element.querySelector('[aria-label="Play the highlight"]')).not.toBeNull();

    // The clock stands still while held.
    vi.advanceTimersByTime(HIGHLIGHT_PHOTO_DURATION_MS * 2);
    fixture.detectChanges();
    expect(image().getAttribute('src')).toContain('01-evening-light.jpg');

    pointer('pointerup');
    expect(stage()?.classList.contains('is-paused')).toBe(false);
    expect(image().getAttribute('src')).toContain('01-evening-light.jpg');

    // …and it carries on from the moment it stopped.
    vi.advanceTimersByTime(HIGHLIGHT_PHOTO_DURATION_MS);
    fixture.detectChanges();
    expect(image().getAttribute('src')).toContain('02-city-walk.jpg');
  });

  it('plays a clip for its own duration and follows it with the next frame', () => {
    open();
    tap();
    tap();
    tap();
    const video = element.querySelector<HTMLVideoElement>('video.story-media')!;
    expect(video).not.toBeNull();
    expect(video.muted).toBe(true);
    expect(video.hasAttribute('playsinline')).toBe(true);

    // The clip's own progress follows its time; its `ended` event hands over to the next frame.
    Object.defineProperty(video, 'duration', { configurable: true, value: 6 });
    Object.defineProperty(video, 'currentTime', { configurable: true, value: 3 });
    video.dispatchEvent(new Event('timeupdate'));
    fixture.detectChanges();
    expect(element.querySelector('.story-counter')?.textContent?.trim()).toBe('1 / 2');

    video.dispatchEvent(new Event('ended'));
    fixture.detectChanges();
    expect(image().getAttribute('src')).toContain('06-runway.jpg');

    tap();
    expect(closed()).toBe(1);
  });

  it('borrows the album preview music when a highlight has no soundtrack of its own', () => {
    open();
    tap();
    tap();
    tap();
    expect(music()?.getAttribute('src')).toBe('/NeverBeenModels/TestStudioModel/theme.mp3');
  });

  it('mutes and unmutes the soundtrack from the header', () => {
    open();
    const mute = () =>
      (element.querySelector<HTMLButtonElement>('[aria-label="Mute the music"]') ??
        element.querySelector<HTMLButtonElement>('[aria-label="Turn the music on"]'))!;

    mute().click();
    fixture.detectChanges();
    expect(music()?.muted).toBe(true);
    expect(element.querySelector('[aria-label="Turn the music on"]')).not.toBeNull();

    mute().click();
    fixture.detectChanges();
    expect(music()?.muted).toBe(false);
  });

  it('closes on Escape and restores the page scroll', () => {
    open();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    fixture.detectChanges();
    expect(closed()).toBe(1);
    expect(document.body.style.overflow).toBe('');
  });

  it('steps through the stories with the arrow keys and the progress bar', () => {
    open();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    fixture.detectChanges();
    expect(image().getAttribute('src')).toContain('02-city-walk.jpg');

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }));
    fixture.detectChanges();
    expect(image().getAttribute('src')).toContain('01-evening-light.jpg');

    segments()[2].click();
    fixture.detectChanges();
    expect(image().getAttribute('src')).toContain('03-golden-hour.jpg');
  });

  it('keeps exactly one frame mounted for the current story', () => {
    open();
    expect(frames().length).toBe(1);
    tap();
    expect(frames().length).toBe(1);
    expect(element.querySelectorAll('.story-grain').length).toBe(1);
  });
});
