import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import {
  MediaKind,
  ModelMediaEngagementService,
} from '../../../services/model-media-engagement.service';
import { CompactCount, ExactCountPopover } from '../../../shared/exact-count-popover';
import { ModelMediaCommentsDialog } from '../../../shared/model-media-comments-dialog/model-media-comments-dialog';
import { ModelMediaEngagementBar } from '../../../shared/model-media-engagement/model-media-engagement';
import { AiModelProfile } from '../ai-model-data';
import { AiModelPhotoViewer } from '../photo-viewer/ai-model-photo-viewer';
import { mosaicTileStyles } from '../all-photos/photo-mosaic';

/** Photographs near the top of the gallery load straight away; the rest wait until they are close. */
const EAGER_TILES = 4;

/**
 * The Premium Content page of a Live Chat — every photograph of the model's `PremiumContent/`
 * folder, laid out in the same editorial mosaic as the "View All" page of her portfolio, with the
 * complete engagement strip (seen, likes, comments, shares) under every frame.
 *
 * Any photograph opens full screen — a click or a double-click on its tile — where it zooms with a
 * scroll, a pinch or a double-tap, closes from the button at the top right corner, and can be
 * downloaded to the visitor's device. A floating dock at the bottom middle of the page leads back
 * to whatever the visitor had open before (her information sheet).
 *
 * The page is a layer of the chat window itself: over the whole window on a phone, over the wide
 * conversation column on a laptop. It mounts only from her information sheet's "Show Premium
 * Content" button, which opens only for a chat whose checkout included Premium Content Coverage.
 */
@Component({
  selector: 'app-chat-premium-content',
  imports: [
    AiModelPhotoViewer,
    CompactCount,
    ExactCountPopover,
    ModelMediaCommentsDialog,
    ModelMediaEngagementBar,
  ],
  templateUrl: './chat-premium-content.html',
  styleUrl: './chat-premium-content.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChatPremiumContent implements OnDestroy {
  /** The model whose exclusive frames these are. */
  readonly model = input.required<AiModelProfile>();
  /** Back to the page underneath — her information sheet. */
  readonly closed = output<void>();

  private readonly engagement = inject(ModelMediaEngagementService);

  /** Every photograph of her PremiumContent/ folder, in album order. */
  protected readonly photos = computed(() => this.model().premiumPhotos ?? []);

  /** Each photograph with its place in the mosaic for every layout width. */
  protected readonly tiles = computed(() => {
    const photos = this.photos();
    const styles = mosaicTileStyles(photos.length);
    return photos.map((photo, index) => ({ photo, style: styles[index] }));
  });

  protected readonly photoTotal = computed(() =>
    String(this.photos().length).padStart(2, '0'),
  );

  /**
   * Seen · Likes · Comments · Shares across every Premium Content photograph — the row under the
   * gallery's heading, kept in step with the counters the service receives.
   */
  protected readonly engagementTotals = computed(() => {
    const profile = this.model();
    const totals = { seen: 0, likes: 0, comments: 0, shares: 0 };
    for (const photo of this.photos()) {
      const stats = this.engagement.statsFor(profile.slug, 'photo', photo.src);
      totals.seen += stats.seen;
      totals.likes += stats.likes;
      totals.comments += stats.comments;
      totals.shares += stats.shares;
    }
    return totals;
  });

  /** The photograph whose thread the page-level comments pop-up shows. */
  protected readonly commentsTarget = signal<string | null>(null);

  /** Index of the photograph open in the full-screen viewer, or null when it is closed. */
  protected readonly activeIndex = signal<number | null>(null);

  private readonly dockBack = viewChild<ElementRef<HTMLButtonElement>>('dockBack');

  constructor() {
    // Register the Premium Content photographs so every tile's seen / likes / comments / share
    // strip has numbers of its own, separate from the public album's.
    effect(() => {
      const profile = this.model();
      if (profile) {
        this.engagement.registerModel(
          profile.slug,
          this.photos().map((photo) => ({ kind: 'photo' as MediaKind, src: photo.src })),
        );
      }
      this.commentsTarget.set(null);
      this.activeIndex.set(null);
    });

    // Land the keyboard on the floating dock as soon as the page opens.
    effect(() => {
      if (this.photos().length > 0) {
        this.dockBack()?.nativeElement.focus({ preventScroll: true });
      }
    });

    // Keep the chat window behind the page from scrolling while it is open.
    effect((onCleanup) => {
      if (typeof document === 'undefined') return;
      const body = document.body;
      const previousOverflow = body.style.overflow;
      if (this.activeIndex() !== null) body.style.overflow = 'hidden';
      onCleanup(() => {
        body.style.overflow = previousOverflow;
      });
    });
  }

  ngOnDestroy(): void {
    if (typeof document !== 'undefined') document.body.style.overflow = '';
  }

  /** The floating dock and the header's back arrow both return to her information sheet. */
  protected goBack(): void {
    this.activeIndex.set(null);
    this.commentsTarget.set(null);
    this.closed.emit();
  }

  protected frameLabel(index: number): string {
    return String(index + 1).padStart(2, '0');
  }

  protected photoAlt(name: string, index: number): string {
    return `${name} — Premium Content photograph ${index + 1}`;
  }

  protected loading(index: number): 'eager' | 'lazy' {
    return index < EAGER_TILES ? 'eager' : 'lazy';
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
   * Opens a photograph full screen. A single click is enough, and the double-click of a mouse or
   * the double-tap of a finger lands here too (requirement: double tap or double click makes the
   * photograph full screen).
   */
  protected openViewer(index: number): void {
    if (index < 0 || index >= this.photos().length) return;
    this.activeIndex.set(index);
  }

  /** The page-level comments pop-up a tile's Comments icon opens (members post, everybody reads). */
  protected openComments(src: string): void {
    this.commentsTarget.set(src);
  }

  protected closeComments(): void {
    this.commentsTarget.set(null);
  }

  protected closeViewer(): void {
    this.activeIndex.set(null);
    this.dockBack()?.nativeElement.focus({ preventScroll: true });
  }

  protected firstName(name: string): string {
    return name.trim().split(/\s+/)[0] ?? name;
  }

  protected formatTotal(value: number): string {
    return value.toLocaleString('en-US');
  }
}
