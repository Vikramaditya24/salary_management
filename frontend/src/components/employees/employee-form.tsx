'use client';

import { useId, useState } from 'react';
import Link from 'next/link';

import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';
import { toApiError, type ApiError } from '@/lib/api/client';
import type { FilterOptions } from '@/lib/api/employees';
import {
  FIELD_ORDER,
  todayIso,
  validateEmployeeForm,
  type EmployeeField,
  type EmployeeFormValues,
  type FormErrors,
} from '@/lib/employees/validation';
import { formatDepartment } from '@/lib/format';

import { FormField } from './form-field';

interface EmployeeFormProps {
  initialValues: EmployeeFormValues;
  options: FilterOptions;
  submitLabel: string;
  pendingLabel: string;
  cancelHref: string;
  /** Receives trimmed/normalised-ready values; throw (an ApiError) to surface server errors. */
  onSubmit: (values: EmployeeFormValues) => Promise<void>;
}

interface ServerFeedback {
  fieldErrors: FormErrors;
  message: string | null;
}

const isField = (name: string): name is EmployeeField => (FIELD_ORDER as string[]).includes(name);

/** Maps the API's error contract (docs/api.md) onto form fields, with a banner for the rest. */
function readServerFeedback(error: ApiError): ServerFeedback {
  const fieldErrors: FormErrors = {};
  let message: string | null = null;

  if (error.code === 'EMAIL_ALREADY_EXISTS') {
    fieldErrors.email = 'An employee with this email address already exists.';
  } else if (error.code === 'HIRE_DATE_IN_FUTURE') {
    fieldErrors.hireDate = 'Hire date cannot be in the future.';
  } else if (error.code === 'COUNTRY_NOT_FOUND') {
    fieldErrors.countryCode = 'This country is not available. Choose another.';
  } else if (error.code === 'VALIDATION_ERROR' && error.details.length > 0) {
    for (const detail of error.details) {
      if (isField(detail.field)) fieldErrors[detail.field] ??= detail.message;
      else message = detail.message;
    }
  } else {
    message = error.message;
  }
  return { fieldErrors, message };
}

export function EmployeeForm({
  initialValues,
  options,
  submitLabel,
  pendingLabel,
  cancelHref,
  onSubmit,
}: EmployeeFormProps) {
  const formId = useId();
  const jobTitleListId = `${formId}-job-titles`;
  const idFor = (field: EmployeeField) => `${formId}-${field}`;

  const [values, setValues] = useState<EmployeeFormValues>(initialValues);
  const [errors, setErrors] = useState<FormErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function setValue(field: EmployeeField, value: string) {
    setValues((current) => ({ ...current, [field]: value }));
    // Editing a field clears its own error; the rest are re-checked on the next submit.
    if (errors[field]) setErrors((current) => ({ ...current, [field]: undefined }));
  }

  function focusFirstInvalid(found: FormErrors) {
    const first = FIELD_ORDER.find((field) => found[field]);
    if (first) document.getElementById(idFor(first))?.focus();
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;

    const found = validateEmployeeForm(values, todayIso());
    const hasErrors = Object.values(found).some(Boolean);
    setErrors(found);
    setFormError(null);
    if (hasErrors) {
      focusFirstInvalid(found);
      return;
    }

    setSubmitting(true);
    try {
      await onSubmit(values);
    } catch (err) {
      const feedback = readServerFeedback(toApiError(err));
      setErrors(feedback.fieldErrors);
      setFormError(feedback.message);
      focusFirstInvalid(feedback.fieldErrors);
    } finally {
      setSubmitting(false);
    }
  }

  const errorCount = Object.values(errors).filter(Boolean).length;

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-6">
      {formError && <Alert variant="destructive">{formError}</Alert>}
      {errorCount > 0 && (
        <Alert variant="destructive">
          {errorCount === 1
            ? 'Please fix 1 field below.'
            : `Please fix ${errorCount} fields below.`}
        </Alert>
      )}

      <div className="grid gap-5 sm:grid-cols-2">
        <FormField id={idFor('fullName')} label="Full name" required error={errors.fullName}>
          {(control) => (
            <Input
              {...control}
              name="fullName"
              autoComplete="off"
              maxLength={120}
              value={values.fullName}
              onChange={(event) => setValue('fullName', event.target.value)}
            />
          )}
        </FormField>

        <FormField id={idFor('email')} label="Email" required error={errors.email}>
          {(control) => (
            <Input
              {...control}
              name="email"
              type="email"
              autoComplete="off"
              maxLength={160}
              value={values.email}
              onChange={(event) => setValue('email', event.target.value)}
            />
          )}
        </FormField>

        <FormField id={idFor('countryCode')} label="Country" required error={errors.countryCode}>
          {(control) => (
            <Select
              {...control}
              name="countryCode"
              value={values.countryCode}
              onChange={(event) => setValue('countryCode', event.target.value)}
            >
              <option value="">Select a country</option>
              {options.countries.map((country) => (
                <option key={country.code} value={country.code}>
                  {country.name}
                </option>
              ))}
            </Select>
          )}
        </FormField>

        <FormField id={idFor('department')} label="Department" required error={errors.department}>
          {(control) => (
            <Select
              {...control}
              name="department"
              value={values.department}
              onChange={(event) => setValue('department', event.target.value)}
            >
              <option value="">Select a department</option>
              {options.departments.map((department) => (
                <option key={department} value={department}>
                  {formatDepartment(department)}
                </option>
              ))}
            </Select>
          )}
        </FormField>

        <FormField
          id={idFor('jobTitle')}
          label="Job title"
          required
          hint="Pick an existing title or type a new one."
          error={errors.jobTitle}
        >
          {(control) => (
            <>
              <Input
                {...control}
                name="jobTitle"
                list={jobTitleListId}
                autoComplete="off"
                maxLength={80}
                value={values.jobTitle}
                onChange={(event) => setValue('jobTitle', event.target.value)}
              />
              <datalist id={jobTitleListId}>
                {options.jobTitles.map((title) => (
                  <option key={title} value={title} />
                ))}
              </datalist>
            </>
          )}
        </FormField>

        <FormField id={idFor('hireDate')} label="Hire date" required error={errors.hireDate}>
          {(control) => (
            <Input
              {...control}
              name="hireDate"
              type="date"
              max={todayIso()}
              value={values.hireDate}
              onChange={(event) => setValue('hireDate', event.target.value)}
            />
          )}
        </FormField>
      </div>

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button asChild variant="outline">
          <Link href={cancelHref}>Cancel</Link>
        </Button>
        <Button type="submit" disabled={submitting}>
          {submitting && <Spinner />}
          {submitting ? pendingLabel : submitLabel}
        </Button>
      </div>
    </form>
  );
}
