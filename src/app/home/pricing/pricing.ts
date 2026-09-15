import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { pricingPlans } from '../../models/site-content';
import { PackageSelectionService } from '../../services/package-selection.service';
import { PricingCard } from '../../shared/pricing-card/pricing-card';
import { SectionHeading } from '../../shared/section-heading/section-heading';

@Component({
  selector: 'app-pricing',
  imports: [PricingCard, SectionHeading, RouterLink],
  templateUrl: './pricing.html',
  styleUrl: './pricing.css',
})
export class Pricing {
  private readonly packageSelection = inject(PackageSelectionService);
  protected readonly plans = pricingPlans;
  protected readonly selectedPlan = this.packageSelection.selectedPackage;

  protected choosePlan(planName: string): void {
    this.packageSelection.selectPackage(planName);
  }
}
