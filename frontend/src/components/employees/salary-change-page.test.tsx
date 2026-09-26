import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { apiError, makeDetail, mockApi, type MockRequest } from '@/test/api';
import { renderWithProviders } from '@/test/render';
import { resetNavigation, router } from '@/test/navigation';
import { SalaryChangePage } from './salary-change-page';

vi.mock('next/navigation', async () => (await import('@/test/navigation')).navigationModule);
vi.mock('next/link', async () => await import('@/test/next-link'));
const id = makeDetail().id;
const reference = {
  countries: [{ code: 'DE', name: 'Germany', defaultCurrencyCode: 'EUR' }],
  currencies: [
    { code: 'EUR', name: 'Euro', minorUnit: 2 },
    { code: 'JPY', name: 'Japanese Yen', minorUnit: 0 },
  ],
  departments: ['ENGINEERING'],
  statuses: ['ACTIVE', 'TERMINATED'],
};
function setup(extra?: (req: MockRequest) => { status?: number; body: unknown } | undefined) {
  return mockApi(
    (req) =>
      extra?.(req) ??
      (req.url.pathname === '/reference'
        ? { body: { data: reference } }
        : { body: { data: makeDetail() } }),
  );
}
beforeEach(resetNavigation);
afterEach(() => vi.unstubAllGlobals());

describe('salary change', () => {
  it('rejects invalid amount and conflicting date before POST', async () => {
    const fetchMock = setup();
    renderWithProviders(<SalaryChangePage id={id} />);
    await screen.findByText('Change salary');
    fireEvent.change(screen.getByLabelText(/Annual amount/), { target: { value: '12.345' } });
    fireEvent.change(screen.getByLabelText(/Currency/), { target: { value: 'EUR' } });
    fireEvent.change(screen.getByLabelText(/Effective date/), { target: { value: '2023-01-01' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save salary' }));
    expect(screen.getByLabelText(/Annual amount/)).toHaveAccessibleDescription(/positive amount/i);
    expect(screen.getByLabelText(/Effective date/)).toHaveAccessibleDescription(
      /after the current salary/i,
    );
    expect(fetchMock.mock.calls.filter(([, init]) => init?.method === 'POST')).toHaveLength(0);
  });

  it('submits exact strings, handles a backend date conflict, then confirms success', async () => {
    let conflict = true;
    const fetchMock = setup((req) =>
      req.method === 'POST'
        ? conflict
          ? apiError(
              409,
              'EFFECTIVE_DATE_CONFLICT',
              'Effective date must be after the current salary start date.',
            )
          : { status: 201, body: { data: {} } }
        : undefined,
    );
    renderWithProviders(<SalaryChangePage id={id} />);
    await screen.findByText('Change salary');
    fireEvent.change(screen.getByLabelText(/Annual amount/), { target: { value: '150000.00' } });
    fireEvent.change(screen.getByLabelText(/Currency/), { target: { value: 'EUR' } });
    fireEvent.change(screen.getByLabelText(/Effective date/), { target: { value: '2025-01-01' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save salary' }));
    await waitFor(() =>
      expect(screen.getByLabelText(/Effective date/)).toHaveAccessibleDescription(
        /after the current salary/i,
      ),
    );
    conflict = false;
    fireEvent.click(screen.getByRole('button', { name: 'Save salary' }));
    await waitFor(() => expect(router.push).toHaveBeenCalledWith(`/employees/${id}`));
    const posts = fetchMock.mock.calls.filter(([, init]) => init?.method === 'POST');
    expect(JSON.parse(String(posts.at(-1)?.[1]?.body))).toEqual({
      amount: '150000.00',
      currencyCode: 'EUR',
      effectiveDate: '2025-01-01',
    });
    expect(await screen.findByText('Salary recorded')).toBeInTheDocument();
  });

  it('disables salary changes for terminated employees', async () => {
    const fetchMock = setup((req) =>
      req.url.pathname.startsWith('/employees/')
        ? { body: { data: makeDetail({ employmentStatus: 'TERMINATED' }) } }
        : undefined,
    );
    renderWithProviders(<SalaryChangePage id={id} />);
    expect(await screen.findByText('Salary changes unavailable')).toBeInTheDocument();
    expect(fetchMock.mock.calls.filter(([, init]) => init?.method === 'POST')).toHaveLength(0);
  });
});
