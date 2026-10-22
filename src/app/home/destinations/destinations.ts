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
import { RouterLink } from '@angular/router';
import { Destination, destinations } from '../../models/site-content';
import { SiteConfigService } from '../../services/site-config.service';

/** The shipped pace of the destination memo slideshow: one destination memo every five seconds. */
export const DESTINATION_MEMO_INTERVAL_SECONDS = 5;

/**
 * Popular Destinations — ultra-modern white studio memo slideshow.
 *
 * Each destination in the atlas is treated as one individual memo and shown one
 * at a time in a full-width studio stage, advancing every five seconds. Visitors
 * can step back to the previous destination or forward to the next one at any
 * time (which restarts the five-second timer) or open the destination's guide.
 */
@Component({
  selector: 'app-destinations',
  imports: [RouterLink],
  templateUrl: './destinations.html',
  styleUrl: './destinations.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Destinations implements OnDestroy {
  private readonly cms = inject(SiteConfigService);
  private readonly document = inject(DOCUMENT);
  private readonly destroyRef = inject(DestroyRef);

  /** Visible destinations in the order configured in Website Management. */
  protected readonly destinations = computed<Destination[]>(() => {
    const visible = this.cms.visibleItems?.('home.destinations', 'items');
    if (!visible) return destinations;
    return visible
      .map((i) => destinations.find((d) => d.slug === i.id))
      .filter((d): d is Destination => !!d);
  });

  protected readonly slides: Destination[] = this.destinations();
  protected readonly total = this.slides.length;

  /** Two stacked layers cross-fade; only the active one is visible. */
  private readonly layers = signal<[Destination | null, Destination | null]>([
    this.slides[0] ?? null,
    null,
  ]);
  private readonly activeLayer = signal<0 | 1>(0);
  protected readonly index = signal(0);

  protected readonly layersView = this.layers.asReadonly();
  protected readonly activeLayerView = this.activeLayer.asReadonly();

  /** The destination memo whose words are on screen — keyed by `slug` so the text animates in per slide. */
  protected readonly currentSlides = computed<Destination[]>(() => {
    const slide = this.slides[this.index()];
    return slide ? [slide] : [];
  });

  protected readonly current = computed<Destination | null>(
    () => this.slides[this.index()] ?? null,
  );

  protected readonly eyebrow = computed(
    () => this.cms.text?.('home.destinations', 'eyebrow') || 'The atlas',
  );
  protected readonly title = computed(
    () => this.cms.text?.('home.destinations', 'title') || 'Popular Destinations',
  );
  protected readonly copy = computed(
    () =>
      this.cms.text?.('home.destinations', 'copy') ||
      'Places people book in their minds long before they book a flight.',
  );

  /** Five-second pace per destination memo. */
  protected readonly intervalSeconds = computed(() => {
    const value = Number(this.cms.get?.('home.destinations', 'seconds'));
    if (!Number.isFinite(value) || value <= 0) return DESTINATION_MEMO_INTERVAL_SECONDS;
    return Math.min(20, Math.max(2, Math.round(value)));
  });

  protected readonly autoplay = computed(() => {
    const raw = this.cms.get?.('home.destinations', 'autoplay');
    return raw === undefined ? true : !!raw;
  });

  /**
   * Alternates on every advance so the two `@if` branches swap the rail
   * for a brand-new element to restart the CSS animation cleanly.
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

  /** Step the slideshow; `1` is the next destination memo, `-1` the previous one. */
  protected go(step: number): void {
    if (this.total < 2) return;
    const next = (this.index() + step + this.total) % this.total;
    const target: 0 | 1 = this.activeLayer() === 0 ? 1 : 0;
    const layers: [Destination | null, Destination | null] = [...this.layers()] as [
      Destination | null,
      Destination | null,
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

  /** Warm the next destination photograph so the cross-fade never waits on the network. */
  private preloadNext(): void {
    const upcoming = this.slides[(this.index() + 1) % this.total];
    const view = this.document.defaultView;
    if (!upcoming || !view || typeof view.Image !== 'function') return;
    const image = new view.Image();
    image.src = upcoming.image;
  }

  private start(): void {
    this.stop();
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
