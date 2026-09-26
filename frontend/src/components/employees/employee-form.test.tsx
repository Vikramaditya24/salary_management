import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

import { ApiError } from '@/lib/api/client';
import { EMPTY_FORM_VALUES } from '@/lib/employees/validation';
import { filterOptions } from '@/test/api';

import { EmployeeForm } from './employee-form';

vi.mock('next/link', async () => await import('@/test/next-link'));

function setup(
  onSubmit: (values: unknown) => Promise<void> = vi.fn().mockResolvedValue(undefined),
) {
  render(
    <EmployeeForm
      initialValues={EMPTY_FORM_VALUES}
      options={filterOptions}
      submitLabel="Create employee"
      pendingLabel="Creating…"
      cancelHref="/employees"
      onSubmit={onSubmit}
    />,
  );
  return onSubmit;
}

function fill(
  overrides: Partial<
    Record<'name' | 'email' | 'country' | 'department' | 'title' | 'hired', string>
  > = {},
) {
  const values = {
    name: 'Ada Lovelace',
    email: 'ada@acme.com',
    country: 'DE',
    department: 'ENGINEERING',
    title: 'Software Engineer I',
    hired: '2021-03-05',
    ...overrides,
  };
  fireEvent.change(screen.getByLabelText(/Full name/), { target: { value: values.name } });
  fireEvent.change(screen.getByLabelText(/Email/), { target: { value: values.email } });
  fireEvent.change(screen.getByLabelText(/Country/), { target: { value: values.country } });
  fireEvent.change(screen.getByLabelText(/Department/), { target: { value: values.department } });
  fireEvent.change(screen.getByLabelText(/Job title/), { target: { value: values.title } });
  fireEvent.change(screen.getByLabelText(/Hire date/), { target: { value: values.hired } });
}

const submit = () => fireEvent.click(screen.getByRole('button', { name: 'Create employee' }));

describe('EmployeeForm', () => {
  it('blocks an empty submit, explains every problem and focuses the first invalid field', () => {
    const onSubmit = setup();
    submit();

    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toHaveTextContent('Please fix 6 fields below.');
    const name = screen.getByLabelText(/Full name/);
    expect(name).toHaveAttribute('aria-invalid', 'true');
    expect(name).toHaveAccessibleDescription(/full name/i);
    expect(name).toHaveFocus();
    expect(screen.getByLabelText(/Hire date/)).toHaveAccessibleDescription('Enter the hire date.');
  });

  it('marks required fields for assistive technology', () => {
    setup();
    for (const label of [/Full name/, /Email/, /Country/, /Department/, /Job title/, /Hire date/]) {
      expect(screen.getByLabelText(label)).toHaveAttribute('aria-required', 'true');
    }
  });

  it('rejects a bad email and a future hire date on the client', () => {
    const onSubmit = setup();
    fill({ email: 'not-an-email', hired: '2999-01-01' });
    submit();

    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByLabelText(/Email/)).toHaveAccessibleDescription(/valid email/i);
    expect(screen.getByLabelText(/Hire date/)).toHaveAccessibleDescription(/future/i);
  });

  it('clears a field’s error as soon as it is edited', () => {
    setup();
    submit();
    fireEvent.change(screen.getByLabelText(/Full name/), { target: { value: 'Ada' } });
    expect(screen.getByLabelText(/Full name/)).not.toHaveAttribute('aria-invalid');
  });

  it('submits valid values and locks the form while saving', async () => {
    let finish: () => void = () => {};
    const onSubmit = vi.fn(() => new Promise<void>((resolve) => (finish = resolve)));
    setup(onSubmit);
    fill();
    submit();

    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit).toHaveBeenCalledWith({
      fullName: 'Ada Lovelace',
      email: 'ada@acme.com',
      countryCode: 'DE',
      department: 'ENGINEERING',
      jobTitle: 'Software Engineer I',
      hireDate: '2021-03-05',
    });
    const saving = screen.getByRole('button', { name: 'Creating…' });
    expect(saving).toBeDisabled();

    finish();
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Create employee' })).toBeEnabled(),
    );
  });

  it('puts a duplicate-email conflict on the email field', async () => {
    setup(vi.fn().mockRejectedValue(new ApiError(409, 'EMAIL_ALREADY_EXISTS', 'Email taken.')));
    fill();
    submit();

    const email = screen.getByLabelText(/Email/);
    await waitFor(() => expect(email).toHaveAttribute('aria-invalid', 'true'));
    expect(email).toHaveAccessibleDescription(/already exists/i);
    expect(email).toHaveFocus();
  });

  it('maps per-field validation details from the API', async () => {
    setup(
      vi
        .fn()
        .mockRejectedValue(
          new ApiError(400, 'VALIDATION_ERROR', 'The request is invalid.', [
            { field: 'jobTitle', message: 'jobTitle must be at most 80 characters.' },
          ]),
        ),
    );
    fill();
    submit();

    await waitFor(() =>
      expect(screen.getByLabelText(/Job title/)).toHaveAccessibleDescription(/at most 80/),
    );
  });

  it('shows other failures (e.g. the API being down) in an alert and keeps the input', async () => {
    setup(
      vi.fn().mockRejectedValue(new ApiError(0, 'NETWORK_ERROR', 'Could not reach the server.')),
    );
    fill();
    submit();

    expect(await screen.findByRole('alert')).toHaveTextContent('Could not reach the server.');
    expect(screen.getByLabelText(/Full name/)).toHaveValue('Ada Lovelace');
  });
});
