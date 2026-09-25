import { z } from 'zod';
import { parseWith } from '../lib/validation.js';
import {
  DEPARTMENTS,
  EMPLOYMENT_STATUSES,
  LIST_DEFAULTS,
  MAX_SEARCH_LENGTH,
  MAX_SEARCH_TOKENS,
  SORT_FIELDS,
  SORT_ORDERS,
  STATUS_FILTERS,
  type DepartmentValue,
  type SortField,
  type SortOrder,
  type StatusFilter,
} from './constants.js';

/*
 * Only zod APIs that are stable across zod 3 and 4 are used here (no
 * `.default()`, whose semantics changed between majors; defaults are applied
 * in plain code below instead).
 */

// ---------------------------------------------------------------------------
// Shared field schemas
// ---------------------------------------------------------------------------

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ISO_DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
const EARLIEST_HIRE_DATE = '1900-01-01';

function isRealCalendarDate(value: string): boolean {
  const match = ISO_DATE_RE.exec(value);
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
  );
}

const requiredText = (label: string, max: number) =>
  z
    .string()
    .trim()
    .min(1, `${label} must not be blank.`)
    .max(max, `${label} must be at most ${max} characters.`);

// Emails are stored lower-cased: the DB unique index is case-sensitive, so
// normalising here is what makes "A@x.com" and "a@x.com" the same employee.
const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(1, 'email must not be blank.')
  .max(160, 'email must be at most 160 characters.')
  .regex(EMAIL_RE, 'email must be a valid email address.');

const countryCodeSchema = z
  .string()
  .trim()
  .regex(/^[A-Za-z]{2}$/, 'countryCode must be a 2-letter ISO 3166-1 alpha-2 code.')
  .transform((value) => value.toUpperCase());

const hireDateSchema = z
  .string()
  .regex(ISO_DATE_RE, 'hireDate must be a date in YYYY-MM-DD format.')
  .refine(isRealCalendarDate, 'hireDate must be a valid calendar date.')
  .refine((value) => value >= EARLIEST_HIRE_DATE, 'hireDate must be on or after 1900-01-01.');

const departmentSchema = z.enum(DEPARTMENTS);

// ---------------------------------------------------------------------------
// Path params
// ---------------------------------------------------------------------------

const employeeParamsSchema = z
  .object({ id: z.string().regex(UUID_RE, 'id must be a valid UUID.') })
  .strict();

export function parseEmployeeParams(raw: unknown): { id: string } {
  return parseWith(employeeParamsSchema, raw);
}

// ---------------------------------------------------------------------------
// Request bodies
// ---------------------------------------------------------------------------

// employeeNumber, id, employmentStatus (on create), createdAt/updatedAt are
// intentionally absent: `.strict()` rejects them, which is what prevents a
// client from setting server-owned fields (mass assignment).
export const createEmployeeBodySchema = z
  .object({
    fullName: requiredText('fullName', 120),
    email: emailSchema,
    countryCode: countryCodeSchema,
    department: departmentSchema,
    jobTitle: requiredText('jobTitle', 80),
    hireDate: hireDateSchema,
  })
  .strict();

export const updateEmployeeBodySchema = z
  .object({
    fullName: requiredText('fullName', 120).optional(),
    email: emailSchema.optional(),
    countryCode: countryCodeSchema.optional(),
    department: departmentSchema.optional(),
    jobTitle: requiredText('jobTitle', 80).optional(),
    hireDate: hireDateSchema.optional(),
    employmentStatus: z.enum(EMPLOYMENT_STATUSES).optional(),
  })
  .strict()
  .refine((body) => Object.keys(body).length > 0, 'Provide at least one field to update.');

export type CreateEmployeeInput = z.output<typeof createEmployeeBodySchema>;
export type UpdateEmployeeInput = z.output<typeof updateEmployeeBodySchema>;

export function parseCreateEmployeeBody(raw: unknown): CreateEmployeeInput {
  return parseWith(createEmployeeBodySchema, raw);
}

export function parseUpdateEmployeeBody(raw: unknown): UpdateEmployeeInput {
  return parseWith(updateEmployeeBodySchema, raw);
}

// ---------------------------------------------------------------------------
// GET /employees query string
// ---------------------------------------------------------------------------

export interface ListEmployeesQuery {
  page: number;
  pageSize: number;
  /** Raw search text (already trimmed); tokenised by the query builder. */
  search: string | undefined;
  countries: string[] | undefined;
  departments: DepartmentValue[] | undefined;
  jobTitles: string[] | undefined;
  status: StatusFilter;
  sortBy: SortField;
  sortOrder: SortOrder;
}

const boundedInt = (label: string, min: number, max: number) =>
  z
    .string()
    .regex(/^\d{1,9}$/, `${label} must be a whole number.`)
    .transform(Number)
    .pipe(
      z
        .number()
        .min(min, `${label} must be at least ${min}.`)
        .max(max, `${label} must be at most ${max}.`),
    );

const searchSchema = z
  .string()
  .max(MAX_SEARCH_LENGTH, `q must be at most ${MAX_SEARCH_LENGTH} characters.`)
  .refine(
    (value) => value.split(/\s+/).filter(Boolean).length <= MAX_SEARCH_TOKENS,
    `q may contain at most ${MAX_SEARCH_TOKENS} words.`,
  );

// `.strict()` is deliberate: a misspelled filter (`countrey=DE`) that was
// silently ignored would show HR an unfiltered list that looks filtered.
const listQuerySchema = z
  .object({
    page: boundedInt('page', 1, LIST_DEFAULTS.maxPage).optional(),
    pageSize: boundedInt('pageSize', 1, LIST_DEFAULTS.maxPageSize).optional(),
    q: searchSchema.optional(),
    country: z.array(countryCodeSchema).max(20, 'At most 20 countries.').optional(),
    department: z.array(departmentSchema).max(DEPARTMENTS.length).optional(),
    jobTitle: z
      .array(z.string().max(80, 'jobTitle must be at most 80 characters.'))
      .max(20, 'At most 20 job titles.')
      .optional(),
    status: z.enum(STATUS_FILTERS).optional(),
    sortBy: z.enum(SORT_FIELDS).optional(),
    sortOrder: z.enum(SORT_ORDERS).optional(),
  })
  .strict();

/** Query keys that accept several values, and which of them also accept comma lists. */
const MULTI_VALUE_KEYS = ['country', 'department', 'jobTitle'];
const COMMA_SEPARATED_KEYS = ['country', 'department'];

/**
 * Turns Fastify's raw query object into what the schema expects:
 *  - empty / whitespace-only values are treated as "not provided" (a cleared
 *    search box sends `q=`), rather than as validation errors;
 *  - `country`, `department` and `jobTitle` may repeat (`?country=DE&country=US`),
 *    and `country`/`department` also accept `?country=DE,US`. jobTitle is never
 *    split on commas because a title may legitimately contain one;
 *  - a repeated single-value param (`?page=1&page=2`) is passed through as an
 *    array so validation rejects it instead of silently picking one.
 */
export function normalizeListQuery(raw: unknown): Record<string, unknown> {
  if (typeof raw !== 'object' || raw === null) return {};

  const entries: [string, unknown][] = [];
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (MULTI_VALUE_KEYS.includes(key)) {
      const values = (Array.isArray(value) ? value : [value]).flatMap((item: unknown) =>
        typeof item === 'string' && COMMA_SEPARATED_KEYS.includes(key) ? item.split(',') : [item],
      );
      const cleaned = values
        .map((item) => (typeof item === 'string' ? item.trim() : item))
        .filter((item) => item !== '');
      if (cleaned.length > 0) entries.push([key, cleaned]);
    } else if (typeof value === 'string') {
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

export function parseListEmployeesQuery(raw: unknown): ListEmployeesQuery {
  const parsed = parseWith(listQuerySchema, normalizeListQuery(raw));
  return {
    page: parsed.page ?? LIST_DEFAULTS.page,
    pageSize: parsed.pageSize ?? LIST_DEFAULTS.pageSize,
    search: parsed.q,
    countries: parsed.country,
    departments: parsed.department,
    jobTitles: parsed.jobTitle,
    status: parsed.status ?? LIST_DEFAULTS.status,
    sortBy: parsed.sortBy ?? LIST_DEFAULTS.sortBy,
    sortOrder: parsed.sortOrder ?? LIST_DEFAULTS.sortOrder,
  };
}
