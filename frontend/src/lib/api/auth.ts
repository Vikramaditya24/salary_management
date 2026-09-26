import { apiRequest } from './client';

export interface SessionUser {
  email: string;
}
export interface LoginResult {
  token: string;
  tokenType: 'Bearer';
  expiresAt: string;
  user: SessionUser;
}

export async function login(email: string, password: string): Promise<LoginResult> {
  const result = await apiRequest<{ data: LoginResult }>('/auth/login', {
    method: 'POST',
    body: { email, password },
  });
  return result.data;
}
export async function currentUser(signal?: AbortSignal): Promise<SessionUser> {
  const result = await apiRequest<{ data: SessionUser }>('/auth/me', { signal });
  return result.data;
}
export async function logout(): Promise<void> {
  await apiRequest<null>('/auth/logout', { method: 'POST' });
}
