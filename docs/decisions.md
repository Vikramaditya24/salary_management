# Decisions

Format: Decision → Context → Alternatives considered → Rationale.

## 1. Backend: Node.js + Fastify + TypeScript
**Context:** brief says "language/framework as per the role you applied for
(preferred)"; no role was specified to me, so I resolved this against the
applicant's actual day-to-day stack (Node/Express/TS, React/Next, Postgres/Mongo).
Revisited: reconsidered Express vs. Fastify directly.
**Alternatives considered:** Express (the more conventional choice given the stated
stack); Next.js full-stack (API routes instead of a separate service).
**Rationale:** kept a separate backend service (not folded into Next.js) so the
API design stays explicit and independently testable — closer to what the
assessment is evaluating than blurring frontend/backend. Within that, Fastify over
Express: nothing in this project depends on Express-only middleware, and Fastify
gives first-class TS types on request/reply objects, built-in JSON-schema request
validation, and lower overhead per request — a straightforward upgrade with no
real cost here, not a stack change just for novelty.

## 2. Frontend: Next.js (App Router) + Tailwind CSS
**Context:** requirements allow "ReactJS or NextJS."
**Alternatives considered:** React + Vite (originally chosen, on the grounds that
this is a plain SPA behind a login with no SSR/SEO need).
**Rationale:** switched to Next.js at the applicant's direction. The original
Vite reasoning still holds (no SSR is *required*), but Next.js is used purely as
a React framework — file-based routing and TS/tooling conventions out of the box —
without adopting its API routes or server actions, so the frontend/backend split
from decision #1 is unaffected. Tailwind CSS for styling, with shadcn/ui (itself
Tailwind-based) as the component library, so there's one styling system rather
than layering a second (e.g. MUI's CSS-in-JS) on top.

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

## 10. Money stored as `Decimal`/`numeric`, never `float`/`double`
**Context:** salary amounts are compared, summed, and averaged across 10,000+
rows; binary floating point (IEEE 754) cannot represent most decimal fractions
exactly, so repeated arithmetic on `float` money silently drifts.
**Alternatives considered:** `Float`/`Int` cents.
**Rationale:** Prisma's `Decimal` type, mapped to Postgres `numeric(14,2)`, is
exact and is directly supported by both the ORM and the database — there's no
reason to reach for a workaround (like storing integer cents in a plain `Int`)
when the better representation is a first-class, native option. The seed
generator mirrors this on the JS side too: amounts are computed and rounded
as integer minor units and only ever turned into a `Decimal`-ready string at
the boundary, so a JS float never becomes a persisted value (see
prisma/seed/money.ts).

## 11. "One current salary per employee" enforced by a partial unique index
**Context:** requirements.md's assumptions state each employee has one
current salary at a time (`endDate IS NULL` marks it) plus an append-only
history. That's exactly the kind of invariant that's easy to accidentally
violate in application code and easy to define once in the database.
**Alternatives considered:** enforce only in the service layer (decision #1's
future "record a raise" transaction); a `current_salary_id` FK column on
`Employee` pointing at the live row.
**Rationale:** a Postgres partial unique index
(`UNIQUE (employee_id) WHERE end_date IS NULL`) makes the invariant
impossible to violate regardless of which code path writes to the table —
consistent with requirements.md's "DB constraints" correctness principle.
The FK-pointer alternative would need to be kept in sync on every insert/
update from two places (`Employee` and `SalaryRecord`) instead of one.
Prisma's schema DSL has no declarative syntax for partial indexes, so this
constraint is added as raw SQL in the migration rather than schema.prisma —
called out explicitly in both files so it isn't mistaken for an oversight.

## 12. Country and Currency as small reference tables, not enums
**Context:** requirements.md calls for "valid salary/currency/country
combinations" and a static, seeded exchange-rate table (decision #8) for
cross-country comparisons later.
**Alternatives considered:** Postgres enums for country/currency (like
`Department`); free-text columns validated only in the application.
**Rationale:** country and currency each carry data an enum can't (a
currency's minor-unit count for correct rounding, a country's default
currency, a static exchange rate) — a `Country`/`Currency` table with FKs
from `Employee`/`SalaryRecord` gets referential integrity (no
non-existent country/currency code can be persisted) and a place for that
data to live, without inventing a bolted-on validation table later.
`Department` stays an enum because it doesn't need attached data, just a
closed, typo-proof set of values.

## 13. Deterministic seed: seeded PRNG + fixed anchor dates, no external data
**Context:** the seed must be deterministic, rerunnable, dependency-free, and
produce valid, varied data across 10,000 rows.
**Alternatives considered:** `@faker-js/faker` (or similar) for names;
`Math.random()`; tying generated hire/salary dates to `new Date()`.
**Rationale:** a small hand-rolled seeded PRNG (mulberry32,
prisma/seed/rng.ts) avoids both `Math.random()` (not reproducible) and a new
dependency that isn't otherwise needed. Employee/salary ids are derived from
a monotonic counter rather than random draws, so uniqueness is guaranteed by
construction instead of being merely astronomically likely. Hire dates and
salary-history "as of" comparisons are computed against fixed constants
(prisma/seed/generate-employees.ts), not `new Date()` — the seed run on any
given day produces byte-identical output to a run next month, which is a
stronger, more testable form of "deterministic" than "produces the same
*shape* of data every time." Realistic variation comes from a seniority
ladder × department pay-scale × country pay-scale × per-employee random
factor, converted through each country's currency at a fixed rate — see
prisma/seed/generate-employees.ts and reference-data.ts for the exact model.

## 14. Deployment: Render (API + Postgres) + Vercel (frontend)
**Context:** "fully functional deployed software" is required.
**Alternatives considered:** Railway (originally chosen), Fly.io, a single
Dockerized VM.
**Rationale:** switched to Render at the applicant's direction; both are equivalent
for this project's purposes — free/low-cost tier, a managed Postgres instance, and
a web service for the API with minimal config. Vercel remains the frontend target
and is also Next.js's default deployment path, requiring no extra configuration.
This is a "get it reachable" decision, not a production-architecture claim.

## 15. "Delete" deactivates: DELETE /employees/:id sets `employmentStatus = TERMINATED`
**Context:** the employee-management brief says delete-or-deactivate should follow
"the product decision documented earlier", but no such decision existed in
`docs/` — requirements.md is silent on removing employees. This entry records
the decision so it is explicit and reviewable rather than implicit in code.
**Alternatives considered:** hard delete (`DELETE FROM employees`); a
`deleted_at` soft-delete column; offering both endpoints.
**Rationale:** a hard delete cascades to `salary_records` (`onDelete: Cascade`),
destroying exactly the history decision #4 exists to preserve and silently
changing past aggregates. The schema already models the lifecycle with
`EmploymentStatus { ACTIVE, TERMINATED }` (and the seed already contains
terminated employees), so a second mechanism (`deleted_at`) would be two ways
to say the same thing. Consequences: the default list shows ACTIVE employees
only (`status=ALL|TERMINATED` reveals the rest); DELETE is idempotent and
returns 200 with the terminated employee (not 204 — the row still exists);
reactivation is `PATCH {"employmentStatus":"ACTIVE"}`; there is deliberately no
endpoint that hard-deletes an employee. If a legal erasure requirement appears
later it should be a separate, explicit, audited operation.

## 16. Employee list: offset pagination, whitelisted sort, token search, strict query parsing
**Context:** HR browses a ~10,000-row directory as a paged table with page
numbers and a total count (requirements.md #1, "no client-side loading of all
10k rows").
**Alternatives considered:** cursor/keyset pagination; a search engine or
`tsvector` full-text search; loose query parsing that ignores unknown params.
**Rationale:**
- *Offset (`page`/`pageSize`, max 100) + `COUNT(*)`*, because the UI needs
  `totalItems`/`totalPages` and random page access; keyset pagination can't
  provide either. At this scale `OFFSET` costs nothing measurable. Sorting always
  ends in `id` as a tie-breaker so pages never repeat or skip rows when many
  employees share a name. A page past the end returns 200 with an empty `data`
  array and accurate `meta`, not a 4xx, so a UI whose filters just shrank can
  recover.
- *Search* splits `q` into words; every word must appear (case-insensitive
  `contains`) in the name, email, or employee number. It uses `ILIKE '%…%'`,
  which the existing trigram GIN index serves for `full_name`. `email` and
  `employee_number` have no trigram index, so an OR across the three columns is
  a sequential scan of 10k rows (single-digit milliseconds). Adding trigram
  indexes is the documented next step if the table grows by orders of magnitude;
  a migration wasn't justified for this data size.
- *Filters:* `country`, `department`, `jobTitle` (each repeatable, `country`/
  `department` also comma-separated) and `status` (default `ACTIVE`). Sort is
  limited to a whitelist (`fullName`, `employeeNumber`, `hireDate`,
  `department`, `jobTitle`, `country`) — no sorting by salary.
- *Strict query parsing:* unknown parameters are a 400. A typo such as
  `countrey=DE` that was silently ignored would show HR an unfiltered list that
  looks filtered — a correctness bug in a tool whose value is trustworthy
  numbers.
- `GET /employees/filter-options` returns the country list, departments, and
  distinct job titles so the UI can build its filter controls without hard-coding
  them (job titles come from a `GROUP BY`, not a full read).

## 17. API error contract: what clients may see
**Context:** the API must handle malformed input, missing records and DB
constraint violations "cleanly" and never leak internals.
**Alternatives considered:** returning Fastify/Prisma errors as-is; a single
`400` for every kind of client error.
**Rationale:** every error has the shape `{ error: { code, message, details?,
requestId } }` with a stable machine-readable `code`. `400` = malformed or
invalid input (per-field `details`); `404` = unknown employee/route; `409` =
uniqueness conflict (duplicate email); `422` = well-formed but violates a
business rule (future hire date, unknown country); `413`/`415` for body size
and content type. Prisma errors are translated by *error code* (P2002 unique,
P2003 foreign key, P2004 check, P2025 not found) into those responses; if the
driver doesn't say which unique constraint failed, the service asks the
database rather than guessing. Anything unrecognised becomes a fixed
`500 INTERNAL_ERROR` — no message, stack, SQL, or constraint names — with a
`requestId` that correlates to the server log. Emails are lower-cased before
storage because the unique index is case-sensitive. Server-owned fields (`id`,
`employeeNumber`, timestamps) are rejected in request bodies (`.strict()`), and
employee numbers (`EMP-000123`) are generated by the server with a
retry-on-collision loop backed by the UNIQUE constraint.

## 18. Salary exposure in the employee API
**Context:** salary data is the sensitive core of the product
(requirements.md non-functional requirements).
**Alternatives considered:** including salary in list rows; accepting an
initial salary when creating an employee.
**Rationale:** salary appears in exactly one place — `GET /employees/:id`, as
the current salary (exact decimal string + currency + effective date) — because
the detail view needs it (requirements.md #1) and the list does not.
No employee endpoint *accepts* salary, so create/edit bodies and mutation
responses never carry it; recording salary changes (closing the previous record,
effective dating) is the separate "salary" phase in architecture.md.
Queries use explicit `select`s so a new column never widens a response by
accident; employee responses are `Cache-Control: no-store`; request bodies are
not logged, and the logger redacts `amount`/`salary`/`currentSalary` keys as
defence in depth. Authentication is not part of this phase (architecture.md
plans it as a separate step), so these endpoints must not be exposed publicly
until it lands.
