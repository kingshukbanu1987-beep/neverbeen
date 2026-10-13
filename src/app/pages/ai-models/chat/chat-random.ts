/**
 * The deterministic randomness behind her voice, her photographs and her summary: the same seed
 * always gives the same choice, so a conversation reads the same way twice and the tests can pin it
 * down.
 */

/** A small, stable string hash — FNV-ish arithmetic, no dependencies. */
export function hashSeed(seed: string): number {
  let value = 0;
  for (const character of seed) value = (value * 31 + character.charCodeAt(0)) % 1000003;
  return value;
}

/** One of `options`, chosen by the seed. */
export function seededPick<T>(options: readonly T[], seed: string): T {
  return options[hashSeed(seed) % options.length];
}

/** True for the share of seeds the probability covers — the deterministic coin. */
export function seededRoll(seed: string, probability: number): boolean {
  return (hashSeed(seed) % 1000) / 1000 < probability;
}

/** A number inside `[low, high]` chosen by the seed. */
export function seededBetween(seed: string, low: number, high: number): number {
  return low + (hashSeed(seed) % Math.max(1, Math.round(high - low)));
}

export function clamp(value: number, low = 0, high = 1): number {
  return Math.min(high, Math.max(low, value));
}
