import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { mosaicTileStyles } from '../../pages/ai-models/all-photos/photo-mosaic';
import { CollectionPhoto, collectionPhotos } from '../../pages/collection/collection-photos';
import { sampleWithoutReplacement } from '../../shared/random-sample';
import { SectionHeading } from '../../shared/section-heading/section-heading';

/**
 * Photographs the mosaic shows: 23 stills drawn at random on every page load,
 * matching the 6-module rotation of the 4-column variable-size bento mosaic
 * (4 + 4 + 5 + 2 + 4 + 4 = 23) so the grid fills cleanly edge to edge.
 */
export const GALLERY_PHOTO_COUNT = 23;

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
  styleUrls: ['./gallery.css', '../collection-button.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Gallery {
  /**
   * Photographs picked at random from the Neverbeen Collection
   * (`public/collection`). Sampled once per component instance, so the set
   * changes on every page refresh or visit, but stays stable while the visitor
   * scrolls the page.
   */
  protected readonly photographs = sampleWithoutReplacement(collectionPhotos, GALLERY_PHOTO_COUNT);

  /** Per-tile CSS custom properties (--c2/--r2, --c3/--r3, --c4/--r4) for variable-size mosaic cells. */
  protected readonly tileStyles: readonly Record<string, string>[] = mosaicTileStyles(
    this.photographs.length,
  );

  /** Size of the whole Neverbeen Collection, shown next to the samples. */
  protected readonly collectionSize = collectionPhotos.length;

  protected readonly locationOf = locationOf;
}
