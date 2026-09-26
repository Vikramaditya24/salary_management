# ACME Salary API contract

Base URL: the backend origin, e.g. `http://localhost:4000`. Paths below have **no `/api` prefix**. JSON request bodies require `Content-Type: application/json`. All routes except `GET /health` and `POST /auth/login` require `Authorization: Bearer <token>`. Protected responses use `Cache-Control: no-store`. The token expires eight hours after login; logout deletes its server session. Do not persist tokens in a shared cache. Dates are calendar dates `YYYY-MM-DD`; timestamps are UTC ISO 8601 strings. Money is always a decimal **string** with two displayed digits, never a JSON float. Empty result arrays are `[]`; absent current salaries and absent aggregate money values are `null`.

## Shared errors and fields

All errors have `{ "error": { "code": "VALIDATION_ERROR", "message": "The request is invalid.", "details": [{ "field": "page", "message": "page must be at least 1." }], "requestId": "req-1" } }`. `details` is omitted when there are no field errors. Never parse the message to drive behavior; use status and code. Bad JSON yields `400 BAD_REQUEST`; too large (>32 KiB) yields `413 PAYLOAD_TOO_LARGE`; wrong body content type yields `415 UNSUPPORTED_MEDIA_TYPE`; uncaught failures yield `500 INTERNAL_ERROR`; unknown route yields `404 ROUTE_NOT_FOUND`. Protected endpoints can return `401 UNAUTHORIZED` with `Authentication required.`. Validation and business-rule errors are `400 VALIDATION_ERROR`, `409` or `422` as specified below. Unexpected errors never return SQL or stack details. Unknown body/query keys are rejected (`VALIDATION_ERROR`); a repeated scalar query parameter is rejected.

Employee object (`Employee`):

| Field                           | Type                        | Meaning                                         |
| ------------------------------- | --------------------------- | ----------------------------------------------- |
| `id`                            | UUID string                 | Stable database identifier, used in paths       |
| `employeeNumber`                | string                      | Generated human identifier such as `EMP-010001` |
| `fullName`, `email`, `jobTitle` | string                      | Profile fields; email stored lowercase          |
| `country`                       | `{code:string,name:string}` | ISO alpha-2 code and display name               |
| `department`                    | enum string                 | One of the department values below              |
| `employmentStatus`              | `ACTIVE` or `TERMINATED`    | Termination is reversible by PATCH              |
| `hireDate`                      | date string                 | Calendar date                                   |
| `createdAt`, `updatedAt`        | timestamp string            | UTC instants                                    |

Salary record (`SalaryRecord`): `id` UUID, `amount` decimal string, `currencyCode` ISO alpha-3 string, `effectiveDate` calendar date, `endDate` calendar date or `null` (exclusive; null means current), `createdBy` string (`HR Manager` for API changes), `createdAt` UTC timestamp. Detail employee (`EmployeeDetail`) adds `currentSalary: SalaryRecord|null` and `salaryHistory: SalaryRecord[]` newest first. An employee without salary has `null` and `[]` respectively. The salary-history endpoint returns the same record shape.

Departments: `ENGINEERING`, `PRODUCT`, `DESIGN`, `SALES`, `MARKETING`, `FINANCE`, `HUMAN_RESOURCES`, `OPERATIONS`, `CUSTOMER_SUPPORT`, `LEGAL`. Country and currency options come from `/reference`.

## Authentication

### POST /auth/login

Public. JSON body `{ "email": "hr@acme.example", "password": "configured-password" }`; both required strings, email must be valid, unknown fields rejected. Returns **200**:

```json
{
  "data": {
    "token": "opaque-43-character-base64url-token",
    "tokenType": "Bearer",
    "expiresAt": "2026-09-26T03:00:00.000Z",
    "user": { "email": "hr@acme.example" }
  }
}
```

`token` is a secret returned only here. `expiresAt` is eight hours after issuance. Invalid credentials return `401 INVALID_CREDENTIALS` (`Invalid email or password.`), without disclosing which field failed. Invalid shape returns `400 VALIDATION_ERROR`; database failure `500 INTERNAL_ERROR`. No query, pagination, search or sorting.

### GET /auth/me

Protected, no query/body. Example `GET /auth/me` with bearer header returns **200** `{ "data": { "email": "hr@acme.example" } }`. Expired, revoked or missing token: `401 UNAUTHORIZED`; unexpected failure: `500 INTERNAL_ERROR`. No paging, filters or sorting.

### POST /auth/logout

Protected, no body/query. Example `POST /auth/logout` with bearer header returns **204** with empty body. The token is revoked. Missing/expired token: `401 UNAUTHORIZED`; database failure: `500 INTERNAL_ERROR`. No paging, filters or sorting.

## Employees

### GET /employees

Protected paginated directory, no body. Example `GET /employees?page=1&pageSize=25&q=ada&country=GB&sortBy=fullName&sortOrder=asc`.

| Query        | Type                               | Default    | Allowed / meaning                                                             |
| ------------ | ---------------------------------- | ---------- | ----------------------------------------------------------------------------- |
| `page`       | integer                            | 1          | 1–10000                                                                       |
| `pageSize`   | integer                            | 25         | 1–100                                                                         |
| `q`          | string                             | absent     | Up to 100 characters, at most 6 whitespace separated words                    |
| `country`    | repeated or comma separated string | absent     | Up to 20 ISO alpha-2 codes, case normalized                                   |
| `department` | repeated or comma separated enum   | absent     | Up to 10 departments                                                          |
| `jobTitle`   | repeated string                    | absent     | Up to 20 exact titles, each up to 80 characters; commas are literal           |
| `status`     | enum                               | `ACTIVE`   | `ACTIVE`, `TERMINATED`, `ALL`                                                 |
| `sortBy`     | enum                               | `fullName` | `fullName`, `employeeNumber`, `hireDate`, `department`, `jobTitle`, `country` |
| `sortOrder`  | enum                               | `asc`      | `asc`, `desc`                                                                 |

Filters combine with AND; multiple values for the same field use OR. Every distinct word in `q` must occur in the name, email or employee number (case insensitive, substring matching, any order). Sort is server side and adds `id` ascending for ties; `country` sorts by code. All pagination occurs in the database. Out of range page returns **200** with empty `data`. Response:

```json
{
  "data": [
    {
      "id": "11111111-1111-4111-8111-111111111111",
      "employeeNumber": "EMP-000001",
      "fullName": "Ada Lovelace",
      "email": "ada@acme.example",
      "country": { "code": "GB", "name": "United Kingdom" },
      "department": "ENGINEERING",
      "jobTitle": "Engineer",
      "employmentStatus": "ACTIVE",
      "hireDate": "2020-01-15",
      "createdAt": "2026-09-01T10:00:00.000Z",
      "updatedAt": "2026-09-01T10:00:00.000Z"
    }
  ],
  "meta": {
    "page": 1,
    "pageSize": 25,
    "totalItems": 1,
    "totalPages": 1,
    "hasNextPage": false,
    "hasPreviousPage": false
  }
}
```

`data` contains `Employee` objects without salary. `totalPages=0` for no matches. Errors: `400 VALIDATION_ERROR` for invalid or unknown query; `401 UNAUTHORIZED`; `500 INTERNAL_ERROR`.

### GET /employees/filter-options

Protected, no body/query. Returns **200** `{ "data": { "countries": [{"code":"GB","name":"United Kingdom"}], "departments": ["ENGINEERING"], "jobTitles": ["Engineer"], "statuses": ["ACTIVE","TERMINATED","ALL"] } }`. Arrays contain all actual values: the example is abbreviated. Countries sort by name; job titles ascending; statuses are list filter values. No paging/search/filter/sort. Errors: `401 UNAUTHORIZED`, `500 INTERNAL_ERROR`.

### GET /employees/:id

Protected employee detail; `id` required UUID. No body/query. Example `GET /employees/11111111-1111-4111-8111-111111111111`. Returns **200** `{ "data": { ...Employee, "currentSalary": { ...SalaryRecord }, "salaryHistory": [{ ...SalaryRecord }] } }`; full concrete example:

```json
{
  "data": {
    "id": "11111111-1111-4111-8111-111111111111",
    "employeeNumber": "EMP-000001",
    "fullName": "Ada Lovelace",
    "email": "ada@acme.example",
    "country": { "code": "GB", "name": "United Kingdom" },
    "department": "ENGINEERING",
    "jobTitle": "Engineer",
    "employmentStatus": "ACTIVE",
    "hireDate": "2020-01-15",
    "createdAt": "2026-09-01T10:00:00.000Z",
    "updatedAt": "2026-09-01T10:00:00.000Z",
    "currentSalary": {
      "id": "22222222-2222-4222-8222-222222222222",
      "amount": "128450.00",
      "currencyCode": "GBP",
      "effectiveDate": "2024-03-01",
      "endDate": null,
      "createdBy": "HR Manager",
      "createdAt": "2024-03-01T10:00:00.000Z"
    },
    "salaryHistory": [
      {
        "id": "22222222-2222-4222-8222-222222222222",
        "amount": "128450.00",
        "currencyCode": "GBP",
        "effectiveDate": "2024-03-01",
        "endDate": null,
        "createdBy": "HR Manager",
        "createdAt": "2024-03-01T10:00:00.000Z"
      }
    ]
  }
}
```

History includes terminated employees' past salaries. Errors: `400 VALIDATION_ERROR` malformed UUID; `404 EMPLOYEE_NOT_FOUND`; `401 UNAUTHORIZED`; `500 INTERNAL_ERROR`. No paging/filter/search/sort beyond newest-first history.

### POST /employees

Protected. JSON body requires `fullName` (nonblank ≤120), `email` (valid ≤160), `countryCode` (ISO alpha-2), `department` (enum), `jobTitle` (nonblank ≤80), `hireDate` (valid `YYYY-MM-DD`, 1900-01-01 through today). Example:

```http
POST /employees
Content-Type: application/json
Authorization: Bearer <token>

{"fullName":"Ada Lovelace","email":"ada@acme.example","countryCode":"GB","department":"ENGINEERING","jobTitle":"Engineer","hireDate":"2020-01-15"}
```

Returns **201**, `Location: /employees/:id`, `{ "data": Employee }` with server generated ID, employee number, ACTIVE status and timestamps (see complete `Employee` example above). No query/paging/filter/search/sort. Errors: `400 VALIDATION_ERROR`; `409 EMAIL_ALREADY_EXISTS`, `DUPLICATE_RECORD`, or `EMPLOYEE_NUMBER_CONFLICT`; `422 COUNTRY_NOT_FOUND`, `HIRE_DATE_IN_FUTURE`, `CONSTRAINT_VIOLATION`; `401 UNAUTHORIZED`; `500 INTERNAL_ERROR`. Example: `{ "error": { "code": "EMAIL_ALREADY_EXISTS", "message": "An employee with this email already exists.", "details": [{ "field": "email", "message": "An employee with this email already exists." }], "requestId": "req-2" } }`.

### PATCH /employees/:id

Protected. Required UUID path. JSON object with at least one of `fullName`, `email`, `countryCode`, `department`, `jobTitle`, `hireDate` (same rules as POST) or `employmentStatus` (`ACTIVE`/`TERMINATED`). Example `PATCH /employees/11111111-1111-4111-8111-111111111111` with body `{ "jobTitle": "Senior Engineer" }`. Returns **200** `{ "data": Employee }` (full employee schema above). Unknown keys and empty object are invalid; omitted fields stay unchanged. `employmentStatus=ACTIVE` can reactivate. Errors: `400 VALIDATION_ERROR`; `404 EMPLOYEE_NOT_FOUND`; `409 EMAIL_ALREADY_EXISTS` or `DUPLICATE_RECORD`; `422 COUNTRY_NOT_FOUND`, `HIRE_DATE_IN_FUTURE`, `CONSTRAINT_VIOLATION`; `401 UNAUTHORIZED`; `500 INTERNAL_ERROR`. No query/paging/filter/search/sort.

### DELETE /employees/:id

Protected, required UUID path; no body/query. Example `DELETE /employees/11111111-1111-4111-8111-111111111111`. Returns **200** `{ "data": Employee }` with `employmentStatus: "TERMINATED"`; idempotent when already terminated. No physical deletion or salary history removal. Errors: `400 VALIDATION_ERROR`, `404 EMPLOYEE_NOT_FOUND`, `401 UNAUTHORIZED`, `422 CONSTRAINT_VIOLATION`, `500 INTERNAL_ERROR`. No paging/filter/search/sort.

## Salary

### POST /employees/:id/salary

Protected, required UUID path. JSON body exactly `{ "amount": "120000.00", "currencyCode": "USD", "effectiveDate": "2025-01-01" }`. `amount` is a positive decimal **string**, at most 12 integer and 2 fraction digits; the currency's `minorUnit` may restrict the fraction further (e.g. JPY 0). Currency must exist in reference data and use uppercase alpha-3. Effective date must be a real calendar date from hire date through today; on change it must be later than the current record's start. First write sets initial salary. Change closes current record with exclusive `endDate` and creates new one atomically. Returns **201** `{ "data": SalaryRecord }`, e.g.:

```json
{
  "data": {
    "id": "22222222-2222-4222-8222-222222222222",
    "amount": "120000.00",
    "currencyCode": "USD",
    "effectiveDate": "2025-01-01",
    "endDate": null,
    "createdBy": "HR Manager",
    "createdAt": "2025-01-01T10:00:00.000Z"
  }
}
```

`createdAt` is actual write time, not necessarily effective date. Errors: `400 VALIDATION_ERROR`; `404 EMPLOYEE_NOT_FOUND`; `409 EMPLOYEE_TERMINATED`, `EFFECTIVE_DATE_CONFLICT`, `CURRENT_SALARY_CONFLICT`; `422 CURRENCY_NOT_FOUND`, `INVALID_MINOR_UNITS`, `EFFECTIVE_DATE_IN_FUTURE`, `EFFECTIVE_DATE_BEFORE_HIRE`; `401 UNAUTHORIZED`; `500 INTERNAL_ERROR`. Example `{ "error": { "code": "EFFECTIVE_DATE_CONFLICT", "message": "Effective date must be after the current salary start date.", "requestId": "req-3" } }`. No query/pagination/search/sort.

### GET /employees/:id/salary-history

Protected, required UUID path. No body/query. Example `GET /employees/11111111-1111-4111-8111-111111111111/salary-history`. Returns **200** `{ "data": [SalaryRecord] }` newest first, complete example:

```json
{
  "data": [
    {
      "id": "22222222-2222-4222-8222-222222222222",
      "amount": "120000.00",
      "currencyCode": "USD",
      "effectiveDate": "2025-01-01",
      "endDate": null,
      "createdBy": "HR Manager",
      "createdAt": "2025-01-01T10:00:00.000Z"
    }
  ]
}
```

No history yields `[]`. Errors: `400 VALIDATION_ERROR`, `404 EMPLOYEE_NOT_FOUND`, `401 UNAUTHORIZED`, `500 INTERNAL_ERROR`. No paging/filter/search; sort fixed by effective date descending and ID descending.

## Analytics and reference

### GET /analytics/salary

Protected. No body. Optional `country` (single ISO alpha-2, normalized uppercase) and `department` (single department enum); both can combine. Unknown fields/repeated fields are rejected. Example `GET /analytics/salary?country=GB&department=ENGINEERING`. Returns **200**:

```json
{
  "data": {
    "filters": { "country": "GB", "department": "ENGINEERING" },
    "currency": "USD",
    "overall": {
      "employeeCount": 2,
      "totalSalaryUsd": "240000.00",
      "averageSalaryUsd": "120000.00",
      "minSalaryUsd": "100000.00",
      "maxSalaryUsd": "140000.00",
      "medianSalaryUsd": "120000.00",
      "activeHeadcount": 3,
      "terminatedHeadcount": 1,
      "totalHeadcount": 4,
      "withoutSalaryCount": 1
    },
    "headcountByDepartment": [
      { "department": "ENGINEERING", "employeeCount": 2, "averageSalaryUsd": "120000.00" }
    ],
    "headcountByCountry": [
      {
        "country": { "code": "GB", "name": "United Kingdom" },
        "employeeCount": 2,
        "averageSalaryUsd": "120000.00"
      }
    ],
    "salaryByRole": [
      {
        "jobTitle": "Engineer",
        "employeeCount": 2,
        "averageSalaryUsd": "120000.00",
        "minSalaryUsd": "100000.00",
        "maxSalaryUsd": "140000.00"
      }
    ],
    "distribution": [
      { "lowerUsd": 100000, "upperUsdExclusive": 125000, "employeeCount": 1, "percentage": 50 },
      { "lowerUsd": 125000, "upperUsdExclusive": 150000, "employeeCount": 1, "percentage": 50 }
    ]
  }
}
```

`filters` echoes applied values or `null`. `employeeCount` counts active employees with a current salary; monetary summary is for that population. `activeHeadcount` also includes active people without salary; `terminatedHeadcount` counts terminated people; `totalHeadcount` is their sum; `withoutSalaryCount=activeHeadcount-employeeCount`. Department/country and role group counts are for active paid employees; groups with no paid employees are omitted. The fixed distribution buckets are `[lowerUsd, upperUsdExclusive)` in USD, width 25000, with percentage of `employeeCount`. Empty salary population yields `employeeCount=0`, all monetary overall fields `null`, and empty breakdowns; headcounts still report employees. SQL multiplies local annual amount by the seeded `currencies.exchange_rate_to_usd` numeric value. These FX rates are **illustrative static seed values, not live or historical market rates**. No paging/search/sort; groups sort by department/country code, role by count descending then title, buckets ascending. Errors: `400 VALIDATION_ERROR`, `422 COUNTRY_NOT_FOUND`, `401 UNAUTHORIZED`, `500 INTERNAL_ERROR`.

### GET /reference

Protected, no body/query. Returns **200**:

```json
{
  "data": {
    "countries": [{ "code": "GB", "name": "United Kingdom", "defaultCurrencyCode": "GBP" }],
    "currencies": [{ "code": "GBP", "name": "British Pound", "minorUnit": 2 }],
    "departments": ["ENGINEERING"],
    "statuses": ["ACTIVE", "TERMINATED"]
  }
}
```

Arrays in example are abbreviated. Countries by name, currencies by code, enums in declared order. Use `minorUnit` for client display and input hints; backend validation remains authoritative. No paging/filter/search/sort. Errors: `401 UNAUTHORIZED`, `500 INTERNAL_ERROR`.

### GET /health

Public, no body/query. Example `GET /health`. Database connected: **200** `{ "status": "ok", "database": "connected", "uptimeSeconds": 120, "timestamp": "2026-09-25T18:00:00.000Z" }`. Database unavailable: **503** same shape with `status: "degraded", database: "unavailable"`. `uptimeSeconds` is integer process uptime, timestamp UTC. No paging/filter/search/sort. No authentication required.

## Frontend integration guide

1. **Login:** POST `/auth/login`, keep the token in an appropriate session scope, attach `Authorization: Bearer ...` to every protected call. GET `/auth/me` on app start; a `401` means clear the token and return to login. POST `/auth/logout` before clearing it on explicit logout. Do not store the password.
2. **Employee list:** GET `/reference` and `/employees/filter-options` for controls, then GET `/employees?page=1&pageSize=25`. Send filters, `q`, sort, and page to the server; reset page to 1 when filters change. Use `meta.totalItems`, `totalPages`, `hasNextPage`, `hasPreviousPage`. Show an empty state when `data=[]`, even if filters still have values. Avoid downloading 10,000 rows.
3. **Detail:** GET `/employees/:id` once for profile, current salary and history; display `currentSalary=null` as unset. Calendar dates should be shown as calendar dates without timezone conversion. History `endDate` is exclusive; `null` means current.
4. **Salary change:** Fetch `/reference` to show currencies, POST `/employees/:id/salary` with a decimal string, currency code and effective date; on 201 refresh GET `/employees/:id`. Render money using currency minor units for entry and locale formatting for display, while retaining the exact string for edits. Show 409 conflicts directly and refresh detail after a stale change.
5. **Analytics/dashboard:** GET `/analytics/salary` initially and again with supported filters. Draw overall cards, group comparisons and distribution from the response; do not aggregate employee pages in the browser. `currency=USD` and static rates must be labeled as illustrative. A zero salary population has null money and empty breakdowns; headcounts may still be nonzero.
6. **Errors/loading:** Use a loading state per request, preserve the last stable screen while a filter request is pending if desired, read `error.code` and `details`, and show a generic fallback for 500. Retry recoverable network errors. Never assume a missing `details` array is an error. All list, detail and analytics responses are intentionally noncacheable.

Recommended major-screen calls: login `POST /auth/login → GET /auth/me`; directory `GET /reference + GET /employees/filter-options → GET /employees`; detail `GET /employees/:id`; salary change `POST /employees/:id/salary → GET /employees/:id`; analytics `GET /analytics/salary` (repeat with country/department); logout `POST /auth/logout`.
