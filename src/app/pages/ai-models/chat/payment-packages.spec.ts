import { describe, it, expect } from 'vitest';
import { paymentBreakdown, paymentDurationMs, PaymentPackageId } from './payment-packages';

describe('checkout packages', () => {
  it.each([
    ['basic', 0, 15, 124.95],
    ['extended', 298, 45, 437.85],
    ['deep', 595, 90, 749.7],
    ['ultimate', 893, 135, 1062.6],
  ] as const)('%s adds a rounded upgrade and 5% tax', (id, upgrade, minutes, total) => {
    const price = paymentBreakdown(119, id as PaymentPackageId);
    expect(price.upgrade).toBe(upgrade);
    expect(price.subtotal).toBe(119 + upgrade);
    expect(price.total).toBe(total);
    expect(paymentDurationMs(id)).toBe(minutes * 60_000);
  });
});
