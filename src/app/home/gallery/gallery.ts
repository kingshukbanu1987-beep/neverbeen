import { Component } from '@angular/core';
import { galleryItems } from '../../models/site-content';
import { SectionHeading } from '../../shared/section-heading/section-heading';

@Component({
  selector: 'app-gallery',
  imports: [SectionHeading],
  templateUrl: './gallery.html',
  styleUrl: './gallery.css',
})
export class Gallery {
  protected readonly items = galleryItems;
}
