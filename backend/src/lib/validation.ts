import type { z } from 'zod';
import { validationError, type ErrorDetail } from './errors.js';

/**
 * Parses `data` with a zod schema and returns the typed result, or throws a
 * 400 AppError whose `details` list every offending field. Zod's own error
 * object is never forwarded to the client.
 */
export function parseWith<S extends z.ZodType>(schema: S, data: unknown): z.output<S> {
  const result = schema.safeParse(data);
  if (result.success) return result.data;

  const details: ErrorDetail[] = [];
  for (const issue of result.error.issues) {
    if (issue.code === 'unrecognized_keys' && 'keys' in issue && Array.isArray(issue.keys)) {
      // Report each unknown field individually so a client can see exactly
      // which one was rejected (rather than one opaque, path-less issue).
      for (const key of issue.keys) {
        details.push({ field: String(key), message: 'Unknown field.' });
      }
      continue;
    }
    details.push({
      field: issue.path.length > 0 ? issue.path.map(String).join('.') : '(request)',
      message: issue.message,
    });
  }
  throw validationError(details);
}
