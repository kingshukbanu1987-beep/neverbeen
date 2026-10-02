/**
 * Draws a random sample of `count` distinct entries from `items`.
 *
 * A Fisher–Yates shuffle guarantees each entry is equally likely to appear and
 * that no entry is repeated inside one sample. The source array is never
 * mutated, so callers can safely re-sample the same collection on every page
 * load.
 *
 * When `count` is larger than the pool, the whole pool is returned.
 */
export function sampleWithoutReplacement<T>(items: readonly T[], count: number): T[] {
  const pool = [...items];

  for (let i = pool.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }

  return pool.slice(0, Math.max(0, Math.min(count, pool.length)));
}
