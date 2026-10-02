import { afterEach, vi } from 'vitest';
import { sampleWithoutReplacement } from './random-sample';

describe('sampleWithoutReplacement', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns the requested number of distinct entries from the pool', () => {
    const pool = Array.from({ length: 61 }, (_, index) => `photo-${index}`);

    const sample = sampleWithoutReplacement(pool, 20);

    expect(sample.length).toBe(20);
    expect(new Set(sample).size).toBe(20);
    for (const entry of sample) {
      expect(pool).toContain(entry);
    }
  });

  it('leaves the source collection untouched', () => {
    const pool = ['a', 'b', 'c', 'd'];

    sampleWithoutReplacement(pool, 2);

    expect(pool).toEqual(['a', 'b', 'c', 'd']);
  });

  it('returns the whole pool when fewer entries exist than requested', () => {
    const sample = sampleWithoutReplacement(['a', 'b'], 20);

    expect(sample.sort()).toEqual(['a', 'b']);
  });

  it('returns nothing for a non-positive count', () => {
    expect(sampleWithoutReplacement(['a', 'b'], 0)).toEqual([]);
    expect(sampleWithoutReplacement(['a', 'b'], -3)).toEqual([]);
  });

  it('reshuffles the order on every call', () => {
    const pool = Array.from({ length: 61 }, (_, index) => `photo-${index}`);

    // Math.random() leaning low versus leaning high walks the Fisher–Yates
    // shuffle down opposite ends of the pool, producing different samples.
    vi.spyOn(Math, 'random').mockReturnValue(0);
    const first = sampleWithoutReplacement(pool, 20);
    vi.restoreAllMocks();
    vi.spyOn(Math, 'random').mockReturnValue(0.999);
    const second = sampleWithoutReplacement(pool, 20);

    expect(first).not.toEqual(second);
  });
});
