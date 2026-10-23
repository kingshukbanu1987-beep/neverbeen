import { Component, computed, inject } from '@angular/core';
import { SiteConfigService } from '../../services/site-config.service';
import { HowItWorksStep, HowItWorksTrack, howItWorksTracks } from '../../models/site-content';
import { HomeDisclosure } from '../../shared/home-disclosure/home-disclosure';

/** The three capability tracks whose copy lives in the CMS (travel steps are `steps`). */
const EDITABLE_TRACKS = ['rent', 'chat', 'shop'] as const;

@Component({
  selector: 'app-how-it-works',
  imports: [HomeDisclosure],
  templateUrl: './how-it-works.html',
  styleUrl: './how-it-works.css',
})
export class HowItWorks {
  private readonly cms = inject(SiteConfigService);

  /**
   * The four business models, each explained step by step: travel photography,
   * AI-model rental, live chat and merchandise. Copy is read from the CMS and
   * falls back to the shipped defaults.
   */
  protected readonly tracks = computed<HowItWorksTrack[]>(() =>
    howItWorksTracks.map((track) => {
      const steps =
        track.id === 'travel'
          ? this.cms.records<HowItWorksStep>('home.how', 'steps')
          : this.cms.records<HowItWorksStep>('home.how', `${track.id}Steps`);
      return {
        ...track,
        title: this.editable(track, 'Title') || track.title,
        description: this.editable(track, 'Copy') || track.description,
        steps: steps.length ? steps : track.steps,
      };
    }),
  );

  /** Travel keeps the shared section copy; the other three have their own fields. */
  private editable(track: HowItWorksTrack, suffix: 'Title' | 'Copy'): string {
    if (!EDITABLE_TRACKS.includes(track.id as (typeof EDITABLE_TRACKS)[number])) return '';
    return this.cms.text('home.how', `${track.id}${suffix}`);
  }
}
