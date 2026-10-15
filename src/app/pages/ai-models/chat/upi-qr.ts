import { encode } from 'uqr';

/**
 * Geometry for the laptop/desktop UPI payment QR code, drawn as inline SVG by the payment page.
 *
 * Data modules are emitted as one path of row runs (rendered with crisp edges), the three finder
 * patterns are returned separately so they can be drawn as rounded "eyes", and a square at the
 * centre is cleared for the chosen app's logo. Error-correction level Q recovers about 25% damage,
 * far more than the ~4% of the symbol the logo covers.
 */

/** Light modules around the symbol; four is the QR specification's minimum quiet zone. */
export const UPI_QR_QUIET_ZONE = 4;

/** The cleared logo square spans about a fifth of the symbol's width. */
const LOGO_WIDTH_RATIO = 0.2;
const FINDER_SIZE = 7;

export interface UpiQrPoint {
  readonly x: number;
  readonly y: number;
}

export interface UpiQrCode {
  /** The exact text the symbol encodes. */
  readonly payload: string;
  /** QR version (1–40) chosen for the payload. */
  readonly version: number;
  /** Symbol width in modules, without the quiet zone. */
  readonly size: number;
  /** Drawing width including the quiet zone on both sides; the drawing is square. */
  readonly extent: number;
  readonly viewBox: string;
  /** Every dark module outside the finder patterns and the cleared logo square. */
  readonly modulesPath: string;
  /** Top-left corners (drawing units) of the three 7×7 finder patterns. */
  readonly finders: readonly UpiQrPoint[];
  /** The cleared centre square (drawing units) that carries the app logo. */
  readonly logo: UpiQrPoint & { readonly size: number };
  /** The logo badge's width as a percentage of the rendered code, just inside the clearing. */
  readonly logoPercent: number;
}

export function upiQrCode(payload: string): UpiQrCode {
  const qr = encode(payload, { ecc: 'Q', border: 0 });
  const size = qr.size;
  const quiet = UPI_QR_QUIET_ZONE;

  // Keep the clearing exactly centred: its width must share the symbol's parity.
  let logoSize = Math.ceil(size * LOGO_WIDTH_RATIO);
  if ((size - logoSize) % 2 !== 0) logoSize += 1;
  const logoStart = (size - logoSize) / 2;
  const logoEnd = logoStart + logoSize;

  const inFinder = (x: number, y: number) =>
    (x < FINDER_SIZE && y < FINDER_SIZE) ||
    (x >= size - FINDER_SIZE && y < FINDER_SIZE) ||
    (x < FINDER_SIZE && y >= size - FINDER_SIZE);
  const inLogo = (x: number, y: number) =>
    x >= logoStart && x < logoEnd && y >= logoStart && y < logoEnd;
  const drawn = (x: number, y: number) => qr.data[y][x] && !inFinder(x, y) && !inLogo(x, y);

  const runs: string[] = [];
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size;) {
      if (!drawn(x, y)) {
        x++;
        continue;
      }
      let run = 1;
      while (x + run < size && drawn(x + run, y)) run++;
      runs.push(`M${x + quiet} ${y + quiet}h${run}v1h-${run}z`);
      x += run;
    }
  }

  const extent = size + quiet * 2;
  return {
    payload,
    version: qr.version,
    size,
    extent,
    viewBox: `0 0 ${extent} ${extent}`,
    modulesPath: runs.join(''),
    finders: [
      { x: quiet, y: quiet },
      { x: quiet + size - FINDER_SIZE, y: quiet },
      { x: quiet, y: quiet + size - FINDER_SIZE },
    ],
    logo: { x: quiet + logoStart, y: quiet + logoStart, size: logoSize },
    logoPercent: ((logoSize - 0.8) / extent) * 100,
  };
}
