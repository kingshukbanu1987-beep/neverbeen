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
import { HERO_BROCHURE_PREVIEW_SLIDES, HERO_PEOPLE_SLIDES, HeroSlide } from './hero-slides';

const BUTTONS: Record<string, { path: string; fragment?: string; cls: string }> = {
  community: { path: '/community', cls: 'btn-dream' },
  create: { path: '/', fragment: 'contact', cls: 'btn-primary' },
  merchandise: { path: '/merchandise', cls: 'btn-founder' },
};

/** The shipped pace of both hero previews: one photograph every five seconds. */
export const HERO_SLIDE_INTERVAL_SECONDS = 5;

/**
 * The top of the Home page — two full-bleed previews under one roof.
 *
 * The first preview carries the headline "Go Anywhere. Even Where You've Never
 * Been." over the closing pages of the NeverBeen Brochure. The three call-to-
 * action buttons sit in the seam between the previews. The second preview
 * carries "Meet the People. Even When They Don't Exists outside NeverBeen
 * Multiverse" over the photographs in `public/banner`.
 *
 * Both previews cross-fade on their own every five seconds. They are purely
 * decorative: the stage is hidden from assistive technology, so a rotating
 * photograph never interrupts a screen reader.
 */
@Component({
  selector: 'app-hero',
  imports: [RouterLink],
  templateUrl: './hero.html',
  styleUrl: './hero.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Hero {
  private readonly cms = inject(SiteConfigService);
  private readonly document = inject(DOCUMENT);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly brochureSlides: readonly HeroSlide[] = HERO_BROCHURE_PREVIEW_SLIDES;
  protected readonly peopleSlides: readonly HeroSlide[] = HERO_PEOPLE_SLIDES;

  /** Which brochure page is on stage, and which banner portrait is on stage. */
  protected readonly brochureIndex = signal(0);
  protected readonly peopleIndex = signal(0);

  private readonly visible = signal(true);

  protected readonly eyebrow = computed(() => this.cms.text('home.hero', 'eyebrow'));
  protected readonly title = computed(() => this.cms.text('home.hero', 'title'));
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
  protected isBrochureMounted(index: number): boolean {
    return this.isCurrent(this.brochureSlides.length, this.brochureIndex(), index);
  }

  protected isPeopleMounted(index: number): boolean {
    return this.isCurrent(this.peopleSlides.length, this.peopleIndex(), index);
  }

  private isCurrent(total: number, active: number, index: number): boolean {
    if (total <= 2) return true;
    return index === active || index === (active + 1) % total;
  }

  private advance(): void {
    this.brochureIndex.update((index) => (index + 1) % this.brochureSlides.length);
    this.peopleIndex.update((index) => (index + 1) % this.peopleSlides.length);
    this.preload();
  }

  /** Warm the incoming photograph so the cross-fade never waits on the network. */
  private preload(): void {
    const view = this.document.defaultView;
    if (!view || typeof view.Image !== 'function') return;
    for (const [slides, active] of [
      [this.brochureSlides, this.brochureIndex()],
      [this.peopleSlides, this.peopleIndex()],
    ] as const) {
      const upcoming = slides[(active + 1) % slides.length];
      if (!upcoming) continue;
      const image = new view.Image();
      image.src = upcoming.src;
    }
  }
}
