# Requirements — ACME Salary Management

## Goal and user

Give ACME's HR Manager one secure web workspace for maintaining salary records for approximately 10,000 employees across countries, replacing manual spreadsheets and answering common compensation questions. The HR Manager is the only user role in this assessment.

## In scope

1. **Employee directory:** Search by name, email or employee number; filter by country, department, role and employment status; sort and page results. Create and edit employee profiles. Deactivation retains records and can be reversed.
2. **Salary records:** Show an employee's current salary and dated history. Record a first salary or change it, retaining the prior amount and effective interval. Validate amount, currency and effective date on the server.
3. **Compensation insights:** Show headcount, paid employees, average, median, minimum, maximum and total annual salary; compare by country, department and role; show salary distribution. Filter by country and department. Normalize cross-country values to USD with a *fixed illustrative* exchange-rate table and label this clearly.
4. **Access and demo data:** Protect salary data with one configured HR Manager login and revocable sessions. Seed a deterministic, varied 10,000-employee demo dataset.

## Quality bar

- Server-side pagination and aggregation: the browser never loads all 10,000 employees to compute answers.
- Exact decimal money storage and strings at API boundaries; database constraints and transactional salary changes protect history.
- Clear loading, empty and error states; keyboard-accessible controls and layouts usable on narrow screens.
- Focused, deterministic unit tests for core rules and database integration tests for the invariants. Document setup, security trade-offs, and deployment verification.
- A public deployed demo, short video and authentic incremental Git history are required for the final assessment handoff; these are delivery artifacts, not claims made by the source code alone.

## Deliberately out of scope

- Payroll disbursement, taxes, benefits, approval chains and employee self-service: the brief asks one HR Manager to maintain and analyze salary records.
- Live FX and historical exchange accounting: an external rate feed would complicate a demo without improving the specified workflows. USD comparisons are illustrative, not finance reporting.
- LLM question answering: a filterable, deterministic dashboard answers the bounded questions without introducing uncertain calculations.
- Bulk Excel import/export, multi-tenant access and advanced RBAC: useful future work, but outside the single-persona assessment and its time budget.

## Assumptions

Salaries are annual values; each employee has at most one current salary and may have no salary. No future-dated raises are scheduled. The seed is only for a disposable demo database and replaces employee and salary rows. Backend and frontend deploy separately, with PostgreSQL as the relational database.
