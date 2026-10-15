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
    label: 'Stay longer',
    extraMinutes: 30,
    multiplier: 2.5,
    tagline: 'Let the conversation unfold',
  },
  {
    id: 'deep',
    label: 'Deep connection',
    extraMinutes: 75,
    multiplier: 5,
    tagline: 'More moments. More connection.',
  },
  {
    id: 'ultimate',
    label: 'Unhurried',
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

/** Round the additional charge to whole rupees, then calculate tax in paise. */
export function paymentBreakdown(base: number, id: PaymentPackageId) {
  const upgrade = Math.round(base * paymentPackage(id).multiplier);
  const subtotal = base + upgrade;
  const tax = Math.round(subtotal * 5) / 100;
  return { base, upgrade, subtotal, tax, total: Math.round((subtotal + tax) * 100) / 100 };
}
