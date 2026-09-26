'use client';

import { useState, type FormEvent } from 'react';
import { useAuth } from './auth-provider';
import { toApiError } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export function LoginPage() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (pending) return;
    setPending(true);
    setError('');
    try {
      await signIn(email.trim(), password);
    } catch (failure) {
      setError(toApiError(failure).message);
      setPending(false);
    }
  }
  return (
    <main className="bg-muted/40 flex min-h-screen items-center justify-center px-4 py-12">
      <div className="border-border bg-card w-full max-w-md rounded-xl border p-8 shadow-sm">
        <div className="mb-8">
          <p className="text-muted-foreground text-sm font-semibold tracking-wide">ACME / SALARY</p>
          <h1 className="mt-3 text-2xl font-semibold">HR Manager sign in</h1>
          <p className="text-muted-foreground mt-2 text-sm">
            Manage employee records and explore compensation.
          </p>
        </div>
        <form onSubmit={submit} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              autoComplete="username"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </div>
          {error && (
            <p role="alert" className="bg-destructive/10 text-destructive rounded-md p-3 text-sm">
              {error}
            </p>
          )}
          <Button className="w-full" disabled={pending} type="submit">
            {pending ? 'Signing in…' : 'Sign in'}
          </Button>
        </form>
      </div>
    </main>
  );
}
