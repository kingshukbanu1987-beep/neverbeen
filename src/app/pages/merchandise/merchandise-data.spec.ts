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
      image: 'NB-BT-001-fiadh-dara.jpg',
    });
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
        '/Merchandise/Water-Bottles-and-Tumblers/NB-BT-001-fiadh-dara.jpg',
      );
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
