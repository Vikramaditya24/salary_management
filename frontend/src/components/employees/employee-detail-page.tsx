'use client';

import { useCallback, useState } from 'react';
import Link from 'next/link';
import { Pencil, Wallet } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { getEmployee, type EmployeeDetail } from '@/lib/api/employees';
import { formatDate, formatDepartment, formatMoney } from '@/lib/format';
import { useApiQuery } from '@/lib/use-api-query';

import { BackToList } from './back-to-list';
import { DeactivateEmployeeDialog } from './deactivate-dialog';
import { QueryError } from './query-error';
import { ReactivateButton } from './reactivate-button';
import { EmployeeStatusBadge } from './status-badge';

function DetailSkeleton() {
  return (
    <div role="status" aria-live="polite" className="flex flex-col gap-4">
      <span className="sr-only">Loading employee…</span>
      <Skeleton className="h-9 w-64" />
      <Skeleton className="h-56 w-full" />
      <Skeleton className="h-28 w-full" />
    </div>
  );
}

function Detail({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-muted-foreground text-xs">{label}</dt>
      <dd className="mt-0.5 text-sm">{children}</dd>
    </div>
  );
}

export function EmployeeDetailPage({ id }: { id: string }) {
  const fetchEmployee = useCallback((signal: AbortSignal) => getEmployee(id, signal), [id]);
  const {
    data: employee,
    error,
    isInitialLoading,
    isFetching,
    refetch,
  } = useApiQuery(fetchEmployee);
  const [deactivating, setDeactivating] = useState(false);

  let body: React.ReactNode;
  if (error && (error.status === 404 || error.status === 400)) {
    body = (
      <div className="border-border flex flex-col items-center gap-3 rounded-lg border border-dashed px-6 py-14 text-center">
        <h1 className="text-lg font-semibold">Employee not found</h1>
        <p className="text-muted-foreground max-w-sm text-sm">
          This employee doesn’t exist or the link is wrong.
        </p>
        <Button asChild variant="outline">
          <Link href="/employees">Back to employees</Link>
        </Button>
      </div>
    );
  } else if (error) {
    body = <QueryError error={error} onRetry={refetch} />;
  } else if (isInitialLoading || !employee) {
    body = <DetailSkeleton />;
  } else {
    body = (
      <div aria-busy={isFetching} className="flex flex-col gap-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-semibold">{employee.fullName}</h1>
              <EmployeeStatusBadge status={employee.employmentStatus} />
            </div>
            <p className="text-muted-foreground mt-1 font-mono text-sm">
              {employee.employeeNumber}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline">
              <Link href={`/employees/${employee.id}/edit`}>
                <Pencil aria-hidden="true" />
                Edit
              </Link>
            </Button>
            {employee.employmentStatus === 'ACTIVE' && (
              <Button asChild>
                <Link href={`/employees/${employee.id}/salary`}>
                  <Wallet aria-hidden="true" />
                  {employee.currentSalary ? 'Change salary' : 'Set salary'}
                </Link>
              </Button>
            )}
            {employee.employmentStatus === 'ACTIVE' ? (
              <Button type="button" variant="destructive" onClick={() => setDeactivating(true)}>
                Deactivate
              </Button>
            ) : (
              <ReactivateButton employee={employee} onReactivated={refetch} />
            )}
          </div>
        </div>

        <ProfileCard employee={employee} />
        <SalaryCard salary={employee.currentSalary} />
        <SalaryHistory history={employee.salaryHistory} />

        {deactivating && (
          <DeactivateEmployeeDialog
            employee={employee}
            onClose={() => setDeactivating(false)}
            onDeactivated={() => {
              setDeactivating(false);
              refetch();
            }}
          />
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <BackToList />
      {body}
    </div>
  );
}

function ProfileCard({ employee }: { employee: EmployeeDetail }) {
  return (
    <section aria-labelledby="profile-heading" className="border-border rounded-lg border p-5">
      <h2 id="profile-heading" className="text-base font-semibold">
        Profile
      </h2>
      <dl className="mt-4 grid gap-x-6 gap-y-4 sm:grid-cols-2">
        <Detail label="Email">
          <a
            href={`mailto:${employee.email}`}
            className="break-all underline-offset-4 hover:underline"
          >
            {employee.email}
          </a>
        </Detail>
        <Detail label="Country">{employee.country.name}</Detail>
        <Detail label="Department">{formatDepartment(employee.department)}</Detail>
        <Detail label="Job title">{employee.jobTitle}</Detail>
        <Detail label="Hire date">{formatDate(employee.hireDate)}</Detail>
        <Detail label="Status">
          {employee.employmentStatus === 'ACTIVE' ? 'Active' : 'Terminated'}
        </Detail>
      </dl>
    </section>
  );
}

function SalaryCard({ salary }: { salary: EmployeeDetail['currentSalary'] }) {
  return (
    <section aria-labelledby="salary-heading" className="border-border rounded-lg border p-5">
      <h2 id="salary-heading" className="text-base font-semibold">
        Current salary
      </h2>
      {salary ? (
        <p className="mt-3">
          <span className="text-2xl font-semibold tabular-nums">
            {formatMoney(salary.amount, salary.currencyCode)}
          </span>{' '}
          <span className="text-muted-foreground text-sm">
            per year · effective {formatDate(salary.effectiveDate)}
          </span>
        </p>
      ) : (
        <p className="text-muted-foreground mt-3 text-sm">
          No salary is on record for this employee.
        </p>
      )}
    </section>
  );
}

function SalaryHistory({ history }: { history: EmployeeDetail['salaryHistory'] }) {
  return (
    <section aria-labelledby="history-heading" className="border-border rounded-lg border p-5">
      <h2 id="history-heading" className="text-base font-semibold">
        Salary history
      </h2>
      {history.length === 0 ? (
        <p className="text-muted-foreground mt-3 text-sm">No salary history yet.</p>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-muted-foreground border-b text-xs">
              <tr>
                <th scope="col" className="pb-3 font-medium">
                  Effective
                </th>
                <th scope="col" className="pb-3 font-medium">
                  Until
                </th>
                <th scope="col" className="pb-3 text-right font-medium">
                  Annual salary
                </th>
              </tr>
            </thead>
            <tbody>
              {history.map((entry) => (
                <tr key={entry.id} className="border-b last:border-0">
                  <td className="py-3">{formatDate(entry.effectiveDate)}</td>
                  <td className="py-3">
                    {entry.endDate ? (
                      formatDate(entry.endDate)
                    ) : (
                      <span className="text-foreground font-medium">Current</span>
                    )}
                  </td>
                  <td className="py-3 text-right font-medium tabular-nums">
                    {formatMoney(entry.amount, entry.currencyCode)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="text-muted-foreground mt-3 text-xs">
            Until dates are exclusive; the next salary begins on that date.
          </p>
        </div>
      )}
    </section>
  );
}
