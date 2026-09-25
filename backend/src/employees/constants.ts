import type { Department, EmploymentStatus } from '../generated/prisma/index.js';

/**
 * Closed value sets used by request validation. Defined as literal tuples
 * (rather than read from the generated Prisma client at runtime) so schema
 * validation has no runtime dependency on `prisma generate`; the compile-time
 * assertions below fail the build if they ever drift from schema.prisma.
 */
export const DEPARTMENTS = [
  'ENGINEERING',
  'PRODUCT',
  'DESIGN',
  'SALES',
  'MARKETING',
  'FINANCE',
  'HUMAN_RESOURCES',
  'OPERATIONS',
  'CUSTOMER_SUPPORT',
  'LEGAL',
] as const;

export const EMPLOYMENT_STATUSES = ['ACTIVE', 'TERMINATED'] as const;

/** `status` list filter: a real status, or ALL to include both. */
export const STATUS_FILTERS = ['ACTIVE', 'TERMINATED', 'ALL'] as const;

export const SORT_FIELDS = [
  'fullName',
  'employeeNumber',
  'hireDate',
  'department',
  'jobTitle',
  'country',
] as const;

export const SORT_ORDERS = ['asc', 'desc'] as const;

export type DepartmentValue = (typeof DEPARTMENTS)[number];
export type EmploymentStatusValue = (typeof EMPLOYMENT_STATUSES)[number];
export type StatusFilter = (typeof STATUS_FILTERS)[number];
export type SortField = (typeof SORT_FIELDS)[number];
export type SortOrder = (typeof SORT_ORDERS)[number];

// Compile-time drift guards: these resolve to `never` (and the assignments
// below stop compiling) if the tuples above and the Prisma enums diverge.
type Equals<A, B> = [A] extends [B] ? ([B] extends [A] ? true : never) : never;
const _departmentsMatchPrisma: Equals<DepartmentValue, Department> = true;
const _statusesMatchPrisma: Equals<EmploymentStatusValue, EmploymentStatus> = true;
void _departmentsMatchPrisma;
void _statusesMatchPrisma;

/** Defaults and limits for GET /employees. */
export const LIST_DEFAULTS = {
  page: 1,
  pageSize: 25,
  maxPageSize: 100,
  /** Keeps `skip` comfortably inside a 32-bit int at the maximum page size. */
  maxPage: 10_000,
  status: 'ACTIVE',
  sortBy: 'fullName',
  sortOrder: 'asc',
} as const satisfies {
  page: number;
  pageSize: number;
  maxPageSize: number;
  maxPage: number;
  status: StatusFilter;
  sortBy: SortField;
  sortOrder: SortOrder;
};

export const MAX_SEARCH_LENGTH = 100;
export const MAX_SEARCH_TOKENS = 6;
