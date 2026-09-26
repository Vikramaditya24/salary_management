import type { PrismaClient } from '../generated/prisma/index.js';
import { unprocessable } from '../lib/errors.js';
import {
  toSalaryInsightsDto,
  type CountryStatsRow,
  type DepartmentStatsRow,
  type OverallStatsRow,
  type SalaryInsightsDto,
} from './dto.js';
import {
  buildByCountrySql,
  buildByDepartmentSql,
  buildOverallStatsSql,
  buildDashboardTotalsSql,
  buildByRoleSql,
  buildDistributionSql,
} from './query.js';
import type { SalaryInsightsQuery } from './schemas.js';

/**
 * The slice of the Prisma client this service uses. Depending on a narrow
 * structural type (instead of the concrete client) is what lets the unit
 * tests drive the service with plain mocks — no database required. See
 * employees/service.ts's EmployeeDb for the same pattern.
 */
export interface SalaryAnalyticsDb {
  country: Pick<PrismaClient['country'], 'findUnique'>;
  $queryRaw: PrismaClient['$queryRaw'];
}

export interface SalaryAnalyticsService {
  getSalaryInsights(query: SalaryInsightsQuery): Promise<SalaryInsightsDto>;
}

export function createSalaryAnalyticsService(db: SalaryAnalyticsDb): SalaryAnalyticsService {
  // Same existence check as employees/service.ts's assertCountryExists: an
  // unrecognised country should be reported as a business-rule violation on
  // the filter, not silently treated as "no employees in ZZ".
  async function assertCountryExists(code: string): Promise<void> {
    const country = await db.country.findUnique({ where: { code }, select: { code: true } });
    if (!country) {
      const message = `Unknown country code "${code}".`;
      throw unprocessable('COUNTRY_NOT_FOUND', message, [{ field: 'country', message }]);
    }
  }

  return {
    async getSalaryInsights(query) {
      if (query.country) await assertCountryExists(query.country);

      // Three independent statements — an overall aggregate plus two
      // breakdowns — rather than one ROLLUP query: each is a plain GROUP BY
      // over the same filtered set, easy to read and to test in isolation,
      // and they run concurrently.
      const [overallRows, departmentRows, countryRows, totals, roles, distribution] =
        await Promise.all([
          db.$queryRaw<OverallStatsRow[]>(buildOverallStatsSql(query)),
          db.$queryRaw<DepartmentStatsRow[]>(buildByDepartmentSql(query)),
          db.$queryRaw<CountryStatsRow[]>(buildByCountrySql(query)),
          db.$queryRaw<
            {
              headcount: number;
              terminated_headcount: number;
              median_usd: { toFixed(n: number): string } | null;
            }[]
          >(buildDashboardTotalsSql(query)),
          db.$queryRaw<
            {
              job_title: string;
              employee_count: number;
              average_usd: { toFixed(n: number): string };
              min_usd: { toFixed(n: number): string };
              max_usd: { toFixed(n: number): string };
            }[]
          >(buildByRoleSql(query)),
          db.$queryRaw<{ lower_usd: bigint; employee_count: number }[]>(
            buildDistributionSql(query),
          ),
        ]);

      const base = toSalaryInsightsDto(query, overallRows[0], departmentRows, countryRows);
      const count = base.overall.employeeCount;
      return {
        ...base,
        overall: {
          ...base.overall,
          medianSalaryUsd: totals[0]?.median_usd?.toFixed(2) ?? null,
          activeHeadcount: totals[0]?.headcount ?? 0,
          terminatedHeadcount: totals[0]?.terminated_headcount ?? 0,
          totalHeadcount: (totals[0]?.headcount ?? 0) + (totals[0]?.terminated_headcount ?? 0),
          withoutSalaryCount: (totals[0]?.headcount ?? 0) - count,
        },
        salaryByRole: roles.map((r) => ({
          jobTitle: r.job_title,
          employeeCount: r.employee_count,
          averageSalaryUsd: r.average_usd.toFixed(2),
          minSalaryUsd: r.min_usd.toFixed(2),
          maxSalaryUsd: r.max_usd.toFixed(2),
        })),
        distribution: distribution.map((r) => ({
          lowerUsd: Number(r.lower_usd),
          upperUsdExclusive: Number(r.lower_usd) + 25000,
          employeeCount: r.employee_count,
          percentage: count ? Number(((r.employee_count * 100) / count).toFixed(2)) : 0,
        })),
      };
    },
  };
}
