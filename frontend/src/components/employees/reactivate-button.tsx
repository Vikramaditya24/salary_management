'use client';

import { useState } from 'react';

import { useToast } from '@/components/toast-provider';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { toApiError } from '@/lib/api/client';
import { updateEmployee, type Employee } from '@/lib/api/employees';

interface ReactivateButtonProps {
  employee: Pick<Employee, 'id' | 'fullName'>;
  onReactivated: () => void;
  size?: 'default' | 'sm';
  variant?: 'default' | 'outline' | 'ghost';
}

/** Reversing a deactivation is non-destructive, so it needs no confirmation - just feedback. */
export function ReactivateButton({
  employee,
  onReactivated,
  size = 'default',
  variant = 'outline',
}: ReactivateButtonProps) {
  const { toast } = useToast();
  const [pending, setPending] = useState(false);

  async function reactivate() {
    setPending(true);
    try {
      await updateEmployee(employee.id, { employmentStatus: 'ACTIVE' });
      toast({ variant: 'success', title: `${employee.fullName} was reactivated` });
      onReactivated();
    } catch (err) {
      toast({
        variant: 'error',
        title: `Could not reactivate ${employee.fullName}`,
        description: toApiError(err).message,
      });
    } finally {
      setPending(false);
    }
  }

  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      disabled={pending}
      aria-label={`Reactivate ${employee.fullName}`}
      onClick={reactivate}
    >
      {pending && <Spinner />}
      {pending ? 'Reactivating…' : 'Reactivate'}
    </Button>
  );
}
