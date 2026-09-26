# Frontend

Next.js App Router, React, TypeScript and Tailwind CSS. This is the HR Manager interface for the separately hosted API. See the [root README](../README.md) for full setup and the [single API contract](../docs/api.md) for endpoint details.

## Run locally

Start the backend and its PostgreSQL database first. From `frontend/`:

```sh
cp .env.example .env.local
npm ci
npm run dev
```

`NEXT_PUBLIC_API_URL` in `.env.local` points to `http://localhost:4000` by default. Open `http://localhost:3000/login` and sign in with the backend's configured `HR_EMAIL` and password. The backend `CORS_ORIGIN` must match the frontend origin. In production, set `NEXT_PUBLIC_API_URL` to the public HTTPS API origin **before building**; this variable is compiled into the browser bundle. The frontend has no database secrets.

## Product flows

- `/employees`: URL-based search, filters, sort and pagination; create, edit, deactivate and reactivate profiles.
- `/employees/:id`: profile, current salary and salary history; salary changes have their own route.
- `/analytics/salary`: server-calculated statistics, country/department/role comparisons and salary distribution. USD conversions use fixed illustrative FX rates.

The token returned by login is stored in memory and `sessionStorage`, validated on tab refresh, and removed on logout or expiry. It is accessible to scripts running on this origin, so use HTTPS and do not add untrusted scripts. The frontend does not expose private salary data in server-rendered HTML.

## Checks

```sh
npm test
npm run lint
npm run format:check
npm run build
```

The frontend tests use mocked API responses; they do not prove that a deployed frontend can reach a deployed API. Complete the [deployment smoke test](../docs/deployment.md) after hosting both services.
