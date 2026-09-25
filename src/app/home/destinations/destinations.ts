import { Component, computed, inject } from '@angular/core';
import { SiteConfigService } from '../../services/site-config.service';
import { destinations } from '../../models/site-content';
import { DestinationCard } from '../../shared/destination-card/destination-card';
import { SectionHeading } from '../../shared/section-heading/section-heading';

@Component({
  selector: 'app-destinations',
  imports: [DestinationCard, SectionHeading],
  templateUrl: './destinations.html',
  styleUrl: './destinations.css',
})
export class Destinations {
  private readonly cms = inject(SiteConfigService);
  /** Visible destinations in the order configured in Website Management. */
  protected readonly destinations = computed(() =>
    this.cms
      .visibleItems('home.destinations', 'items')
      .map((i) => destinations.find((d) => d.slug === i.id))
      .filter((d): d is (typeof destinations)[number] => !!d),
  );
}
