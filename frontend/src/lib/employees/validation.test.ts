import { describe, expect, it } from 'vitest';

import {
  diffEmployee,
  toCreateInput,
  todayIso,
  validateEmployeeForm,
  type EmployeeFormValues,
} from './validation';

const valid: EmployeeFormValues = {
  fullName: 'Ada Lovelace',
  email: 'ada@acme.com',
  countryCode: 'DE',
  department: 'ENGINEERING',
  jobTitle: 'Software Engineer I',
  hireDate: '2021-03-05',
};
const TODAY = '2026-09-24';

describe('validateEmployeeForm', () => {
  it('accepts a valid employee', () => {
    expect(validateEmployeeForm(valid, TODAY)).toEqual({});
  });

  it('requires every field, treating whitespace as empty', () => {
    const errors = validateEmployeeForm(
      { fullName: '   ', email: '', countryCode: '', department: '', jobTitle: ' ', hireDate: '' },
      TODAY,
    );
    expect(Object.keys(errors).sort()).toEqual(
      ['countryCode', 'department', 'email', 'fullName', 'hireDate', 'jobTitle'].sort(),
    );
  });

  it('enforces the same length limits as the API', () => {
    expect(validateEmployeeForm({ ...valid, fullName: 'x'.repeat(121) }, TODAY).fullName).toMatch(
      /120/,
    );
    expect(validateEmployeeForm({ ...valid, jobTitle: 'x'.repeat(81) }, TODAY).jobTitle).toMatch(
      /80/,
    );
  });

  it('rejects malformed emails', () => {
    for (const email of ['ada', 'ada@', 'ada@acme', 'a da@acme.com']) {
      expect(validateEmployeeForm({ ...valid, email }, TODAY).email).toBeDefined();
    }
  });

  it('rejects impossible, ancient and future hire dates; allows today', () => {
    expect(validateEmployeeForm({ ...valid, hireDate: '2021-02-30' }, TODAY).hireDate).toMatch(
      /valid date/,
    );
    expect(validateEmployeeForm({ ...valid, hireDate: '1899-12-31' }, TODAY).hireDate).toMatch(
      /1900/,
    );
    expect(validateEmployeeForm({ ...valid, hireDate: '2026-09-25' }, TODAY).hireDate).toMatch(
      /future/,
    );
    expect(validateEmployeeForm({ ...valid, hireDate: TODAY }, TODAY).hireDate).toBeUndefined();
  });
});

describe('todayIso', () => {
  it('formats the local calendar date with zero padding', () => {
    expect(todayIso(new Date(2026, 0, 5, 23, 59))).toBe('2026-01-05');
  });
});

describe('toCreateInput / diffEmployee', () => {
  it('trims text and lower-cases the email like the server does', () => {
    expect(
      toCreateInput({
        ...valid,
        fullName: '  Ada Lovelace ',
        email: ' ADA@Acme.com ',
        countryCode: 'de',
      }),
    ).toEqual(valid);
  });

  it('diffs only the changed fields', () => {
    const next = toCreateInput({ ...valid, jobTitle: 'Staff Engineer', email: 'ADA@acme.com' });
    expect(diffEmployee(valid, next)).toEqual({ jobTitle: 'Staff Engineer' });
    expect(diffEmployee(valid, toCreateInput(valid))).toEqual({});
  });
});
