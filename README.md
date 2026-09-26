# ACME Salary Management

A web application for one HR Manager to maintain salary records for a 10,000-employee, multi-country organization and answer compensation questions. This is an assessment project. The UI draws on Incubyte's mint, deep green, and lime visual palette; it remains an ACME product and is not affiliated with Incubyte.

## What works

- Search, filter, sort and paginate employees; create, edit, deactivate and reactivate records.
- View current salary and history; record a new salary without overwriting prior entries.
- Explore server-aggregated compensation by country, department and role with interactive charts and a salary distribution histogram. Cross-country amounts use a seeded static USD conversion table.
- Sign in as the configured HR Manager. No default plaintext password or self-registration is included.
- Generate a deterministic 10,000-employee demo dataset. **Seeding replaces employee and salary data; use it only on an empty/demo database.**

The [one-page requirements](docs/requirements.md), [architecture](docs/architecture.md), [decisions](docs/decisions.md), [API contract](docs/api.md), [assessment review](docs/assessment-review.md), and [AI workflow note](docs/ai-workflow.md) explain scope and trade-offs.

## Stack

- Backend: Node.js, Fastify, TypeScript, Prisma, PostgreSQL.
- Frontend: Next.js App Router, React, TypeScript, Tailwind CSS and small accessible components.
- Tests: Vitest, React Testing Library and database-backed integration tests.

## Local setup

Use Node 24+, npm and Docker or another PostgreSQL instance. From the repo root:

```sh
docker compose up -d
cd backend
cp .env.example .env
# Edit .env: set DATABASE_URL and HR_EMAIL.
npm ci
# Generate your own password hash with: npm run auth:hash -- 'a-long-private-password'
# Put the resulting hash in HR_PASSWORD_HASH; remember the plaintext password for login.
npx prisma migrate deploy
npm run db:seed
npm run dev
```

In a second terminal:

```sh
cd frontend
cp .env.example .env.local
npm ci
npm run dev
```

Visit `http://localhost:3000/login` and use the `HR_EMAIL` and password you configured. The backend defaults to `http://localhost:4000`; frontend `.env.local` points there. For details see [backend](backend/README.md) and [frontend](frontend/README.md) setup guides.

## Validation

Run `npm test`, `npm run lint`, `npm run build`, and `npm run format:check` in each package. Backend database integration tests require a migrated, disposable PostgreSQL test database; never run the demo seed on a production database.

## Submission state

The source archive is not a deployed instance and has no demo video or public repository URL. Configure HTTPS hosting for the frontend, API, and PostgreSQL; set production environment variables and CORS origin; then verify the seeded app end to end, record a demo, and share the real repository link. The imported archive had no `.git` history, so its earlier development commits cannot be recovered from it. See [assessment review](docs/assessment-review.md) for a precise status.
