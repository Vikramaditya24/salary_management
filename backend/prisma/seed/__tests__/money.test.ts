import { describe, it, expect } from 'vitest';
import { minorUnitsToDecimalString, roundToMinorUnits } from '../money.js';

describe('roundToMinorUnits', () => {
  it('rounds to whole cents for a 2-decimal currency', () => {
    expect(roundToMinorUnits(1234.5678, 2)).toBe(123457);
  });

  it('rounds to a whole unit for a 0-decimal currency (e.g. JPY)', () => {
    expect(roundToMinorUnits(1234.5678, 0)).toBe(1235);
  });

  it('always returns an integer', () => {
    expect(Number.isInteger(roundToMinorUnits(99.995, 2))).toBe(true);
  });
});

describe('minorUnitsToDecimalString', () => {
  it('formats a 2-decimal currency correctly', () => {
    expect(minorUnitsToDecimalString(12345678, 2)).toBe('123456.78');
  });

  it('pads small fractional parts with a leading zero', () => {
    expect(minorUnitsToDecimalString(100005, 2)).toBe('1000.05');
  });

  it('formats a 0-decimal currency with no decimal point', () => {
    expect(minorUnitsToDecimalString(1235, 0)).toBe('1235');
  });

  it('round-trips through roundToMinorUnits without float drift', () => {
    const minorUnit = 2;
    const amount = 999999.99;
    const minorUnits = roundToMinorUnits(amount, minorUnit);
    expect(minorUnitsToDecimalString(minorUnits, minorUnit)).toBe('999999.99');
  });

  it('throws on a non-integer input rather than silently truncating', () => {
    expect(() => minorUnitsToDecimalString(100.5, 2)).toThrow();
  });
});
