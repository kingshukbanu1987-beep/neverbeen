/**
 * Premium Live Chat's temporary, unverified UPI payment. Opening an app, scanning a QR code or
 * returning to the browser is NOT proof of payment. The owner has explicitly enabled automatic
 * chat access for now; replace that policy with server-side merchant verification before
 * enforcing paid access. There is no UTR input or simulated payment verification.
 *
 * Phones and tablets open Google Pay / PhonePe directly with an app link. Laptops and desktops
 * cannot open a phone app, and NPCI no longer allows a website to push a UPI "collect" request to
 * a typed UPI ID there (P2P collect ended on 1 Oct 2025; merchant collect on desktop web ended on
 * 28 Feb 2026). They therefore pay by scanning a UPI QR code with their phone or tablet.
 */

export type UpiApp = 'gpay' | 'phonepe';
export type UpiPlatform = 'android' | 'ios';

export interface UpiAppOption {
  id: UpiApp;
  label: string;
  hint: string;
  /** Brand mark shown on the choice and in the centre of the desktop QR code. */
  icon: string;
  /** A UPI ID in this app's usual format, used as the desktop field's placeholder. */
  upiIdExample: string;
}

export const UPI_APPS: readonly UpiAppOption[] = [
  {
    id: 'gpay',
    label: 'Google Pay',
    hint: 'Open the Google Pay app',
    icon: '/payment-icons/google-pay.svg',
    upiIdExample: 'yourname@okaxis',
  },
  {
    id: 'phonepe',
    label: 'PhonePe',
    hint: 'Open the PhonePe app',
    icon: '/payment-icons/phonepe.svg',
    upiIdExample: 'yourname@ybl',
  },
];

/** Used only in the app link and QR code, never rendered on the payment page. */
const UPI_RECEIVERS: Readonly<Record<UpiApp, string>> = {
  gpay: 'kingshuk.banu.temp@okhdfcbank',
  phonepe: 'kingshuk.banu.temp-1@ybl',
};

const UPI_PAYEE_NAME = 'NeverBeen';
const UPI_NOTE_MAX_LENGTH = 80;

export const PREMIUM_PAYMENT_NOTE =
  'Live Chat opens automatically when you return from the payment app. Payment verification is temporarily disabled.';

/** On a laptop or desktop, the chat opens this long after the payment QR code appears. */
export const DESKTOP_CHAT_START_DELAY_MS = 10_000;

export const DESKTOP_PAYMENT_NOTE = `Live Chat opens automatically ${
  DESKTOP_CHAT_START_DELAY_MS / 1000
} seconds after your payment QR code appears. Payment verification is temporarily disabled.`;

export interface PremiumPaymentRequest {
  modelSlug: string;
  /** Rupees, not paise. */
  amount: number;
  method: UpiApp;
}

/** A laptop/desktop payment also carries the payer's own UPI ID, typed into the payment page. */
export interface DesktopPaymentRequest extends PremiumPaymentRequest {
  payerUpiId: string;
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
 * A UPI ID (virtual payment address) is `name@handle`: the name is letters, digits, dots,
 * hyphens or underscores (a mobile number is common), and the handle names the bank or app.
 */
const UPI_ID_PATTERN = /^[a-z0-9][a-z0-9._-]{1,255}@[a-z][a-z0-9]{1,63}$/;

/** UPI IDs are case-insensitive; stray spaces from copy-and-paste are dropped. */
export function normalizeUpiId(raw: string): string {
  return String(raw ?? '')
    .replace(/\s+/g, '')
    .toLowerCase();
}

/** Why the typed UPI ID cannot be used yet, or `''` when it is valid. The field is mandatory. */
export function upiIdError(raw: string): string {
  const upiId = normalizeUpiId(raw);
  if (!upiId) return 'Enter your UPI ID — it is required to pay on a laptop or desktop.';
  if (!UPI_ID_PATTERN.test(upiId)) {
    return 'Enter a valid UPI ID, such as yourname@okaxis or 9876543210@ybl.';
  }
  return '';
}

function assertPayable(request: PremiumPaymentRequest): void {
  if (
    !Object.hasOwn(UPI_RECEIVERS, request.method) ||
    !Number.isFinite(request.amount) ||
    request.amount <= 0
  ) {
    throw new Error('This Premium chat has no valid payment amount or payment app.');
  }
}

/**
 * App-specific schemes avoid the generic UPI app picker and Play Store redirects. GPay retains
 * its Tez scheme on Android; iOS uses `gpay`. PhonePe uses its own scheme on both platforms.
 * The receiver is necessarily present in the payment-app link, not in the page's visible copy.
 */
export function upiPaymentUrl(request: PremiumPaymentRequest, platform: UpiPlatform): string {
  assertPayable(request);

  const query = new URLSearchParams({
    pa: UPI_RECEIVERS[request.method],
    pn: UPI_PAYEE_NAME,
    am: request.amount.toFixed(2),
    cu: 'INR',
    tn: `NeverBeen Live Chat ${request.modelSlug}`.slice(0, UPI_NOTE_MAX_LENGTH),
  });
  const scheme =
    request.method === 'phonepe'
      ? 'phonepe://pay'
      : platform === 'android'
        ? 'tez://upi/pay'
        : 'gpay://upi/pay';

  return `${scheme}?${query.toString()}`;
}

/** RFC 3986 escaping (`%20` for spaces) that keeps `@` readable, as bank-issued UPI QRs do. */
function upiQrComponent(value: string): string {
  return encodeURIComponent(value).replace(/%40/g, '@');
}

/**
 * The text of the laptop/desktop payment QR code: a standard `upi://pay` link that Google Pay,
 * PhonePe and every other UPI app can scan. It fixes the payee and the exact amount, and its note
 * names the model and the payer's UPI ID so the payment can be matched to this chat. Scanning it
 * is a payer-initiated (push) payment — no collect request is sent to the typed UPI ID.
 */
export function upiQrPayload(request: DesktopPaymentRequest): string {
  assertPayable(request);
  const payerUpiId = normalizeUpiId(request.payerUpiId);
  if (upiIdError(payerUpiId)) throw new Error(upiIdError(payerUpiId));

  const note = `NeverBeen Live Chat ${request.modelSlug} from ${payerUpiId}`.slice(
    0,
    UPI_NOTE_MAX_LENGTH,
  );
  const params: readonly (readonly [string, string])[] = [
    ['pa', UPI_RECEIVERS[request.method]],
    ['pn', UPI_PAYEE_NAME],
    ['am', request.amount.toFixed(2)],
    ['cu', 'INR'],
    ['tn', note],
  ];
  return `upi://pay?${params.map(([key, value]) => `${key}=${upiQrComponent(value)}`).join('&')}`;
}
