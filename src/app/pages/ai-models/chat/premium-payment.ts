/**
 * Premium Live Chat's temporary, unverified UPI app handoff. Opening an app or returning to the
 * browser is NOT proof of payment. The owner has explicitly enabled automatic chat access on
 * return for now; replace that policy with server-side merchant verification before enforcing
 * paid access. There is no UTR input or simulated payment verification.
 */

export type UpiApp = 'gpay' | 'phonepe';
export type UpiPlatform = 'android' | 'ios';

export interface UpiAppOption {
  id: UpiApp;
  label: string;
  hint: string;
}

export const UPI_APPS: readonly UpiAppOption[] = [
  { id: 'gpay', label: 'Google Pay', hint: 'Open the Google Pay app' },
  { id: 'phonepe', label: 'PhonePe', hint: 'Open the PhonePe app' },
];

/** Used only in the app link, never rendered on the payment page. */
const UPI_RECEIVERS: Readonly<Record<UpiApp, string>> = {
  gpay: 'kingshuk.banu.temp@okhdfcbank',
  phonepe: 'kingshuk.banu.temp-1@ybl',
};

export const PREMIUM_PAYMENT_NOTE =
  'Live Chat opens automatically when you return from the payment app. Payment verification is temporarily disabled.';

export interface PremiumPaymentRequest {
  modelSlug: string;
  /** Rupees, not paise. */
  amount: number;
  method: UpiApp;
}

/** The amount as it is shown on the Premium plan: `₹119`. */
export function premiumPriceLabel(amount: number): string {
  return `₹${amount}`;
}

/** Includes Android tablets and iPads using their desktop-style Safari user agent. */
export function upiPlatform(
  device: Pick<Navigator, 'userAgent' | 'platform' | 'maxTouchPoints'>,
): UpiPlatform | null {
  if (/android/i.test(device.userAgent)) return 'android';
  if (
    /iphone|ipad|ipod/i.test(device.userAgent) ||
    (/Mac/i.test(device.platform) && device.maxTouchPoints > 1)
  ) {
    return 'ios';
  }
  return null;
}

/**
 * App-specific schemes avoid the generic UPI app picker and Play Store redirects. GPay retains
 * its Tez scheme on Android; iOS uses `gpay`. PhonePe uses its own scheme on both platforms.
 * The receiver is necessarily present in the payment-app link, not in the page's visible copy.
 */
export function upiPaymentUrl(request: PremiumPaymentRequest, platform: UpiPlatform): string {
  if (
    !Object.hasOwn(UPI_RECEIVERS, request.method) ||
    !Number.isFinite(request.amount) ||
    request.amount <= 0
  ) {
    throw new Error('This Premium chat has no valid payment amount or payment app.');
  }

  const query = new URLSearchParams({
    pa: UPI_RECEIVERS[request.method],
    pn: 'NeverBeen',
    am: request.amount.toFixed(2),
    cu: 'INR',
    tn: `NeverBeen Live Chat ${request.modelSlug}`.slice(0, 80),
  });
  const scheme =
    request.method === 'phonepe'
      ? 'phonepe://pay'
      : platform === 'android'
        ? 'tez://upi/pay'
        : 'gpay://upi/pay';

  return `${scheme}?${query.toString()}`;
}
