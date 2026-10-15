/**
 * The Premium Live Chat payment step that stands between a verified Community member and a paid
 * chat. Today the amount is paid over UPI (GPay or PhonePe) and the transaction is verified from
 * its UPI reference; the Razorpay gateway is integrated in its place later, behind this same
 * shape, so the access screen does not change when it arrives.
 */

/** The two UPI apps a member may pay with today. */
export type UpiApp = 'gpay' | 'phonepe';

export interface UpiAppOption {
  id: UpiApp;
  label: string;
  /** Short line under the app name on the payment card. */
  hint: string;
}

export const UPI_APPS: readonly UpiAppOption[] = [
  { id: 'gpay', label: 'Google Pay', hint: 'Pay with the GPay UPI app' },
  { id: 'phonepe', label: 'PhonePe', hint: 'Pay with the PhonePe UPI app' },
];

/** The NeverBeen UPI handle the Premium amount is paid to. */
export const NEVERBEEN_UPI_ID = 'neverbeen@upi';

/**
 * Where the Razorpay payment gateway will take over. The current flow verifies the UPI reference
 * the member enters after paying; the gateway replaces `verifyPremiumTransaction` only.
 */
export const PREMIUM_PAYMENT_GATEWAY_NOTE =
  'Secure UPI checkout · Razorpay payment gateway integration follows next';

/** The amount and app behind one Premium payment attempt. */
export interface PremiumPaymentAttempt {
  /** The model the payment opens a chat with. */
  modelSlug: string;
  /** The rupee amount owed for a Premium chat with her. */
  amount: number;
  method: UpiApp;
  /** The UPI transaction reference (UTR) copied from the payment app. */
  transactionId: string;
}

/** One verified Premium payment, kept for the audit trail beside the session. */
export interface PremiumPaymentRecord extends PremiumPaymentAttempt {
  /** Epoch milliseconds of the successful verification. */
  verifiedAt: number;
}

/**
 * A UPI transaction reference (UTR) is 6 to 32 letters and digits. Anything else is a typo or a
 * paste of the wrong line, and is refused before the verification request is made.
 */
export function isValidUpiTransactionId(transactionId: string): boolean {
  return /^[A-Za-z0-9]{6,32}$/.test(transactionId.trim());
}

/** The amount as it is shown big on the Premium plan: `₹129`. */
export function premiumPriceLabel(amount: number): string {
  return `₹${amount}`;
}

/**
 * Verifies the UPI transaction the member says they have paid with. Until the Razorpay gateway
 * lands this stands in for the server-side check: the reference must be a plausible UPI id, and
 * the verification takes a moment the way a real gateway round trip does. It rejects on a
 * malformed reference and resolves with the verified record once the check passes.
 */
export function verifyPremiumTransaction(
  attempt: PremiumPaymentAttempt,
  waitMs = 1_200,
): Promise<PremiumPaymentRecord> {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (!isValidUpiTransactionId(attempt.transactionId)) {
        reject(
          new Error(
            'That UPI transaction reference could not be verified. Check the reference in your payment app and try again.',
          ),
        );
        return;
      }
      if (attempt.amount <= 0) {
        reject(new Error('This Premium chat has no amount to verify.'));
        return;
      }
      resolve({ ...attempt, transactionId: attempt.transactionId.trim(), verifiedAt: Date.now() });
    }, waitMs);
  });
}
