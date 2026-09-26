'use client';

import { useEffect, useId, useState } from 'react';
import { Search, X } from 'lucide-react';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MAX_SEARCH_LENGTH, MAX_SEARCH_WORDS, countWords } from '@/lib/employees/list-params';

interface SearchBoxProps {
  /** The committed search text - i.e. what the URL currently says. */
  value: string;
  onSearch: (query: string) => void;
  debounceMs?: number;
}

/**
 * The text is local state only while the user is typing; it is committed to the URL after a
 * pause. Changes that come from the URL (back/forward, "clear filters") flow back in by
 * adjusting state during render - no effect needed.
 */
export function SearchBox({ value, onSearch, debounceMs = 300 }: SearchBoxProps) {
  const id = useId();
  const [text, setText] = useState(value);
  const [seenValue, setSeenValue] = useState(value);

  if (value !== seenValue) {
    setSeenValue(value);
    if (value !== text.trim()) setText(value);
  }

  const tooManyWords = countWords(text) > MAX_SEARCH_WORDS;

  useEffect(() => {
    const next = text.trim();
    if (tooManyWords || next === value) return;
    const timer = setTimeout(() => onSearch(next), debounceMs);
    return () => clearTimeout(timer);
  }, [text, value, tooManyWords, onSearch, debounceMs]);

  return (
    <div className="flex flex-col gap-1">
      <Label htmlFor={id} className="sr-only">
        Search employees
      </Label>
      <div className="relative">
        <Search
          aria-hidden="true"
          className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
        />
        <Input
          id={id}
          type="search"
          value={text}
          maxLength={MAX_SEARCH_LENGTH}
          placeholder="Search by name, email or employee number"
          aria-invalid={tooManyWords || undefined}
          aria-describedby={tooManyWords ? `${id}-error` : undefined}
          onChange={(event) => setText(event.target.value)}
          className="pr-9 pl-9 [&::-webkit-search-cancel-button]:hidden"
        />
        {text !== '' && (
          <button
            type="button"
            aria-label="Clear search"
            onClick={() => {
              setText('');
              onSearch('');
            }}
            className="text-muted-foreground hover:text-foreground focus-visible:ring-ring absolute top-1/2 right-2 -translate-y-1/2 rounded-sm p-1 outline-none focus-visible:ring-2"
          >
            <X className="size-4" />
          </button>
        )}
      </div>
      {tooManyWords && (
        <p id={`${id}-error`} className="text-destructive text-sm">
          Search supports up to {MAX_SEARCH_WORDS} words.
        </p>
      )}
    </div>
  );
}
