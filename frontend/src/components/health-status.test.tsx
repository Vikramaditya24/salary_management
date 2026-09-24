import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { HealthStatus } from './health-status';

describe('HealthStatus', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('shows a loading state, then the API status once the request resolves', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        json: () =>
          Promise.resolve({
            status: 'ok',
            database: 'connected',
            timestamp: new Date().toISOString(),
          }),
      }),
    );

    render(<HealthStatus />);

    expect(screen.getByText(/checking api connection/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('ok')).toBeInTheDocument();
    });
    expect(screen.getByText('connected')).toBeInTheDocument();
  });

  it('shows an error message when the request fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network down')));

    render(<HealthStatus />);

    await waitFor(() => {
      expect(screen.getByText(/could not reach the api/i)).toBeInTheDocument();
    });
  });
});
