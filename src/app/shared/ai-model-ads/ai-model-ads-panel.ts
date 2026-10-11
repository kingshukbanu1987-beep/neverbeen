import { ChangeDetectionStrategy, Component, OnInit, computed, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AiModelAdsService } from '../../services/ai-model-ads.service';
import { AiModelAd } from './ai-model-ad';

/**
 * The NeverBeen AI Models advertisement in the right rail of the Community Home page, shown
 * below "Online Companions" in place of the former Circles list.
 *
 * It rotates through 15 random portfolios from the `/ai-models` studio and gives every one of them
 * her photograph, name, city and country, availability status and a **View Portfolio** button
 * that opens `/ai-models/<slug>`.
 */
@Component({
  selector: 'app-ai-model-ads-panel',
  imports: [RouterLink],
  templateUrl: './ai-model-ads-panel.html',
  styleUrl: './ai-model-ads-panel.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AiModelAdsPanel implements OnInit {
  private readonly ads = inject(AiModelAdsService);

  /** How many portfolios the advertisement rotates through (15 by default, as requested). */
  readonly count = input(15);

  /** The rail's models for this visit — drawn once, so the faces stay put while the page is open. */
  protected readonly advertisements = computed(() => this.ads.railAds(this.count()));

  protected readonly availableCount = computed(
    () => this.advertisements().filter((ad) => ad.availability.state === 'available').length,
  );

  ngOnInit(): void {
    for (const advertisement of this.advertisements()) {
      this.ads.trackImpression(advertisement, 'rail');
    }
  }

  /** Counts the open and lets the router follow the button's portfolio link. */
  protected openPortfolio(advertisement: AiModelAd): void {
    this.ads.trackClick(advertisement, 'rail');
  }
}
