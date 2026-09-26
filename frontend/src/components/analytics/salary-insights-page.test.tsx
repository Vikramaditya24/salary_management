import { afterEach, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import { mockApi } from '@/test/api';
import { renderWithProviders } from '@/test/render';
import { SalaryInsightsPage } from './salary-insights-page';

const data = {
  filters: { country: null, department: null },
  currency: 'USD',
  overall: {
    employeeCount: 2,
    totalHeadcount: 3,
    activeHeadcount: 2,
    terminatedHeadcount: 1,
    withoutSalaryCount: 0,
    totalSalaryUsd: '240000.00',
    averageSalaryUsd: '120000.00',
    medianSalaryUsd: '120000.00',
    minSalaryUsd: '100000.00',
    maxSalaryUsd: '140000.00',
  },
  headcountByDepartment: [
    { department: 'ENGINEERING', employeeCount: 2, averageSalaryUsd: '120000.00' },
  ],
  headcountByCountry: [
    {
      country: { code: 'US', name: 'United States' },
      employeeCount: 2,
      averageSalaryUsd: '120000.00',
    },
  ],
  salaryByRole: [
    {
      jobTitle: 'Engineer',
      employeeCount: 2,
      averageSalaryUsd: '120000.00',
      minSalaryUsd: '100000.00',
      maxSalaryUsd: '140000.00',
    },
  ],
  distribution: [{ lowerUsd: 100000, upperUsdExclusive: 125000, employeeCount: 1, percentage: 50 }],
};
afterEach(() => vi.unstubAllGlobals());
it('uses the data envelope and renders summary, role, distribution, and reference filters', async () => {
  const fetchMock = mockApi((req) =>
    req.url.pathname === '/reference'
      ? {
          body: {
            data: {
              countries: [{ code: 'US', name: 'United States', defaultCurrencyCode: 'USD' }],
              currencies: [],
              departments: ['ENGINEERING'],
              statuses: ['ACTIVE', 'TERMINATED'],
            },
          },
        }
      : { body: { data } },
  );
  renderWithProviders(<SalaryInsightsPage />);
  expect(await screen.findByText('Engineer')).toBeInTheDocument();
  expect(screen.getByText('Total headcount').nextSibling).toHaveTextContent('3');
  expect(screen.getByText('Median Salary')).toBeInTheDocument();
  expect(screen.getByText(/50%/)).toBeInTheDocument();
  expect(screen.getByRole('option', { name: 'United States' })).toBeInTheDocument();
  expect(
    fetchMock.mock.calls.filter(([url]) => new URL(String(url)).pathname === '/analytics/salary'),
  ).toHaveLength(1);
});
