import { DOCUMENT } from '@angular/common';
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
  host: { '(window:pageshow)': 'onPageShow($event)' },
})
export class Home {
  private readonly browser = inject(DOCUMENT).defaultView;

  protected onPageShow(event: PageTransitionEvent): void {
    // Brochure is a document navigation. Back may restore Home from bfcache,
    // including old runtime state. Reload only that restore, never a normal
    // load or an Angular route change; this avoids loops and extra history.
    if (event.persisted) this.browser?.location.reload();
  }

  private readonly cms = inject(SiteConfigService);
  protected readonly sections = computed(() => this.cms.visibleItems('home.layout', 'sections'));
}
