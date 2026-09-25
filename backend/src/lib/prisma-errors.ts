/**
 * Duck-typed helpers for Prisma's known-request errors.
 *
 * Deliberately not `instanceof PrismaClientKnownRequestError`: keeping this
 * structural means the service layer (and its unit tests) never needs the
 * generated client at runtime, and it is not sensitive to duplicate copies of
 * the Prisma runtime. Relevant codes:
 *   P2002 unique constraint failed   P2003 foreign key constraint failed
 *   P2004 a database constraint failed   P2025 record to update/delete not found
 */
interface PrismaLikeError {
  code?: unknown;
  meta?: unknown;
  message?: unknown;
}

export function prismaErrorCode(error: unknown): string | undefined {
  if (typeof error !== 'object' || error === null) return undefined;
  const code = (error as PrismaLikeError).code;
  return typeof code === 'string' && /^P\d{4}$/.test(code) ? code : undefined;
}

/**
 * Lower-cased names (columns or constraint names) involved in a P2002 unique
 * violation, e.g. ["email"] or ["employees_email_key"]. Empty when Prisma
 * (or a driver adapter) did not report which constraint failed; callers must
 * handle that case rather than assume the target is always present.
 */
export function uniqueViolationFields(error: unknown): string[] {
  if (typeof error !== 'object' || error === null) return [];
  const { meta, message } = error as PrismaLikeError;
  const fields: string[] = [];

  if (typeof meta === 'object' && meta !== null) {
    const target = (meta as { target?: unknown }).target;
    if (typeof target === 'string') {
      fields.push(target);
    } else if (Array.isArray(target)) {
      for (const item of target) if (typeof item === 'string') fields.push(item);
    }
  }

  if (fields.length === 0 && typeof message === 'string') {
    const match = /fields?:\s*\(([^)]*)\)/i.exec(message);
    if (match?.[1]) {
      fields.push(...match[1].split(',').map((field) => field.replace(/[`'"\s]/g, '')));
    }
  }

  return fields.map((field) => field.toLowerCase());
}
