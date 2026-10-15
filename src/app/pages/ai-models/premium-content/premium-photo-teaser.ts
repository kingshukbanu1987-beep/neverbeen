import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { AiModelPhoto } from '../ai-model-data';

/**
 * How strong the teaser's gaussian blur is.
 *
 * - `portfolio` — the photo section of the model portfolio: 85% blur.
 * - `album` — the "View All" mosaic page: 75% blur.
 */
export type PremiumTeaserVariant = 'portfolio' | 'album';

/**
 * One locked Premium Content photograph, shown as a teaser: the frame is hidden behind a heavy
 * gaussian blur and carries the studio's diagonal watermark — "Premium Content" in bold red with
 * "Only available in Paid Premium Chat" in small black letters under it, the whole block running
 * from the lower left up to the upper right of the tile.
 *
 * The teaser never opens the photograph: the complete frame is only ever seen on the Premium
 * Content page of a paid Premium Live Chat.
 */
@Component({
  selector: 'app-premium-photo-teaser',
  templateUrl: './premium-photo-teaser.html',
  styleUrl: './premium-photo-teaser.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PremiumPhotoTeaser {
  /** The locked Premium Content photograph this tile teases. */
  readonly photo = input.required<AiModelPhoto>();
  /** Where the teaser is shown, which sets the blur strength: 85% on the portfolio, 75% on the album. */
  readonly variant = input<PremiumTeaserVariant>('portfolio');
  /** `eager` for the first tiles of a page, `lazy` (the default) for the rest. */
  readonly loading = input<'eager' | 'lazy'>('lazy');
}
