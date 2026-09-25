import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { SalaryStats } from '@/lib/api/analytics';
import { formatCount, formatUsd } from '@/lib/format';

interface SalaryGroupRow {
  label: string;
  count: number;
  stats: SalaryStats;
}

interface SalaryGroupTableProps {
  caption: string;
  groupLabel: string;
  rows: SalaryGroupRow[];
  emptyMessage: string;
}

export function SalaryGroupTable({ caption, groupLabel, rows, emptyMessage }: SalaryGroupTableProps) {
  if (rows.length === 0) {
    return <p className="text-sm text-muted-foreground">{emptyMessage}</p>;
  }

  return (
    <Table>
      <TableCaption>{caption}</TableCaption>
      <TableHeader>
        <TableRow>
          <TableHead>{groupLabel}</TableHead>
          <TableHead className="text-right">Employees</TableHead>
          <TableHead className="text-right">Average Salary (USD)</TableHead>
          <TableHead className="text-right">Median Salary (USD)</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={row.label}>
            <TableCell>{row.label}</TableCell>
            <TableCell className="text-right">{formatCount(row.count)}</TableCell>
            <TableCell className="text-right">{formatUsd(row.stats.average)}</TableCell>
            <TableCell className="text-right">{formatUsd(row.stats.median)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
