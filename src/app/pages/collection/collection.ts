import { DOCUMENT } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  computed,
  effect,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { CollectionPhoto, collectionPhotos } from './collection-photos';

export interface CollectionAlbumItem {
  /** Position of the photograph inside `collectionPhotos`. */
  index: number;
  photo: CollectionPhoto;
}

export interface CollectionAlbum {
  /** Album heading; empty string renders the photographs without a heading. */
  name: string;
  items: CollectionAlbumItem[];
}

function groupIntoAlbums(photos: readonly CollectionPhoto[]): CollectionAlbum[] {
  const albums = new Map<string, CollectionAlbum>();

  photos.forEach((photo, index) => {
    const album = albums.get(photo.album);
    if (album) {
      album.items.push({ index, photo });
      return;
    }
    albums.set(photo.album, { name: photo.album, items: [{ index, photo }] });
  });

  return [...albums.values()];
}

@Component({
  selector: 'app-collection',
  imports: [RouterLink],
  templateUrl: './collection.html',
  styleUrl: './collection.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Collection {
  private readonly document = inject(DOCUMENT);
  private readonly destroyRef = inject(DestroyRef);
  private readonly closeButton = viewChild<ElementRef<HTMLButtonElement>>('lightboxClose');

  /** Tile that opened the lightbox, so focus returns to it when the view closes. */
  private lastFocusedTile: HTMLElement | null = null;

  protected readonly photos = collectionPhotos;
  protected readonly albums = groupIntoAlbums(collectionPhotos);

  /** Index of the enlarged photograph, or `null` when the gallery is at rest. */
  protected readonly activeIndex = signal<number | null>(null);

  protected readonly activePhoto = computed<CollectionPhoto | null>(() => {
    const index = this.activeIndex();
    return index === null ? null : (this.photos[index] ?? null);
  });

  protected readonly position = computed(() => {
    const index = this.activeIndex();
    return index === null ? '' : `${index + 1} of ${this.photos.length}`;
  });

  constructor() {
    // Move focus into the enlarged view as soon as it is rendered.
    effect(() => {
      if (this.activeIndex() !== null) {
        this.closeButton()?.nativeElement.focus();
      }
    });

    const onKeydown = (event: KeyboardEvent) => {
      if (this.activeIndex() === null) {
        return;
      }

      switch (event.key) {
        case 'Escape':
          this.close();
          break;
        case 'ArrowRight':
          this.step(1);
          break;
        case 'ArrowLeft':
          this.step(-1);
          break;
        default:
          return;
      }

      event.preventDefault();
    };

    this.document.addEventListener('keydown', onKeydown);
    this.destroyRef.onDestroy(() => {
      this.document.removeEventListener('keydown', onKeydown);
      this.unlockScroll();
    });
  }

  protected open(index: number): void {
    this.lastFocusedTile = this.document.activeElement as HTMLElement | null;
    this.activeIndex.set(index);
    this.document.body.style.overflow = 'hidden';
  }

  protected close(): void {
    this.activeIndex.set(null);
    this.unlockScroll();
    this.lastFocusedTile?.focus?.();
    this.lastFocusedTile = null;
  }

  protected showPrevious(event: Event): void {
    event.stopPropagation();
    this.step(-1);
  }

  protected showNext(event: Event): void {
    event.stopPropagation();
    this.step(1);
  }

  private step(delta: number): void {
    const total = this.photos.length;
    if (total === 0) {
      return;
    }

    this.activeIndex.update((index) => {
      const current = index === null ? 0 : index;
      return (current + delta + total) % total;
    });
  }

  private unlockScroll(): void {
    this.document.body.style.overflow = '';
  }
}
