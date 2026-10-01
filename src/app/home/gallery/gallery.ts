import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SectionHeading } from '../../shared/section-heading/section-heading';
import { CollectionPhoto, collectionPhotos } from '../../pages/collection/collection-photos';
import { pickRandom } from './pick-random';

/** How many photographs the Home page gallery shows. */
export const GALLERY_PHOTO_COUNT = 20;

/**
 * The Home page "Explore Gallery" section.
 *
 * It shows {@link GALLERY_PHOTO_COUNT} photographs drawn at random from the Neverbeen
 * Collection (`public/collection`, the same photographs as the `/collection` page) and from
 * nowhere else. The draw is made when the component is created, so every page refresh shows a
 * new selection while the photographs stay put as the visitor scrolls.
 */
@Component({
  selector: 'app-gallery',
  imports: [RouterLink, SectionHeading],
  templateUrl: './gallery.html',
  styleUrl: './gallery.css',
})
export class Gallery {
  protected readonly photos: readonly CollectionPhoto[] = pickRandom(
    collectionPhotos,
    GALLERY_PHOTO_COUNT,
  );

  protected readonly collectionSize = collectionPhotos.length;

  /**
   * Collection captions read "Place: description", so the text before the colon is the place
   * ("Eiffel Tower", "Jungfrau region, Switzerland", …). Photographs without that pattern
   * simply show no place line.
   */
  protected place(photo: CollectionPhoto): string {
    const colon = photo.caption.indexOf(':');
    return colon > 0 ? photo.caption.slice(0, colon).trim() : '';
  }
}
