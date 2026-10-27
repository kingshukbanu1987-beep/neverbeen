import { Injectable, signal } from '@angular/core';
import {
  MERCHANDISE_CATEGORIES,
  MerchandiseCategoryFile,
  MerchandiseProduct,
} from './merchandise-data';

@Injectable({ providedIn: 'root' })
export class MerchandiseCatalogService {
  readonly categories = MERCHANDISE_CATEGORIES;
  readonly products = signal<MerchandiseProduct[]>([]);
  readonly loading = signal(true);
  readonly error = signal('');
  private loaded = false;
  private loadingPromise: Promise<void> | null = null;

  load(): Promise<void> {
    if (this.loaded) return Promise.resolve();
    if (this.loadingPromise) return this.loadingPromise;

    this.loading.set(true);
    this.error.set('');
    this.loadingPromise = Promise.all(
      this.categories.map(async (category) => {
        const response = await fetch(
          `/Merchandise/${encodeURIComponent(category.folder)}/${encodeURIComponent(category.folder)}.json`,
          { headers: { Accept: 'application/json' } },
        );
        if (!response.ok) {
          throw new Error(
            `The ${category.title} catalogue could not be loaded (${response.status}).`,
          );
        }
        const file = (await response.json()) as MerchandiseCategoryFile;
        const resolveFile = (fileName: string) =>
          `/Merchandise/${category.folder}/${encodeURIComponent(fileName)}`;
        return Object.entries(file.items).map(([id, item]): MerchandiseProduct => {
          const { campaign, ...productFields } = item;
          return {
            ...productFields,
            id,
            image: resolveFile(item.image),
            ...(campaign
              ? {
                  campaign: {
                    ...campaign,
                    image: resolveFile(campaign.image),
                    ...(campaign.gallery
                      ? { gallery: campaign.gallery.map(resolveFile) }
                      : {}),
                  },
                }
              : {}),
            category,
          };
        });
      }),
    )
      .then((groups) => {
        this.products.set(groups.flat());
        this.loaded = true;
      })
      .catch((error: unknown) => {
        this.error.set(
          error instanceof Error
            ? error.message
            : 'The NeverBeen merchandise catalogue could not be loaded. Please try again.',
        );
      })
      .finally(() => {
        this.loading.set(false);
        this.loadingPromise = null;
      });

    return this.loadingPromise;
  }
}
