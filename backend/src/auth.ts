import { randomBytes, scryptSync, timingSafeEqual, createHash } from 'node:crypto';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from './lib/prisma.js';
import type { PrismaClient } from './generated/prisma/index.js';
import { env } from './config/env.js';
import { AppError } from './lib/errors.js';
import { parseWith } from './lib/validation.js';

const loginSchema = z.object({ email: z.email(), password: z.string().min(1) }).strict();
const digest = (token: string) => createHash('sha256').update(token).digest('hex');
const unauthorized = () => new AppError(401, 'UNAUTHORIZED', 'Authentication required.');
const expirationMs = 8 * 60 * 60 * 1000;

/** Hash format: scrypt$hex-salt$hex-key. Generate with npm run auth:hash. */
export function verifyPassword(password: string, encoded: string): boolean {
  const [algorithm, salt, hex] = encoded.split('$');
  if (algorithm !== 'scrypt' || !salt || !hex || !/^[0-9a-f]{64}$/.test(hex)) return false;
  const actual = scryptSync(password, Buffer.from(salt, 'hex'), 32);
  return timingSafeEqual(actual, Buffer.from(hex, 'hex'));
}

export async function registerAuth(
  app: FastifyInstance,
  bypassForTests = false,
  db: PrismaClient = prisma,
) {
  app.addHook('onRequest', async (request, reply) => {
    reply.header('Cache-Control', 'no-store');
    if (request.url.split('?')[0] === '/health' || request.url.split('?')[0] === '/auth/login')
      return;
    if (bypassForTests && env.NODE_ENV === 'test') return;
    const authorization = request.headers.authorization;
    if (!authorization || !/^Bearer [A-Za-z0-9_-]{43}$/.test(authorization)) throw unauthorized();
    const tokenHash = digest(authorization.slice(7));
    const session = await db.hrSession.findUnique({ where: { tokenHash } });
    if (!session || session.expiresAt <= new Date()) throw unauthorized();
    request.sessionTokenHash = tokenHash;
  });

  app.post('/auth/login', async (request, reply) => {
    const input = parseWith(loginSchema, request.body);
    // Always do a scrypt comparison, even for an unknown email.
    const fallback = 'scrypt$00112233445566778899aabbccddeeff$' + '0'.repeat(64);
    const valid = verifyPassword(input.password, env.HR_PASSWORD_HASH || fallback);
    if (!valid || input.email.toLowerCase() !== env.HR_EMAIL.toLowerCase()) {
      throw new AppError(401, 'INVALID_CREDENTIALS', 'Invalid email or password.');
    }
    const token = randomBytes(32).toString('base64url');
    const expiresAt = new Date(Date.now() + expirationMs);
    await db.hrSession.create({ data: { tokenHash: digest(token), expiresAt } });
    return reply.send({
      data: {
        token,
        tokenType: 'Bearer',
        expiresAt: expiresAt.toISOString(),
        user: { email: env.HR_EMAIL },
      },
    });
  });
  app.get('/auth/me', async () => ({ data: { email: env.HR_EMAIL } }));
  app.post('/auth/logout', async (request, reply) => {
    await db.hrSession.deleteMany({ where: { tokenHash: request.sessionTokenHash } });
    return reply.code(204).send();
  });
}

declare module 'fastify' {
  interface FastifyRequest {
    sessionTokenHash: string;
  }
}
