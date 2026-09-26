import type { Metadata } from 'next';
import { SalaryChangePage } from '@/components/employees/salary-change-page';
export const metadata: Metadata = { title: 'Change salary · ACME Salary' };
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <SalaryChangePage id={id} />;
}
