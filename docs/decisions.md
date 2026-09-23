# Decisions

Format: Decision → Context → Alternatives considered → Rationale.

## 1. Backend: Node.js + Express + TypeScript
**Context:** brief says "language/framework as per the role you applied for
(preferred)"; no role was specified to me, so I resolved this against the
applicant's actual day-to-day stack (Node/Express/TS, React/Next, Postgres/Mongo).
**Alternatives considered:** Next.js full-stack (API routes instead of a separate
Express service).
**Rationale:** a separate Express API makes the backend/API design explicit and
independently testable — closer to what the assessment says it's evaluating
("engineering fundamentals," "architectural decisions") than folding it into
Next.js API routes, which would blur frontend/backend and make the API harder to
test in isolation.

## 2. Frontend: React + Vite, not Next.js
**Context:** requirements allow "ReactJS or NextJS."
**Alternatives considered:** Next.js.
**Rationale:** no SSR/SEO need for an internal HR tool behind a login; Next.js's
routing/data-fetching conventions solve problems this app doesn't have. Vite + React
Router is simpler to set up, test, and reason about for a pure SPA.

## 3. Relational DB: PostgreSQL, via Prisma ORM
**Context:** "Relational database of your choice, like SQLite" — SQLite is
explicitly offered as an acceptable baseline.
**Alternatives considered:** SQLite (simplest possible option); raw SQL / Knex
instead of an ORM.
**Rationale:** Postgres over SQLite because the deployed version needs concurrent
access and a real deployment story (managed Postgres is one click on Railway/Render;
SQLite complicates deployment and concurrent writes). Prisma over raw SQL/Knex for
type-safe queries and migrations that double as schema documentation — worth the
small dependency for a data model that will evolve (salary history, filters).

## 4. Salary stored as an append-only history table, not a column
**Context:** the app needs to answer "how does the org pay people," which implies
trustworthy point-in-time data, and salaries change over time.
**Alternatives considered:** single `salary` column on `employees`, overwritten on
change (simplest); separate `audit_log` table bolted alongside a mutable salary
column.
**Rationale:** a history table gets correctness (never lose a past value), audit
trail, and "current salary" (the row with `end_date IS NULL`) in one structure,
instead of a mutable field plus a bolted-on log that could drift out of sync.

## 5. Analytics computed in SQL, not client-side or in a caching layer
**Context:** the HR Manager's key job-to-be-done is answering aggregate questions.
**Alternatives considered:** fetch filtered rows to the client and aggregate in
JS/React; precompute and cache aggregates.
**Rationale:** 10,000 rows aggregate trivially fast in Postgres with `GROUP BY`;
computing client-side would mean shipping large payloads and duplicating logic that
belongs in the data layer. Caching is unnecessary complexity at this scale and risks
serving stale numbers for a tool whose whole value is trustworthy numbers.

## 6. No natural-language / LLM-powered querying
**Context:** the problem statement is phrased as "answer questions about how the org
pays people," which could be (mis)read as inviting an AI chat interface.
**Alternatives considered:** an LLM-backed Q&A box over the salary data.
**Rationale:** the actual questions an HR manager asks are a small, known set
(averages/medians/distributions by country, department, role). A structured,
filterable dashboard answers them deterministically and instantly; an LLM layer
would add cost, latency, and a real risk of confidently wrong numbers on data where
correctness matters — the opposite of what's being assessed.

## 7. Single HR Manager role, no RBAC
**Context:** the brief names exactly one persona.
**Alternatives considered:** building admin/HR/employee roles.
**Rationale:** inventing roles nobody asked for is scope creep in a take-home with a
time budget; a single authenticated account satisfies "sensitive data, access
control" without speculative complexity.

## 8. Static exchange-rate table for cross-country comparisons
**Context:** "multiple countries" implies multiple currencies; comparing pay across
countries requires a common unit.
**Alternatives considered:** live FX API integration; report only within-currency
(no cross-country aggregate at all).
**Rationale:** a live FX dependency is disproportionate to what it buys for a
take-home reviewer; showing native-currency figures per country plus a converted
view (using seeded static rates, clearly labeled as such) answers the cross-country
question without an external dependency or non-determinism in tests.

## 9. Testing: Vitest + Supertest, focused on service/business logic
**Context:** brief asks for "meaningful," "fast," "deterministic" tests, not
maximal coverage.
**Alternatives considered:** Jest (equally valid); heavy end-to-end browser tests
(Playwright/Cypress).
**Rationale:** Vitest for consistency with a Vite frontend and fast TS-native
execution. No E2E browser suite — given the time budget, unit/integration coverage
of salary-history transitions and aggregation logic (where a silent bug would
produce wrong numbers) is higher-value than browser-level tests of a small UI.

## 10. Deployment: Railway (API + Postgres) + Vercel (frontend)
**Context:** "fully functional deployed software" is required.
**Alternatives considered:** Render, Fly.io, a single Dockerized VM.
**Rationale:** free/low-cost tiers, minimal ops configuration, fast to set up for a
take-home — this is a "get it reachable" decision, not a production-architecture
claim.
