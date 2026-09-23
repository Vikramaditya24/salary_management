# ACME Salary Management

Web-based salary management for ACME's HR Manager — replacing spreadsheets for
maintaining salary data across ~10,000 employees in multiple countries, and for
answering questions about how the org pays people.

## Status
Planning phase complete. Application code not yet implemented (see
[`docs/requirements.md`](docs/requirements.md), [`docs/architecture.md`](docs/architecture.md),
[`docs/decisions.md`](docs/decisions.md)).

## Stack
- **Backend:** Node.js, Fastify, TypeScript, PostgreSQL, Prisma
- **Frontend:** Next.js (App Router), TypeScript, Tailwind CSS + shadcn/ui, TanStack Query
- **Testing:** Vitest, Supertest, React Testing Library
- **Deployment:** Docker Compose (local), Render + Vercel (deployed)

## Repository Structure
```
docs/            requirements, architecture, and decision records
backend/         Express API (added in implementation phase)
frontend/        React app (added in implementation phase)
```

## Development Approach
This project is built with AI-assisted, agentic development. Each phase (schema,
API, frontend, tests, deployment) is a small set of incremental, reviewed commits
rather than one large drop — the commit history is intended to show how the
solution evolved, not just the end state. Design and scope decisions are recorded
in `docs/decisions.md` as they're made, including alternatives considered and why
they were rejected.

## Getting Started
Not yet runnable — this section will be filled in once the backend and frontend
scaffolding land.
