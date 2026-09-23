# Requirements — ACME Salary Management

## Goal
Replace ACME's spreadsheet-based salary process with a web application that lets the
HR Manager maintain accurate, current salary data for ~10,000 employees across
multiple countries, and get quick, reliable answers to questions about how the
organization pays its people — without building a payroll or compensation-planning
platform.

## Primary Persona
**HR Manager** — the only user role in scope. Not technical, values speed and
trustworthy numbers over flexibility. Today: opens an Excel file, filters manually,
eyeballs averages, risks stale/inconsistent data across copies of the sheet.

## Core User Workflows
1. **Find an employee** — search/filter by name, country, department, role — and view
   their current salary and salary history.
2. **Record a salary change** — set a new salary (amount, currency, effective date)
   for an employee without destroying the previous record.
3. **Answer a compensation question** — e.g. "what's the average salary in
   Engineering in Germany?", "how many employees earn above/below X?", "how is pay
   distributed by department/country?" — via a reporting/analytics view, not by
   exporting data and doing it manually.
4. **Bulk-load the org** — the 10,000-employee dataset is seeded, not entered by hand.

## Functional Requirements
- Employee directory: list, search, filter (country, department, role), pagination.
- Employee detail: profile + full salary history (amount, currency, effective date,
  who changed it, when).
- Create/edit salary for an employee, preserving history (append, don't overwrite).
- Analytics view answering aggregate questions: average/median/min/max salary
  grouped by department, country, and role; headcount and pay distribution.
- Single HR Manager login (authenticated access only — this is sensitive data).
- Seed script generating 10,000 realistic, varied employee + salary records.

## Non-Functional Requirements
- Fast at 10,000-employee scale: list/search/analytics all respond well under 1s
  using indexed queries and pagination — no full-table scans or client-side loading
  of all 10k rows.
- Sensitive data: authenticated access only, salary fields never logged, secrets
  out of source control, HTTPS in the deployed environment.
- Correctness over cleverness: server-side validation, DB constraints, deterministic
  aggregate calculations (SQL, not client-side math).
- Automated tests for the core business logic (salary CRUD, history integrity,
  aggregation) that run fast and don't depend on the deployed environment.
- Runs locally with one command; deployed to a public URL for review.

## Explicitly Out of Scope (and why)
- **Payroll processing / actual pay disbursement, tax, benefits** — a different,
  much larger problem domain; the brief asks for salary *record-keeping and
  reporting*, not a payroll engine.
- **Multi-role RBAC / approval workflows** — one persona is specified (HR Manager);
  inventing roles nobody asked for is scope creep for a take-home.
- **Employee self-service portal / notifications** — not part of the stated
  persona's job to be done.
- **Live FX conversion / real-time currency rates** — adds an external dependency
  for a cosmetic improvement; a fixed, seeded conversion table is enough to compare
  pay across countries in reports (see Assumptions).
- **Org chart, performance reviews, headcount planning** — adjacent HR features not
  implied by "manage salary data and answer pay questions."
- **Natural-language / chatbot Q&A** — analytics is delivered as a structured,
  filterable dashboard; an LLM Q&A layer is unnecessary complexity for a bounded set
  of well-known questions and adds non-determinism to numbers that must be exact.
- **Horizontal scaling / microservices / caching layers** — 10,000 rows is a small
  relational dataset; a single well-indexed Postgres instance and one backend
  service handle this comfortably.

## Assumptions
- "Language & framework as per the role" is resolved as Node.js/TypeScript
  end-to-end (Express API + React frontend), matching the applicant's actual stack.
- Each employee has one current salary at a time, plus an append-only history of
  past salaries — no support for future-dated/scheduled raises in v1.
- Country and currency are attributes of the salary record (an employee could
  theoretically relocate); currency is stored as an ISO code alongside the amount.
- Cross-country pay comparisons use a static, seeded exchange-rate table rather
  than a live FX feed.
- "Deployed software" means reachable at a public URL on free/low-cost hosting,
  not a production-hardened, highly-available deployment.
- Authentication is a single seeded HR Manager account (no self-registration, no
  multi-tenant orgs).
