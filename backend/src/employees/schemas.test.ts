import { describe, it, expect } from 'vitest';
import { AppError } from '../lib/errors.js';
import {
  normalizeListQuery,
  parseCreateEmployeeBody,
  parseEmployeeParams,
  parseListEmployeesQuery,
  parseUpdateEmployeeBody,
} from './schemas.js';

const validCreate = {
  fullName: 'Ada Lovelace',
  email: 'ada.lovelace@acme-corp.example',
  countryCode: 'GB',
  department: 'ENGINEERING',
  jobTitle: 'Software Engineer I',
  hireDate: '2020-01-15',
};

/** Runs `fn`, expects a 400 VALIDATION_ERROR, and returns the offending field names. */
function validationFields(fn: () => unknown): string[] {
  try {
    fn();
  } catch (error) {
    expect(error instanceof AppError).toBe(true);
    const appError = error as AppError;
    expect(appError.statusCode).toBe(400);
    expect(appError.code).toBe('VALIDATION_ERROR');
    return (appError.details ?? []).map((detail) => detail.field);
  }
  throw new Error('Expected a validation error, but nothing was thrown');
}

describe('parseListEmployeesQuery', () => {
  it('applies defaults for an empty query', () => {
    expect(parseListEmployeesQuery({})).toEqual({
      page: 1,
      pageSize: 25,
      search: undefined,
      countries: undefined,
      departments: undefined,
      jobTitles: undefined,
      status: 'ACTIVE',
      sortBy: 'fullName',
      sortOrder: 'asc',
    });
  });

  it('parses numeric strings, filters, search and sort', () => {
    const query = parseListEmployeesQuery({
      page: '3',
      pageSize: '50',
      q: '  ada  ',
      country: 'de',
      department: 'ENGINEERING',
      jobTitle: 'Software Engineer I',
      status: 'ALL',
      sortBy: 'hireDate',
      sortOrder: 'desc',
    });
    expect(query).toEqual({
      page: 3,
      pageSize: 50,
      search: 'ada',
      countries: ['DE'],
      departments: ['ENGINEERING'],
      jobTitles: ['Software Engineer I'],
      status: 'ALL',
      sortBy: 'hireDate',
      sortOrder: 'desc',
    });
  });

  it('accepts repeated and comma-separated multi-value filters', () => {
    const query = parseListEmployeesQuery({
      country: ['de', 'US'],
      department: 'ENGINEERING,PRODUCT',
    });
    expect(query.countries).toEqual(['DE', 'US']);
    expect(query.departments).toEqual(['ENGINEERING', 'PRODUCT']);
  });

  it('does not split job titles on commas', () => {
    expect(parseListEmployeesQuery({ jobTitle: 'Sales, Enterprise' }).jobTitles).toEqual([
      'Sales, Enterprise',
    ]);
  });

  it('treats empty values (a cleared search box) as not provided', () => {
    const query = parseListEmployeesQuery({ q: '', country: '', page: '', status: '  ' });
    expect(query.search).toBeUndefined();
    expect(query.countries).toBeUndefined();
    expect(query.page).toBe(1);
    expect(query.status).toBe('ACTIVE');
  });

  it('rejects out-of-range and non-numeric pagination values', () => {
    expect(validationFields(() => parseListEmployeesQuery({ page: '0' }))).toContain('page');
    expect(validationFields(() => parseListEmployeesQuery({ page: '-1' }))).toContain('page');
    expect(validationFields(() => parseListEmployeesQuery({ page: 'abc' }))).toContain('page');
    expect(validationFields(() => parseListEmployeesQuery({ page: '1.5' }))).toContain('page');
    expect(validationFields(() => parseListEmployeesQuery({ page: '0x10' }))).toContain('page');
    expect(validationFields(() => parseListEmployeesQuery({ page: '10001' }))).toContain('page');
    expect(validationFields(() => parseListEmployeesQuery({ pageSize: '0' }))).toContain(
      'pageSize',
    );
    expect(validationFields(() => parseListEmployeesQuery({ pageSize: '101' }))).toContain(
      'pageSize',
    );
  });

  it('rejects a repeated single-value parameter instead of picking one', () => {
    expect(validationFields(() => parseListEmployeesQuery({ page: ['1', '2'] }))).toContain('page');
  });

  it('rejects unknown enum values', () => {
    expect(validationFields(() => parseListEmployeesQuery({ department: 'WIZARDRY' }))).toContain(
      'department.0',
    );
    expect(validationFields(() => parseListEmployeesQuery({ status: 'FIRED' }))).toContain(
      'status',
    );
    expect(validationFields(() => parseListEmployeesQuery({ sortBy: 'salary' }))).toContain(
      'sortBy',
    );
    expect(validationFields(() => parseListEmployeesQuery({ sortOrder: 'sideways' }))).toContain(
      'sortOrder',
    );
  });

  it('rejects malformed country codes', () => {
    expect(validationFields(() => parseListEmployeesQuery({ country: 'USA' }))).toContain(
      'country.0',
    );
  });

  it('rejects unknown query parameters rather than silently ignoring them', () => {
    expect(validationFields(() => parseListEmployeesQuery({ countrey: 'DE' }))).toContain(
      'countrey',
    );
  });

  it('rejects overly long or overly broad searches', () => {
    expect(validationFields(() => parseListEmployeesQuery({ q: 'x'.repeat(101) }))).toContain('q');
    expect(validationFields(() => parseListEmployeesQuery({ q: 'a b c d e f g' }))).toContain('q');
  });

  it('reports every problem at once', () => {
    const fields = validationFields(() =>
      parseListEmployeesQuery({ page: '0', pageSize: '999', status: 'nope' }),
    );
    expect(fields).toContain('page');
    expect(fields).toContain('pageSize');
    expect(fields).toContain('status');
  });
});

describe('normalizeListQuery', () => {
  it('cannot be used to pollute prototypes', () => {
    const raw = JSON.parse('{"__proto__": ["polluted"], "page": "1"}') as unknown;
    const normalized = normalizeListQuery(raw);
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
    expect(Object.getPrototypeOf(normalized) === Object.prototype).toBe(true);
    // The hostile key survives as an ordinary own property and is then
    // rejected by the strict schema.
    expect(validationFields(() => parseListEmployeesQuery(raw))).toContain('__proto__');
  });
});

describe('parseEmployeeParams', () => {
  it("accepts a UUID (including the seed generator's v4 ids)", () => {
    const id = '3f0a9c1e-8b7d-4c2a-9e6f-1a2b3c4d5e6f';
    expect(parseEmployeeParams({ id })).toEqual({ id });
  });

  it('rejects anything that is not a UUID before it can reach the database', () => {
    expect(validationFields(() => parseEmployeeParams({ id: '123' }))).toContain('id');
    expect(validationFields(() => parseEmployeeParams({ id: "1' OR '1'='1" }))).toContain('id');
  });
});

describe('parseCreateEmployeeBody', () => {
  it('accepts a valid body and normalises it', () => {
    const input = parseCreateEmployeeBody({
      ...validCreate,
      fullName: '  Ada Lovelace  ',
      email: '  Ada.Lovelace@Acme-Corp.Example ',
      countryCode: 'gb',
    });
    expect(input).toEqual({
      ...validCreate,
      email: 'ada.lovelace@acme-corp.example',
      countryCode: 'GB',
    });
  });

  it('requires every field', () => {
    const fields = validationFields(() => parseCreateEmployeeBody({}));
    for (const field of [
      'fullName',
      'email',
      'countryCode',
      'department',
      'jobTitle',
      'hireDate',
    ]) {
      expect(fields).toContain(field);
    }
  });

  it('rejects blank and over-long text', () => {
    expect(
      validationFields(() => parseCreateEmployeeBody({ ...validCreate, fullName: '   ' })),
    ).toContain('fullName');
    expect(
      validationFields(() => parseCreateEmployeeBody({ ...validCreate, jobTitle: 'x'.repeat(81) })),
    ).toContain('jobTitle');
    expect(
      validationFields(() =>
        parseCreateEmployeeBody({ ...validCreate, fullName: 'x'.repeat(121) }),
      ),
    ).toContain('fullName');
  });

  it('rejects malformed emails', () => {
    for (const email of ['nope', 'a@b', '@x.com', 'a b@x.com', '']) {
      expect(validationFields(() => parseCreateEmployeeBody({ ...validCreate, email }))).toContain(
        'email',
      );
    }
  });

  it('rejects invalid department and country values', () => {
    expect(
      validationFields(() =>
        parseCreateEmployeeBody({ ...validCreate, department: 'Engineering' }),
      ),
    ).toContain('department');
    expect(
      validationFields(() => parseCreateEmployeeBody({ ...validCreate, countryCode: 'GBR' })),
    ).toContain('countryCode');
  });

  it('rejects malformed and impossible dates', () => {
    for (const hireDate of ['2020-1-5', '15/01/2020', '2020-02-30', '2021-13-01', '1899-12-31']) {
      expect(
        validationFields(() => parseCreateEmployeeBody({ ...validCreate, hireDate })),
      ).toContain('hireDate');
    }
    // A leap day is real.
    expect(parseCreateEmployeeBody({ ...validCreate, hireDate: '2020-02-29' }).hireDate).toBe(
      '2020-02-29',
    );
  });

  it('rejects wrong types', () => {
    expect(
      validationFields(() => parseCreateEmployeeBody({ ...validCreate, fullName: 42 })),
    ).toContain('fullName');
    expect(validationFields(() => parseCreateEmployeeBody('a string'))).toContain('(request)');
    expect(validationFields(() => parseCreateEmployeeBody(null))).toContain('(request)');
    expect(validationFields(() => parseCreateEmployeeBody([]))).toContain('(request)');
  });

  it('rejects server-owned and unknown fields (no mass assignment)', () => {
    const fields = validationFields(() =>
      parseCreateEmployeeBody({
        ...validCreate,
        id: '3f0a9c1e-8b7d-4c2a-9e6f-1a2b3c4d5e6f',
        employeeNumber: 'EMP-000001',
        employmentStatus: 'TERMINATED',
        salary: 1,
      }),
    );
    for (const field of ['id', 'employeeNumber', 'employmentStatus', 'salary']) {
      expect(fields).toContain(field);
    }
  });
});

describe('parseUpdateEmployeeBody', () => {
  it('accepts a partial body and only returns the fields provided', () => {
    expect(parseUpdateEmployeeBody({ jobTitle: ' Staff Engineer ' })).toEqual({
      jobTitle: 'Staff Engineer',
    });
  });

  it('accepts employmentStatus (this is how an employee is reactivated)', () => {
    expect(parseUpdateEmployeeBody({ employmentStatus: 'ACTIVE' })).toEqual({
      employmentStatus: 'ACTIVE',
    });
  });

  it('requires at least one field', () => {
    expect(validationFields(() => parseUpdateEmployeeBody({}))).toContain('(request)');
  });

  it('validates each provided field like create does', () => {
    expect(validationFields(() => parseUpdateEmployeeBody({ email: 'nope' }))).toContain('email');
    expect(validationFields(() => parseUpdateEmployeeBody({ hireDate: '2020-02-30' }))).toContain(
      'hireDate',
    );
    expect(
      validationFields(() => parseUpdateEmployeeBody({ employmentStatus: 'RETIRED' })),
    ).toContain('employmentStatus');
    expect(validationFields(() => parseUpdateEmployeeBody({ jobTitle: null }))).toContain(
      'jobTitle',
    );
  });

  it('cannot change immutable or server-owned fields', () => {
    const fields = validationFields(() =>
      parseUpdateEmployeeBody({ employeeNumber: 'EMP-999999', id: 'x', createdAt: '2020-01-01' }),
    );
    expect(fields).toContain('employeeNumber');
    expect(fields).toContain('id');
    expect(fields).toContain('createdAt');
  });
});
