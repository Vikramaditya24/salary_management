import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { ComparisonChart } from './comparison-chart';
import { DistributionChart } from './distribution-chart';

const rows = [
  { label: 'Engineering', count: 80, averageSalaryUsd: '90000.00' },
  { label: 'Legal', count: 10, averageSalaryUsd: '140000.00' },
  { label: 'Product', count: 30, averageSalaryUsd: '110000.00' },
];

describe('analytics charts', () => {
  it('switches between headcount and salary, reorders groups, and exposes exact values', () => {
    render(<ComparisonChart rows={rows} label="Departments" limit={2} />);
    const list = screen.getByRole('list', { name: 'Departments by headcount' });
    expect(within(list).getAllByRole('listitem')[0]).toHaveTextContent('Engineering');
    expect(within(list).getAllByRole('listitem')).toHaveLength(2);
    fireEvent.click(screen.getByRole('button', { name: 'Avg salary' }));
    const salaryList = screen.getByRole('list', {
      name: 'Departments by average annual USD salary',
    });
    expect(within(salaryList).getAllByRole('listitem')[0]).toHaveTextContent('Legal');
    expect(within(salaryList).getByText('$140,000.00')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Show all 3 departments' }));
    expect(within(salaryList).getAllByRole('listitem')).toHaveLength(3);
  });

  it('shows actual bucket counts, bounds and shares in the distribution', () => {
    render(
      <DistributionChart
        bands={[
          { lowerUsd: 100000, upperUsdExclusive: 125000, employeeCount: 8, percentage: 80 },
          { lowerUsd: 125000, upperUsdExclusive: 150000, employeeCount: 2, percentage: 20 },
        ]}
      />,
    );
    const buckets = within(
      screen.getByRole('list', { name: 'Salary distribution by annual USD band' }),
    ).getAllByRole('listitem');
    expect(buckets).toHaveLength(2);
    expect(buckets[0]).toHaveAttribute('title', expect.stringContaining('8 employees (80%)'));
    expect(buckets[1]).toHaveTextContent('2');
  });
});
