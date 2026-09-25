import type { Prisma } from '../generated/prisma/index.js';
import type { ListEmployeesQuery } from './schemas.js';
import type { SortField, SortOrder } from './constants.js';

/** Splits search text into distinct, whitespace-separated terms. */
export function tokenizeSearch(search: string | undefined): string[] {
  if (!search) return [];
  const seen = new Set<string>();
  const tokens: string[] = [];
  for (const raw of search.split(/\s+/)) {
    const key = raw.toLowerCase();
    if (raw !== '' && !seen.has(key)) {
      seen.add(key);
      tokens.push(raw);
    }
  }
  return tokens;
}

/**
 * Builds the Prisma `where` for the list endpoint.
 *
 * Filters are ANDed together. Within one filter, multiple values are ORed
 * (`department IN (...)`). Search is "every word must match somewhere":
 * each token has to appear (case-insensitively) in the name, email, or
 * employee number, so "smith john" finds "John Smith".
 */
export function buildEmployeeWhere(query: ListEmployeesQuery): Prisma.EmployeeWhereInput {
  const where: Prisma.EmployeeWhereInput = {};

  if (query.status !== 'ALL') where.employmentStatus = query.status;
  if (query.countries) where.countryCode = { in: query.countries };
  if (query.departments) where.department = { in: query.departments };
  if (query.jobTitles) where.jobTitle = { in: query.jobTitles };

  const tokens = tokenizeSearch(query.search);
  if (tokens.length > 0) {
    where.AND = tokens.map((token) => ({
      OR: [
        { fullName: { contains: token, mode: 'insensitive' as const } },
        { email: { contains: token, mode: 'insensitive' as const } },
        { employeeNumber: { contains: token, mode: 'insensitive' as const } },
      ],
    }));
  }

  return where;
}

const ORDER_BY: Record<
  SortField,
  (direction: SortOrder) => Prisma.EmployeeOrderByWithRelationInput
> = {
  fullName: (direction) => ({ fullName: direction }),
  employeeNumber: (direction) => ({ employeeNumber: direction }),
  hireDate: (direction) => ({ hireDate: direction }),
  department: (direction) => ({ department: direction }),
  jobTitle: (direction) => ({ jobTitle: direction }),
  country: (direction) => ({ countryCode: direction }),
};

/**
 * Sort is whitelisted (there is no way to sort by salary or an arbitrary
 * column), and always ends with `id` as a tie-breaker. Without it, rows with
 * equal sort keys (many employees share a name) have no defined order, so
 * offset pagination could repeat or skip rows between pages.
 */
export function buildOrderBy(
  query: Pick<ListEmployeesQuery, 'sortBy' | 'sortOrder'>,
): Prisma.EmployeeOrderByWithRelationInput[] {
  return [ORDER_BY[query.sortBy](query.sortOrder), { id: 'asc' }];
}
