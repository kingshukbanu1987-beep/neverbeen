import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { heroDestinations } from '../../models/site-content';
import { SiteConfigService } from '../../services/site-config.service';

const BUTTONS: Record<string, { path: string; fragment?: string; cls: string }> = {
  community: { path: '/community', cls: 'btn-dream' },
  founder: { path: '/founder', cls: 'btn-founder' },
  create: { path: '/', fragment: 'contact', cls: 'btn-primary' },
  destinations: { path: '/', fragment: 'destinations', cls: 'btn-ghost' },
  collection: { path: '/collection', cls: 'btn-ghost' },
  gallery: { path: '/', fragment: 'gallery', cls: 'btn-ghost' },
  // The brochure page publishes the single wide landscape visitor brochure,
  // openable in a new tab or downloadable as a PDF.
  documentation: { path: '/documentation', cls: 'btn-brochure' },
  'ai-models': { path: '/ai-models', cls: 'btn-ai-models' },
  storyline: { path: '/storyline-of-parallel-universe', cls: 'btn-brochure' },
};

@Component({
  selector: 'app-hero',
  imports: [RouterLink],
  templateUrl: './hero.html',
  styleUrl: './hero.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Hero {
  private readonly cms = inject(SiteConfigService);
  private readonly index = signal(0);
  protected readonly destination = computed(() => heroDestinations[this.index()]);

  protected readonly eyebrow = computed(() => this.cms.text('home.hero', 'eyebrow'));
  protected readonly title = computed(() => this.cms.text('home.hero', 'title'));
  protected readonly lede = computed(() => this.cms.text('home.hero', 'lede'));
  protected readonly buttons = computed(() => {
    const buttons = this.cms.visibleItems('home.hero', 'buttons').filter((b) => BUTTONS[b.id]);
    // Keep Brochure directly after Community, then put AI Models and Storyline
    // behind it even when a published CMS order predates those links. Preserve
    // each item's visibility, label and the relative order of other actions.
    const brochureIndex = buttons.findIndex((b) => b.id === 'documentation');
    if (brochureIndex >= 0 && buttons.some((b) => b.id === 'community')) {
      const [brochure] = buttons.splice(brochureIndex, 1);
      buttons.splice(buttons.findIndex((b) => b.id === 'community') + 1, 0, brochure);
    }
    const aiModelsIndex = buttons.findIndex((b) => b.id === 'ai-models');
    if (aiModelsIndex >= 0) {
      const [aiModels] = buttons.splice(aiModelsIndex, 1);
      const brochureAnchor = buttons.findIndex((b) => b.id === 'documentation');
      const communityAnchor = buttons.findIndex((b) => b.id === 'community');
      const anchor = brochureAnchor >= 0 ? brochureAnchor : communityAnchor;
      if (anchor >= 0) buttons.splice(anchor + 1, 0, aiModels);
      else buttons.push(aiModels);
    }
    const storylineIndex = buttons.findIndex((b) => b.id === 'storyline');
    if (storylineIndex >= 0) {
      const [storyline] = buttons.splice(storylineIndex, 1);
      const aiModelsAnchor = buttons.findIndex((b) => b.id === 'ai-models');
      const brochureAnchor = buttons.findIndex((b) => b.id === 'documentation');
      const communityAnchor = buttons.findIndex((b) => b.id === 'community');
      const anchor =
        aiModelsAnchor >= 0
          ? aiModelsAnchor
          : brochureAnchor >= 0
            ? brochureAnchor
            : communityAnchor;
      if (anchor >= 0) buttons.splice(anchor + 1, 0, storyline);
      else buttons.push(storyline);
    }
    return buttons.map((b) => ({
      id: b.id, label: b.label, ...BUTTONS[b.id], fragment: BUTTONS[b.id].fragment ?? undefined,
    }));
  });

  protected showPreviousDestination(): void {
    this.index.update((value) => (value - 1 + heroDestinations.length) % heroDestinations.length);
  }

  protected showNextDestination(): void {
    this.index.update((value) => (value + 1) % heroDestinations.length);
  }

  constructor() {
    // Auto-rotation (on/off and speed) follows the published Website Management settings.
    const destroyRef = inject(DestroyRef);
    let elapsed = 0;
    const timer = setInterval(() => {
      if (!this.cms.flag('home.hero', 'autoplay')) {
        elapsed = 0;
        return;
      }
      const seconds = Math.max(2, Number(this.cms.get<number>('home.hero', 'interval')) || 3);
      elapsed += 1;
      if (elapsed >= seconds) {
        elapsed = 0;
        this.showNextDestination();
      }
    }, 1000);
    destroyRef.onDestroy(() => clearInterval(timer));
  }
}
