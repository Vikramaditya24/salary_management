'use client';

import { useCallback, useEffect, useState } from 'react';
import { toApiError, type ApiError } from '@/lib/api/client';

type Fetcher<T> = (signal: AbortSignal) => Promise<T>;

interface Settled<T> {
  fetcher: Fetcher<T>;
  attempt: number;
  data: T | undefined;
  error: ApiError | undefined;
}

/**
 * Minimal data-fetching hook (a query library is planned but not needed yet). `fetcher` must be
 * memoised by the caller - a new identity means a new request, and the previous one is aborted.
 *
 * Loading is derived, not stored: a result belongs to the (fetcher, attempt) that produced it,
 * so "loading" is simply "the latest result is for something else". Data from the previous
 * request is kept while the next one loads so pages don't flash empty.
 */
export function useApiQuery<T>(fetcher: Fetcher<T>) {
  const [attempt, setAttempt] = useState(0);
  const [settled, setSettled] = useState<Settled<T> | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    fetcher(controller.signal).then(
      (data) => {
        if (!controller.signal.aborted) {
          setSettled({ fetcher, attempt, data, error: undefined });
        }
      },
      (err: unknown) => {
        if (controller.signal.aborted) return;
        setSettled((previous) => ({
          fetcher,
          attempt,
          data: previous?.data,
          error: toApiError(err),
        }));
      },
    );
    return () => controller.abort();
  }, [fetcher, attempt]);

  const isCurrent = settled !== null && settled.fetcher === fetcher && settled.attempt === attempt;
  const data = settled?.data;
  const refetch = useCallback(() => setAttempt((n) => n + 1), []);

  return {
    data,
    error: isCurrent ? settled.error : undefined,
    /** A request is in flight (data may still be the previous result). */
    isFetching: !isCurrent,
    /** In flight and nothing to show yet. */
    isInitialLoading: !isCurrent && data === undefined,
    refetch,
  };
}
