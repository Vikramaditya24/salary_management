# Assessment review — 26 September 2026

This review compares the supplied `salary_management-master.zip` with the assessment brief. It distinguishes source evidence from running deployment evidence. The supplied archive contained no `.git` directory.

| Expectation | Evidence and judgment |
| --- | --- |
| One-page requirements before building | `docs/requirements.md` covers persona, scope, workflows, exclusions and assumptions. Strong artifact, but the archive alone cannot prove when it was authored. |
| End-to-end backend and UI | Fastify API, Prisma schema/migrations, Next.js UI, salary history, authentication and analytics are present. This is a substantial functional implementation. A live database-backed browser flow has not been verified in this environment. |
| Relational database and 10,000 seed | PostgreSQL schema, deterministic generator and seed script are present. Seed is destructive to employee/salary rows and is explicitly for demo databases. No seeded database was included. |
| HR product thinking | Pagination, indexed queries, strict filtering, history preservation, termination rather than deletion, and server-side aggregate math fit the persona. Static FX is disclosed in the UI. |
| Tests and maintainability | Frontend: 79 tests passed; lint and build passed. Backend: 175 tests passed, but the overall suite failed: three database test files could not connect to PostgreSQL, leaving 31 tests unrun. Backend TypeScript build passed. This is good unit coverage, but database correctness and full integration still need a migrated test database. |
| Responsive UI | Navigation wraps, directory rows become mobile cards, charts scroll or compress within cards, and pagination scrolls on narrow screens. Visual QA on actual mobile devices remains to be done. |
| Deployed software and demo video | Neither a public URL nor a video is present in the supplied archive. This is a blocking submission gap. |
| Incremental commits and repository link | The supplied ZIP has no Git history or remote. Earlier commits cannot be inferred or recreated honestly. The changes made during this review can be committed, but they do not demonstrate the original evolution. A real hosted repository link is still needed. |
| AI use and artifacts | Requirements, architecture, and trade-off notes exist. `docs/ai-workflow.md` records this review's AI-assisted work; prior prompts or review trails were not included. |

## Priority before sending to Incubyte

1. Run migrations and seed on a disposable PostgreSQL database, then run all backend integration tests and a real UI workflow: login, search, salary change, history, and analytics.
2. Deploy API, database and frontend over HTTPS; configure `DATABASE_URL`, `HR_EMAIL`, a newly generated `HR_PASSWORD_HASH`, `CORS_ORIGIN`, and `NEXT_PUBLIC_API_URL`. Verify a clean reviewer login without publishing the password in Git.
3. Record a concise video demo with desktop and mobile views and show analytics after a salary update.
4. Push the actual Git repository and share its URL. If original history exists elsewhere, preserve it; the ZIP cannot reconstruct it. Update the root README with deployment URL and demo link once available.

## Design note

The UI uses Incubyte-inspired color and typography without copying their logo or presenting ACME as an Incubyte service. The most valuable assessment signal remains correctness and evidence: a working deployed flow and honest commit trail will matter more than surface similarity.
