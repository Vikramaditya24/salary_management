import { vi } from 'vitest';
import type { Employee, EmployeeDetail, FilterOptions, PageMeta } from '@/lib/api/employees';

export interface MockRequest {
  url: URL;
  method: string;
  body: unknown;
  init: RequestInit | undefined;
}

export interface MockResponse {
  status?: number;
  body: unknown;
}

/** Replaces global fetch. Return `{ status, body }` from the handler, like the real API would. */
export function mockApi(handler: (req: MockRequest) => MockResponse | Promise<MockResponse>) {
  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const method = init?.method ?? 'GET';
    const body = typeof init?.body === 'string' ? JSON.parse(init.body) : undefined;
    const { status = 200, body: responseBody } = await handler({
      url: new URL(String(input)),
      method,
      body,
      init,
    });
    return {
      ok: status >= 200 && status < 300,
      status,
      json: async () => responseBody,
    } as Response;
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

export const filterOptions: FilterOptions = {
  countries: [
    { code: 'DE', name: 'Germany' },
    { code: 'US', name: 'United States' },
  ],
  departments: ['ENGINEERING', 'HUMAN_RESOURCES', 'SALES'],
  jobTitles: ['Software Engineer I', 'Director of Sales'],
  statuses: ['ACTIVE', 'TERMINATED', 'ALL'],
};

export function makeEmployee(overrides: Partial<Employee> = {}): Employee {
  return {
    id: '11111111-1111-4111-8111-111111111111',
    employeeNumber: 'EMP-000001',
    fullName: 'Ada Lovelace',
    email: 'ada@acme.com',
    country: { code: 'DE', name: 'Germany' },
    department: 'ENGINEERING',
    jobTitle: 'Software Engineer I',
    employmentStatus: 'ACTIVE',
    hireDate: '2021-03-05',
    createdAt: '2021-03-05T00:00:00.000Z',
    updatedAt: '2021-03-05T00:00:00.000Z',
    ...overrides,
  };
}

export function makeDetail(overrides: Partial<EmployeeDetail> = {}): EmployeeDetail {
  return {
    ...makeEmployee(),
    currentSalary: { amount: '128450.00', currencyCode: 'EUR', effectiveDate: '2024-01-01' },
    ...overrides,
  };
}

export function makeMeta(overrides: Partial<PageMeta> = {}): PageMeta {
  return {
    page: 1,
    pageSize: 25,
    totalItems: 1,
    totalPages: 1,
    hasNextPage: false,
    hasPreviousPage: false,
    ...overrides,
  };
}

export function apiError(status: number, code: string, message: string, details?: unknown[]) {
  return { status, body: { error: { code, message, details, requestId: 'req-1' } } };
}
