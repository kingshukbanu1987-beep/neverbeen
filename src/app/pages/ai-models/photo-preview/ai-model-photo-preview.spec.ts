import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AiModelPhotoPreview } from './ai-model-photo-preview';
import { AiModelPhoto } from '../ai-model-data';

const photos: AiModelPhoto[] = Array.from({ length: 4 }, (_, i) => ({
  src: `/NeverBeenModels/Test/frame-${i}.jpg`,
  caption: '',
}));

class MockImage {
  static failures = new Set<string>();
  static pending = false;
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  decoding = '';
  decode = vi.fn().mockResolvedValue(undefined);
  set src(value: string) {
    if (!value || MockImage.pending) return;
    void Promise.resolve().then(() => {
      if (MockImage.failures.has(value)) this.onerror?.();
      else this.onload?.();
    });
  }
}

class MockAudio {
  static instances: MockAudio[] = [];
  loop = false;
  volume = 0;
  muted = false;
  onerror: (() => void) | null = null;
  play = vi.fn().mockResolvedValue(undefined);
  pause = vi.fn();
  load = vi.fn();
  removeAttribute = vi.fn();
  constructor(readonly src: string) {
    MockAudio.instances.push(this);
  }
}

class MockResizeObserver {
  static instances: MockResizeObserver[] = [];
  observe = vi.fn();
  disconnect = vi.fn();
  unobserve = vi.fn();
  constructor(readonly callback: () => void) {
    MockResizeObserver.instances.push(this);
  }
}

/**
 * jsdom lays nothing out, so the location plate has no width of its own to measure. This gives the
 * plate the width its one line would have at full size (`line`) and the caption the width a phone
 * would leave it (`room`), and keeps both honest as the plate's `--place-fit` scales it down.
 */
function stubWidths(widths: { line: number; room: number }): () => void {
  const proto = HTMLElement.prototype as unknown as Record<string, unknown>;
  const scroll = Object.getOwnPropertyDescriptor(proto, 'scrollWidth');
  const client = Object.getOwnPropertyDescriptor(proto, 'clientWidth');
  const fitOf = (node: HTMLElement) => Number(node.style.getPropertyValue('--place-fit')) || 1;

  Object.defineProperty(proto, 'scrollWidth', {
    configurable: true,
    get(this: HTMLElement) {
      return this.classList.contains('preview-place') ? Math.round(widths.line * fitOf(this)) : 0;
    },
  });
  Object.defineProperty(proto, 'clientWidth', {
    configurable: true,
    get(this: HTMLElement) {
      if (this.classList.contains('preview-caption')) return widths.room;
      if (this.classList.contains('preview-place')) {
        return Math.min(widths.room, Math.round(widths.line * fitOf(this)));
      }
      return 0;
    },
  });

  return () => {
    if (scroll) Object.defineProperty(proto, 'scrollWidth', scroll);
    else delete proto['scrollWidth'];
    if (client) Object.defineProperty(proto, 'clientWidth', client);
    else delete proto['clientWidth'];
  };
}

describe('AiModelPhotoPreview', () => {
  let fixture: ComponentFixture<AiModelPhotoPreview>;
  let component: AiModelPhotoPreview;
  let element: HTMLElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [AiModelPhotoPreview] }).compileComponents();
    vi.useFakeTimers();
    vi.stubGlobal('Image', MockImage);
    vi.stubGlobal('Audio', MockAudio);
    vi.stubGlobal('ResizeObserver', MockResizeObserver);
    vi.spyOn(document, 'hidden', 'get').mockReturnValue(false);
    MockImage.failures.clear();
    MockImage.pending = false;
    MockAudio.instances = [];
    MockResizeObserver.instances = [];
    fixture = TestBed.createComponent(AiModelPhotoPreview);
    component = fixture.componentInstance;
    element = fixture.nativeElement;
    fixture.componentRef.setInput('photos', photos);
    fixture.componentRef.setInput('modelName', 'Test Model');
    fixture.componentRef.setInput('modelLocation', 'Shiraz, Iran');
    fixture.detectChanges();
  });

  afterEach(() => {
    fixture.destroy();
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    document.body.style.overflow = '';
  });

  async function render(): Promise<void> {
    for (let i = 0; i < 20; i++) await Promise.resolve();
    fixture.detectChanges();
  }

  function latest(): HTMLImageElement | null {
    return [...element.querySelectorAll<HTMLImageElement>('.preview-frame img')].at(-1) ?? null;
  }

  async function advance(ms: number): Promise<void> {
    await vi.advanceTimersByTimeAsync(ms);
    await render();
  }

  /** The caption grew or narrowed — the sound button arrived, the phone turned over. */
  async function resizeCaption(): Promise<void> {
    MockResizeObserver.instances.forEach((observer) => observer.callback());
    await render();
  }

  it('starts without music when none is configured and shows a decoded photograph', async () => {
    component.start();
    await render();
    expect(component.running()).toBe(true);
    expect(latest()?.getAttribute('src')).toMatch(/frame-/);
    expect(element.querySelector('.preview-status')).toBeNull();
    expect(element.querySelector('.preview-caption')?.textContent).toContain('Test Model');
    expect(MockAudio.instances).toHaveLength(0);
    expect(document.activeElement).toBe(element.querySelector('.end-preview'));
    expect(document.body.style.overflow).toBe('hidden');
  });

  it('plays the complete album exactly once per loop with alternating 4s / 5s zooms', async () => {
    component.start();
    await render();
    const rounds: string[][] = [[], []];
    let previous = '';
    for (let i = 0; i < 8; i++) {
      const image = latest()!;
      const src = image.getAttribute('src')!;
      expect(src).not.toBe(previous);
      expect(image.classList.contains('zoom-out')).toBe(i % 2 === 1);
      rounds[Math.floor(i / 4)].push(src);
      previous = src;
      await advance(i % 2 === 0 ? 4000 : 5000);
      expect(element.querySelectorAll('.preview-frame').length).toBeLessThanOrEqual(2);
    }
    for (const round of rounds) expect(new Set(round)).toEqual(new Set(photos.map((p) => p.src)));
  });

  it('preloads and crossfades without removing the outgoing photograph early', async () => {
    component.start();
    await render();
    const initial = latest()?.getAttribute('src');
    await advance(3999);
    expect(latest()?.getAttribute('src')).toBe(initial);
    await advance(1);
    expect(element.querySelectorAll('.preview-frame')).toHaveLength(2);
    expect(latest()?.getAttribute('src')).not.toBe(initial);
    await advance(800);
    expect(element.querySelectorAll('.preview-frame')).toHaveLength(1);
  });

  it('starts optional music synchronously at full volume and loops it independently', async () => {
    fixture.componentRef.setInput('musicSrc', '/NeverBeenModels/Test/Test%20Model.mp3');
    component.start();
    const audio = MockAudio.instances[0];
    expect(audio.src).toContain('Test%20Model.mp3');
    expect(audio.loop).toBe(true);
    expect(audio.volume).toBe(1);
    expect(audio.play).toHaveBeenCalledTimes(1);
    await render();
    element.querySelector<HTMLButtonElement>('.music-button')!.click();
    expect(audio.muted).toBe(true);
    await render();
    element.querySelector<HTMLButtonElement>('.music-button')!.click();
    expect(audio.muted).toBe(false);
    await advance(9000);
    expect(MockAudio.instances).toHaveLength(1);
    expect(audio.pause).not.toHaveBeenCalled();
  });

  it('silently continues when the MP3 cannot be loaded', async () => {
    fixture.componentRef.setInput('musicSrc', '/missing.mp3');
    component.start();
    await render();
    const audio = MockAudio.instances[0];
    audio.onerror!();
    await render();
    expect(element.querySelector('.music-button')).toBeNull();
    expect(audio.pause).toHaveBeenCalled();
    await advance(4000);
    expect(latest()).not.toBeNull();
  });

  it('offers a user-gesture retry if browser autoplay is blocked', async () => {
    fixture.componentRef.setInput('musicSrc', '/music.mp3');
    component.start();
    const audio = MockAudio.instances[0];
    // Reproduce a rejected resume request, followed by a successful explicit click.
    await render();
    element.querySelector<HTMLButtonElement>('.music-button')!.click();
    audio.play.mockRejectedValueOnce(new Error('NotAllowedError'));
    element.querySelector<HTMLButtonElement>('.music-button')!.click();
    await render();
    expect(element.querySelector('.music-button')?.getAttribute('aria-label')).toContain('Play');
    element.querySelector<HTMLButtonElement>('.music-button')!.click();
    await render();
    expect(element.querySelector('.music-button')?.getAttribute('aria-label')).toContain('Mute');
  });

  it('ends Preview, stops music, clears pending work, and restores scroll', async () => {
    document.body.style.overflow = 'clip';
    fixture.componentRef.setInput('musicSrc', '/music.mp3');
    component.start();
    await render();
    const audio = MockAudio.instances[0];
    element.querySelector<HTMLButtonElement>('.end-preview')!.click();
    await render();
    expect(component.running()).toBe(false);
    expect(element.querySelector('.photo-preview')).toBeNull();
    expect(audio.pause).toHaveBeenCalledOnce();
    expect(audio.removeAttribute).toHaveBeenCalledWith('src');
    expect(document.body.style.overflow).toBe('clip');
    await advance(20000);
    expect(element.querySelector('.photo-preview')).toBeNull();
  });

  it('ignores premium paths and duplicate URLs even when a caller supplies them', async () => {
    fixture.componentRef.setInput('photos', [
      photos[0],
      photos[0],
      {
        src: '/NeverBeenModels/Test/PremiumContent/secret.jpg',
        caption: '',
      },
    ]);
    component.start();
    await render();
    expect(latest()?.getAttribute('src')).toBe(photos[0].src);
    await advance(9000);
    expect(latest()?.getAttribute('src')).toBe(photos[0].src);
  });

  it('skips failed images and exits loading with an error if all images fail', async () => {
    photos.forEach((p) => MockImage.failures.add(p.src));
    component.start();
    await render();
    expect(element.querySelector('.preview-status')?.textContent).toContain('couldn’t be loaded');
    expect(latest()).toBeNull();
    expect(element.querySelector('.end-preview')).not.toBeNull();
  });

  it('does not resurrect a slideshow stopped while its first image was loading', async () => {
    MockImage.pending = true;
    component.start();
    await render();
    component.stop();
    await advance(20000);
    expect(component.running()).toBe(false);
    expect(latest()).toBeNull();
    MockImage.pending = false;
    component.start();
    await render();
    expect(latest()).not.toBeNull();
  });

  it('pauses timing and music in a background tab, then resumes the remaining duration', async () => {
    fixture.componentRef.setInput('musicSrc', '/music.mp3');
    component.start();
    await render();
    const first = latest()?.getAttribute('src');
    await advance(2000);
    vi.spyOn(document, 'hidden', 'get').mockReturnValue(true);
    document.dispatchEvent(new Event('visibilitychange'));
    await render();
    await advance(15000);
    expect(latest()?.getAttribute('src')).toBe(first);
    expect(MockAudio.instances[0].pause).toHaveBeenCalledOnce();
    vi.spyOn(document, 'hidden', 'get').mockReturnValue(false);
    document.dispatchEvent(new Event('visibilitychange'));
    await advance(1999);
    expect(latest()?.getAttribute('src')).toBe(first);
    await advance(1);
    expect(latest()?.getAttribute('src')).not.toBe(first);
  });

  it('traps keyboard focus and Escape ends only Preview', async () => {
    component.start();
    await render();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', cancelable: true }));
    expect(document.activeElement).toBe(element.querySelector('.end-preview'));
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', cancelable: true }));
    await render();
    expect(component.running()).toBe(false);
  });

  it('does not start for an empty album', () => {
    fixture.componentRef.setInput('photos', []);
    component.start();
    expect(component.running()).toBe(false);
    expect(MockAudio.instances).toHaveLength(0);
  });

  describe('location plate', () => {
    function plate(): HTMLElement | null {
      return element.querySelector<HTMLElement>('.preview-place');
    }

    it('shows her city, her country and its two-letter code instead of a photograph count', async () => {
      fixture.componentRef.setInput('modelLocation', 'Shiraz, Iran');
      component.start();
      await render();
      expect(plate()?.querySelector('.place-city')?.textContent?.trim()).toBe('Shiraz');
      expect(plate()?.querySelector('.place-name')?.textContent?.trim()).toBe('Iran');
      expect(plate()?.querySelector('.place-code')?.textContent?.trim()).toBe('IR');
      expect(plate()?.getAttribute('title')).toBe('Shiraz, Iran');
      // The photograph count and the "shuffled, endlessly" line are gone for good.
      expect(element.querySelector('.preview-caption')?.textContent).not.toContain('photograph');
      expect(element.querySelector('.preview-caption')?.textContent).not.toContain('endlessly');
    });

    it('reads the whole place out to assistive tech as one line', async () => {
      fixture.componentRef.setInput('modelLocation', 'Kuwait City, Kuwait');
      component.start();
      await render();
      // Every visible part of the plate is decorative; the one line a reader hears is the place.
      const heard = Array.from(plate()!.children).filter(
        (child) => child.getAttribute('aria-hidden') !== 'true',
      );
      expect(heard).toHaveLength(1);
      expect(heard[0].textContent?.trim()).toBe('Based in Kuwait City, Kuwait');
    });

    it('shows the city alone when the location names no country', async () => {
      fixture.componentRef.setInput('modelLocation', 'Shiraz');
      component.start();
      await render();
      expect(plate()?.querySelector('.place-city')?.textContent?.trim()).toBe('Shiraz');
      expect(plate()?.querySelector('.place-name')).toBeNull();
      expect(plate()?.querySelector('.place-code')).toBeNull();
      expect(plate()?.querySelector('.place-rule')).toBeNull();
    });

    it('drops the code chip for a country the directory does not know', async () => {
      fixture.componentRef.setInput('modelLocation', 'Shiraz, Persia');
      component.start();
      await render();
      expect(plate()?.querySelector('.place-city')?.textContent?.trim()).toBe('Shiraz');
      expect(plate()?.querySelector('.place-name')?.textContent?.trim()).toBe('Persia');
      expect(plate()?.querySelector('.place-code')).toBeNull();
    });

    it('holds no plate at all for a model with no location on file', async () => {
      fixture.componentRef.setInput('modelLocation', '');
      component.start();
      await render();
      expect(plate()).toBeNull();
      expect(element.querySelector('.preview-caption h2')?.textContent?.trim()).toBe('Test Model');
    });

    it('keeps the whole place on one line, however long it is', async () => {
      fixture.componentRef.setInput('modelLocation', 'Sarajevo, Bosnia and Herzegovina');
      component.start();
      await render();
      // The line never breaks, and neither does the row of parts it is built from.
      expect(getComputedStyle(plate()!).whiteSpace).toBe('nowrap');
      expect(getComputedStyle(plate()!.querySelector('.place-row')!).flexWrap).toBe('nowrap');
      expect(getComputedStyle(plate()!.querySelector('.place-country')!).flexWrap).toBe('nowrap');
    });

    it('shrinks the plate instead of breaking it when the place is longer than the room', async () => {
      // A phone: 356px of line (city, rule, country and code at full size) in 224px of caption.
      const restore = stubWidths({ line: 356, room: 224 });
      try {
        fixture.componentRef.setInput('modelLocation', 'Sarajevo, Bosnia and Herzegovina');
        component.start();
        await render();
        expect(plate()!.style.getPropertyValue('--place-fit')).toBe('0.617');
      } finally {
        restore();
      }
    });

    it('leaves the plate at its natural size when the place has room to spare', async () => {
      const restore = stubWidths({ line: 197, room: 264 });
      try {
        fixture.componentRef.setInput('modelLocation', 'Doha, Qatar');
        component.start();
        await render();
        expect(Number(plate()!.style.getPropertyValue('--place-fit'))).toBe(1);
      } finally {
        restore();
      }
    });

    it('refits the plate when the room it has changes', async () => {
      const width = { line: 356, room: 264 };
      const restore = stubWidths(width);
      try {
        fixture.componentRef.setInput('modelLocation', 'Sarajevo, Bosnia and Herzegovina');
        component.start();
        await render();
        expect(plate()!.style.getPropertyValue('--place-fit')).toBe('0.727');
        // The sound button takes its place, or the phone turns over: the room narrows.
        width.room = 224;
        await resizeCaption();
        expect(plate()!.style.getPropertyValue('--place-fit')).toBe('0.617');
      } finally {
        restore();
      }
    });

    it('never shrinks the plate past the size at which it stays readable', async () => {
      const restore = stubWidths({ line: 1200, room: 300 });
      try {
        fixture.componentRef.setInput('modelLocation', 'Sarajevo, Bosnia and Herzegovina');
        component.start();
        await render();
        expect(plate()!.style.getPropertyValue('--place-fit')).toBe('0.550');
      } finally {
        restore();
      }
    });
  });
});
