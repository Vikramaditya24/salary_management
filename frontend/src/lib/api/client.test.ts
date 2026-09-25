import { afterEach, describe, expect, it, vi } from 'vitest';

import { ApiError, apiRequest } from './client';

function respond(status: number, body: unknown) {
  const fetchMock = vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

describe('apiRequest', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('only sends Content-Type when there is a body', async () => {
    const fetchMock = respond(200, { data: {} });

    await apiRequest('/employees/1', { method: 'DELETE' });
    await apiRequest('/employees', { method: 'POST', body: { fullName: 'Ada' } });

    const [, deleteInit] = fetchMock.mock.calls[0];
    const [, postInit] = fetchMock.mock.calls[1];
    expect(deleteInit.headers).not.toHaveProperty('Content-Type');
    expect(deleteInit.body).toBeUndefined();
    expect(postInit.headers['Content-Type']).toBe('application/json');
    expect(postInit.body).toBe('{"fullName":"Ada"}');
  });

  it('turns the API error envelope into an ApiError', async () => {
    respond(409, {
      error: {
        code: 'EMAIL_ALREADY_EXISTS',
        message: 'Email taken.',
        details: [{ field: 'email', message: 'Taken' }, { nonsense: true }],
        requestId: 'r-1',
      },
    });

    const error = await apiRequest('/employees').catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({
      status: 409,
      code: 'EMAIL_ALREADY_EXISTS',
      message: 'Email taken.',
      details: [{ field: 'email', message: 'Taken' }],
      requestId: 'r-1',
    });
  });

  it('copes with an error response that is not the API envelope', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 502,
        json: async () => {
          throw new Error('not json');
        },
      }),
    );
    await expect(apiRequest('/employees')).rejects.toMatchObject({
      status: 502,
      code: 'HTTP_ERROR',
    });
  });

  it('reports an unreachable API as a NETWORK_ERROR', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));
    await expect(apiRequest('/employees')).rejects.toMatchObject({
      status: 0,
      code: 'NETWORK_ERROR',
    });
  });
});
