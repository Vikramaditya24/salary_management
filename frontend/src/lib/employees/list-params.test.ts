import { describe, expect, it } from 'vitest';

import {
  DEFAULT_LIST_STATE,
  clearFilters,
  hasActiveFilters,
  parseListState,
  toApiQuery,
  toUrlQuery,
} from './list-params';

const parse = (search: string) => parseListState(new URLSearchParams(search));

describe('parseListState', () => {
  it('returns the defaults for an empty URL', () => {
    expect(parse('')).toEqual(DEFAULT_LIST_STATE);
  });

  it('reads filters, sort and paging from the URL', () => {
    const state = parse(
      'q=ada+lovelace&country=de&country=US&department=ENGINEERING,SALES&jobTitle=Director%2C+Sales&status=ALL&sortBy=hireDate&sortOrder=desc&page=3&pageSize=50',
    );
    expect(state).toEqual({
      q: 'ada lovelace',
      countries: ['DE', 'US'],
      departments: ['ENGINEERING', 'SALES'],
      jobTitles: ['Director, Sales'],
      status: 'ALL',
      sortBy: 'hireDate',
      sortOrder: 'desc',
      page: 3,
      pageSize: 50,
    });
  });

  it('falls back to defaults for invalid values instead of sending them to the API', () => {
    const state = parse(
      'page=0&pageSize=7&status=NOPE&sortBy=salary&sortOrder=up&country=Germany&department=WIZARDRY',
    );
    expect(state).toEqual(DEFAULT_LIST_STATE);
    expect(parse('page=abc').page).toBe(1);
    expect(parse('page=99999').page).toBe(1);
  });

  it('caps search text to what the API accepts', () => {
    expect(parse('q=a+b+c+d+e+f+g+h').q).toBe('a b c d e f');
    expect(parse(`q=${'x'.repeat(150)}`).q).toHaveLength(100);
  });

  it('de-duplicates repeated filter values', () => {
    expect(parse('country=DE&country=DE,de').countries).toEqual(['DE']);
  });
});

describe('toApiQuery / toUrlQuery', () => {
  it('sends every param explicitly to the API', () => {
    const query = new URLSearchParams(toApiQuery(DEFAULT_LIST_STATE));
    expect(Object.fromEntries(query)).toEqual({
      status: 'ACTIVE',
      sortBy: 'fullName',
      sortOrder: 'asc',
      page: '1',
      pageSize: '25',
    });
  });

  it('repeats multi-value params rather than joining them', () => {
    const query = new URLSearchParams(
      toApiQuery({
        ...DEFAULT_LIST_STATE,
        countries: ['DE', 'US'],
        jobTitles: ['Director, Sales'],
      }),
    );
    expect(query.getAll('country')).toEqual(['DE', 'US']);
    expect(query.getAll('jobTitle')).toEqual(['Director, Sales']);
  });

  it('omits defaults from the browser URL', () => {
    expect(toUrlQuery(DEFAULT_LIST_STATE)).toBe('');
    expect(toUrlQuery({ ...DEFAULT_LIST_STATE, page: 2, q: 'ada' })).toBe('q=ada&page=2');
  });

  it('round-trips through the URL', () => {
    const state = {
      ...DEFAULT_LIST_STATE,
      q: 'ada',
      countries: ['DE'],
      departments: ['SALES' as const],
      jobTitles: ['Director, Sales'],
      status: 'TERMINATED' as const,
      sortBy: 'country' as const,
      sortOrder: 'desc' as const,
      page: 4,
      pageSize: 100,
    };
    expect(parse(toUrlQuery(state))).toEqual(state);
  });
});

describe('filters', () => {
  it('detects active filters, treating a non-default status as one', () => {
    expect(hasActiveFilters(DEFAULT_LIST_STATE)).toBe(false);
    expect(hasActiveFilters({ ...DEFAULT_LIST_STATE, q: 'x' })).toBe(true);
    expect(hasActiveFilters({ ...DEFAULT_LIST_STATE, status: 'ALL' })).toBe(true);
    expect(hasActiveFilters({ ...DEFAULT_LIST_STATE, page: 5, sortBy: 'country' })).toBe(false);
  });

  it('clearing filters keeps sort and page size but returns to page 1', () => {
    const cleared = clearFilters({
      ...DEFAULT_LIST_STATE,
      q: 'x',
      countries: ['DE'],
      status: 'ALL',
      page: 6,
      pageSize: 50,
      sortBy: 'hireDate',
      sortOrder: 'desc',
    });
    expect(cleared).toEqual({
      ...DEFAULT_LIST_STATE,
      pageSize: 50,
      sortBy: 'hireDate',
      sortOrder: 'desc',
    });
  });
});
