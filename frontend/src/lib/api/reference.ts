import { apiRequest } from './client';
import type { Department, EmploymentStatus } from './employees';
export interface ReferenceData {
  countries: { code: string; name: string; defaultCurrencyCode: string }[];
  currencies: { code: string; name: string; minorUnit: number }[];
  departments: Department[];
  statuses: EmploymentStatus[];
}
export async function getReference(signal?: AbortSignal): Promise<ReferenceData> {
  const result = await apiRequest<{ data: ReferenceData }>('/reference', { signal });
  return result.data;
}
