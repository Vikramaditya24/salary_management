import * as React from 'react';

import { cn } from '@/lib/utils';

function Input({ className, type, ...props }: React.ComponentProps<'input'>) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        'border-foreground/40 bg-background placeholder:text-muted-foreground focus-visible:ring-ring aria-invalid:border-destructive aria-invalid:ring-destructive/30 h-9 w-full min-w-0 rounded-md border px-3 py-1 text-sm shadow-xs outline-none focus-visible:ring-2 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:ring-2',
        className,
      )}
      {...props}
    />
  );
}

export { Input };
