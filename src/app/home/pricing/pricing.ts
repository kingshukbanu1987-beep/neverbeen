import { Component, computed, inject } from '@angular/core';
import { SiteConfigService } from '../../services/site-config.service';
import { RouterLink } from '@angular/router';
import type { PricingPlan } from '../../models/site-content';
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
  private readonly cms = inject(SiteConfigService);
  protected readonly plans = computed(() =>
    this.cms.records<PricingPlan>('home.pricing', 'plans').map((p) => ({ ...p, features: Array.isArray(p.features) ? p.features : [] })),
  );
  protected readonly selectedPlan = this.packageSelection.selectedPackage;

  protected choosePlan(planName: string): void {
    this.packageSelection.selectPackage(planName);
  }
}
