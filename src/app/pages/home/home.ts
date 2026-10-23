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
    // The Storyline of Parallel Universe sits directly under the Multiverse
    // studio, with the NeverBeen Brochure right after it — even when a
    // published section order predates that move.
    moveAfter(sections, 'storyline', 'multiverse');
    moveAfter(sections, 'brochure', 'storyline');
    // How It Works belongs immediately before Pricing, even when a published
    // section order predates that move.
    moveAfter(sections, 'how', 'pricing', 'before');
    return sections;
  });
}

/** Re-orders a home section next to another, leaving hidden ids out of it. */
function moveAfter(
  sections: { id: string }[],
  id: string,
  anchorId: string,
  side: 'after' | 'before' = 'after',
): void {
  const from = sections.findIndex((s) => s.id === id);
  if (from < 0) return;
  const [section] = sections.splice(from, 1);
  const anchor = sections.findIndex((s) => s.id === anchorId);
  if (anchor >= 0) sections.splice(side === 'after' ? anchor + 1 : anchor, 0, section);
  else sections.push(section);
}
