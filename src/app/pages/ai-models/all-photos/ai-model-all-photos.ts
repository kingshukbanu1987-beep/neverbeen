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
import { aiModelProfiles } from '../ai-model-data';
import { AiModelPhotoViewer } from '../photo-viewer/ai-model-photo-viewer';
import { mosaicTileStyles } from './photo-mosaic';

/** Photographs near the top of the page load straight away; the rest wait until they are close. */
const EAGER_TILES = 6;

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

  /** Each photograph with its place in the mosaic for every layout width. */
  protected readonly tiles = computed(() => {
    const photos = this.photos();
    const styles = mosaicTileStyles(photos.length);
    return photos.map((photo, index) => ({ photo, style: styles[index] }));
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

  protected openViewer(index: number): void {
    if (index < 0 || index >= this.photos().length) return;
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
