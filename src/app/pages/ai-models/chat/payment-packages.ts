import { LIVE_CHAT_PLANS } from './chat-types';

export const PAYMENT_PACKAGES = [
  {
    id: 'basic',
    label: 'Basic',
    extraMinutes: 0,
    multiplier: 0,
    tagline: 'A little time, just for you',
  },
  {
    id: 'extended',
    label: 'Stay Longer',
    extraMinutes: 30,
    multiplier: 2.5,
    tagline: 'Let the conversation unfold',
  },
  {
    id: 'deep',
    label: 'Deep Connection',
    extraMinutes: 75,
    multiplier: 5,
    tagline: 'More moments. More connection.',
  },
  {
    id: 'ultimate',
    label: 'Intimate',
    extraMinutes: 120,
    multiplier: 7.5,
    tagline: 'Make time for everything',
  },
] as const;
export type PaymentPackageId = (typeof PAYMENT_PACKAGES)[number]['id'];

export function paymentPackage(id: PaymentPackageId) {
  return PAYMENT_PACKAGES.find((plan) => plan.id === id) ?? PAYMENT_PACKAGES[0];
}

export function paymentDurationMs(id: PaymentPackageId): number {
  return LIVE_CHAT_PLANS.premium.durationMs + paymentPackage(id).extraMinutes * 60_000;
}

/** Charged on the package subtotal: a 5% service tax plus 9% each of SGST and CGST. */
export const SERVICE_TAX_PERCENT = 5;
export const SGST_PERCENT = 9;
export const CGST_PERCENT = 9;

/**
 * Round the additional charge to whole rupees, then calculate every tax on the full package
 * subtotal. A coupon is deducted from that same package subtotal after the pre-discount tax has
 * been calculated; it never reduces the taxable amount.
 */
export function paymentBreakdown(base: number, id: PaymentPackageId, discountPercent = 0) {
  const upgrade = Math.round(base * paymentPackage(id).multiplier);
  const subtotal = base + upgrade;
  const serviceTax = Math.round(subtotal * SERVICE_TAX_PERCENT) / 100;
  const sgst = Math.round(subtotal * SGST_PERCENT) / 100;
  const cgst = Math.round(subtotal * CGST_PERCENT) / 100;
  const totalBeforeDiscount = Math.round((subtotal + serviceTax + sgst + cgst) * 100) / 100;
  const discount = Math.round(subtotal * discountPercent) / 100;

  return {
    base,
    upgrade,
    subtotal,
    serviceTax,
    sgst,
    cgst,
    totalBeforeDiscount,
    discount,
    total: Math.round((totalBeforeDiscount - discount) * 100) / 100,
  };
}
