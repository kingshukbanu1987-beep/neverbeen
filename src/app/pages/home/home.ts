import { Component, computed, inject } from '@angular/core';
import { SiteConfigService } from '../../services/site-config.service';
import { Hero } from '../../home/hero/hero';
import { HowItWorks } from '../../home/how-it-works/how-it-works';
import { Destinations } from '../../home/destinations/destinations';
import { Gallery } from '../../home/gallery/gallery';
import { Pricing } from '../../home/pricing/pricing';
import { Faq } from '../../home/faq/faq';
import { Owner } from '../../home/owner/owner';
import { Contact } from '../../home/contact/contact';

@Component({
  selector: 'app-home',
  imports: [Hero, HowItWorks, Destinations, Gallery, Pricing, Faq, Owner, Contact],
  templateUrl: './home.html',
  styleUrl: './home.css',
})
export class Home {
  private readonly cms = inject(SiteConfigService);
  protected readonly sections = computed(() => this.cms.visibleItems('home.layout', 'sections'));
}
