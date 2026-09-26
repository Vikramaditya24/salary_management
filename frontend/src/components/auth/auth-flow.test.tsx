import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { mockApi, apiError } from '@/test/api';
import { resetNavigation, router, setPathname } from '@/test/navigation';
import { setBearerToken, setUnauthorizedHandler } from '@/lib/api/client';
import { AuthProvider } from './auth-provider';
import { LoginPage } from './login-page';

vi.mock('next/navigation', async () => (await import('@/test/navigation')).navigationModule);
vi.mock('next/link', async () => await import('@/test/next-link'));
const session = {
  token: 'test-token',
  tokenType: 'Bearer',
  expiresAt: '2999-01-01T00:00:00.000Z',
  user: { email: 'hr@acme.example' },
};

beforeEach(() => {
  resetNavigation();
  sessionStorage.clear();
  setBearerToken(null);
});
afterEach(() => {
  vi.unstubAllGlobals();
  setBearerToken(null);
  setUnauthorizedHandler(null);
});

describe('authentication flow', () => {
  it('keeps protected screens hidden and redirects unauthenticated visitors', async () => {
    render(
      <AuthProvider>
        <p>Private employee records</p>
      </AuthProvider>,
    );
    expect(screen.queryByText('Private employee records')).not.toBeInTheDocument();
    await waitFor(() =>
      expect(router.replace).toHaveBeenCalledWith(expect.stringContaining('/login?next=')),
    );
  });

  it('shows invalid credentials, signs in, and sends bearer authentication', async () => {
    setPathname('/login');
    let success = false;
    const fetchMock = mockApi((req) => {
      if (req.url.pathname === '/auth/login')
        return success
          ? { body: { data: session } }
          : apiError(401, 'INVALID_CREDENTIALS', 'Invalid email or password.');
      return { body: { data: session.user } };
    });
    render(
      <AuthProvider>
        <LoginPage />
      </AuthProvider>,
    );
    fireEvent.change(await screen.findByLabelText('Email'), {
      target: { value: 'hr@acme.example' },
    });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'wrong' } });
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Invalid email or password.');
    success = true;
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'correct' } });
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith('/employees'));
    expect(JSON.parse(sessionStorage.getItem('acme.hr.session')!).token).toBe('test-token');
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('restores a tab session, attaches bearer token, and revokes it on logout', async () => {
    sessionStorage.setItem('acme.hr.session', JSON.stringify(session));
    const fetchMock = mockApi((req) =>
      req.url.pathname === '/auth/me'
        ? { body: { data: session.user } }
        : { status: 204, body: null },
    );
    render(
      <AuthProvider>
        <p>Private employee records</p>
      </AuthProvider>,
    );
    expect(await screen.findByText('Private employee records')).toBeInTheDocument();
    expect(fetchMock.mock.calls[0][1]?.headers).toMatchObject({
      Authorization: 'Bearer test-token',
    });
    fireEvent.click(screen.getByRole('button', { name: 'Sign out' }));
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith('/login'));
    expect(sessionStorage.getItem('acme.hr.session')).toBeNull();
    expect(fetchMock.mock.calls[1][1]?.headers).toMatchObject({
      Authorization: 'Bearer test-token',
    });
  });

  it('clears an expired server session', async () => {
    sessionStorage.setItem('acme.hr.session', JSON.stringify(session));
    mockApi(() => apiError(401, 'UNAUTHORIZED', 'Authentication required.'));
    render(
      <AuthProvider>
        <p>Private employee records</p>
      </AuthProvider>,
    );
    await waitFor(() =>
      expect(router.replace).toHaveBeenCalledWith(expect.stringContaining('/login?next=')),
    );
    expect(sessionStorage.getItem('acme.hr.session')).toBeNull();
    expect(screen.queryByText('Private employee records')).not.toBeInTheDocument();
  });
});
