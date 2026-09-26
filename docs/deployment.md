# Deployment and reviewer handoff

The [live demo and video](../README.md#live-submission) use Render PostgreSQL and a Render API, with the Next.js frontend on Vercel. Keep database URLs and password hashes in host environment settings. Consult [Render monorepo setup](https://render.com/docs/monorepo-support) and [Vercel monorepos](https://vercel.com/docs/monorepos) for current dashboard options.

## 1. Render database and API

Create a PostgreSQL database and a Node web service from the GitHub repository. Set the API service root directory to `backend`, `NODE_VERSION` to a Node 24 release, build command to `npm ci --include=dev && npm run build`, and start command to `npm run prisma:migrate:deploy && npm start` on a free web service. The TypeScript and Prisma CLIs are dev dependencies, so install them for the build and migration. Configure:

| Variable | Value |
| --- | --- |
| `NODE_ENV` | `production` |
| `NODE_VERSION` | Node 24 release supported by Render |
| `DATABASE_URL` | Render PostgreSQL connection string, kept secret |
| `HR_EMAIL` | Reviewer HR account email |
| `HR_PASSWORD_HASH` | Output of `npm run auth:hash -- 'demo-password'`; keep the hash in Render only |
| `CORS_ORIGIN` | Exact public Vercel frontend origin, without trailing slash |
| `PORT` | Use the port supplied by Render when present; the app defaults to 4000 locally |

Migrations run before the API starts. Paid Render web services can use a separate pre-deploy command for migrations. Seed a **new, disposable demo database once**, using its external URL from a trusted environment; `sslmode=require` is needed for external TLS. Never put the seed in the build or start command: it deletes employee and salary data on each run. Check `GET /health` returns `200` and `database: connected`.

## 2. Vercel frontend

Import the same repository as a Vercel project with root directory `frontend`. Set `NEXT_PUBLIC_API_URL` to the public HTTPS Render API origin before building. Deploy the Next.js app, then update the Render `CORS_ORIGIN` to the actual Vercel domain and redeploy/restart the API as needed. If the frontend domain changes, update CORS. Keep `DATABASE_URL` and the HR password hash on Render only.

## 3. Reviewer smoke test

1. Open the public `/login`, sign in with the demo credentials in the root README, and refresh the tab to check session restoration.
2. Search and filter the 10,000 employee directory; paginate, open an employee and inspect current salary and history.
3. In demo data, change one salary, verify the prior entry remains in history and the current entry updates. Check analytics reflects the change.
4. Check country, department and role charts on desktop and a narrow mobile viewport. Verify controls remain usable and there is no unintended horizontal page scroll.
5. Sign out and verify a protected route returns to login. Check `/health` and API errors without revealing salary fields or secrets in logs.
6. Watch the short video linked in the root README, then send the **real GitHub repository URL** with its authentic commit history.

The README intentionally publishes access to a disposable synthetic demo. Do not reuse that password for any other account, and do not commit the database URL or password hash.
