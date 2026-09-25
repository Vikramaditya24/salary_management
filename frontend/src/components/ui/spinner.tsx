import { cn } from '@/lib/utils';

/** CSS-only spinner (decorative; pair it with text that says what is happening). */
function Spinner({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'inline-block size-4 animate-spin rounded-full border-2 border-current border-t-transparent',
        className,
      )}
    />
  );
}

export { Spinner };
