import type { Prisma } from '../generated/prisma/index.js';

/**
 * Explicit column selection for every employee query. The API never returns
 * a whole row: adding a column to the schema does not silently widen the API,
 * and salary data is only ever selected by `employeeDetailSelect` below.
 */
export const employeeSelect = {
  id: true,
  employeeNumber: true,
  fullName: true,
  email: true,
  department: true,
  jobTitle: true,
  employmentStatus: true,
  hireDate: true,
  createdAt: true,
  updatedAt: true,
  country: { select: { code: true, name: true } },
} satisfies Prisma.EmployeeSelect;

/**
 * Detail view = profile + the single current salary record (endDate IS NULL).
 * Full salary history belongs to the salary-history phase, not here.
 */
export const employeeDetailSelect = {
  ...employeeSelect,
  salaryRecords: {
    where: { endDate: null },
    orderBy: { effectiveDate: 'desc' },
    take: 1,
    select: { amount: true, currencyCode: true, effectiveDate: true },
  },
} satisfies Prisma.EmployeeSelect;

export type EmployeeRow = Prisma.EmployeeGetPayload<{ select: typeof employeeSelect }>;
export type EmployeeDetailRow = Prisma.EmployeeGetPayload<{
  select: typeof employeeDetailSelect;
}>;
