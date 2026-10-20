import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  OnInit,
  afterNextRender,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { AiModelHighlight, AiModelHighlightItem } from '../ai-model-data';

/**
 * How long a photograph holds the screen before the highlight moves to its next story. A clip
 * instead plays for its own duration, as the brief asks.
 */
export const HIGHLIGHT_PHOTO_DURATION_MS = 4000;

/** How often a photograph's progress bar is refreshed (a smooth 10 frames a second). */
const TICK_MS = 100;
/** A finger held down this long pauses the story instead of advancing it. */
const HOLD_DELAY_MS = 220;
/** Movement under this many pixels is a tap, not a drag. */
const TAP_SLOP = 12;
/** A sideways drag this long flicks to the neighbouring highlight. */
const SWIPE_DISTANCE = 54;
/** A downward drag this long dismisses the viewer. */
const DISMISS_DISTANCE = 90;
const MUSIC_VOLUME = 0.5;

interface PointerStart {
  x: number;
  y: number;
  held: boolean;
}

/**
 * The full-screen Highlights player — Instagram-story behaviour in a portrait stage.
 *
 * - A photograph advances after {@link HIGHLIGHT_PHOTO_DURATION_MS} (four seconds); a clip
 *   advances when it ends, its progress bar following the clip's own time.
 * - Tapping the story jumps straight to the next frame; a press-and-hold pauses it, a sideways
 *   swipe changes highlight and a downward swipe closes.
 * - The highlight's own audio plays as background music (it falls back to the model's album
 *   preview music). The clips themselves stay muted so the soundtrack carries the mood.
 * - There are deliberately no likes, comments, seen counts, shares or downloads here: a highlight
 *   is a story, not a post.
 */
@Component({
  selector: 'app-highlight-viewer',
  templateUrl: './highlight-viewer.html',
  styleUrl: './highlight-viewer.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(document:keydown)': 'onKeydown($event)',
    '(document:visibilitychange)': 'onVisibilityChange()',
  },
})
export class HighlightViewer implements OnInit {
  readonly highlights = input.required<readonly AiModelHighlight[]>();
  readonly startIndex = input(0);
  readonly modelName = input('');
  readonly modelHandle = input('');
  readonly modelCover = input('');
  readonly fallbackMusic = input('');
  readonly closed = output<void>();

  protected readonly activeHighlight = signal(0);
  protected readonly activeItem = signal(0);
  /** The current frame's progress, from 0 to 1. */
  protected readonly progress = signal(0);
  protected readonly paused = signal(false);
  protected readonly muted = signal(false);

  protected readonly highlight = computed(
    () => (this.highlights() ?? [])[this.activeHighlight()] ?? null,
  );
  protected readonly items = computed<readonly AiModelHighlightItem[]>(
    () => this.highlight()?.items ?? [],
  );
  protected readonly item = computed<AiModelHighlightItem | null>(
    () => this.items()[this.activeItem()] ?? null,
  );
  /** The single frame currently on screen; re-keyed by src so each frame animates in afresh. */
  protected readonly frames = computed<AiModelHighlightItem[]>(() => {
    const frame = this.item();
    return frame ? [frame] : [];
  });
  protected readonly music = computed(() => this.highlight()?.music || this.fallbackMusic());
  protected readonly hasMusic = computed(() => this.music().length > 0);
  protected readonly counterLabel = computed(() => {
    const total = this.items().length;
    return `${Math.min(this.activeItem() + 1, total)} / ${total}`;
  });
  protected readonly typeLabel = computed(() =>
    this.item()?.kind === 'video' ? 'Clip' : 'Photograph',
  );
  protected readonly viewerLabel = computed(
    () => `Highlights of ${this.modelName() || 'this model'}`,
  );
  /** "On" while music is actually sounding — the equaliser only moves then. */
  protected readonly soundOn = computed(() => this.hasMusic() && !this.muted());

  private readonly storyVideo = viewChild<ElementRef<HTMLVideoElement>>('storyVideo');
  private readonly musicEl = viewChild<ElementRef<HTMLAudioElement>>('musicEl');
  private readonly closeButton = viewChild<ElementRef<HTMLButtonElement>>('closeButton');
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  private ticker: ReturnType<typeof setInterval> | undefined;
  private lastTick = 0;
  private elapsed = 0;
  private holdTimer: ReturnType<typeof setTimeout> | undefined;
  private pointer: PointerStart | undefined;
  private finished = false;
  private lastMusicSrc = '';
  private previousOverflow = '';
  /** The page's own visibility pause; separate from the visitor's pause button. */
  private readonly hiddenPause = signal(false);

  constructor() {
    afterNextRender(() => {
      this.closeButton()?.nativeElement.focus({ preventScroll: true });
    });

    // Keep the mounted clip and the soundtrack in step with pause, mute and the current frame.
    effect(() => {
      const frame = this.item();
      const music = this.music();
      const audio = this.musicEl()?.nativeElement;
      const video = this.storyVideo()?.nativeElement;
      const paused = this.effectivePaused();
      this.muted();

      if (audio && music) {
        audio.volume = MUSIC_VOLUME;
        audio.muted = this.muted();
        if (this.lastMusicSrc !== music) {
          this.lastMusicSrc = music;
          audio.src = music;
          try {
            audio.load();
          } catch {
            /* A browser that refuses to preload simply waits for play(). */
          }
        }
        if (paused) this.safePause(audio);
        else this.safePlay(audio);
      }

      if (video) {
        // The soundtrack carries the mood; the clip itself stays silent so the two never fight.
        video.muted = true;
        if (paused) this.safePause(video);
        else this.safePlay(video);
      }

      // Warm the next still (or a clip's poster) while this frame is still on screen.
      if (frame) this.preload(this.peekNext());
    });

    inject(DestroyRef).onDestroy(() => this.teardown());
  }

  ngOnInit(): void {
    // Inputs are bound by now: open the requested highlight and hold the page still behind it.
    const count = this.highlights().length;
    const start = Math.min(Math.max(this.startIndex(), 0), Math.max(count - 1, 0));
    this.previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    this.enter(start, 0);
    this.startClock();
  }

  /** Paused by the visitor's hold/button or because the tab went to the background. */
  private effectivePaused(): boolean {
    return this.paused() || this.hiddenPause();
  }

  /**
   * Moves to one frame of one highlight and restarts its clock. Every navigation path — tap,
   * auto-advance, swipe, arrow key, progress bar — comes through here.
   */
  private enter(highlightIndex: number, itemIndex: number): void {
    if (this.finished) return;
    const highlight = this.highlights()[highlightIndex];
    if (!highlight || highlight.items.length === 0) return;

    this.activeHighlight.set(highlightIndex);
    this.activeItem.set(Math.min(Math.max(itemIndex, 0), highlight.items.length - 1));
    this.elapsed = 0;
    this.progress.set(0);
    this.lastTick = Date.now();
    this.paused.set(false);
    this.clearHold();
  }

  /** The next frame of this highlight; after its last frame the next highlight begins. */
  protected next(): void {
    if (this.finished) return;
    if (this.activeItem() + 1 < this.items().length) {
      this.enter(this.activeHighlight(), this.activeItem() + 1);
      return;
    }
    this.nextHighlight();
  }

  /** The previous frame, or the last frame of the previous highlight at the very start. */
  protected previous(): void {
    if (this.activeItem() > 0) {
      this.enter(this.activeHighlight(), this.activeItem() - 1);
      return;
    }
    const previousHighlight = this.activeHighlight() - 1;
    if (previousHighlight >= 0) {
      const items = this.highlights()[previousHighlight].items;
      this.enter(previousHighlight, Math.max(items.length - 1, 0));
    } else {
      this.enter(0, 0);
    }
  }

  protected nextHighlight(): void {
    const next = this.activeHighlight() + 1;
    if (next < this.highlights().length) this.enter(next, 0);
    else this.close();
  }

  protected previousHighlight(): void {
    this.enter(Math.max(this.activeHighlight() - 1, 0), 0);
  }

  protected goTo(index: number): void {
    this.enter(this.activeHighlight(), index);
  }

  protected togglePaused(): void {
    this.paused.update((paused) => !paused);
  }

  protected toggleMuted(): void {
    this.muted.update((muted) => !muted);
  }

  protected close(): void {
    if (this.finished) return;
    this.finished = true;
    this.teardown();
    this.closed.emit();
  }

  /** Progress-bar fill for a segment: past frames full, the current one partial. */
  protected segmentFill(index: number): number {
    if (index < this.activeItem()) return 1;
    if (index > this.activeItem()) return 0;
    return this.progress();
  }

  /* ------------------------------------------------------------------ media events */

  protected onVideoMetadata(event: Event): void {
    const video = event.target as HTMLVideoElement;
    if (video.duration > 0 && Number.isFinite(video.duration)) {
      this.progress.set(Math.min(video.currentTime / video.duration, 1));
    }
    if (!this.effectivePaused()) this.safePlay(video);
  }

  protected onVideoTime(event: Event): void {
    const video = event.target as HTMLVideoElement;
    if (!video.duration || !Number.isFinite(video.duration)) return;
    this.progress.set(Math.min(video.currentTime / video.duration, 1));
  }

  /* ------------------------------------------------------------------ gestures */

  protected onPointerDown(event: PointerEvent): void {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    this.pointer = { x: event.clientX, y: event.clientY, held: false };
    this.clearHold();
    try {
      (event.currentTarget as HTMLElement | null)?.setPointerCapture?.(event.pointerId);
    } catch {
      /* Pointer capture is a nicety; the tap still works without it. */
    }
    this.holdTimer = setTimeout(() => {
      if (!this.pointer) return;
      this.pointer.held = true;
      this.paused.set(true);
    }, HOLD_DELAY_MS);
  }

  protected onPointerUp(event: PointerEvent): void {
    const start = this.pointer;
    this.pointer = undefined;
    this.clearHold();
    if (!start || this.finished) return;

    if (start.held) {
      // A press-and-hold only paused the story; letting go resumes it where it stopped.
      this.paused.set(false);
      return;
    }

    const dx = event.clientX - start.x;
    const dy = event.clientY - start.y;

    if (Math.abs(dy) > DISMISS_DISTANCE && Math.abs(dy) > Math.abs(dx)) {
      this.close();
      return;
    }
    if (Math.abs(dx) > SWIPE_DISTANCE && Math.abs(dx) > Math.abs(dy)) {
      if (dx < 0) this.nextHighlight();
      else this.previousHighlight();
      return;
    }
    if (Math.hypot(dx, dy) > TAP_SLOP) return;
    this.next();
  }

  protected onPointerCancel(): void {
    if (this.pointer?.held) this.paused.set(false);
    this.pointer = undefined;
    this.clearHold();
  }

  protected onKeydown(event: KeyboardEvent): void {
    if (this.finished || event.defaultPrevented) return;
    const target = event.target as HTMLElement | null;
    if (target && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)) return;
    // Space still activates a focused button; only the story surface uses it as pause.
    if ((event.key === ' ' || event.key === 'Spacebar') && target?.tagName === 'BUTTON') return;

    switch (event.key) {
      case 'Escape':
        event.preventDefault();
        this.close();
        break;
      case 'ArrowRight':
        event.preventDefault();
        this.next();
        break;
      case 'ArrowLeft':
        event.preventDefault();
        this.previous();
        break;
      case 'ArrowDown':
        event.preventDefault();
        this.nextHighlight();
        break;
      case 'ArrowUp':
        event.preventDefault();
        this.previousHighlight();
        break;
      case ' ':
      case 'Spacebar':
        event.preventDefault();
        this.togglePaused();
        break;
      case 'm':
      case 'M':
        event.preventDefault();
        this.toggleMuted();
        break;
      case 'Tab':
        this.trapFocus(event);
        break;
      default:
        break;
    }
  }

  protected onVisibilityChange(): void {
    this.hiddenPause.set(document.visibilityState === 'hidden');
  }

  /* ------------------------------------------------------------------ internals */

  private startClock(): void {
    if (this.ticker !== undefined) return;
    this.lastTick = Date.now();
    this.ticker = setInterval(() => this.tick(), TICK_MS);
  }

  /** Fills the current photograph's bar and hands over to the next frame at four seconds. */
  private tick(): void {
    if (this.finished) return;
    if (this.effectivePaused()) {
      this.lastTick = Date.now();
      return;
    }
    const frame = this.item();
    if (!frame || frame.kind !== 'photo') {
      // A clip advances on its own `ended` event, its bar follows `timeupdate`.
      this.lastTick = Date.now();
      return;
    }

    const now = Date.now();
    const delta = Math.max(now - this.lastTick, 0);
    this.lastTick = now;
    this.elapsed += delta;
    this.progress.set(Math.min(this.elapsed / HIGHLIGHT_PHOTO_DURATION_MS, 1));
    if (this.elapsed >= HIGHLIGHT_PHOTO_DURATION_MS) this.next();
  }

  private peekNext(): AiModelHighlightItem | null {
    return (
      this.items()[this.activeItem() + 1] ??
      this.highlights()[this.activeHighlight() + 1]?.items[0] ??
      null
    );
  }

  private preload(frame: AiModelHighlightItem | null): void {
    if (!frame || typeof Image === 'undefined') return;
    const src = frame.kind === 'photo' ? frame.src : frame.poster;
    if (!src) return;
    const image = new Image();
    image.src = src;
  }

  private safePlay(media: HTMLMediaElement): void {
    try {
      const result = media.play();
      if (result && typeof result.catch === 'function') result.catch(() => undefined);
    } catch {
      /* Autoplay refused (or unavailable): the visitor's tap will start it. */
    }
  }

  private safePause(media: HTMLMediaElement): void {
    try {
      media.pause();
    } catch {
      /* Nothing to pause. */
    }
  }

  private clearHold(): void {
    if (this.holdTimer !== undefined) {
      clearTimeout(this.holdTimer);
      this.holdTimer = undefined;
    }
  }

  private trapFocus(event: KeyboardEvent): void {
    const focusable = Array.from(
      this.host.nativeElement.querySelectorAll<HTMLElement>('button:not([disabled])'),
    );
    if (focusable.length === 0) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    const active = document.activeElement;

    if (event.shiftKey && (active === first || !this.host.nativeElement.contains(active))) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && active === last) {
      event.preventDefault();
      first.focus();
    }
  }

  private teardown(): void {
    if (this.ticker !== undefined) {
      clearInterval(this.ticker);
      this.ticker = undefined;
    }
    this.clearHold();
    this.pointer = undefined;
    if (typeof document !== 'undefined') document.body.style.overflow = this.previousOverflow;
  }
}
