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
import { AiModelBiographyMemory, aiModelProfiles } from '../ai-model-data';

const BIOGRAPHY_TITLE = 'In the Multiverse of NeverBeen';

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

  protected readonly generalSummary = computed(() => {
    const story = this.biography();
    if (!story) return '';
    const profile = this.model();
    const info = story.generalInformation ?? {};
    const firstName = (profile?.name ?? story.name ?? '').split(/\s+/)[0] ?? '';
    const city = String(info['birthplace'] ?? '').split(',').slice(-2).join(',').trim() || '';
    const profession = info['profession'] ? String(info['profession']).replace(/^Fictional\s+/i, '') : 'creative professional';
    const age = info['age'] ? String(info['age']).replace(/\s*·.*$/, '') : '';
    const education = info['education'] ? String(info['education']) : '';
    const relationship = info['relationshipStatus'] ? String(info['relationshipStatus']).toLowerCase() : '';

    const currentCareer = story.career?.[story.career.length - 1];
    const currentRole = currentCareer?.role ?? 'independent model and creative collaborator';
    const currentOrg = currentCareer?.organization?.replace(/\s*\(fictional[^)]*\)/g, '').trim() ?? 'NeverBeen Multiverse';

    const passionList = story.passions ?? [];
    const ambitionList = story.ambitions ?? [];
    const hobbyList = story.hobbies ?? [];

    const bits: string[] = [];
    bits.push(
      `${firstName} is a fictional ${profession} in the NeverBeen Multiverse${city ? `, based in ${city}` : ''}${age ? ` and ${age} years old in this imagined storyline` : ''}.`,
    );
    if (education) {
      bits.push(`She holds a fictional ${education}.`);
    }
    bits.push(`In the present chapter of her story she works as ${/^[aeiou]/i.test(currentRole) ? 'an' : 'a'} ${currentRole}${currentOrg && currentOrg !== 'NeverBeen Multiverse' ? ` with ${currentOrg}` : ''}.`);
    if (relationship) {
      bits.push(`Her relationship status in this fictional timeline is ${relationship}.`);
    }
    if (passionList.length) {
      bits.push(`She is drawn to ${passionList.slice(0, 2).join(' and ')}${passionList.length > 2 ? ', among other causes' : ''}.`);
    }
    if (hobbyList.length) {
      bits.push(`Outside her work she enjoys ${hobbyList.slice(0, 3).join(', ')}.`);
    }
    if (ambitionList.length) {
      bits.push(`Her ambitions include ${ambitionList[0].replace(/^\w/, (c) => c.toLowerCase())}`);
    }
    return bits.join(' ');
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
      born: 'Born',
      birthTime: 'Birth time',
      birthplace: 'Birthplace',
      age: 'Age',
      education: 'Education',
      relationshipStatus: 'Relationship status',
      universe: 'Universe',
    };
    return (
      labels[key] ?? key.replace(/([A-Z])/g, ' $1').replace(/^./, (letter) => letter.toUpperCase())
    );
  }

  protected memory(id: string): AiModelBiographyMemory | null {
    return this.biography()?.memories.find((memory) => memory.id === id) ?? null;
  }

  protected memoryImageAlt(alt: string, name: string): string {
    return alt || `Fictional AI-generated memory of ${name}`;
  }

  protected memoryMetadata(memory: AiModelBiographyMemory): string {
    return [memory.period, memory.timestamp, 'fictional AI-generated image']
      .filter(Boolean)
      .join(' · ');
  }
}
