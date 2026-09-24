import type { FastifyInstance } from 'fastify';
import { prisma } from '../lib/prisma.js';

export async function healthRoutes(app: FastifyInstance) {
  app.get('/health', async (_request, reply) => {
    const startedAt = process.uptime();
    let database: 'connected' | 'unavailable' = 'unavailable';

    try {
      await prisma.$queryRaw`SELECT 1`;
      database = 'connected';
    } catch {
      // Swallowed intentionally: the app must stay up and report status even
      // if the database is unreachable (e.g. first run before `docker-compose
      // up`, or a misconfigured DATABASE_URL) rather than crash on startup.
    }

    const body = {
      status: database === 'connected' ? ('ok' as const) : ('degraded' as const),
      database,
      uptimeSeconds: Math.round(startedAt),
      timestamp: new Date().toISOString(),
    };

    return reply.status(database === 'connected' ? 200 : 503).send(body);
  });
}
