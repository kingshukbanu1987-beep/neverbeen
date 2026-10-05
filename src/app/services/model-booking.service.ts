import { Injectable } from '@angular/core';

/** One priced booking term, as published on the model's portfolio. */
export interface BookingTerm {
  term: string;
  detail: string;
  usd: number;
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
  term: BookingTerm;
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
