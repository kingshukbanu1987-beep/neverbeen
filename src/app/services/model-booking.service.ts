import { Injectable } from '@angular/core';

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
  return `₹${amount.toLocaleString('en-IN')}`;
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
 * Sends a booking request to the NeverBeen studio.
 *
 * The request goes to the deployment's own `/api/model-booking` endpoint; that server-side handler is
 * the only place that knows the founder's WhatsApp number, so it is never exposed to the browser.
 */
@Injectable({ providedIn: 'root' })
export class ModelBookingService {
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
