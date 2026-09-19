import { NgOptimizedImage } from '@angular/common';
import { DOCUMENT } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  AudienceProfile,
  audienceProfiles,
  heroDestinations,
  privacyPromises,
} from '../../models/site-content';

@Component({
  selector: 'app-audience',
  imports: [NgOptimizedImage, RouterLink],
  templateUrl: './audience.html',
  styleUrl: './audience.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Audience {
  private readonly document = inject(DOCUMENT);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly profiles = audienceProfiles;
  protected readonly promises = privacyPromises;
  protected readonly places = heroDestinations.slice(0, 14);
  protected readonly activePortrait = signal<AudienceProfile | null>(null);

  constructor() {
    const onKeydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        this.closePortrait();
      }
    };

    this.document.addEventListener('keydown', onKeydown);
    this.destroyRef.onDestroy(() => this.document.removeEventListener('keydown', onKeydown));
  }

  protected openPortrait(profile: AudienceProfile): void {
    this.activePortrait.set(profile);
  }

  protected closePortrait(): void {
    this.activePortrait.set(null);
  }
}
