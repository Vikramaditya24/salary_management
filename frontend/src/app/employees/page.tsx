import { Suspense } from 'react';
import type { Metadata } from 'next';

import { EmployeeListPage, ListSkeleton } from '@/components/employees/employee-list-page';

export const metadata: Metadata = { title: 'Employees · ACME Salary Management' };

export default function EmployeesPage() {
  // useSearchParams (inside the list) requires a Suspense boundary in the App Router.
  return (
    <Suspense fallback={<ListSkeleton />}>
      <EmployeeListPage />
    </Suspense>
  );
}
