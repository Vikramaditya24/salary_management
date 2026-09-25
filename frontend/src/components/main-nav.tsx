'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { cn } from '@/lib/utils';

export function MainNav() {
  const pathname = usePathname();
  const onEmployees = pathname === '/employees' || pathname.startsWith('/employees/');

  return (
    <nav aria-label="Main" className="flex gap-4 text-sm">
      <Link
        href="/employees"
        aria-current={onEmployees ? 'page' : undefined}
        className={cn(
          'rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-ring',
          onEmployees ? 'font-medium text-foreground' : 'text-muted-foreground hover:text-foreground',
        )}
      >
        Employees
      </Link>
      <span aria-disabled="true" className="text-muted-foreground/60">
        Analytics
      </span>
    </nav>
  );
}
