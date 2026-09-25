'use client';

import { useCallback, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Plus } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { getFilterOptions, listEmployees, type Employee, type SortField } from '@/lib/api/employees';
import {
  clearFilters,
  hasActiveFilters,
  parseListState,
  toApiQuery,
  toUrlQuery,
  type ListState,
} from '@/lib/employees/list-params';
import { formatCount } from '@/lib/format';
import { useApiQuery } from '@/lib/use-api-query';
import { cn } from '@/lib/utils';

import { DeactivateEmployeeDialog } from './deactivate-dialog';
import { EmployeeFilters, type FilterPatch } from './employee-filters';
import { EmployeeTable } from './employee-table';
import { Pagination } from './pagination';
import { QueryError } from './query-error';

export function ListSkeleton() {
  return (
    <div role="status" aria-live="polite" className="flex flex-col gap-3">
      <span className="sr-only">Loading employees…</span>
      {Array.from({ length: 8 }, (_, index) => (
        <Skeleton key={index} className="h-14 w-full" />
      ))}
    </div>
  );
}

export function EmployeeListPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [deactivating, setDeactivating] = useState<Employee | null>(null);

  // The URL is the single source of truth for what the list shows.
  const state = parseListState(searchParams);
  const apiQuery = toApiQuery(state);

  const fetchList = useCallback((signal: AbortSignal) => listEmployees(apiQuery, signal), [apiQuery]);
  const list = useApiQuery(fetchList);
  const options = useApiQuery(getFilterOptions);

  const navigate = useCallback(
    (next: ListState, mode: 'push' | 'replace' = 'push') => {
      const query = toUrlQuery(next);
      router[mode](query ? `${pathname}?${query}` : pathname, { scroll: false });
    },
    [router, pathname],
  );

  // Any change to filters, sort or page size returns to page 1.
  const change = (patch: Partial<ListState>) => navigate({ ...state, page: 1, ...patch });

  const handleFilterChange = (patch: FilterPatch) => change(patch);
  const handleSearch = useCallback(
    (q: string) => navigate({ ...parseListState(searchParams), page: 1, q }, 'replace'),
    [navigate, searchParams],
  );
  const handleSort = (field: SortField) =>
    change(
      state.sortBy === field
        ? { sortOrder: state.sortOrder === 'asc' ? 'desc' : 'asc' }
        : { sortBy: field, sortOrder: 'asc' },
    );

  const filtered = hasActiveFilters(state);
  const employees = list.data?.data;
  const meta = list.data?.meta;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Employees</h1>
          <p className="mt-1 text-sm text-muted-foreground" aria-live="polite">
            {meta
              ? `${formatCount(meta.totalItems)} ${filtered ? 'matching ' : ''}${
                  meta.totalItems === 1 ? 'employee' : 'employees'
                }`
              : '\u00a0'}
          </p>
        </div>
        <Button asChild>
          <Link href="/employees/new">
            <Plus aria-hidden="true" />
            Add employee
          </Link>
        </Button>
      </div>

      <EmployeeFilters
        state={state}
        options={options.data}
        onChange={handleFilterChange}
        onSearch={handleSearch}
        onClear={() => navigate(clearFilters(state))}
      />

      {list.error ? (
        <QueryError error={list.error} onRetry={list.refetch} />
      ) : list.isInitialLoading || !employees || !meta ? (
        <ListSkeleton />
      ) : employees.length === 0 ? (
        <EmptyState
          pageOutOfRange={meta.totalItems > 0}
          filtered={filtered}
          page={state.page}
          lastPage={meta.totalPages}
          onLastPage={() => navigate({ ...state, page: meta.totalPages })}
          onClear={() => navigate(clearFilters(state))}
        />
      ) : (
        <div
          aria-busy={list.isFetching}
          className={cn('flex flex-col gap-4 transition-opacity', list.isFetching && 'opacity-60')}
        >
          <div className="rounded-lg border border-border">
            <EmployeeTable
              employees={employees}
              sortBy={state.sortBy}
              sortOrder={state.sortOrder}
              onSort={handleSort}
              onDeactivate={setDeactivating}
              onReactivated={list.refetch}
            />
          </div>
          <Pagination
            meta={meta}
            count={employees.length}
            onPageChange={(page) => navigate({ ...state, page })}
            onPageSizeChange={(pageSize) => change({ pageSize })}
          />
        </div>
      )}

      {deactivating && (
        <DeactivateEmployeeDialog
          key={deactivating.id}
          employee={deactivating}
          onClose={() => setDeactivating(null)}
          onDeactivated={() => {
            setDeactivating(null);
            list.refetch();
          }}
        />
      )}
    </div>
  );
}

function EmptyState({
  pageOutOfRange,
  filtered,
  page,
  lastPage,
  onLastPage,
  onClear,
}: {
  pageOutOfRange: boolean;
  filtered: boolean;
  page: number;
  lastPage: number;
  onLastPage: () => void;
  onClear: () => void;
}) {
  let title: string;
  let body: string;
  let action: React.ReactNode;

  if (pageOutOfRange) {
    title = `Page ${formatCount(page)} doesn’t exist`;
    body = `There are only ${formatCount(lastPage)} pages of results.`;
    action = (
      <Button type="button" onClick={onLastPage}>
        Go to last page
      </Button>
    );
  } else if (filtered) {
    title = 'No employees match your filters';
    body = 'Try a different search, or remove some filters to see more people.';
    action = (
      <Button type="button" variant="outline" onClick={onClear}>
        Clear filters
      </Button>
    );
  } else {
    title = 'No employees yet';
    body = 'Add the first employee to get started.';
    action = (
      <Button asChild>
        <Link href="/employees/new">Add employee</Link>
      </Button>
    );
  }

  return (
    <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-border px-6 py-14 text-center">
      <h2 className="text-lg font-semibold">{title}</h2>
      <p className="max-w-sm text-sm text-muted-foreground">{body}</p>
      {action}
    </div>
  );
}
