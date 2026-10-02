import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CollectionPhoto, collectionPhotos } from '../../pages/collection/collection-photos';
import { sampleWithoutReplacement } from '../../shared/random-sample';
import { SectionHeading } from '../../shared/section-heading/section-heading';

/** Photographs the mosaic shows: a fresh random sample drawn on every page load. */
export const GALLERY_PHOTO_COUNT = 20;

/**
 * Place shown under a photograph. Collection captions are written as
 * "Place: description", so the part before the colon is the location; albums
 * (when a photograph sits in one) take precedence.
 */
export function locationOf(photo: CollectionPhoto): string {
  if (photo.album) {
    return photo.album;
  }
  const [place] = photo.caption.split(':');
  return place.trim();
}

@Component({
  selector: 'app-gallery',
  imports: [RouterLink, SectionHeading],
  templateUrl: './gallery.html',
  styleUrl: './gallery.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Gallery {
  /**
   * Twenty photographs picked at random from the Neverbeen Collection
   * (`public/collection`). Sampled once per component instance, so the set
   * changes on every page refresh or visit, but stays stable while the visitor
   * scrolls the page.
   */
  protected readonly photographs = sampleWithoutReplacement(collectionPhotos, GALLERY_PHOTO_COUNT);

  /** Size of the whole Neverbeen Collection, shown next to the samples. */
  protected readonly collectionSize = collectionPhotos.length;

  protected readonly locationOf = locationOf;
}
