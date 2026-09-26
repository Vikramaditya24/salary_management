import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { Prisma, type PrismaClient } from './generated/prisma/index.js';
import { prisma } from './lib/prisma.js';
import { conflict, notFound, unprocessable } from './lib/errors.js';
import { parseWith } from './lib/validation.js';
import { parseEmployeeParams } from './employees/schemas.js';
import { prismaErrorCode } from './lib/prisma-errors.js';

const bodySchema = z
  .object({
    amount: z
      .string()
      .regex(
        /^(?:[1-9]\d{0,11})(?:\.\d{1,2})?$/,
        'amount must be a positive decimal string with at most two fractional digits.',
      ),
    currencyCode: z
      .string()
      .regex(/^[A-Z]{3}$/, 'currencyCode must be an uppercase ISO 4217 code.'),
    effectiveDate: z.iso.date(),
  })
  .strict();
const iso = (date: Date) => date.toISOString().slice(0, 10);
export function salaryDto(row: {
  id: string;
  amount: Prisma.Decimal;
  currencyCode: string;
  effectiveDate: Date;
  endDate: Date | null;
  createdBy: string;
  createdAt: Date;
}) {
  return {
    id: row.id,
    amount: row.amount.toFixed(2),
    currencyCode: row.currencyCode,
    effectiveDate: iso(row.effectiveDate),
    endDate: row.endDate ? iso(row.endDate) : null,
    createdBy: row.createdBy,
    createdAt: row.createdAt.toISOString(),
  };
}

export async function registerSalary(app: FastifyInstance, db: PrismaClient = prisma) {
  app.get('/employees/:id/salary-history', async (request) => {
    const { id } = parseEmployeeParams(request.params);
    const employee = await db.employee.findUnique({ where: { id }, select: { id: true } });
    if (!employee) throw notFound('EMPLOYEE_NOT_FOUND', 'Employee not found.');
    const rows = await db.salaryRecord.findMany({
      where: { employeeId: id },
      orderBy: [{ effectiveDate: 'desc' }, { id: 'desc' }],
    });
    return { data: rows.map(salaryDto) };
  });

  app.post('/employees/:id/salary', async (request, reply) => {
    const { id } = parseEmployeeParams(request.params);
    const input = parseWith(bodySchema, request.body);
    const today = iso(new Date());
    if (input.effectiveDate > today)
      throw unprocessable('EFFECTIVE_DATE_IN_FUTURE', 'Effective date cannot be in the future.');
    const currency = await db.currency.findUnique({ where: { code: input.currencyCode } });
    if (!currency) throw unprocessable('CURRENCY_NOT_FOUND', 'Unknown currency code.');
    if (new Prisma.Decimal(input.amount).decimalPlaces() > currency.minorUnit) {
      throw unprocessable(
        'INVALID_MINOR_UNITS',
        'Amount has more fractional digits than this currency permits.',
      );
    }
    try {
      const row = await db.$transaction(async (tx) => {
        // A row lock serializes changes, including the race to set an initial salary.
        await tx.$queryRaw`SELECT id FROM employees WHERE id = ${id}::uuid FOR UPDATE`;
        const employee = await tx.employee.findUnique({
          where: { id },
          select: { employmentStatus: true, hireDate: true },
        });
        if (!employee) throw notFound('EMPLOYEE_NOT_FOUND', 'Employee not found.');
        if (employee.employmentStatus !== 'ACTIVE')
          throw conflict('EMPLOYEE_TERMINATED', 'Cannot change salary for a terminated employee.');
        if (input.effectiveDate < iso(employee.hireDate))
          throw unprocessable(
            'EFFECTIVE_DATE_BEFORE_HIRE',
            'Effective date must be on or after hire date.',
          );
        const current = await tx.salaryRecord.findFirst({
          where: { employeeId: id, endDate: null },
        });
        if (current) {
          if (input.effectiveDate <= iso(current.effectiveDate))
            throw conflict(
              'EFFECTIVE_DATE_CONFLICT',
              'Effective date must be after the current salary start date.',
            );
          await tx.salaryRecord.update({
            where: { id: current.id },
            data: { endDate: new Date(input.effectiveDate) },
          });
        }
        return tx.salaryRecord.create({
          data: {
            employeeId: id,
            amount: input.amount,
            currencyCode: input.currencyCode,
            effectiveDate: new Date(input.effectiveDate),
            createdBy: 'HR Manager',
          },
        });
      });
      return reply.code(201).send({ data: salaryDto(row) });
    } catch (error) {
      if (prismaErrorCode(error) === 'P2002')
        throw conflict('CURRENT_SALARY_CONFLICT', 'A current salary already exists.');
      if (prismaErrorCode(error) === 'P2003')
        throw unprocessable('CURRENCY_NOT_FOUND', 'Unknown currency code.');
      throw error;
    }
  });
}
