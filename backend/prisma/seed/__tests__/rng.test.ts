import { describe, it, expect } from 'vitest';
import { SeededRandom, idFromCounter } from '../rng.js';

describe('SeededRandom', () => {
  it('produces an identical sequence for the same seed', () => {
    const a = new SeededRandom(42);
    const b = new SeededRandom(42);

    const sequenceA = Array.from({ length: 50 }, () => a.next());
    const sequenceB = Array.from({ length: 50 }, () => b.next());

    expect(sequenceA).toEqual(sequenceB);
  });

  it('produces a different sequence for a different seed', () => {
    const a = new SeededRandom(1);
    const b = new SeededRandom(2);

    const sequenceA = Array.from({ length: 20 }, () => a.next());
    const sequenceB = Array.from({ length: 20 }, () => b.next());

    expect(sequenceA).not.toEqual(sequenceB);
  });

  it('next() always stays in [0, 1)', () => {
    const rng = new SeededRandom(7);
    for (let i = 0; i < 1000; i++) {
      const value = rng.next();
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });

  it('int(min, max) is inclusive on both ends and never out of range', () => {
    const rng = new SeededRandom(99);
    const seen = new Set<number>();
    for (let i = 0; i < 2000; i++) {
      const value = rng.int(1, 5);
      expect(value).toBeGreaterThanOrEqual(1);
      expect(value).toBeLessThanOrEqual(5);
      seen.add(value);
    }
    // With 2000 draws over a range of 5, every value should have appeared.
    expect(seen).toEqual(new Set([1, 2, 3, 4, 5]));
  });

  it('weightedPick respects zero-weight exclusion and only returns provided values', () => {
    const rng = new SeededRandom(3);
    const options = [
      { value: 'a', weight: 100 },
      { value: 'b', weight: 0 },
    ];
    for (let i = 0; i < 200; i++) {
      expect(rng.weightedPick(options)).toBe('a');
    }
  });

  it('chance(0) is always false and chance(1) is always true', () => {
    const rng = new SeededRandom(11);
    for (let i = 0; i < 100; i++) {
      expect(rng.chance(0)).toBe(false);
    }
    for (let i = 0; i < 100; i++) {
      expect(rng.chance(1)).toBe(true);
    }
  });
});

describe('idFromCounter', () => {
  it('is deterministic for the same (seed, counter)', () => {
    expect(idFromCounter(123, 0)).toBe(idFromCounter(123, 0));
    expect(idFromCounter(123, 999)).toBe(idFromCounter(123, 999));
  });

  it('never collides across a large range of counters for one seed', () => {
    const ids = new Set<string>();
    for (let i = 0; i < 20_000; i++) {
      ids.add(idFromCounter(2026, i));
    }
    expect(ids.size).toBe(20_000);
  });

  it('produces syntactically valid v4 UUIDs', () => {
    const uuidV4Pattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
    for (let i = 0; i < 50; i++) {
      expect(idFromCounter(1, i)).toMatch(uuidV4Pattern);
    }
  });
});
