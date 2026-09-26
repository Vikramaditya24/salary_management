import { apiRequest } from './client';

/**
 * Types for GET /analytics/salary. All monetary figures are pre-computed by the backend and
 * already normalised to USD using the organization's static exchange-rate table (not live FX) -
 * this module never recomputes salary statistics client-side.
 */

/** Exact decimal as a string (e.g. "128450.00"), never a JSON number - `null` when there is no matching employee. */
export interface SalaryOverallStats {
  employeeCount: number;
  totalSalaryUsd: string | null;
  averageSalaryUsd: string | null;
  minSalaryUsd: string | null;
  maxSalaryUsd: string | null;
  medianSalaryUsd: string | null;
  activeHeadcount: number;
  terminatedHeadcount: number;
  totalHeadcount: number;
  withoutSalaryCount: number;
}

export interface CountryHeadcount {
  country: { code: string; name: string };
  employeeCount: number;
  averageSalaryUsd: string;
}

export interface DepartmentHeadcount {
  department: string;
  employeeCount: number;
  averageSalaryUsd: string;
}

export interface SalaryAnalyticsResponseFilters {
  country: string | null;
  department: string | null;
}

export interface SalaryAnalytics {
  filters: SalaryAnalyticsResponseFilters;
  currency: 'USD';
  overall: SalaryOverallStats;
  headcountByDepartment: DepartmentHeadcount[];
  headcountByCountry: CountryHeadcount[];
  salaryByRole: {
    jobTitle: string;
    employeeCount: number;
    averageSalaryUsd: string;
    minSalaryUsd: string;
    maxSalaryUsd: string;
  }[];
  distribution: {
    lowerUsd: number;
    upperUsdExclusive: number;
    employeeCount: number;
    percentage: number;
  }[];
}

export interface SalaryAnalyticsFilters {
  country?: string;
  department?: string;
}

/** Omits empty filters rather than sending blank query params. */
export function toAnalyticsQuery(filters: SalaryAnalyticsFilters): string {
  const params = new URLSearchParams();
  if (filters.country) params.set('country', filters.country);
  if (filters.department) params.set('department', filters.department);
  return params.toString();
}

export async function getSalaryAnalytics(
  query: string,
  signal?: AbortSignal,
): Promise<SalaryAnalytics> {
  const envelope = await apiRequest<{ data: SalaryAnalytics }>(
    `/analytics/salary${query ? `?${query}` : ''}`,
    {
      signal,
    },
  );
  return envelope.data;
}
