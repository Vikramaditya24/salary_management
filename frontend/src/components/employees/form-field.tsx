import type { ReactNode } from 'react';

import { Label } from '@/components/ui/label';

export interface ControlProps {
  id: string;
  'aria-invalid': boolean | undefined;
  'aria-describedby': string | undefined;
  'aria-required': boolean | undefined;
}

interface FormFieldProps {
  id: string;
  label: string;
  required?: boolean;
  hint?: string;
  error?: string;
  children: (control: ControlProps) => ReactNode;
}

/** Wires a label, hint and error message to a control with the right ARIA attributes. */
export function FormField({ id, label, required, hint, error, children }: FormFieldProps) {
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const describedBy = [hint ? hintId : null, error ? errorId : null].filter(Boolean).join(' ');

  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>
        {label}
        {required && (
          <span aria-hidden="true" className="text-destructive">
            {' '}
            *
          </span>
        )}
      </Label>
      {children({
        id,
        'aria-invalid': error ? true : undefined,
        'aria-describedby': describedBy || undefined,
        'aria-required': required ? true : undefined,
      })}
      {hint && (
        <p id={hintId} className="text-muted-foreground text-xs">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className="text-destructive text-sm">
          {error}
        </p>
      )}
    </div>
  );
}
