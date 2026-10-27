import hoodieCatalogue from '../../../../public/Merchandise/Hoodies-and-Sweatshirts/Hoodies-and-Sweatshirts.json';
import mugCatalogue from '../../../../public/Merchandise/Mugs-and-Coasters/Mugs-and-Coasters.json';
import toteCatalogue from '../../../../public/Merchandise/Tote-Bags-and-Backpacks/Tote-Bags-and-Backpacks.json';
import bottleCatalogue from '../../../../public/Merchandise/Water-Bottles-and-Tumblers/Water-Bottles-and-Tumblers.json';
import { MerchandiseCatalogService } from './merchandise-catalog.service';
import {
  INDIA_STATES,
  MERCHANDISE_CATEGORIES,
  addWorkingDays,
  indiaPhoneError,
  indiaPostalCodeError,
  merchandisePaymentBreakdown,
  normalizeIndiaPhone,
  validateIndiaCheckout,
} from './merchandise-data';

describe('Merchandise checkout data', () => {
  it('covers each requested public catalogue folder', () => {
    expect(MERCHANDISE_CATEGORIES.map((category) => category.folder)).toEqual([
      'T-Shirts',
      'Water-Bottles-and-Tumblers',
      'Tiffin-Boxes',
      'Poster-and-Stickers',
      'Caps',
      'Hoodies-and-Sweatshirts',
      'Mugs-and-Coasters',
      'Notebooks-and-Notepads',
      'Pens',
      'Tote-Bags-and-Backpacks',
      'Keychains',
      'Phone-Cases',
    ]);
  });

  it('normalizes common Indian mobile formats and rejects invalid numbers', () => {
    expect(normalizeIndiaPhone('+91 98765 43210')).toBe('9876543210');
    expect(normalizeIndiaPhone('098765-43210')).toBe('9876543210');
    expect(indiaPhoneError('9876543210')).toBe('');
    expect(indiaPhoneError('+91 98765 43210')).toBe('');
    expect(indiaPhoneError('1234567890')).toContain('valid 10-digit Indian mobile');
    expect(indiaPhoneError('987654321')).toContain('valid 10-digit Indian mobile');
  });

  it('accepts only a 6-digit Indian PIN code', () => {
    expect(indiaPostalCodeError('110001')).toBe('');
    expect(indiaPostalCodeError('012345')).toContain('6-digit Indian PIN');
    expect(indiaPostalCodeError('12345')).toContain('6-digit Indian PIN');
  });

  it('requires complete India-only delivery details before payment', () => {
    const address = {
      phone: '+91 98765 43210',
      line1: '12 Garden Road',
      line2: '',
      city: 'Kolkata',
      state: 'West Bengal',
      postalCode: '700001',
    };
    expect(validateIndiaCheckout('Asha Sen', 'asha@example.in', address)).toEqual({});
    expect(
      validateIndiaCheckout('Asha Sen', 'asha@example.in', {
        ...address,
        state: 'Singapore',
        postalCode: '000000',
      }),
    ).toMatchObject({
      state: 'Choose a state or union territory in India.',
      postalCode: 'Enter a valid 6-digit Indian PIN code.',
    });
    expect(INDIA_STATES).toContain('West Bengal');
  });

  it('estimates 15 weekdays while skipping Saturdays and Sundays', () => {
    expect(addWorkingDays(new Date(2025, 0, 6), 15)).toEqual(new Date(2025, 0, 27));
    expect(addWorkingDays(new Date(2025, 0, 3), 1)).toEqual(new Date(2025, 0, 6));
  });

  it('shows the current checkout tax and service breakdown as an estimate', () => {
    expect(merchandisePaymentBreakdown(1000)).toEqual({
      subtotal: 1000,
      serviceTax: 50,
      sgst: 90,
      cgst: 90,
      total: 1230,
    });
  });

  it('attaches Fiadh Dara to the Insulated Steel Bottle campaign', () => {
    const campaign = bottleCatalogue.items['NB-BT-001'].campaign;

    expect(campaign).toMatchObject({
      model: 'Fiadh Dara',
      label: 'Premium Model Edit',
      profile: '/ai-models/fiadh-dara',
      image: 'NB-BT-001-fiadh-dara-01.jpg',
    });
    expect(campaign?.gallery?.length).toBe(9);
  });

  it('renames the oversized hoodie and attaches Nour El-Sherif’s campaign', () => {
    const hoodie = hoodieCatalogue.items['NB-HS-001'];

    expect(hoodie.name).toBe("Women's Oversized Hoodie");
    expect(hoodie.audience).toBe('Women');
    expect(hoodie.image).toBe('NB-HS-001.jpg');
    expect(hoodie.campaign).toMatchObject({
      model: 'Nour El-Sherif',
      label: 'Premium Model Edit',
      profile: '/ai-models/nour-el-sherif',
      image: 'NB-HS-001-nour-el-sherif-01.jpg',
    });
    expect(hoodie.campaign.gallery).toEqual(
      Array.from(
        { length: 9 },
        (_, index) => `NB-HS-001-nour-el-sherif-${String(index + 2).padStart(2, '0')}.jpg`,
      ),
    );
  });

  it('resolves the oversized hoodie campaign photos from its catalogue folder', async () => {
    vi.stubGlobal('fetch', (url: string) =>
      Promise.resolve({
        ok: true,
        json: async () =>
          url.includes('Hoodies-and-Sweatshirts') ? hoodieCatalogue : { items: {} },
      }),
    );

    try {
      const service = new MerchandiseCatalogService();
      await service.load();

      const hoodie = service.products().find((product) => product.id === 'NB-HS-001');
      expect(hoodie?.name).toBe("Women's Oversized Hoodie");
      expect(hoodie?.audience).toBe('Women');
      expect(hoodie?.image).toBe('/Merchandise/Hoodies-and-Sweatshirts/NB-HS-001.jpg');
      expect(hoodie?.campaign?.image).toBe(
        '/Merchandise/Hoodies-and-Sweatshirts/NB-HS-001-nour-el-sherif-01.jpg',
      );
      expect(hoodie?.campaign?.gallery?.[8]).toBe(
        '/Merchandise/Hoodies-and-Sweatshirts/NB-HS-001-nour-el-sherif-10.jpg',
      );
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('attaches Alisha Bhattacharya to the Heavy Canvas Tote campaign', () => {
    const tote = toteCatalogue.items['NB-TB-001'];

    expect(tote.name).toBe('Heavy Canvas Tote');
    expect(tote.image).toBe('NB-TB-001.jpg');
    expect(tote.campaign).toMatchObject({
      model: 'Alisha Bhattacharya',
      label: 'Premium Model Edit',
      profile: '/ai-models/alisha-bhattacharya',
      image: 'NB-TB-001-alisha-bhattacharya-01.jpg',
      detailImageFit: 'contain',
    });
    expect(tote.campaign.gallery).toEqual(
      Array.from(
        { length: 9 },
        (_, index) => `NB-TB-001-alisha-bhattacharya-${String(index + 2).padStart(2, '0')}.jpg`,
      ),
    );
  });

  it('attaches Farah Al-Shaar to the Laptop Backpack campaign without replacing its product image', () => {
    const backpack = toteCatalogue.items['NB-TB-003'];

    expect(backpack.name).toBe('Laptop Backpack · 24 L');
    expect(backpack.image).toBe('NB-TB-003.jpg');
    expect(backpack.campaign).toMatchObject({
      model: 'Farah Al-Shaar',
      label: 'Premium Model Edit',
      profile: '/ai-models/farah-al-shaar',
      image: 'NB-TB-003-farah-al-shaar-01.jpg',
      detailImageFit: 'contain',
    });
    expect(backpack.campaign.gallery).toEqual(
      Array.from(
        { length: 9 },
        (_, index) => `NB-TB-003-farah-al-shaar-${String(index + 2).padStart(2, '0')}.jpg`,
      ),
    );
  });

  it('resolves Alisha’s tote and Farah’s backpack photos from the correct catalogue folder', async () => {
    vi.stubGlobal('fetch', (url: string) =>
      Promise.resolve({
        ok: true,
        json: async () => (url.includes('Tote-Bags-and-Backpacks') ? toteCatalogue : { items: {} }),
      }),
    );

    try {
      const service = new MerchandiseCatalogService();
      await service.load();

      const tote = service.products().find((product) => product.id === 'NB-TB-001');
      expect(tote?.campaign?.model).toBe('Alisha Bhattacharya');
      expect(tote?.image).toBe('/Merchandise/Tote-Bags-and-Backpacks/NB-TB-001.jpg');
      expect(tote?.campaign?.image).toBe(
        '/Merchandise/Tote-Bags-and-Backpacks/NB-TB-001-alisha-bhattacharya-01.jpg',
      );
      expect(tote?.campaign?.gallery?.[0]).toBe(
        '/Merchandise/Tote-Bags-and-Backpacks/NB-TB-001-alisha-bhattacharya-02.jpg',
      );
      expect(tote?.campaign?.gallery?.[8]).toBe(
        '/Merchandise/Tote-Bags-and-Backpacks/NB-TB-001-alisha-bhattacharya-10.jpg',
      );

      const backpack = service.products().find((product) => product.id === 'NB-TB-003');
      expect(backpack?.campaign?.model).toBe('Farah Al-Shaar');
      expect(backpack?.image).toBe('/Merchandise/Tote-Bags-and-Backpacks/NB-TB-003.jpg');
      expect(backpack?.campaign?.image).toBe(
        '/Merchandise/Tote-Bags-and-Backpacks/NB-TB-003-farah-al-shaar-01.jpg',
      );
      expect(backpack?.campaign?.gallery).toEqual(
        Array.from(
          { length: 9 },
          (_, index) =>
            `/Merchandise/Tote-Bags-and-Backpacks/NB-TB-003-farah-al-shaar-${String(index + 2).padStart(2, '0')}.jpg`,
        ),
      );
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('attaches Aoife Pahlavi to the Ceramic Mug campaign without replacing its product image', () => {
    const mug = mugCatalogue.items['NB-MC-001'];

    expect(mug.name).toBe('Ceramic Mug · 350 ml');
    expect(mug.image).toBe('NB-MC-001.jpg');
    expect(mug.campaign).toMatchObject({
      model: 'Aoife Pahlavi',
      label: 'Premium Model Edit',
      profile: '/ai-models/aoife-pahlavi',
      image: 'NB-MC-001-aoife-pahlavi-01.jpg',
      detailImageFit: 'contain',
    });
    expect(mug.campaign.gallery).toEqual(
      Array.from(
        { length: 9 },
        (_, index) => `NB-MC-001-aoife-pahlavi-${String(index + 2).padStart(2, '0')}.jpg`,
      ),
    );
  });

  it('resolves Aoife’s mug campaign photos from the correct catalogue folder', async () => {
    vi.stubGlobal('fetch', (url: string) =>
      Promise.resolve({
        ok: true,
        json: async () => (url.includes('Mugs-and-Coasters') ? mugCatalogue : { items: {} }),
      }),
    );

    try {
      const service = new MerchandiseCatalogService();
      await service.load();

      const mug = service.products().find((product) => product.id === 'NB-MC-001');
      expect(mug?.campaign?.model).toBe('Aoife Pahlavi');
      expect(mug?.image).toBe('/Merchandise/Mugs-and-Coasters/NB-MC-001.jpg');
      expect(mug?.campaign?.image).toBe(
        '/Merchandise/Mugs-and-Coasters/NB-MC-001-aoife-pahlavi-01.jpg',
      );
      expect(mug?.campaign?.gallery).toEqual(
        Array.from(
          { length: 9 },
          (_, index) =>
            `/Merchandise/Mugs-and-Coasters/NB-MC-001-aoife-pahlavi-${String(index + 2).padStart(2, '0')}.jpg`,
        ),
      );
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('resolves the Premium model campaign photo from its catalogue folder', async () => {
    vi.stubGlobal('fetch', (url: string) =>
      Promise.resolve({
        ok: true,
        json: async () =>
          url.includes('Water-Bottles-and-Tumblers') ? bottleCatalogue : { items: {} },
      }),
    );

    try {
      const service = new MerchandiseCatalogService();
      await service.load();

      const bottle = service.products().find((product) => product.id === 'NB-BT-001');
      expect(bottle?.campaign?.model).toBe('Fiadh Dara');
      expect(bottle?.campaign?.image).toBe(
        '/Merchandise/Water-Bottles-and-Tumblers/NB-BT-001-fiadh-dara-01.jpg',
      );
      expect(bottle?.campaign?.gallery?.[0]).toBe(
        '/Merchandise/Water-Bottles-and-Tumblers/NB-BT-001-fiadh-dara-02.jpg',
      );
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
