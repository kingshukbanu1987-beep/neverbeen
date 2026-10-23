import { Component, computed, inject, signal } from '@angular/core';
import type { FaqItem } from '../../models/site-content';
import { SiteConfigService } from '../../services/site-config.service';
import { HomeDisclosure } from '../../shared/home-disclosure/home-disclosure';

@Component({
  selector: 'app-faq',
  imports: [HomeDisclosure],
  templateUrl: './faq.html',
  styleUrl: './faq.css',
})
export class Faq {
  private readonly cms = inject(SiteConfigService);
  protected readonly items = computed(() => this.cms.records<FaqItem>('home.faq', 'items'));
  protected readonly openIndex = signal(0);

  protected toggle(index: number): void {
    this.openIndex.update((current) => (current === index ? -1 : index));
  }
}
