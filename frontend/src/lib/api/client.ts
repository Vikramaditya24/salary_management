import { apiUrl } from '@/lib/env';

export interface FieldError {
  field: string;
  message: string;
}

/** An error returned by (or while reaching) the API. `status` 0 means the request never got a response. */
export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details: FieldError[];
  readonly requestId: string | undefined;

  constructor(
    status: number,
    code: string,
    message: string,
    details: FieldError[] = [],
    requestId?: string,
  ) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
    this.requestId = requestId;
  }
}

export function toApiError(err: unknown): ApiError {
  if (err instanceof ApiError) return err;
  return new ApiError(0, 'UNKNOWN_ERROR', err instanceof Error ? err.message : 'Request failed.');
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
  signal?: AbortSignal;
}

function parseErrorEnvelope(status: number, json: unknown): ApiError {
  const envelope =
    typeof json === 'object' && json !== null && 'error' in json
      ? (json as { error?: Record<string, unknown> }).error
      : undefined;

  const code = typeof envelope?.code === 'string' ? envelope.code : 'HTTP_ERROR';
  const message =
    typeof envelope?.message === 'string' ? envelope.message : `Request failed (${status}).`;
  const details = Array.isArray(envelope?.details)
    ? (envelope.details as unknown[]).flatMap((item) => {
        if (typeof item !== 'object' || item === null) return [];
        const { field, message: detailMessage } = item as Record<string, unknown>;
        return typeof field === 'string' && typeof detailMessage === 'string'
          ? [{ field, message: detailMessage }]
          : [];
      })
    : [];
  const requestId = typeof envelope?.requestId === 'string' ? envelope.requestId : undefined;

  return new ApiError(status, code, message, details, requestId);
}

/**
 * Thin fetch wrapper. Content-Type is only sent when there is a body (Fastify rejects an
 * empty body that claims to be JSON, e.g. on DELETE - see docs/api.md).
 */
export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, signal } = options;
  const headers: Record<string, string> = { Accept: 'application/json' };
  let payload: string | undefined;
  if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
    payload = JSON.stringify(body);
  }

  let response: Response;
  try {
    response = await fetch(`${apiUrl}${path}`, { method, headers, body: payload, signal });
  } catch (err) {
    if (signal?.aborted) throw err;
    throw new ApiError(
      0,
      'NETWORK_ERROR',
      'Could not reach the server. Check your connection and that the API is running.',
    );
  }

  let json: unknown = null;
  try {
    json = await response.json();
  } catch {
    json = null;
  }

  if (!response.ok) throw parseErrorEnvelope(response.status, json);
  return json as T;
}
