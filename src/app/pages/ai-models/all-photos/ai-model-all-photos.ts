import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  afterNextRender,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { map } from 'rxjs';
import {
  MediaKind,
  ModelMediaEngagementService,
} from '../../../services/model-media-engagement.service';
import { CompactCount, ExactCountPopover } from '../../../shared/exact-count-popover';
import { ModelMediaCommentsDialog } from '../../../shared/model-media-comments-dialog/model-media-comments-dialog';
import { ModelMediaEngagementBar } from '../../../shared/model-media-engagement/model-media-engagement';
import { AiModelPhoto, aiModelProfiles } from '../ai-model-data';
import { PremiumPhotoTeaser } from '../premium-content/premium-photo-teaser';
import { AiModelPhotoViewer } from '../photo-viewer/ai-model-photo-viewer';
import { mosaicTileStyles } from './photo-mosaic';

/** Photographs near the top of the page load straight away; the rest wait until they are close. */
const EAGER_TILES = 6;

/** How many locked Premium Content frames the mosaic teases at most. */
const PREMIUM_TEASER_LIMIT = 4;

/**
 * The first rows of the mosaic where the locked Premium Content frames land. The mosaic re-flows
 * between two, three and four columns, so a fixed tile window is the honest equivalent of "the
 * first five rows": eight tiles reach the fifth row on a phone's two columns and sit within it on
 * a desktop's four.
 */
const FIRST_ROWS_TILES = 8;

/** One tile of the mosaic: an album photograph, or a locked Premium Content teaser. */
export interface AlbumTile {
  photo: AiModelPhoto;
  /** True when this tile is a locked Premium Content frame rather than an album photograph. */
  premium: boolean;
  /**
   * The photograph's own place in the album — the index the full-screen viewer opens at. `null`
   * on a locked Premium Content teaser, which never opens.
   */
  photoIndex: number | null;
}

/** Fisher-Yates draw, so the teased Premium Content frames never sit in the same place twice. */
function drawOrder(length: number): number[] {
  const positions = Array.from({ length }, (_, index) => index);
  for (let index = length - 1; index > 0; index -= 1) {
    const swap = Math.floor(Math.random() * (index + 1));
    [positions[index], positions[swap]] = [positions[swap], positions[index]];
  }
  return positions;
}

/**
 * The album's photographs with the locked Premium Content teasers woven in: at random, never one
 * straight after another, and never ahead of the cover that opens the mosaic — within the first
 * rows of the page, wherever the mosaic's own layout carries them.
 */
export function interleavePremiumTeasers(
  photos: readonly AiModelPhoto[],
  teasers: readonly AiModelPhoto[],
): AlbumTile[] {
  const tiles: AlbumTile[] = photos.map((photo, index) => ({
    photo,
    premium: false,
    photoIndex: index,
  }));
  if (teasers.length === 0 || photos.length === 0) return tiles;

  const total = photos.length + teasers.length;
  // The window never reaches past the first rows, and never in front of the opening cover.
  const windowEnd = Math.min(FIRST_ROWS_TILES, total);
  const candidates = Array.from({ length: Math.max(windowEnd - 1, 0) }, (_, index) => index + 1);
  // `teasers.length` non-adjacent slots need 2·n − 1 candidates to exist at all.
  const roomForAll = candidates.length >= 2 * teasers.length - 1;

  let slots: number[] = [];
  for (let attempt = 0; attempt < 24; attempt += 1) {
    for (let index = candidates.length - 1; index > 0; index -= 1) {
      const swap = Math.floor(Math.random() * (index + 1));
      [candidates[index], candidates[swap]] = [candidates[swap], candidates[index]];
    }

    slots = [];
    for (const slot of candidates) {
      if (slots.length >= teasers.length) break;
      if (slots.every((taken) => Math.abs(taken - slot) >= 2)) slots.push(slot);
    }
    // Keep drawing until the whole count fits; when it never can, keep the best partial set.
    if (slots.length >= teasers.length || !roomForAll) break;
  }
  slots.sort((a, b) => a - b);

  let nextTeaser = 0;
  for (const slot of slots) {
    const teaser = teasers[nextTeaser];
    if (!teaser) break;
    tiles.splice(slot, 0, { photo: teaser, premium: true, photoIndex: null });
    nextTeaser += 1;
  }
  return tiles;
}

/**
 * A model's complete album — `/ai-models/:slug/photos`, opened from the "View All" tile of her
 * portfolio. Every photograph is laid out in an editorial mosaic where the tiles come in different
 * sizes, in the album's own order (the cover first, as the opening feature). Any photograph opens in
 * the zoomable viewer, and a floating dock at the bottom leads back to the portfolio.
 */
@Component({
  selector: 'app-ai-model-all-photos-page',
  imports: [
    RouterLink,
    AiModelPhotoViewer,
    CompactCount,
    ExactCountPopover,
    ModelMediaCommentsDialog,
    ModelMediaEngagementBar,
    PremiumPhotoTeaser,
  ],
  templateUrl: './ai-model-all-photos.html',
  styleUrl: './ai-model-all-photos.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AiModelAllPhotosPage implements OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly slug = toSignal(
    this.route.paramMap.pipe(map((params) => params.get('slug') ?? '')),
    { initialValue: this.route.snapshot.paramMap.get('slug') ?? '' },
  );

  private readonly engagement = inject(ModelMediaEngagementService);

  /** The photograph whose thread the page-level comments pop-up shows. */
  protected readonly commentsTarget = signal<{ src: string } | null>(null);

  protected readonly model = computed(
    () => aiModelProfiles.find((profile) => profile.slug === this.slug()) ?? null,
  );

  protected readonly photos = computed(() => this.model()?.photos ?? []);

  /**
   * The locked Premium Content frames this visit teases — at least four whenever the model holds
   * four or more in her `PremiumContent/` folder — drawn afresh on every visit to the album.
   */
  protected readonly premiumTeasers = computed(() => {
    const premium = this.model()?.premiumPhotos ?? [];
    return drawOrder(premium.length).map((source) => premium[source]).slice(0, PREMIUM_TEASER_LIMIT);
  });

  /** True when the mosaic carries at least one locked Premium Content teaser. */
  protected readonly hasPremiumTeasers = computed(() => this.premiumTeasers().length > 0);

  /** Each tile of the mosaic — photograph or locked teaser — with its place in every layout. */
  protected readonly tiles = computed(() => {
    const tiles = interleavePremiumTeasers(this.photos(), this.premiumTeasers());
    const styles = mosaicTileStyles(tiles.length);
    return tiles.map((tile, index) => ({ ...tile, style: styles[index] }));
  });

  protected readonly photoTotal = computed(() => String(this.photos().length).padStart(2, '0'));

  /**
   * Album-wide engagement totals for the whole model — every photograph of this album **and** every
   * clip of her reel, so the "Seen" figure counts the opens of all her media. The numbers update as
   * the service receives fresh counters.
   */
  protected readonly engagementTotals = computed(() => {
    const profile = this.model();
    const totals = { seen: 0, likes: 0, comments: 0, shares: 0 };

    if (!profile) return totals;

    for (const photo of profile.photos) {
      const stats = this.engagement.statsFor(profile.slug, 'photo', photo.src);
      totals.seen += stats.seen;
      totals.likes += stats.likes;
      totals.comments += stats.comments;
      totals.shares += stats.shares;
    }
    for (const video of profile.videos) {
      const stats = this.engagement.statsFor(profile.slug, 'video', video.src);
      totals.seen += stats.seen;
      totals.likes += stats.likes;
      totals.comments += stats.comments;
      totals.shares += stats.shares;
    }

    return totals;
  });

  /** Keep totals exact while grouping longer values for quick scanning. */
  protected formatTotal(value: number): string {
    return value.toLocaleString('en-US');
  }

  /** Photographs that have finished loading (or failed to), so their tiles can fade in. */
  protected readonly settled = signal<ReadonlySet<string>>(new Set());

  /** Index of the photograph open in the viewer, or null when it is closed. */
  protected readonly activeIndex = signal<number | null>(null);

  private lastFocused: HTMLElement | null = null;

  constructor() {
    // Keep the page behind the viewer from scrolling while it is open.
    effect((onCleanup) => {
      if (typeof document === 'undefined') return;
      const body = document.body;
      const previousOverflow = body.style.overflow;
      if (this.activeIndex() !== null) body.style.overflow = 'hidden';
      onCleanup(() => {
        body.style.overflow = previousOverflow;
      });
    });

    // Register the album so every mosaic tile's seen / likes / comments / share strip has
    // numbers — her clips are registered too, because the album's totals cover all her media —
    // and close the page-level comments pop-up when the model changes.
    effect(() => {
      const profile = this.model();
      const slug = profile?.slug;
      if (slug && profile) {
        this.engagement.registerModel(slug, [
          ...profile.photos.map((photo) => ({ kind: 'photo' as MediaKind, src: photo.src })),
          ...profile.videos.map((video) => ({ kind: 'video' as MediaKind, src: video.src })),
        ]);
      }
      this.commentsTarget.set(null);
    });

    // Open the album at its top straight away, rather than gliding up from the scroll position the
    // portfolio was left at.
    afterNextRender(() => {
      if (typeof window.scrollTo === 'function') {
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

  protected photoAlt(name: string, index: number): string {
    return `${name} — portfolio photograph ${index + 1}`;
  }

  protected firstName(name: string): string {
    return name.trim().split(/\s+/)[0] ?? name;
  }

  protected modelLocation(location: string): string {
    const parts = location
      .split(',')
      .map((part) => part.trim())
      .filter(Boolean);
    return parts.length > 0 ? parts.join(' · ') : 'Location to be announced';
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

  /**
   * Opens a photograph full screen, at its own place in the album. A locked Premium Content teaser
   * passes `null` and never opens — its complete frame belongs to a paid Premium Live Chat.
   */
  protected openViewer(index: number | null): void {
    if (index === null || index < 0 || index >= this.photos().length) return;
    this.lastFocused =
      typeof document !== 'undefined' ? (document.activeElement as HTMLElement) : null;
    this.activeIndex.set(index);
  }

  /** The page-level comments pop-up a tile's Comments icon opens (members only). */
  protected openComments(src: string): void {
    this.commentsTarget.set({ src });
  }

  protected closeComments(): void {
    this.commentsTarget.set(null);
  }

  protected closeViewer(): void {
    if (this.activeIndex() === null) return;
    this.activeIndex.set(null);
    this.lastFocused?.focus?.({ preventScroll: true });
    this.lastFocused = null;
  }
}
