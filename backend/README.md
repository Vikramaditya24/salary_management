# ACME salary backend

Fastify, TypeScript, Prisma, PostgreSQL. One HR Manager account, a paginated employee directory, transactional salary history, and database aggregated salary insights for a 10,000 employee demo.

## Setup

Requires Node 24 (or compatible recent Node) and PostgreSQL with permission to install `pg_trgm`. Create a database and set `DATABASE_URL` in `.env` (copy `.env.example`). Set `HR_EMAIL`, and run `npm run auth:hash -- 'a-long-private-password'`; paste the resulting hash into `HR_PASSWORD_HASH`. Keep the plaintext password out of files and version control. Set `CORS_ORIGIN` to your frontend origin. Production startup requires a configured password hash. Use HTTPS in deployment because login returns a bearer token.

```sh
npm ci
npm run prisma:migrate:deploy
npm run db:seed
npm run dev
```

The seed creates exactly 10,000 synthetic employees and salary histories, using fixed seed 20260924. **The seed replaces all employees and salaries**: use only on an empty/demo database. It does not clear login sessions. Login with the email/password configured above. No default password is shipped.

## Commands

```sh
npm run build
npm run lint
npm test
npm run format:check
npm run verify:api
```

The full `npm test` suite includes PostgreSQL integration tests and requires a migrated `acme_salary_test` database at the URL in `vitest.config.ts`. Set up that database separately before running it. To run the unit and HTTP mock tests without PostgreSQL: `npx vitest run --exclude '**/*.db.test.ts'`.

The live API verification script expects seeded data and `VERIFY_API_TOKEN` set to a freshly obtained login token. The full contract and frontend integration flow are in [docs/api.md](docs/api.md). Design notes are in [docs/architecture.md](docs/architecture.md) and [docs/decisions.md](docs/decisions.md).
