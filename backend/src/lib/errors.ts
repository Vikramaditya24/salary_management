/**
 * Application-level errors that are safe to show to API clients.
 *
 * Anything that is NOT an AppError is treated as an unexpected failure by the
 * global error handler (lib/error-handler.ts) and is reported to the client
 * as a generic 500 with no internal detail.
 */
export interface ErrorDetail {
  /** Name of the offending request field, e.g. "email". */
  field: string;
  message: string;
}

export class AppError extends Error {
  readonly statusCode: number;
  readonly code: string;
  readonly details: ErrorDetail[] | undefined;

  constructor(statusCode: number, code: string, message: string, details?: ErrorDetail[]) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

/** 400 — the request is structurally invalid (wrong type, missing field, bad format). */
export function validationError(details: ErrorDetail[]): AppError {
  return new AppError(400, 'VALIDATION_ERROR', 'The request is invalid.', details);
}

/** 404 — the addressed resource does not exist. */
export function notFound(code: string, message: string): AppError {
  return new AppError(404, code, message);
}

/** 409 — the request conflicts with existing data (e.g. a unique value is taken). */
export function conflict(code: string, message: string, details?: ErrorDetail[]): AppError {
  return new AppError(409, code, message, details);
}

/** 422 — the request is well-formed but violates a business rule. */
export function unprocessable(code: string, message: string, details?: ErrorDetail[]): AppError {
  return new AppError(422, code, message, details);
}
