import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AiModelProfile, aiModelProfiles } from './ai-model-data';

type AvailabilityState = 'available' | 'unavailable' | 'future';
type SortMode = 'default' | 'price-asc' | 'price-desc';

@Component({
  selector: 'app-ai-models-page',
  imports: [RouterLink],
  templateUrl: './ai-models.html',
  styleUrl: './ai-models.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AiModelsPage {
  protected readonly models = aiModelProfiles;
  protected readonly search = signal('');
  protected readonly sort = signal<SortMode>('default');
  protected readonly totalCount = computed(() => String(this.models.length).padStart(2, '0'));
  protected readonly hasIllustrativeProfiles = computed(() =>
    this.models.some((model) => model.illustrative),
  );
  protected readonly filteredModels = computed(() => {
    const query = this.search().trim().toLocaleLowerCase();
    const matches = query
      ? this.models.filter((model) =>
          `${model.name} ${model.location}`.toLocaleLowerCase().includes(query),
        )
      : this.models;

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
