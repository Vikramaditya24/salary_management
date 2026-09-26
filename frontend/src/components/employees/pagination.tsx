'use client';

import { useId } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import type { PageMeta } from '@/lib/api/employees';
import { PAGE_SIZES } from '@/lib/employees/list-params';
import { formatCount } from '@/lib/format';
import { cn } from '@/lib/utils';

/** 1 … 4 5 6 … 369: always first, last, and the neighbours of the current page. */
export function pageWindow(current: number, total: number): (number | 'gap')[] {
  const wanted = new Set([1, total, current - 1, current, current + 1]);
  const pages = [...wanted].filter((p) => p >= 1 && p <= total).sort((a, b) => a - b);
  const result: (number | 'gap')[] = [];
  pages.forEach((page, index) => {
    if (index > 0 && page - pages[index - 1] > 1) result.push('gap');
    result.push(page);
  });
  return result;
}

interface PaginationProps {
  meta: PageMeta;
  /** Rows on the current page, for the "Showing x–y" summary. */
  count: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
}

export function Pagination({ meta, count, onPageChange, onPageSizeChange }: PaginationProps) {
  const sizeId = useId();
  const first = (meta.page - 1) * meta.pageSize + 1;
  const last = first + count - 1;

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-muted-foreground text-sm">
        Showing {formatCount(first)}–{formatCount(last)} of {formatCount(meta.totalItems)}
      </p>

      <div className="flex min-w-0 flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 text-sm">
          <label htmlFor={sizeId} className="text-muted-foreground">
            Rows per page
          </label>
          <Select
            id={sizeId}
            value={meta.pageSize}
            onChange={(event) => onPageSizeChange(Number(event.target.value))}
            className="w-20"
          >
            {PAGE_SIZES.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </Select>
        </div>

        <nav
          aria-label="Pagination"
          className="flex max-w-full items-center gap-1 overflow-x-auto pb-1"
        >
          <Button
            type="button"
            variant="outline"
            size="icon"
            aria-label="Previous page"
            disabled={!meta.hasPreviousPage}
            onClick={() => onPageChange(meta.page - 1)}
          >
            <ChevronLeft />
          </Button>
          {pageWindow(meta.page, meta.totalPages).map((entry, index) =>
            entry === 'gap' ? (
              <span key={`gap-${index}`} aria-hidden="true" className="text-muted-foreground px-1">
                …
              </span>
            ) : (
              <Button
                key={entry}
                type="button"
                variant={entry === meta.page ? 'default' : 'ghost'}
                size="icon"
                aria-label={`Page ${entry}`}
                aria-current={entry === meta.page ? 'page' : undefined}
                onClick={() => onPageChange(entry)}
                className={cn('tabular-nums', entry !== meta.page && 'font-normal')}
              >
                {entry}
              </Button>
            ),
          )}
          <Button
            type="button"
            variant="outline"
            size="icon"
            aria-label="Next page"
            disabled={!meta.hasNextPage}
            onClick={() => onPageChange(meta.page + 1)}
          >
            <ChevronRight />
          </Button>
        </nav>
      </div>
    </div>
  );
}
