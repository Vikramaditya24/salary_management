import { apiRequest } from './client';

// Mirrors backend/src/employees/constants.ts. Duplicated (not fetched) so URL params can be
// sanitised synchronously before they reach the API, which rejects unknown values with a 400.
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

export type Department = (typeof DEPARTMENTS)[number];
export type StatusFilter = (typeof STATUS_FILTERS)[number];
export type EmploymentStatus = 'ACTIVE' | 'TERMINATED';
export type SortField = (typeof SORT_FIELDS)[number];
export type SortOrder = (typeof SORT_ORDERS)[number];

export interface Country {
  code: string;
  name: string;
}

export interface Employee {
  id: string;
  employeeNumber: string;
  fullName: string;
  email: string;
  country: Country;
  department: Department;
  jobTitle: string;
  employmentStatus: EmploymentStatus;
  hireDate: string;
  createdAt: string;
  updatedAt: string;
}

export interface SalaryRecord {
  id: string;
  amount: string;
  currencyCode: string;
  effectiveDate: string;
  endDate: string | null;
  createdBy: string;
  createdAt: string;
}

export interface EmployeeDetail extends Employee {
  currentSalary: SalaryRecord | null;
  salaryHistory: SalaryRecord[];
}

export interface PageMeta {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface EmployeeListResponse {
  data: Employee[];
  meta: PageMeta;
}

export interface FilterOptions {
  countries: Country[];
  departments: Department[];
  jobTitles: string[];
  statuses: string[];
}

export interface CreateEmployeeInput {
  fullName: string;
  email: string;
  countryCode: string;
  department: Department;
  jobTitle: string;
  hireDate: string;
}

export type UpdateEmployeeInput = Partial<CreateEmployeeInput> & {
  employmentStatus?: EmploymentStatus;
};

const employeePath = (id: string) => `/employees/${encodeURIComponent(id)}`;

export function listEmployees(query: string, signal?: AbortSignal): Promise<EmployeeListResponse> {
  return apiRequest<EmployeeListResponse>(`/employees${query ? `?${query}` : ''}`, { signal });
}

export async function getFilterOptions(signal?: AbortSignal): Promise<FilterOptions> {
  const res = await apiRequest<{ data: FilterOptions }>('/employees/filter-options', { signal });
  return res.data;
}

export async function getEmployee(id: string, signal?: AbortSignal): Promise<EmployeeDetail> {
  const res = await apiRequest<{ data: EmployeeDetail }>(employeePath(id), { signal });
  return res.data;
}

export async function createEmployee(input: CreateEmployeeInput): Promise<Employee> {
  const res = await apiRequest<{ data: Employee }>('/employees', { method: 'POST', body: input });
  return res.data;
}

export async function updateEmployee(id: string, patch: UpdateEmployeeInput): Promise<Employee> {
  const res = await apiRequest<{ data: Employee }>(employeePath(id), {
    method: 'PATCH',
    body: patch,
  });
  return res.data;
}

/** "Delete" is a soft delete: the employee is marked TERMINATED (see root docs/decisions.md). */
export async function deactivateEmployee(id: string): Promise<Employee> {
  const res = await apiRequest<{ data: Employee }>(employeePath(id), { method: 'DELETE' });
  return res.data;
}
