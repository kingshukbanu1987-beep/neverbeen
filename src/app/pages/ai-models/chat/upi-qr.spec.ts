import jsQR from 'jsqr';
import { describe, expect, it } from 'vitest';
import { DesktopPaymentRequest, upiQrPayload } from './premium-payment';
import { UPI_QR_QUIET_ZONE, UpiQrCode, upiQrCode } from './upi-qr';

const RUN = /M(\d+) (\d+)h(\d+)v1h-\3z/g;

function runs(qr: UpiQrCode): { x: number; y: number; width: number }[] {
  return Array.from(qr.modulesPath.matchAll(RUN), ([, x, y, width]) => ({
    x: Number(x),
    y: Number(y),
    width: Number(width),
  }));
}

/**
 * Paints the drawing the payment page renders — module runs, finder patterns and the quiet zone —
 * at `scale` pixels per module, as RGBA for a decoder. `logo` decides what the centre clearing
 * holds: nothing (white), or the worst case of a logo that a camera reads as solid dark.
 */
function rasterize(qr: UpiQrCode, scale = 4, logo: 'clear' | 'dark' = 'clear') {
  const dark = new Uint8Array(qr.extent * qr.extent);
  const paint = (x: number, y: number, width: number, height: number, value: 0 | 1) => {
    for (let row = y; row < y + height; row++) {
      dark.fill(value, row * qr.extent + x, row * qr.extent + x + width);
    }
  };
  for (const run of runs(qr)) paint(run.x, run.y, run.width, 1, 1);
  for (const { x, y } of qr.finders) {
    paint(x, y, 7, 7, 1);
    paint(x + 1, y + 1, 5, 5, 0);
    paint(x + 2, y + 2, 3, 3, 1);
  }
  if (logo === 'dark') paint(qr.logo.x, qr.logo.y, qr.logo.size, qr.logo.size, 1);

  const width = qr.extent * scale;
  const rgba = new Uint8ClampedArray(width * width * 4).fill(255);
  for (let y = 0; y < width; y++) {
    for (let x = 0; x < width; x++) {
      if (!dark[Math.floor(y / scale) * qr.extent + Math.floor(x / scale)]) continue;
      const offset = (y * width + x) * 4;
      rgba[offset] = rgba[offset + 1] = rgba[offset + 2] = 11;
    }
  }
  return { rgba, width };
}

function decode(qr: UpiQrCode, scale = 4, logo: 'clear' | 'dark' = 'clear'): string | undefined {
  const { rgba, width } = rasterize(qr, scale, logo);
  return jsQR(rgba, width, width, { inversionAttempts: 'dontInvert' })?.data;
}

const payments: readonly DesktopPaymentRequest[] = [
  { modelSlug: 'nourhan-durrani', amount: 124.95, method: 'gpay', payerUpiId: 'ab@paytm' },
  {
    modelSlug: 'alisha-bhattacharya',
    amount: 1873.2,
    method: 'phonepe',
    payerUpiId: '9876543210@ybl',
  },
  {
    // The longest possible note: it is cut at 80 characters.
    modelSlug: 'fatima-sana-hussaini',
    amount: 437.85,
    method: 'phonepe',
    payerUpiId: `${'first.last-name'.repeat(4)}@okhdfcbank`,
  },
];

describe('the laptop/desktop UPI payment QR code', () => {
  it.each(payments)(
    'reads back as the exact UPI link for $method ₹$amount with a standard decoder',
    (payment) => {
      const payload = upiQrPayload(payment);
      const qr = upiQrCode(payload);
      expect(qr.payload).toBe(payload);
      expect(decode(qr)).toBe(payload);
      // Small on-screen sizes still resolve at three pixels per module.
      expect(decode(qr, 3)).toBe(payload);
    },
  );

  it.each(payments)(
    'still reads for $method ₹$amount if the centre logo looks solid dark to a camera',
    (payment) => {
      const payload = upiQrPayload(payment);
      expect(decode(upiQrCode(payload), 4, 'dark')).toBe(payload);
    },
  );

  it('stays a compact symbol even for the longest payment link', () => {
    for (const payment of payments) {
      const qr = upiQrCode(upiQrPayload(payment));
      expect(qr.size).toBe(qr.version * 4 + 17);
      expect(qr.size).toBeLessThanOrEqual(69);
    }
  });

  it('draws a four-module quiet zone, three corner finders and a centred logo clearing', () => {
    const qr = upiQrCode(upiQrPayload(payments[0]));
    const quiet = UPI_QR_QUIET_ZONE;
    expect(quiet).toBe(4);
    expect(qr.extent).toBe(qr.size + quiet * 2);
    expect(qr.viewBox).toBe(`0 0 ${qr.extent} ${qr.extent}`);
    expect(qr.finders).toEqual([
      { x: quiet, y: quiet },
      { x: quiet + qr.size - 7, y: quiet },
      { x: quiet, y: quiet + qr.size - 7 },
    ]);
    // The clearing is exactly centred and spans about a fifth of the symbol.
    expect(qr.logo.x * 2 + qr.logo.size).toBe(qr.extent);
    expect(qr.logo.y).toBe(qr.logo.x);
    expect(qr.logo.size / qr.size).toBeGreaterThan(0.18);
    expect(qr.logo.size / qr.size).toBeLessThan(0.25);
    expect(qr.logoPercent).toBeCloseTo(((qr.logo.size - 0.8) / qr.extent) * 100);

    const inside = (x: number, y: number, left: number, top: number, size: number) =>
      x >= left && x < left + size && y >= top && y < top + size;
    for (const run of runs(qr)) {
      expect(run.width).toBeGreaterThan(0);
      for (let x = run.x; x < run.x + run.width; x++) {
        // Nothing is drawn in the quiet zone, the finders or the logo clearing.
        expect(inside(x, run.y, quiet, quiet, qr.size)).toBe(true);
        expect(inside(x, run.y, qr.logo.x, qr.logo.y, qr.logo.size)).toBe(false);
        for (const finder of qr.finders) {
          expect(inside(x, run.y, finder.x, finder.y, 7)).toBe(false);
        }
      }
    }
  });

  it('draws the same code for the same payment', () => {
    const payload = upiQrPayload(payments[1]);
    expect(upiQrCode(payload)).toEqual(upiQrCode(payload));
  });
});
