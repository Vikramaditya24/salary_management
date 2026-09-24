# ACME Salary Management

Web-based salary management for ACME's HR Manager — replacing spreadsheets for
maintaining salary data across ~10,000 employees in multiple countries, and for
answering questions about how the org pays people.

## Status
**Foundation phase.** Project structure, tooling, and a minimal app shell are in
place; employee/salary management features are not implemented yet.
See [`docs/requirements.md`](docs/requirements.md), [`docs/architecture.md`](docs/architecture.md),
and [`docs/decisions.md`](docs/decisions.md) for the product and technical plan.

## Stack
- **Backend:** Node.js, Fastify, TypeScript, PostgreSQL, Prisma
- **Frontend:** Next.js (App Router), TypeScript, Tailwind CSS + shadcn/ui
- **Testing:** Vitest (both apps), React Testing Library (frontend)
- **Deployment (planned):** Render (API + Postgres) + Vercel (frontend)

TanStack Query is planned for the data-fetching-heavy pages (employee list,
analytics) but isn't added yet — no point wiring a data-fetching library before
there's real data-fetching to do.

## Repository Structure
```
docs/            requirements, architecture, and decision records
backend/         Fastify API (TypeScript, Prisma, Postgres)
frontend/        Next.js app (TypeScript, Tailwind, shadcn/ui)
docker-compose.yml   local Postgres for development
```

## Prerequisites
- Node.js 20+ and npm
- Docker (for local Postgres) — or a Postgres instance of your own

## Getting Started

**1. Start Postgres** (from the repo root):
```bash
docker compose up -d
```
This starts Postgres 16 on `localhost:5432` with user/password `postgres` and
database `acme_salary_dev`, matching the backend's `.env.example` defaults.

**2. Backend:**
```bash
cd backend
cp .env.example .env
npm install
npx prisma generate
npm run dev
```
The API starts on `http://localhost:4000`. Check it's working:
```bash
curl http://localhost:4000/health
```

**3. Frontend** (in a second terminal):
```bash
cd frontend
cp .env.example .env.local
npm install
npm run dev
```
The app starts on `http://localhost:3000` and the home page shows a live
API/database status check.

## Scripts
Run from within `backend/` or `frontend/`:

| Script | Backend | Frontend |
|---|---|---|
| `npm run dev` | start with hot reload | start Next dev server |
| `npm run build` | compile TypeScript | production build |
| `npm start` | run compiled build | run production build |
| `npm test` | Vitest | Vitest + React Testing Library |
| `npm run lint` | ESLint | ESLint (Next.js config) |
| `npm run format` / `format:check` | Prettier | Prettier |

## Development Approach
This project is built with AI-assisted, agentic development. Each phase (foundation,
schema, API, frontend, tests, deployment) is a small set of incremental, reviewed
commits rather than one large drop — the commit history is intended to show how the
solution evolved, not just the end state. Design and scope decisions are recorded in
`docs/decisions.md` as they're made, including alternatives considered and why they
were rejected.

## Notes on This Phase
- The Prisma schema has no domain models yet (`Employee`, `SalaryRecord`, etc.) —
  those land with the next phase. Right now it only proves the DB connection: the
  `/health` endpoint runs `SELECT 1` through Prisma.
- `docker-compose.yml` currently runs Postgres only. The backend and frontend run
  directly via `npm run dev` for a fast local feedback loop; containerizing them
  (for a single `docker compose up` covering everything) is deferred until closer
  to deployment, where it's actually useful rather than just extra rebuild time
  during active development.
- shadcn/ui's `Button` component and design tokens were added by hand, matching
  the library's standard output — the shadcn CLI needs network access outside
  this project's dev environment, so components can be added the normal way
  (`npx shadcn@latest add <component>`) going forward.
