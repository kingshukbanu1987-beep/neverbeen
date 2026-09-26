import { Component, computed, inject, input } from '@angular/core';
import { SiteConfigService } from '../../services/site-config.service';

@Component({
  selector: 'app-section-heading',
  templateUrl: './section-heading.html',
  styleUrl: './section-heading.css',
})
export class SectionHeading {
  private readonly cms = inject(SiteConfigService);

  readonly eyebrow = input('');
  readonly title = input.required<string>();
  readonly copy = input('');
  readonly align = input<'left' | 'center'>('left');
  readonly tone = input<'ink' | 'paper'>('ink');
  /** Website Management component key (e.g. "home.faq"); when set, published copy overrides the inputs. */
  readonly cmsKey = input<string | null>(null);

  protected readonly shownEyebrow = computed(() => (this.cmsKey() ? this.cms.text(this.cmsKey()!, 'eyebrow') : this.eyebrow()));
  protected readonly shownTitle = computed(() => (this.cmsKey() ? this.cms.text(this.cmsKey()!, 'title') || this.title() : this.title()));
  protected readonly shownCopy = computed(() => (this.cmsKey() ? this.cms.text(this.cmsKey()!, 'copy') : this.copy()));
}
