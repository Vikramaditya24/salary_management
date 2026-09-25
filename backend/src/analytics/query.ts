import { Prisma } from '../generated/prisma/index.js';
import type { SalaryInsightsQuery } from './schemas.js';

/**
 * Common filtered source for every salary-insights aggregate below: one row
 * per employee's *current* salary (the salary_records row with
 * end_date IS NULL — see schema.prisma), converted to USD using the
 * currency's static exchange rate (schema.prisma / decisions.md #8) so
 * amounts from different countries can be combined in one figure. Only
 * active employees are counted — a terminated employee's last salary would
 * otherwise skew "what do we currently pay" figures.
 *
 * The multiplication happens in Postgres, on `numeric` columns, so it is
 * exact — no float ever touches a salary amount, same rule as elsewhere in
 * this schema (see schema.prisma's top-of-file design notes).
 *
 * This is a `WITH` fragment, not a shared CTE: each `$queryRaw` call is its
 * own statement, so the fragment is simply repeated in each query below
 * rather than computed once.
 */
function buildCurrentSalaryCte(query: SalaryInsightsQuery): Prisma.Sql {
  const countryFilter = query.country
    ? Prisma.sql`AND e.country_code = ${query.country}`
    : Prisma.empty;
  // Cast to the enum type explicitly: unlike an inline string literal,
  // Postgres gives a bound parameter no "unknown" type to auto-coerce from.
  const departmentFilter = query.department
    ? Prisma.sql`AND e.department = ${query.department}::"department"`
    : Prisma.empty;

  return Prisma.sql`
    WITH current_salaries AS (
      SELECT
        e.department AS department,
        e.country_code AS country_code,
        (sr.amount * cur.exchange_rate_to_usd) AS amount_usd
      FROM employees e
      JOIN salary_records sr ON sr.employee_id = e.id AND sr.end_date IS NULL
      JOIN currencies cur ON cur.code = sr.currency_code
      WHERE e.employment_status = 'ACTIVE'
      ${countryFilter}
      ${departmentFilter}
    )
  `;
}

/** Headline figures for the filtered population: count, total, average, min, max — all in USD. */
export function buildOverallStatsSql(query: SalaryInsightsQuery): Prisma.Sql {
  return Prisma.sql`
    ${buildCurrentSalaryCte(query)}
    SELECT
      COUNT(*)::int AS employee_count,
      ROUND(SUM(amount_usd), 2) AS total_usd,
      ROUND(AVG(amount_usd), 2) AS average_usd,
      ROUND(MIN(amount_usd), 2) AS min_usd,
      ROUND(MAX(amount_usd), 2) AS max_usd
    FROM current_salaries
  `;
}

/**
 * Average USD salary by department, within whatever country/department
 * filter was requested — uses the `(department, country_code)` composite
 * index via the CTE's WHERE clause (schema.prisma).
 */
export function buildByDepartmentSql(query: SalaryInsightsQuery): Prisma.Sql {
  return Prisma.sql`
    ${buildCurrentSalaryCte(query)}
    SELECT
      department,
      COUNT(*)::int AS employee_count,
      ROUND(AVG(amount_usd), 2) AS average_usd
    FROM current_salaries
    GROUP BY department
    ORDER BY department
  `;
}

/** Average USD salary by country, within whatever country/department filter was requested. */
export function buildByCountrySql(query: SalaryInsightsQuery): Prisma.Sql {
  return Prisma.sql`
    ${buildCurrentSalaryCte(query)}
    SELECT
      cs.country_code AS country_code,
      ctry.name AS country_name,
      COUNT(*)::int AS employee_count,
      ROUND(AVG(cs.amount_usd), 2) AS average_usd
    FROM current_salaries cs
    JOIN countries ctry ON ctry.code = cs.country_code
    GROUP BY cs.country_code, ctry.name
    ORDER BY cs.country_code
  `;
}
