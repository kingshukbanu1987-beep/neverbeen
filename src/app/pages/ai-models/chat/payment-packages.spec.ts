import { describe, it, expect } from 'vitest';
import { findPaymentCoupon } from './payment-coupons';
import {
  CGST_PERCENT,
  SGST_PERCENT,
  paymentBreakdown,
  paymentDurationMs,
  PaymentPackageId,
} from './payment-packages';

describe('checkout packages', () => {
  it.each([
    ['basic', 0, 15, 146.37],
    ['extended', 298, 45, 512.91],
    ['deep', 595, 90, 878.22],
    ['ultimate', 893, 135, 1244.76],
  ] as const)(
    '%s adds a rounded upgrade, 5% service tax, 9% SGST and 9% CGST',
    (id, upgrade, minutes, total) => {
      const price = paymentBreakdown(119, id as PaymentPackageId);
      expect(price.upgrade).toBe(upgrade);
      expect(price.subtotal).toBe(119 + upgrade);
      expect(price.serviceTax).toBe(Math.round((119 + upgrade) * 5) / 100);
      expect(price.sgst).toBe(Math.round((119 + upgrade) * SGST_PERCENT) / 100);
      expect(price.cgst).toBe(Math.round((119 + upgrade) * CGST_PERCENT) / 100);
      expect(price.totalBeforeDiscount).toBe(total);
      expect(price.discount).toBe(0);
      expect(price.total).toBe(total);
      expect(paymentDurationMs(id)).toBe(minutes * 60_000);
    },
  );

  it('applies SPECIAL to the selected package subtotal without reducing any tax', () => {
    const coupon = findPaymentCoupon('  special ');
    expect(coupon?.percentOff).toBe(15);

    const discounted = paymentBreakdown(119, 'extended', coupon!.percentOff);
    expect(discounted.subtotal).toBe(417);
    expect(discounted.serviceTax).toBe(20.85);
    expect(discounted.sgst).toBe(37.53);
    expect(discounted.cgst).toBe(37.53);
    expect(discounted.totalBeforeDiscount).toBe(512.91);
    expect(discounted.discount).toBe(62.55);
    expect(discounted.total).toBe(450.36);
  });

  it('applies NEVERBEEN at 25% of the base package subtotal and restores tax-inclusive total math', () => {
    const coupon = findPaymentCoupon('neverbeen');
    expect(coupon?.percentOff).toBe(25);

    const discounted = paymentBreakdown(119, 'basic', coupon!.percentOff);
    expect(discounted.subtotal).toBe(119);
    expect(discounted.totalBeforeDiscount).toBe(146.37);
    expect(discounted.discount).toBe(29.75);
    expect(discounted.total).toBe(116.62);
  });

  it('rejects unknown coupons', () => {
    expect(findPaymentCoupon('not-a-coupon')).toBeNull();
  });
});
