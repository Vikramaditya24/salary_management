-- Employee data layer: reference tables (countries/currencies), employees,
-- and append-only salary history.
--
-- This migration is hand-authored to match backend/prisma/schema.prisma
-- exactly, plus a handful of constraints Prisma's declarative schema DSL
-- cannot express (partial unique index, multi-column CHECKs, a trigram
-- search index). Those are called out below with why they're here.

-- pg_trgm backs the ILIKE/trigram search index on employees.full_name
-- (docs/architecture.md: "No full-text search engine; ILIKE/trigram index
-- on name is sufficient at this scale").
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Enums ----------------------------------------------------------------

CREATE TYPE "department" AS ENUM (
  'ENGINEERING',
  'PRODUCT',
  'DESIGN',
  'SALES',
  'MARKETING',
  'FINANCE',
  'HUMAN_RESOURCES',
  'OPERATIONS',
  'CUSTOMER_SUPPORT',
  'LEGAL'
);

CREATE TYPE "employment_status" AS ENUM (
  'ACTIVE',
  'TERMINATED'
);

-- Reference data ---------------------------------------------------------

CREATE TABLE "currencies" (
  "code" VARCHAR(3) NOT NULL,
  "name" VARCHAR(64) NOT NULL,
  "minor_unit" INTEGER NOT NULL,
  "exchange_rate_to_usd" DECIMAL(18, 8) NOT NULL,

  CONSTRAINT "currencies_pkey" PRIMARY KEY ("code"),
  -- Sensible bounds: no real-world circulating currency uses more than 4
  -- decimal digits of minor unit (most use 0, 2, or 3).
  CONSTRAINT "currencies_minor_unit_range" CHECK ("minor_unit" BETWEEN 0 AND 4),
  CONSTRAINT "currencies_exchange_rate_positive" CHECK ("exchange_rate_to_usd" > 0)
);

CREATE TABLE "countries" (
  "code" VARCHAR(2) NOT NULL,
  "name" VARCHAR(64) NOT NULL,
  "default_currency_code" VARCHAR(3) NOT NULL,

  CONSTRAINT "countries_pkey" PRIMARY KEY ("code")
);

CREATE INDEX "countries_default_currency_code_idx" ON "countries" ("default_currency_code");

ALTER TABLE "countries"
  ADD CONSTRAINT "countries_default_currency_code_fkey"
  FOREIGN KEY ("default_currency_code") REFERENCES "currencies" ("code")
  ON DELETE RESTRICT ON UPDATE CASCADE;

-- Employees ----------------------------------------------------------------

CREATE TABLE "employees" (
  "id" UUID NOT NULL,
  "employee_number" VARCHAR(12) NOT NULL,
  "full_name" VARCHAR(120) NOT NULL,
  "email" VARCHAR(160) NOT NULL,
  "country_code" VARCHAR(2) NOT NULL,
  "department" "department" NOT NULL,
  "job_title" VARCHAR(80) NOT NULL,
  "employment_status" "employment_status" NOT NULL DEFAULT 'ACTIVE',
  "hire_date" DATE NOT NULL,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,

  CONSTRAINT "employees_pkey" PRIMARY KEY ("id"),
  -- Non-empty text guards: an empty string would satisfy NOT NULL but is
  -- never a valid name/title, and is cheap to rule out at the DB level.
  CONSTRAINT "employees_full_name_not_blank" CHECK (length(btrim("full_name")) > 0),
  CONSTRAINT "employees_job_title_not_blank" CHECK (length(btrim("job_title")) > 0),
  -- Hire dates are historical facts; a future hire date is a data-entry bug,
  -- not a legitimate case this app needs to support (no scheduled/future
  -- hires in scope).
  CONSTRAINT "employees_hire_date_not_future" CHECK ("hire_date" <= CURRENT_DATE)
);

CREATE UNIQUE INDEX "employees_employee_number_key" ON "employees" ("employee_number");
CREATE UNIQUE INDEX "employees_email_key" ON "employees" ("email");

-- Employee-directory filters (requirements.md #1: search/filter by name,
-- country, department, role).
CREATE INDEX "employees_country_code_idx" ON "employees" ("country_code");
CREATE INDEX "employees_department_idx" ON "employees" ("department");
CREATE INDEX "employees_job_title_idx" ON "employees" ("job_title");
CREATE INDEX "employees_employment_status_idx" ON "employees" ("employment_status");

-- Composite index for the documented analytics query shape, e.g. "average
-- salary in Engineering in Germany" (department + country together).
CREATE INDEX "employees_department_country_code_idx" ON "employees" ("department", "country_code");

-- Trigram GIN index for ILIKE '%name%' search (pg_trgm, see extension
-- above). Prisma's schema DSL has no portable way to declare an operator
-- class, so this is raw SQL rather than a schema.prisma @@index.
CREATE INDEX "employees_full_name_trgm_idx" ON "employees" USING GIN ("full_name" gin_trgm_ops);

ALTER TABLE "employees"
  ADD CONSTRAINT "employees_country_code_fkey"
  FOREIGN KEY ("country_code") REFERENCES "countries" ("code")
  ON DELETE RESTRICT ON UPDATE CASCADE;

-- Salary history -------------------------------------------------------

CREATE TABLE "salary_records" (
  "id" UUID NOT NULL,
  "employee_id" UUID NOT NULL,
  "amount" DECIMAL(14, 2) NOT NULL,
  "currency_code" VARCHAR(3) NOT NULL,
  "effective_date" DATE NOT NULL,
  "end_date" DATE,
  "created_by" VARCHAR(160) NOT NULL DEFAULT 'seed-script',
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "salary_records_pkey" PRIMARY KEY ("id"),
  -- A salary of zero or less is never valid data, never a legitimate
  -- business state (unlike, say, an optional/nullable field).
  CONSTRAINT "salary_records_amount_positive" CHECK ("amount" > 0),
  -- A closed record can't have ended before it started.
  CONSTRAINT "salary_records_end_after_effective" CHECK ("end_date" IS NULL OR "end_date" >= "effective_date")
);

-- History queries filter by employee and order/scan by date
-- (docs/architecture.md's documented index list).
CREATE INDEX "salary_records_employee_id_effective_date_idx" ON "salary_records" ("employee_id", "effective_date");
CREATE INDEX "salary_records_currency_code_idx" ON "salary_records" ("currency_code");

-- Business invariant from requirements.md's assumptions: "each employee has
-- one current salary at a time". A plain UNIQUE constraint can't express
-- "unique among rows where end_date IS NULL" — Postgres partial unique
-- indexes can, and Prisma's schema DSL doesn't have a portable way to
-- declare one, so this lives here as raw SQL. This is the actual DB-level
-- enforcement of the invariant, not just an application convention.
CREATE UNIQUE INDEX "salary_records_one_current_per_employee"
  ON "salary_records" ("employee_id")
  WHERE "end_date" IS NULL;

ALTER TABLE "salary_records"
  ADD CONSTRAINT "salary_records_employee_id_fkey"
  FOREIGN KEY ("employee_id") REFERENCES "employees" ("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "salary_records"
  ADD CONSTRAINT "salary_records_currency_code_fkey"
  FOREIGN KEY ("currency_code") REFERENCES "currencies" ("code")
  ON DELETE RESTRICT ON UPDATE CASCADE;
