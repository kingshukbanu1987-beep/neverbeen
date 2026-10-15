import { describe, it, expect } from 'vitest';
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
      expect(price.total).toBe(total);
      expect(paymentDurationMs(id)).toBe(minutes * 60_000);
    },
  );
});
