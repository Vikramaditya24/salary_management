'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { formatCount, formatMoney } from '@/lib/format';

export interface ComparisonRow {
  label: string;
  count: number;
  averageSalaryUsd: string;
}

interface ComparisonChartProps {
  rows: ComparisonRow[];
  label: string;
  initialMetric?: 'count' | 'salary';
  limit?: number;
}

/** All series are backend aggregates. Numeric conversion is used only to size bars. */
export function ComparisonChart({
  rows,
  label,
  initialMetric = 'count',
  limit = 10,
}: ComparisonChartProps) {
  const [metric, setMetric] = useState(initialMetric);
  const [showAll, setShowAll] = useState(false);
  if (rows.length === 0)
    return (
      <p className="text-muted-foreground text-sm">
        No {label.toLowerCase()} data for these filters.
      </p>
    );

  const value = (row: ComparisonRow) =>
    metric === 'count' ? row.count : Number(row.averageSalaryUsd);
  const sorted = [...rows].sort((a, b) => value(b) - value(a) || a.label.localeCompare(b.label));
  const visible = showAll ? sorted : sorted.slice(0, limit);
  const maximum = Math.max(...sorted.map(value), 1);

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-muted-foreground text-xs">Active employees with a current salary</p>
        <div
          role="group"
          aria-label={`${label} chart measure`}
          className="border-border flex rounded-md border p-0.5"
        >
          <Button
            type="button"
            size="sm"
            variant={metric === 'count' ? 'secondary' : 'ghost'}
            aria-pressed={metric === 'count'}
            onClick={() => setMetric('count')}
          >
            Headcount
          </Button>
          <Button
            type="button"
            size="sm"
            variant={metric === 'salary' ? 'secondary' : 'ghost'}
            aria-pressed={metric === 'salary'}
            onClick={() => setMetric('salary')}
          >
            Avg salary
          </Button>
        </div>
      </div>
      <div
        role="list"
        aria-label={`${label} by ${metric === 'count' ? 'headcount' : 'average annual USD salary'}`}
        className="mt-2 max-h-[28rem] space-y-3 overflow-y-auto pr-1"
      >
        {visible.map((row) => (
          <div
            role="listitem"
            key={row.label}
            className="grid min-w-0 grid-cols-[minmax(0,5rem)_minmax(0,1fr)_auto] items-center gap-2 text-xs sm:grid-cols-[minmax(0,10rem)_minmax(0,1fr)_auto] sm:gap-3"
          >
            <span className="truncate font-medium" title={row.label}>
              {row.label}
            </span>
            <div aria-hidden="true" className="bg-muted h-5 overflow-hidden rounded-sm">
              <div
                className="bg-primary h-full min-w-0 rounded-sm"
                style={{ width: `${Math.max(1, (value(row) / maximum) * 100)}%` }}
              />
            </div>
            <span className="min-w-12 text-right font-semibold tabular-nums">
              {metric === 'count'
                ? formatCount(row.count)
                : formatMoney(row.averageSalaryUsd, 'USD')}
            </span>
          </div>
        ))}
      </div>
      {rows.length > limit && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="self-start"
          onClick={() => setShowAll((value) => !value)}
        >
          {showAll ? 'Show fewer' : `Show all ${formatCount(rows.length)} ${label.toLowerCase()}`}
        </Button>
      )}
    </>
  );
}
