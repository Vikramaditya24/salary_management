import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { SalaryOutlier } from '@/lib/api/analytics';
import { formatUsd } from '@/lib/format';

interface OutliersTableProps {
  outliers: SalaryOutlier[];
  emptyMessage: string;
}

export function OutliersTable({ outliers, emptyMessage }: OutliersTableProps) {
  if (outliers.length === 0) {
    return <p className="text-sm text-muted-foreground">{emptyMessage}</p>;
  }

  return (
    <Table>
      <TableCaption>Employees whose USD-normalised salary falls well outside the typical range.</TableCaption>
      <TableHeader>
        <TableRow>
          <TableHead>Employee</TableHead>
          <TableHead>Country</TableHead>
          <TableHead>Department</TableHead>
          <TableHead className="text-right">Salary (USD)</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {outliers.map((outlier) => (
          <TableRow key={outlier.id}>
            <TableCell>{outlier.fullName}</TableCell>
            <TableCell>{outlier.country ?? '\u2014'}</TableCell>
            <TableCell>{outlier.department ?? '\u2014'}</TableCell>
            <TableCell className="text-right">{formatUsd(outlier.salaryUsd)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
