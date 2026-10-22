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
import { StorylineSlide, storylineSlides } from './storyline-slides';

/** Default time each storyline memo remains on stage before the next one fades in (seconds). */
export const STORYLINE_MEMO_INTERVAL_SECONDS = 5;
export const STORYLINE_MEMO_INTERVAL_MS = STORYLINE_MEMO_INTERVAL_SECONDS * 1000;

export const DEFAULT_STORYLINE_TITLE = 'The Storyline of Parallel Universe';

@Component({
  selector: 'app-storyline-section',
  imports: [],
  templateUrl: './storyline-section.html',
  styleUrl: './storyline-section.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StorylineSection {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly destroyRef = inject(DestroyRef);
  private readonly cms = inject(SiteConfigService);

  protected readonly title = computed(
    () => this.cms.text('home.storyline', 'title') || DEFAULT_STORYLINE_TITLE,
  );
  protected readonly isDefaultTitle = computed(() => this.title() === DEFAULT_STORYLINE_TITLE);
  protected readonly copy = computed(
    () =>
      this.cms.text('home.storyline', 'copy') ||
      'Nine real-feelings scenarios about the journeys people carry in their hearts — postponed by work, distance, illness or loss — and how a Parallel Universe frame lets an unlived moment be seen with honesty and care.',
  );
  protected readonly autoplay = computed(() => this.cms.flag('home.storyline', 'autoplay'));
  protected readonly intervalMs = computed(() => {
    const raw = Number(this.cms.get<number>('home.storyline', 'seconds'));
    const seconds =
      Number.isFinite(raw) && raw >= 1
        ? Math.min(30, raw)
        : STORYLINE_MEMO_INTERVAL_SECONDS;
    return seconds * 1000;
  });

  protected readonly slides: readonly StorylineSlide[] = storylineSlides;
  protected readonly total = storylineSlides.length;

  /** Index of the story currently on stage. */
  protected readonly activeIndex = signal(0);

  /** Current story for the template and aria-live region. */
  protected readonly current = computed<StorylineSlide>(
    () => this.slides[this.activeIndex()] ?? this.slides[0],
  );

  /** Formatted counter, e.g. "01 / 09". */
  protected readonly counterLabel = computed(() => {
    const current = String(this.activeIndex() + 1).padStart(2, '0');
    const total = String(this.total).padStart(2, '0');
    return `${current} / ${total}`;
  });

  /** Percentage progress through the 9 stories, for the progress bar. */
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

  /** Only render the active, previous and next slides so the deck stays light. */
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
