'use client';

import Link from 'next/link';
import { ArrowDown, ArrowUp, ArrowUpDown, Pencil } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { Employee, SortField, SortOrder } from '@/lib/api/employees';
import { formatDate, formatDepartment } from '@/lib/format';
import { cn } from '@/lib/utils';

import { ReactivateButton } from './reactivate-button';
import { EmployeeStatusBadge } from './status-badge';

interface EmployeeTableProps {
  employees: Employee[];
  sortBy: SortField;
  sortOrder: SortOrder;
  onSort: (field: SortField) => void;
  onDeactivate: (employee: Employee) => void;
  onReactivated: () => void;
}

function SortableHead({
  field,
  label,
  sortBy,
  sortOrder,
  onSort,
  className,
}: {
  field: SortField;
  label: string;
  sortBy: SortField;
  sortOrder: SortOrder;
  onSort: (field: SortField) => void;
  className?: string;
}) {
  const active = sortBy === field;
  const Icon = !active ? ArrowUpDown : sortOrder === 'asc' ? ArrowUp : ArrowDown;
  return (
    <TableHead
      scope="col"
      className={className}
      aria-sort={active ? (sortOrder === 'asc' ? 'ascending' : 'descending') : undefined}
    >
      <button
        type="button"
        onClick={() => onSort(field)}
        className={cn(
          'inline-flex items-center gap-1 rounded-sm outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring',
          active && 'text-foreground',
        )}
      >
        {label}
        <Icon aria-hidden="true" className="size-3.5" />
      </button>
    </TableHead>
  );
}

export function EmployeeTable({
  employees,
  sortBy,
  sortOrder,
  onSort,
  onDeactivate,
  onReactivated,
}: EmployeeTableProps) {
  const sortProps = { sortBy, sortOrder, onSort };

  return (
    <Table>
      <TableCaption>Employees. Column headers are buttons that sort the list.</TableCaption>
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          <SortableHead field="fullName" label="Name" {...sortProps} />
          <SortableHead
            field="employeeNumber"
            label="Number"
            className="hidden md:table-cell"
            {...sortProps}
          />
          <SortableHead field="country" label="Country" className="hidden md:table-cell" {...sortProps} />
          <SortableHead
            field="department"
            label="Department"
            className="hidden lg:table-cell"
            {...sortProps}
          />
          <SortableHead
            field="jobTitle"
            label="Job title"
            className="hidden lg:table-cell"
            {...sortProps}
          />
          <SortableHead
            field="hireDate"
            label="Hired"
            className="hidden xl:table-cell"
            {...sortProps}
          />
          <TableHead scope="col">Status</TableHead>
          <TableHead scope="col" className="text-right">
            <span className="sr-only">Actions</span>
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {employees.map((employee) => (
          <TableRow key={employee.id}>
            <TableCell>
              <Link
                href={`/employees/${employee.id}`}
                className="rounded-sm font-medium underline-offset-4 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring"
              >
                {employee.fullName}
              </Link>
              <div className="text-xs break-all text-muted-foreground">{employee.email}</div>
              <div className="text-xs text-muted-foreground lg:hidden">
                {employee.jobTitle} · {formatDepartment(employee.department)}
              </div>
            </TableCell>
            <TableCell className="hidden font-mono text-xs md:table-cell">
              {employee.employeeNumber}
            </TableCell>
            <TableCell className="hidden md:table-cell">{employee.country.name}</TableCell>
            <TableCell className="hidden lg:table-cell">
              {formatDepartment(employee.department)}
            </TableCell>
            <TableCell className="hidden lg:table-cell">{employee.jobTitle}</TableCell>
            <TableCell className="hidden xl:table-cell">{formatDate(employee.hireDate)}</TableCell>
            <TableCell>
              <EmployeeStatusBadge status={employee.employmentStatus} />
            </TableCell>
            <TableCell>
              <div className="flex justify-end gap-1">
                <Button asChild variant="ghost" size="sm">
                  <Link href={`/employees/${employee.id}/edit`} aria-label={`Edit ${employee.fullName}`}>
                    <Pencil aria-hidden="true" />
                    Edit
                  </Link>
                </Button>
                {employee.employmentStatus === 'ACTIVE' ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                    aria-label={`Deactivate ${employee.fullName}`}
                    onClick={() => onDeactivate(employee)}
                  >
                    Deactivate
                  </Button>
                ) : (
                  <ReactivateButton
                    employee={employee}
                    size="sm"
                    variant="ghost"
                    onReactivated={onReactivated}
                  />
                )}
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
