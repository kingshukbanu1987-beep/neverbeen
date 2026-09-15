import { Component } from '@angular/core';
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
  protected readonly destinations = destinations;
}
