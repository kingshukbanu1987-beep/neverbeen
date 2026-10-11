import { ChangeDetectionStrategy, Component, OnInit, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AiModelAdsService } from '../../services/ai-model-ads.service';
import { AiModelAd } from './ai-model-ad';

/**
 * One NeverBeen AI Models advertisement inside the Journey feed.
 *
 * It is deliberately **not** a Journey post: the card is labelled as an advertisement, carries the
 * studio wordmark and shows four random photographs from the model's own folder (one when her
 * folder holds fewer than four) beside her name, city and country, her availability status and a
 * **View Portfolio** button that opens `/ai-models/<slug>`.
 */
@Component({
  selector: 'app-ai-model-ad-card',
  imports: [RouterLink],
  templateUrl: './ai-model-ad-card.html',
  styleUrl: './ai-model-ad-card.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AiModelAdCard implements OnInit {
  private readonly ads = inject(AiModelAdsService);

  /** The model this slot advertises — chosen randomly by the ads service. */
  readonly advertisement = input.required<AiModelAd>();

  ngOnInit(): void {
    this.ads.trackImpression(this.advertisement(), 'feed');
  }

  /** Counts the open and lets the router follow the button's portfolio link. */
  protected openPortfolio(): void {
    this.ads.trackClick(this.advertisement(), 'feed');
  }
}
