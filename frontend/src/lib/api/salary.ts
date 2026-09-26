import { apiRequest } from './client';
import type { SalaryRecord } from './employees';

export interface SalaryInput {
  amount: string;
  currencyCode: string;
  effectiveDate: string;
}
export async function changeSalary(id: string, input: SalaryInput): Promise<SalaryRecord> {
  const result = await apiRequest<{ data: SalaryRecord }>(
    `/employees/${encodeURIComponent(id)}/salary`,
    { method: 'POST', body: input },
  );
  return result.data;
}
