import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from './app.js';
import { prisma } from './lib/prisma.js';

const email = 'salary-db-test@example.invalid';
let app: FastifyInstance;
let id: string;
const salary = (amount: string, date: string) => ({
  amount,
  currencyCode: 'USD',
  effectiveDate: date,
});

describe('salary and analytics against PostgreSQL', () => {
  beforeAll(async () => {
    await prisma.currency.upsert({
      where: { code: 'USD' },
      create: { code: 'USD', name: 'US Dollar', minorUnit: 2, exchangeRateToUsd: '1' },
      update: {},
    });
    await prisma.country.upsert({
      where: { code: 'US' },
      create: { code: 'US', name: 'United States', defaultCurrencyCode: 'USD' },
      update: {},
    });
    await prisma.employee.deleteMany({ where: { email } });
    const employee = await prisma.employee.create({
      data: {
        employeeNumber: 'EMP-999999',
        fullName: 'Salary DB Test',
        email,
        countryCode: 'US',
        department: 'FINANCE',
        jobTitle: 'Salary Tester',
        hireDate: new Date('2020-01-01'),
      },
    });
    id = employee.id;
    app = await buildApp({ testOnlyDisableAuth: true });
  });
  afterAll(async () => {
    if (app) await app.close();
    await prisma.employee.deleteMany({ where: { email } });
    await prisma.$disconnect();
  });

  it('creates an initial salary, changes it atomically, and keeps exactly one open record', async () => {
    const first = await app.inject({
      method: 'POST',
      url: `/employees/${id}/salary`,
      payload: salary('100000.00', '2023-01-01'),
    });
    expect(first.statusCode).toBe(201);
    const second = await app.inject({
      method: 'POST',
      url: `/employees/${id}/salary`,
      payload: salary('120000.00', '2024-01-01'),
    });
    expect(second.statusCode).toBe(201);
    const rows = await prisma.salaryRecord.findMany({
      where: { employeeId: id },
      orderBy: { effectiveDate: 'asc' },
    });
    expect(rows.map((r) => r.endDate?.toISOString().slice(0, 10) ?? null)).toEqual([
      '2024-01-01',
      null,
    ]);
    expect(rows.filter((r) => r.endDate === null)).toHaveLength(1);
    const conflict = await app.inject({
      method: 'POST',
      url: `/employees/${id}/salary`,
      payload: salary('130000.00', '2024-01-01'),
    });
    expect(conflict.statusCode).toBe(409);
    expect(await prisma.salaryRecord.count({ where: { employeeId: id } })).toBe(2);
    const insights = await app.inject('/analytics/salary?country=US&department=FINANCE');
    expect(insights.statusCode).toBe(200);
    expect(
      insights
        .json()
        .data.salaryByRole.some((r: { jobTitle: string }) => r.jobTitle === 'Salary Tester'),
    ).toBe(true);
  });
  it('refuses salary writes for terminated employees', async () => {
    await prisma.employee.update({ where: { id }, data: { employmentStatus: 'TERMINATED' } });
    const response = await app.inject({
      method: 'POST',
      url: `/employees/${id}/salary`,
      payload: salary('140000.00', '2025-01-01'),
    });
    expect(response.statusCode).toBe(409);
    expect(response.json().error.code).toBe('EMPLOYEE_TERMINATED');
  });
});
