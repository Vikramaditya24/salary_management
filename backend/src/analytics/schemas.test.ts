import { describe, it, expect } from 'vitest';
import { AppError } from '../lib/errors.js';
import { parseSalaryInsightsQuery } from './schemas.js';

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

describe('parseSalaryInsightsQuery', () => {
  it('has no filters for an empty query', () => {
    expect(parseSalaryInsightsQuery({})).toEqual({ country: undefined, department: undefined });
  });

  it('upper-cases the country code', () => {
    expect(parseSalaryInsightsQuery({ country: 'de' })).toEqual({
      country: 'DE',
      department: undefined,
    });
  });

  it('accepts a department filter', () => {
    expect(parseSalaryInsightsQuery({ department: 'ENGINEERING' })).toEqual({
      country: undefined,
      department: 'ENGINEERING',
    });
  });

  it('accepts both filters together', () => {
    expect(parseSalaryInsightsQuery({ country: 'de', department: 'ENGINEERING' })).toEqual({
      country: 'DE',
      department: 'ENGINEERING',
    });
  });

  it('treats empty values as not provided', () => {
    expect(parseSalaryInsightsQuery({ country: '', department: '' })).toEqual({
      country: undefined,
      department: undefined,
    });
  });

  it('rejects a malformed country code', () => {
    expect(validationFields(() => parseSalaryInsightsQuery({ country: 'USA' }))).toContain(
      'country',
    );
  });

  it('rejects an unknown department', () => {
    expect(validationFields(() => parseSalaryInsightsQuery({ department: 'WIZARDRY' }))).toContain(
      'department',
    );
  });

  it('rejects a repeated single-value parameter instead of picking one', () => {
    expect(validationFields(() => parseSalaryInsightsQuery({ country: ['DE', 'US'] }))).toContain(
      'country',
    );
  });

  it('rejects unknown query parameters rather than silently ignoring them', () => {
    expect(validationFields(() => parseSalaryInsightsQuery({ contry: 'DE' }))).toContain('contry');
  });
});
