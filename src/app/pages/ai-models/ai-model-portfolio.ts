import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  computed,
  effect,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import { AiModelPhoto, AiModelProfile, aiModelProfiles } from './ai-model-data';
import { AiModelBookingDialog } from './booking/ai-model-booking';
import { AiModelVideoPlayer } from './video/ai-model-video-player';

type PortfolioView = 'grid' | 'feed';
type ShareState = 'idle' | 'shared' | 'copied' | 'unsupported';

/** Fisher-Yates draw: which photograph lands in position 1, 2, 3 … of the album. */
function drawOrder(length: number): number[] {
  const positions = Array.from({ length }, (_, index) => index);
  for (let index = length - 1; index > 0; index -= 1) {
    const swap = Math.floor(Math.random() * (index + 1));
    [positions[index], positions[swap]] = [positions[swap], positions[index]];
  }
  return positions;
}

/**
 * A fresh random arrangement of the album. The portfolio re-arranges itself on every visit, so the
 * same album never opens in the same order twice; the cover, the avatar and the counts are
 * unaffected.
 */
export function shufflePhotos(photos: readonly AiModelPhoto[]): AiModelPhoto[] {
  const order = drawOrder(photos.length);
  return order.map((source) => photos[source]);
}

@Component({
  selector: 'app-ai-model-portfolio-page',
  imports: [RouterLink, AiModelBookingDialog, AiModelVideoPlayer],
  templateUrl: './ai-model-portfolio.html',
  styleUrl: './ai-model-portfolio.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(document:keydown)': 'onDocumentKeydown($event)',
  },
})
export class AiModelPortfolioPage implements OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly slug = toSignal(
    this.route.paramMap.pipe(map((params) => params.get('slug') ?? '')),
    { initialValue: this.route.snapshot.paramMap.get('slug') ?? '' },
  );

  protected readonly model = computed(
    () => aiModelProfiles.find((profile) => profile.slug === this.slug()) ?? null,
  );

  /**
   * Every photograph in the model's album, shuffled fresh for this visit. It recomputes whenever the
   * model changes — opening a portfolio (or moving to another model and back) re-arranges the grid —
   * and whenever the visitor asks for another arrangement from the gallery toolbar.
   */
  protected readonly shuffleTick = signal(0);
  protected readonly photos = computed(() => {
    this.shuffleTick();
    return shufflePhotos(this.model()?.photos ?? []);
  });

  protected readonly view = signal<PortfolioView>('grid');

  /**
   * The clips in the album's `video/` folder, in album order — the reel shown directly under the
   * model's personal details. Unlike the photographs, the reel keeps its order so a series reads
   * the way it was uploaded.
   */
  protected readonly videos = computed(() => this.model()?.videos ?? []);

  /** Index of the photograph expanded in the pop-up, or null when it is closed. */
  protected readonly activeIndex = signal<number | null>(null);

  /** Index of the clip open in the video player, or null when the player is closed. */
  protected readonly activeVideoIndex = signal<number | null>(null);

  protected readonly videoPlayerOpen = computed(() => this.activeVideoIndex() !== null);

  protected readonly shareState = signal<ShareState>('idle');

  /** The Rent form pop-up. */
  protected readonly bookingOpen = signal(false);

  /** The model's own rate for one photograph, shown next to the Rent button. */
  protected readonly ratePerPhoto = computed(() => this.model()?.photoRate ?? 0);

  protected readonly lightboxPhoto = computed(() => {
    const index = this.activeIndex();
    if (index === null) return null;
    const photo = this.photos()[index];
    return photo ? { photo, index } : null;
  });

  protected readonly shareLabel = computed(() => {
    switch (this.shareState()) {
      case 'shared':
        return 'Profile shared';
      case 'copied':
        return 'Link copied';
      case 'unsupported':
        return 'Copy not available';
      default:
        return 'Share profile';
    }
  });

  private readonly closeButton = viewChild<ElementRef<HTMLButtonElement>>('lightboxClose');
  private readonly rentButton = viewChild<ElementRef<HTMLButtonElement>>('rentButton');
  private lastFocused: HTMLElement | null = null;
  private lastFocusedVideo: HTMLElement | null = null;
  private touchStartX = 0;
  private shareTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    // Keep the page behind the pop-up from scrolling while it is open.
    effect((onCleanup) => {
      if (typeof document === 'undefined') return;
      const body = document.body;
      const previousOverflow = body.style.overflow;
      if (this.activeIndex() !== null || this.activeVideoIndex() !== null) {
        body.style.overflow = 'hidden';
      }
      onCleanup(() => {
        body.style.overflow = previousOverflow;
      });
    });

    // Move focus into the pop-up as soon as it renders.
    effect(() => {
      if (this.activeIndex() === null) return;
      this.closeButton()?.nativeElement.focus({ preventScroll: true });
    });
  }

  ngOnDestroy(): void {
    if (this.shareTimer) clearTimeout(this.shareTimer);
    if (typeof document !== 'undefined') document.body.style.overflow = '';
  }

  protected fact(value: string): string {
    return value.trim() || 'Details to be added';
  }

  protected photoAlt(name: string, index: number): string {
    return `${name} — portfolio photograph ${index + 1}`;
  }

  protected frameLabel(index: number): string {
    return String(index + 1).padStart(2, '0');
  }

  protected totalLabel(): string {
    return this.frameLabel(Math.max(this.photos().length - 1, 0));
  }

  protected photoCount(): string {
    return String(this.photos().length).padStart(2, '0');
  }

  /** How many clips the album's video folder holds. */
  protected videoCount(): number {
    return this.videos().length;
  }

  protected videoLabel(): string {
    return this.videos().length === 1 ? 'video' : 'videos';
  }

  protected videoTitle(index: number): string {
    const clip = this.videos()[index];
    if (!clip) return '';
    return clip.caption || `${this.model()?.name ?? 'Portfolio'} · clip ${this.frameLabel(index)}`;
  }

  /** Staggered reveal for the grid, capped so long albums do not wait on the animation. */
  protected tileDelay(index: number): number {
    return Math.min(index * 45, 540);
  }

  protected photoCaption(index: number): string {
    const photo = this.photos()[index];
    if (!photo) return '';
    return (
      photo.caption || `${this.model()?.name ?? 'Portfolio'} · frame ${this.frameLabel(index)}`
    );
  }

  /**
   * The caption split so its frame number can be set in the numeric face: a custom caption is
   * returned whole, while the generated "Name · frame NN" fallback keeps NN in `frame`.
   */
  protected captionParts(index: number): { text: string; frame: string } {
    const photo = this.photos()[index];
    if (!photo) return { text: '', frame: '' };
    if (photo.caption) return { text: photo.caption, frame: '' };
    return { text: `${this.model()?.name ?? 'Portfolio'} · frame `, frame: this.frameLabel(index) };
  }

  protected openBooking(): void {
    this.bookingOpen.set(true);
  }

  protected closeBooking(): void {
    this.bookingOpen.set(false);
    this.rentButton()?.nativeElement.focus({ preventScroll: true });
  }

  /** Another arrangement of the same album, without leaving the page. */
  protected shuffleNow(): void {
    this.shuffleTick.update((tick) => tick + 1);
  }

  protected setView(view: PortfolioView): void {
    this.view.set(view);
  }

  protected openLightbox(index: number): void {
    this.lastFocused =
      typeof document !== 'undefined' ? (document.activeElement as HTMLElement) : null;
    this.activeIndex.set(index);
  }

  protected openVideo(index: number): void {
    this.lastFocusedVideo =
      typeof document !== 'undefined' ? (document.activeElement as HTMLElement) : null;
    this.activeVideoIndex.set(index);
  }

  protected closeVideo(): void {
    if (this.activeVideoIndex() === null) return;
    this.activeVideoIndex.set(null);
    this.lastFocusedVideo?.focus?.({ preventScroll: true });
    this.lastFocusedVideo = null;
  }

  protected closeLightbox(): void {
    if (this.activeIndex() === null) return;
    this.activeIndex.set(null);
    this.lastFocused?.focus?.({ preventScroll: true });
    this.lastFocused = null;
  }

  protected selectPhoto(index: number): void {
    if (index < 0 || index >= this.photos().length) return;
    this.activeIndex.set(index);
  }

  protected showNext(): void {
    const count = this.photos().length;
    if (count === 0) return;
    this.activeIndex.update((index) => ((index ?? 0) + 1) % count);
  }

  protected showPrevious(): void {
    const count = this.photos().length;
    if (count === 0) return;
    this.activeIndex.update((index) => ((index ?? 0) - 1 + count) % count);
  }

  protected onDocumentKeydown(event: KeyboardEvent): void {
    // The video player runs its own shortcuts while it is open.
    if (this.activeIndex() === null || this.activeVideoIndex() !== null) return;

    switch (event.key) {
      case 'Escape':
        this.closeLightbox();
        break;
      case 'ArrowRight':
        this.showNext();
        break;
      case 'ArrowLeft':
        this.showPrevious();
        break;
      default:
        return;
    }
    event.preventDefault();
  }

  /** Clicking the dark space around the pop-up photograph dismisses it. */
  protected onLightboxBackdropClick(event: MouseEvent): void {
    const target = event.target as HTMLElement | null;
    if (target?.closest('button, img, a')) return;
    this.closeLightbox();
  }

  protected onTouchStart(event: TouchEvent): void {
    this.touchStartX = event.changedTouches[0]?.clientX ?? 0;
  }

  protected onTouchEnd(event: TouchEvent): void {
    const delta = (event.changedTouches[0]?.clientX ?? 0) - this.touchStartX;
    if (Math.abs(delta) < 45) return;
    if (delta < 0) this.showNext();
    else this.showPrevious();
  }

  protected async shareProfile(profile: AiModelProfile): Promise<void> {
    const url = typeof location !== 'undefined' ? location.href : '';
    const data = {
      title: `${profile.name} · NeverBeen AI model`,
      text: profile.bio,
      url,
    };

    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      try {
        await navigator.share(data);
        this.flashShareState('shared');
        return;
      } catch {
        // The visitor dismissed the share sheet — fall through to copying the link.
      }
    }

    try {
      await navigator.clipboard.writeText(url);
      this.flashShareState('copied');
    } catch {
      this.flashShareState('unsupported');
    }
  }

  private flashShareState(state: ShareState): void {
    this.shareState.set(state);
    if (this.shareTimer) clearTimeout(this.shareTimer);
    this.shareTimer = setTimeout(() => this.shareState.set('idle'), 2600);
  }
}
