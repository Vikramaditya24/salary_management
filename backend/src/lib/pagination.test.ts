import { describe, it, expect } from 'vitest';
import { buildPaginationMeta, toSkipTake } from './pagination.js';

describe('buildPaginationMeta', () => {
  it('describes a middle page', () => {
    expect(buildPaginationMeta({ page: 2, pageSize: 25, totalItems: 100 })).toEqual({
      page: 2,
      pageSize: 25,
      totalItems: 100,
      totalPages: 4,
      hasNextPage: true,
      hasPreviousPage: true,
    });
  });

  it('rounds the page count up when the last page is partial', () => {
    const meta = buildPaginationMeta({ page: 3, pageSize: 25, totalItems: 51 });
    expect(meta.totalPages).toBe(3);
    expect(meta.hasNextPage).toBe(false);
  });

  it('handles an exact multiple of the page size', () => {
    expect(buildPaginationMeta({ page: 1, pageSize: 10, totalItems: 10 }).totalPages).toBe(1);
  });

  it('reports zero pages for an empty result', () => {
    const meta = buildPaginationMeta({ page: 1, pageSize: 25, totalItems: 0 });
    expect(meta.totalPages).toBe(0);
    expect(meta.hasNextPage).toBe(false);
    expect(meta.hasPreviousPage).toBe(false);
  });

  it('does not treat a page past the end as an error', () => {
    const meta = buildPaginationMeta({ page: 9, pageSize: 25, totalItems: 30 });
    expect(meta.totalPages).toBe(2);
    expect(meta.hasNextPage).toBe(false);
    expect(meta.hasPreviousPage).toBe(true);
  });
});

describe('toSkipTake', () => {
  it('converts a 1-based page into an offset', () => {
    expect(toSkipTake({ page: 1, pageSize: 25 })).toEqual({ skip: 0, take: 25 });
    expect(toSkipTake({ page: 4, pageSize: 100 })).toEqual({ skip: 300, take: 100 });
  });
});
