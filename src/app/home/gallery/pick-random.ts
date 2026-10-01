/**
 * Draws up to `count` distinct items from `source`, in random order.
 *
 * Uses a partial Fisher–Yates shuffle, so every item has the same chance of being drawn
 * (unlike `array.sort(() => Math.random() - 0.5)`, which is biased). The `source` array is
 * never modified. Asking for more items than exist simply returns all of them, shuffled.
 *
 * @param random Returns a number in `[0, 1)`; defaults to `Math.random` and is injectable for tests.
 */
export function pickRandom<T>(
  source: readonly T[],
  count: number,
  random: () => number = Math.random,
): T[] {
  const pool = [...source];
  const size = Math.max(0, Math.min(Math.floor(count), pool.length));

  for (let i = 0; i < size; i++) {
    // Clamp so a (non-conforming) random() of exactly 1 can never index past the end.
    const j = Math.min(pool.length - 1, i + Math.floor(random() * (pool.length - i)));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }

  return pool.slice(0, size);
}
