'use client';

import { useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { useToast } from '@/components/toast-provider';
import { Button } from '@/components/ui/button';
import { getEmployee, getFilterOptions, updateEmployee } from '@/lib/api/employees';
import { diffEmployee, toCreateInput, type EmployeeFormValues } from '@/lib/employees/validation';
import { useApiQuery } from '@/lib/use-api-query';

import { BackToList } from './back-to-list';
import { EmployeeForm } from './employee-form';
import { FormSkeleton } from './form-skeleton';
import { QueryError } from './query-error';

export function EditEmployeePage({ id }: { id: string }) {
  const router = useRouter();
  const { toast } = useToast();
  const fetchEmployee = useCallback((signal: AbortSignal) => getEmployee(id, signal), [id]);
  const employee = useApiQuery(fetchEmployee);
  const options = useApiQuery(getFilterOptions);

  const notFound =
    employee.error && (employee.error.status === 404 || employee.error.status === 400);
  const error = employee.error ?? options.error;

  let body: React.ReactNode;
  if (notFound) {
    body = (
      <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-border px-6 py-14 text-center">
        <h1 className="text-lg font-semibold">Employee not found</h1>
        <Button asChild variant="outline">
          <Link href="/employees">Back to employees</Link>
        </Button>
      </div>
    );
  } else if (error) {
    body = (
      <QueryError
        error={error}
        onRetry={() => {
          if (employee.error) employee.refetch();
          if (options.error) options.refetch();
        }}
      />
    );
  } else if (!employee.data || !options.data) {
    body = <FormSkeleton />;
  } else {
    const current = employee.data;
    const initialValues: EmployeeFormValues = {
      fullName: current.fullName,
      email: current.email,
      countryCode: current.country.code,
      department: current.department,
      jobTitle: current.jobTitle,
      hireDate: current.hireDate,
    };

    body = (
      <>
        <div>
          <h1 className="text-2xl font-semibold">Edit {current.fullName}</h1>
          <p className="mt-1 font-mono text-sm text-muted-foreground">{current.employeeNumber}</p>
        </div>
        <EmployeeForm
          initialValues={initialValues}
          options={options.data}
          submitLabel="Save changes"
          pendingLabel="Saving…"
          cancelHref={`/employees/${id}`}
          onSubmit={async (values) => {
            // PATCH only what changed, so an untouched field can never trip a server rule.
            const patch = diffEmployee(initialValues, toCreateInput(values));
            if (Object.keys(patch).length === 0) {
              toast({ variant: 'info', title: 'No changes to save' });
              return;
            }
            const updated = await updateEmployee(id, patch);
            toast({ variant: 'success', title: `${updated.fullName} was updated` });
            router.push(`/employees/${id}`);
          }}
        />
      </>
    );
  }

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <BackToList />
      {body}
    </div>
  );
}
