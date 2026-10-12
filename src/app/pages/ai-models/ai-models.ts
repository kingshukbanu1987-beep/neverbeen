import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ModelMediaEngagementService } from '../../services/model-media-engagement.service';
import { AiModelProfile, aiModelProfiles } from './ai-model-data';

type AvailabilityState = 'available' | 'unavailable' | 'future';
type SortMode = 'default' | 'price-asc' | 'price-desc';
type AvailabilityFilter = 'all' | AvailabilityState;
type ModelEngagementTotals = { likes: number; comments: number; shares: number };

const EMPTY_ENGAGEMENT_TOTALS: ModelEngagementTotals = { likes: 0, comments: 0, shares: 0 };

/**
 * Draws one photograph at random from the model's album to use as her card cover, so the directory
 * opens with a different set of covers on every visit. A model whose album is still empty keeps the
 * stored cover, which the card renders as the designed "original portrait pending" placeholder.
 */
export function drawCover(model: AiModelProfile): string {
  if (model.photos.length === 0) return model.cover;
  const index = Math.floor(Math.random() * model.photos.length);
  return model.photos[index].src;
}

@Component({
  selector: 'app-ai-models-page',
  imports: [RouterLink],
  templateUrl: './ai-models.html',
  styleUrl: './ai-models.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AiModelsPage {
  protected readonly models = aiModelProfiles;
  private readonly engagement = inject(ModelMediaEngagementService);

  /** Totals across each model's complete photo and video albums. */
  private readonly engagementByModel = computed(() => {
    const totals = new Map<string, ModelEngagementTotals>();

    for (const model of this.models) {
      const modelTotals = { ...EMPTY_ENGAGEMENT_TOTALS };
      for (const photo of model.photos) {
        const stats = this.engagement.statsFor(model.slug, 'photo', photo.src);
        modelTotals.likes += stats.likes;
        modelTotals.comments += stats.comments;
        modelTotals.shares += stats.shares;
      }
      for (const video of model.videos) {
        const stats = this.engagement.statsFor(model.slug, 'video', video.src);
        modelTotals.likes += stats.likes;
        modelTotals.comments += stats.comments;
        modelTotals.shares += stats.shares;
      }
      totals.set(model.slug, modelTotals);
    }

    return totals;
  });

  /**
   * The cover every card shows, drawn once per visit — reopening the page re-picks each model's
   * cover from her album, while the cards keep their published running order.
   */
  private readonly covers = new Map(
    aiModelProfiles.map((model) => [model.slug, drawCover(model)] as const),
  );

  protected readonly search = signal('');
  protected readonly sort = signal<SortMode>('default');
  protected readonly availabilityFilter = signal<AvailabilityFilter>('all');
  protected readonly availabilityFilters: ReadonlyArray<{
    value: AvailabilityFilter;
    label: string;
  }> = [
    { value: 'all', label: 'All models' },
    { value: 'available', label: 'Available for Contract' },
    { value: 'unavailable', label: 'Currently Unavailable' },
    { value: 'future', label: 'Looking for Future Contract' },
  ];
  protected readonly totalCount = computed(() => String(this.models.length).padStart(2, '0'));
  /** The current calendar year, so the "Portfolio index /YYYY" eyebrow stays accurate across visits. */
  protected readonly currentYear = new Date().getFullYear();
  protected readonly hasIllustrativeProfiles = computed(() =>
    this.models.some((model) => model.illustrative),
  );
  protected readonly filteredModels = computed(() => {
    const query = this.search().trim().toLocaleLowerCase();
    const availability = this.availabilityFilter();
    const matches = this.models.filter((model) => {
      if (availability !== 'all' && this.availabilityState(model) !== availability) return false;
      if (!query) return true;
      return `${model.name} ${model.location}`.toLocaleLowerCase().includes(query);
    });

    const mode = this.sort();
    if (mode === 'default') return matches;

    const direction = mode === 'price-asc' ? 1 : -1;
    return [...matches].sort((a, b) => {
      const rateA = a.photoRate > 0 ? a.photoRate : Number.POSITIVE_INFINITY;
      const rateB = b.photoRate > 0 ? b.photoRate : Number.POSITIVE_INFINITY;
      if (rateA === rateB) return a.name.localeCompare(b.name);
      if (!Number.isFinite(rateA)) return 1;
      if (!Number.isFinite(rateB)) return -1;
      return (rateA - rateB) * direction;
    });
  });

  constructor() {
    // Load engagement for both media types so each directory card can show album-wide totals.
    for (const model of this.models) {
      this.engagement.registerModel(model.slug, [
        ...model.photos.map((photo) => ({ kind: 'photo' as const, src: photo.src })),
        ...model.videos.map((video) => ({ kind: 'video' as const, src: video.src })),
      ]);
    }
  }

  protected setAvailabilityFilter(value: AvailabilityFilter): void {
    this.availabilityFilter.set(value);
  }

  /** Chip badge counts — how many profiles sit in each availability state. */
  protected availabilityCount(value: AvailabilityFilter): number {
    if (value === 'all') return this.models.length;
    return this.models.filter((model) => this.availabilityState(model) === value).length;
  }

  protected resetFilters(): void {
    this.search.set('');
    this.availabilityFilter.set('all');
  }

  protected updateSort(event: Event): void {
    this.sort.set((event.target as HTMLSelectElement).value as SortMode);
  }

  protected updateSearch(event: Event): void {
    this.search.set((event.target as HTMLInputElement).value);
  }

  protected clearSearch(): void {
    this.search.set('');
  }

  protected indexLabel(index: number): string {
    return String(index + 1).padStart(2, '0');
  }

  /** The frame this card displays: a random pick from the model's album, fixed for this visit. */
  protected coverFor(model: AiModelProfile): string {
    return this.covers.get(model.slug) ?? model.cover;
  }

  /** How many photographs the model's album holds — shown large on the cover. */
  protected photoCount(model: AiModelProfile): number {
    return model.photos.length;
  }

  protected photoLabel(model: AiModelProfile): string {
    return model.photos.length === 1 ? 'photograph' : 'photographs';
  }

  /** How many video clips the model's portfolio holds. */
  protected videoCount(model: AiModelProfile): number {
    return model.videos.length;
  }

  protected videoLabel(model: AiModelProfile): string {
    return model.videos.length === 1 ? 'video' : 'videos';
  }

  protected engagementTotals(model: AiModelProfile): ModelEngagementTotals {
    return this.engagementByModel().get(model.slug) ?? EMPTY_ENGAGEMENT_TOTALS;
  }

  protected formatTotal(value: number): string {
    return value.toLocaleString('en-US');
  }

  /**
   * Profile data may contain one of the directory labels already, a longer legacy booking note,
   * or no availability note yet. Legacy/open notes fall back to the standard available state.
   */
  protected availabilityState(model: AiModelProfile): AvailabilityState {
    const availability = model.availability.trim().toLocaleLowerCase();
    if (/unavailable|fully booked|not accepting/.test(availability)) return 'unavailable';
    if (/future|looking for|coming soon/.test(availability)) return 'future';
    return 'available';
  }

  protected availabilityLabel(model: AiModelProfile): string {
    switch (this.availabilityState(model)) {
      case 'unavailable':
        return 'Currently Unavailable';
      case 'future':
        return 'Looking for Future Contract';
      default:
        return 'Available for Contract';
    }
  }

  protected startingPrice(model: AiModelProfile): string {
    return model.photoRate > 0 ? `₹${model.photoRate.toLocaleString('en-IN')}` : 'On request';
  }
}
