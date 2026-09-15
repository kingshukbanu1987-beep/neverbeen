import { Injectable, signal } from '@angular/core';
import { pricingPlans } from '../models/site-content';

@Injectable({ providedIn: 'root' })
export class PackageSelectionService {
  readonly selectedPackage = signal(pricingPlans.find((plan) => plan.featured)?.name ?? pricingPlans[0].name);

  selectPackage(packageName: string): void {
    this.selectedPackage.set(packageName);
  }
}
