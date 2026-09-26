# Architecture

The server has route adapters for input parsing, services for employee operations and analytics, a Prisma PostgreSQL data layer, and one global error renderer. `src/auth.ts` implements one HR Manager identity configured by environment and revocable opaque sessions. Session tokens are random 256-bit values; only SHA-256 digests are stored. Sessions expire after eight hours.

Employee list filters, sorts, offsets and limits run in PostgreSQL. Search requires every whitespace separated token to match name, email or employee number, case insensitive. The detail query includes the full salary history for one employee. Salary changes lock the employee row and close the prior salary and insert the successor in one transaction. A partial unique index enforces at most one open salary record per employee. History intervals are `[effectiveDate, endDate)`; effective dates must increase.

Analytics run SQL aggregates over active employees' current salaries. Decimal values stay numeric in PostgreSQL and serialize as strings. Static seeded FX conversion to USD enables cross-country comparisons; no live rates or historical FX accounting are claimed. Median uses `PERCENTILE_CONT`; distribution groups USD salary into $25,000 bands. Detail and analytics are marked `Cache-Control: no-store`.

The seed generator is deterministic; its script is demo-only and destructive to all employee and salary data. Migrations include `pg_trgm`, salary integrity constraints, indexes for filters and the current-salary invariant. No queue, external service or frontend is involved.
