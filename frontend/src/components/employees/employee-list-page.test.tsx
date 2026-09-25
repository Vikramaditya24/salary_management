import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, screen, waitFor, within } from '@testing-library/react';

import { resetNavigation, router, setSearch } from '@/test/navigation';
import {
  apiError,
  filterOptions,
  makeEmployee,
  makeMeta,
  mockApi,
  type MockRequest,
} from '@/test/api';
import { renderWithProviders } from '@/test/render';

import { EmployeeListPage } from './employee-list-page';

vi.mock('next/navigation', async () => (await import('@/test/navigation')).navigationModule);
vi.mock('next/link', async () => await import('@/test/next-link'));

const ada = makeEmployee();
const grace = makeEmployee({
  id: '22222222-2222-4222-8222-222222222222',
  employeeNumber: 'EMP-000002',
  fullName: 'Grace Hopper',
  email: 'grace@acme.com',
});

function listApi(
  employees = [ada, grace],
  meta = makeMeta({ totalItems: employees.length }),
  extra?: (req: MockRequest) => { status?: number; body: unknown } | undefined,
) {
  return mockApi((req) => {
    const custom = extra?.(req);
    if (custom) return custom;
    if (req.url.pathname === '/employees/filter-options') return { body: { data: filterOptions } };
    return { body: { data: employees, meta } };
  });
}

const listCalls = (fetchMock: ReturnType<typeof listApi>) =>
  fetchMock.mock.calls
    .map(([url, init]) => ({ url: new URL(String(url)), method: init?.method ?? 'GET' }))
    .filter((call) => call.url.pathname === '/employees' && call.method === 'GET');

describe('EmployeeListPage', () => {
  beforeEach(() => resetNavigation());
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('shows a loading state, then the employees', async () => {
    listApi();
    renderWithProviders(<EmployeeListPage />);

    expect(screen.getByRole('status')).toHaveTextContent(/loading employees/i);
    expect(await screen.findByRole('link', { name: 'Ada Lovelace' })).toHaveAttribute(
      'href',
      `/employees/${ada.id}`,
    );
    expect(screen.getByRole('link', { name: 'Grace Hopper' })).toBeInTheDocument();
    expect(screen.getByText('2 employees')).toBeInTheDocument();
    expect(screen.getByText('Showing 1–2 of 2')).toBeInTheDocument();
  });

  it('asks the server for exactly the page, filters and sort in the URL', async () => {
    setSearch(
      'q=ada&country=DE&department=ENGINEERING&jobTitle=Software+Engineer+I&status=ALL&sortBy=hireDate&sortOrder=desc&page=2&pageSize=50',
    );
    const fetchMock = listApi([ada], makeMeta({ page: 2, pageSize: 50, totalItems: 51, totalPages: 2 }));
    renderWithProviders(<EmployeeListPage />);
    await screen.findByRole('link', { name: 'Ada Lovelace' });

    const calls = listCalls(fetchMock);
    expect(calls).toHaveLength(1);
    const params = calls[0].url.searchParams;
    expect(params.get('q')).toBe('ada');
    expect(params.getAll('country')).toEqual(['DE']);
    expect(params.getAll('department')).toEqual(['ENGINEERING']);
    expect(params.getAll('jobTitle')).toEqual(['Software Engineer I']);
    expect(params.get('status')).toBe('ALL');
    expect(params.get('sortBy')).toBe('hireDate');
    expect(params.get('sortOrder')).toBe('desc');
    expect(params.get('page')).toBe('2');
    // Never pulls the whole table: one bounded page per request.
    expect(Number(params.get('pageSize'))).toBeLessThanOrEqual(100);
  });

  it('ignores invalid URL params rather than sending them to the API', async () => {
    setSearch('page=-4&status=BOGUS&countrey=DE&sortBy=salary');
    const fetchMock = listApi();
    renderWithProviders(<EmployeeListPage />);
    await screen.findByRole('link', { name: 'Ada Lovelace' });

    const params = listCalls(fetchMock)[0].url.searchParams;
    expect(params.get('page')).toBe('1');
    expect(params.get('status')).toBe('ACTIVE');
    expect(params.get('sortBy')).toBe('fullName');
    expect(params.has('countrey')).toBe(false);
  });

  it('shows a filtered empty state with a way out', async () => {
    setSearch('q=zzz');
    listApi([], makeMeta({ totalItems: 0, totalPages: 0 }));
    renderWithProviders(<EmployeeListPage />);

    expect(await screen.findByText('No employees match your filters')).toBeInTheDocument();
    fireEvent.click(screen.getAllByRole('button', { name: 'Clear filters' })[0]);
    expect(router.push).toHaveBeenCalledWith('/employees', { scroll: false });
  });

  it('shows a first-run empty state when there are no employees at all', async () => {
    listApi([], makeMeta({ totalItems: 0, totalPages: 0 }));
    renderWithProviders(<EmployeeListPage />);
    expect(await screen.findByText('No employees yet')).toBeInTheDocument();
  });

  it('recovers when the page is past the end of the results', async () => {
    setSearch('page=9');
    listApi([], makeMeta({ page: 9, totalItems: 60, totalPages: 3, hasPreviousPage: true }));
    renderWithProviders(<EmployeeListPage />);

    expect(await screen.findByText(/Page 9 doesn.t exist/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Go to last page' }));
    expect(router.push).toHaveBeenCalledWith('/employees?page=3', { scroll: false });
  });

  it('shows the API error and retries', async () => {
    let failures = 1;
    listApi([ada], undefined, (req) =>
      req.url.pathname === '/employees' && failures-- > 0
        ? apiError(500, 'INTERNAL_ERROR', 'Something went wrong on our side.')
        : undefined,
    );
    renderWithProviders(<EmployeeListPage />);

    expect(await screen.findByText('Something went wrong on our side.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByRole('link', { name: 'Ada Lovelace' })).toBeInTheDocument();
  });

  it('debounces search into the URL and returns to page 1', async () => {
    setSearch('page=3');
    listApi([ada], makeMeta({ page: 3, totalItems: 80, totalPages: 4, hasPreviousPage: true }));
    renderWithProviders(<EmployeeListPage />);
    await screen.findByRole('link', { name: 'Ada Lovelace' });

    vi.useFakeTimers();
    fireEvent.change(screen.getByRole('searchbox', { name: 'Search employees' }), {
      target: { value: 'ada' },
    });
    act(() => vi.advanceTimersByTime(299));
    expect(router.replace).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(1));

    expect(router.replace).toHaveBeenCalledWith('/employees?q=ada', { scroll: false });
  });

  it('changes page through the URL', async () => {
    listApi([ada], makeMeta({ totalItems: 60, totalPages: 3, hasNextPage: true }));
    renderWithProviders(<EmployeeListPage />);
    await screen.findByRole('link', { name: 'Ada Lovelace' });

    expect(screen.getByRole('button', { name: 'Previous page' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Page 1' })).toHaveAttribute('aria-current', 'page');

    fireEvent.click(screen.getByRole('button', { name: 'Next page' }));
    expect(router.push).toHaveBeenLastCalledWith('/employees?page=2', { scroll: false });
    fireEvent.click(screen.getByRole('button', { name: 'Page 3' }));
    expect(router.push).toHaveBeenLastCalledWith('/employees?page=3', { scroll: false });
  });

  it('sorts by column: toggles direction on the active one, ascending on a new one', async () => {
    listApi();
    renderWithProviders(<EmployeeListPage />);
    await screen.findByRole('link', { name: 'Ada Lovelace' });

    const nameHeader = screen.getByRole('columnheader', { name: 'Name' });
    expect(nameHeader).toHaveAttribute('aria-sort', 'ascending');
    fireEvent.click(within(nameHeader).getByRole('button'));
    expect(router.push).toHaveBeenLastCalledWith('/employees?sortOrder=desc', { scroll: false });

    fireEvent.click(
      within(screen.getByRole('columnheader', { name: /job title/i })).getByRole('button'),
    );
    expect(router.push).toHaveBeenLastCalledWith('/employees?sortBy=jobTitle', { scroll: false });
  });

  it('applies filters through the URL and resets to page 1', async () => {
    setSearch('page=2');
    listApi([ada], makeMeta({ page: 2, totalItems: 60, totalPages: 3, hasPreviousPage: true }));
    renderWithProviders(<EmployeeListPage />);
    await screen.findByRole('link', { name: 'Ada Lovelace' });

    fireEvent.change(screen.getByLabelText('Employment status'), { target: { value: 'ALL' } });
    expect(router.push).toHaveBeenLastCalledWith('/employees?status=ALL', { scroll: false });

    fireEvent.click(
      within(screen.getByRole('search', { name: 'Employee filters' })).getByRole('button', {
        name: /^Country/,
      }),
    );
    fireEvent.click(await screen.findByRole('checkbox', { name: 'Germany' }));
    expect(router.push).toHaveBeenLastCalledWith('/employees?country=DE', { scroll: false });
  });

  it('does not deactivate until the user confirms', async () => {
    const fetchMock = listApi([ada]);
    renderWithProviders(<EmployeeListPage />);
    fireEvent.click(await screen.findByRole('button', { name: 'Deactivate Ada Lovelace' }));

    const dialog = await screen.findByRole('alertdialog');
    expect(dialog).toHaveTextContent('Deactivate Ada Lovelace?');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }));

    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument());
    expect(fetchMock.mock.calls.some(([, init]) => init?.method === 'DELETE')).toBe(false);
  });

  it('deactivates after confirmation, then refreshes the list and confirms with a toast', async () => {
    const fetchMock = listApi([ada], undefined, (req) =>
      req.method === 'DELETE'
        ? { body: { data: { ...ada, employmentStatus: 'TERMINATED' } } }
        : undefined,
    );
    renderWithProviders(<EmployeeListPage />);
    fireEvent.click(await screen.findByRole('button', { name: 'Deactivate Ada Lovelace' }));

    const dialog = await screen.findByRole('alertdialog');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Deactivate' }));

    expect(await screen.findByText('Ada Lovelace was deactivated')).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument());

    const deletes = fetchMock.mock.calls.filter(([, init]) => init?.method === 'DELETE');
    expect(deletes).toHaveLength(1);
    expect(String(deletes[0][0])).toBe(`http://localhost:4000/employees/${ada.id}`);
    expect(deletes[0][1]?.body).toBeUndefined();
    await waitFor(() => expect(listCalls(fetchMock)).toHaveLength(2));
  });

  it('keeps the dialog open and explains when deactivation fails', async () => {
    listApi([ada], undefined, (req) =>
      req.method === 'DELETE' ? apiError(404, 'EMPLOYEE_NOT_FOUND', 'Employee not found.') : undefined,
    );
    renderWithProviders(<EmployeeListPage />);
    fireEvent.click(await screen.findByRole('button', { name: 'Deactivate Ada Lovelace' }));

    const dialog = await screen.findByRole('alertdialog');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Deactivate' }));

    expect(await within(dialog).findByText('Employee not found.')).toBeInTheDocument();
    expect(screen.getByRole('alertdialog')).toBeInTheDocument();
    expect(screen.queryByText('Ada Lovelace was deactivated')).not.toBeInTheDocument();
  });

  it('offers reactivation, not deactivation, for terminated employees', async () => {
    const terminated = makeEmployee({ employmentStatus: 'TERMINATED' });
    const fetchMock = listApi([terminated], undefined, (req) =>
      req.method === 'PATCH' ? { body: { data: { ...terminated, employmentStatus: 'ACTIVE' } } } : undefined,
    );
    renderWithProviders(<EmployeeListPage />);

    const reactivate = await screen.findByRole('button', { name: 'Reactivate Ada Lovelace' });
    expect(screen.queryByRole('button', { name: /^Deactivate/ })).not.toBeInTheDocument();
    fireEvent.click(reactivate);

    expect(await screen.findByText('Ada Lovelace was reactivated')).toBeInTheDocument();
    const patch = fetchMock.mock.calls.find(([, init]) => init?.method === 'PATCH');
    expect(JSON.parse(String(patch?.[1]?.body))).toEqual({ employmentStatus: 'ACTIVE' });
  });
});
