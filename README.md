# ACME Salary Management

A web application for ACME's HR Manager to maintain salary records for 10,000 employees across countries and answer compensation questions. The implementation uses a Fastify API, PostgreSQL and a responsive Next.js interface.

## Features

- Search, filter, sort and page the employee directory. Create, edit, deactivate and reactivate profiles.
- View current pay and dated salary history. Record changes without losing prior amounts.
- Compare headcount and average pay by country, department and role; inspect summary statistics and a salary distribution chart.
- Sign in with a configured HR Manager account. Seed 10,000 deterministic synthetic employees for a disposable demo.

Cross-country analytics convert annual pay to USD using **fixed illustrative rates**, not live exchange rates.

## Run locally

You need Node.js 24+, npm and Docker with Compose (or a PostgreSQL instance). From the repository root:

```sh
docker compose up -d
cd backend
cp .env.example .env
npm ci
npm run auth:hash -- 'choose-a-private-password'
```

Put the generated hash in `backend/.env` as `HR_PASSWORD_HASH`, and keep the plaintext password private. Set `HR_EMAIL` if you want an address other than `hr@acme.example`. Then:

```sh
npm run prisma:migrate:deploy
npm run db:seed
npm run dev
```

**The seed replaces employee and salary records. Run it only against an empty or disposable demo database.** Leave the API running and open a second terminal:

```sh
cd frontend
cp .env.example .env.local
npm ci
npm run dev
```

Open `http://localhost:3000/login`. Sign in with the email and password you configured. The local frontend calls `http://localhost:4000` by default. See the [backend](backend/README.md) and [frontend](frontend/README.md) guides for package-specific details.

## Tests and build

```sh
cd frontend
npm test
npm run lint
npm run format:check
npm run build
```

```sh
cd backend
npm run lint
npm run build
npm test
```

The backend's full test suite needs a separate migrated `acme_salary_test` PostgreSQL database. See [backend testing](backend/README.md) for setup and a unit-only command.

## Documentation

- [Requirements and exclusions](docs/requirements.md) — the one-page product brief.
- [Architecture](docs/architecture.md) and [engineering decisions](docs/decisions.md) — implementation and trade-offs.
- [API contract](docs/api.md) — the authoritative endpoint reference.
- [Deployment and reviewer smoke test](docs/deployment.md) — Render/Vercel handoff.
- [AI-assisted development note](docs/ai-workflow.md) — how the tools were used and where human review matters.

## Submission

A public deployment and demo video must be added before sending the assessment. The GitHub repository's existing commit history should be preserved; do not replace it with the Git metadata of a downloaded ZIP. After deployment, add the live frontend URL, demo video link and any reviewer access instructions here. Keep credentials and production database URLs out of the repository.
