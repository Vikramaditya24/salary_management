import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AppError } from '../lib/errors.js';
import type { EmployeeDetailRow, EmployeeRow } from './select.js';
import { employeeDetailSelect, employeeSelect } from './select.js';
import type { CreateEmployeeInput, ListEmployeesQuery } from './schemas.js';
import { createEmployeeService, type EmployeeDb } from './service.js';

// --- fixtures ---------------------------------------------------------------

const NOW = new Date('2026-09-24T12:00:00.000Z');
const ID = '3f0a9c1e-8b7d-4c2a-9e6f-1a2b3c4d5e6f';

function row(overrides: Partial<EmployeeRow> = {}): EmployeeRow {
  return {
    id: ID,
    employeeNumber: 'EMP-000001',
    fullName: 'Ada Lovelace',
    email: 'ada.lovelace@acme-corp.example',
    country: { code: 'GB', name: 'United Kingdom' },
    department: 'ENGINEERING',
    jobTitle: 'Software Engineer I',
    employmentStatus: 'ACTIVE',
    hireDate: new Date('2020-01-15T00:00:00.000Z'),
    createdAt: new Date('2026-09-01T10:00:00.000Z'),
    updatedAt: new Date('2026-09-02T10:00:00.000Z'),
    ...overrides,
  };
}

/** Stands in for Prisma.Decimal: only `toFixed` is used by the service. */
const decimal = (value: number) => ({ toFixed: (places: number) => value.toFixed(places) });

function detailRow(salary: 'has-salary' | 'no-salary'): EmployeeDetailRow {
  return {
    ...row(),
    salaryRecords:
      salary === 'has-salary'
        ? [
            {
              amount: decimal(128450),
              currencyCode: 'GBP',
              effectiveDate: new Date('2024-03-01T00:00:00.000Z'),
            },
          ]
        : [],
  } as unknown as EmployeeDetailRow;
}

const baseQuery: ListEmployeesQuery = {
  page: 1,
  pageSize: 25,
  search: undefined,
  countries: undefined,
  departments: undefined,
  jobTitles: undefined,
  status: 'ACTIVE',
  sortBy: 'fullName',
  sortOrder: 'asc',
};

const validCreate: CreateEmployeeInput = {
  fullName: 'Grace Hopper',
  email: 'grace.hopper@acme-corp.example',
  countryCode: 'US',
  department: 'ENGINEERING',
  jobTitle: 'Staff Engineer',
  hireDate: '2021-06-01',
};

const prismaError = (code: string, extra: Record<string, unknown> = {}) =>
  Object.assign(new Error(`prisma ${code}`), { code, ...extra });

function createMocks() {
  const employee = {
    count: vi.fn(),
    create: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn(),
    findUnique: vi.fn(),
    groupBy: vi.fn(),
    update: vi.fn(),
  };
  const country = { findMany: vi.fn(), findUnique: vi.fn() };
  const db = { employee, country } as unknown as EmployeeDb;
  return { db, employee, country };
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
let service: ReturnType<typeof createEmployeeService>;

beforeEach(() => {
  mocks = createMocks();
  service = createEmployeeService(mocks.db, { now: () => NOW });
});

// --- list -------------------------------------------------------------------

describe('list', () => {
  it('loads only the requested page and reports pagination metadata', async () => {
    mocks.employee.count.mockResolvedValue(10_000);
    mocks.employee.findMany.mockResolvedValue([row(), row({ id: 'b' })]);

    const result = await service.list({ ...baseQuery, page: 3, pageSize: 25 });

    expect(mocks.employee.findMany).toHaveBeenCalledTimes(1);
    const args = mocks.employee.findMany.mock.calls[0]![0];
    expect(args.skip).toBe(50);
    expect(args.take).toBe(25);
    expect(result.meta).toEqual({
      page: 3,
      pageSize: 25,
      totalItems: 10_000,
      totalPages: 400,
      hasNextPage: true,
      hasPreviousPage: true,
    });
    expect(result.data).toHaveLength(2);
  });

  it('counts with the same filter it lists with', async () => {
    mocks.employee.count.mockResolvedValue(0);
    mocks.employee.findMany.mockResolvedValue([]);

    await service.list({ ...baseQuery, countries: ['DE'], search: 'ada' });

    const countWhere = mocks.employee.count.mock.calls[0]![0].where;
    const listWhere = mocks.employee.findMany.mock.calls[0]![0].where;
    expect(countWhere).toEqual(listWhere);
    expect(countWhere.countryCode).toEqual({ in: ['DE'] });
  });

  it('returns an empty page with accurate totals when the page is past the end', async () => {
    mocks.employee.count.mockResolvedValue(30);
    mocks.employee.findMany.mockResolvedValue([]);

    const result = await service.list({ ...baseQuery, page: 5 });

    expect(result.data).toEqual([]);
    expect(result.meta.totalPages).toBe(2);
    expect(result.meta.hasNextPage).toBe(false);
    expect(result.meta.hasPreviousPage).toBe(true);
  });

  it('reports an empty result set cleanly', async () => {
    mocks.employee.count.mockResolvedValue(0);
    mocks.employee.findMany.mockResolvedValue([]);

    const result = await service.list(baseQuery);

    expect(result.data).toEqual([]);
    expect(result.meta.totalItems).toBe(0);
    expect(result.meta.totalPages).toBe(0);
  });

  it('filters to active employees by default and to everyone for status=ALL', async () => {
    mocks.employee.count.mockResolvedValue(0);
    mocks.employee.findMany.mockResolvedValue([]);

    await service.list(baseQuery);
    expect(mocks.employee.findMany.mock.calls[0]![0].where.employmentStatus).toBe('ACTIVE');

    await service.list({ ...baseQuery, status: 'ALL' });
    expect(mocks.employee.findMany.mock.calls[1]![0].where.employmentStatus).toBeUndefined();
  });

  it('applies search across name, email and employee number', async () => {
    mocks.employee.count.mockResolvedValue(0);
    mocks.employee.findMany.mockResolvedValue([]);

    await service.list({ ...baseQuery, search: 'ada' });

    const where = mocks.employee.findMany.mock.calls[0]![0].where;
    expect(where.AND).toHaveLength(1);
    const fields = where.AND[0].OR.map((clause: Record<string, unknown>) => Object.keys(clause)[0]);
    expect(fields).toEqual(['fullName', 'email', 'employeeNumber']);
  });

  it('sorts deterministically, with id as the final tie-breaker', async () => {
    mocks.employee.count.mockResolvedValue(0);
    mocks.employee.findMany.mockResolvedValue([]);

    await service.list({ ...baseQuery, sortBy: 'hireDate', sortOrder: 'desc' });

    expect(mocks.employee.findMany.mock.calls[0]![0].orderBy).toEqual([
      { hireDate: 'desc' },
      { id: 'asc' },
    ]);
  });

  it('never selects or returns salary data', async () => {
    mocks.employee.count.mockResolvedValue(1);
    mocks.employee.findMany.mockResolvedValue([row()]);

    const result = await service.list(baseQuery);

    const select = mocks.employee.findMany.mock.calls[0]![0].select;
    expect(select).toBe(employeeSelect);
    expect(Object.keys(select).includes('salaryRecords')).toBe(false);
    const json = JSON.stringify(result);
    expect(json.includes('salary')).toBe(false);
    expect(json.includes('amount')).toBe(false);
  });

  it('maps rows to DTOs with calendar dates and ISO timestamps', async () => {
    mocks.employee.count.mockResolvedValue(1);
    mocks.employee.findMany.mockResolvedValue([row()]);

    const { data } = await service.list(baseQuery);

    expect(data[0]).toEqual({
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
    });
  });
});

// --- getById ----------------------------------------------------------------

describe('getById', () => {
  it('returns the employee with the current salary as an exact decimal string', async () => {
    mocks.employee.findUnique.mockResolvedValue(detailRow('has-salary'));

    const result = await service.getById(ID);

    expect(mocks.employee.findUnique.mock.calls[0]![0].where).toEqual({ id: ID });
    expect(mocks.employee.findUnique.mock.calls[0]![0].select).toBe(employeeDetailSelect);
    expect(result.fullName).toBe('Ada Lovelace');
    expect(result.currentSalary).toEqual({
      amount: '128450.00',
      currencyCode: 'GBP',
      effectiveDate: '2024-03-01',
    });
  });

  it('only asks the database for the current (open-ended) salary record', () => {
    expect(employeeDetailSelect.salaryRecords.where).toEqual({ endDate: null });
    expect(employeeDetailSelect.salaryRecords.take).toBe(1);
  });

  it('returns a null salary for an employee who has none', async () => {
    mocks.employee.findUnique.mockResolvedValue(detailRow('no-salary'));
    expect((await service.getById(ID)).currentSalary).toBeNull();
  });

  it('throws a 404 for an unknown employee', async () => {
    mocks.employee.findUnique.mockResolvedValue(null);
    await expectAppError(() => service.getById(ID), {
      statusCode: 404,
      code: 'EMPLOYEE_NOT_FOUND',
    });
  });
});

// --- create -----------------------------------------------------------------

describe('create', () => {
  beforeEach(() => {
    mocks.country.findUnique.mockResolvedValue({ code: 'US' });
    mocks.employee.findFirst.mockResolvedValue({ employeeNumber: 'EMP-010000' });
    mocks.employee.create.mockResolvedValue(row({ employeeNumber: 'EMP-010001' }));
  });

  it('assigns the next employee number and persists the validated fields', async () => {
    const result = await service.create(validCreate);

    expect(mocks.employee.create).toHaveBeenCalledTimes(1);
    const data = mocks.employee.create.mock.calls[0]![0].data;
    expect(data.employeeNumber).toBe('EMP-010001');
    expect(data.fullName).toBe('Grace Hopper');
    expect(data.email).toBe('grace.hopper@acme-corp.example');
    expect(data.countryCode).toBe('US');
    expect(data.hireDate.toISOString()).toBe('2021-06-01T00:00:00.000Z');
    expect(Object.keys(data).includes('employmentStatus')).toBe(false); // DB default: ACTIVE
    expect(result.employeeNumber).toBe('EMP-010001');
    expect(mocks.employee.create.mock.calls[0]![0].select).toBe(employeeSelect);
  });

  it('starts numbering at EMP-000001 when there are no employees yet', async () => {
    mocks.employee.findFirst.mockResolvedValue(null);
    await service.create(validCreate);
    expect(mocks.employee.create.mock.calls[0]![0].data.employeeNumber).toBe('EMP-000001');
  });

  it('rejects a hire date in the future with 422 and writes nothing', async () => {
    const error = await expectAppError(() => service.create({ ...validCreate, hireDate: '2026-09-25' }), {
      statusCode: 422,
      code: 'HIRE_DATE_IN_FUTURE',
    });
    expect(error.details?.[0]?.field).toBe('hireDate');
    expect(mocks.employee.create).not.toHaveBeenCalled();
  });

  it('accepts a hire date of today', async () => {
    await service.create({ ...validCreate, hireDate: '2026-09-24' });
    expect(mocks.employee.create).toHaveBeenCalledTimes(1);
  });

  it('rejects an unknown country with 422 and writes nothing', async () => {
    mocks.country.findUnique.mockResolvedValue(null);
    const error = await expectAppError(() => service.create({ ...validCreate, countryCode: 'ZZ' }), {
      statusCode: 422,
      code: 'COUNTRY_NOT_FOUND',
    });
    expect(error.details?.[0]?.field).toBe('countryCode');
    expect(mocks.employee.create).not.toHaveBeenCalled();
  });

  it('maps a duplicate email (unique violation on email) to 409', async () => {
    mocks.employee.create.mockRejectedValue(prismaError('P2002', { meta: { target: ['email'] } }));
    const error = await expectAppError(() => service.create(validCreate), {
      statusCode: 409,
      code: 'EMAIL_ALREADY_EXISTS',
    });
    expect(error.details?.[0]?.field).toBe('email');
    expect(mocks.employee.create).toHaveBeenCalledTimes(1); // not retried
  });

  it('still reports a duplicate email when the driver does not say which constraint failed', async () => {
    mocks.employee.create.mockRejectedValue(prismaError('P2002'));
    mocks.employee.findUnique.mockResolvedValue({ id: 'someone-else' });
    await expectAppError(() => service.create(validCreate), {
      statusCode: 409,
      code: 'EMAIL_ALREADY_EXISTS',
    });
  });

  it('retries with a fresh number when it loses a race for an employee number', async () => {
    mocks.employee.findFirst
      .mockResolvedValueOnce({ employeeNumber: 'EMP-010000' })
      .mockResolvedValueOnce({ employeeNumber: 'EMP-010001' });
    mocks.employee.create
      .mockRejectedValueOnce(prismaError('P2002', { meta: { target: ['employee_number'] } }))
      .mockResolvedValueOnce(row({ employeeNumber: 'EMP-010002' }));

    const result = await service.create(validCreate);

    expect(mocks.employee.create).toHaveBeenCalledTimes(2);
    expect(mocks.employee.create.mock.calls[0]![0].data.employeeNumber).toBe('EMP-010001');
    expect(mocks.employee.create.mock.calls[1]![0].data.employeeNumber).toBe('EMP-010002');
    expect(result.employeeNumber).toBe('EMP-010002');
  });

  it('gives up with 409 after repeated employee-number collisions', async () => {
    mocks.employee.create.mockRejectedValue(
      prismaError('P2002', { meta: { target: ['employee_number'] } }),
    );
    const limited = createEmployeeService(mocks.db, { now: () => NOW, maxEmployeeNumberAttempts: 3 });

    await expectAppError(() => limited.create(validCreate), {
      statusCode: 409,
      code: 'EMPLOYEE_NUMBER_CONFLICT',
    });
    expect(mocks.employee.create).toHaveBeenCalledTimes(3);
  });

  it('maps a foreign-key violation to 422 (country removed between check and insert)', async () => {
    mocks.employee.create.mockRejectedValue(prismaError('P2003'));
    await expectAppError(() => service.create(validCreate), {
      statusCode: 422,
      code: 'COUNTRY_NOT_FOUND',
    });
  });

  it('maps a database CHECK failure to a generic 422', async () => {
    mocks.employee.create.mockRejectedValue(prismaError('P2004'));
    await expectAppError(() => service.create(validCreate), {
      statusCode: 422,
      code: 'CONSTRAINT_VIOLATION',
    });
  });

  it('lets unexpected errors through unchanged (the HTTP layer masks them as 500)', async () => {
    const boom = new Error('connection terminated: postgres://user:pw@host/db');
    mocks.employee.create.mockRejectedValue(boom);
    try {
      await service.create(validCreate);
      throw new Error('should have thrown');
    } catch (error) {
      expect(error).toBe(boom);
      expect(error instanceof AppError).toBe(false);
    }
  });
});

// --- update -----------------------------------------------------------------

describe('update', () => {
  beforeEach(() => {
    mocks.country.findUnique.mockResolvedValue({ code: 'DE' });
    mocks.employee.update.mockResolvedValue(row({ jobTitle: 'Staff Engineer' }));
  });

  it('updates only the fields provided', async () => {
    const result = await service.update(ID, { jobTitle: 'Staff Engineer' });

    const args = mocks.employee.update.mock.calls[0]![0];
    expect(args.where).toEqual({ id: ID });
    expect(args.data).toEqual({ jobTitle: 'Staff Engineer' });
    expect(result.jobTitle).toBe('Staff Engineer');
  });

  it('converts hireDate to a Date and can reactivate via employmentStatus', async () => {
    await service.update(ID, { hireDate: '2019-05-06', employmentStatus: 'ACTIVE' });

    const data = mocks.employee.update.mock.calls[0]![0].data;
    expect(data.hireDate.toISOString()).toBe('2019-05-06T00:00:00.000Z');
    expect(data.employmentStatus).toBe('ACTIVE');
  });

  it('checks a new country exists before writing', async () => {
    mocks.country.findUnique.mockResolvedValue(null);
    await expectAppError(() => service.update(ID, { countryCode: 'ZZ' }), {
      statusCode: 422,
      code: 'COUNTRY_NOT_FOUND',
    });
    expect(mocks.employee.update).not.toHaveBeenCalled();
  });

  it('does not look up a country when the country is unchanged', async () => {
    await service.update(ID, { jobTitle: 'Staff Engineer' });
    expect(mocks.country.findUnique).not.toHaveBeenCalled();
  });

  it('rejects a future hire date with 422', async () => {
    await expectAppError(() => service.update(ID, { hireDate: '2027-01-01' }), {
      statusCode: 422,
      code: 'HIRE_DATE_IN_FUTURE',
    });
    expect(mocks.employee.update).not.toHaveBeenCalled();
  });

  it('throws a 404 when the employee does not exist', async () => {
    mocks.employee.update.mockRejectedValue(prismaError('P2025'));
    await expectAppError(() => service.update(ID, { jobTitle: 'X' }), {
      statusCode: 404,
      code: 'EMPLOYEE_NOT_FOUND',
    });
  });

  it('maps an email that belongs to someone else to 409', async () => {
    mocks.employee.update.mockRejectedValue(prismaError('P2002', { meta: { target: ['email'] } }));
    await expectAppError(() => service.update(ID, { email: 'taken@acme-corp.example' }), {
      statusCode: 409,
      code: 'EMAIL_ALREADY_EXISTS',
    });
  });

  it('lets unexpected errors through unchanged', async () => {
    const boom = new Error('kaboom');
    mocks.employee.update.mockRejectedValue(boom);
    try {
      await service.update(ID, { jobTitle: 'X' });
      throw new Error('should have thrown');
    } catch (error) {
      expect(error).toBe(boom);
    }
  });
});

// --- deactivate -------------------------------------------------------------

describe('deactivate', () => {
  it('soft-deletes by marking the employee TERMINATED, without removing the row', async () => {
    mocks.employee.findUnique.mockResolvedValue(row());
    mocks.employee.update.mockResolvedValue(row({ employmentStatus: 'TERMINATED' }));

    const result = await service.deactivate(ID);

    expect(mocks.employee.update.mock.calls[0]![0].data).toEqual({ employmentStatus: 'TERMINATED' });
    expect(result.employmentStatus).toBe('TERMINATED');
  });

  it('is idempotent: an already-terminated employee is returned untouched', async () => {
    mocks.employee.findUnique.mockResolvedValue(row({ employmentStatus: 'TERMINATED' }));

    const result = await service.deactivate(ID);

    expect(result.employmentStatus).toBe('TERMINATED');
    expect(mocks.employee.update).not.toHaveBeenCalled();
  });

  it('throws a 404 for an unknown employee', async () => {
    mocks.employee.findUnique.mockResolvedValue(null);
    await expectAppError(() => service.deactivate(ID), {
      statusCode: 404,
      code: 'EMPLOYEE_NOT_FOUND',
    });
  });

  it('throws a 404 if the employee vanishes between the read and the update', async () => {
    mocks.employee.findUnique.mockResolvedValue(row());
    mocks.employee.update.mockRejectedValue(prismaError('P2025'));
    await expectAppError(() => service.deactivate(ID), {
      statusCode: 404,
      code: 'EMPLOYEE_NOT_FOUND',
    });
  });
});

// --- filter options ---------------------------------------------------------

describe('getFilterOptions', () => {
  it('returns the values the UI needs to build its filter controls', async () => {
    mocks.country.findMany.mockResolvedValue([
      { code: 'DE', name: 'Germany' },
      { code: 'US', name: 'United States' },
    ]);
    mocks.employee.groupBy.mockResolvedValue([
      { jobTitle: 'Product Manager' },
      { jobTitle: 'Software Engineer I' },
    ]);

    const options = await service.getFilterOptions();

    expect(options.countries).toEqual([
      { code: 'DE', name: 'Germany' },
      { code: 'US', name: 'United States' },
    ]);
    expect(options.jobTitles).toEqual(['Product Manager', 'Software Engineer I']);
    expect(options.departments).toContain('ENGINEERING');
    expect(options.departments).toHaveLength(10);
    expect(options.statuses).toEqual(['ACTIVE', 'TERMINATED', 'ALL']);
  });
});
