/**
 * HTTP-layer tests: status codes, request parsing, and — most importantly —
 * what a client can and cannot see when things go wrong. The employee service
 * is replaced with a stub, so these tests need no database.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../app.js';
import { AppError, conflict, notFound } from '../lib/errors.js';
import type { EmployeeDetailDto, EmployeeDto } from './dto.js';
import type { EmployeeService } from './service.js';

const ID = '3f0a9c1e-8b7d-4c2a-9e6f-1a2b3c4d5e6f';

const employee: EmployeeDto = {
  id: ID,
  employeeNumber: 'EMP-000001',
  fullName: 'Ada Lovelace',
  email: 'ada.lovelace@acme-corp.example',
  country: { code: 'GB', name: 'United Kingdom' },
  department: 'ENGINEERING',
  jobTitle: 'Software Engineer I',
  employmentStatus: 'ACTIVE',
  hireDate: '2020-01-15',
  createdAt: '2026-09-01T10:00:00.000Z',
  updatedAt: '2026-09-02T10:00:00.000Z',
};

const detail: EmployeeDetailDto = {
  ...employee,
  currentSalary: { amount: '128450.00', currencyCode: 'GBP', effectiveDate: '2024-03-01' },
};

const validBody = {
  fullName: 'Ada Lovelace',
  email: 'Ada.Lovelace@Acme-Corp.Example',
  countryCode: 'gb',
  department: 'ENGINEERING',
  jobTitle: 'Software Engineer I',
  hireDate: '2020-01-15',
};

function createStub() {
  return {
    list: vi.fn(),
    getById: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    deactivate: vi.fn(),
    getFilterOptions: vi.fn(),
  };
}

let stub: ReturnType<typeof createStub>;
let app: FastifyInstance;

beforeEach(async () => {
  stub = createStub();
  app = await buildApp({ employeeService: stub as unknown as EmployeeService });
});

afterEach(async () => {
  await app.close();
});

describe('GET /employees', () => {
  it('returns data and pagination metadata, and hands the parsed query to the service', async () => {
    const meta = {
      page: 2,
      pageSize: 10,
      totalItems: 42,
      totalPages: 5,
      hasNextPage: true,
      hasPreviousPage: true,
    };
    stub.list.mockResolvedValue({ data: [employee], meta });

    const response = await app.inject({
      method: 'GET',
      url: '/employees?page=2&pageSize=10&q=ada&country=gb&department=ENGINEERING,PRODUCT&status=ALL',
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ data: [employee], meta });
    const query = stub.list.mock.calls[0]![0];
    expect(query.page).toBe(2);
    expect(query.pageSize).toBe(10);
    expect(query.search).toBe('ada');
    expect(query.countries).toEqual(['GB']);
    expect(query.departments).toEqual(['ENGINEERING', 'PRODUCT']);
    expect(query.status).toBe('ALL');
  });

  it('forbids caching of personal data', async () => {
    stub.list.mockResolvedValue({ data: [], meta: {} });
    const response = await app.inject({ method: 'GET', url: '/employees' });
    expect(response.headers['cache-control']).toBe('no-store');
  });

  it('rejects invalid query parameters with 400 and per-field details', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/employees?page=0&pageSize=1000&department=NOPE',
    });

    expect(response.statusCode).toBe(400);
    const body = response.json();
    expect(body.error.code).toBe('VALIDATION_ERROR');
    const fields = body.error.details.map((d: { field: string }) => d.field);
    expect(fields).toContain('page');
    expect(fields).toContain('pageSize');
    expect(fields).toContain('department.0');
    expect(stub.list).not.toHaveBeenCalled();
  });

  it('rejects unknown query parameters', async () => {
    const response = await app.inject({ method: 'GET', url: '/employees?countrey=DE' });
    expect(response.statusCode).toBe(400);
    expect(stub.list).not.toHaveBeenCalled();
  });
});

describe('GET /employees/filter-options', () => {
  it('is routed to the options endpoint, not treated as an :id', async () => {
    stub.getFilterOptions.mockResolvedValue({ countries: [], departments: [], jobTitles: [], statuses: [] });
    const response = await app.inject({ method: 'GET', url: '/employees/filter-options' });
    expect(response.statusCode).toBe(200);
    expect(stub.getById).not.toHaveBeenCalled();
  });
});

describe('GET /employees/:id', () => {
  it('returns the employee with salary, marked non-cacheable', async () => {
    stub.getById.mockResolvedValue(detail);

    const response = await app.inject({ method: 'GET', url: `/employees/${ID}` });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ data: detail });
    expect(response.headers['cache-control']).toBe('no-store');
    expect(stub.getById.mock.calls[0]![0]).toBe(ID);
  });

  it('returns 400 for a malformed id without touching the service', async () => {
    const response = await app.inject({ method: 'GET', url: '/employees/not-a-uuid' });
    expect(response.statusCode).toBe(400);
    expect(response.json().error.code).toBe('VALIDATION_ERROR');
    expect(stub.getById).not.toHaveBeenCalled();
  });

  it('returns 404 with a stable error code for a missing employee', async () => {
    stub.getById.mockRejectedValue(notFound('EMPLOYEE_NOT_FOUND', 'Employee not found.'));

    const response = await app.inject({ method: 'GET', url: `/employees/${ID}` });

    expect(response.statusCode).toBe(404);
    expect(response.json().error.code).toBe('EMPLOYEE_NOT_FOUND');
  });
});

describe('POST /employees', () => {
  it('creates an employee: 201, Location header, and normalised input', async () => {
    stub.create.mockResolvedValue(employee);

    const response = await app.inject({ method: 'POST', url: '/employees', payload: validBody });

    expect(response.statusCode).toBe(201);
    expect(response.headers.location).toBe(`/employees/${ID}`);
    expect(response.json()).toEqual({ data: employee });
    const input = stub.create.mock.calls[0]![0];
    expect(input.email).toBe('ada.lovelace@acme-corp.example');
    expect(input.countryCode).toBe('GB');
  });

  it('returns 400 with field details for an invalid body', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/employees',
      payload: { ...validBody, email: 'nope', hireDate: '2020-02-30' },
    });

    expect(response.statusCode).toBe(400);
    const fields = response.json().error.details.map((d: { field: string }) => d.field);
    expect(fields).toContain('email');
    expect(fields).toContain('hireDate');
    expect(stub.create).not.toHaveBeenCalled();
  });

  it('returns 400 for malformed JSON without echoing parser details', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/employees',
      headers: { 'content-type': 'application/json' },
      payload: '{"fullName": "Ada",',
    });

    expect(response.statusCode).toBe(400);
    const body = response.json();
    expect(body.error.code).toBe('BAD_REQUEST');
    expect(body.error.message).toBe('The request is malformed.');
    expect(stub.create).not.toHaveBeenCalled();
  });

  it('returns 400 when the body is missing entirely', async () => {
    const response = await app.inject({ method: 'POST', url: '/employees' });
    expect(response.statusCode).toBe(400);
    expect(stub.create).not.toHaveBeenCalled();
  });

  it('rejects server-owned fields such as employeeNumber', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/employees',
      payload: { ...validBody, employeeNumber: 'EMP-000001' },
    });
    expect(response.statusCode).toBe(400);
    const fields = response.json().error.details.map((d: { field: string }) => d.field);
    expect(fields).toContain('employeeNumber');
  });

  it('returns 415 for a non-JSON content type', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/employees',
      headers: { 'content-type': 'text/plain' },
      payload: 'hello',
    });
    expect(response.statusCode).toBe(415);
    expect(response.json().error.code).toBe('UNSUPPORTED_MEDIA_TYPE');
  });

  it('returns 413 for an oversized body', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/employees',
      payload: { ...validBody, fullName: 'x'.repeat(40_000) },
    });
    expect(response.statusCode).toBe(413);
    expect(response.json().error.code).toBe('PAYLOAD_TOO_LARGE');
  });

  it('returns 409 when the service reports a duplicate email', async () => {
    stub.create.mockRejectedValue(
      conflict('EMAIL_ALREADY_EXISTS', 'An employee with this email already exists.', [
        { field: 'email', message: 'An employee with this email already exists.' },
      ]),
    );

    const response = await app.inject({ method: 'POST', url: '/employees', payload: validBody });

    expect(response.statusCode).toBe(409);
    expect(response.json().error.code).toBe('EMAIL_ALREADY_EXISTS');
  });

  it('returns 422 when the service rejects a business rule', async () => {
    stub.create.mockRejectedValue(new AppError(422, 'HIRE_DATE_IN_FUTURE', 'Hire date cannot be in the future.'));
    const response = await app.inject({ method: 'POST', url: '/employees', payload: validBody });
    expect(response.statusCode).toBe(422);
    expect(response.json().error.code).toBe('HIRE_DATE_IN_FUTURE');
  });
});

describe('PATCH /employees/:id', () => {
  it('updates and returns the employee', async () => {
    stub.update.mockResolvedValue({ ...employee, jobTitle: 'Staff Engineer' });

    const response = await app.inject({
      method: 'PATCH',
      url: `/employees/${ID}`,
      payload: { jobTitle: 'Staff Engineer' },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().data.jobTitle).toBe('Staff Engineer');
    expect(stub.update.mock.calls[0]![0]).toBe(ID);
    expect(stub.update.mock.calls[0]![1]).toEqual({ jobTitle: 'Staff Engineer' });
  });

  it('returns 400 for an empty update', async () => {
    const response = await app.inject({ method: 'PATCH', url: `/employees/${ID}`, payload: {} });
    expect(response.statusCode).toBe(400);
    expect(stub.update).not.toHaveBeenCalled();
  });

  it('returns 400 for a malformed id', async () => {
    const response = await app.inject({
      method: 'PATCH',
      url: '/employees/123',
      payload: { jobTitle: 'X' },
    });
    expect(response.statusCode).toBe(400);
  });

  it('returns 404 when the employee does not exist', async () => {
    stub.update.mockRejectedValue(notFound('EMPLOYEE_NOT_FOUND', 'Employee not found.'));
    const response = await app.inject({
      method: 'PATCH',
      url: `/employees/${ID}`,
      payload: { jobTitle: 'X' },
    });
    expect(response.statusCode).toBe(404);
  });
});

describe('DELETE /employees/:id', () => {
  it('deactivates (soft-deletes) and returns the terminated employee', async () => {
    stub.deactivate.mockResolvedValue({ ...employee, employmentStatus: 'TERMINATED' });

    const response = await app.inject({ method: 'DELETE', url: `/employees/${ID}` });

    expect(response.statusCode).toBe(200);
    expect(response.json().data.employmentStatus).toBe('TERMINATED');
    expect(stub.deactivate.mock.calls[0]![0]).toBe(ID);
  });

  it('returns 404 when the employee does not exist', async () => {
    stub.deactivate.mockRejectedValue(notFound('EMPLOYEE_NOT_FOUND', 'Employee not found.'));
    const response = await app.inject({ method: 'DELETE', url: `/employees/${ID}` });
    expect(response.statusCode).toBe(404);
  });
});

describe('error masking', () => {
  it('never exposes internal error details or stack traces on a 500', async () => {
    stub.getById.mockRejectedValue(
      new Error('connect ECONNREFUSED postgres://acme:hunter2@db.internal:5432/salary'),
    );

    const response = await app.inject({ method: 'GET', url: `/employees/${ID}` });

    expect(response.statusCode).toBe(500);
    const body = response.json();
    expect(body.error.code).toBe('INTERNAL_ERROR');
    expect(body.error.message).toBe('An unexpected error occurred.');
    expect(typeof body.error.requestId).toBe('string');
    for (const leaked of ['ECONNREFUSED', 'postgres://', 'hunter2', 'db.internal', 'stack', ' at ']) {
      expect(response.body.includes(leaked)).toBe(false);
    }
  });

  it('masks Prisma-style errors that reach the HTTP layer unhandled', async () => {
    const prismaLike = Object.assign(
      new Error('Invalid `prisma.employee.update()` invocation: constraint "employees_email_key"'),
      { code: 'P9999', meta: { target: ['email'] } },
    );
    stub.update.mockRejectedValue(prismaLike);

    const response = await app.inject({
      method: 'PATCH',
      url: `/employees/${ID}`,
      payload: { jobTitle: 'X' },
    });

    expect(response.statusCode).toBe(500);
    expect(response.body.includes('prisma')).toBe(false);
    expect(response.body.includes('employees_email_key')).toBe(false);
    expect(response.body.includes('P9999')).toBe(false);
  });

  it('returns a JSON 404 for unknown routes', async () => {
    const response = await app.inject({ method: 'GET', url: '/does-not-exist' });
    expect(response.statusCode).toBe(404);
    expect(response.json().error.code).toBe('ROUTE_NOT_FOUND');
  });
});
