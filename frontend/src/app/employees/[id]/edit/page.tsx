import type { Metadata } from 'next';

import { EditEmployeePage } from '@/components/employees/edit-employee-page';

export const metadata: Metadata = { title: 'Edit employee · ACME Salary Management' };

export default async function EditEmployeeRoute({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <EditEmployeePage id={id} />;
}
