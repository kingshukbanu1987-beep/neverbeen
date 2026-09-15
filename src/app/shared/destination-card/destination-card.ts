import { Component, input } from '@angular/core';
import { Destination } from '../../models/site-content';

@Component({
  selector: 'app-destination-card',
  templateUrl: './destination-card.html',
  styleUrl: './destination-card.css',
})
export class DestinationCard {
  readonly destination = input.required<Destination>();
}
