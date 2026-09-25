import Fastify, { type FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import { env } from './config/env.js';
import { registerErrorHandling } from './lib/error-handler.js';
import { prisma } from './lib/prisma.js';
import { employeeRoutes } from './employees/routes.js';
import { createEmployeeService, type EmployeeService } from './employees/service.js';
import { healthRoutes } from './routes/health.js';

export interface BuildAppOptions {
  /** Override the employee service (used by HTTP-layer tests). */
  employeeService?: EmployeeService;
}

/** Largest accepted request body. Employee payloads are a few hundred bytes. */
const BODY_LIMIT_BYTES = 32 * 1024;

export async function buildApp(options: BuildAppOptions = {}): Promise<FastifyInstance> {
  const app = Fastify({
    logger:
      env.NODE_ENV === 'test'
        ? false
        : {
            level: env.NODE_ENV === 'development' ? 'info' : 'warn',
            // Defence in depth: request bodies are not logged by default, but
            // if any log call ever includes a salary-bearing object or a
            // credential, these paths are masked.
            redact: {
              paths: [
                'req.headers.authorization',
                'req.headers.cookie',
                '*.amount',
                '*.salary',
                '*.currentSalary',
              ],
              censor: '[REDACTED]',
            },
          },
    bodyLimit: BODY_LIMIT_BYTES,
  });

  registerErrorHandling(app);

  await app.register(cors, {
    origin: env.CORS_ORIGIN,
    // @fastify/cors only allows simple methods by default; the employee API
    // needs PATCH and DELETE from the browser.
    methods: ['GET', 'HEAD', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  });

  await app.register(healthRoutes);
  await app.register(employeeRoutes, {
    service: options.employeeService ?? createEmployeeService(prisma),
  });

  return app;
}
