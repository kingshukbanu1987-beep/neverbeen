import {
  ChangeDetectionStrategy,
  Component,
  afterNextRender,
  computed,
  inject,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { map } from 'rxjs';
import { aiModelProfiles } from '../ai-model-data';

const BIOGRAPHY_TITLE = 'In the Multiverse of NeverBeen, imagine if I am really there';

@Component({
  selector: 'app-ai-model-biography-page',
  imports: [RouterLink],
  templateUrl: './ai-model-biography.html',
  styleUrl: './ai-model-biography.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AiModelBiographyPage {
  private readonly route = inject(ActivatedRoute);
  private readonly slug = toSignal(
    this.route.paramMap.pipe(map((params) => params.get('slug') ?? '')),
    { initialValue: this.route.snapshot.paramMap.get('slug') ?? '' },
  );

  protected readonly model = computed(
    () => aiModelProfiles.find((profile) => profile.slug === this.slug()) ?? null,
  );
  protected readonly biography = computed(() => this.model()?.biography ?? null);
  protected readonly headerTitle = BIOGRAPHY_TITLE;
  protected readonly generalDetails = computed(() => {
    const details = this.biography()?.generalInformation ?? {};
    return Object.entries(details).map(([key, value]) => ({
      key,
      label: this.detailLabel(key),
      value,
    }));
  });

  constructor() {
    afterNextRender(() => {
      if (typeof window.scrollTo === 'function') {
        window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
      }
    });
  }

  protected detailLabel(key: string): string {
    const labels: Record<string, string> = {
      fullName: 'Full name',
      profession: 'Profession',
      born: 'Born in',
      age: 'Age',
      education: 'Education',
      relationshipStatus: 'Relationship status',
      universe: 'Universe',
    };
    return (
      labels[key] ?? key.replace(/([A-Z])/g, ' $1').replace(/^./, (letter) => letter.toUpperCase())
    );
  }

  protected firstName(name: string): string {
    return name.trim().split(/\s+/)[0] ?? name;
  }

  protected memoryNumber(index: number): string {
    return String(index + 1).padStart(2, '0');
  }

  protected memoryImageAlt(alt: string, name: string): string {
    return alt || `Fictional AI-generated memory of ${name}`;
  }
}
