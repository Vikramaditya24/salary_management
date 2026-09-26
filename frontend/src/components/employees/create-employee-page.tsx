'use client';

import { useRouter } from 'next/navigation';

import { useToast } from '@/components/toast-provider';
import { createEmployee, getFilterOptions } from '@/lib/api/employees';
import { EMPTY_FORM_VALUES, toCreateInput } from '@/lib/employees/validation';
import { useApiQuery } from '@/lib/use-api-query';

import { BackToList } from './back-to-list';
import { EmployeeForm } from './employee-form';
import { FormSkeleton } from './form-skeleton';
import { QueryError } from './query-error';

export function CreateEmployeePage() {
  const router = useRouter();
  const { toast } = useToast();
  const options = useApiQuery(getFilterOptions);

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <BackToList />
      <div>
        <h1 className="text-2xl font-semibold">Add employee</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          The employee number is assigned automatically. Salary is recorded separately.
        </p>
      </div>

      {options.error ? (
        <QueryError error={options.error} onRetry={options.refetch} />
      ) : !options.data ? (
        <FormSkeleton />
      ) : (
        <EmployeeForm
          initialValues={EMPTY_FORM_VALUES}
          options={options.data}
          submitLabel="Create employee"
          pendingLabel="Creating…"
          cancelHref="/employees"
          onSubmit={async (values) => {
            const created = await createEmployee(toCreateInput(values));
            toast({
              variant: 'success',
              title: `${created.fullName} was added`,
              description: `Employee number ${created.employeeNumber}.`,
            });
            router.push(`/employees/${created.id}`);
          }}
        />
      )}
    </div>
  );
}
