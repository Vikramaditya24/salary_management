import { describe, it, expect, afterAll } from 'vitest';
import { buildApp } from '../app.js';
import { prisma } from '../lib/prisma.js';

describe('GET /health', () => {
  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('responds with a status and database field', async () => {
    const app = await buildApp();

    const response = await app.inject({
      method: 'GET',
      url: '/health',
    });

    const body = response.json();

    expect([200, 503]).toContain(response.statusCode);
    expect(['ok', 'degraded']).toContain(body.status);
    expect(['connected', 'unavailable']).toContain(body.database);
    expect(typeof body.timestamp).toBe('string');

    await app.close();
  });
});
