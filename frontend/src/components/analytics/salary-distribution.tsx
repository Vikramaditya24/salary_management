import type { SalaryBand } from '@/lib/api/analytics';
import { formatCount } from '@/lib/format';

interface SalaryDistributionProps {
  bands: SalaryBand[];
  emptyMessage: string;
}

export function SalaryDistribution({ bands, emptyMessage }: SalaryDistributionProps) {
  if (bands.length === 0) {
    return <p className="text-sm text-muted-foreground">{emptyMessage}</p>;
  }

  const max = Math.max(...bands.map((band) => band.count), 1);

  return (
    <ul className="flex flex-col gap-2">
      {bands.map((band) => (
        <li key={band.label} className="flex items-center gap-3">
          <span className="w-32 shrink-0 text-sm text-muted-foreground sm:w-40">{band.label}</span>
          <div className="h-3 flex-1 overflow-hidden rounded-full bg-muted" aria-hidden="true">
            <div
              className="h-full rounded-full bg-primary"
              style={{ width: `${(band.count / max) * 100}%` }}
            />
          </div>
          <span className="w-12 shrink-0 text-right text-sm font-medium">{formatCount(band.count)}</span>
        </li>
      ))}
    </ul>
  );
}
