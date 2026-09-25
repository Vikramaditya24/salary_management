# Employee Management API

Base URL (local): `http://localhost:4000`. JSON in, JSON out. Design rationale:
`docs/decisions.md` #15–#18. **No authentication yet** — do not expose publicly.

## Conventions
- Success: `{ "data": … }` (lists add `"meta"`). Dates are `YYYY-MM-DD`; timestamps ISO-8601.
- Errors: `{ "error": { "code", "message", "details"?: [{ "field", "message" }], "requestId" } }`.
- Send `Content-Type: application/json` only when there is a body (Fastify rejects an
  empty body with that header, e.g. on `DELETE`).

## Endpoints

### `GET /employees`
| Param | Meaning |
|---|---|
| `page` | 1-based, default `1`, max `10000` |
| `pageSize` | default `25`, max `100` |
| `q` | search text (≤100 chars, ≤6 words). Every word must appear, case-insensitively, in name, email or employee number |
| `country` | ISO code(s): `country=DE` · `country=DE,US` · `country=DE&country=US` |
| `department` | enum value(s), same multi-value forms |
| `jobTitle` | exact title(s); repeat the param (not comma-split) |
| `status` | `ACTIVE` (default) · `TERMINATED` · `ALL` |
| `sortBy` | `fullName` (default) · `employeeNumber` · `hireDate` · `department` · `jobTitle` · `country` |
| `sortOrder` | `asc` (default) · `desc` |

Unknown parameters and invalid values → `400`. Response:
```json
{ "data": [ { "id", "employeeNumber", "fullName", "email",
              "country": { "code", "name" }, "department", "jobTitle",
              "employmentStatus", "hireDate", "createdAt", "updatedAt" } ],
  "meta": { "page": 1, "pageSize": 25, "totalItems": 9214, "totalPages": 369,
            "hasNextPage": true, "hasPreviousPage": false } }
```
A page past the last returns `200` with `data: []` and accurate `meta`. List rows never contain salary.

### `GET /employees/filter-options`
`{ data: { countries: [{code,name}], departments: [...], jobTitles: [...], statuses: [...] } }`

### `GET /employees/:id`
The employee plus `currentSalary: { amount: "128450.00", currencyCode, effectiveDate } | null`
(amount is an exact decimal **string**). `400` malformed id · `404` not found.

### `POST /employees` → `201` + `Location`
Body (all required): `fullName` (≤120), `email` (≤160, stored lower-case), `countryCode`
(2 letters, must exist), `department`, `jobTitle` (≤80), `hireDate` (not in the future).
`employeeNumber` is assigned by the server; any unknown/server-owned field → `400`.
`409 EMAIL_ALREADY_EXISTS` · `422 HIRE_DATE_IN_FUTURE | COUNTRY_NOT_FOUND`.

### `PATCH /employees/:id` → `200`
Any subset of the create fields plus `employmentStatus` (`ACTIVE`/`TERMINATED`, i.e. reactivate).
At least one field required. `404` · `409` · `422` as above.

### `DELETE /employees/:id` → `200`
Soft delete: sets `employmentStatus = TERMINATED` and returns the employee. Idempotent.
Salary history is retained. `404` if unknown.

## Error codes
`VALIDATION_ERROR` 400 · `BAD_REQUEST` 400 · `EMPLOYEE_NOT_FOUND` 404 · `ROUTE_NOT_FOUND` 404 ·
`EMAIL_ALREADY_EXISTS` 409 · `DUPLICATE_RECORD` 409 · `EMPLOYEE_NUMBER_CONFLICT` 409 ·
`HIRE_DATE_IN_FUTURE` 422 · `COUNTRY_NOT_FOUND` 422 · `CONSTRAINT_VIOLATION` 422 ·
`PAYLOAD_TOO_LARGE` 413 · `UNSUPPORTED_MEDIA_TYPE` 415 · `INTERNAL_ERROR` 500.
