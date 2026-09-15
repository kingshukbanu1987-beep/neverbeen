import { Component, input, output } from '@angular/core';
import { PricingPlan } from '../../models/site-content';

@Component({
  selector: 'app-pricing-card',
  templateUrl: './pricing-card.html',
  styleUrl: './pricing-card.css',
})
export class PricingCard {
  readonly plan = input.required<PricingPlan>();
  readonly isSelected = input(false);
  readonly selected = output<string>();
}
