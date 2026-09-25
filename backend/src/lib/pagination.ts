export interface PaginationMeta {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

/**
 * Pagination metadata the UI needs to render a pager.
 *
 * A page number past the last page is not an error: it yields an empty result
 * with accurate totals, so a UI whose filters just shrank the result set can
 * recover (e.g. jump back to `totalPages`) without handling a 4xx.
 */
export function buildPaginationMeta(input: {
  page: number;
  pageSize: number;
  totalItems: number;
}): PaginationMeta {
  const { page, pageSize, totalItems } = input;
  const totalPages = totalItems === 0 ? 0 : Math.ceil(totalItems / pageSize);
  return {
    page,
    pageSize,
    totalItems,
    totalPages,
    hasNextPage: page < totalPages,
    hasPreviousPage: page > 1,
  };
}

export function toSkipTake(input: { page: number; pageSize: number }): {
  skip: number;
  take: number;
} {
  return { skip: (input.page - 1) * input.pageSize, take: input.pageSize };
}
