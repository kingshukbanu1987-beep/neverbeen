import { DOCUMENT } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnDestroy,
  computed,
  inject,
  signal,
} from '@angular/core';
import { sampleWithoutReplacement } from '../../shared/random-sample';
import { SiteConfigService } from '../../services/site-config.service';
import { PromotionSlide, promotionSlides } from './promotion-slides';

/** The shipped pace of the slideshow: one memo every three seconds. */
export const MEMO_INTERVAL_SECONDS = 3;

/**
 * The NeverBeen Multiverse Studio.
 *
 * A one-memo-at-a-time slideshow of the promotion photographs in
 * `public/promotion` (manifest: `promotion-slides.ts`). The memos are shuffled
 * into a random order on every page load and then played one after another;
 * the visitor can always step back to the previous memo or forward to the next
 * one, which restarts the three-second timer.
 *
 * Renders exactly one memo in every viewport — the widescreen panel and the
 * mobile panel share the same markup and only the scale of the type changes.
 */
@Component({
  selector: 'app-multiverse',
  templateUrl: './multiverse.html',
  styleUrl: './multiverse.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Multiverse implements OnDestroy {
  private readonly cms = inject(SiteConfigService);
  private readonly document = inject(DOCUMENT);
  private readonly destroyRef = inject(DestroyRef);

  /** All memos in a fresh random order (Fisher–Yates), fixed for this visit. */
  protected readonly slides = sampleWithoutReplacement(promotionSlides, promotionSlides.length);

  protected readonly total = this.slides.length;

  /** Two stacked layers cross-fade; only the active one is visible. */
  private readonly layers = signal<[PromotionSlide | null, PromotionSlide | null]>([
    this.slides[0] ?? null,
    null,
  ]);
  private readonly activeLayer = signal<0 | 1>(0);
  protected readonly index = signal(0);

  protected readonly layersView = this.layers.asReadonly();
  protected readonly activeLayerView = this.activeLayer.asReadonly();

  /** The memo whose words are on screen — keyed by `src` so the text animates in per slide. */
  protected readonly currentSlides = computed<PromotionSlide[]>(() => {
    const slide = this.slides[this.index()];
    return slide ? [slide] : [];
  });

  protected readonly current = computed<PromotionSlide | null>(() => this.slides[this.index()] ?? null);

  protected readonly eyebrow = computed(() => this.cms.text('home.multiverse', 'eyebrow'));
  protected readonly title = computed(() => this.cms.text('home.multiverse', 'title'));
  protected readonly copy = computed(() => this.cms.text('home.multiverse', 'copy'));

  /** Seconds per memo, published from Admin Console → Website Management. */
  protected readonly intervalSeconds = computed(() => {
    const value = Number(this.cms.get('home.multiverse', 'seconds'));
    if (!Number.isFinite(value)) return MEMO_INTERVAL_SECONDS;
    return Math.min(20, Math.max(2, Math.round(value)));
  });

  protected readonly autoplay = computed(() => this.cms.flag('home.multiverse', 'autoplay'));

  /**
   * Alternates on every advance so the two `@if` branches below swap the rail
   * for a brand-new element — the only reliable way to restart a CSS animation.
   */
  private readonly progressKey = signal(0);
  protected readonly progressOdd = computed(() => this.progressKey() % 2 === 1);

  private timer: ReturnType<typeof setInterval> | null = null;
  private touchStartX: number | null = null;

  constructor() {
    this.preloadNext();
    this.start();

    const view = this.document.defaultView;
    const onVisibility = () => (view?.document.hidden ? this.stop() : this.start());
    view?.addEventListener('visibilitychange', onVisibility);
    this.destroyRef.onDestroy(() => {
      this.stop();
      view?.removeEventListener('visibilitychange', onVisibility);
    });
  }

  ngOnDestroy(): void {
    this.stop();
  }

  protected isActive(layer: number): boolean {
    return this.activeLayer() === layer;
  }

  /** Step the slideshow; `1` is the next memo, `-1` the previous one. */
  protected go(step: number): void {
    if (this.total < 2) return;
    const next = (this.index() + step + this.total) % this.total;
    const target: 0 | 1 = this.activeLayer() === 0 ? 1 : 0;
    const layers: [PromotionSlide | null, PromotionSlide | null] = [...this.layers()] as [
      PromotionSlide | null,
      PromotionSlide | null,
    ];
    layers[target] = this.slides[next];

    this.layers.set(layers);
    this.activeLayer.set(target);
    this.index.set(next);

    this.preloadNext();
    this.start();
  }

  protected next(): void {
    this.go(1);
  }

  protected previous(): void {
    this.go(-1);
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
    const start = this.touchStartX;
    this.touchStartX = null;
    if (start === null) return;
    const delta = (event.changedTouches[0]?.clientX ?? start) - start;
    if (Math.abs(delta) < 45) return;
    delta < 0 ? this.next() : this.previous();
  }

  protected pad(value: number): string {
    return String(value).padStart(2, '0');
  }

  /** Warm the next photograph so the cross-fade never waits on the network. */
  private preloadNext(): void {
    const upcoming = this.slides[(this.index() + 1) % this.total];
    const view = this.document.defaultView;
    if (!upcoming || !view || typeof view.Image !== 'function') return;
    const image = new view.Image();
    image.src = upcoming.src;
  }

  private start(): void {
    this.stop();
    // Restart the progress rail for the new memo (or the re-armed timer).
    this.progressKey.update((key) => key + 1);
    if (!this.autoplay() || this.total < 2) return;
    const view = this.document.defaultView;
    if (view?.document.hidden) return;
    this.timer = setInterval(() => this.go(1), this.intervalSeconds() * 1000);
  }

  private stop(): void {
    if (this.timer !== null) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }
}
