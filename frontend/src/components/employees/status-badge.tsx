import { Badge } from '@/components/ui/badge';
import type { EmploymentStatus } from '@/lib/api/employees';

/** Status is always conveyed as text, never by colour alone. */
export function EmployeeStatusBadge({ status }: { status: EmploymentStatus }) {
  return status === 'ACTIVE' ? (
    <Badge variant="success">Active</Badge>
  ) : (
    <Badge variant="muted">Terminated</Badge>
  );
}
