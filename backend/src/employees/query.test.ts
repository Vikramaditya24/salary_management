import { describe, it, expect } from 'vitest';
import { buildEmployeeWhere, buildOrderBy, tokenizeSearch } from './query.js';
import type { ListEmployeesQuery } from './schemas.js';

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

describe('tokenizeSearch', () => {
  it('splits on whitespace and drops empties', () => {
    expect(tokenizeSearch('  john   smith ')).toEqual(['john', 'smith']);
  });

  it('removes case-insensitive duplicates', () => {
    expect(tokenizeSearch('Smith smith SMITH john')).toEqual(['Smith', 'john']);
  });

  it('returns nothing for empty input', () => {
    expect(tokenizeSearch(undefined)).toEqual([]);
    expect(tokenizeSearch('   ')).toEqual([]);
  });
});

describe('buildEmployeeWhere', () => {
  it('filters to active employees by default and adds nothing else', () => {
    expect(buildEmployeeWhere(baseQuery)).toEqual({ employmentStatus: 'ACTIVE' });
  });

  it('does not filter on status when ALL is requested', () => {
    expect(buildEmployeeWhere({ ...baseQuery, status: 'ALL' })).toEqual({});
  });

  it('can list only terminated employees', () => {
    expect(buildEmployeeWhere({ ...baseQuery, status: 'TERMINATED' })).toEqual({
      employmentStatus: 'TERMINATED',
    });
  });

  it('turns multi-value filters into IN lists and combines them', () => {
    const where = buildEmployeeWhere({
      ...baseQuery,
      countries: ['DE', 'US'],
      departments: ['ENGINEERING', 'PRODUCT'],
      jobTitles: ['Product Manager'],
    });
    expect(where).toEqual({
      employmentStatus: 'ACTIVE',
      countryCode: { in: ['DE', 'US'] },
      department: { in: ['ENGINEERING', 'PRODUCT'] },
      jobTitle: { in: ['Product Manager'] },
    });
  });

  it('requires every search word to match name, email or employee number', () => {
    const where = buildEmployeeWhere({ ...baseQuery, search: 'john smith' });
    expect(where.AND).toEqual([
      {
        OR: [
          { fullName: { contains: 'john', mode: 'insensitive' } },
          { email: { contains: 'john', mode: 'insensitive' } },
          { employeeNumber: { contains: 'john', mode: 'insensitive' } },
        ],
      },
      {
        OR: [
          { fullName: { contains: 'smith', mode: 'insensitive' } },
          { email: { contains: 'smith', mode: 'insensitive' } },
          { employeeNumber: { contains: 'smith', mode: 'insensitive' } },
        ],
      },
    ]);
  });

  it('passes search text as data, never as query structure', () => {
    const hostile = `x'; DROP TABLE employees; --`;
    const where = buildEmployeeWhere({ ...baseQuery, search: hostile });
    const serialised = JSON.stringify(where);
    // Each token is only ever the value of a `contains` filter.
    expect(serialised.includes('"contains":"DROP"')).toBe(true);
    expect(Object.keys(where).sort()).toEqual(['AND', 'employmentStatus']);
  });
});

describe('buildOrderBy', () => {
  it('sorts by the requested column and always tie-breaks on id', () => {
    expect(buildOrderBy({ sortBy: 'hireDate', sortOrder: 'desc' })).toEqual([
      { hireDate: 'desc' },
      { id: 'asc' },
    ]);
  });

  it('maps the "country" sort key to the country code column', () => {
    expect(buildOrderBy({ sortBy: 'country', sortOrder: 'asc' })).toEqual([
      { countryCode: 'asc' },
      { id: 'asc' },
    ]);
  });
});
