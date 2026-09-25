import { SeededRandom, idFromCounter } from './rng.js';
import { COUNTRIES, CURRENCIES, currencyByCode } from './reference-data.js';
import { namePoolForCountry } from './names.js';
import {
  DEPARTMENTS,
  DEPARTMENT_PAY_SCALE_BASIS_POINTS,
  JOB_TITLES_BY_DEPARTMENT,
  SENIORITY_LEVELS,
  type Department,
} from './job-titles.js';
import { minorUnitsToDecimalString, roundToMinorUnits } from './money.js';

export type EmploymentStatus = 'ACTIVE' | 'TERMINATED';

export interface EmployeeSeedRow {
  id: string;
  employeeNumber: string;
  fullName: string;
  email: string;
  countryCode: string;
  department: Department;
  jobTitle: string;
  employmentStatus: EmploymentStatus;
  hireDate: Date;
}

export interface SalaryRecordSeedRow {
  id: string;
  employeeId: string;
  /** Exact decimal string, e.g. "128450.00" — never a JS number/float. */
  amount: string;
  currencyCode: string;
  effectiveDate: Date;
  endDate: Date | null;
  createdBy: string;
}

export interface GeneratedDataset {
  employees: EmployeeSeedRow[];
  salaryRecords: SalaryRecordSeedRow[];
}

export interface GenerateOptions {
  count: number;
  /** Any 32-bit integer. Same seed + same count => byte-identical output. */
  seed: number;
}

// Fixed anchor dates, deliberately *not* `new Date()`. Tying generation to
// wall-clock "today" would make the dataset different every time the seed
// runs on a different day, which works against "deterministic" and "safe
// to rerun" — rerunning the seed a month from now should produce the exact
// same rows, not almost the same rows. Both are comfortably in the past of
// any real run and satisfy the `hire_date <= CURRENT_DATE` DB constraint.
const EARLIEST_HIRE_DATE = new Date(Date.UTC(2015, 0, 1));
const ANCHOR_DATE = new Date(Date.UTC(2026, 8, 1)); // "as of" date for salary history

const MIN_TENURE_DAYS_BEFORE_ANCHOR = 30;
const MIN_DAYS_BETWEEN_RAISES = 180;

const SENIORITY_WEIGHTS: ReadonlyArray<{ value: number; weight: number }> = [
  { value: 0, weight: 20 }, // JUNIOR
  { value: 1, weight: 30 }, // MID
  { value: 2, weight: 25 }, // SENIOR
  { value: 3, weight: 12 }, // LEAD
  { value: 4, weight: 9 }, // MANAGER
  { value: 5, weight: 4 }, // DIRECTOR
];

const TERMINATED_PROBABILITY = 0.08;

function addDays(date: Date, days: number): Date {
  const result = new Date(date.getTime());
  result.setUTCDate(result.getUTCDate() + days);
  return result;
}

function daysBetween(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24));
}

function slugify(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // strip diacritics
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '');
}

/** How many salary-history rows this tenure can plausibly support (1-3). */
function maxSalaryRecordsForTenure(tenureDays: number): 1 | 2 | 3 {
  if (tenureDays >= MIN_DAYS_BETWEEN_RAISES * 2) return 3;
  if (tenureDays >= MIN_DAYS_BETWEEN_RAISES) return 2;
  return 1;
}

function pickSalaryRecordCount(rng: SeededRandom, maxRecords: 1 | 2 | 3): number {
  const options = SALARY_RECORD_COUNT_WEIGHTS.filter((o) => o.value <= maxRecords);
  return rng.weightedPick(options);
}

const SALARY_RECORD_COUNT_WEIGHTS: ReadonlyArray<{ value: number; weight: number }> = [
  { value: 1, weight: 50 },
  { value: 2, weight: 30 },
  { value: 3, weight: 20 },
];

/**
 * Deterministically generates `count` employees and their salary history.
 * Pure function: same (count, seed) always produces an identical result,
 * with no database, filesystem, or network access.
 */
export function generateDataset({ count, seed }: GenerateOptions): GeneratedDataset {
  const rng = new SeededRandom(seed);
  const employees: EmployeeSeedRow[] = [];
  const salaryRecords: SalaryRecordSeedRow[] = [];

  const countryWeighted = COUNTRIES.map((c) => ({ value: c, weight: c.headcountWeight }));
  const emailLocalPartCounts = new Map<string, number>();
  // Monotonically increasing across employees AND salary records, so every
  // id produced by idFromCounter() in this run is unique by construction.
  let idCounter = 0;

  for (let i = 0; i < count; i++) {
    const country = rng.weightedPick(countryWeighted);
    const currency = currencyByCode(country.defaultCurrencyCode);
    const department = rng.pick(DEPARTMENTS);
    const levelIndex = rng.weightedPick(SENIORITY_WEIGHTS);
    const level = SENIORITY_LEVELS[levelIndex]!;
    const jobTitle = JOB_TITLES_BY_DEPARTMENT[department][levelIndex]!;

    const namePool = namePoolForCountry(country.code);
    const firstName = rng.pick(namePool.firstNames);
    const lastName = rng.pick(namePool.lastNames);
    const fullName = `${firstName} ${lastName}`;

    const emailLocalBase = `${slugify(firstName)}.${slugify(lastName)}`;
    const priorCount = emailLocalPartCounts.get(emailLocalBase) ?? 0;
    emailLocalPartCounts.set(emailLocalBase, priorCount + 1);
    const emailLocal = priorCount === 0 ? emailLocalBase : `${emailLocalBase}${priorCount + 1}`;
    const email = `${emailLocal}@acme-corp.example`;

    const employeeNumber = `EMP-${String(i + 1).padStart(6, '0')}`;

    const latestHireDate = addDays(ANCHOR_DATE, -MIN_TENURE_DAYS_BEFORE_ANCHOR);
    const hireOffsetDays = rng.int(0, daysBetween(EARLIEST_HIRE_DATE, latestHireDate));
    const hireDate = addDays(EARLIEST_HIRE_DATE, hireOffsetDays);

    const employmentStatus: EmploymentStatus = rng.chance(TERMINATED_PROBABILITY)
      ? 'TERMINATED'
      : 'ACTIVE';

    const employeeId = idFromCounter(seed, idCounter++);

    employees.push({
      id: employeeId,
      employeeNumber,
      fullName,
      email,
      countryCode: country.code,
      department,
      jobTitle,
      employmentStatus,
      hireDate,
    });

    // --- Salary history ---------------------------------------------------
    const tenureDays = daysBetween(hireDate, ANCHOR_DATE);
    const maxRecords = maxSalaryRecordsForTenure(tenureDays);
    const recordCount = pickSalaryRecordCount(rng, maxRecords);

    const effectiveDates: Date[] = [hireDate];
    if (recordCount > 1) {
      const segmentDays = Math.floor(tenureDays / recordCount);
      for (let r = 1; r < recordCount; r++) {
        const jitter = rng.int(0, Math.max(segmentDays - 1, 0));
        effectiveDates.push(addDays(hireDate, segmentDays * r + jitter));
      }
    }

    const varianceFactor = 0.88 + rng.next() * 0.24; // 0.88x - 1.12x
    const deptMultiplier = DEPARTMENT_PAY_SCALE_BASIS_POINTS[department] / 10000;
    const countryMultiplier = country.payScaleBasisPoints / 10000;
    const baseUsd = level.baseUsdAnnual * deptMultiplier * countryMultiplier * varianceFactor;
    const initialLocalAmount = baseUsd / currency.exchangeRateToUsd;
    let currentMinorUnits = roundToMinorUnits(initialLocalAmount, currency.minorUnit);

    for (let r = 0; r < recordCount; r++) {
      if (r > 0) {
        const raiseFactor = rng.int(103, 112) / 100; // 3%-12% raise
        currentMinorUnits = roundToMinorUnits(currentMinorUnits * raiseFactor, 0);
      }

      const effectiveDate = effectiveDates[r]!;
      const nextDate = effectiveDates[r + 1];
      const isCurrent = r === recordCount - 1;

      salaryRecords.push({
        id: idFromCounter(seed, idCounter++),
        employeeId,
        amount: minorUnitsToDecimalString(currentMinorUnits, currency.minorUnit),
        currencyCode: currency.code,
        effectiveDate,
        endDate: isCurrent ? null : (nextDate ?? null),
        createdBy: 'seed-script',
      });
    }
  }

  return { employees, salaryRecords };
}

export { COUNTRIES, CURRENCIES };
