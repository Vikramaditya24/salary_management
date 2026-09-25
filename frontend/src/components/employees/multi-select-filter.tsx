'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export interface FilterOption {
  value: string;
  label: string;
}

interface MultiSelectFilterProps {
  label: string;
  options: FilterOption[];
  selected: string[];
  onChange: (next: string[]) => void;
  /** Adds a search box to the panel - worthwhile for long lists such as job titles. */
  searchable?: boolean;
}

/**
 * A disclosure button that opens a panel of native checkboxes. Native inputs keep keyboard and
 * screen-reader behaviour correct without a custom listbox; Escape and outside clicks close it.
 */
export function MultiSelectFilter({
  label,
  options,
  selected,
  onChange,
  searchable = false,
}: MultiSelectFilterProps) {
  const panelId = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, [open]);

  // A value from the URL that is not in the loaded options must still be visible (and removable).
  const known = new Set(options.map((option) => option.value));
  const all = [
    ...options,
    ...selected.filter((value) => !known.has(value)).map((value) => ({ value, label: value })),
  ];
  const needle = search.trim().toLowerCase();
  const visible = needle ? all.filter((option) => option.label.toLowerCase().includes(needle)) : all;

  function toggle(value: string, checked: boolean) {
    onChange(checked ? [...selected, value] : selected.filter((item) => item !== value));
  }

  return (
    <div
      ref={containerRef}
      className="relative"
      onKeyDown={(event) => {
        if (event.key === 'Escape' && open) {
          event.stopPropagation();
          setOpen(false);
          buttonRef.current?.focus();
        }
      }}
    >
      <Button
        ref={buttonRef}
        type="button"
        variant="outline"
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        onClick={() => setOpen((current) => !current)}
        className="w-full justify-between font-normal sm:w-auto"
      >
        <span>
          {label}
          {selected.length > 0 && <span className="font-medium"> ({selected.length})</span>}
        </span>
        <ChevronDown aria-hidden="true" />
      </Button>

      {open && (
        <div
          id={panelId}
          role="group"
          aria-label={`${label} filter`}
          className="absolute left-0 z-20 mt-1 w-72 max-w-[calc(100vw-2rem)] rounded-md border border-border bg-popover p-2 text-popover-foreground shadow-lg"
        >
          {searchable && (
            <Input
              type="search"
              aria-label={`Search ${label.toLowerCase()} options`}
              placeholder={`Search ${label.toLowerCase()}…`}
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="mb-2"
            />
          )}
          <ul className="max-h-64 overflow-y-auto">
            {visible.map((option) => {
              const inputId = `${panelId}-${option.value}`;
              return (
                <li key={option.value}>
                  <label
                    htmlFor={inputId}
                    className="flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent"
                  >
                    <input
                      id={inputId}
                      type="checkbox"
                      className="size-4 accent-primary"
                      checked={selected.includes(option.value)}
                      onChange={(event) => toggle(option.value, event.target.checked)}
                    />
                    {option.label}
                  </label>
                </li>
              );
            })}
            {visible.length === 0 && (
              <li className="px-2 py-1.5 text-sm text-muted-foreground">No matches</li>
            )}
          </ul>
          {selected.length > 0 && (
            <div className="mt-2 border-t border-border pt-2">
              <Button type="button" variant="ghost" size="sm" onClick={() => onChange([])}>
                Clear {label.toLowerCase()}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
