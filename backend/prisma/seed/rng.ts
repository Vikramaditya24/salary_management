/**
 * Deterministic pseudo-random number generator (mulberry32) plus a handful
 * of helpers built on it. Given the same numeric seed, `next()` produces
 * the exact same sequence of floats every time, on any machine — that's
 * what makes the whole seed script reproducible without needing to store
 * (or diff) 10,000 generated rows anywhere.
 *
 * Deliberately not `Math.random()` (not seedable, not reproducible) and
 * not a third-party PRNG package (no dependency worth adding for ~30 lines
 * of well-known, public-domain algorithm).
 */
export class SeededRandom {
  private state: number;

  constructor(seed: number) {
    // Ensure a non-zero 32-bit starting state regardless of the seed passed
    // in.
    this.state = seed >>> 0 || 0x9e3779b9;
  }

  /** Next float in [0, 1). */
  next(): number {
    this.state |= 0;
    this.state = (this.state + 0x6d2b79f5) | 0;
    let t = this.state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /** Next integer in [min, max], inclusive on both ends. */
  int(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }

  /** Uniform pick from a non-empty array. */
  pick<T>(items: readonly T[]): T {
    if (items.length === 0) {
      throw new Error('SeededRandom.pick: items must be non-empty');
    }
    const value = items[this.int(0, items.length - 1)];
    if (value === undefined) {
      throw new Error('SeededRandom.pick: unreachable index');
    }
    return value;
  }

  /** Weighted pick: `weight` must be a positive number per item. */
  weightedPick<T>(items: ReadonlyArray<{ value: T; weight: number }>): T {
    const total = items.reduce((sum, item) => sum + item.weight, 0);
    let roll = this.next() * total;
    for (const item of items) {
      roll -= item.weight;
      if (roll <= 0) return item.value;
    }
    // Floating-point edge case: fall back to the last item.
    const last = items[items.length - 1];
    if (!last) throw new Error('SeededRandom.weightedPick: items must be non-empty');
    return last.value;
  }

  /** true with the given probability (0..1). */
  chance(probability: number): boolean {
    return this.next() < probability;
  }
}

function bytesToUuid(bytes: readonly number[]): string {
  const hex = bytes.map((b) => b.toString(16).padStart(2, '0')).join('');
  return [hex.slice(0, 8), hex.slice(8, 12), hex.slice(12, 16), hex.slice(16, 20), hex.slice(20, 32)].join(
    '-',
  );
}

/**
 * Deterministic, collision-free, RFC-4122-shaped v4 UUID.
 *
 * The low 48 bits directly encode `counter`, so two different counters can
 * never produce the same id — uniqueness is guaranteed by construction, not
 * by hoping a PRNG never repeats across ~40,000 calls. The remaining bits
 * are `seed`+`counter`-derived pseudo-randomness purely so ids don't look
 * like a bare incrementing sequence. Same (seed, counter) always produces
 * the same id.
 */
export function idFromCounter(seed: number, counter: number): string {
  const mixer = new SeededRandom((seed ^ Math.imul(counter + 1, 0x9e3779b1)) >>> 0);
  const bytes: number[] = [];
  for (let i = 0; i < 10; i++) {
    bytes.push(mixer.int(0, 255));
  }

  const counterBig = BigInt(counter);
  for (let i = 5; i >= 0; i--) {
    bytes.push(Number((counterBig >> BigInt(8 * i)) & 0xffn));
  }

  bytes[6] = (bytes[6]! & 0x0f) | 0x40; // version 4
  bytes[8] = (bytes[8]! & 0x3f) | 0x80; // variant 10

  return bytesToUuid(bytes);
}
