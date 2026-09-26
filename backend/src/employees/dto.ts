import { salaryDto } from '../salary.js';
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

/** The single-employee endpoint includes current salary and complete history. */
export interface EmployeeDetailDto extends EmployeeDto {
  currentSalary: ReturnType<typeof salaryDto> | null;
  salaryHistory: ReturnType<typeof salaryDto>[];
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
  const history = row.salaryRecords.map(salaryDto);
  return {
    ...toEmployeeDto(row),
    currentSalary: history.find((r) => r.endDate === null) ?? null,
    salaryHistory: history,
  };
}
