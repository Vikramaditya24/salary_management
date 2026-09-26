/**
 * HTTP-layer tests: status codes, request parsing, and what a client can and
 * cannot see when things go wrong. The salary analytics service is replaced
 * with a stub, so these tests need no database — see employees/routes.test.ts
 * for the same approach.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../app.js';
import { unprocessable } from '../lib/errors.js';
import type { SalaryInsightsDto } from './dto.js';
import type { SalaryAnalyticsService } from './service.js';

const insights: SalaryInsightsDto = {
  filters: { country: null, department: null },
  currency: 'USD',
  overall: {
    employeeCount: 10_000,
    totalSalaryUsd: '950000000.00',
    averageSalaryUsd: '95000.00',
    minSalaryUsd: '30000.00',
    maxSalaryUsd: '400000.00',
  },
  headcountByDepartment: [
    { department: 'ENGINEERING', employeeCount: 4000, averageSalaryUsd: '110000.00' },
  ],
  headcountByCountry: [
    {
      country: { code: 'US', name: 'United States' },
      employeeCount: 5000,
      averageSalaryUsd: '105000.00',
    },
  ],
};

function createStub() {
  return { getSalaryInsights: vi.fn() };
}

let stub: ReturnType<typeof createStub>;
let app: FastifyInstance;

beforeEach(async () => {
  stub = createStub();
  app = await buildApp({
    testOnlyDisableAuth: true,
    salaryAnalyticsService: stub as unknown as SalaryAnalyticsService,
  });
});

afterEach(async () => {
  await app.close();
});

describe('GET /analytics/salary', () => {
  it('returns salary insights for the unfiltered population by default', async () => {
    stub.getSalaryInsights.mockResolvedValue(insights);

    const response = await app.inject({ method: 'GET', url: '/analytics/salary' });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ data: insights });
    expect(stub.getSalaryInsights.mock.calls[0]![0]).toEqual({
      country: undefined,
      department: undefined,
    });
  });

  it('forbids caching of salary data', async () => {
    stub.getSalaryInsights.mockResolvedValue(insights);
    const response = await app.inject({ method: 'GET', url: '/analytics/salary' });
    expect(response.headers['cache-control']).toBe('no-store');
  });

  it('parses and forwards the country and department filters', async () => {
    stub.getSalaryInsights.mockResolvedValue(insights);

    await app.inject({
      method: 'GET',
      url: '/analytics/salary?country=de&department=ENGINEERING',
    });

    expect(stub.getSalaryInsights.mock.calls[0]![0]).toEqual({
      country: 'DE',
      department: 'ENGINEERING',
    });
  });

  it('rejects invalid query parameters with 400 and per-field details', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/analytics/salary?department=WIZARDRY',
    });

    expect(response.statusCode).toBe(400);
    const body = response.json();
    expect(body.error.code).toBe('VALIDATION_ERROR');
    expect(body.error.details.map((d: { field: string }) => d.field)).toContain('department');
    expect(stub.getSalaryInsights).not.toHaveBeenCalled();
  });

  it('rejects unknown query parameters rather than silently ignoring them', async () => {
    const response = await app.inject({ method: 'GET', url: '/analytics/salary?contry=DE' });
    expect(response.statusCode).toBe(400);
    expect(stub.getSalaryInsights).not.toHaveBeenCalled();
  });

  it('returns 422 with a stable error code when the service reports an unknown country', async () => {
    stub.getSalaryInsights.mockRejectedValue(
      unprocessable('COUNTRY_NOT_FOUND', 'Unknown country code "ZZ".', [
        { field: 'country', message: 'Unknown country code "ZZ".' },
      ]),
    );

    const response = await app.inject({ method: 'GET', url: '/analytics/salary?country=ZZ' });

    expect(response.statusCode).toBe(422);
    expect(response.json().error.code).toBe('COUNTRY_NOT_FOUND');
  });

  it('never exposes internal error details or stack traces on a 500', async () => {
    stub.getSalaryInsights.mockRejectedValue(
      new Error('connect ECONNREFUSED postgres://acme:hunter2@db.internal:5432/salary'),
    );

    const response = await app.inject({ method: 'GET', url: '/analytics/salary' });

    expect(response.statusCode).toBe(500);
    const body = response.json();
    expect(body.error.code).toBe('INTERNAL_ERROR');
    expect(body.error.message).toBe('An unexpected error occurred.');
    expect(typeof body.error.requestId).toBe('string');
    for (const leaked of [
      'ECONNREFUSED',
      'postgres://',
      'hunter2',
      'db.internal',
      'stack',
      ' at ',
    ]) {
      expect(response.body.includes(leaked)).toBe(false);
    }
  });
});
