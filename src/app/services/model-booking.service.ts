import { Injectable } from '@angular/core';
import couponConfiguration from '../pages/ai-models/booking/coupons.json';
import { founderWhatsAppLink } from './whatsapp-link';

/**
 * One photo order: a package of photographs priced at the model's per-photo rate, or a customized
 * order the studio quotes after reading the brief (`custom`, with no price yet).
 */
export interface BookingPhotoOrder {
  label: string;
  detail: string;
  photos: number;
  ratePerPhoto: number;
  amount: number;
  custom: boolean;
}

/** The packages every model offers, priced at her own per-photo rate (INR). */
export const BOOKING_PACKAGES: readonly { photos: number; label: string; detail: string }[] = [
  { photos: 10, label: '10 photographs', detail: 'Minimum order' },
  { photos: 25, label: '25 photographs', detail: 'Editorial pick' },
  { photos: 50, label: '50 photographs', detail: 'Campaign set' },
  { photos: 100, label: '100 photographs', detail: 'Full portfolio' },
];

export const CUSTOM_ORDER_LABEL = 'Customized order';
export const CUSTOM_ORDER_DETAIL = 'Selective charge, quoted after we read your brief';

export const BOOKING_SERVICE_TAX_PERCENT = 5;
export const BOOKING_SERVICE_TAX_RATE = BOOKING_SERVICE_TAX_PERCENT / 100;

export interface BookingCoupon {
  code: string;
  discountInr: number;
  /** Inclusive expiry date in India Standard Time (YYYY-MM-DD). */
  expiresOn: string;
}

export type BookingCouponValidation =
  | { status: 'valid'; coupon: BookingCoupon }
  | { status: 'expired' | 'unavailable' | 'empty'; coupon: null };

export interface BookingPricing {
  subtotal: number;
  serviceTax: number;
  couponCode: string;
  discount: number;
  total: number;
}

export const BOOKING_COUPONS: readonly BookingCoupon[] = couponConfiguration.coupons;

/** Validates coupon availability; configured expiry dates remain valid through the full IST date. */
export function validateBookingCoupon(code: string, now = new Date()): BookingCouponValidation {
  const normalizedCode = code.trim().toUpperCase();
  if (!normalizedCode) return { status: 'empty', coupon: null };

  const coupon = BOOKING_COUPONS.find((entry) => entry.code.toUpperCase() === normalizedCode);
  if (!coupon) return { status: 'unavailable', coupon: null };

  const expiresAt = Date.parse(`${coupon.expiresOn}T23:59:59.999+05:30`);
  if (!Number.isFinite(expiresAt) || now.getTime() > expiresAt)
    return { status: 'expired', coupon: null };

  return { status: 'valid', coupon };
}

/** Builds the selectable orders for a model: her packages plus the customized order. */
export function photoOrdersFor(ratePerPhoto: number): BookingPhotoOrder[] {
  const orders: BookingPhotoOrder[] = BOOKING_PACKAGES.map((pack) => ({
    label: pack.label,
    detail: pack.detail,
    photos: pack.photos,
    ratePerPhoto,
    amount: pack.photos * ratePerPhoto,
    custom: false,
  }));

  orders.push({
    label: CUSTOM_ORDER_LABEL,
    detail: CUSTOM_ORDER_DETAIL,
    photos: 0,
    ratePerPhoto,
    amount: 0,
    custom: true,
  });

  return orders;
}

/** Indian rupee amount, e.g. "₹5,500". */
export function formatInr(amount: number): string {
  const decimalPlaces = Number.isInteger(amount) ? 0 : 2;
  return `₹${amount.toLocaleString('en-IN', {
    minimumFractionDigits: decimalPlaces,
    maximumFractionDigits: 2,
  })}`;
}

/** Calculates the 5% service tax, rounded to the nearest paise. */
export function serviceTaxFor(subtotal: number): number {
  return Math.round((subtotal * BOOKING_SERVICE_TAX_RATE + Number.EPSILON) * 100) / 100;
}

function formatBookingDate(iso: string): string {
  const date = new Date(`${iso}T00:00:00Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== iso) return iso;

  return new Intl.DateTimeFormat('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(date);
}

/** Formats the booking details into the prefilled WhatsApp message addressed to the founder. */
export function buildModelBookingMessage(request: BookingRequest): string {
  const { model, order, booking, client } = request;
  const subtotal = request.pricing?.subtotal ?? order.amount;
  const serviceTax = request.pricing?.serviceTax ?? serviceTaxFor(subtotal);
  const discount = request.pricing?.discount ?? 0;
  const total = request.pricing?.total ?? Math.max(0, subtotal + serviceTax - discount);
  const lines = [
    '*New booking request — NeverBeen AI Models*',
    '',
    '*Model*',
    `${model.name}${model.handle ? ` (${model.handle})` : ''}`,
    model.location ? `Based in: ${model.location}` : '',
    model.slug ? `Portfolio: /ai-models/${model.slug}` : '',
    '',
    '*Order*',
    order.custom
      ? `${order.label} — selective charge`
      : `${order.label}${order.detail ? ` — ${order.detail}` : ''}`,
    order.custom
      ? 'Price: quoted by the studio after reviewing the brief'
      : `Rate: ${formatInr(order.ratePerPhoto)} per photograph`,
    order.custom ? '' : `Subtotal: ${formatInr(subtotal)} INR`,
    order.custom
      ? ''
      : `Service tax (${BOOKING_SERVICE_TAX_PERCENT}%): ${formatInr(serviceTax)} INR`,
    order.custom || !request.pricing?.couponCode ? '' : `Coupon: ${request.pricing.couponCode}`,
    order.custom || discount <= 0 ? '' : `Discount: -${formatInr(discount)} INR`,
    order.custom ? '' : `Final total: ${formatInr(total)} INR`,
    '',
    '*Delivery date*',
    formatBookingDate(booking.date),
    '',
    '*Client*',
    `Name: ${client.name}`,
    `Email: ${client.email}`,
    `WhatsApp: ${client.phone}`,
    client.company ? `Company: ${client.company}` : '',
    '',
    '*Booking information*',
    `Project: ${booking.project || 'Not specified'}`,
    `Shoot location: ${booking.location || 'Not specified'}`,
    `Usage / territory: ${booking.usage || 'Not specified'}`,
    `Notes: ${booking.notes || 'None'}`,
    '',
    request.page ? `Sent from: ${request.page}` : '',
    '— sent from the NeverBeen model portfolio',
  ];

  return lines
    .filter((line, index, all) => !(line === '' && all[index - 1] === ''))
    .join('\n')
    .trim();
}

/** Where the request should be filed. */
export interface BookingModelSummary {
  name: string;
  handle: string;
  slug: string;
  location: string;
}

export interface BookingRequest {
  model: BookingModelSummary;
  order: BookingPhotoOrder;
  pricing?: BookingPricing;
  booking: {
    date: string;
    project: string;
    location: string;
    usage: string;
    notes: string;
  };
  client: {
    name: string;
    email: string;
    phone: string;
    company: string;
  };
  page: string;
}

export interface BookingResponse {
  ok: boolean;
  /** True when the request actually reached the studio's WhatsApp. */
  delivered: boolean;
  /** `whatsapp` in production, `outbox` while developing without credentials. */
  channel: string;
  reference: string;
  message: string;
  /** Machine-readable failure reason (`validation`, `not-configured`, `unreachable`, …). */
  error: string;
}

const BOOKING_ENDPOINT = '/api/model-booking';

/**
 * Booking message helpers for the AI model portfolio flow.
 *
 * The current browser flow opens a prefilled WhatsApp chat. `send()` remains available for callers
 * that want to use the deployment's optional server-side `/api/model-booking` endpoint instead.
 */
@Injectable({ providedIn: 'root' })
export class ModelBookingService {
  validateCoupon(code: string, now?: Date): BookingCouponValidation {
    return validateBookingCoupon(code, now);
  }

  /** Opens the same prefilled founder WhatsApp chat as the website's other request forms. */
  createWhatsAppLink(request: BookingRequest): string {
    return founderWhatsAppLink(buildModelBookingMessage(request));
  }

  async send(request: BookingRequest): Promise<BookingResponse> {
    let response: Response;
    try {
      response = await fetch(BOOKING_ENDPOINT, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(request),
      });
    } catch {
      return {
        ok: false,
        delivered: false,
        channel: '',
        reference: '',
        message: 'The booking desk could not be reached. Check your connection and try again.',
        error: 'unreachable',
      };
    }

    const body = (await response.json().catch(() => ({}))) as Record<string, unknown>;
    const fields = Array.isArray(body['fields']) ? body['fields'] : [];

    return {
      ok: response.ok && body['ok'] === true,
      delivered: body['delivered'] === true,
      channel: typeof body['channel'] === 'string' ? body['channel'] : '',
      reference: typeof body['reference'] === 'string' ? body['reference'] : '',
      message:
        typeof body['message'] === 'string' && body['message']
          ? body['message']
          : this.fallbackMessage(String(body['error'] ?? ''), fields.length),
      error: typeof body['error'] === 'string' ? body['error'] : '',
    };
  }

  private fallbackMessage(error: string, fieldCount: number): string {
    switch (error) {
      case 'validation':
        return fieldCount > 0
          ? 'A few details need another look before we can send this.'
          : 'Some booking details are missing.';
      case 'not-configured':
        return 'The studio booking channel is not connected yet. Please try again shortly.';
      case 'delivery-failed':
        return 'WhatsApp could not take the request just now. Please try again in a moment.';
      case 'too-many-requests':
        return 'That was a lot of requests at once. Please try again in a minute.';
      default:
        return 'The booking request could not be sent. Please try again.';
    }
  }
}
