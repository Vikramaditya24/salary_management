import type { Metadata } from 'next';

import { EmployeeDetailPage } from '@/components/employees/employee-detail-page';

export const metadata: Metadata = { title: 'Employee · ACME Salary Management' };

export default async function EmployeePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <EmployeeDetailPage id={id} />;
}
