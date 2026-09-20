import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Destination } from '../../models/site-content';

@Component({
  selector: 'app-destination-card',
  imports: [RouterLink],
  templateUrl: './destination-card.html',
  styleUrl: './destination-card.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DestinationCard {
  readonly destination = input.required<Destination>();

  /** Where the card leads: the full guide for the destination. */
  readonly link = computed(() => ['/destinations', this.destination().slug]);
}
