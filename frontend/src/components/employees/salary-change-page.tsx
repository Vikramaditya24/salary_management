'use client';

import { useCallback, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/toast-provider';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { getEmployee } from '@/lib/api/employees';
import { getReference } from '@/lib/api/reference';
import { changeSalary } from '@/lib/api/salary';
import { toApiError } from '@/lib/api/client';
import { formatDate, formatMoney } from '@/lib/format';
import { isRealCalendarDate, todayIso } from '@/lib/employees/validation';
import { useApiQuery } from '@/lib/use-api-query';
import { FormField } from './form-field';
import { FormSkeleton } from './form-skeleton';
import { QueryError } from './query-error';

export function SalaryChangePage({ id }: { id: string }) {
  const router = useRouter();
  const { toast } = useToast();
  const fetchEmployee = useCallback((signal: AbortSignal) => getEmployee(id, signal), [id]);
  const employee = useApiQuery(fetchEmployee);
  const reference = useApiQuery(getReference);
  const [amount, setAmount] = useState('');
  const [currencyCode, setCurrencyCode] = useState('');
  const [effectiveDate, setEffectiveDate] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (pending || !employee.data || !reference.data) return;
    const next: Record<string, string> = {};
    if (!/^[1-9]\d{0,11}(?:\.\d{1,2})?$/.test(amount))
      next.amount = 'Enter a positive amount with at most two decimal places.';
    const currency = reference.data.currencies.find((item) => item.code === currencyCode);
    if (!currency) next.currencyCode = 'Select a currency.';
    else if (!next.amount && (amount.split('.')[1]?.length ?? 0) > currency.minorUnit)
      next.amount = `This currency accepts ${currency.minorUnit} decimal places.`;
    if (!isRealCalendarDate(effectiveDate)) next.effectiveDate = 'Enter a valid date.';
    else if (effectiveDate < employee.data.hireDate || effectiveDate > todayIso())
      next.effectiveDate = 'Choose a date from the hire date through today.';
    else if (
      employee.data.currentSalary &&
      effectiveDate <= employee.data.currentSalary.effectiveDate
    )
      next.effectiveDate = 'Choose a date after the current salary took effect.';
    setErrors(next);
    if (Object.keys(next).length) return;
    setPending(true);
    setError('');
    try {
      await changeSalary(id, { amount, currencyCode, effectiveDate });
      toast({
        variant: 'success',
        title: 'Salary recorded',
        description: 'The employee record and history are updated.',
      });
      router.push(`/employees/${id}`);
    } catch (failure) {
      const apiError = toApiError(failure);
      const fieldErrors: Record<string, string> = {};
      for (const detail of apiError.details)
        if (['amount', 'currencyCode', 'effectiveDate'].includes(detail.field))
          fieldErrors[detail.field] = detail.message;
      if (apiError.code === 'INVALID_MINOR_UNITS') fieldErrors.amount = apiError.message;
      if (apiError.code === 'CURRENCY_NOT_FOUND') fieldErrors.currencyCode = apiError.message;
      if (
        [
          'EFFECTIVE_DATE_CONFLICT',
          'EFFECTIVE_DATE_IN_FUTURE',
          'EFFECTIVE_DATE_BEFORE_HIRE',
        ].includes(apiError.code)
      )
        fieldErrors.effectiveDate = apiError.message;
      setErrors(fieldErrors);
      setError(Object.keys(fieldErrors).length ? '' : apiError.message);
    } finally {
      setPending(false);
    }
  }

  const problem = employee.error ?? reference.error;
  if (problem)
    return (
      <QueryError
        error={problem}
        onRetry={() => {
          employee.refetch();
          reference.refetch();
        }}
      />
    );
  if (!employee.data || !reference.data) return <FormSkeleton />;
  const person = employee.data;
  if (person.employmentStatus !== 'ACTIVE')
    return (
      <div className="space-y-3">
        <h1 className="text-xl font-semibold">Salary changes unavailable</h1>
        <p className="text-muted-foreground text-sm">
          Reactivate this employee before changing their salary.
        </p>
        <Link className="underline" href={`/employees/${id}`}>
          Back to employee
        </Link>
      </div>
    );
  const currencies = reference.data.currencies;
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Link
        href={`/employees/${id}`}
        className="text-muted-foreground text-sm underline-offset-4 hover:underline"
      >
        ← Back to {person.fullName}
      </Link>
      <div>
        <h1 className="text-2xl font-semibold">
          {person.currentSalary ? 'Change salary' : 'Set initial salary'}
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          {person.fullName} · {person.employeeNumber}
        </p>
      </div>
      {person.currentSalary && (
        <div className="border-border bg-muted/30 rounded-lg border p-4">
          <p className="text-muted-foreground text-xs">Current annual salary</p>
          <p className="mt-1 text-lg font-semibold tabular-nums">
            {formatMoney(person.currentSalary.amount, person.currentSalary.currencyCode)}
          </p>
          <p className="text-muted-foreground text-xs">
            Effective {formatDate(person.currentSalary.effectiveDate)}
          </p>
        </div>
      )}
      <form noValidate onSubmit={submit} className="border-border space-y-5 rounded-lg border p-5">
        {error && (
          <Alert variant="destructive" role="alert">
            {error}
          </Alert>
        )}
        <FormField id="salary-amount" label="Annual amount" required error={errors.amount}>
          {(control) => (
            <Input
              {...control}
              inputMode="decimal"
              name="amount"
              placeholder="e.g. 120000.00"
              value={amount}
              onChange={(event) => {
                setAmount(event.target.value);
                setErrors((current) => ({ ...current, amount: '' }));
              }}
            />
          )}
        </FormField>
        <FormField id="salary-currency" label="Currency" required error={errors.currencyCode}>
          {(control) => (
            <Select
              {...control}
              name="currencyCode"
              value={currencyCode}
              onChange={(event) => {
                setCurrencyCode(event.target.value);
                setErrors((current) => ({ ...current, currencyCode: '' }));
              }}
            >
              <option value="">Select a currency</option>
              {currencies.map((item) => (
                <option key={item.code} value={item.code}>
                  {item.code} · {item.name}
                </option>
              ))}
            </Select>
          )}
        </FormField>
        <FormField id="salary-date" label="Effective date" required error={errors.effectiveDate}>
          {(control) => (
            <Input
              {...control}
              name="effectiveDate"
              type="date"
              min={person.currentSalary?.effectiveDate ?? person.hireDate}
              max={todayIso()}
              value={effectiveDate}
              onChange={(event) => {
                setEffectiveDate(event.target.value);
                setErrors((current) => ({ ...current, effectiveDate: '' }));
              }}
            />
          )}
        </FormField>
        <p className="text-muted-foreground text-xs">
          A new entry closes the current salary on this date. The previous amount stays in salary
          history.
        </p>
        <div className="flex justify-end gap-2">
          <Button asChild variant="outline">
            <Link href={`/employees/${id}`}>Cancel</Link>
          </Button>
          <Button type="submit" disabled={pending}>
            {pending ? 'Saving…' : 'Save salary'}
          </Button>
        </div>
      </form>
    </div>
  );
}
