'use client';

import { useEffect, useState } from 'react';
import { apiUrl } from '@/lib/env';

type HealthResponse = {
  status: 'ok' | 'degraded';
  database: 'connected' | 'unavailable';
  timestamp: string;
};

type State =
  | { phase: 'loading' }
  | { phase: 'loaded'; data: HealthResponse }
  | { phase: 'error'; message: string };

export function HealthStatus() {
  const [state, setState] = useState<State>({ phase: 'loading' });

  useEffect(() => {
    let cancelled = false;

    fetch(`${apiUrl}/health`)
      .then(async (res) => {
        const data = (await res.json()) as HealthResponse;
        if (!cancelled) setState({ phase: 'loaded', data });
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setState({
            phase: 'error',
            message: err instanceof Error ? err.message : 'Request failed',
          });
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  if (state.phase === 'loading') {
    return <p className="text-sm text-muted-foreground">Checking API connection…</p>;
  }

  if (state.phase === 'error') {
    return (
      <p className="text-sm text-destructive">
        Could not reach the API at {apiUrl} ({state.message}). Is the backend running?
      </p>
    );
  }

  const { status, database } = state.data;

  return (
    <div className="text-sm">
      <span className="font-medium">API:</span>{' '}
      <span className={status === 'ok' ? 'text-green-600' : 'text-amber-600'}>{status}</span>
      {' · '}
      <span className="font-medium">Database:</span> <span>{database}</span>
    </div>
  );
}
