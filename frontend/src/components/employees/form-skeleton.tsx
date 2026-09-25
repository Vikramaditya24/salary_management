import { Skeleton } from '@/components/ui/skeleton';

export function FormSkeleton() {
  return (
    <div role="status" aria-live="polite" className="grid gap-5 sm:grid-cols-2">
      <span className="sr-only">Loading form…</span>
      {Array.from({ length: 6 }, (_, index) => (
        <Skeleton key={index} className="h-14 w-full" />
      ))}
    </div>
  );
}
