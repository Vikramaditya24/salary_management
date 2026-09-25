import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatCount } from '@/lib/format';

interface HeadcountRow {
  label: string;
  count: number;
}

interface HeadcountTableProps {
  caption: string;
  groupLabel: string;
  rows: HeadcountRow[];
  emptyMessage: string;
}

export function HeadcountTable({ caption, groupLabel, rows, emptyMessage }: HeadcountTableProps) {
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
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={row.label}>
            <TableCell>{row.label}</TableCell>
            <TableCell className="text-right">{formatCount(row.count)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
