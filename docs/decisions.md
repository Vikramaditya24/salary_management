# Engineering decisions

These are the current design choices. Git history, where available, records the iterations that led to them; this document describes the implemented system rather than treating old phase plans as current behavior.

| Decision | Reason and trade-off |
| --- | --- |
| Fastify API and Next.js UI | Separate HTTP boundary makes business rules testable independently of the UI. Two deployables need explicit CORS and environment configuration. |
| PostgreSQL with Prisma | Relational constraints, transactions and SQL aggregates protect salary records. More setup than SQLite, but it supports the intended hosted deployment. |
| History table for salary | Salary amounts are not overwritten on a change. The previous row's end date is closed in the same transaction that inserts the new row. A partial unique index enforces one current salary. |
| `numeric`/Decimal and string money values | Preserve exact stored values through the API. The frontend converts to `Number` only for chart bar lengths, not salary calculations. |
| Server-side pagination and analytics | 10,000 profiles need bounded browser payloads and one authoritative calculation path. Offset pagination gives HR page counts and random page navigation; this would need revisiting at much larger scale. |
| Strict query parsing | Misspelled filters fail with `400` instead of silently returning unfiltered salary data. Search and sort fields are whitelisted. |
| Deactivation instead of hard deletion | `DELETE /employees/:id` changes status to `TERMINATED`; it preserves salary history and can be reversed via `PATCH`. Actual erasure would need a separate policy and operation. |
| One HR login with opaque sessions | Fits the stated persona. Scrypt password verification, token-digest storage and eight-hour revocation are simpler than roles or an external identity provider. `sessionStorage` is a conscious frontend trade-off; it is not protected from same-origin script injection. |
| Static FX conversion | Cross-country comparison needs a common unit. Seeded rates make tests reproducible and keep the dashboard self-contained, but figures must be labeled illustrative and should not be used as live FX accounting. |
| SQL aggregates and charts | The database calculates totals, median and distribution; charts make patterns easier to inspect while showing exact values. An LLM interface would add uncertainty to a bounded set of numerical questions. |
| Deterministic 10,000-row demo seed | Fixed generator seed and dates enable repeatable testing. The seed replaces employee and salary rows; it must not run against production data. |
| Vitest and focused integration tests | Unit tests are fast and deterministic; database suites prove SQL constraints and transactions when a disposable Postgres database is available. A live browser smoke test is still needed before submission. |

For exact request and response shapes, see [API contract](api.md). For scope choices, see [requirements](requirements.md).
