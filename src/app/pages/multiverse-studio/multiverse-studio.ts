import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  afterNextRender,
  computed,
  effect,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { PromotionSlide, promotionSlides } from '../../home/multiverse/promotion-slides';
import { AiModelPhoto } from '../ai-models/ai-model-data';
import { mosaicTileStyles } from '../ai-models/all-photos/photo-mosaic';
import { AiModelPhotoViewer } from '../ai-models/photo-viewer/ai-model-photo-viewer';

/** Photographs near the top of the page load straight away; the rest wait until they are close. */
const EAGER_TILES = 6;

export interface PromotionArchiveTile {
  photo: AiModelPhoto;
  photoIndex: number;
  alt: string;
  style: Record<string, string>;
}

/**
 * The complete NeverBeen Multiverse Studio promotion gallery (`/multiverse-studio`),
 * opened from the "Explore the NeverBeen Multiverse Studio" button on the Home page.
 *
 * Every photograph from `public/promotion` is laid out in the same editorial bento
 * mosaic as a model profile's "View All" page, without Seen, Likes, Share or Comments
 * counters. Tapping any photograph opens it in the full-screen zoomable viewer (with
 * zoom controls, pinch-to-zoom, and double-tap zoom).
 */
@Component({
  selector: 'app-multiverse-studio-page',
  imports: [RouterLink, AiModelPhotoViewer],
  templateUrl: './multiverse-studio.html',
  styleUrl: './multiverse-studio.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MultiverseStudioPage implements OnDestroy {
  protected readonly slides = signal<readonly PromotionSlide[]>(promotionSlides);

  protected readonly photos = computed<readonly AiModelPhoto[]>(() =>
    this.slides().map((slide) => ({
      src: slide.src,
      caption: `${slide.tag} — ${slide.header}`,
    })),
  );

  protected readonly tiles = computed<readonly PromotionArchiveTile[]>(() => {
    const slides = this.slides();
    const photos = this.photos();
    const styles = mosaicTileStyles(photos.length);
    return photos.map((photo, index) => ({
      photo,
      photoIndex: index,
      alt:
        slides[index]?.alt ||
        `The NeverBeen Multiverse Studio — promotion photograph ${index + 1}`,
      style: styles[index],
    }));
  });

  protected readonly photoTotal = computed(() => String(this.photos().length).padStart(2, '0'));
  protected readonly coverSrc = computed(() => this.photos()[0]?.src ?? '');

  /** Photographs that have finished loading (or failed to), so their tiles can fade in. */
  protected readonly settled = signal<ReadonlySet<string>>(new Set());

  /** Index of the photograph open in the full-screen viewer, or null when it is closed. */
  protected readonly activeIndex = signal<number | null>(null);

  private lastFocused: HTMLElement | null = null;

  constructor() {
    effect((onCleanup) => {
      if (typeof document === 'undefined') return;
      const body = document.body;
      const previousOverflow = body.style.overflow;
      if (this.activeIndex() !== null) body.style.overflow = 'hidden';
      onCleanup(() => {
        body.style.overflow = previousOverflow;
      });
    });

    afterNextRender(() => {
      if (typeof window !== 'undefined' && typeof window.scrollTo === 'function') {
        window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
      }
    });
  }

  ngOnDestroy(): void {
    if (typeof document !== 'undefined') document.body.style.overflow = '';
  }

  protected frameLabel(index: number): string {
    return String(index + 1).padStart(2, '0');
  }

  protected loading(index: number): 'eager' | 'lazy' {
    return index < EAGER_TILES ? 'eager' : 'lazy';
  }

  protected isSettled(src: string): boolean {
    return this.settled().has(src);
  }

  protected markSettled(src: string): void {
    if (this.settled().has(src)) return;
    this.settled.update((settled) => new Set(settled).add(src));
  }

  /** A soft light follows the mouse across a tile — cheap, as it only moves two CSS variables. */
  protected onTilePointerMove(event: PointerEvent): void {
    if (event.pointerType !== 'mouse') return;
    const tile = event.currentTarget as HTMLElement;
    const rect = tile.getBoundingClientRect();
    tile.style.setProperty('--spot-x', `${event.clientX - rect.left}px`);
    tile.style.setProperty('--spot-y', `${event.clientY - rect.top}px`);
  }

  protected openViewer(index: number): void {
    if (index < 0 || index >= this.photos().length) return;
    this.lastFocused =
      typeof document !== 'undefined' ? (document.activeElement as HTMLElement) : null;
    this.activeIndex.set(index);
  }

  protected closeViewer(): void {
    if (this.activeIndex() === null) return;
    this.activeIndex.set(null);
    this.lastFocused?.focus?.({ preventScroll: true });
    this.lastFocused = null;
  }
}
