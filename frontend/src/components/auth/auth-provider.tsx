'use client';

import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { currentUser, login, logout, type SessionUser } from '@/lib/api/auth';
import { setBearerToken, setUnauthorizedHandler, toApiError } from '@/lib/api/client';
import { MainNav } from '@/components/main-nav';
import { Button } from '@/components/ui/button';

const KEY = 'acme.hr.session';
interface AuthContextValue {
  user: SessionUser;
  signIn(email: string, password: string): Promise<void>;
  signOut(): Promise<void>;
}
const AuthContext = createContext<AuthContextValue | null>(null);

function clearSession() {
  setBearerToken(null);
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    /* Storage unavailable: memory still clears. */
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<SessionUser | null>(null);
  const [checking, setChecking] = useState(true);
  const [authError, setAuthError] = useState('');

  const invalidate = useCallback(() => {
    clearSession();
    setUser(null);
    setChecking(false);
    const next = window.location.pathname + window.location.search;
    router.replace(`/login?next=${encodeURIComponent(next)}`);
  }, [router]);

  useEffect(() => {
    setUnauthorizedHandler(invalidate);
    let cancelled = false;
    const stored = (() => {
      try {
        return sessionStorage.getItem(KEY);
      } catch {
        return null;
      }
    })();
    if (!stored) {
      queueMicrotask(() => {
        if (!cancelled) {
          setChecking(false);
          if (pathname !== '/login') invalidate();
        }
      });
    } else {
      try {
        const parsed = JSON.parse(stored) as { token: string; expiresAt: string };
        if (!parsed.token || new Date(parsed.expiresAt).getTime() <= Date.now())
          throw new Error('Expired');
        setBearerToken(parsed.token);
        currentUser().then(
          (result) => {
            if (!cancelled) {
              setUser(result);
              setAuthError('');
              setChecking(false);
            }
          },
          (failure) => {
            if (!cancelled) {
              if (toApiError(failure).status === 401) invalidate();
              else {
                setAuthError('Could not verify your session. Check the API connection and retry.');
                setChecking(false);
              }
            }
          },
        );
      } catch {
        queueMicrotask(() => {
          if (!cancelled) invalidate();
        });
      }
    }
    return () => {
      cancelled = true;
      setUnauthorizedHandler(null);
    };
    // Session bootstrap runs once. Navigation is handled below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!checking && !user && pathname !== '/login') {
      router.replace(
        `/login?next=${encodeURIComponent(window.location.pathname + window.location.search)}`,
      );
    }
    if (!checking && user && pathname === '/login') {
      const next = new URLSearchParams(window.location.search).get('next');
      router.replace(next?.startsWith('/') && !next.startsWith('//') ? next : '/employees');
    }
  }, [checking, user, pathname, router]);

  async function signIn(email: string, password: string) {
    const session = await login(email, password);
    setBearerToken(session.token);
    try {
      sessionStorage.setItem(
        KEY,
        JSON.stringify({ token: session.token, expiresAt: session.expiresAt }),
      );
    } catch {
      /* The current tab still works with the in-memory token. */
    }
    setUser(session.user);
  }

  async function signOut() {
    try {
      await logout();
    } catch {
      /* Clear the local session even if the API is unavailable. */
    }
    clearSession();
    setUser(null);
    router.replace('/login');
  }

  if (authError)
    return (
      <main className="mx-auto mt-24 max-w-md space-y-4 px-4 text-center">
        <p role="alert">{authError}</p>
        <Button onClick={() => window.location.reload()}>Retry session check</Button>
      </main>
    );
  if (checking || (pathname !== '/login' && !user) || (pathname === '/login' && user)) {
    return (
      <main
        role="status"
        className="text-muted-foreground mx-auto mt-24 max-w-md px-4 text-center text-sm"
      >
        Checking your session…
      </main>
    );
  }
  if (pathname === '/login') {
    return (
      <AuthContext.Provider value={{ user: { email: '' }, signIn, signOut }}>
        {children}
      </AuthContext.Provider>
    );
  }
  return (
    <AuthContext.Provider value={{ user: user!, signIn, signOut }}>
      <header className="border-border bg-card border-b">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <span className="font-semibold tracking-tight">
            ACME <span className="text-muted-foreground">/ Salary</span>
          </span>
          <div className="flex items-center gap-5">
            <MainNav />
            <span className="text-muted-foreground hidden text-xs md:inline">{user!.email}</span>
            <Button size="sm" variant="outline" onClick={signOut}>
              Sign out
            </Button>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6">{children}</main>
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth requires AuthProvider');
  return context;
}
