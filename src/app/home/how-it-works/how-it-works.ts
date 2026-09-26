import { Component, computed, inject } from '@angular/core';
import { SiteConfigService } from '../../services/site-config.service';
import type { HowItWorksStep } from '../../models/site-content';
import { SectionHeading } from '../../shared/section-heading/section-heading';

@Component({
  selector: 'app-how-it-works',
  imports: [SectionHeading],
  templateUrl: './how-it-works.html',
  styleUrl: './how-it-works.css',
})
export class HowItWorks {
  private readonly cms = inject(SiteConfigService);
  protected readonly steps = computed(() => this.cms.records<HowItWorksStep>('home.how', 'steps'));
}
