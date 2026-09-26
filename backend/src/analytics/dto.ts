import type { Prisma } from '../generated/prisma/index.js';
import type { DepartmentValue } from '../employees/constants.js';
import type { SalaryInsightsQuery } from './schemas.js';

export interface SalaryInsightsFilters {
  country: string | null;
  department: DepartmentValue | null;
}

export interface SalaryOverallStats {
  employeeCount: number;
  /**
   * Exact decimal as a string (never a JSON number), e.g. "128450.00" — same
   * rule as CurrentSalaryDto in employees/dto.ts. `null` when no employee
   * matches the filters (there is nothing to total/average).
   */
  totalSalaryUsd: string | null;
  averageSalaryUsd: string | null;
  minSalaryUsd: string | null;
  maxSalaryUsd: string | null;
  medianSalaryUsd?: string | null;
  activeHeadcount?: number;
  terminatedHeadcount?: number;
  totalHeadcount?: number;
  withoutSalaryCount?: number;
}

export interface DepartmentSalaryBreakdown {
  department: DepartmentValue;
  employeeCount: number;
  averageSalaryUsd: string;
}

export interface CountrySalaryBreakdown {
  country: { code: string; name: string };
  employeeCount: number;
  averageSalaryUsd: string;
}

export interface SalaryInsightsDto {
  filters: SalaryInsightsFilters;
  /** Every monetary figure below is converted to this currency so countries with different pay currencies are comparable. */
  currency: 'USD';
  overall: SalaryOverallStats;
  headcountByDepartment: DepartmentSalaryBreakdown[];
  headcountByCountry: CountrySalaryBreakdown[];
  salaryByRole?: {
    jobTitle: string;
    employeeCount: number;
    averageSalaryUsd: string;
    minSalaryUsd: string;
    maxSalaryUsd: string;
  }[];
  distribution?: {
    lowerUsd: number;
    upperUsdExclusive: number;
    employeeCount: number;
    percentage: number;
  }[];
}

// -- raw query row shapes (snake_case: these come straight from $queryRaw) --

export interface OverallStatsRow {
  employee_count: number;
  total_usd: Prisma.Decimal | null;
  average_usd: Prisma.Decimal | null;
  min_usd: Prisma.Decimal | null;
  max_usd: Prisma.Decimal | null;
}

export interface DepartmentStatsRow {
  department: DepartmentValue;
  employee_count: number;
  average_usd: Prisma.Decimal;
}

export interface CountryStatsRow {
  country_code: string;
  country_name: string;
  employee_count: number;
  average_usd: Prisma.Decimal;
}

// toFixed, not toString: decimal.js drops trailing zeros ("128450"), and the
// SQL already rounds to 2dp, so this always renders two places — same
// reasoning as toEmployeeDetailDto in employees/dto.ts.
const money = (value: Prisma.Decimal): string => value.toFixed(2);
const moneyOrNull = (value: Prisma.Decimal | null | undefined): string | null =>
  value ? value.toFixed(2) : null;

export function toSalaryInsightsDto(
  query: SalaryInsightsQuery,
  overallRow: OverallStatsRow | undefined,
  departmentRows: DepartmentStatsRow[],
  countryRows: CountryStatsRow[],
): SalaryInsightsDto {
  return {
    filters: {
      country: query.country ?? null,
      department: query.department ?? null,
    },
    currency: 'USD',
    overall: {
      employeeCount: overallRow?.employee_count ?? 0,
      totalSalaryUsd: moneyOrNull(overallRow?.total_usd),
      averageSalaryUsd: moneyOrNull(overallRow?.average_usd),
      minSalaryUsd: moneyOrNull(overallRow?.min_usd),
      maxSalaryUsd: moneyOrNull(overallRow?.max_usd),
    },
    headcountByDepartment: departmentRows.map((row) => ({
      department: row.department,
      employeeCount: row.employee_count,
      averageSalaryUsd: money(row.average_usd),
    })),
    headcountByCountry: countryRows.map((row) => ({
      country: { code: row.country_code, name: row.country_name },
      employeeCount: row.employee_count,
      averageSalaryUsd: money(row.average_usd),
    })),
  };
}
