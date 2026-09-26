import type { SalaryOverallStats } from '@/lib/api/analytics';
import { formatCount, formatMoney } from '@/lib/format';

interface SummaryCardsProps {
  overall: SalaryOverallStats;
}

function Card({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-border bg-card rounded-lg border px-4 py-3">
      <p className="text-muted-foreground text-xs font-medium">{label}</p>
      <p className="text-card-foreground mt-1 text-xl font-semibold">{value}</p>
    </div>
  );
}

export function SummaryCards({ overall }: SummaryCardsProps) {
  const dash = '\u2014';
  const money = (amount: string | null) => (amount ? formatMoney(amount, 'USD') : dash);

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      <Card label="Total headcount" value={formatCount(overall.totalHeadcount)} />
      <Card label="Active" value={formatCount(overall.activeHeadcount)} />
      <Card label="Terminated" value={formatCount(overall.terminatedHeadcount)} />
      <Card label="Without salary" value={formatCount(overall.withoutSalaryCount)} />
      <Card label="Paid employees" value={formatCount(overall.employeeCount)} />
      <Card label="Average Salary" value={money(overall.averageSalaryUsd)} />
      <Card label="Median Salary" value={money(overall.medianSalaryUsd)} />
      <Card label="Total annual salary" value={money(overall.totalSalaryUsd)} />
      <Card label="Minimum Salary" value={money(overall.minSalaryUsd)} />
      <Card label="Maximum Salary" value={money(overall.maxSalaryUsd)} />
    </div>
  );
}
