export const PAYMENT_COUPONS = [
  { code: 'SPECIAL', percentOff: 15 },
  { code: 'NEVERBEEN', percentOff: 25 },
] as const;

export type PaymentCoupon = (typeof PAYMENT_COUPONS)[number];

/** Coupon codes are case-insensitive and ignore accidental leading or trailing spaces. */
export function findPaymentCoupon(code: string): PaymentCoupon | null {
  const normalizedCode = code.trim().toUpperCase();
  return PAYMENT_COUPONS.find((coupon) => coupon.code === normalizedCode) ?? null;
}
