import type { FastifyPluginAsync } from 'fastify';
import {
  parseCreateEmployeeBody,
  parseEmployeeParams,
  parseListEmployeesQuery,
  parseUpdateEmployeeBody,
} from './schemas.js';
import type { EmployeeService } from './service.js';

export interface EmployeeRoutesOptions {
  service: EmployeeService;
}

/**
 * HTTP adapter for the employee service: parse + validate input, call the
 * service, shape the response. No business rules and no database access here.
 * Errors are thrown as AppErrors and rendered by lib/error-handler.ts.
 *
 * Route order is not significant: static paths (/employees/filter-options)
 * take priority over parametric ones (/employees/:id) in Fastify's router.
 */
export const employeeRoutes: FastifyPluginAsync<EmployeeRoutesOptions> = async (app, options) => {
  const { service } = options;

  // Responses carry personal data and (for GET /employees/:id) salary data:
  // instruct browsers and shared caches not to store any of it.
  app.addHook('onRequest', async (_request, reply) => {
    reply.header('Cache-Control', 'no-store');
  });

  app.get('/employees', async (request) => {
    const query = parseListEmployeesQuery(request.query);
    return service.list(query);
  });

  app.get('/employees/filter-options', async () => {
    return { data: await service.getFilterOptions() };
  });

  app.get('/employees/:id', async (request) => {
    const { id } = parseEmployeeParams(request.params);
    return { data: await service.getById(id) };
  });

  app.post('/employees', async (request, reply) => {
    const input = parseCreateEmployeeBody(request.body);
    const employee = await service.create(input);
    return reply.code(201).header('Location', `/employees/${employee.id}`).send({ data: employee });
  });

  app.patch('/employees/:id', async (request) => {
    const { id } = parseEmployeeParams(request.params);
    const input = parseUpdateEmployeeBody(request.body);
    return { data: await service.update(id, input) };
  });

  // Soft delete — see docs/decisions.md #15. Responds 200 with the resulting
  // (TERMINATED) employee rather than 204, because the row still exists.
  app.delete('/employees/:id', async (request) => {
    const { id } = parseEmployeeParams(request.params);
    return { data: await service.deactivate(id) };
  });
};
