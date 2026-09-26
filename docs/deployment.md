# Deployment and reviewer handoff

This is a deployment runbook, not a claim that the app is already live. The intended topology is one Render PostgreSQL database and API service, with the Next.js frontend on Vercel. Keep secrets in host environment settings, never in Git. Consult [Render monorepo setup](https://render.com/docs/monorepo-support) and [Vercel monorepos](https://vercel.com/docs/monorepos) for current dashboard options.

## 1. Render database and API

Create a PostgreSQL database and a Node web service from the real GitHub repository. Set the API service root directory to `backend`, `NODE_VERSION` to a Node 24 release, build command to `npm ci --include=dev && npm run build`, and start command to `npm start`. The TypeScript and Prisma CLIs are dev dependencies, so the build and pre-deploy migration need them even when `NODE_ENV=production`. Configure:

| Variable | Value |
| --- | --- |
| `NODE_ENV` | `production` |
| `NODE_VERSION` | Node 24 release supported by Render |
| `DATABASE_URL` | Render PostgreSQL connection string, kept secret |
| `HR_EMAIL` | Reviewer HR account email |
| `HR_PASSWORD_HASH` | Fresh output of `npm run auth:hash -- 'private-password'`; keep plaintext out of Git |
| `CORS_ORIGIN` | Exact public Vercel frontend origin, without trailing slash |
| `PORT` | Use the port supplied by Render when present; the app defaults to 4000 locally |

Apply migrations with `npm run prisma:migrate:deploy` against the hosted database before handling app traffic. A Render pre-deploy command is one possible route if the service supports it. Seed a **new, disposable demo database once**, using `npm run db:seed` in a secure environment that can reach it. Never put that seed in the build or start command: it deletes employee and salary data on each run. Check `GET /health` returns `200` and `database: connected`.

## 2. Vercel frontend

Import the same repository as a Vercel project with root directory `frontend`. Set `NEXT_PUBLIC_API_URL` to the public HTTPS Render API origin before building. Deploy the Next.js app, then update the Render `CORS_ORIGIN` to the actual Vercel domain and redeploy/restart the API as needed. If the frontend domain changes, update CORS. Keep `DATABASE_URL` and the HR password hash on Render only.

## 3. Reviewer smoke test

1. Open the public `/login`, sign in with the configured HR email and private demo password, and refresh the tab to check session restoration.
2. Search and filter the 10,000 employee directory; paginate, open an employee and inspect current salary and history.
3. In demo data, change one salary, verify the prior entry remains in history and the current entry updates. Check analytics reflects the change.
4. Check country, department and role charts on desktop and a narrow mobile viewport. Verify controls remain usable and there is no unintended horizontal page scroll.
5. Sign out and verify a protected route returns to login. Check `/health` and API errors without revealing salary fields or secrets in logs.
6. Record a short video showing the core workflow. Add public frontend and demo links to the root README, and send the **real GitHub repository URL** with its authentic commit history.

Do not publish the demo password in README or Git. Share reviewer access through the submission channel only when ready.
