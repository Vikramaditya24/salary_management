import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';

import { apiError, filterOptions, makeDetail, makeEmployee, mockApi, type MockRequest } from '@/test/api';
import { resetNavigation, router } from '@/test/navigation';
import { renderWithProviders } from '@/test/render';

import { CreateEmployeePage } from './create-employee-page';
import { EditEmployeePage } from './edit-employee-page';
import { EmployeeDetailPage } from './employee-detail-page';

vi.mock('next/navigation', async () => (await import('@/test/navigation')).navigationModule);
vi.mock('next/link', async () => await import('@/test/next-link'));

const detail = makeDetail();
const withOptions = (handler: (req: MockRequest) => { status?: number; body: unknown } | undefined) =>
  mockApi((req) =>
    req.url.pathname === '/employees/filter-options'
      ? { body: { data: filterOptions } }
      : (handler(req) ?? apiError(500, 'UNEXPECTED', `Unhandled ${req.method} ${req.url.pathname}`)),
  );

function fillCreateForm() {
  fireEvent.change(screen.getByLabelText(/Full name/), { target: { value: '  Ada Lovelace ' } });
  fireEvent.change(screen.getByLabelText(/Email/), { target: { value: 'ADA@acme.com' } });
  fireEvent.change(screen.getByLabelText(/Country/), { target: { value: 'DE' } });
  fireEvent.change(screen.getByLabelText(/Department/), { target: { value: 'ENGINEERING' } });
  fireEvent.change(screen.getByLabelText(/Job title/), { target: { value: 'Software Engineer I' } });
  fireEvent.change(screen.getByLabelText(/Hire date/), { target: { value: '2021-03-05' } });
}

describe('employee pages', () => {
  beforeEach(() => resetNavigation());
  afterEach(() => vi.unstubAllGlobals());

  describe('create', () => {
    it('creates the employee with normalised values, then opens their profile', async () => {
      const fetchMock = withOptions((req) =>
        req.method === 'POST' ? { status: 201, body: { data: makeEmployee() } } : undefined,
      );
      renderWithProviders(<CreateEmployeePage />);

      expect(screen.getByRole('status')).toHaveTextContent(/loading form/i);
      await screen.findByLabelText(/Full name/);
      fillCreateForm();
      fireEvent.click(screen.getByRole('button', { name: 'Create employee' }));

      await waitFor(() => expect(router.push).toHaveBeenCalledWith(`/employees/${detail.id}`));
      const post = fetchMock.mock.calls.find(([, init]) => init?.method === 'POST');
      expect(JSON.parse(String(post?.[1]?.body))).toEqual({
        fullName: 'Ada Lovelace',
        email: 'ada@acme.com',
        countryCode: 'DE',
        department: 'ENGINEERING',
        jobTitle: 'Software Engineer I',
        hireDate: '2021-03-05',
      });
      expect(await screen.findByText('Ada Lovelace was added')).toBeInTheDocument();
    });

    it('stays on the form and flags the email when it already exists', async () => {
      withOptions((req) =>
        req.method === 'POST'
          ? apiError(409, 'EMAIL_ALREADY_EXISTS', 'An employee with this email already exists.')
          : undefined,
      );
      renderWithProviders(<CreateEmployeePage />);
      await screen.findByLabelText(/Full name/);
      fillCreateForm();
      fireEvent.click(screen.getByRole('button', { name: 'Create employee' }));

      await waitFor(() =>
        expect(screen.getByLabelText(/Email/)).toHaveAccessibleDescription(/already exists/i),
      );
      expect(router.push).not.toHaveBeenCalled();
    });

    it('offers a retry if the form options cannot be loaded', async () => {
      let failing = true;
      mockApi(() => {
        if (failing) {
          failing = false;
          return apiError(500, 'INTERNAL_ERROR', 'Options unavailable.');
        }
        return { body: { data: filterOptions } };
      });
      renderWithProviders(<CreateEmployeePage />);

      expect(await screen.findByText('Options unavailable.')).toBeInTheDocument();
      fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
      expect(await screen.findByLabelText(/Full name/)).toBeInTheDocument();
    });
  });

  describe('edit', () => {
    const route = (req: MockRequest) => {
      if (req.method === 'GET') return { body: { data: detail } };
      if (req.method === 'PATCH') return { body: { data: { ...detail, ...(req.body as object) } } };
      return undefined;
    };

    it('prefills the form and sends only the changed fields', async () => {
      const fetchMock = withOptions(route);
      renderWithProviders(<EditEmployeePage id={detail.id} />);

      const name = await screen.findByLabelText(/Full name/);
      expect(name).toHaveValue('Ada Lovelace');
      expect(screen.getByLabelText(/Country/)).toHaveValue('DE');
      expect(screen.getByLabelText(/Hire date/)).toHaveValue('2021-03-05');

      fireEvent.change(screen.getByLabelText(/Job title/), { target: { value: 'Staff Engineer' } });
      fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));

      await waitFor(() => expect(router.push).toHaveBeenCalledWith(`/employees/${detail.id}`));
      const patch = fetchMock.mock.calls.find(([, init]) => init?.method === 'PATCH');
      expect(JSON.parse(String(patch?.[1]?.body))).toEqual({ jobTitle: 'Staff Engineer' });
    });

    it('does not call the API when nothing changed', async () => {
      const fetchMock = withOptions(route);
      renderWithProviders(<EditEmployeePage id={detail.id} />);
      await screen.findByLabelText(/Full name/);

      fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));

      expect(await screen.findByText('No changes to save')).toBeInTheDocument();
      expect(fetchMock.mock.calls.some(([, init]) => init?.method === 'PATCH')).toBe(false);
      expect(router.push).not.toHaveBeenCalled();
    });

    it('says so when the employee does not exist', async () => {
      withOptions(() => apiError(404, 'EMPLOYEE_NOT_FOUND', 'Employee not found.'));
      renderWithProviders(<EditEmployeePage id={detail.id} />);
      expect(await screen.findByRole('heading', { name: 'Employee not found' })).toBeInTheDocument();
    });
  });

  describe('detail', () => {
    it('shows the profile and the current salary', async () => {
      withOptions(() => ({ body: { data: detail } }));
      renderWithProviders(<EmployeeDetailPage id={detail.id} />);

      expect(screen.getByRole('status')).toHaveTextContent(/loading employee/i);
      expect(await screen.findByRole('heading', { name: 'Ada Lovelace', level: 1 })).toBeInTheDocument();
      expect(screen.getByText('EMP-000001')).toBeInTheDocument();
      expect(screen.getByText('€128,450.00')).toBeInTheDocument();
      expect(screen.getByRole('link', { name: 'ada@acme.com' })).toHaveAttribute(
        'href',
        'mailto:ada@acme.com',
      );
      expect(screen.getByRole('link', { name: 'Edit' })).toHaveAttribute(
        'href',
        `/employees/${detail.id}/edit`,
      );
    });

    it('handles an employee without a salary record', async () => {
      withOptions(() => ({ body: { data: makeDetail({ currentSalary: null }) } }));
      renderWithProviders(<EmployeeDetailPage id={detail.id} />);
      expect(await screen.findByText(/No salary is on record/)).toBeInTheDocument();
    });

    it('deactivates only after confirmation and then shows the terminated state', async () => {
      let terminated = false;
      const fetchMock = withOptions((req) => {
        if (req.method === 'DELETE') {
          terminated = true;
          return { body: { data: { ...makeEmployee(), employmentStatus: 'TERMINATED' } } };
        }
        return { body: { data: makeDetail({ employmentStatus: terminated ? 'TERMINATED' : 'ACTIVE' }) } };
      });
      renderWithProviders(<EmployeeDetailPage id={detail.id} />);

      fireEvent.click(await screen.findByRole('button', { name: 'Deactivate' }));
      expect(fetchMock.mock.calls.some(([, init]) => init?.method === 'DELETE')).toBe(false);

      const dialog = await screen.findByRole('alertdialog');
      fireEvent.click(within(dialog).getByRole('button', { name: 'Deactivate' }));

      expect(await screen.findByRole('button', { name: 'Reactivate Ada Lovelace' })).toBeInTheDocument();
      expect(screen.getAllByText('Terminated').length).toBeGreaterThan(0);
    });

    it('shows a not-found state for an unknown or malformed id', async () => {
      withOptions(() => apiError(400, 'VALIDATION_ERROR', 'id must be a valid UUID.'));
      renderWithProviders(<EmployeeDetailPage id="nope" />);
      expect(await screen.findByRole('heading', { name: 'Employee not found' })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: 'Back to employees' })).toHaveAttribute('href', '/employees');
    });

    it('offers a retry on a server error', async () => {
      withOptions(() => apiError(500, 'INTERNAL_ERROR', 'Something went wrong on our side.'));
      renderWithProviders(<EmployeeDetailPage id={detail.id} />);
      expect(await screen.findByText('Something went wrong on our side.')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument();
    });
  });
});
