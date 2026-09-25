import type { SalaryStats } from '@/lib/api/analytics';
import { formatCount, formatUsd } from '@/lib/format';

interface SummaryCardsProps {
  totalEmployees: number;
  overall: SalaryStats | null;
}

function Card({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-card px-4 py-3">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="mt-1 text-xl font-semibold text-card-foreground">{value}</p>
    </div>
  );
}

export function SummaryCards({ totalEmployees, overall }: SummaryCardsProps) {
  const dash = '\u2014';

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      <Card label="Total Employees" value={formatCount(totalEmployees)} />
      <Card label="Average Salary" value={overall ? formatUsd(overall.average) : dash} />
      <Card label="Median Salary" value={overall ? formatUsd(overall.median) : dash} />
      <Card label="Minimum Salary" value={overall ? formatUsd(overall.min) : dash} />
      <Card label="Maximum Salary" value={overall ? formatUsd(overall.max) : dash} />
    </div>
  );
}
