export interface MerchandiseCategory {
  /** Directory inside public/Merchandise. */
  folder: string;
  slug: string;
  title: string;
}

/** The folder names are part of the public catalogue format; keep these in sync with the assets. */
export const MERCHANDISE_CATEGORIES: readonly MerchandiseCategory[] = [
  { folder: 'T-Shirts', slug: 't-shirts', title: 'T-Shirts' },
  {
    folder: 'Water-Bottles-and-Tumblers',
    slug: 'water-bottles-and-tumblers',
    title: 'Water Bottles & Tumblers',
  },
  { folder: 'Tiffin-Boxes', slug: 'tiffin-boxes', title: 'Tiffin Boxes' },
  { folder: 'Poster-and-Stickers', slug: 'poster-and-stickers', title: 'Posters & Stickers' },
  { folder: 'Caps', slug: 'caps', title: 'Caps' },
  {
    folder: 'Hoodies-and-Sweatshirts',
    slug: 'hoodies-and-sweatshirts',
    title: 'Hoodies & Sweatshirts',
  },
  { folder: 'Mugs-and-Coasters', slug: 'mugs-and-coasters', title: 'Mugs & Coasters' },
  {
    folder: 'Notebooks-and-Notepads',
    slug: 'notebooks-and-notepads',
    title: 'Notebooks & Notepads',
  },
  { folder: 'Pens', slug: 'pens', title: 'Pens' },
  {
    folder: 'Tote-Bags-and-Backpacks',
    slug: 'tote-bags-and-backpacks',
    title: 'Tote Bags & Backpacks',
  },
  { folder: 'Keychains', slug: 'keychains', title: 'Keychains' },
  { folder: 'Phone-Cases', slug: 'phone-cases', title: 'Phone Cases' },
];

/**
 * A Premium NeverBeen model campaign for one product. `image` is resolved to its public
 * catalogue path by MerchandiseCatalogService; catalogue JSON stores only the file name.
 */
export interface MerchandiseModelCampaign {
  model: string;
  label: string;
  note: string;
  profile: string;
  image: string;
}

export interface MerchandiseProduct {
  id: string;
  name: string;
  audience: string;
  price: number;
  compareAtPrice?: number;
  colors: string[];
  sizes: string[];
  material: string;
  badge?: string;
  rating: number;
  reviews: number;
  description: string;
  image: string;
  campaign?: MerchandiseModelCampaign;
  currency: 'INR';
  inStock: boolean;
  deliveryWorkingDays: number;
  highlights: string[];
  category: MerchandiseCategory;
}

export type MerchandiseProductFile = Omit<MerchandiseProduct, 'category' | 'image' | 'campaign'> & {
  image: string;
  campaign?: Omit<MerchandiseModelCampaign, 'image'> & { image: string };
};

export interface MerchandiseCategoryFile {
  category: string;
  slug: string;
  title: string;
  subtitle: string;
  description: string;
  deliveryWorkingDays: number;
  currency: 'INR';
  items: Record<string, MerchandiseProductFile>;
}

export interface MerchandiseCartItem {
  productId: string;
  quantity: number;
  size: string;
  color: string;
}

export interface MerchandiseCartLine extends MerchandiseCartItem {
  product: MerchandiseProduct;
  lineTotal: number;
}

export interface CheckoutAddress {
  phone: string;
  line1: string;
  line2: string;
  city: string;
  state: string;
  postalCode: string;
}

export const INDIA_STATES: readonly string[] = [
  'Andhra Pradesh',
  'Arunachal Pradesh',
  'Assam',
  'Bihar',
  'Chhattisgarh',
  'Goa',
  'Gujarat',
  'Haryana',
  'Himachal Pradesh',
  'Jharkhand',
  'Karnataka',
  'Kerala',
  'Madhya Pradesh',
  'Maharashtra',
  'Manipur',
  'Meghalaya',
  'Mizoram',
  'Nagaland',
  'Odisha',
  'Punjab',
  'Rajasthan',
  'Sikkim',
  'Tamil Nadu',
  'Telangana',
  'Tripura',
  'Uttar Pradesh',
  'Uttarakhand',
  'West Bengal',
  'Andaman and Nicobar Islands',
  'Chandigarh',
  'Dadra and Nagar Haveli and Daman and Diu',
  'Delhi',
  'Jammu and Kashmir',
  'Ladakh',
  'Lakshadweep',
  'Puducherry',
];

export type AddressField = keyof CheckoutAddress | 'name' | 'email';

/** Indian mobile numbers must be ten digits and begin with 6, 7, 8 or 9. */
export function normalizeIndiaPhone(value: string): string {
  let digits = String(value ?? '')
    .trim()
    .replace(/[\s()-]/g, '');
  if (digits.startsWith('+91')) digits = digits.slice(3);
  else if (digits.startsWith('0091')) digits = digits.slice(4);
  else if (digits.startsWith('91') && digits.length === 12) digits = digits.slice(2);
  else if (digits.startsWith('0') && digits.length === 11) digits = digits.slice(1);
  return digits;
}

export function indiaPhoneError(value: string): string {
  const phone = normalizeIndiaPhone(value);
  return /^[6-9]\d{9}$/.test(phone)
    ? ''
    : 'Enter a valid 10-digit Indian mobile number beginning with 6, 7, 8 or 9.';
}

export function indiaPostalCodeError(value: string): string {
  return /^[1-9]\d{5}$/.test(value.trim()) ? '' : 'Enter a valid 6-digit Indian PIN code.';
}

export function validateIndiaCheckout(
  name: string,
  email: string,
  address: CheckoutAddress,
): Partial<Record<AddressField, string>> {
  const errors: Partial<Record<AddressField, string>> = {};
  if (name.trim().length < 2)
    errors.name = 'Add your name to your Community profile before checkout.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
    errors.email = 'A valid Community email address is required.';
  }
  const phoneError = indiaPhoneError(address.phone);
  if (phoneError) errors.phone = phoneError;
  if (address.line1.trim().length < 6)
    errors.line1 = 'Enter a complete street address (at least 6 characters).';
  if (address.city.trim().length < 2) errors.city = 'Enter your city or town.';
  if (!INDIA_STATES.includes(address.state))
    errors.state = 'Choose a state or union territory in India.';
  const pinError = indiaPostalCodeError(address.postalCode);
  if (pinError) errors.postalCode = pinError;
  return errors;
}

/**
 * Estimate 15 working days from the booking date. Saturdays and Sundays are excluded; public
 * holidays are not available in the static storefront calendar and may shift the carrier estimate.
 */
export function addWorkingDays(from: Date, workingDays: number): Date {
  const result = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  let added = 0;
  while (added < workingDays) {
    result.setDate(result.getDate() + 1);
    if (result.getDay() !== 0 && result.getDay() !== 6) added += 1;
  }
  return result;
}

export function formatIndiaRupees(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}

/** Estimated checkout taxes mirror the current NeverBeen premium checkout breakdown (5% + 9% + 9%). */
export const MERCHANDISE_SERVICE_TAX_PERCENT = 5;
export const MERCHANDISE_SGST_PERCENT = 9;
export const MERCHANDISE_CGST_PERCENT = 9;

export function merchandisePaymentBreakdown(subtotal: number) {
  const serviceTax = Math.round(subtotal * MERCHANDISE_SERVICE_TAX_PERCENT) / 100;
  const sgst = Math.round(subtotal * MERCHANDISE_SGST_PERCENT) / 100;
  const cgst = Math.round(subtotal * MERCHANDISE_CGST_PERCENT) / 100;
  const total = Math.round((subtotal + serviceTax + sgst + cgst) * 100) / 100;
  return { subtotal, serviceTax, sgst, cgst, total };
}
