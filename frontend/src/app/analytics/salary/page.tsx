import type { Metadata } from 'next';

import { SalaryInsightsPage } from '@/components/analytics/salary-insights-page';

export const metadata: Metadata = { title: 'Salary Insights · ACME Salary Management' };

export default function AnalyticsSalaryPage() {
  return <SalaryInsightsPage />;
}
