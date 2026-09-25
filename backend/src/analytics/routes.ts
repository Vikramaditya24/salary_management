import type { FastifyPluginAsync } from 'fastify';
import { parseSalaryInsightsQuery } from './schemas.js';
import type { SalaryAnalyticsService } from './service.js';

export interface SalaryAnalyticsRoutesOptions {
  service: SalaryAnalyticsService;
}

/**
 * HTTP adapter for the salary analytics service: parse + validate input,
 * call the service, shape the response. No business rules and no database
 * access here — see employees/routes.ts for the same split.
 */
export const salaryAnalyticsRoutes: FastifyPluginAsync<SalaryAnalyticsRoutesOptions> = async (
  app,
  options,
) => {
  const { service } = options;

  // Every figure in the response is derived from salary data: instruct
  // browsers and shared caches not to store any of it — same policy as the
  // employee endpoints that expose salary (employees/routes.ts).
  app.addHook('onRequest', async (_request, reply) => {
    reply.header('Cache-Control', 'no-store');
  });

  app.get('/api/analytics/salary', async (request) => {
    const query = parseSalaryInsightsQuery(request.query);
    return { data: await service.getSalaryInsights(query) };
  });
};
