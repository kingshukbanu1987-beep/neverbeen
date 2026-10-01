import { pickRandom } from './pick-random';

/** Small deterministic generator (mulberry32) so the tests never flake. */
function seeded(seed: number): () => number {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

describe('pickRandom', () => {
  const source = Array.from({ length: 61 }, (_, i) => i);

  it('returns the requested number of distinct items taken from the source', () => {
    const picked = pickRandom(source, 20, seeded(1));

    expect(picked).toHaveLength(20);
    expect(new Set(picked).size).toBe(20);
    picked.forEach((item) => expect(source).toContain(item));
  });

  it('never modifies the source array', () => {
    const copy = [...source];
    pickRandom(source, 20, seeded(2));

    expect(source).toEqual(copy);
  });

  it('gives a different selection for different random draws', () => {
    const a = pickRandom(source, 20, seeded(3));
    const b = pickRandom(source, 20, seeded(4));

    expect(a).not.toEqual(b);
  });

  it('is repeatable for the same random stream', () => {
    expect(pickRandom(source, 20, seeded(5))).toEqual(pickRandom(source, 20, seeded(5)));
  });

  it('returns everything (shuffled) when more items are requested than exist', () => {
    const picked = pickRandom([1, 2, 3], 20, seeded(6));

    expect([...picked].sort()).toEqual([1, 2, 3]);
  });

  it('returns nothing for a zero or negative count, or an empty source', () => {
    expect(pickRandom(source, 0)).toEqual([]);
    expect(pickRandom(source, -4)).toEqual([]);
    expect(pickRandom([], 20)).toEqual([]);
  });

  it('stays in range even if the random source returns exactly 1', () => {
    const picked = pickRandom([1, 2, 3, 4], 4, () => 1);

    expect([...picked].sort()).toEqual([1, 2, 3, 4]);
  });

  it('gives every item a fair chance of being drawn', () => {
    const random = seeded(7);
    const counts = new Array(10).fill(0);

    for (let run = 0; run < 4000; run++) {
      pickRandom(Array.from({ length: 10 }, (_, i) => i), 2, random).forEach((n) => counts[n]++);
    }

    // Expected 800 per item; allow a generous margin so only a clearly biased shuffle fails.
    counts.forEach((count) => {
      expect(count).toBeGreaterThan(680);
      expect(count).toBeLessThan(920);
    });
  });
});
