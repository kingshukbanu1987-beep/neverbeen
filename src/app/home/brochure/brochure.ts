import { isPlatformBrowser } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  PLATFORM_ID,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { SiteConfigService } from '../../services/site-config.service';
import { BrochureSlide, brochureSlides } from './brochure-slides';

/** Default time each brochure memo remains on stage before the next one fades in (seconds). */
export const BROCHURE_MEMO_INTERVAL_SECONDS = 5;
export const BROCHURE_MEMO_INTERVAL_MS = BROCHURE_MEMO_INTERVAL_SECONDS * 1000;

@Component({
  selector: 'app-brochure',
  imports: [],
  templateUrl: './brochure.html',
  styleUrl: './brochure.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Brochure {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly destroyRef = inject(DestroyRef);
  private readonly cms = inject(SiteConfigService);

  protected readonly title = computed(
    () => this.cms.text('home.brochure', 'title') || 'The NeverBeen Brochure',
  );
  protected readonly copy = computed(
    () =>
      this.cms.text('home.brochure', 'copy') ||
      'Fifty-three colourful pages with the destinations we compose, the photographs clients keep, the packages and prices, and a step-by-step guide to placing your Neverbeen Request — plus traveller stories from across the world.',
  );
  protected readonly autoplay = computed(() => this.cms.flag('home.brochure', 'autoplay'));
  protected readonly intervalMs = computed(() => {
    const raw = Number(this.cms.get<number>('home.brochure', 'seconds'));
    const seconds =
      Number.isFinite(raw) && raw >= 1
        ? Math.min(30, raw)
        : BROCHURE_MEMO_INTERVAL_SECONDS;
    return seconds * 1000;
  });

  protected readonly slides: readonly BrochureSlide[] = brochureSlides;
  protected readonly total = brochureSlides.length;

  /** Index of the brochure page currently on stage. */
  protected readonly activeIndex = signal(0);

  /** Current slide for the template and aria-live region. */
  protected readonly current = computed<BrochureSlide>(
    () => this.slides[this.activeIndex()] ?? this.slides[0],
  );

  /** Formatted counter, e.g. "01 / 22". */
  protected readonly counterLabel = computed(() => {
    const current = String(this.activeIndex() + 1).padStart(2, '0');
    const total = String(this.total).padStart(2, '0');
    return `${current} / ${total}`;
  });

  /** Percentage progress through the 22 brochure pages, for the progress bar. */
  protected readonly progressPercent = computed(() =>
    this.total > 0 ? ((this.activeIndex() + 1) / this.total) * 100 : 0,
  );

  private timer: ReturnType<typeof setInterval> | null = null;
  private touchStartX: number | null = null;

  constructor() {
    if (isPlatformBrowser(this.platformId) && this.total > 1) {
      effect(() => {
        const play = this.autoplay();
        const ms = this.intervalMs();
        this.stopAutoAdvance();
        if (play) {
          this.timer = setInterval(() => this.advance(1), ms);
        }
      });
      this.destroyRef.onDestroy(() => this.stopAutoAdvance());
    }
  }

  protected next(): void {
    this.advance(1);
    this.restartAutoAdvance();
  }

  protected previous(): void {
    this.advance(-1);
    this.restartAutoAdvance();
  }

  protected onKeydown(event: KeyboardEvent): void {
    if (event.key === 'ArrowRight') {
      event.preventDefault();
      this.next();
    } else if (event.key === 'ArrowLeft') {
      event.preventDefault();
      this.previous();
    }
  }

  protected onTouchStart(event: TouchEvent): void {
    this.touchStartX = event.changedTouches[0]?.clientX ?? null;
  }

  protected onTouchEnd(event: TouchEvent): void {
    if (this.touchStartX === null) return;
    const endX = event.changedTouches[0]?.clientX ?? this.touchStartX;
    const delta = endX - this.touchStartX;
    this.touchStartX = null;
    if (Math.abs(delta) < 36) return;
    if (delta < 0) {
      this.next();
    } else {
      this.previous();
    }
  }

  /** Only render the active, previous and next slides so 22 photographs stay light. */
  protected isMounted(index: number): boolean {
    if (this.total <= 3) return true;
    const active = this.activeIndex();
    const prev = (active - 1 + this.total) % this.total;
    const next = (active + 1) % this.total;
    return index === active || index === prev || index === next;
  }

  private advance(step: number): void {
    if (this.total === 0) return;
    this.activeIndex.update((index) => (index + step + this.total) % this.total);
  }

  private startAutoAdvance(): void {
    this.stopAutoAdvance();
    if (!isPlatformBrowser(this.platformId) || this.total <= 1 || !this.autoplay()) return;
    this.timer = setInterval(() => this.advance(1), this.intervalMs());
  }

  private stopAutoAdvance(): void {
    if (this.timer !== null) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  private restartAutoAdvance(): void {
    if (!isPlatformBrowser(this.platformId) || this.total <= 1) return;
    this.startAutoAdvance();
  }
}
