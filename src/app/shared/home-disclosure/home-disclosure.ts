import { Component, computed, inject, input, signal } from '@angular/core';
import { SiteConfigService } from '../../services/site-config.service';

/**
 * A home-page section whose heading stays visible while its body starts collapsed.
 * Content remains in the DOM for a smooth grid-row transition, but is hidden from
 * assistive technology and made inert until the visitor expands it.
 */
@Component({
  selector: 'app-home-disclosure',
  templateUrl: './home-disclosure.html',
  styleUrl: './home-disclosure.css',
})
export class HomeDisclosure {
  private readonly cms = inject(SiteConfigService);

  readonly cmsKey = input.required<string>();
  readonly contentId = input.required<string>();
  readonly eyebrow = input('');
  readonly title = input.required<string>();
  readonly copy = input('');
  readonly meta = input('');

  protected readonly expanded = signal(false);
  protected readonly shownEyebrow = computed(
    () => this.cms.text(this.cmsKey(), 'eyebrow') || this.eyebrow(),
  );
  protected readonly shownTitle = computed(
    () => this.cms.text(this.cmsKey(), 'title') || this.title(),
  );
  protected readonly shownCopy = computed(
    () => this.cms.text(this.cmsKey(), 'copy') || this.copy(),
  );

  protected toggle(): void {
    this.expanded.update((current) => !current);
  }
}
