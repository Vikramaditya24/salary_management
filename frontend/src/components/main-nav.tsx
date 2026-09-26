'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { cn } from '@/lib/utils';

export function MainNav() {
  const pathname = usePathname();
  const onEmployees = pathname === '/employees' || pathname.startsWith('/employees/');
  const onAnalytics = pathname.startsWith('/analytics');

  return (
    <nav
      aria-label="Main"
      className="border-border order-3 flex w-full gap-1 border-t pt-3 text-sm md:order-0 md:w-auto md:border-0 md:pt-0"
    >
      <Link
        href="/employees"
        aria-current={onEmployees ? 'page' : undefined}
        className={cn(
          'focus-visible:ring-ring rounded-full px-3 py-2 outline-none focus-visible:ring-2',
          onEmployees
            ? 'bg-secondary text-primary font-semibold'
            : 'text-muted-foreground hover:bg-secondary/70 hover:text-foreground',
        )}
      >
        Employees
      </Link>
      <Link
        href="/analytics/salary"
        aria-current={onAnalytics ? 'page' : undefined}
        className={cn(
          'focus-visible:ring-ring rounded-full px-3 py-2 outline-none focus-visible:ring-2',
          onAnalytics
            ? 'bg-secondary text-primary font-semibold'
            : 'text-muted-foreground hover:bg-secondary/70 hover:text-foreground',
        )}
      >
        Salary Insights
      </Link>
    </nav>
  );
}
