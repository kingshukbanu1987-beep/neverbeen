import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import hoodieCatalogue from '../../../../public/Merchandise/Hoodies-and-Sweatshirts/Hoodies-and-Sweatshirts.json';
import mugCatalogue from '../../../../public/Merchandise/Mugs-and-Coasters/Mugs-and-Coasters.json';
import toteCatalogue from '../../../../public/Merchandise/Tote-Bags-and-Backpacks/Tote-Bags-and-Backpacks.json';
import { CommunityService } from '../../services/community.service';
import { MerchandiseCatalogService } from './merchandise-catalog.service';
import { Merchandise } from './merchandise';

describe('Merchandise model campaigns', () => {
  it('shows Aoife’s mug campaign and retains the original product image', async () => {
    vi.stubGlobal('fetch', (url: string) =>
      Promise.resolve({
        ok: true,
        json: async () => (url.includes('Mugs-and-Coasters') ? mugCatalogue : { items: {} }),
      }),
    );
    vi.spyOn(window, 'scrollTo').mockImplementation(() => {});

    try {
      const catalogue = new MerchandiseCatalogService();
      await catalogue.load();
      await TestBed.configureTestingModule({
        imports: [Merchandise],
        providers: [
          provideRouter([]),
          { provide: MerchandiseCatalogService, useValue: catalogue },
          {
            provide: CommunityService,
            useValue: {
              currentUser: signal(null),
              isAuthenticated: signal(false),
              guestBrowsing: signal(false),
            },
          },
        ],
      }).compileComponents();

      const fixture = TestBed.createComponent(Merchandise);
      fixture.detectChanges();
      const root: HTMLElement = fixture.nativeElement;
      const card = root.querySelector<HTMLButtonElement>(
        '.product-media[aria-label="View Ceramic Mug · 350 ml"]',
      );
      expect(card?.querySelector('img')?.getAttribute('src')).toBe(
        '/Merchandise/Mugs-and-Coasters/NB-MC-001-aoife-pahlavi-01.jpg',
      );

      card!.click();
      fixture.detectChanges();

      const mainImage = root.querySelector<HTMLImageElement>('.detail-main-image img');
      expect(mainImage?.getAttribute('src')).toBe(
        '/Merchandise/Mugs-and-Coasters/NB-MC-001-aoife-pahlavi-02.jpg',
      );
      expect(mainImage?.alt).toBe(
        'Aoife Pahlavi presenting the Ceramic Mug · 350 ml in a white studio — look 1',
      );
      expect(mainImage?.classList.contains('detail-image-contain')).toBe(true);
      expect(window.getComputedStyle(mainImage!).objectFit).toBe('contain');

      const thumbnails = [...root.querySelectorAll<HTMLImageElement>('.thumbnail-row img')];
      expect(thumbnails).toHaveLength(10);
      expect(thumbnails.slice(0, 9).map((image) => image.getAttribute('src'))).toEqual(
        Array.from(
          { length: 9 },
          (_, index) =>
            `/Merchandise/Mugs-and-Coasters/NB-MC-001-aoife-pahlavi-${String(index + 2).padStart(2, '0')}.jpg`,
        ),
      );
      expect(thumbnails[9].getAttribute('src')).toBe(
        '/Merchandise/Mugs-and-Coasters/NB-MC-001.jpg',
      );
      expect(
        root
          .querySelector('a[aria-label="View the portfolio of Aoife Pahlavi"]')
          ?.getAttribute('href'),
      ).toBe('/ai-models/aoife-pahlavi');

      root.querySelectorAll<HTMLButtonElement>('.thumbnail-row button')[9].click();
      fixture.detectChanges();
      expect(root.querySelector('.detail-main-image img')?.getAttribute('src')).toBe(
        '/Merchandise/Mugs-and-Coasters/NB-MC-001.jpg',
      );
      fixture.destroy();
    } finally {
      TestBed.resetTestingModule();
      vi.unstubAllGlobals();
      vi.restoreAllMocks();
    }
  });

  it('shows the tote and backpack galleries without changing the default crop for other campaigns', async () => {
    vi.stubGlobal('fetch', (url: string) =>
      Promise.resolve({
        ok: true,
        json: async () => {
          if (url.includes('Tote-Bags-and-Backpacks')) return toteCatalogue;
          if (url.includes('Hoodies-and-Sweatshirts')) return hoodieCatalogue;
          return { items: {} };
        },
      }),
    );
    vi.spyOn(window, 'scrollTo').mockImplementation(() => {});

    try {
      const catalogue = new MerchandiseCatalogService();
      await catalogue.load();
      await TestBed.configureTestingModule({
        imports: [Merchandise],
        providers: [
          provideRouter([]),
          { provide: MerchandiseCatalogService, useValue: catalogue },
          {
            provide: CommunityService,
            useValue: {
              currentUser: signal(null),
              isAuthenticated: signal(false),
              guestBrowsing: signal(false),
            },
          },
        ],
      }).compileComponents();

      const fixture = TestBed.createComponent(Merchandise);
      fixture.detectChanges();
      const root: HTMLElement = fixture.nativeElement;
      const card = root.querySelector<HTMLButtonElement>(
        '.product-media[aria-label="View Heavy Canvas Tote"]',
      );
      expect(card?.querySelector('img')?.getAttribute('src')).toBe(
        '/Merchandise/Tote-Bags-and-Backpacks/NB-TB-001-alisha-bhattacharya-01.jpg',
      );

      card!.click();
      fixture.detectChanges();

      const mainImage = root.querySelector<HTMLImageElement>('.detail-main-image img');
      expect(mainImage?.getAttribute('src')).toBe(
        '/Merchandise/Tote-Bags-and-Backpacks/NB-TB-001-alisha-bhattacharya-02.jpg',
      );
      expect(mainImage?.alt).toBe(
        'Alisha Bhattacharya presenting the Heavy Canvas Tote in a white studio — look 1',
      );
      expect(mainImage?.classList.contains('detail-image-contain')).toBe(true);
      expect(window.getComputedStyle(mainImage!).objectFit).toBe('contain');

      const thumbnails = [...root.querySelectorAll<HTMLImageElement>('.thumbnail-row img')];
      expect(thumbnails).toHaveLength(10);
      expect(thumbnails[8].getAttribute('src')).toBe(
        '/Merchandise/Tote-Bags-and-Backpacks/NB-TB-001-alisha-bhattacharya-10.jpg',
      );
      expect(thumbnails[9].getAttribute('src')).toBe(
        '/Merchandise/Tote-Bags-and-Backpacks/NB-TB-001.jpg',
      );
      expect(
        root
          .querySelector('a[aria-label="View the portfolio of Alisha Bhattacharya"]')
          ?.getAttribute('href'),
      ).toBe('/ai-models/alisha-bhattacharya');

      root.querySelectorAll<HTMLButtonElement>('.thumbnail-row button')[9].click();
      fixture.detectChanges();
      expect(root.querySelector('.detail-main-image img')?.getAttribute('src')).toBe(
        '/Merchandise/Tote-Bags-and-Backpacks/NB-TB-001.jpg',
      );

      root.querySelector<HTMLButtonElement>('.back-link')!.click();
      fixture.detectChanges();
      const backpackCard = root.querySelector<HTMLButtonElement>(
        '.product-media[aria-label="View Laptop Backpack · 24 L"]',
      );
      expect(backpackCard?.querySelector('img')?.getAttribute('src')).toBe(
        '/Merchandise/Tote-Bags-and-Backpacks/NB-TB-003-farah-al-shaar-01.jpg',
      );
      backpackCard!.click();
      fixture.detectChanges();

      const backpackImage = root.querySelector<HTMLImageElement>('.detail-main-image img');
      expect(backpackImage?.getAttribute('src')).toBe(
        '/Merchandise/Tote-Bags-and-Backpacks/NB-TB-003-farah-al-shaar-02.jpg',
      );
      expect(backpackImage?.alt).toBe(
        'Farah Al-Shaar presenting the Laptop Backpack · 24 L in a white studio — look 1',
      );
      expect(backpackImage?.classList.contains('detail-image-contain')).toBe(true);
      expect(window.getComputedStyle(backpackImage!).objectFit).toBe('contain');
      const backpackThumbnails = [...root.querySelectorAll<HTMLImageElement>('.thumbnail-row img')];
      expect(backpackThumbnails).toHaveLength(10);
      expect(backpackThumbnails.slice(0, 9).map((image) => image.getAttribute('src'))).toEqual(
        Array.from(
          { length: 9 },
          (_, index) =>
            `/Merchandise/Tote-Bags-and-Backpacks/NB-TB-003-farah-al-shaar-${String(index + 2).padStart(2, '0')}.jpg`,
        ),
      );
      expect(backpackThumbnails[9].getAttribute('src')).toBe(
        '/Merchandise/Tote-Bags-and-Backpacks/NB-TB-003.jpg',
      );
      expect(
        root
          .querySelector('a[aria-label="View the portfolio of Farah Al-Shaar"]')
          ?.getAttribute('href'),
      ).toBe('/ai-models/farah-al-shaar');
      root.querySelectorAll<HTMLButtonElement>('.thumbnail-row button')[9].click();
      fixture.detectChanges();
      expect(root.querySelector('.detail-main-image img')?.getAttribute('src')).toBe(
        '/Merchandise/Tote-Bags-and-Backpacks/NB-TB-003.jpg',
      );

      root.querySelector<HTMLButtonElement>('.back-link')!.click();
      fixture.detectChanges();
      const hoodieCard = [...root.querySelectorAll<HTMLButtonElement>('.product-media')].find(
        (element) => element.getAttribute('aria-label') === "View Women's Oversized Hoodie",
      );
      expect(hoodieCard).toBeDefined();
      hoodieCard!.click();
      fixture.detectChanges();
      const hoodieImage = root.querySelector<HTMLImageElement>('.detail-main-image img');
      expect(hoodieImage?.classList.contains('detail-image-contain')).toBe(false);
      expect(window.getComputedStyle(hoodieImage!).objectFit).toBe('cover');
      fixture.destroy();
    } finally {
      TestBed.resetTestingModule();
      vi.unstubAllGlobals();
      vi.restoreAllMocks();
    }
  });
});
