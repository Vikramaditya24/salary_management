import { describe, it, expect } from 'vitest';
import { prismaErrorCode, uniqueViolationFields } from './prisma-errors.js';

const prismaError = (code: string, extra: Record<string, unknown> = {}) =>
  Object.assign(new Error('prisma failure'), { code, ...extra });

describe('prismaErrorCode', () => {
  it('extracts Prisma-style codes', () => {
    expect(prismaErrorCode(prismaError('P2002'))).toBe('P2002');
  });

  it('ignores errors that are not Prisma request errors', () => {
    expect(prismaErrorCode(new Error('boom'))).toBeUndefined();
    expect(prismaErrorCode(prismaError('ECONNRESET'))).toBeUndefined();
    expect(prismaErrorCode(null)).toBeUndefined();
    expect(prismaErrorCode('P2002')).toBeUndefined();
  });
});

describe('uniqueViolationFields', () => {
  it('reads an array target', () => {
    expect(uniqueViolationFields(prismaError('P2002', { meta: { target: ['email'] } }))).toEqual([
      'email',
    ]);
  });

  it('reads a constraint-name target, lower-cased', () => {
    const error = prismaError('P2002', { meta: { target: 'Employees_Email_Key' } });
    expect(uniqueViolationFields(error)).toEqual(['employees_email_key']);
  });

  it('falls back to the message when meta.target is missing', () => {
    const error = Object.assign(new Error('Unique constraint failed on the fields: (`email`)'), {
      code: 'P2002',
    });
    expect(uniqueViolationFields(error)).toEqual(['email']);
  });

  it('returns nothing when the constraint cannot be determined', () => {
    expect(uniqueViolationFields(prismaError('P2002'))).toEqual([]);
    expect(uniqueViolationFields(undefined)).toEqual([]);
  });
});
