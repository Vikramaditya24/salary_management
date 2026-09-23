# Architecture — ACME Salary Management

## Overview
A conventional three-tier web app, deliberately boring: React SPA → REST API →
Postgres. No queues, no microservices, no caching layer — 10,000 employees is a
small relational dataset and does not justify that complexity.

```
React (Vite + TS) ──HTTP/JSON──> Express (Node + TS) ──SQL──> PostgreSQL
        │                              │
   shadcn/ui + Tailwind          Prisma ORM + migrations
```

Monorepo, two workspaces: `/backend` and `/frontend`. Not split into separate repos
— nothing here needs independent deploy cadences, and one repo keeps commit history
(the thing the assessment explicitly wants to read) coherent.

## Frontend
- **React + Vite + TypeScript.** Vite over full Next.js: there's no need for SSR,
  file-based routing complexity, or API routes when there's already a dedicated
  backend — a plain SPA is simpler to reason about and test.
- **shadcn/ui + Tailwind** for components (table, dialog, form, badge) — lightweight,
  no heavy runtime, easy to keep visually clean without hand-rolling CSS.
- **Structure:**
  ```
  src/
    pages/          EmployeeList, EmployeeDetail, Analytics, Login
    components/     DataTable, SalaryForm, SalaryHistoryTimeline, Filters
    api/            typed fetch client per resource
    hooks/          data-fetching hooks (React Query)
  ```
- **TanStack Query** for server-state (caching, pagination, refetch) rather than
  hand-rolled loading/error state per page.
- Employee list is server-paginated and server-filtered — the client never holds
  all 10,000 rows.

## Backend / API
- **Express + TypeScript.** REST, not GraphQL — the query shapes are simple and
  known in advance (list/filter, get-by-id, create, aggregate); GraphQL's
  flexibility isn't needed and adds setup/tooling cost.
- **Prisma** as ORM: type-safe queries, migrations, and a schema file that doubles
  as living documentation of the data model.
- **Layering:** `routes → controllers → services → prisma`. Services hold business
  rules (e.g. "closing out" the previous salary record when a new one is added) and
  are what unit tests target directly, without spinning up HTTP.
- **Key endpoints:**
  - `GET /employees` — paginated, filterable (country, department, role, search)
  - `GET /employees/:id` — profile + salary history
  - `POST /employees/:id/salary` — add a new salary record (closes prior one)
  - `GET /analytics/summary` — aggregate stats, filterable by the same dimensions
  - `POST /auth/login` — single HR Manager account, returns a JWT
- Validation with `zod` at the route boundary; DB constraints as the last line of
  defense (never trust the client for salary amounts/dates).

## Database Design
Postgres. High-level schema (exact columns finalized during implementation):

- **employees**: id, full_name, email, country, department, role_title,
  employment_status, hire_date
- **salary_records**: id, employee_id (FK), amount, currency, effective_date,
  end_date (null = current), created_by, created_at
- **users**: id, email, password_hash — just the HR Manager account(s)

Salary is modeled as a *history table*, not a column on `employees`: this gives
audit trail and "what did this person earn as of date X" for free, without a
separate audit-log table bolted on afterward.

Indexes: `employees(country)`, `employees(department)`, `salary_records(employee_id,
end_date)` — the columns actually used for filtering and "current salary" lookups.
No full-text search engine; `ILIKE`/trigram index on name is sufficient at this
scale.

## Data Flows
- **List/filter employees:** frontend sends query params → API builds a Prisma
  `where` clause + `skip/take` → single indexed query → paginated JSON.
- **Record a raise:** API sets `end_date = today` on the current salary row and
  inserts a new one in a single DB transaction — never two separate writes that
  could partially fail.
- **Analytics:** computed with SQL `GROUP BY`/aggregate functions inside Postgres,
  not pulled into Node and reduced in memory — correct even as filters change, and
  it's the database's job, not the API's.

## Testing Strategy
- **Backend unit tests (Vitest):** service-layer logic — salary history transitions,
  validation edge cases, aggregation math — run against a test database, fast and
  deterministic.
- **API integration tests (Supertest):** the handful of critical endpoints
  end-to-end (create salary, list with filters, analytics summary).
- **Frontend:** light component tests (React Testing Library) for the parts with
  actual logic (salary form validation, table filtering), not exhaustive
  snapshot coverage.
- Explicitly not chasing 100% coverage — the brief asks for a "meaningful set of
  tests," not exhaustive ones; effort goes to the salary-history and aggregation
  logic, since that's where a bug would silently produce wrong numbers.

## Deployment
- **Local:** `docker-compose up` — Postgres + backend + frontend, one command.
- **Deployed:** Railway (backend + managed Postgres) + Vercel (frontend static
  build). Chosen for zero-cost tiers and minimal config — appropriate for a
  take-home, not a claim about production readiness.
- Environment variables (DB URL, JWT secret) via `.env`, never committed;
  `.env.example` checked in instead.

## Handling 10,000 Employees Comfortably
This is a small dataset for Postgres (10k rows, maybe 30-50k salary-history rows
over time) — the design choices that matter are the ones that avoid *accidentally*
turning it into a slow app, not exotic scaling work:
- Pagination everywhere the list could return >100 rows.
- Indexes on every column used in a `WHERE`/`GROUP BY`.
- Aggregates computed in SQL, so response size and compute stay in the database
  regardless of filter combination.
- Seed script uses batched inserts, not one-row-at-a-time round trips.
No sharding, no read replicas, no Redis cache — all unnecessary at this scale and
would only add operational surface area for no measurable benefit.

## Security Considerations
- Authenticated access only; no public endpoints beyond `/auth/login`.
- Passwords hashed (bcrypt); JWT with a short-ish expiry.
- Salary amounts never written to application logs.
- Server-side authorization check on every mutating endpoint (not just UI hiding).
- Input validation (zod) + parameterized queries via Prisma — no raw SQL string
  concatenation.
- `.env` / secrets excluded via `.gitignore`; only `.env.example` committed.
