'use client';

import { useCallback, useState, type ReactNode } from 'react';

import { QueryError } from '@/components/employees/query-error';
import { Skeleton } from '@/components/ui/skeleton';
import {
  getSalaryAnalytics,
  toAnalyticsQuery,
  type SalaryAnalyticsFilters,
} from '@/lib/api/analytics';
import { getReference } from '@/lib/api/reference';
import { formatDepartment } from '@/lib/format';
import { useApiQuery } from '@/lib/use-api-query';
import { cn } from '@/lib/utils';

import { ComparisonChart } from './comparison-chart';
import { DistributionChart } from './distribution-chart';
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
    <section className="border-border bg-card flex min-w-0 flex-col gap-3 rounded-2xl border p-4 shadow-sm sm:p-6">
      <h2 className="text-base font-semibold">{title}</h2>
      {children}
    </section>
  );
}

export function SalaryInsightsPage() {
  const [filters, setFilters] = useState<SalaryAnalyticsFilters>({});

  const reference = useApiQuery(getReference);

  const query = toAnalyticsQuery(filters);
  const fetchAnalytics = useCallback(
    (signal: AbortSignal) => getSalaryAnalytics(query, signal),
    [query],
  );
  const analytics = useApiQuery(fetchAnalytics);

  const countryOptions = reference.data?.countries ?? [];
  const departmentOptions = reference.data?.departments ?? [];

  const isFiltered = Boolean(filters.country || filters.department);
  const data = analytics.data;

  return (
    <div className="flex min-w-0 flex-col gap-6">
      <div className="rounded-3xl bg-[#e9fff4] p-5 sm:p-8">
        <p className="text-primary mb-2 text-xs font-bold tracking-[0.18em] uppercase">
          Compensation overview
        </p>
        <h1 className="text-2xl font-semibold">Salary Insights</h1>
        <p className="text-muted-foreground mt-1 text-sm">
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

      {reference.error && <QueryError error={reference.error} onRetry={reference.refetch} />}
      {analytics.error ? (
        <QueryError error={analytics.error} onRetry={analytics.refetch} />
      ) : analytics.isInitialLoading || !data ? (
        <DashboardSkeleton />
      ) : (
        <div
          aria-busy={analytics.isFetching}
          className={cn(
            'flex flex-col gap-6 transition-opacity',
            analytics.isFetching && 'opacity-60',
          )}
        >
          <SummaryCards overall={data.overall} />
          {data.overall.employeeCount === 0 && (
            <div className="border-border rounded-lg border border-dashed p-8 text-center">
              <h2 className="font-semibold">
                {isFiltered ? 'No paid employees match your filters' : 'No salary data yet'}
              </h2>
              <p className="text-muted-foreground mt-2 text-sm">
                {isFiltered
                  ? 'Adjust the country or department to explore another group.'
                  : 'Add a salary to an active employee to populate compensation insights.'}
              </p>
            </div>
          )}

          {data.overall.employeeCount > 0 && (
            <>
              <div className="grid gap-4 lg:grid-cols-2">
                <Section title="By country">
                  <ComparisonChart
                    label="Countries"
                    rows={data.headcountByCountry.map((row) => ({
                      label: row.country.name,
                      count: row.employeeCount,
                      averageSalaryUsd: row.averageSalaryUsd,
                    }))}
                  />
                </Section>
                <Section title="By department">
                  <ComparisonChart
                    label="Departments"
                    rows={data.headcountByDepartment.map((row) => ({
                      label: formatDepartment(row.department),
                      count: row.employeeCount,
                      averageSalaryUsd: row.averageSalaryUsd,
                    }))}
                  />
                </Section>
              </div>
              <div className="grid gap-4 lg:grid-cols-2">
                <Section title="By role">
                  <ComparisonChart
                    label="Roles"
                    initialMetric="salary"
                    rows={data.salaryByRole.map((row) => ({
                      label: row.jobTitle,
                      count: row.employeeCount,
                      averageSalaryUsd: row.averageSalaryUsd,
                    }))}
                  />
                </Section>
                <Section title="Salary distribution">
                  <DistributionChart bands={data.distribution} />
                </Section>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
