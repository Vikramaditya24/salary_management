# ACME Salary frontend

An HR Manager interface built with Next.js 16 App Router, React 19, TypeScript, Tailwind CSS 4, and small accessible components. It consumes the separately hosted REST backend described in the bundled [backend API contract](docs/backend-api.md). It does not include a mock API or a database.

## Run locally

Use Node 24 or later. Set up and start the backend first, including PostgreSQL, migrations, a configured HR Manager password hash, and demo seed data if desired. The backend must allow this frontend origin in `CORS_ORIGIN`.

```sh
npm ci
cp .env.example .env.local
# Set NEXT_PUBLIC_API_URL to the backend origin, without a trailing slash.
npm run dev
```

Open `http://localhost:3000/login` and sign in with the backend's configured `HR_EMAIL` and password. The environment variable is compiled into the browser bundle at build time. Configure `NEXT_PUBLIC_API_URL` in your deployment environment before building; a missing production value shows a configuration error instead of silently contacting localhost.

For deployment to Vercel, set `NEXT_PUBLIC_API_URL` to the reachable HTTPS backend origin, configure backend CORS to allow the Vercel frontend origin, and run `npm run build`. Next.js handles direct route refreshes. The frontend itself needs no database or secrets.

## Commands

```sh
npm test
npm run lint
npx tsc --noEmit
npm run build
npm run format:check
```

## Product flows

- `/login` establishes a tab-scoped bearer session; protected routes validate it through `/auth/me` on refresh. Logout calls `/auth/logout` and clears the client state. Expiry and 401 responses return to login.
- `/employees` keeps search, filters, sort, page, and page size in the URL. It requests one page (at most 100 rows) from the backend. Create, edit, deactivate, and reactivate operate through the employee API.
- `/employees/:id` shows the profile, current salary and complete history. `/employees/:id/salary` sets or changes salary; values remain decimal strings.
- `/analytics/salary` shows active/terminated headcounts and server-computed USD summary plus interactive country, department and role comparison charts, and a salary distribution histogram. USD conversion uses the backend's **static illustrative FX table**, not live market rates.

The backend returns an opaque bearer token rather than an HttpOnly cookie. The frontend keeps it in memory and `sessionStorage` so a same-tab refresh works; it disappears when that tab closes and is never placed in localStorage. Any script running on the origin could still read it, so deploy over HTTPS and avoid untrusted scripts. The app never exposes private data in server-rendered HTML; protected data loads after session verification.

## Architecture

`src/lib/api` is the typed HTTP client and endpoint modules. `AuthProvider` owns the tab session and route guard. `useApiQuery` aborts stale requests and handles retryable loading/error states. Employee list state is encoded in the URL and sanitized before it reaches the strict backend. Reusable form/table primitives are kept in `src/components`, with route components in `src/app`.
