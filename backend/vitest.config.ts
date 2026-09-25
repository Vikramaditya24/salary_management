import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts', 'prisma/**/*.test.ts'],
    reporters: 'default',
    // The DB-backed suites share one Postgres test database; running test
    // files one at a time keeps them from interfering with each other.
    fileParallelism: false,
    env: {
      NODE_ENV: 'test',
      DATABASE_URL: 'postgresql://postgres:postgres@localhost:5432/acme_salary_test',
      PORT: '4001',
    },
  },
});
