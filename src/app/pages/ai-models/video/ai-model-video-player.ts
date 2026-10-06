import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  effect,
  linkedSignal,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { AiModelVideo } from '../ai-model-data';

/** Playback speeds offered in the player's speed menu. */
export const PLAYBACK_RATES = [0.5, 0.75, 1, 1.25, 1.5, 2] as const;

/** `m:ss`, or `h:mm:ss` for clips longer than an hour. Used by the numeric readouts. */
export function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) return '0:00';

  const total = Math.floor(seconds);
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const remainder = total % 60;
  const pad = (value: number) => String(value).padStart(2, '0');

  return hours > 0 ? `${hours}:${pad(minutes)}:${pad(remainder)}` : `${minutes}:${pad(remainder)}`;
}

/**
 * Full-screen player for one model's clips — the reel that sits under her personal details.
 *
 * Every control the portfolio needs lives here: play/pause, stop, a draggable progress bar,
 * volume, playback speed, previous/next clip, picture-in-picture, true full screen (the panel
 * expands, so the controls travel with the picture, and double-clicking it toggles full screen)
 * and a download button for the clip. Tapping the picture plays or pauses it.
 */
@Component({
  selector: 'app-ai-model-video-player',
  templateUrl: './ai-model-video-player.html',
  styleUrl: './ai-model-video-player.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(document:keydown)': 'onDocumentKeydown($event)',
    '(document:fullscreenchange)': 'syncFullscreen()',
    '(document:webkitfullscreenchange)': 'syncFullscreen()',
  },
})
export class AiModelVideoPlayer {
  /** Every clip in the album, in album order. */
  readonly videos = input.required<readonly AiModelVideo[]>();
  /** The clip the visitor tapped in the reel. */
  readonly startIndex = input(0);
  readonly modelName = input('');
  readonly modelHandle = input('');

  readonly closed = output<void>();

  protected readonly rates = PLAYBACK_RATES;

  /** Follows `startIndex`, but the player's own previous/next controls move it on. */
  protected readonly index = linkedSignal(() => {
    const last = Math.max(this.videos().length - 1, 0);
    return Math.min(Math.max(this.startIndex(), 0), last);
  });

  protected readonly playing = signal(false);
  protected readonly currentTime = signal(0);
  protected readonly duration = signal(0);
  protected readonly volume = signal(1);
  protected readonly muted = signal(false);
  protected readonly rate = signal(1);
  protected readonly fullscreen = signal(false);
  protected readonly failed = signal(false);
  /**
   * True when the browser refused to start the clip with sound and it was started muted instead —
   * the visitor then only has to tap the speaker to hear it.
   */
  protected readonly mutedByPolicy = signal(false);
  /** True once the clip ends — the play button then reads as a replay. */
  protected readonly ended = signal(false);

  protected readonly clip = computed(() => this.videos()[this.index()] ?? null);
  protected readonly total = computed(() => this.videos().length);
  protected readonly clipNumber = computed(() => String(this.index() + 1).padStart(2, '0'));
  protected readonly totalNumber = computed(() =>
    String(Math.max(this.total(), 1)).padStart(2, '0'),
  );
  protected readonly elapsedLabel = computed(() => formatTime(this.currentTime()));
  protected readonly durationLabel = computed(() =>
    this.duration() > 0 ? formatTime(this.duration()) : '—:—',
  );
  /** 0–1000, so the progress slider keeps its precision on long clips. */
  protected readonly seekValue = computed(() => {
    const duration = this.duration();
    if (duration <= 0) return 0;
    return Math.round((this.currentTime() / duration) * 1000);
  });
  protected readonly seekPercent = computed(() => this.seekValue() / 10);
  protected readonly volumePercent = computed(() => (this.muted() ? 0 : this.volume() * 100));
  protected readonly caption = computed(() => {
    const clip = this.clip();
    if (!clip) return '';
    return clip.caption || `${this.modelName()} · ${clip.fileName}`;
  });

  /** Whether the visitor wants the clip running — playback follows it across clip changes. */
  private readonly shouldPlay = signal(true);

  private readonly videoRef = viewChild<ElementRef<HTMLVideoElement>>('video');
  private readonly panelRef = viewChild<ElementRef<HTMLElement>>('panel');
  private readonly closeRef = viewChild<ElementRef<HTMLButtonElement>>('playerClose');

  private touchStartX = 0;
  private touchStartY = 0;
  /** Timestamp of the last swipe, so the tap that ends it does not also pause the clip. */
  private swipedAt = 0;

  constructor() {
    // The visitor tapped a clip to open the player, so playback starts on its own. Browsers may
    // still refuse (autoplay policy, data saver) — the play button covers that case.
    effect(() => {
      const video = this.videoRef()?.nativeElement;
      const clip = this.clip();
      if (!video || !clip || !this.shouldPlay()) return;
      if (video.getAttribute('src') !== clip.src) return;
      this.play();
    });

    // Move focus into the player as soon as it renders, as the portfolio's photo pop-up does.
    effect(() => {
      this.closeRef()?.nativeElement.focus({ preventScroll: true });
    });
  }

  protected play(): void {
    this.shouldPlay.set(true);
    const video = this.videoRef()?.nativeElement;
    if (!video) return;

    this.ended.set(false);
    this.startPlayback(video, video.muted);
  }

  /**
   * Starts the clip and settles the playing state from what the browser actually did. If playback
   * with sound is refused (an autoplay policy, an embedded frame without the autoplay permission,
   * a locked screen) the clip is started muted so it plays in the pop-up regardless, and the
   * visitor is told that sound is one tap away.
   */
  private startPlayback(video: HTMLVideoElement, alreadyMuted: boolean): void {
    let started: Promise<void> | undefined;
    try {
      started = video.play();
    } catch {
      this.playing.set(false);
      return;
    }

    // The `play`/`pause` events keep the UI honest in every browser; the promise only reports
    // whether playback was refused.
    if (!started || typeof started.then !== 'function') return;

    started.then(
      () => undefined,
      (error: unknown) => {
        const name = error instanceof Error ? error.name : '';
        const refused = name === 'NotAllowedError' || name === 'SecurityError';

        if (refused && !alreadyMuted) {
          video.muted = true;
          this.muted.set(true);
          this.mutedByPolicy.set(true);
          this.startPlayback(video, true);
          return;
        }

        this.playing.set(false);
      },
    );
  }

  protected pause(): void {
    this.shouldPlay.set(false);
    try {
      this.videoRef()?.nativeElement.pause();
    } catch {
      // A detached or unloaded clip cannot be paused — nothing left to do.
    }
    // The `pause` event normally does this; setting it here keeps the button in step in browsers
    // that stay silent when the clip has no data yet.
    this.playing.set(false);
  }

  protected togglePlay(): void {
    if (this.playing()) this.pause();
    else this.play();
  }

  /** Stop: pause the clip and rewind it to its first frame. */
  protected stop(): void {
    this.pause();
    this.seekTo(0);
  }

  protected restart(): void {
    this.seekTo(0);
    this.play();
  }

  protected seekTo(seconds: number): void {
    const duration = this.duration();
    const target = Math.max(Math.min(seconds, duration > 0 ? duration : seconds), 0);

    try {
      const video = this.videoRef()?.nativeElement;
      if (video) video.currentTime = target;
    } catch {
      // Seeking an unloaded clip is a no-op.
    }
    this.currentTime.set(target);
  }

  protected skipBy(offset: number): void {
    this.seekTo(this.currentTime() + offset);
  }

  protected onSeekInput(event: Event): void {
    const duration = this.duration();
    if (duration <= 0) return;

    const value = Number((event.target as HTMLInputElement).value);
    if (!Number.isFinite(value)) return;
    this.seekTo((value / 1000) * duration);
  }

  /** Shared by the volume slider and the arrow-key shortcuts. `fraction` runs 0–1. */
  protected setVolume(fraction: number): void {
    const volume = Number.isFinite(fraction) ? Math.min(Math.max(fraction, 0), 1) : 1;
    const video = this.videoRef()?.nativeElement;
    if (video) video.volume = volume;

    this.volume.set(volume);
    if (volume > 0) {
      if (video) video.muted = false;
      this.muted.set(false);
      this.mutedByPolicy.set(false);
    }
  }

  protected onVolumeInput(event: Event): void {
    this.setVolume(Number((event.target as HTMLInputElement).value) / 100);
  }

  protected toggleMute(): void {
    const video = this.videoRef()?.nativeElement;
    const next = !this.muted();

    if (video) video.muted = next;
    this.muted.set(next);
    if (!next && this.volume() === 0) this.setVolume(1);
    if (!next) this.mutedByPolicy.set(false);
  }

  protected setRate(event: Event): void {
    const value = Number((event.target as HTMLSelectElement).value);
    if (!Number.isFinite(value) || value <= 0) return;

    const video = this.videoRef()?.nativeElement;
    if (video) video.playbackRate = value;
    this.rate.set(value);
  }

  protected async togglePictureInPicture(): Promise<void> {
    const video = this.videoRef()?.nativeElement;
    if (!video || typeof document === 'undefined') return;

    try {
      if (document.pictureInPictureElement) await document.exitPictureInPicture();
      else if (typeof video.requestPictureInPicture === 'function') {
        await video.requestPictureInPicture();
      }
    } catch {
      // Picture-in-picture is unavailable here — every other control still works.
    }
  }

  /** True full screen: the player panel expands, so its controls stay on screen. */
  protected toggleFullscreen(): void {
    if (typeof document === 'undefined') return;

    const target = this.panelRef()?.nativeElement ?? null;
    const active = this.fullscreenElement();

    if (active && (active === target || (target && active.contains(target)))) {
      const exit = document.exitFullscreen ?? document.webkitExitFullscreen;
      this.callSafely(() => exit?.call(document));
      this.fullscreen.set(false);
      return;
    }

    const request = target?.requestFullscreen ?? target?.webkitRequestFullscreen;
    if (!target || typeof request !== 'function') return;

    this.callSafely(() => request.call(target, { navigationUI: 'hide' }));
    this.fullscreen.set(true);
  }

  protected syncFullscreen(): void {
    if (typeof document === 'undefined') return;
    this.fullscreen.set(this.fullscreenElement() !== null);
  }

  /** Double-clicking the picture is the quick way in and out of full screen. */
  protected toggleFullscreenOnDoubleClick(event: MouseEvent): void {
    event.preventDefault();
    this.toggleFullscreen();
  }

  protected next(): void {
    this.showAt((this.index() + 1) % Math.max(this.total(), 1));
  }

  protected previous(): void {
    this.showAt((this.index() - 1 + this.total()) % Math.max(this.total(), 1));
  }

  protected selectClip(index: number): void {
    this.showAt(index);
  }

  /** Tapping the picture plays or pauses it. */
  protected onVideoClick(): void {
    if (Date.now() - this.swipedAt < 400) return;
    this.togglePlay();
  }

  protected onTouchStart(event: TouchEvent): void {
    this.touchStartX = event.changedTouches[0]?.clientX ?? 0;
    this.touchStartY = event.changedTouches[0]?.clientY ?? 0;
  }

  /** A horizontal swipe on the picture moves to the previous/next clip. */
  protected onTouchEnd(event: TouchEvent): void {
    if (this.total() < 2) return;

    const deltaX = (event.changedTouches[0]?.clientX ?? 0) - this.touchStartX;
    const deltaY = (event.changedTouches[0]?.clientY ?? 0) - this.touchStartY;
    if (Math.abs(deltaX) < 55 || Math.abs(deltaX) < Math.abs(deltaY)) return;

    this.swipedAt = Date.now();
    if (deltaX < 0) this.next();
    else this.previous();
  }

  protected onTimeUpdate(event: Event): void {
    const video = event.target as HTMLVideoElement;
    this.currentTime.set(video.currentTime || 0);
  }

  protected onDurationChange(event: Event): void {
    const video = event.target as HTMLVideoElement;
    if (Number.isFinite(video.duration) && video.duration > 0) this.duration.set(video.duration);
    else if (video.duration === 0) this.duration.set(0);
  }

  protected onVolumeChange(event: Event): void {
    const video = event.target as HTMLVideoElement;
    this.volume.set(Number.isFinite(video.volume) ? video.volume : 1);
    this.muted.set(video.muted === true);
    if (!video.muted) this.mutedByPolicy.set(false);
  }

  protected onPlay(): void {
    this.playing.set(true);
    this.ended.set(false);
    this.failed.set(false);
  }

  protected onPlaying(): void {
    this.playing.set(true);
    this.failed.set(false);
  }

  protected onPause(): void {
    this.playing.set(false);
  }

  protected onEnded(): void {
    this.playing.set(false);
    this.ended.set(true);
  }

  protected onError(): void {
    this.failed.set(true);
    this.playing.set(false);
  }

  protected close(): void {
    if (typeof document !== 'undefined' && this.fullscreenElement()) {
      const exit = document.exitFullscreen ?? document.webkitExitFullscreen;
      this.callSafely(() => exit?.call(document));
    }
    this.shouldPlay.set(false);
    this.pause();
    this.closed.emit();
  }

  /** Clicking the dark space around the player dismisses it; the picture and controls do not. */
  protected onBackdropClick(event: MouseEvent): void {
    const target = event.target as HTMLElement | null;
    if (target?.closest('video, button, a, input, select, .player-panel, .player-stage')) return;
    this.close();
  }

  protected onDocumentKeydown(event: KeyboardEvent): void {
    const target = event.target as HTMLElement | null;
    const tag = target?.tagName?.toLowerCase() ?? '';
    const interactive = ['input', 'select', 'textarea', 'button', 'a'].includes(tag);

    switch (event.key) {
      case 'Escape':
        // In full screen the browser leaves full screen first; a second Escape closes the player.
        if (this.fullscreenElement()) return;
        this.close();
        break;
      case ' ':
      case 'k':
      case 'K':
        if (interactive) return;
        this.togglePlay();
        break;
      case 'ArrowRight':
        if (interactive) return;
        this.skipBy(5);
        break;
      case 'ArrowLeft':
        if (interactive) return;
        this.skipBy(-5);
        break;
      case 'ArrowUp':
        if (interactive) return;
        this.setVolume(this.volume() + 0.1);
        break;
      case 'ArrowDown':
        if (interactive) return;
        this.setVolume(this.volume() - 0.1);
        break;
      case 'm':
      case 'M':
        if (interactive) return;
        this.toggleMute();
        break;
      case 'f':
      case 'F':
        this.toggleFullscreen();
        break;
      default:
        return;
    }

    event.preventDefault();
  }

  /** Switches to another clip of the same album, keeping playback going if it was running. */
  private showAt(index: number): void {
    if (index === this.index() || index < 0 || index >= this.total()) return;

    const wasPlaying = this.shouldPlay();
    this.index.set(index);
    this.currentTime.set(0);
    this.duration.set(0);
    this.ended.set(false);
    this.failed.set(false);
    this.playing.set(false);
    this.shouldPlay.set(wasPlaying);
  }

  private fullscreenElement(): Element | null {
    if (typeof document === 'undefined') return null;
    return document.fullscreenElement ?? document.webkitFullscreenElement ?? null;
  }

  private callSafely(action: () => unknown): void {
    try {
      const result = action();
      if (result && typeof (result as Promise<void>).catch === 'function') {
        (result as Promise<void>).catch(() => undefined);
      }
    } catch {
      // Full screen was refused (inside an embedded frame, for example) — the player stays as is.
    }
  }
}

declare global {
  interface Document {
    webkitFullscreenElement?: Element | null;
    webkitExitFullscreen?: () => Promise<void>;
  }

  interface Element {
    webkitRequestFullscreen?: (options?: FullscreenOptions) => Promise<void>;
  }
}
