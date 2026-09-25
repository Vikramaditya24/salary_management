import type { SalaryOverallStats } from '@/lib/api/analytics';
import { formatCount, formatMoney } from '@/lib/format';

interface SummaryCardsProps {
  overall: SalaryOverallStats;
}

function Card({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-card px-4 py-3">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="mt-1 text-xl font-semibold text-card-foreground">{value}</p>
    </div>
  );
}

export function SummaryCards({ overall }: SummaryCardsProps) {
  const dash = '\u2014';
  const money = (amount: string | null) => (amount ? formatMoney(amount, 'USD') : dash);

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      <Card label="Total Employees" value={formatCount(overall.employeeCount)} />
      <Card label="Average Salary" value={money(overall.averageSalaryUsd)} />
      <Card label="Minimum Salary" value={money(overall.minSalaryUsd)} />
      <Card label="Maximum Salary" value={money(overall.maxSalaryUsd)} />
    </div>
  );
}
