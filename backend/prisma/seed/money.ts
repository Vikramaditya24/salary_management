/**
 * Money is generated and stored as an integer number of "minor units"
 * (e.g. cents for USD, whole yen for JPY, since JPY's minorUnit is 0) and
 * only ever turned into a decimal *string* for the final amount — never a
 * JS float. That string is what gets sent to Prisma's `Decimal` field, so
 * the value that reaches Postgres' `numeric` column is exact end to end.
 *
 * (Generating a *target* amount along the way necessarily involves a
 * float — multiplying a base salary by department/country/variance
 * factors and a currency's exchange rate is an approximation by nature,
 * for synthetic data. What matters is that the approximation is rounded
 * to a whole minor unit once, immediately, and never carried further as a
 * float — see `roundToMinorUnits`.)
 */

/** Round a floating-point amount to a whole number of minor units. */
export function roundToMinorUnits(amount: number, minorUnit: number): number {
  const scale = 10 ** minorUnit;
  return Math.round(amount * scale);
}

/** Format an integer minor-unit amount as an exact decimal string. */
export function minorUnitsToDecimalString(minorUnits: number, minorUnit: number): string {
  if (!Number.isInteger(minorUnits)) {
    throw new Error(`minorUnitsToDecimalString: minorUnits must be an integer, got ${minorUnits}`);
  }
  if (minorUnit === 0) {
    return String(minorUnits);
  }
  const scale = 10 ** minorUnit;
  const wholePart = Math.trunc(minorUnits / scale);
  const fractionPart = Math.abs(minorUnits % scale)
    .toString()
    .padStart(minorUnit, '0');
  return `${wholePart}.${fractionPart}`;
}
