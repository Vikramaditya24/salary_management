import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export function BackToList() {
  return (
    <Link
      href="/employees"
      className="text-muted-foreground hover:text-foreground focus-visible:ring-ring inline-flex items-center gap-1 rounded-sm text-sm outline-none focus-visible:ring-2"
    >
      <ArrowLeft aria-hidden="true" className="size-4" />
      All employees
    </Link>
  );
}
