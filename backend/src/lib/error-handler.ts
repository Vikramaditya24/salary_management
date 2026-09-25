import type { FastifyError, FastifyInstance } from 'fastify';
import { AppError, type ErrorDetail } from './errors.js';

interface ErrorBody {
  error: {
    code: string;
    message: string;
    details?: ErrorDetail[];
    requestId: string;
  };
}

function errorBody(
  code: string,
  message: string,
  requestId: string,
  details?: ErrorDetail[],
): ErrorBody {
  return {
    error: { code, message, ...(details && details.length > 0 ? { details } : {}), requestId },
  };
}

/**
 * Framework-level 4xx errors (malformed JSON, oversized body, wrong content
 * type, ...). Fastify's own messages are not forwarded: the client gets a
 * fixed, generic message per status so no parser/runtime detail leaks.
 */
function clientErrorFor(statusCode: number): { code: string; message: string } {
  switch (statusCode) {
    case 400:
      return { code: 'BAD_REQUEST', message: 'The request is malformed.' };
    case 404:
      return { code: 'NOT_FOUND', message: 'The requested resource was not found.' };
    case 413:
      return { code: 'PAYLOAD_TOO_LARGE', message: 'The request body is too large.' };
    case 415:
      return {
        code: 'UNSUPPORTED_MEDIA_TYPE',
        message: 'Unsupported content type; send application/json.',
      };
    default:
      return { code: 'REQUEST_ERROR', message: 'The request could not be processed.' };
  }
}

/**
 * One place that decides what a client is allowed to see when something goes
 * wrong:
 *  - AppError            -> its own status/code/message/details (all authored by us)
 *  - Fastify 4xx errors  -> a fixed generic message for that status
 *  - everything else     -> 500 + "INTERNAL_ERROR"; the real error is logged
 *                           server-side and correlated via `requestId`. Stack
 *                           traces, SQL, Prisma messages and constraint names
 *                           never reach the response.
 */
export function registerErrorHandling(app: FastifyInstance): void {
  app.setNotFoundHandler(async (request, reply) => {
    return reply
      .status(404)
      .send(errorBody('ROUTE_NOT_FOUND', 'The requested route does not exist.', request.id));
  });

  app.setErrorHandler((error: FastifyError, request, reply) => {
    if (error instanceof AppError) {
      return reply
        .status(error.statusCode)
        .send(errorBody(error.code, error.message, request.id, error.details));
    }

    const statusCode = typeof error.statusCode === 'number' ? error.statusCode : 500;
    if (statusCode >= 400 && statusCode < 500) {
      const { code, message } = clientErrorFor(statusCode);
      return reply.status(statusCode).send(errorBody(code, message, request.id));
    }

    request.log.error({ err: error }, 'Unhandled error while processing request');
    return reply
      .status(500)
      .send(errorBody('INTERNAL_ERROR', 'An unexpected error occurred.', request.id));
  });
}
