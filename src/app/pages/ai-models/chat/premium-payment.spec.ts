import { describe, expect, it, vi } from 'vitest';
import {
  NEVERBEEN_UPI_ID,
  PREMIUM_PAYMENT_GATEWAY_NOTE,
  UPI_APPS,
  isValidUpiTransactionId,
  premiumPriceLabel,
  verifyPremiumTransaction,
} from './premium-payment';

describe('Premium Live Chat UPI payment', () => {
  it('offers exactly Google Pay and PhonePe, on the NeverBeen UPI handle', () => {
    expect(UPI_APPS.map((app) => app.id)).toEqual(['gpay', 'phonepe']);
    expect(NEVERBEEN_UPI_ID).toContain('@upi');
    expect(PREMIUM_PAYMENT_GATEWAY_NOTE.toLowerCase()).toContain('razorpay');
  });

  it('reads the amount in rupees, big', () => {
    expect(premiumPriceLabel(129)).toBe('₹129');
    expect(premiumPriceLabel(99)).toBe('₹99');
  });

  it('accepts a plausible UPI transaction reference and refuses anything else', () => {
    expect(isValidUpiTransactionId('415902783146')).toBe(true);
    expect(isValidUpiTransactionId('  ABC123xyz  ')).toBe(true);
    expect(isValidUpiTransactionId('abc')).toBe(false);
    expect(isValidUpiTransactionId('')).toBe(false);
    expect(isValidUpiTransactionId('12 34 56')).toBe(false);
    expect(isValidUpiTransactionId('UTR-#123')).toBe(false);
    expect(isValidUpiTransactionId('X'.repeat(33))).toBe(false);
  });

  it('verifies a paid transaction into a record once the reference checks out', async () => {
    vi.useFakeTimers();
    try {
      const attempt = {
        modelSlug: 'fiadh-dara',
        amount: 129,
        method: 'gpay' as const,
        transactionId: '415902783146',
      };
      const verified = verifyPremiumTransaction(attempt);
      await vi.advanceTimersByTimeAsync(1_300);
      const record = await verified;
      expect(record).toMatchObject(attempt);
      expect(record.verifiedAt).toBeGreaterThan(0);
    } finally {
      vi.useRealTimers();
    }
  });

  it('rejects a malformed reference instead of opening the chat', async () => {
    vi.useFakeTimers();
    try {
      const verification = verifyPremiumTransaction({
        modelSlug: 'fiadh-dara',
        amount: 129,
        method: 'phonepe' as const,
        transactionId: 'oops',
      });
      const expectation = expect(verification).rejects.toThrow(/could not be verified/);
      await vi.advanceTimersByTimeAsync(1_300);
      await expectation;
    } finally {
      vi.useRealTimers();
    }
  });
});
