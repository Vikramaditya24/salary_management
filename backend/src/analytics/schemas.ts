import { z } from 'zod';
import { parseWith } from '../lib/validation.js';
import { DEPARTMENTS, type DepartmentValue } from '../employees/constants.js';

/*
 * Only zod APIs that are stable across zod 3 and 4 are used here (no
 * `.default()`) — see employees/schemas.ts for why.
 */

// Same shape as employees/schemas.ts's countryCodeSchema: a single value
// here (not a list), since salary insights are computed for one country at
// a time, not "any of these countries".
const countryCodeSchema = z
  .string()
  .trim()
  .regex(/^[A-Za-z]{2}$/, 'country must be a 2-letter ISO 3166-1 alpha-2 code.')
  .transform((value) => value.toUpperCase());

const departmentSchema = z.enum(DEPARTMENTS);

export interface SalaryInsightsQuery {
  /** ISO 3166-1 alpha-2, upper-cased. Existence against the Country table is checked by the service. */
  country: string | undefined;
  department: DepartmentValue | undefined;
}

// `.strict()` is deliberate: a misspelled filter (`contry=DE`) that was
// silently ignored would show HR unfiltered figures that look filtered —
// see employees/schemas.ts's listQuerySchema.
const salaryInsightsQuerySchema = z
  .object({
    country: countryCodeSchema.optional(),
    department: departmentSchema.optional(),
  })
  .strict();

/**
 * Turns Fastify's raw query object into what the schema expects: empty /
 * whitespace-only values are treated as "not provided" rather than
 * validation errors, and a repeated param (`?country=DE&country=US`) is
 * passed through as an array so validation rejects it instead of silently
 * picking one — mirrors normalizeListQuery in employees/schemas.ts.
 */
function normalizeQuery(raw: unknown): Record<string, unknown> {
  if (typeof raw !== 'object' || raw === null) return {};

  const entries: [string, unknown][] = [];
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (trimmed !== '') entries.push([key, trimmed]);
    } else {
      entries.push([key, value]);
    }
  }
  // Object.fromEntries defines own properties, so a hostile key such as
  // `__proto__` cannot alter the prototype of the resulting object.
  return Object.fromEntries(entries);
}

export function parseSalaryInsightsQuery(raw: unknown): SalaryInsightsQuery {
  const parsed = parseWith(salaryInsightsQuerySchema, normalizeQuery(raw));
  return { country: parsed.country, department: parsed.department };
}
