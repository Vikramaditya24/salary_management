import Link from 'next/link';
import { Button } from '@/components/ui/button';
export default function NotFound() {
  return (
    <div className="border-border mx-auto max-w-lg rounded-lg border p-8 text-center">
      <h1 className="text-xl font-semibold">Page not found</h1>
      <p className="text-muted-foreground mt-2 text-sm">The address may have changed.</p>
      <Button asChild className="mt-5">
        <Link href="/employees">Back to employees</Link>
      </Button>
    </div>
  );
}
