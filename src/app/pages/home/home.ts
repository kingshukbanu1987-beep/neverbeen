import { DOCUMENT } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { SiteConfigService } from '../../services/site-config.service';
import { Hero } from '../../home/hero/hero';
import { Multiverse } from '../../home/multiverse/multiverse';
import { Brochure } from '../../home/brochure/brochure';
import { StorylineSection } from '../../home/storyline/storyline-section';
import { HowItWorks } from '../../home/how-it-works/how-it-works';
import { Destinations } from '../../home/destinations/destinations';
import { Gallery } from '../../home/gallery/gallery';
import { Pricing } from '../../home/pricing/pricing';
import { Faq } from '../../home/faq/faq';
import { Owner } from '../../home/owner/owner';
import { Contact } from '../../home/contact/contact';

@Component({
  selector: 'app-home',
  imports: [
    Hero,
    Multiverse,
    Brochure,
    StorylineSection,
    HowItWorks,
    Destinations,
    Gallery,
    Pricing,
    Faq,
    Owner,
    Contact,
  ],
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
  protected readonly sections = computed(() => {
    const sections = [...this.cms.visibleItems('home.layout', 'sections')];
    const brochureIdx = sections.findIndex((s) => s.id === 'brochure');
    if (brochureIdx >= 0) {
      const [brochure] = sections.splice(brochureIdx, 1);
      const multiverseIdx = sections.findIndex((s) => s.id === 'multiverse');
      if (multiverseIdx >= 0) sections.splice(multiverseIdx + 1, 0, brochure);
      else sections.push(brochure);
    }
    const storylineIdx = sections.findIndex((s) => s.id === 'storyline');
    if (storylineIdx >= 0) {
      const [storyline] = sections.splice(storylineIdx, 1);
      const brochureAnchor = sections.findIndex((s) => s.id === 'brochure');
      const multiverseAnchor = sections.findIndex((s) => s.id === 'multiverse');
      const anchor = brochureAnchor >= 0 ? brochureAnchor : multiverseAnchor;
      if (anchor >= 0) sections.splice(anchor + 1, 0, storyline);
      else sections.push(storyline);
    }
    // Move 'how' section before 'pricing'
    const howIdx = sections.findIndex((s) => s.id === 'how');
    const pricingIdx = sections.findIndex((s) => s.id === 'pricing');
    if (howIdx >= 0 && pricingIdx > howIdx) {
      const [how] = sections.splice(howIdx, 1);
      sections.splice(pricingIdx, 0, how);
    }
    return sections;
  });
}