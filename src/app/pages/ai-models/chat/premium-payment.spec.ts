import { describe, expect, it } from 'vitest';
import {
  PREMIUM_PAYMENT_NOTE,
  PremiumPaymentRequest,
  UPI_APPS,
  premiumPriceLabel,
  upiPaymentUrl,
  upiPlatform,
} from './premium-payment';

const request: PremiumPaymentRequest = {
  modelSlug: 'nourhan-durrani',
  amount: 119,
  method: 'gpay',
};

describe('Premium Live Chat UPI app links (unverified)', () => {
  it('offers only Google Pay and PhonePe, with no simulated verification', () => {
    expect(UPI_APPS.map((app) => [app.id, app.label])).toEqual([
      ['gpay', 'Google Pay'],
      ['phonepe', 'PhonePe'],
    ]);
    expect(PREMIUM_PAYMENT_NOTE).toContain('verification is temporarily disabled');
  });

  it('shows the model’s amount in rupees', () => {
    expect(premiumPriceLabel(119)).toBe('₹119');
    expect(premiumPriceLabel(99)).toBe('₹99');
    expect(premiumPriceLabel(199)).toBe('₹199');
  });

  it.each([
    ['android', 'gpay', 'tez:', 'upi', '/pay', 'kingshuk.banu.temp@okhdfcbank'],
    ['ios', 'gpay', 'gpay:', 'upi', '/pay', 'kingshuk.banu.temp@okhdfcbank'],
    ['android', 'phonepe', 'phonepe:', 'pay', '', 'kingshuk.banu.temp-1@ybl'],
    ['ios', 'phonepe', 'phonepe:', 'pay', '', 'kingshuk.banu.temp-1@ybl'],
  ] as const)(
    'targets %s / %s with the correct receiver, brand, amount and INR',
    (platform, method, scheme, host, path, receiver) => {
      const url = new URL(upiPaymentUrl({ ...request, method }, platform));
      expect(url.protocol).toBe(scheme);
      expect(url.host).toBe(host);
      expect(url.pathname).toBe(path);
      expect(url.searchParams.get('pa')).toBe(receiver);
      expect(url.searchParams.get('pn')).toBe('NeverBeen');
      expect(url.searchParams.get('am')).toBe('119.00');
      expect(url.searchParams.get('cu')).toBe('INR');
      expect(url.searchParams.get('tn')).toContain('nourhan-durrani');
      expect(url.searchParams.has('transactionId')).toBe(false);
      expect(url.searchParams.has('utr')).toBe(false);
    },
  );

  it('encodes app-link parameters rather than interpolating them as query syntax', () => {
    const url = new URL(upiPaymentUrl({ ...request, modelSlug: 'model&am=1#fragment' }, 'android'));
    expect(url.searchParams.getAll('am')).toEqual(['119.00']);
    expect(url.searchParams.get('tn')).toBe('NeverBeen Live Chat model&am=1#fragment');
    expect(url.hash).toBe('');
  });

  it.each([0, -1, NaN, Infinity, -Infinity])('refuses the invalid amount %s', (amount) => {
    expect(() => upiPaymentUrl({ ...request, amount }, 'android')).toThrow(/valid payment/);
  });

  it('does not accept a third payment app at runtime', () => {
    expect(() =>
      upiPaymentUrl({ ...request, method: 'other' } as unknown as PremiumPaymentRequest, 'ios'),
    ).toThrow(/valid payment/);
  });
});

describe('UPI mobile and tablet platform selection', () => {
  it.each([
    ['Mozilla/5.0 (Linux; Android 15; Pixel 9) Mobile', 'Linux armv8l', 5, 'android'],
    ['Mozilla/5.0 (Linux; Android 14; Tablet) AppleWebKit/537.36', 'Linux armv8l', 5, 'android'],
    ['Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)', 'iPhone', 5, 'ios'],
    ['Mozilla/5.0 (iPad; CPU OS 18_0 like Mac OS X)', 'iPad', 5, 'ios'],
    ['Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15) Safari/605.1.15', 'MacIntel', 5, 'ios'],
    ['Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15) Safari/605.1.15', 'MacIntel', 0, null],
    ['Mozilla/5.0 (Windows NT 10.0; Win64; x64)', 'Win32', 10, null],
    ['Mozilla/5.0 (X11; Linux x86_64)', 'Linux x86_64', 0, null],
  ] as const)('recognises %s', (userAgent, platform, maxTouchPoints, expected) => {
    expect(upiPlatform({ userAgent, platform, maxTouchPoints })).toBe(expected);
  });
});
