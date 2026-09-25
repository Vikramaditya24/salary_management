import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export function BackToList() {
  return (
    <Link
      href="/employees"
      className="inline-flex items-center gap-1 rounded-sm text-sm text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
    >
      <ArrowLeft aria-hidden="true" className="size-4" />
      All employees
    </Link>
  );
}
