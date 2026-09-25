import type { DepartmentValue, EmploymentStatusValue } from './constants.js';
import type { EmployeeDetailRow, EmployeeRow } from './select.js';

/** The public shape of an employee. Note: no salary fields. */
export interface EmployeeDto {
  id: string;
  employeeNumber: string;
  fullName: string;
  email: string;
  country: { code: string; name: string };
  department: DepartmentValue;
  jobTitle: string;
  employmentStatus: EmploymentStatusValue;
  /** Calendar date, YYYY-MM-DD. */
  hireDate: string;
  createdAt: string;
  updatedAt: string;
}

export interface CurrentSalaryDto {
  /** Exact decimal as a string (never a JSON number), e.g. "128450.00". */
  amount: string;
  currencyCode: string;
  /** Calendar date, YYYY-MM-DD. */
  effectiveDate: string;
}

/** Only the single-employee endpoint includes salary. */
export interface EmployeeDetailDto extends EmployeeDto {
  currentSalary: CurrentSalaryDto | null;
}

export interface EmployeeFilterOptionsDto {
  countries: { code: string; name: string }[];
  departments: DepartmentValue[];
  jobTitles: string[];
  statuses: string[];
}

const toIsoDate = (date: Date): string => date.toISOString().slice(0, 10);

export function toEmployeeDto(row: EmployeeRow): EmployeeDto {
  return {
    id: row.id,
    employeeNumber: row.employeeNumber,
    fullName: row.fullName,
    email: row.email,
    country: { code: row.country.code, name: row.country.name },
    department: row.department,
    jobTitle: row.jobTitle,
    employmentStatus: row.employmentStatus,
    hireDate: toIsoDate(row.hireDate),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export function toEmployeeDetailDto(row: EmployeeDetailRow): EmployeeDetailDto {
  const current = row.salaryRecords[0];
  return {
    ...toEmployeeDto(row),
    currentSalary: current
      ? {
          // toFixed, not toString: decimal.js drops trailing zeros ("128450"),
          // and the column is numeric(14,2), so always render two places.
          amount: current.amount.toFixed(2),
          currencyCode: current.currencyCode,
          effectiveDate: toIsoDate(current.effectiveDate),
        }
      : null,
  };
}
