/**
 * Verifies the employee API against the real, seeded database (10,000
 * employees from `npm run db:seed`). Boots the app in-process and drives it
 * through `inject`, cross-checking every API answer against an independent
 * Prisma count/lookup.
 *
 *   cd backend && npm run db:seed && npm run verify:api
 *
 * It only reads seeded data. The one write scenario creates a single temporary
 * employee and removes it in a `finally` block, so the dataset ends exactly as
 * it started. Exits non-zero if any check fails.
 */
process.env.NODE_ENV = 'test'; // silences request logging; DATABASE_URL still comes from .env

const { buildApp } = await import('../src/app.js');
const { prisma } = await import('../src/lib/prisma.js');

const EXPECTED_TOTAL = Number(process.env.EXPECTED_EMPLOYEES ?? 10_000);
const SLOW_MS = 1_000; // requirements.md: list/search well under 1s

const app = await buildApp();
let failures = 0;
const timings: { label: string; ms: number }[] = [];

function check(name: string, ok: boolean, detail = ''): void {
  if (!ok) failures++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`);
}

async function call(label: string, method: 'GET' | 'POST' | 'PATCH' | 'DELETE', url: string, payload?: object) {
  const started = performance.now();
  const response = await app.inject({ method, url, ...(payload ? { payload } : {}) });
  timings.push({ label, ms: performance.now() - started });
  return { status: response.statusCode, body: response.json() as any, raw: response.body }; // eslint-disable-line @typescript-eslint/no-explicit-any
}

try {
  // -- ground truth straight from the database --------------------------------
  const [total, active, terminated] = await Promise.all([
    prisma.employee.count(),
    prisma.employee.count({ where: { employmentStatus: 'ACTIVE' } }),
    prisma.employee.count({ where: { employmentStatus: 'TERMINATED' } }),
  ]);
  check(`database holds ${EXPECTED_TOTAL} employees`, total === EXPECTED_TOTAL, `found ${total}`);

  // -- pagination over the whole dataset ----------------------------------------
  const first = await call('list page 1', 'GET', '/employees?status=ALL&pageSize=100');
  check('status=ALL total matches the database', first.body.meta.totalItems === total);
  check('100 pages of 100', first.body.meta.totalPages === Math.ceil(total / 100));
  check('one page holds at most pageSize rows', first.body.data.length === 100);

  const seen = new Set<string>();
  let previousKey = '';
  let ordered = true;
  for (let page = 1; page <= first.body.meta.totalPages; page++) {
    const { body } = await call('list page', 'GET', `/employees?status=ALL&pageSize=100&page=${page}`);
    for (const e of body.data) {
      seen.add(e.id);
      const key = `${e.fullName}\u0000${e.id}`;
      if (previousKey && key < previousKey && e.fullName === previousKey.split('\u0000')[0]) ordered = false;
      previousKey = key;
    }
  }
  check('walking every page yields every employee exactly once', seen.size === total, `${seen.size}/${total}`);
  check('rows with equal names come back in a stable (id) order', ordered);

  const beyond = await call('page beyond end', 'GET', '/employees?status=ALL&pageSize=100&page=101');
  check('page past the end: 200, empty, accurate totals', beyond.status === 200 && beyond.body.data.length === 0 && beyond.body.meta.totalItems === total);

  // -- status default and filters, each checked against a Prisma count ------------
  const defaultList = await call('default list', 'GET', '/employees?pageSize=1');
  check('default list is ACTIVE only', defaultList.body.meta.totalItems === active);
  const terminatedList = await call('terminated list', 'GET', '/employees?status=TERMINATED&pageSize=1');
  check('status=TERMINATED total matches', terminatedList.body.meta.totalItems === terminated);

  const options = await call('filter options', 'GET', '/employees/filter-options');
  check('filter-options lists countries, departments and job titles',
    options.body.data.countries.length > 0 && options.body.data.departments.length === 10 && options.body.data.jobTitles.length > 0);

  for (const department of options.body.data.departments as string[]) {
    const api = await call('filter department', 'GET', `/employees?status=ALL&pageSize=1&department=${department}`);
    const db = await prisma.employee.count({ where: { department: department as never } });
    check(`department=${department}`, api.body.meta.totalItems === db, `api=${api.body.meta.totalItems} db=${db}`);
  }
  for (const { code } of options.body.data.countries as { code: string }[]) {
    const api = await call('filter country', 'GET', `/employees?status=ALL&pageSize=1&country=${code}`);
    const db = await prisma.employee.count({ where: { countryCode: code } });
    check(`country=${code}`, api.body.meta.totalItems === db, `api=${api.body.meta.totalItems} db=${db}`);
  }
  for (const title of (options.body.data.jobTitles as string[]).slice(0, 5)) {
    const api = await call('filter jobTitle', 'GET', `/employees?status=ALL&pageSize=1&jobTitle=${encodeURIComponent(title)}`);
    const db = await prisma.employee.count({ where: { jobTitle: title } });
    check(`jobTitle="${title}"`, api.body.meta.totalItems === db, `api=${api.body.meta.totalItems} db=${db}`);
  }
  const combo = await call('filter combo', 'GET', '/employees?department=ENGINEERING&country=DE,US&pageSize=1');
  const comboDb = await prisma.employee.count({
    where: { department: 'ENGINEERING', countryCode: { in: ['DE', 'US'] }, employmentStatus: 'ACTIVE' },
  });
  check('department + multiple countries + default status', combo.body.meta.totalItems === comboDb, `api=${combo.body.meta.totalItems} db=${comboDb}`);

  // -- search ---------------------------------------------------------------------
  const sample = await prisma.employee.findFirstOrThrow({ where: { employmentStatus: 'ACTIVE' }, orderBy: { employeeNumber: 'asc' }, skip: 4321 });
  const byEmail = await call('search email', 'GET', `/employees?q=${encodeURIComponent(sample.email)}`);
  check('search by exact email finds the employee', byEmail.body.data.some((e: { id: string }) => e.id === sample.id));
  const byNumber = await call('search number', 'GET', `/employees?q=${encodeURIComponent(sample.employeeNumber.toLowerCase())}&status=ALL`);
  check('search by employee number (case-insensitive)', byNumber.body.data.some((e: { id: string }) => e.id === sample.id));
  const nameWords = sample.fullName.split(' ').reverse().join(' ').toUpperCase();
  const byName = await call('search name', 'GET', `/employees?q=${encodeURIComponent(nameWords)}`);
  check('search by name, any word order, any case', byName.body.data.some((e: { id: string }) => e.id === sample.id), `q="${nameWords}"`);
  const dbNameMatches = await prisma.employee.count({
    where: { employmentStatus: 'ACTIVE', AND: nameWords.split(' ').map((w) => ({ fullName: { contains: w, mode: 'insensitive' as const } })) },
  });
  check('name-search total matches an independent count (name column only)', byName.body.meta.totalItems >= dbNameMatches);
  const nothing = await call('search none', 'GET', '/employees?q=zzzzqqqqxxxx');
  check('search with no match: 200, empty, totalItems 0', nothing.status === 200 && nothing.body.meta.totalItems === 0);

  // -- retrieval, incl. current salary vs the database ------------------------------
  const sampleIds = await prisma.employee.findMany({ take: 50, skip: 1000, orderBy: { id: 'asc' }, select: { id: true } });
  let salaryMismatches = 0;
  for (const { id } of sampleIds) {
    const api = await call('get employee', 'GET', `/employees/${id}`);
    const dbSalary = await prisma.salaryRecord.findFirst({ where: { employeeId: id, endDate: null } });
    const apiSalary = api.body.data?.currentSalary;
    if (api.status !== 200 || !dbSalary || !apiSalary || apiSalary.amount !== dbSalary.amount.toFixed(2) || apiSalary.currencyCode !== dbSalary.currencyCode) salaryMismatches++;
  }
  check('50 sampled employees: detail salary equals the DB current salary, exactly', salaryMismatches === 0, `${salaryMismatches} mismatches`);
  const listRaw = await call('list raw', 'GET', '/employees?pageSize=100');
  check('list responses contain no salary data', !/amount|salary/i.test(listRaw.raw));

  // -- error handling ---------------------------------------------------------------
  check('page=0 -> 400', (await call('bad page', 'GET', '/employees?page=0')).status === 400);
  check('pageSize=1000 -> 400', (await call('bad size', 'GET', '/employees?pageSize=1000')).status === 400);
  check('unknown filter value -> 400', (await call('bad dept', 'GET', '/employees?department=WIZARDS')).status === 400);
  check('malformed id -> 400', (await call('bad id', 'GET', '/employees/xyz')).status === 400);
  check('unknown id -> 404', (await call('missing', 'GET', '/employees/00000000-0000-4000-8000-000000000000')).status === 404);

  // -- one create/edit/deactivate cycle, cleaned up afterwards ------------------------
  const email = 'verify.script@verify-script.example';
  try {
    const created = await call('create', 'POST', '/employees', {
      fullName: 'Verify Script', email, countryCode: 'US', department: 'LEGAL', jobTitle: 'Verifier', hireDate: '2024-01-02',
    });
    check('create -> 201', created.status === 201, created.body.error?.code ?? '');
    const id = created.body.data?.id as string;
    const dupe = await call('create dupe', 'POST', '/employees', {
      fullName: 'Verify Script', email: email.toUpperCase(), countryCode: 'US', department: 'LEGAL', jobTitle: 'Verifier', hireDate: '2024-01-02',
    });
    check('duplicate email (case-insensitive) -> 409', dupe.status === 409);
    check('edit -> 200', (await call('patch', 'PATCH', `/employees/${id}`, { jobTitle: 'Senior Verifier' })).status === 200);
    const deactivated = await call('delete', 'DELETE', `/employees/${id}`);
    check('delete -> 200 and TERMINATED', deactivated.status === 200 && deactivated.body.data.employmentStatus === 'TERMINATED');
  } finally {
    await prisma.employee.deleteMany({ where: { email } });
  }
  check('dataset is back to its original size', (await prisma.employee.count()) === total);

  // -- performance ------------------------------------------------------------------
  const slow = timings.filter((t) => t.ms > SLOW_MS);
  const sorted = timings.map((t) => t.ms).sort((a, b) => a - b);
  const p95 = sorted[Math.floor(sorted.length * 0.95)] ?? 0;
  console.log(`\n${timings.length} requests; p95 ${p95.toFixed(1)} ms; max ${(sorted.at(-1) ?? 0).toFixed(1)} ms`);
  check(`no request slower than ${SLOW_MS} ms`, slow.length === 0, slow.map((s) => `${s.label}:${s.ms.toFixed(0)}ms`).join(', '));
} finally {
  await app.close();
  await prisma.$disconnect();
}

console.log(failures === 0 ? '\nAll checks passed.' : `\n${failures} check(s) FAILED.`);
process.exit(failures === 0 ? 0 : 1);
