import { describe, it, expect, beforeAll } from 'vitest';
import { generateDataset, type GeneratedDataset } from '../generate-employees.js';
import { COUNTRIES, CURRENCIES } from '../reference-data.js';
import { DEPARTMENTS } from '../job-titles.js';

const COUNTRY_CODES = new Set(COUNTRIES.map((c) => c.code));
const CURRENCY_BY_CODE = new Map(CURRENCIES.map((c) => [c.code, c]));
const VALID_COUNTRY_CURRENCY_PAIRS = new Set(COUNTRIES.map((c) => `${c.code}:${c.defaultCurrencyCode}`));

const SMALL_COUNT = 500;
const SMALL_SEED = 20260924;

describe('generateDataset', () => {
  let small: GeneratedDataset;

  beforeAll(() => {
    small = generateDataset({ count: SMALL_COUNT, seed: SMALL_SEED });
  });

  it('generates exactly the requested number of employees', () => {
    expect(small.employees).toHaveLength(SMALL_COUNT);
  });

  it('generates at least one salary record per employee', () => {
    expect(small.salaryRecords.length).toBeGreaterThanOrEqual(SMALL_COUNT);
  });

  it('is fully deterministic for the same (count, seed)', () => {
    const again = generateDataset({ count: SMALL_COUNT, seed: SMALL_SEED });
    expect(again).toEqual(small);
  });

  it('produces different output for a different seed', () => {
    const different = generateDataset({ count: SMALL_COUNT, seed: SMALL_SEED + 1 });
    expect(different.employees.map((e) => e.fullName)).not.toEqual(
      small.employees.map((e) => e.fullName),
    );
  });

  it('gives every employee a unique id', () => {
    const ids = new Set(small.employees.map((e) => e.id));
    expect(ids.size).toBe(small.employees.length);
  });

  it('gives every employee a unique employee number', () => {
    const numbers = new Set(small.employees.map((e) => e.employeeNumber));
    expect(numbers.size).toBe(small.employees.length);
  });

  it('gives every employee a unique, well-formed email', () => {
    const emails = new Set(small.employees.map((e) => e.email));
    expect(emails.size).toBe(small.employees.length);
    for (const employee of small.employees) {
      expect(employee.email).toMatch(/^[a-z0-9.]+@acme-corp\.example$/);
    }
  });

  it('only uses countries and departments from the reference data', () => {
    for (const employee of small.employees) {
      expect(COUNTRY_CODES.has(employee.countryCode)).toBe(true);
      expect(DEPARTMENTS).toContain(employee.department);
    }
  });

  it('only assigns employment status ACTIVE or TERMINATED', () => {
    for (const employee of small.employees) {
      expect(['ACTIVE', 'TERMINATED']).toContain(employee.employmentStatus);
    }
  });

  it('never hires anyone in the future relative to today', () => {
    const now = new Date();
    for (const employee of small.employees) {
      expect(employee.hireDate.getTime()).toBeLessThan(now.getTime());
    }
  });

  it('produces non-blank names and job titles', () => {
    for (const employee of small.employees) {
      expect(employee.fullName.trim().length).toBeGreaterThan(0);
      expect(employee.jobTitle.trim().length).toBeGreaterThan(0);
    }
  });

  it('pairs each salary currency with a currency that exists in reference data', () => {
    for (const record of small.salaryRecords) {
      expect(CURRENCY_BY_CODE.has(record.currencyCode)).toBe(true);
    }
  });

  it("uses each employee's country default currency for their salary records", () => {
    const employeeById = new Map(small.employees.map((e) => [e.id, e]));
    for (const record of small.salaryRecords) {
      const employee = employeeById.get(record.employeeId);
      expect(employee).toBeDefined();
      const pair = `${employee!.countryCode}:${record.currencyCode}`;
      expect(VALID_COUNTRY_CURRENCY_PAIRS.has(pair)).toBe(true);
    }
  });

  it('produces positive decimal-string amounts with the right scale for the currency', () => {
    for (const record of small.salaryRecords) {
      const currency = CURRENCY_BY_CODE.get(record.currencyCode)!;
      expect(Number(record.amount)).toBeGreaterThan(0);
      const decimalPlaces = record.amount.includes('.') ? record.amount.split('.')[1]!.length : 0;
      expect(decimalPlaces).toBe(currency.minorUnit);
    }
  });

  it('gives exactly one current (endDate === null) salary record per employee', () => {
    const currentCountByEmployee = new Map<string, number>();
    for (const record of small.salaryRecords) {
      if (record.endDate === null) {
        currentCountByEmployee.set(
          record.employeeId,
          (currentCountByEmployee.get(record.employeeId) ?? 0) + 1,
        );
      }
    }
    expect(currentCountByEmployee.size).toBe(small.employees.length);
    for (const count of currentCountByEmployee.values()) {
      expect(count).toBe(1);
    }
  });

  it("chains each employee's salary history with strictly increasing, gap-free dates", () => {
    const recordsByEmployee = new Map<string, typeof small.salaryRecords>();
    for (const record of small.salaryRecords) {
      const list = recordsByEmployee.get(record.employeeId) ?? [];
      list.push(record);
      recordsByEmployee.set(record.employeeId, list);
    }

    for (const [employeeId, records] of recordsByEmployee) {
      const sorted = [...records].sort(
        (a, b) => a.effectiveDate.getTime() - b.effectiveDate.getTime(),
      );
      const employee = small.employees.find((e) => e.id === employeeId)!;

      expect(sorted[0]!.effectiveDate.getTime()).toBe(employee.hireDate.getTime());

      for (let i = 0; i < sorted.length; i++) {
        const record = sorted[i]!;
        expect(record.endDate === null || record.endDate.getTime() >= record.effectiveDate.getTime()).toBe(
          true,
        );

        const next = sorted[i + 1];
        if (next) {
          expect(record.endDate).not.toBeNull();
          expect(record.endDate!.getTime()).toBe(next.effectiveDate.getTime());
          expect(next.effectiveDate.getTime()).toBeGreaterThan(record.effectiveDate.getTime());
        } else {
          expect(record.endDate).toBeNull();
        }
      }
    }
  });

  it('produces useful variation across departments, countries and salaries', () => {
    const departmentsUsed = new Set(small.employees.map((e) => e.department));
    const countriesUsed = new Set(small.employees.map((e) => e.countryCode));
    const amounts = small.salaryRecords.map((r) => Number(r.amount));
    const min = Math.min(...amounts);
    const max = Math.max(...amounts);

    // At 500 employees we expect broad coverage of the 10 departments and a
    // healthy slice of the 20 countries, plus real salary spread (not every
    // employee earning the same figure).
    expect(departmentsUsed.size).toBeGreaterThanOrEqual(8);
    expect(countriesUsed.size).toBeGreaterThanOrEqual(10);
    expect(max).toBeGreaterThan(min * 2);
  });

  it('produces exactly 10,000 employees at the seed script default count', () => {
    // Cheap enough to run in a unit test and it's the deliverable's core
    // acceptance criterion, independent of any database.
    const full = generateDataset({ count: 10_000, seed: SMALL_SEED });
    expect(full.employees).toHaveLength(10_000);
    const uniqueIds = new Set(full.employees.map((e) => e.id));
    const uniqueNumbers = new Set(full.employees.map((e) => e.employeeNumber));
    const uniqueEmails = new Set(full.employees.map((e) => e.email));
    expect(uniqueIds.size).toBe(10_000);
    expect(uniqueNumbers.size).toBe(10_000);
    expect(uniqueEmails.size).toBe(10_000);
  });
});
