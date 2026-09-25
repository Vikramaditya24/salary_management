import type { Metadata } from 'next';

import { CreateEmployeePage } from '@/components/employees/create-employee-page';

export const metadata: Metadata = { title: 'Add employee · ACME Salary Management' };

export default function NewEmployeePage() {
  return <CreateEmployeePage />;
}
