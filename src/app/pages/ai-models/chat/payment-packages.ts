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
 * The flat addition the Premium Content Coverage option charges on top of the model's own base
 * price: the coverage costs the Base Price + ₹51, and it is taxed exactly like the rest of the
 * package subtotal.
 */
export const PREMIUM_CONTENT_COVERAGE_FLAT_PRICE = 51;

/** The Premium Content Coverage choices of the checkout, in their laid-out order. */
export const PREMIUM_CONTENT_COVERAGES = [
  {
    id: 'none',
    label: 'None',
    hint: 'A Premium Live Chat without the exclusive frames',
  },
  {
    id: 'coverage',
    label: 'Premium Content Coverage',
    hint: 'Unlock her exclusive Premium Content frames in this chat',
  },
] as const;
export type PremiumContentCoverageId = (typeof PREMIUM_CONTENT_COVERAGES)[number]['id'];

/**
 * The rupee amount of the Premium Content Coverage for one model: her own Base Price plus ₹51 —
 * ₹0 when no coverage was selected.
 */
export function premiumContentCoveragePrice(
  base: number,
  coverage: PremiumContentCoverageId,
): number {
  return coverage === 'coverage'
    ? Math.round(base) + PREMIUM_CONTENT_COVERAGE_FLAT_PRICE
    : 0;
}

/**
 * Round the additional charge to whole rupees, then calculate every tax on the full package
 * subtotal. The optional Premium Content Coverage joins the same package subtotal before any tax
 * is calculated, so it is taxable under the same Service tax · 5%, SGST · 9% and CGST · 9%. A
 * coupon is deducted from that same package subtotal after the pre-discount tax has been
 * calculated; it never reduces the taxable amount.
 */
export function paymentBreakdown(
  base: number,
  id: PaymentPackageId,
  discountPercent = 0,
  premiumContentCoverage = 0,
) {
  const upgrade = Math.round(base * paymentPackage(id).multiplier);
  const coverage = Math.max(0, Math.round(premiumContentCoverage));
  const subtotal = base + upgrade + coverage;
  const serviceTax = Math.round(subtotal * SERVICE_TAX_PERCENT) / 100;
  const sgst = Math.round(subtotal * SGST_PERCENT) / 100;
  const cgst = Math.round(subtotal * CGST_PERCENT) / 100;
  const totalBeforeDiscount = Math.round((subtotal + serviceTax + sgst + cgst) * 100) / 100;
  const discount = Math.round(subtotal * discountPercent) / 100;

  return {
    base,
    upgrade,
    coverage,
    subtotal,
    serviceTax,
    sgst,
    cgst,
    totalBeforeDiscount,
    discount,
    total: Math.round((totalBeforeDiscount - discount) * 100) / 100,
  };
}
