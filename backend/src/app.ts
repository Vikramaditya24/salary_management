import { registerAuth } from './auth.js';
import { registerSalary } from './salary.js';
import { registerReference } from './reference.js';
import type { PrismaClient } from './generated/prisma/index.js';
import Fastify, { type FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import { salaryAnalyticsRoutes } from './analytics/routes.js';
import { createSalaryAnalyticsService, type SalaryAnalyticsService } from './analytics/service.js';
import { env } from './config/env.js';
import { registerErrorHandling } from './lib/error-handler.js';
import { prisma } from './lib/prisma.js';
import { employeeRoutes } from './employees/routes.js';
import { createEmployeeService, type EmployeeService } from './employees/service.js';
import { healthRoutes } from './routes/health.js';

export interface BuildAppOptions {
  /** Override the employee service (used by HTTP-layer tests). */
  employeeService?: EmployeeService;
  testOnlyDisableAuth?: boolean;
  authDb?: PrismaClient;
  salaryDb?: PrismaClient;
  /** Override the salary analytics service (used by HTTP-layer tests). */
  salaryAnalyticsService?: SalaryAnalyticsService;
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
                'req.body.password',
                '*.password',
                '*.token',
                '*.amount',
                '*.salary',
                '*.currentSalary',
                '*.totalSalaryUsd',
                '*.averageSalaryUsd',
                '*.minSalaryUsd',
                '*.maxSalaryUsd',
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

  await registerAuth(app, options.testOnlyDisableAuth, options.authDb);
  app.addHook('preValidation', async (request) => {
    if (
      ['POST', 'PATCH'].includes(request.method) &&
      request.url.split('?')[0] !== '/auth/logout' &&
      request.headers['content-type'] &&
      !/^application\/json(?:;|$)/i.test(request.headers['content-type'])
    ) {
      throw Object.assign(new Error('Unsupported content type'), { statusCode: 415 });
    }
  });
  await app.register(healthRoutes);
  await registerSalary(app, options.salaryDb);
  await registerReference(app);
  await app.register(employeeRoutes, {
    service: options.employeeService ?? createEmployeeService(prisma),
  });
  await app.register(salaryAnalyticsRoutes, {
    service: options.salaryAnalyticsService ?? createSalaryAnalyticsService(prisma),
  });

  return app;
}
