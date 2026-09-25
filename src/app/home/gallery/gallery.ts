import { Component, computed, inject } from '@angular/core';
import { SiteConfigService } from '../../services/site-config.service';
import { galleryItems } from '../../models/site-content';
import { SectionHeading } from '../../shared/section-heading/section-heading';

@Component({
  selector: 'app-gallery',
  imports: [SectionHeading],
  templateUrl: './gallery.html',
  styleUrl: './gallery.css',
})
export class Gallery {
  private readonly cms = inject(SiteConfigService);
  protected readonly items = computed(() =>
    this.cms
      .visibleItems('home.gallery', 'items')
      .map((i) => galleryItems.find((g) => g.title === i.id))
      .filter((g): g is (typeof galleryItems)[number] => !!g),
  );
}
