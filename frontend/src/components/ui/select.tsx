import * as React from 'react';

import { cn } from '@/lib/utils';

/** Styled native <select>: keyboard, screen-reader and mobile behaviour come for free. */
function Select({ className, ...props }: React.ComponentProps<'select'>) {
  return (
    <select
      data-slot="select"
      className={cn(
        'border-foreground/40 bg-background focus-visible:ring-ring aria-invalid:border-destructive aria-invalid:ring-destructive/30 h-9 w-full min-w-0 rounded-md border px-2 py-1 text-sm shadow-xs outline-none focus-visible:ring-2 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:ring-2',
        className,
      )}
      {...props}
    />
  );
}

export { Select };
