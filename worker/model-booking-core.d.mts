/**
 * Types for `model-booking-core.mjs`, the booking logic shared by the Cloudflare Worker
 * (`worker/index.ts`), the local development API (`scripts/dev-booking-api.mjs`) and the tests.
 */

export declare const BOOKING_ENDPOINT: string;
export declare const GRAPH_API_VERSION: string;
export declare const MAX_BODY_BYTES: number;

export interface BookingTerm {
  term: string;
  detail: string;
  usd: number;
}

/** What the Rent form posts to the endpoint. */
export interface BookingRequestPayload {
  model: { name: string; handle?: string; slug?: string; location?: string };
  term: BookingTerm;
  booking: {
    date: string;
    project?: string;
    location?: string;
    usage?: string;
    notes?: string;
  };
  client: { name: string; email: string; phone: string; company?: string };
  page?: string;
}

export interface NormalisedBooking {
  reference: string;
  requestedAt: string;
  model: { name: string; handle: string; slug: string; location: string };
  term: BookingTerm;
  shootDate: string;
  client: { name: string; email: string; phone: string; company: string };
  brief: { location: string; project: string; usage: string; notes: string };
  page: string;
}

export interface BookingResultBody {
  ok: boolean;
  delivered?: boolean;
  channel?: string;
  reference?: string;
  message?: string;
  error?: string;
  fields?: { field: string; message: string }[];
}

export interface BookingHandlerOptions {
  method?: string;
  payload?: unknown;
  env?: Record<string, string | undefined>;
  fetchImpl?: typeof fetch;
  now?: Date;
  outbox?: ((message: string) => unknown) | null;
}

export declare function formatShootDate(iso: string): string;
export declare function formatUsd(amount: number): string;
export declare function createBookingReference(): string;
export declare function validateBookingRequest(
  payload: unknown,
  now?: Date,
): { errors: Record<string, string>; booking: NormalisedBooking | null };
export declare function buildBookingMessage(booking: NormalisedBooking): string;
export declare function handleModelBookingRequest(
  options?: BookingHandlerOptions,
): Promise<{ status: number; body: BookingResultBody }>;
