import type { SalaryAnalytics } from '@/lib/api/analytics';
import { formatCount, formatMoney } from '@/lib/format';

type Band = SalaryAnalytics['distribution'][number];
const shortUsd = (amount: number) =>
  amount >= 1_000_000 ? `$${(amount / 1_000_000).toFixed(1)}m` : `$${Math.round(amount / 1000)}k`;

export function DistributionChart({ bands }: { bands: Band[] }) {
  if (bands.length === 0)
    return <p className="text-muted-foreground text-sm">No salaries in this selection.</p>;
  const maximum = Math.max(...bands.map((band) => band.employeeCount), 1);
  return (
    <>
      <p className="text-muted-foreground text-xs">Active employees · annual USD · $25,000 bands</p>
      <div
        role="list"
        aria-label="Salary distribution by annual USD band"
        className="border-border mt-4 flex min-h-52 min-w-0 items-end gap-2 overflow-x-auto border-b pb-2"
      >
        {bands.map((band) => (
          <div
            role="listitem"
            key={band.lowerUsd}
            className="flex min-w-12 flex-1 flex-col items-center gap-1 text-center"
            title={`${formatMoney(String(band.lowerUsd), 'USD')} to ${formatMoney(String(band.upperUsdExclusive), 'USD')}: ${formatCount(band.employeeCount)} employees (${band.percentage}%)`}
          >
            <span className="text-foreground text-xs font-semibold tabular-nums">
              {formatCount(band.employeeCount)}
            </span>
            <div className="flex h-36 w-full items-end">
              <div
                aria-hidden="true"
                className="bg-primary w-full rounded-t-sm"
                style={{ height: `${Math.max(3, (band.employeeCount / maximum) * 100)}%` }}
              />
            </div>
            <span className="text-muted-foreground text-[11px] whitespace-nowrap tabular-nums">
              {shortUsd(band.lowerUsd)}
            </span>
            <span className="sr-only">
              to {shortUsd(band.upperUsdExclusive)}, {band.percentage}% of paid employees
            </span>
          </div>
        ))}
      </div>
      <p className="text-muted-foreground text-xs">
        Band labels show the lower bound; hover a bar for the full range and share.
      </p>
    </>
  );
}
