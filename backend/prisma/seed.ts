/**
 * Deterministic seed script for the employee data layer.
 *
 * - Deterministic: `generateDataset` (prisma/seed/generate-employees.ts) is a
 *   pure function of (count, seed) — no wall-clock dates, no Math.random(),
 *   no external APIs. Same inputs, same 10,000 rows, every time.
 * - Safe to rerun: reference data (countries/currencies) is upserted;
 *   employees/salary history are deleted and reinserted inside a single
 *   transaction, so a rerun always ends in the exact same state rather than
 *   accumulating duplicates or failing on unique-constraint violations.
 * - No external APIs: all reference data and generation logic is local.
 * - Batched inserts: `createMany` in chunks, not one round trip per row —
 *   see docs/architecture.md "Handling 10,000 Employees Comfortably".
 */
import { prisma } from '../src/lib/prisma.js';
import { generateDataset } from './seed/generate-employees.js';
import { COUNTRIES, CURRENCIES } from './seed/reference-data.js';

const EMPLOYEE_COUNT = 10_000;
// Arbitrary fixed constant — the entire point is that it never changes.
const SEED = 20260924;

const BATCH_SIZE = 1_000;

async function chunkedCreateMany<T>(
  label: string,
  rows: readonly T[],
  createMany: (batch: T[]) => Promise<{ count: number }>,
): Promise<void> {
  for (let offset = 0; offset < rows.length; offset += BATCH_SIZE) {
    const batch = rows.slice(offset, offset + BATCH_SIZE) as T[];
    await createMany(batch);
    console.log(`  ${label}: ${Math.min(offset + BATCH_SIZE, rows.length)}/${rows.length}`);
  }
}

async function main() {
  console.log(`Seeding with EMPLOYEE_COUNT=${EMPLOYEE_COUNT}, SEED=${SEED}`);

  console.log('Upserting reference data (currencies, countries)...');
  for (const currency of CURRENCIES) {
    await prisma.currency.upsert({
      where: { code: currency.code },
      create: {
        code: currency.code,
        name: currency.name,
        minorUnit: currency.minorUnit,
        exchangeRateToUsd: currency.exchangeRateToUsd,
      },
      update: {
        name: currency.name,
        minorUnit: currency.minorUnit,
        exchangeRateToUsd: currency.exchangeRateToUsd,
      },
    });
  }
  for (const country of COUNTRIES) {
    await prisma.country.upsert({
      where: { code: country.code },
      create: {
        code: country.code,
        name: country.name,
        defaultCurrencyCode: country.defaultCurrencyCode,
      },
      update: {
        name: country.name,
        defaultCurrencyCode: country.defaultCurrencyCode,
      },
    });
  }

  console.log(`Generating ${EMPLOYEE_COUNT} employees deterministically...`);
  const { employees, salaryRecords } = generateDataset({ count: EMPLOYEE_COUNT, seed: SEED });
  console.log(`  generated ${employees.length} employees, ${salaryRecords.length} salary records`);

  console.log('Clearing previously seeded employees/salary records (safe to rerun)...');
  // Deleting employees cascades to salary_records (onDelete: Cascade), but
  // being explicit about both keeps intent obvious and doesn't rely on
  // cascade behavior being remembered correctly six months from now.
  await prisma.$transaction([prisma.salaryRecord.deleteMany(), prisma.employee.deleteMany()]);

  console.log('Inserting employees...');
  await chunkedCreateMany('employees', employees, (batch) =>
    prisma.employee.createMany({ data: batch }),
  );

  console.log('Inserting salary records...');
  await chunkedCreateMany('salary_records', salaryRecords, (batch) =>
    prisma.salaryRecord.createMany({ data: batch }),
  );

  const employeeCount = await prisma.employee.count();
  const salaryRecordCount = await prisma.salaryRecord.count();
  console.log(`Done. employees=${employeeCount} salary_records=${salaryRecordCount}`);

  if (employeeCount !== EMPLOYEE_COUNT) {
    throw new Error(`Expected ${EMPLOYEE_COUNT} employees after seeding, found ${employeeCount}`);
  }
}

main()
  .catch((error) => {
    console.error('Seed failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
