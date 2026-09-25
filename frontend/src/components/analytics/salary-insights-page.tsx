'use client';

import { useCallback, useState, type ReactNode } from 'react';

import { QueryError } from '@/components/employees/query-error';
import { Skeleton } from '@/components/ui/skeleton';
import { getSalaryAnalytics, toAnalyticsQuery, type SalaryAnalyticsFilters } from '@/lib/api/analytics';
import { useApiQuery } from '@/lib/use-api-query';
import { cn } from '@/lib/utils';

import { HeadcountTable } from './headcount-table';
import { SalaryFilters } from './salary-filters';
import { SummaryCards } from './summary-cards';

function DashboardSkeleton() {
  return (
    <div role="status" aria-live="polite" className="flex flex-col gap-6">
      <span className="sr-only">Loading salary insights…</span>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {Array.from({ length: 5 }, (_, index) => (
          <Skeleton key={index} className="h-20 w-full" />
        ))}
      </div>
      <Skeleton className="h-64 w-full" />
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3 rounded-lg border border-border p-4">
      <h2 className="text-base font-semibold">{title}</h2>
      {children}
    </section>
  );
}

export function SalaryInsightsPage() {
  const [filters, setFilters] = useState<SalaryAnalyticsFilters>({});

  // A separate, always-unfiltered request drives the filter dropdown options, so the choices
  // available don't shrink to nothing once a filter narrows the main result.
  const fetchBaseline = useCallback((signal: AbortSignal) => getSalaryAnalytics('', signal), []);
  const baseline = useApiQuery(fetchBaseline);

  const query = toAnalyticsQuery(filters);
  const fetchAnalytics = useCallback(
    (signal: AbortSignal) => getSalaryAnalytics(query, signal),
    [query],
  );
  const analytics = useApiQuery(fetchAnalytics);

  const countryOptions = (baseline.data?.headcountByCountry ?? [])
    .map((row) => ({ name: row.country.name, code: row.country.code }))
    .sort((a, b) => a.name.localeCompare(b.name));
  const departmentOptions = (baseline.data?.headcountByDepartment ?? [])
    .map((row) => row.department)
    .sort((a, b) => a.localeCompare(b));

  const isFiltered = Boolean(filters.country || filters.department);
  const data = analytics.data;
console.log("Data",analytics)
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Salary Insights</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Salary analytics are normalized to USD using the organization&apos;s static exchange-rate
          table. Figures are not live foreign-exchange rates.
        </p>
      </div>

      <SalaryFilters
        filters={filters}
        countryOptions={countryOptions}
        departmentOptions={departmentOptions}
        onChange={(patch) => setFilters((prev) => ({ ...prev, ...patch }))}
        onClear={() => setFilters({})}
      />

      {analytics.error ? (
        <QueryError error={analytics.error} onRetry={analytics.refetch} />
      ) : analytics.isInitialLoading || !data ? (
        <DashboardSkeleton />
      ) : data.overall.employeeCount === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-border px-6 py-14 text-center">
          <h2 className="text-lg font-semibold">
            {isFiltered ? 'No employees match your filters' : 'No salary data yet'}
          </h2>
          <p className="max-w-sm text-sm text-muted-foreground">
            {isFiltered
              ? 'Try a different country or department, or clear your filters to see everyone.'
              : 'Salary insights will appear once employees with salary data are added.'}
          </p>
        </div>
      ) : (
        <div
          aria-busy={analytics.isFetching}
          className={cn('flex flex-col gap-6 transition-opacity', analytics.isFetching && 'opacity-60')}
        >
          <SummaryCards overall={data.overall} />

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Section title="Headcount by Country">
              <HeadcountTable
                caption="Number of employees per country."
                groupLabel="Country"
                rows={data.headcountByCountry.map((row) => ({
                  label: row.country.name,
                  count: row.employeeCount,
                }))}
                emptyMessage="No country headcount data available."
              />
            </Section>

            <Section title="Headcount by Department">
              <HeadcountTable
                caption="Number of employees per department."
                groupLabel="Department"
                rows={data.headcountByDepartment.map((row) => ({
                  label: row.department,
                  count: row.employeeCount,
                }))}
                emptyMessage="No department headcount data available."
              />
            </Section>
          </div>
        </div>
      )}
    </div>
  );
}
