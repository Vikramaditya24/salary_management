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
 * Detail view = profile and salary history for one employee, newest first.
 */
export const employeeDetailSelect = {
  ...employeeSelect,
  salaryRecords: {
    orderBy: [{ effectiveDate: 'desc' }, { id: 'desc' }],
    select: {
      id: true,
      amount: true,
      currencyCode: true,
      effectiveDate: true,
      endDate: true,
      createdBy: true,
      createdAt: true,
    },
  },
} satisfies Prisma.EmployeeSelect;

export type EmployeeRow = Prisma.EmployeeGetPayload<{ select: typeof employeeSelect }>;
export type EmployeeDetailRow = Prisma.EmployeeGetPayload<{
  select: typeof employeeDetailSelect;
}>;
