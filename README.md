# ACME Salary Management

A web application for ACME's HR Manager to manage salary records for 10,000 employees across countries and answer compensation questions. Built with a Next.js frontend, Fastify API, Prisma, and PostgreSQL.

## Live submission

| Resource | Link or access |
| --- | --- |
| Web app | [Open the deployed application](https://salary-management-umber.vercel.app/) |
| Video walkthrough | [Watch the Loom demo](https://www.loom.com/share/9247d2728a9746ca9050fc8a18d84a7f) |
| API | [Render API](https://salary-management-2t8n.onrender.com) · [health check](https://salary-management-2t8n.onrender.com/health) |
| Demo email | `hr@acme.example` |
| Demo password | `hr-acme-password` |

The account and employee records are for this **synthetic demo**. Sign in through the web app; the API URL is provided for the health check and API review. Changes to demo salaries may be visible to other reviewers. No real employee data should be entered.

## What you can do

- Search, filter, sort, and page the employee directory; create, edit, deactivate, and reactivate employees.
- View current annual pay and dated salary history; record changes without overwriting prior amounts.
- Explore headcount, pay statistics, and charts by country, department, and role, including a salary distribution.
- Sign in as the configured HR Manager. A deterministic seed creates 10,000 synthetic employees and varied salary histories.

Cross-country analytics convert annual pay to USD using **fixed illustrative exchange rates**, not live rates.

## Design and trade-offs

The browser requests paginated employee pages and server-calculated analytics rather than loading all 10,000 records. The Fastify API owns input validation, authentication, and salary changes. PostgreSQL stores exact decimal amounts and enforces at most one current salary per employee with a partial unique index. A salary change closes the old interval and inserts a new record in one transaction.

The assessment targets one HR Manager. Payroll, approval workflows, bulk spreadsheet import, employee self-service, and live FX accounting are deliberately out of scope. See the [one-page requirements](docs/requirements.md), [architecture](docs/architecture.md), and [engineering decisions](docs/decisions.md) for the reasoning and limitations.

## Run locally

Use Node.js 24+, npm, and Docker with Compose (or another PostgreSQL instance). From the repository root:

```sh
docker compose up -d
cd backend
cp .env.example .env
npm ci
npm run auth:hash -- 'choose-a-private-password'
```

Put the resulting hash in `backend/.env` as `HR_PASSWORD_HASH`. Set `HR_EMAIL` if needed; the default is `hr@acme.example`. Use your chosen plaintext password to sign in locally. Then run:

```sh
npm run prisma:migrate:deploy
npm run db:seed
npm run dev
```

**The seed replaces employee and salary data. Run it only on an empty or disposable demo database.** With the API running, open another terminal from the repository root:

```sh
cd frontend
cp .env.example .env.local
npm ci
npm run dev
```

Open `http://localhost:3000/login`. The local frontend calls `http://localhost:4000` by default. On Windows, use `copy` in place of `cp`; in PowerShell, use `npm.cmd` if execution policy blocks `npm.ps1`. The [backend](backend/README.md) and [frontend](frontend/README.md) READMEs give package-specific setup details.

## Tests

```sh
cd frontend
npm test
npm run lint
npm run build
```

```sh
cd backend
npm run lint
npm run build
npm test
```

The full backend suite requires a **separate migrated** local `acme_salary_test` PostgreSQL database. Follow the [backend test setup](backend/README.md); never run database tests against the deployed demo database.

## Project documentation

- [Requirements and exclusions](docs/requirements.md)
- [Architecture](docs/architecture.md) and [engineering decisions](docs/decisions.md)
- [API contract](docs/api.md)
- [Deployment and reviewer smoke test](docs/deployment.md)
- [AI-assisted development note](docs/ai-workflow.md)

The repository's incremental Git commits show the implementation history.
