/**
 * End-to-end API tests against a real Postgres test database (HTTP layer ->
 * service -> Prisma -> Postgres). These cover what mocks cannot: case-
 * insensitive search semantics, real pagination/ordering, and the actual
 * unique / foreign-key / CHECK constraints behind the 409 and 422 responses.
 *
 * Requires a migrated test database (see employee-data-layer.db.test.ts).
 * All rows created here are tagged with TAG in their email and removed
 * afterwards; reference rows use codes no other suite uses.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../app.js';
import { prisma } from '../lib/prisma.js';

const TAG = '@employee-api-test.example';
const CURRENCY = 'XAP';
const COUNTRY_A = 'XA';
const COUNTRY_B = 'XB';
const TOTAL = 30; // employees 1..30; every 5th is TERMINATED => 24 active, 6 terminated
const ACTIVE = 24;

let app: FastifyInstance;
const pad = (n: number) => String(n).padStart(2, '0');

async function cleanup() {
  await prisma.employee.deleteMany({ where: { email: { endsWith: TAG } } });
}

async function get(url: string) {
  const response = await app.inject({ method: 'GET', url });
  return { status: response.statusCode, body: response.json(), raw: response.body };
}

/** All list calls are scoped to this suite's rows via a search on the TAG. */
const scoped = (params = '') =>
  `/employees?q=${encodeURIComponent(TAG)}${params ? `&${params}` : ''}`;

describe('employee API against Postgres', () => {
  beforeAll(async () => {
    app = await buildApp();
    await cleanup();
    await prisma.currency.upsert({
      where: { code: CURRENCY },
      create: { code: CURRENCY, name: 'API Test Currency', minorUnit: 2, exchangeRateToUsd: '1.0' },
      update: {},
    });
    for (const code of [COUNTRY_A, COUNTRY_B]) {
      await prisma.country.upsert({
        where: { code },
        create: { code, name: `API Test Country ${code}`, defaultCurrencyCode: CURRENCY },
        update: {},
      });
    }

    await prisma.employee.createMany({
      data: Array.from({ length: TOTAL }, (_, i) => {
        const n = i + 1;
        return {
          employeeNumber: `APT-0000${pad(n)}`,
          fullName: `Apitest Person ${pad(n)}`,
          email: `apitest.${pad(n)}${TAG}`,
          countryCode: n % 2 === 0 ? COUNTRY_A : COUNTRY_B,
          department: n <= 15 ? ('ENGINEERING' as const) : ('SALES' as const),
          jobTitle: n % 3 === 0 ? 'Apitest Lead' : 'Apitest Associate',
          employmentStatus: n % 5 === 0 ? ('TERMINATED' as const) : ('ACTIVE' as const),
          hireDate: new Date(Date.UTC(2020, 0, n)),
        };
      }),
    });

    // Employee 7: a closed historical salary plus the current one.
    const seven = await prisma.employee.findUniqueOrThrow({
      where: { email: `apitest.07${TAG}` },
    });
    await prisma.salaryRecord.createMany({
      data: [
        {
          employeeId: seven.id,
          amount: '90000.00',
          currencyCode: CURRENCY,
          effectiveDate: new Date('2020-01-07'),
          endDate: new Date('2021-12-31'),
        },
        {
          employeeId: seven.id,
          amount: '150000.50',
          currencyCode: CURRENCY,
          effectiveDate: new Date('2022-01-01'),
        },
      ],
    });
  });

  afterAll(async () => {
    await cleanup();
    await prisma.country.deleteMany({ where: { code: { in: [COUNTRY_A, COUNTRY_B] } } });
    await prisma.currency.deleteMany({ where: { code: CURRENCY } });
    await app.close();
    await prisma.$disconnect();
  });

  describe('listing', () => {
    it('paginates without repeating or skipping rows, and reports accurate metadata', async () => {
      const seen: string[] = [];
      let totalPages = 0;
      for (let page = 1; page <= 3; page++) {
        const { status, body } = await get(scoped(`page=${page}&pageSize=10`));
        expect(status).toBe(200);
        expect(body.meta.totalItems).toBe(ACTIVE);
        totalPages = body.meta.totalPages;
        expect(body.data.length).toBe(page < 3 ? 10 : 4);
        seen.push(...body.data.map((e: { employeeNumber: string }) => e.employeeNumber));
      }
      expect(totalPages).toBe(3);
      expect(new Set(seen).size).toBe(ACTIVE);
      // Default sort is fullName ascending.
      expect([...seen].sort()).toEqual(seen);
    });

    it('returns an empty page with correct totals beyond the last page', async () => {
      const { status, body } = await get(scoped('page=50&pageSize=10'));
      expect(status).toBe(200);
      expect(body.data).toEqual([]);
      expect(body.meta.totalItems).toBe(ACTIVE);
      expect(body.meta.hasNextPage).toBe(false);
    });

    it('excludes terminated employees by default and can include or isolate them', async () => {
      expect((await get(scoped())).body.meta.totalItems).toBe(ACTIVE);
      expect((await get(scoped('status=ALL'))).body.meta.totalItems).toBe(TOTAL);
      const terminated = await get(scoped('status=TERMINATED'));
      expect(terminated.body.meta.totalItems).toBe(TOTAL - ACTIVE);
    });

    it('filters by country, department and job title, alone and combined', async () => {
      const byCountry = await get(scoped(`country=${COUNTRY_A}&status=ALL`));
      expect(byCountry.body.meta.totalItems).toBe(15);

      const byDepartment = await get(scoped('department=SALES&status=ALL'));
      expect(byDepartment.body.meta.totalItems).toBe(15);

      const byTitle = await get(scoped(`jobTitle=${encodeURIComponent('Apitest Lead')}&status=ALL`));
      expect(byTitle.body.meta.totalItems).toBe(10);

      const both = await get(scoped(`country=${COUNTRY_A}&department=ENGINEERING&status=ALL`));
      // Even numbers between 1 and 15: 2,4,...,14
      expect(both.body.meta.totalItems).toBe(7);

      const multi = await get(scoped(`country=${COUNTRY_A},${COUNTRY_B}&status=ALL`));
      expect(multi.body.meta.totalItems).toBe(TOTAL);
    });

    it('searches name, email and employee number case-insensitively, all words required', async () => {
      const nameSearch = await get(`/employees?q=${encodeURIComponent(`person 07 ${TAG}`)}`);
      expect(nameSearch.body.meta.totalItems).toBe(1);
      expect(nameSearch.body.data[0].fullName).toBe('Apitest Person 07');

      const emailSearch = await get(`/employees?q=${encodeURIComponent(`apitest.07${TAG}`)}`);
      expect(emailSearch.body.data.map((e: { email: string }) => e.email)).toEqual([
        `apitest.07${TAG}`,
      ]);

      const numberSearch = await get(`/employees?q=${encodeURIComponent('apt-000007')}`);
      expect(numberSearch.body.data.map((e: { employeeNumber: string }) => e.employeeNumber)).toEqual([
        'APT-000007',
      ]);

      const none = await get(`/employees?q=${encodeURIComponent(`${TAG} nonexistentzzz`)}`);
      expect(none.body.meta.totalItems).toBe(0);
      expect(none.body.data).toEqual([]);
    });

    it('sorts by the requested field', async () => {
      const { body } = await get(scoped('sortBy=hireDate&sortOrder=desc&pageSize=5'));
      const dates: string[] = body.data.map((e: { hireDate: string }) => e.hireDate);
      expect([...dates].sort().reverse()).toEqual(dates);
    });

    it('never includes salary data', async () => {
      const { raw } = await get(scoped('status=ALL&pageSize=100'));
      expect(raw.includes('amount')).toBe(false);
      expect(raw.toLowerCase().includes('salary')).toBe(false);
    });

    it('exposes filter options for the UI', async () => {
      const { status, body } = await get('/employees/filter-options');
      expect(status).toBe(200);
      const codes = body.data.countries.map((c: { code: string }) => c.code);
      expect(codes).toContain(COUNTRY_A);
      expect(body.data.jobTitles).toContain('Apitest Lead');
      expect(body.data.departments).toContain('ENGINEERING');
    });
  });

  describe('retrieval', () => {
    it('returns an employee with only the current salary, as an exact string', async () => {
      const list = await get(`/employees?q=${encodeURIComponent(`apitest.07${TAG}`)}`);
      const id = list.body.data[0].id;

      const { status, body, raw } = await get(`/employees/${id}`);

      expect(status).toBe(200);
      expect(body.data.currentSalary).toEqual({
        amount: '150000.50',
        currencyCode: CURRENCY,
        effectiveDate: '2022-01-01',
      });
      expect(raw.includes('90000')).toBe(false); // the closed record is not exposed
    });

    it('returns null for the salary of an employee without one', async () => {
      const list = await get(`/employees?q=${encodeURIComponent(`apitest.08${TAG}`)}`);
      const { body } = await get(`/employees/${list.body.data[0].id}`);
      expect(body.data.currentSalary).toBeNull();
    });

    it('returns 404 for an unknown id and 400 for a malformed one', async () => {
      const missing = await get('/employees/00000000-0000-4000-8000-000000000000');
      expect(missing.status).toBe(404);
      expect(missing.body.error.code).toBe('EMPLOYEE_NOT_FOUND');
      expect((await get('/employees/not-a-uuid')).status).toBe(400);
    });
  });

  describe('mutations', () => {
    const newEmployee = {
      fullName: 'Apitest Newhire',
      email: `apitest.newhire${TAG}`,
      countryCode: COUNTRY_A,
      department: 'LEGAL',
      jobTitle: 'Apitest Counsel',
      hireDate: '2024-02-29',
    };

    it('creates, reads, edits, deactivates and reactivates an employee', async () => {
      const created = await app.inject({ method: 'POST', url: '/employees', payload: newEmployee });
      expect(created.statusCode).toBe(201);
      const employee = created.json().data;
      expect(employee.employeeNumber).toMatch(/^EMP-\d{6,}$/);
      expect(employee.employmentStatus).toBe('ACTIVE');
      expect(created.headers.location).toBe(`/employees/${employee.id}`);
      expect((await get(`/employees/${employee.id}`)).body.data.fullName).toBe('Apitest Newhire');

      const patched = await app.inject({
        method: 'PATCH',
        url: `/employees/${employee.id}`,
        payload: { jobTitle: 'Apitest Senior Counsel', countryCode: COUNTRY_B },
      });
      expect(patched.statusCode).toBe(200);
      expect(patched.json().data.jobTitle).toBe('Apitest Senior Counsel');
      expect(patched.json().data.country.code).toBe(COUNTRY_B);

      const deleted = await app.inject({ method: 'DELETE', url: `/employees/${employee.id}` });
      expect(deleted.statusCode).toBe(200);
      expect(deleted.json().data.employmentStatus).toBe('TERMINATED');
      // Soft delete: the row and its detail view are still there.
      expect((await get(`/employees/${employee.id}`)).body.data.employmentStatus).toBe('TERMINATED');
      // ...but it no longer shows up in the default (active) list.
      const active = await get(`/employees?q=${encodeURIComponent('apitest.newhire' + TAG)}`);
      expect(active.body.meta.totalItems).toBe(0);
      // Idempotent.
      expect((await app.inject({ method: 'DELETE', url: `/employees/${employee.id}` })).statusCode).toBe(200);

      const reactivated = await app.inject({
        method: 'PATCH',
        url: `/employees/${employee.id}`,
        payload: { employmentStatus: 'ACTIVE' },
      });
      expect(reactivated.json().data.employmentStatus).toBe('ACTIVE');
    });

    it('rejects a duplicate email with 409, case-insensitively, via the real unique index', async () => {
      const first = await app.inject({
        method: 'POST',
        url: '/employees',
        payload: { ...newEmployee, email: `apitest.dupe${TAG}` },
      });
      expect(first.statusCode).toBe(201);

      const second = await app.inject({
        method: 'POST',
        url: '/employees',
        payload: { ...newEmployee, email: `APITEST.Dupe${TAG}` },
      });
      expect(second.statusCode).toBe(409);
      expect(second.json().error.code).toBe('EMAIL_ALREADY_EXISTS');
      expect(second.body.includes('employees_email_key')).toBe(false);
    });

    it('rejects editing an email onto another employee\'s with 409', async () => {
      const list = await get(`/employees?q=${encodeURIComponent(`apitest.01${TAG}`)}`);
      const response = await app.inject({
        method: 'PATCH',
        url: `/employees/${list.body.data[0].id}`,
        payload: { email: `apitest.02${TAG}` },
      });
      expect(response.statusCode).toBe(409);
      expect(response.json().error.code).toBe('EMAIL_ALREADY_EXISTS');
    });

    it('rejects an unknown country and a future hire date with 422', async () => {
      const country = await app.inject({
        method: 'POST',
        url: '/employees',
        payload: { ...newEmployee, email: `apitest.c${TAG}`, countryCode: 'XQ' },
      });
      expect(country.statusCode).toBe(422);
      expect(country.json().error.code).toBe('COUNTRY_NOT_FOUND');

      const future = await app.inject({
        method: 'POST',
        url: '/employees',
        payload: { ...newEmployee, email: `apitest.f${TAG}`, hireDate: '2999-01-01' },
      });
      expect(future.statusCode).toBe(422);
      expect(future.json().error.code).toBe('HIRE_DATE_IN_FUTURE');
    });

    it('returns 404 when editing or deleting an unknown employee', async () => {
      const id = '00000000-0000-4000-8000-000000000000';
      const patch = await app.inject({ method: 'PATCH', url: `/employees/${id}`, payload: { jobTitle: 'X' } });
      expect(patch.statusCode).toBe(404);
      const del = await app.inject({ method: 'DELETE', url: `/employees/${id}` });
      expect(del.statusCode).toBe(404);
    });
  });
});
