import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  Injector,
  afterNextRender,
  computed,
  effect,
  inject,
  input,
  signal,
  viewChild,
} from '@angular/core';
import { AiModelPhoto } from '../ai-model-data';
import { previewRound, publicPreviewPhotos } from './preview-deck';
import { parsePreviewPlace } from './preview-place';

interface PreviewFrame {
  id: number;
  photo: AiModelPhoto;
  zoomOut: boolean;
  duration: number;
}

/** The smallest the location plate's type may shrink — below this the line would be unreadable. */
const PLACE_FIT_FLOOR = 0.55;
/** A hair of breathing room, so a long line scales down a touch further than strictly needed. */
const PLACE_FIT_SAFETY = 0.98;

@Component({
  selector: 'app-ai-model-photo-preview',
  templateUrl: './ai-model-photo-preview.html',
  styleUrl: './ai-model-photo-preview.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(document:keydown)': 'onKeydown($event)',
    '(document:visibilitychange)': 'onVisibilityChange()',
    '(document:fullscreenchange)': 'onFullscreenChange()',
  },
})
export class AiModelPhotoPreview {
  readonly photos = input.required<readonly AiModelPhoto[]>();
  readonly modelName = input('');
  /** The model's "City, Country" line — the location plate under her name while the deck plays. */
  readonly modelLocation = input('');
  readonly musicSrc = input('');
  readonly running = signal(false);
  protected readonly frames = signal<PreviewFrame[]>([]);
  protected readonly loading = signal(false);
  protected readonly unavailable = signal(false);
  protected readonly musicAvailable = signal(false);
  protected readonly muted = signal(false);
  protected readonly suspended = signal(false);
  /**
   * The city and country the plate under her name shows, split out of `modelLocation`. Null when
   * the model has no location on file, which leaves the caption to her name alone.
   */
  protected readonly place = computed(() => parsePreviewPlace(this.modelLocation()));

  private readonly injector = inject(Injector);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly endButton = viewChild<ElementRef<HTMLButtonElement>>('endButton');
  private readonly plate = viewChild<ElementRef<HTMLElement>>('plate');
  private pool: AiModelPhoto[] = [];
  private deck: AiModelPhoto[] = [];
  private failed = new Set<string>();
  private session = 0;
  private frameId = 0;
  private timer: ReturnType<typeof setTimeout> | undefined;
  private fadeTimer: ReturnType<typeof setTimeout> | undefined;
  private cancelLoad?: () => void;
  private audio?: HTMLAudioElement;
  private trigger?: HTMLElement;
  private previousOverflow = '';
  private ownsFullscreen = false;
  private nextFrame?: Promise<AiModelPhoto | null>;
  private clock = 0;
  private deadline = 0;
  private remaining = 0;
  private observer?: ResizeObserver;

  constructor() {
    effect(() => {
      if (this.running()) this.endButton()?.nativeElement.focus({ preventScroll: true });
    });
    // The plate is on screen once the deck runs: fit its one line to the room the caption has.
    effect(() => {
      if (this.running()) this.fitPlace();
    });
    inject(DestroyRef).onDestroy(() => this.stop(false));
  }

  /**
   * Scales the location plate down until its single line fits the caption.
   *
   * The line never wraps: a long country shrinks the plate rather than breaking it in two. Every
   * part of the plate — type, tracking, gaps, padding, marker — is sized from `--place-fit`, so
   * measuring the line once at full size gives the exact scale the caption's width allows. The
   * line's own padding rides on the row inside the plate, so what is measured is the whole of it.
   */
  private fitPlace(): void {
    const plate = this.plate()?.nativeElement;
    const caption = plate?.parentElement;
    if (!plate || !caption) return;

    plate.style.setProperty('--place-fit', '1');
    const line = plate.scrollWidth;
    const room = caption.clientWidth;
    if (!line || !room) return;
    const fit = Math.min(1, Math.max(PLACE_FIT_FLOOR, (room / line) * PLACE_FIT_SAFETY));
    plate.style.setProperty('--place-fit', fit.toFixed(3));

    // The caption's width moves with the sound button, full screen and the device's orientation;
    // it does not depend on the plate's own size, so refitting can never feed back into it.
    if (!this.observer && typeof ResizeObserver !== 'undefined') {
      this.observer = new ResizeObserver(() => this.fitPlace());
      this.observer.observe(caption);
    }
  }

  /** Called directly from the Preview click, preserving the browser's audio activation. */
  start(): void {
    if (this.running()) return;
    this.pool = publicPreviewPhotos(this.photos());
    if (!this.pool.length) return;
    const session = ++this.session;
    this.failed.clear();
    this.deck = [];
    this.frameId = 0;
    this.frames.set([]);
    this.unavailable.set(false);
    this.loading.set(true);
    this.suspended.set(false);
    this.trigger =
      document.activeElement instanceof HTMLElement ? document.activeElement : undefined;
    this.previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    this.running.set(true);
    this.startMusic();
    // Full-viewport CSS remains the fallback on iPhones / browsers without Fullscreen API.
    if (!document.fullscreenElement && document.documentElement.requestFullscreen) {
      this.ownsFullscreen = true;
      void document.documentElement
        .requestFullscreen()
        .then(() => {
          if (session !== this.session && document.fullscreenElement) {
            void document.exitFullscreen().catch(() => {});
          }
        })
        .catch(() => {
          this.ownsFullscreen = false;
        });
    }
    void this.loadNext(session).then((photo) => {
      if (session !== this.session) return;
      this.loading.set(false);
      if (photo) this.show(photo, session);
      else this.unavailable.set(true);
    });
  }

  stop(restoreFocus = true): void {
    if (!this.running()) return;
    ++this.session;
    ++this.clock;
    this.running.set(false);
    clearTimeout(this.timer);
    clearTimeout(this.fadeTimer);
    this.cancelLoad?.();
    this.cancelLoad = undefined;
    this.nextFrame = undefined;
    this.frames.set([]);
    this.observer?.disconnect();
    this.observer = undefined;
    this.disposeAudio();
    document.body.style.overflow = this.previousOverflow;
    if (this.ownsFullscreen && document.fullscreenElement) {
      void document.exitFullscreen().catch(() => {});
    }
    this.ownsFullscreen = false;
    const trigger = this.trigger;
    if (restoreFocus) {
      afterNextRender(() => trigger?.focus({ preventScroll: true }), { injector: this.injector });
    }
  }

  private startMusic(): void {
    this.disposeAudio();
    this.muted.set(false);
    this.musicAvailable.set(false);
    if (!this.musicSrc()) return;
    const audio = new Audio(this.musicSrc());
    this.audio = audio;
    audio.loop = true;
    audio.volume = 1;
    this.musicAvailable.set(true);
    audio.onerror = () => {
      if (this.audio !== audio) return;
      this.musicAvailable.set(false);
      this.disposeAudio();
    };
    void audio.play().catch(() => {
      if (this.audio === audio) this.muted.set(true);
    });
  }

  protected toggleMusic(): void {
    const audio = this.audio;
    if (!audio) return;
    if (!this.muted()) {
      audio.muted = true;
      this.muted.set(true);
    } else {
      audio.muted = false;
      audio.volume = 1;
      this.muted.set(false);
      void audio.play().catch(() => this.muted.set(true));
    }
  }

  private disposeAudio(): void {
    if (!this.audio) return;
    this.audio.onerror = null;
    this.audio.pause();
    this.audio.removeAttribute('src');
    this.audio.load();
    this.audio = undefined;
  }

  private async loadNext(session: number): Promise<AiModelPhoto | null> {
    while (session === this.session && this.failed.size < this.pool.length) {
      if (!this.deck.length) {
        this.deck = previewRound(
          this.pool.filter((photo) => !this.failed.has(photo.src)),
          this.frames().at(-1)?.photo.src,
        );
      }
      const photo = this.deck.shift();
      if (!photo) return null;
      if (await this.preload(photo.src)) return session === this.session ? photo : null;
      if (session !== this.session) return null;
      this.failed.add(photo.src);
    }
    return null;
  }

  private preload(src: string): Promise<boolean> {
    return new Promise((resolve) => {
      const image = new Image();
      image.decoding = 'async';
      let finished = false;
      const finish = (ok: boolean) => {
        if (finished) return;
        finished = true;
        clearTimeout(timeout);
        image.onload = image.onerror = null;
        this.cancelLoad = undefined;
        resolve(ok);
      };
      const timeout = setTimeout(() => finish(false), 12000);
      this.cancelLoad = () => {
        finish(false);
        image.src = '';
      };
      image.onload = () => {
        // Decode ahead of the crossfade, not on the animation's first frame.
        if (image.decode)
          void image.decode().then(
            () => finish(true),
            () => finish(false),
          );
        else finish(true);
      };
      image.onerror = () => finish(false);
      image.src = src;
    });
  }

  private show(photo: AiModelPhoto, session: number): void {
    const id = ++this.frameId;
    const zoomOut = id % 2 === 0;
    const duration = zoomOut ? 5000 : 4000;
    const frame = { id, photo, zoomOut, duration };
    this.frames.update((frames) => [...frames.slice(-1), frame]);
    clearTimeout(this.fadeTimer);
    this.fadeTimer = setTimeout(() => {
      if (session === this.session) this.frames.set([frame]);
    }, 800);
    this.nextFrame = this.loadNext(session);
    this.remaining = duration;
    if (!document.hidden) this.schedule(session);
    else this.suspended.set(true);
  }

  private schedule(session: number): void {
    clearTimeout(this.timer);
    const clock = ++this.clock;
    this.deadline = Date.now() + this.remaining;
    this.timer = setTimeout(() => {
      void this.nextFrame?.then((photo) => {
        if (session !== this.session || clock !== this.clock) return;
        if (document.hidden) {
          this.remaining = 0;
          return;
        }
        if (photo) this.show(photo, session);
        // Keep the last successfully decoded photo on screen if the rest are unavailable.
      });
    }, this.remaining);
  }

  protected onVisibilityChange(): void {
    if (!this.running()) return;
    this.suspended.set(document.hidden);
    if (document.hidden) {
      ++this.clock;
      clearTimeout(this.timer);
      this.remaining = Math.max(0, this.deadline - Date.now());
      this.audio?.pause();
    } else {
      if (this.frames().length) this.schedule(this.session);
      if (this.audio && !this.muted()) void this.audio.play().catch(() => this.muted.set(true));
    }
  }

  protected onFullscreenChange(): void {
    // Native Escape can exit fullscreen without delivering a key event to the page.
    if (this.running() && this.ownsFullscreen && !document.fullscreenElement) this.stop();
  }

  protected onKeydown(event: KeyboardEvent): void {
    if (!this.running()) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      this.stop();
    } else if (event.key === 'Tab') {
      const buttons = Array.from(
        this.host.nativeElement.querySelectorAll<HTMLButtonElement>('button'),
      );
      const index = buttons.indexOf(document.activeElement as HTMLButtonElement);
      const next = (index + (event.shiftKey ? -1 : 1) + buttons.length) % buttons.length;
      event.preventDefault();
      buttons[next]?.focus();
    }
  }
}
