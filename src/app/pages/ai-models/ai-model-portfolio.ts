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
import { AiModelProfile, aiModelProfiles } from './ai-model-data';
import { AiModelBookingDialog } from './booking/ai-model-booking';

type PortfolioView = 'grid' | 'feed';
type ShareState = 'idle' | 'shared' | 'copied' | 'unsupported';

@Component({
  selector: 'app-ai-model-portfolio-page',
  imports: [RouterLink, AiModelBookingDialog],
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

  /** Every photograph in the model's album — cover first. */
  protected readonly photos = computed(() => this.model()?.photos ?? []);

  protected readonly view = signal<PortfolioView>('grid');

  /** Index of the photograph expanded in the pop-up, or null when it is closed. */
  protected readonly activeIndex = signal<number | null>(null);

  protected readonly shareState = signal<ShareState>('idle');

  /** The Rent form pop-up. */
  protected readonly bookingOpen = signal(false);

  /** Cheapest published term, shown next to the Rent button. */
  protected readonly rateFrom = computed(() => {
    const rates = this.model()?.rates ?? [];
    if (rates.length === 0) return null;
    return rates.reduce((cheapest, rate) => (rate.usd < cheapest.usd ? rate : cheapest), rates[0]);
  });

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
  private touchStartX = 0;
  private shareTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    // Keep the page behind the pop-up from scrolling while it is open.
    effect((onCleanup) => {
      if (typeof document === 'undefined') return;
      const body = document.body;
      const previousOverflow = body.style.overflow;
      if (this.activeIndex() !== null) body.style.overflow = 'hidden';
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

  protected openBooking(): void {
    this.bookingOpen.set(true);
  }

  protected closeBooking(): void {
    this.bookingOpen.set(false);
    this.rentButton()?.nativeElement.focus({ preventScroll: true });
  }

  protected setView(view: PortfolioView): void {
    this.view.set(view);
  }

  protected openLightbox(index: number): void {
    this.lastFocused =
      typeof document !== 'undefined' ? (document.activeElement as HTMLElement) : null;
    this.activeIndex.set(index);
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
    if (this.activeIndex() === null) return;

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
