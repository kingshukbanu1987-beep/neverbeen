import { DOCUMENT } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { SiteConfigService } from '../../services/site-config.service';
import { HERO_PEOPLE_SLIDES, HERO_TRAVEL_SLIDES, HeroSlide } from './hero-slides';

const BUTTONS: Record<string, { path: string; fragment?: string; cls: string }> = {
  community: { path: '/community', cls: 'btn-ghost' },
  create: { path: '/', fragment: 'contact', cls: 'btn-ghost' },
  merchandise: { path: '/merchandise', cls: 'btn-ghost' },
};

/** The shipped pace of both hero previews: one photograph every five seconds. */
export const HERO_SLIDE_INTERVAL_SECONDS = 5;

/** The old shipped headline: still stored by anyone who published it verbatim. */
const LEGACY_HERO_TITLE = "Go Anywhere. Even Where You've Never Been.";

/**
 * The top of the Home page — two full-width gallery panels under one roof.
 *
 * On widescreen, each section forms a single unified panel with the editorial
 * headline and copy on the left and the full-size, uncropped photograph stage
 * on the right; on mobile, the full-size image sits cleanly above the copy.
 * Three independent white pill call-to-action buttons float in the seam
 * between the two sections.
 *
 * Both previews cross-fade on their own every five seconds. They are purely
 * decorative: the stage is hidden from assistive technology, so a rotating
 * photograph never interrupts a screen reader.
 */
@Component({
  selector: 'app-hero',
  imports: [RouterLink],
  templateUrl: './hero.html',
  styleUrls: ['../collection-button.css', './hero.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Hero {
  private readonly cms = inject(SiteConfigService);
  private readonly document = inject(DOCUMENT);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly travelSlides: readonly HeroSlide[] = HERO_TRAVEL_SLIDES;
  protected readonly peopleSlides: readonly HeroSlide[] = HERO_PEOPLE_SLIDES;

  /** Which travel photograph is on stage, and which banner portrait is on stage. */
  protected readonly travelIndex = signal(0);
  protected readonly peopleIndex = signal(0);

  private readonly visible = signal(true);

  protected readonly eyebrow = computed(() => this.cms.text('home.hero', 'eyebrow'));
  protected readonly title = computed(() => {
    const title = this.cms.text('home.hero', 'title');
    // The headline no longer ends in a full stop, but a published copy of the
    // old default would otherwise keep showing one.
    return title.trim() === LEGACY_HERO_TITLE ? LEGACY_HERO_TITLE.slice(0, -1) : title;
  });
  protected readonly lede = computed(() => this.cms.text('home.hero', 'lede'));
  protected readonly peopleTitle = computed(() => this.cms.text('home.hero', 'peopleTitle'));
  protected readonly peopleCopy = computed(() => this.cms.text('home.hero', 'peopleCopy'));

  protected readonly buttons = computed(() => {
    const buttons = this.cms.visibleItems('home.hero', 'buttons').filter((b) => BUTTONS[b.id]);
    // Keep Merchandise directly after Community even when a published CMS order
    // predates that link. Preserve each item's visibility, label and order.
    const merchandiseIndex = buttons.findIndex((b) => b.id === 'merchandise');
    if (merchandiseIndex >= 0) {
      const [merchandise] = buttons.splice(merchandiseIndex, 1);
      const communityAnchor = buttons.findIndex((b) => b.id === 'community');
      if (communityAnchor >= 0) buttons.splice(communityAnchor + 1, 0, merchandise);
      else buttons.push(merchandise);
    }
    return buttons.map((b) => ({
      id: b.id,
      label: b.label,
      ...BUTTONS[b.id],
      fragment: BUTTONS[b.id].fragment ?? undefined,
    }));
  });

  /** Seconds per preview photograph, published from Admin Console → Website Management. */
  protected readonly intervalSeconds = computed(() => {
    const raw = Number(this.cms.get<number>('home.hero', 'interval'));
    if (!Number.isFinite(raw)) return HERO_SLIDE_INTERVAL_SECONDS;
    return Math.min(20, Math.max(3, Math.round(raw)));
  });

  protected readonly intervalMs = computed(() => this.intervalSeconds() * 1000);

  protected readonly autoplay = computed(() => this.cms.flag('home.hero', 'autoplay'));

  constructor() {
    const view = this.document.defaultView;
    if (view) {
      const onVisibility = () => this.visible.set(!view.document.hidden);
      view.addEventListener('visibilitychange', onVisibility);
      this.destroyRef.onDestroy(() => view.removeEventListener('visibilitychange', onVisibility));
    }

    // Both previews advance together, so the page never beats against itself.
    effect((onCleanup) => {
      const seconds = this.intervalMs();
      if (!this.autoplay() || !this.visible()) return;
      const timer = setInterval(() => this.advance(), seconds);
      onCleanup(() => clearInterval(timer));
    });

    this.preload();
  }

  /** Only the active and the incoming photograph are mounted, per preview. */
  protected isTravelMounted(index: number): boolean {
    return this.isCurrent(this.travelSlides.length, this.travelIndex(), index);
  }

  protected isPeopleMounted(index: number): boolean {
    return this.isCurrent(this.peopleSlides.length, this.peopleIndex(), index);
  }

  protected pad(value: number): string {
    return value.toString().padStart(2, '0');
  }

  private isCurrent(total: number, active: number, index: number): boolean {
    if (total <= 2) return true;
    return index === active || index === (active + 1) % total;
  }

  private advance(): void {
    this.travelIndex.update((index) => (index + 1) % this.travelSlides.length);
    this.peopleIndex.update((index) => (index + 1) % this.peopleSlides.length);
    this.preload();
  }

  /** Warm the incoming photograph so the cross-fade never waits on the network. */
  private preload(): void {
    const view = this.document.defaultView;
    if (!view || typeof view.Image !== 'function') return;
    for (const [slides, active] of [
      [this.travelSlides, this.travelIndex()],
      [this.peopleSlides, this.peopleIndex()],
    ] as const) {
      const upcoming = slides[(active + 1) % slides.length];
      if (!upcoming) continue;
      const image = new view.Image();
      image.src = upcoming.src;
    }
  }
}
