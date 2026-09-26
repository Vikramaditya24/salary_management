import type { FastifyInstance } from 'fastify';
import { prisma } from './lib/prisma.js';
import { DEPARTMENTS, EMPLOYMENT_STATUSES } from './employees/constants.js';
export async function registerReference(app: FastifyInstance) {
  app.get('/reference', async () => {
    const [countries, currencies] = await Promise.all([
      prisma.country.findMany({
        orderBy: { name: 'asc' },
        select: { code: true, name: true, defaultCurrencyCode: true },
      }),
      prisma.currency.findMany({
        orderBy: { code: 'asc' },
        select: { code: true, name: true, minorUnit: true },
      }),
    ]);
    return {
      data: { countries, currencies, departments: DEPARTMENTS, statuses: EMPLOYMENT_STATUSES },
    };
  });
}
