import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import { aiModelProfiles } from './ai-model-data';

@Component({
  selector: 'app-ai-model-portfolio-page',
  imports: [RouterLink],
  templateUrl: './ai-model-portfolio.html',
  styleUrl: './ai-model-portfolio.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AiModelPortfolioPage {
  private readonly route = inject(ActivatedRoute);
  private readonly slug = toSignal(
    this.route.paramMap.pipe(map((params) => params.get('slug') ?? '')),
    { initialValue: this.route.snapshot.paramMap.get('slug') ?? '' },
  );

  protected readonly model = computed(
    () => aiModelProfiles.find((profile) => profile.slug === this.slug()) ?? null,
  );

  protected fact(value: string): string {
    return value.trim() || 'Details to be added';
  }

  protected photoAlt(name: string, index: number): string {
    return `${name} — portfolio photograph ${index + 1}`;
  }
}
