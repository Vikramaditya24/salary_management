'use client';

import { useState } from 'react';

import { ConfirmDialog } from '@/components/confirm-dialog';
import { useToast } from '@/components/toast-provider';
import { toApiError } from '@/lib/api/client';
import { deactivateEmployee, type Employee } from '@/lib/api/employees';

interface DeactivateEmployeeDialogProps {
  employee: Pick<Employee, 'id' | 'fullName'>;
  onClose: () => void;
  onDeactivated: () => void;
}

/**
 * Confirmation for the product's "delete": a soft delete that marks the employee TERMINATED
 * and keeps their salary history (see root docs/decisions.md). Mount it only while it is open.
 */
export function DeactivateEmployeeDialog({
  employee,
  onClose,
  onDeactivated,
}: DeactivateEmployeeDialogProps) {
  const { toast } = useToast();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function confirm() {
    setPending(true);
    setError(null);
    try {
      await deactivateEmployee(employee.id);
      toast({
        variant: 'success',
        title: `${employee.fullName} was deactivated`,
        description: 'They are now marked as terminated. You can reactivate them at any time.',
      });
      onDeactivated();
    } catch (err) {
      setError(toApiError(err).message);
      setPending(false);
    }
  }

  return (
    <ConfirmDialog
      title={`Deactivate ${employee.fullName}?`}
      description="This marks the employee as terminated and hides them from the default employee list. Their record and salary history are kept, and you can reactivate them later."
      confirmLabel="Deactivate"
      pendingLabel="Deactivating…"
      pending={pending}
      error={error}
      onConfirm={confirm}
      onCancel={onClose}
    />
  );
}
