# Backend

Fastify, TypeScript, Prisma and PostgreSQL. This service owns HR authentication, employee records, transactional salary history and aggregate analytics. The [root README](../README.md) covers the full local flow; [API contract](../docs/api.md) is authoritative.

## Local setup

Use Node.js 24+ and PostgreSQL. From the repository root, `docker compose up -d` starts the local development database. From `backend/`:

```sh
cp .env.example .env
npm ci
npm run auth:hash -- 'choose-a-private-password'
```

Set `HR_PASSWORD_HASH` in `.env` to the generated hash; keep the plaintext password private. `HR_EMAIL` defaults to `hr@acme.example`. Set `DATABASE_URL` to your database and `CORS_ORIGIN` to the exact frontend origin. `.env.example` contains local development defaults and no usable password hash.

```sh
npm run prisma:migrate:deploy
npm run db:seed
npm run dev
```

The seed deterministically creates exactly 10,000 synthetic employees with salary histories. **It replaces employee and salary rows. Never seed a live database with real data.** `/health` returns `200` when the database is connected and `503` when degraded. Production startup requires `HR_PASSWORD_HASH` and HTTPS hosting is necessary for the browser bearer-token flow.

## Tests

Unit and mocked HTTP tests without PostgreSQL:

```sh
npx vitest run --exclude '**/*.db.test.ts'
```

For the full suite, create a separate `acme_salary_test` database in local Postgres, then apply migrations to it. The test URL is currently set in `vitest.config.ts` to local port 5432:

```sh
docker compose exec postgres createdb -U postgres acme_salary_test
DATABASE_URL='postgresql://postgres:postgres@localhost:5432/acme_salary_test' npm run prisma:migrate:deploy
npm test
```

The `createdb` step is needed only once; if the test database already exists, proceed to migrations. Never point the test suite at the development or production database. Database-backed suites check constraints, salary changes and API behavior. Other checks: `npm run lint`, `npm run format:check`, `npm run build`. To verify a running seeded API, obtain a fresh login token and run `VERIFY_API_TOKEN=... npm run verify:api` locally without committing the token.

For technical rationale, see [architecture](../docs/architecture.md) and [decisions](../docs/decisions.md).
