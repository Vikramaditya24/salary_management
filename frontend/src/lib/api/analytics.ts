import { apiRequest } from './client';

/**
 * Types for GET /analytics/salary. All monetary figures are pre-computed by the backend and
 * already normalised to USD using the organization's static exchange-rate table (not live FX) -
 * this module never recomputes salary statistics client-side.
 */

export interface SalaryStats {
  average: number;
  median: number;
  min: number;
  max: number;
}

export interface CountryHeadcount {
  country: string;
  count: number;
}

export interface DepartmentHeadcount {
  department: string;
  count: number;
}

export interface CountrySalaryStats {
  country: string;
  count: number;
  stats: SalaryStats;
}

export interface DepartmentSalaryStats {
  department: string;
  count: number;
  stats: SalaryStats;
}

export interface SalaryBand {
  label: string;
  count: number;
}

export interface SalaryOutlier {
  id: string;
  fullName: string;
  country?: string;
  department?: string;
  salaryUsd: number;
}

export interface SalaryAnalytics {
  totalEmployees: number;
  overall: SalaryStats | null;
  headcountByCountry: CountryHeadcount[];
  headcountByDepartment: DepartmentHeadcount[];
  salaryByCountry: CountrySalaryStats[];
  salaryByDepartment: DepartmentSalaryStats[];
  distribution: SalaryBand[];
  outliers: SalaryOutlier[];
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

export function getSalaryAnalytics(query: string, signal?: AbortSignal): Promise<SalaryAnalytics> {
  return apiRequest<SalaryAnalytics>(`/analytics/salary${query ? `?${query}` : ''}`, { signal });
}
