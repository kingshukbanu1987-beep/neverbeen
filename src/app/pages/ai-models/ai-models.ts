import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { aiModelProfiles } from './ai-model-data';

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
  protected readonly totalCount = computed(() => String(this.models.length).padStart(2, '0'));
  protected readonly hasIllustrativeProfiles = computed(() =>
    this.models.some((model) => model.illustrative),
  );
  protected readonly filteredModels = computed(() => {
    const query = this.search().trim().toLocaleLowerCase();
    if (!query) return this.models;

    return this.models.filter((model) =>
      `${model.name} ${model.location}`.toLocaleLowerCase().includes(query),
    );
  });

  protected updateSearch(event: Event): void {
    this.search.set((event.target as HTMLInputElement).value);
  }

  protected clearSearch(): void {
    this.search.set('');
  }

  protected indexLabel(index: number): string {
    return String(index + 1).padStart(2, '0');
  }
}
