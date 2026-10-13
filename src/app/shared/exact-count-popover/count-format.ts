/**
 * Compact and exact readouts for the big engagement counters (seen / likes / comments / shares).
 *
 * A long total is unreadable at a glance, so every counter writes its compact form — 1K, 1.4K,
 * 21.4K, 10.78M, 1.7B, 1.47T — while the exact figure stays one click away in the exact-count
 * pop-up (`ExactCountPopover`). Both readouts come from here, so a counter and its pop-up can
 * never disagree.
 */

/** The steps a compact count moves through: thousands, millions, billions, trillions. */
const COUNT_UNITS: ReadonlyArray<{ readonly factor: number; readonly suffix: string }> = [
  { factor: 1_000, suffix: 'K' },
  { factor: 1_000_000, suffix: 'M' },
  { factor: 1_000_000_000, suffix: 'B' },
  { factor: 1_000_000_000_000, suffix: 'T' },
];

/** At most two decimals are kept — 10.78M, 21.4K, 1.47T — and trailing zeros are dropped. */
function round(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * The compact form of a count: 999 · 1K · 1.4K · 21.4K · 10.78M · 1.7B · 1.47T.
 *
 * Rounding may carry a count into the next unit (999,999 reads as `1M`, not `1000K`), and a count
 * that needs no decimals keeps none: 1004 → `1K`, 1,400 → `1.4K`, 1,470,000 → `1.47M`.
 */
export function compactCount(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return '0';

  const count = Math.floor(value);
  if (count < COUNT_UNITS[0].factor) return String(count);

  let unit = 0;
  while (unit < COUNT_UNITS.length - 1 && count >= COUNT_UNITS[unit + 1].factor) unit += 1;

  let scaled = round(count / COUNT_UNITS[unit].factor);
  if (scaled >= 1000 && unit < COUNT_UNITS.length - 1) {
    unit += 1;
    scaled = round(count / COUNT_UNITS[unit].factor);
  }

  return `${scaled}${COUNT_UNITS[unit].suffix}`;
}

/**
 * The exact figure, grouped for reading: 21400 → `21,400`, 1,470,000,000,000 →
 * `1,470,000,000,000`. This is the number the exact-count pop-up shows.
 */
export function exactCount(value: number): string {
  if (!Number.isFinite(value)) return '0';
  return Math.round(value).toLocaleString('en-US');
}
