import { DEPARTMENTS, type CreateEmployeeInput } from '@/lib/api/employees';

/** Form values are all strings; `department` is '' until chosen. */
export interface EmployeeFormValues {
  fullName: string;
  email: string;
  countryCode: string;
  department: string;
  jobTitle: string;
  hireDate: string;
}

export type EmployeeField = keyof EmployeeFormValues;
export type FormErrors = Partial<Record<EmployeeField, string>>;

/** Top-to-bottom visual order; used to focus the first invalid field. */
export const FIELD_ORDER: EmployeeField[] = [
  'fullName',
  'email',
  'countryCode',
  'department',
  'jobTitle',
  'hireDate',
];

export const EMPTY_FORM_VALUES: EmployeeFormValues = {
  fullName: '',
  email: '',
  countryCode: '',
  department: '',
  jobTitle: '',
  hireDate: '',
};

// Same rules as backend/src/employees/schemas.ts - the server stays the authority.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ISO_DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
const EARLIEST_HIRE_DATE = '1900-01-01';

export function isRealCalendarDate(value: string): boolean {
  const match = ISO_DATE_RE.exec(value);
  if (!match) return false;
  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
  );
}

/** Today's date in the viewer's time zone as YYYY-MM-DD. */
export function todayIso(now: Date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

export function validateEmployeeForm(values: EmployeeFormValues, today: string): FormErrors {
  const errors: FormErrors = {};
  const fullName = values.fullName.trim();
  const email = values.email.trim();
  const jobTitle = values.jobTitle.trim();

  if (!fullName) errors.fullName = 'Enter the employee’s full name.';
  else if (fullName.length > 120) errors.fullName = 'Full name must be at most 120 characters.';

  if (!email) errors.email = 'Enter an email address.';
  else if (email.length > 160) errors.email = 'Email must be at most 160 characters.';
  else if (!EMAIL_RE.test(email)) errors.email = 'Enter a valid email address, like name@acme.com.';

  if (!values.countryCode) errors.countryCode = 'Select a country.';

  if (!values.department) errors.department = 'Select a department.';
  else if (!(DEPARTMENTS as readonly string[]).includes(values.department)) {
    errors.department = 'Select a valid department.';
  }

  if (!jobTitle) errors.jobTitle = 'Enter a job title.';
  else if (jobTitle.length > 80) errors.jobTitle = 'Job title must be at most 80 characters.';

  if (!values.hireDate) errors.hireDate = 'Enter the hire date.';
  else if (!isRealCalendarDate(values.hireDate)) errors.hireDate = 'Enter a valid date.';
  else if (values.hireDate < EARLIEST_HIRE_DATE) {
    errors.hireDate = 'Hire date must be on or after 1900-01-01.';
  } else if (values.hireDate > today) errors.hireDate = 'Hire date cannot be in the future.';

  return errors;
}

/** Trims text and lower-cases the email, matching what the server stores. Call only after validation. */
export function toCreateInput(values: EmployeeFormValues): CreateEmployeeInput {
  return {
    fullName: values.fullName.trim(),
    email: values.email.trim().toLowerCase(),
    countryCode: values.countryCode.toUpperCase(),
    department: values.department as CreateEmployeeInput['department'],
    jobTitle: values.jobTitle.trim(),
    hireDate: values.hireDate,
  };
}

/** Only the fields that differ from the loaded employee, so PATCH sends what actually changed. */
export function diffEmployee(
  initial: EmployeeFormValues,
  next: CreateEmployeeInput,
): Partial<CreateEmployeeInput> {
  const patch: Partial<CreateEmployeeInput> = {};
  for (const field of FIELD_ORDER) {
    if (next[field] !== initial[field]) {
      (patch as Record<string, string>)[field] = next[field];
    }
  }
  return patch;
}
