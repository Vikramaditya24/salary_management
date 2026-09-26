'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { cn } from '@/lib/utils';

export function MainNav() {
  const pathname = usePathname();
  const onEmployees = pathname === '/employees' || pathname.startsWith('/employees/');
  const onAnalytics = pathname.startsWith('/analytics');

  return (
    <nav aria-label="Main" className="flex gap-4 text-sm">
      <Link
        href="/employees"
        aria-current={onEmployees ? 'page' : undefined}
        className={cn(
          'focus-visible:ring-ring rounded-sm outline-none focus-visible:ring-2',
          onEmployees
            ? 'text-foreground font-medium'
            : 'text-muted-foreground hover:text-foreground',
        )}
      >
        Employees
      </Link>
      <Link
        href="/analytics/salary"
        aria-current={onAnalytics ? 'page' : undefined}
        className={cn(
          'focus-visible:ring-ring rounded-sm outline-none focus-visible:ring-2',
          onAnalytics
            ? 'text-foreground font-medium'
            : 'text-muted-foreground hover:text-foreground',
        )}
      >
        Salary Insights
      </Link>
    </nav>
  );
}
