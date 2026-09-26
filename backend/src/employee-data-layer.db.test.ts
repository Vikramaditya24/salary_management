/**
 * Integration tests for the employee data layer's DB-level guarantees.
 *
 * These exercise real constraints against a real Postgres instance (per
 * docs/architecture.md's testing strategy: "service-layer logic... run
 * against a test database"), rather than re-testing what
 * prisma/seed/__tests__/generate-employees.test.ts already covers in
 * isolation (that suite needs no database at all).
 *
 * Requires DATABASE_URL to point at a migrated Postgres test database
 * (vitest.config.ts sets this to acme_salary_test by default) with
 * `prisma migrate deploy` already applied.
 */
import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { prisma } from './lib/prisma.js';

const TEST_CURRENCY_CODE = 'USD';
const TEST_COUNTRY_CODE = 'US';

let employeeCounter = 0;
function uniqueEmployeeInput(
  overrides: Partial<Parameters<typeof prisma.employee.create>[0]['data']> = {},
) {
  employeeCounter += 1;
  const n = employeeCounter;
  return {
    employeeNumber: `TST-${String(n).padStart(6, '0')}`,
    fullName: `Test Employee ${n}`,
    email: `test.employee.${n}@acme-corp.example`,
    countryCode: TEST_COUNTRY_CODE,
    department: 'ENGINEERING' as const,
    jobTitle: 'Software Engineer I',
    hireDate: new Date('2020-01-01'),
    ...overrides,
  };
}

async function createEmployeeWithSalary(salaryOverrides: Record<string, unknown> = {}) {
  const employee = await prisma.employee.create({ data: uniqueEmployeeInput() });
  const salary = await prisma.salaryRecord.create({
    data: {
      employeeId: employee.id,
      amount: '100000.00',
      currencyCode: TEST_CURRENCY_CODE,
      effectiveDate: new Date('2020-01-01'),
      ...salaryOverrides,
    },
  });
  return { employee, salary };
}

describe('employee data layer — DB constraints', () => {
  beforeAll(async () => {
    // Minimal reference data this suite needs; the full set is the seed
    // script's job, not a test fixture's.
    await prisma.currency.upsert({
      where: { code: TEST_CURRENCY_CODE },
      create: {
        code: TEST_CURRENCY_CODE,
        name: 'US Dollar',
        minorUnit: 2,
        exchangeRateToUsd: '1.0',
      },
      update: {},
    });
    await prisma.country.upsert({
      where: { code: TEST_COUNTRY_CODE },
      create: {
        code: TEST_COUNTRY_CODE,
        name: 'United States',
        defaultCurrencyCode: TEST_CURRENCY_CODE,
      },
      update: {},
    });
  });

  afterEach(async () => {
    // Cascade delete takes salary_records with it.
    await prisma.employee.deleteMany({ where: { employeeNumber: { startsWith: 'TST-' } } });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('rejects a duplicate employee number', async () => {
    const input = uniqueEmployeeInput();
    await prisma.employee.create({ data: input });
    await expect(
      prisma.employee.create({
        data: { ...uniqueEmployeeInput(), employeeNumber: input.employeeNumber },
      }),
    ).rejects.toThrow();
  });

  it('rejects a duplicate email', async () => {
    const input = uniqueEmployeeInput();
    await prisma.employee.create({ data: input });
    await expect(
      prisma.employee.create({ data: { ...uniqueEmployeeInput(), email: input.email } }),
    ).rejects.toThrow();
  });

  it('rejects an employee referencing an unknown country', async () => {
    await expect(
      prisma.employee.create({ data: uniqueEmployeeInput({ countryCode: 'ZZ' }) }),
    ).rejects.toThrow();
  });

  it('rejects a blank full name', async () => {
    await expect(
      prisma.employee.create({ data: uniqueEmployeeInput({ fullName: '   ' }) }),
    ).rejects.toThrow();
  });

  it('rejects a hire date in the future', async () => {
    const future = new Date();
    future.setFullYear(future.getFullYear() + 1);
    await expect(
      prisma.employee.create({ data: uniqueEmployeeInput({ hireDate: future }) }),
    ).rejects.toThrow();
  });

  it('stores and returns the exact decimal amount, with no floating-point drift', async () => {
    const { salary } = await createEmployeeWithSalary({ amount: '123456.78' });
    expect(salary.amount.toString()).toBe('123456.78');

    const reread = await prisma.salaryRecord.findUniqueOrThrow({ where: { id: salary.id } });
    expect(reread.amount.toString()).toBe('123456.78');
  });

  it('rejects a zero or negative salary amount', async () => {
    const employee = await prisma.employee.create({ data: uniqueEmployeeInput() });
    await expect(
      prisma.salaryRecord.create({
        data: {
          employeeId: employee.id,
          amount: '0.00',
          currencyCode: TEST_CURRENCY_CODE,
          effectiveDate: new Date('2020-01-01'),
        },
      }),
    ).rejects.toThrow();

    await expect(
      prisma.salaryRecord.create({
        data: {
          employeeId: employee.id,
          amount: '-500.00',
          currencyCode: TEST_CURRENCY_CODE,
          effectiveDate: new Date('2020-01-01'),
        },
      }),
    ).rejects.toThrow();
  });

  it('rejects a salary record referencing an unknown currency', async () => {
    const employee = await prisma.employee.create({ data: uniqueEmployeeInput() });
    await expect(
      prisma.salaryRecord.create({
        data: {
          employeeId: employee.id,
          amount: '100000.00',
          currencyCode: 'ZZZ',
          effectiveDate: new Date('2020-01-01'),
        },
      }),
    ).rejects.toThrow();
  });

  it('rejects an end date earlier than the effective date', async () => {
    await expect(
      createEmployeeWithSalary({
        effectiveDate: new Date('2022-01-01'),
        endDate: new Date('2021-01-01'),
      }),
    ).rejects.toThrow();
  });

  it('allows only one current (endDate = null) salary record per employee', async () => {
    const { employee } = await createEmployeeWithSalary();

    await expect(
      prisma.salaryRecord.create({
        data: {
          employeeId: employee.id,
          amount: '110000.00',
          currencyCode: TEST_CURRENCY_CODE,
          effectiveDate: new Date('2021-01-01'),
          // endDate omitted => null => a second "current" row, which the
          // partial unique index must reject.
        },
      }),
    ).rejects.toThrow();
  });

  it('allows a second salary record once the first is closed out (a real raise)', async () => {
    const employee = await prisma.employee.create({ data: uniqueEmployeeInput() });
    const first = await prisma.salaryRecord.create({
      data: {
        employeeId: employee.id,
        amount: '100000.00',
        currencyCode: TEST_CURRENCY_CODE,
        effectiveDate: new Date('2020-01-01'),
        endDate: new Date('2021-01-01'),
      },
    });
    const second = await prisma.salaryRecord.create({
      data: {
        employeeId: employee.id,
        amount: '112000.00',
        currencyCode: TEST_CURRENCY_CODE,
        effectiveDate: new Date('2021-01-01'),
      },
    });

    const history = await prisma.salaryRecord.findMany({
      where: { employeeId: employee.id },
      orderBy: { effectiveDate: 'asc' },
    });
    expect(history.map((r) => r.id)).toEqual([first.id, second.id]);
    expect(history[history.length - 1]!.endDate).toBeNull();
  });

  it('deletes salary history when the employee is deleted (cascade)', async () => {
    const { employee, salary } = await createEmployeeWithSalary();

    await prisma.employee.delete({ where: { id: employee.id } });

    const found = await prisma.salaryRecord.findUnique({ where: { id: salary.id } });
    expect(found).toBeNull();
  });

  it('filters employees by country and department using the composite index path', async () => {
    await prisma.employee.create({
      data: uniqueEmployeeInput({ department: 'ENGINEERING', countryCode: TEST_COUNTRY_CODE }),
    });
    await prisma.employee.create({
      data: uniqueEmployeeInput({ department: 'SALES', countryCode: TEST_COUNTRY_CODE }),
    });

    const engineers = await prisma.employee.findMany({
      where: {
        department: 'ENGINEERING',
        countryCode: TEST_COUNTRY_CODE,
        employeeNumber: { startsWith: 'TST-' },
      },
    });
    expect(engineers.every((e) => e.department === 'ENGINEERING')).toBe(true);
  });
});
