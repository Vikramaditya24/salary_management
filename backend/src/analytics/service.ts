import type { PrismaClient } from '../generated/prisma/index.js';
import { unprocessable } from '../lib/errors.js';
import {
  toSalaryInsightsDto,
  type CountryStatsRow,
  type DepartmentStatsRow,
  type OverallStatsRow,
  type SalaryInsightsDto,
} from './dto.js';
import { buildByCountrySql, buildByDepartmentSql, buildOverallStatsSql } from './query.js';
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
      const [overallRows, departmentRows, countryRows] = await Promise.all([
        db.$queryRaw<OverallStatsRow[]>(buildOverallStatsSql(query)),
        db.$queryRaw<DepartmentStatsRow[]>(buildByDepartmentSql(query)),
        db.$queryRaw<CountryStatsRow[]>(buildByCountrySql(query)),
      ]);

      return toSalaryInsightsDto(query, overallRows[0], departmentRows, countryRows);
    },
  };
}
