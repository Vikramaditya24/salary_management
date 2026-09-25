import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AppError } from '../lib/errors.js';
import type { SalaryInsightsQuery } from './schemas.js';
import { createSalaryAnalyticsService, type SalaryAnalyticsDb } from './service.js';

/** Stands in for Prisma.Decimal: only `toFixed` is used by the DTO mapping. */
const decimal = (value: number) => ({ toFixed: (places: number) => value.toFixed(places) });

const baseQuery: SalaryInsightsQuery = { country: undefined, department: undefined };

function createMocks() {
  const country = { findUnique: vi.fn() };
  const queryRaw = vi.fn();
  const db = { country, $queryRaw: queryRaw } as unknown as SalaryAnalyticsDb;
  return { db, country, queryRaw };
}

/** Runs `action`, asserts it rejects with an AppError, and returns that error. */
async function expectAppError(
  action: () => Promise<unknown>,
  expected: { statusCode: number; code: string },
): Promise<AppError> {
  try {
    await action();
  } catch (error) {
    expect(error instanceof AppError).toBe(true);
    const appError = error as AppError;
    expect(appError.statusCode).toBe(expected.statusCode);
    expect(appError.code).toBe(expected.code);
    return appError;
  }
  throw new Error('Expected an AppError, but the action resolved');
}

let mocks: ReturnType<typeof createMocks>;
let service: ReturnType<typeof createSalaryAnalyticsService>;

beforeEach(() => {
  mocks = createMocks();
  service = createSalaryAnalyticsService(mocks.db);
});

describe('getSalaryInsights', () => {
  it('runs the overall, department and country aggregates and converts them to USD strings', async () => {
    mocks.queryRaw
      .mockResolvedValueOnce([
        {
          employee_count: 500,
          total_usd: decimal(50_000_000),
          average_usd: decimal(100_000),
          min_usd: decimal(40_000),
          max_usd: decimal(250_000),
        },
      ])
      .mockResolvedValueOnce([
        { department: 'ENGINEERING', employee_count: 300, average_usd: decimal(120_000) },
      ])
      .mockResolvedValueOnce([
        { country_code: 'US', country_name: 'United States', employee_count: 200, average_usd: decimal(130_000) },
      ]);

    const result = await service.getSalaryInsights(baseQuery);

    expect(mocks.queryRaw).toHaveBeenCalledTimes(3);
    expect(mocks.country.findUnique).not.toHaveBeenCalled();
    expect(result.currency).toBe('USD');
    expect(result.filters).toEqual({ country: null, department: null });
    expect(result.overall).toEqual({
      employeeCount: 500,
      totalSalaryUsd: '50000000.00',
      averageSalaryUsd: '100000.00',
      minSalaryUsd: '40000.00',
      maxSalaryUsd: '250000.00',
    });
    expect(result.byDepartment).toEqual([
      { department: 'ENGINEERING', employeeCount: 300, averageSalaryUsd: '120000.00' },
    ]);
    expect(result.byCountry).toEqual([
      { country: { code: 'US', name: 'United States' }, employeeCount: 200, averageSalaryUsd: '130000.00' },
    ]);
  });

  it('echoes the requested filters back in the response', async () => {
    mocks.country.findUnique.mockResolvedValue({ code: 'DE' });
    mocks.queryRaw.mockResolvedValue([]);

    const result = await service.getSalaryInsights({ country: 'DE', department: 'ENGINEERING' });

    expect(result.filters).toEqual({ country: 'DE', department: 'ENGINEERING' });
  });

  it('checks the country exists before querying, and rejects an unknown one with 422', async () => {
    mocks.country.findUnique.mockResolvedValue(null);

    const error = await expectAppError(
      () => service.getSalaryInsights({ country: 'ZZ', department: undefined }),
      { statusCode: 422, code: 'COUNTRY_NOT_FOUND' },
    );

    expect(error.details?.[0]?.field).toBe('country');
    expect(mocks.queryRaw).not.toHaveBeenCalled();
  });

  it('does not check country existence when no country filter is given', async () => {
    mocks.queryRaw.mockResolvedValue([]);
    await service.getSalaryInsights(baseQuery);
    expect(mocks.country.findUnique).not.toHaveBeenCalled();
  });

  it('reports a null overall total/average/min/max when nobody matches the filters', async () => {
    mocks.queryRaw.mockResolvedValue([]);

    const result = await service.getSalaryInsights(baseQuery);

    expect(result.overall).toEqual({
      employeeCount: 0,
      totalSalaryUsd: null,
      averageSalaryUsd: null,
      minSalaryUsd: null,
      maxSalaryUsd: null,
    });
    expect(result.byDepartment).toEqual([]);
    expect(result.byCountry).toEqual([]);
  });

  it('lets unexpected errors through unchanged (the HTTP layer masks them as 500)', async () => {
    const boom = new Error('connection terminated: postgres://user:pw@host/db');
    mocks.queryRaw.mockRejectedValue(boom);
    try {
      await service.getSalaryInsights(baseQuery);
      throw new Error('should have thrown');
    } catch (error) {
      expect(error).toBe(boom);
      expect(error instanceof AppError).toBe(false);
    }
  });
});
