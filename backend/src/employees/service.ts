import type { Prisma, PrismaClient } from '../generated/prisma/index.js';
import { conflict, notFound, unprocessable } from '../lib/errors.js';
import { buildPaginationMeta, toSkipTake, type PaginationMeta } from '../lib/pagination.js';
import { prismaErrorCode, uniqueViolationFields } from '../lib/prisma-errors.js';
import { DEPARTMENTS, STATUS_FILTERS } from './constants.js';
import {
  toEmployeeDetailDto,
  toEmployeeDto,
  type EmployeeDetailDto,
  type EmployeeDto,
  type EmployeeFilterOptionsDto,
} from './dto.js';
import { buildEmployeeWhere, buildOrderBy } from './query.js';
import type { CreateEmployeeInput, ListEmployeesQuery, UpdateEmployeeInput } from './schemas.js';
import { employeeDetailSelect, employeeSelect } from './select.js';

/**
 * The slice of the Prisma client this service uses. Depending on a narrow
 * structural type (instead of the concrete client) is what lets the unit
 * tests drive the service with plain mocks — no database required.
 */
export interface EmployeeDb {
  employee: Pick<
    PrismaClient['employee'],
    'count' | 'create' | 'findFirst' | 'findMany' | 'findUnique' | 'groupBy' | 'update'
  >;
  country: Pick<PrismaClient['country'], 'findMany' | 'findUnique'>;
}

export interface EmployeeListResult {
  data: EmployeeDto[];
  meta: PaginationMeta;
}

export interface EmployeeService {
  list(query: ListEmployeesQuery): Promise<EmployeeListResult>;
  getById(id: string): Promise<EmployeeDetailDto>;
  create(input: CreateEmployeeInput): Promise<EmployeeDto>;
  update(id: string, input: UpdateEmployeeInput): Promise<EmployeeDto>;
  /** Soft delete: marks the employee TERMINATED. Never removes rows. */
  deactivate(id: string): Promise<EmployeeDto>;
  getFilterOptions(): Promise<EmployeeFilterOptionsDto>;
}

export interface EmployeeServiceOptions {
  /** Injectable clock, so date rules are deterministic in tests. */
  now?: () => Date;
  /** How many times create() re-reads the sequence after a number collision. */
  maxEmployeeNumberAttempts?: number;
}

const EMPLOYEE_NUMBER_PREFIX = 'EMP-';
const EMPLOYEE_NUMBER_WIDTH = 6;

const employeeNotFound = () => notFound('EMPLOYEE_NOT_FOUND', 'Employee not found.');
const toDbDate = (isoDate: string): Date => new Date(`${isoDate}T00:00:00.000Z`);

export function createEmployeeService(
  db: EmployeeDb,
  options: EmployeeServiceOptions = {},
): EmployeeService {
  const now = options.now ?? (() => new Date());
  const maxAttempts = options.maxEmployeeNumberAttempts ?? 5;

  // -- business rules ------------------------------------------------------

  function assertHireDateNotInFuture(hireDate: string): void {
    const today = now().toISOString().slice(0, 10);
    if (hireDate > today) {
      const message = 'Hire date cannot be in the future.';
      throw unprocessable('HIRE_DATE_IN_FUTURE', message, [{ field: 'hireDate', message }]);
    }
  }

  async function assertCountryExists(code: string): Promise<void> {
    const country = await db.country.findUnique({ where: { code }, select: { code: true } });
    if (!country) {
      const message = `Unknown country code "${code}".`;
      throw unprocessable('COUNTRY_NOT_FOUND', message, [{ field: 'countryCode', message }]);
    }
  }

  /**
   * Next human-facing number ("EMP-010001"): one past the highest existing
   * "EMP-" number. Fixed-width numbers sort lexicographically, so "highest"
   * is one indexed ORDER BY ... LIMIT 1. Two concurrent creates can compute
   * the same value; the UNIQUE constraint rejects the loser and create()
   * retries (see below), so uniqueness never depends on this read.
   */
  async function nextEmployeeNumber(): Promise<string> {
    const last = await db.employee.findFirst({
      where: { employeeNumber: { startsWith: EMPLOYEE_NUMBER_PREFIX } },
      orderBy: { employeeNumber: 'desc' },
      select: { employeeNumber: true },
    });
    const lastValue = last
      ? Number.parseInt(last.employeeNumber.slice(EMPLOYEE_NUMBER_PREFIX.length), 10)
      : 0;
    const next = (Number.isFinite(lastValue) ? lastValue : 0) + 1;
    return `${EMPLOYEE_NUMBER_PREFIX}${String(next).padStart(EMPLOYEE_NUMBER_WIDTH, '0')}`;
  }

  // -- database error translation ------------------------------------------

  type UniqueViolation = 'email' | 'employeeNumber' | 'unknown';

  /**
   * Which unique constraint tripped? Prisma normally says so in
   * `meta.target`, but that is not guaranteed across versions/driver
   * adapters — so when it is absent we ask the database directly instead of
   * guessing.
   */
  async function classifyUniqueViolation(
    error: unknown,
    email?: string,
  ): Promise<UniqueViolation> {
    const fields = uniqueViolationFields(error);
    if (fields.some((f) => f.includes('employee_number') || f.includes('employeenumber'))) {
      return 'employeeNumber';
    }
    if (fields.some((field) => field.includes('email'))) return 'email';
    if (email !== undefined) {
      const existing = await db.employee.findUnique({ where: { email }, select: { id: true } });
      return existing ? 'email' : 'unknown';
    }
    return 'unknown';
  }

  /**
   * Maps a Prisma error to a client-safe AppError. Returns the original error
   * unchanged when it isn't one we recognise, so the global handler can
   * report it as a masked 500.
   */
  async function translateWriteError(error: unknown, email?: string): Promise<unknown> {
    switch (prismaErrorCode(error)) {
      case 'P2025':
        return employeeNotFound();
      case 'P2003': {
        // The only foreign key on employees is country_code.
        const message = 'Unknown country code.';
        return unprocessable('COUNTRY_NOT_FOUND', message, [{ field: 'countryCode', message }]);
      }
      case 'P2004':
        return unprocessable('CONSTRAINT_VIOLATION', 'The data violates a business rule.');
      case 'P2002': {
        const kind = await classifyUniqueViolation(error, email);
        if (kind === 'email') {
          const message = 'An employee with this email already exists.';
          return conflict('EMAIL_ALREADY_EXISTS', message, [{ field: 'email', message }]);
        }
        return conflict('DUPLICATE_RECORD', 'A record with the same unique value already exists.');
      }
      default:
        return error;
    }
  }

  // -- operations ----------------------------------------------------------

  return {
    async list(query) {
      const where = buildEmployeeWhere(query);
      // Only one page of rows is ever loaded; the total comes from a COUNT(*)
      // over the same filter, not from materialising the result set.
      const [totalItems, rows] = await Promise.all([
        db.employee.count({ where }),
        db.employee.findMany({
          where,
          orderBy: buildOrderBy(query),
          ...toSkipTake(query),
          select: employeeSelect,
        }),
      ]);
      return {
        data: rows.map(toEmployeeDto),
        meta: buildPaginationMeta({ page: query.page, pageSize: query.pageSize, totalItems }),
      };
    },

    async getById(id) {
      const row = await db.employee.findUnique({ where: { id }, select: employeeDetailSelect });
      if (!row) throw employeeNotFound();
      return toEmployeeDetailDto(row);
    },

    async create(input) {
      assertHireDateNotInFuture(input.hireDate);
      await assertCountryExists(input.countryCode);

      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        const employeeNumber = await nextEmployeeNumber();
        try {
          const row = await db.employee.create({
            data: {
              employeeNumber,
              fullName: input.fullName,
              email: input.email,
              countryCode: input.countryCode,
              department: input.department,
              jobTitle: input.jobTitle,
              hireDate: toDbDate(input.hireDate),
            },
            select: employeeSelect,
          });
          return toEmployeeDto(row);
        } catch (error) {
          if (prismaErrorCode(error) === 'P2002') {
            const kind = await classifyUniqueViolation(error, input.email);
            // Lost a race for the number: re-read the sequence and try again.
            if (kind === 'employeeNumber' && attempt < maxAttempts) continue;
            if (kind === 'employeeNumber') {
              throw conflict(
                'EMPLOYEE_NUMBER_CONFLICT',
                'Could not allocate an employee number. Please retry.',
              );
            }
          }
          throw await translateWriteError(error, input.email);
        }
      }
      // Unreachable (the loop either returns or throws), but keeps TS honest.
      throw conflict('EMPLOYEE_NUMBER_CONFLICT', 'Could not allocate an employee number.');
    },

    async update(id, input) {
      if (input.hireDate !== undefined) assertHireDateNotInFuture(input.hireDate);
      if (input.countryCode !== undefined) await assertCountryExists(input.countryCode);

      const { hireDate, ...rest } = input;
      const data: Prisma.EmployeeUncheckedUpdateInput = {
        ...rest,
        ...(hireDate !== undefined ? { hireDate: toDbDate(hireDate) } : {}),
      };

      try {
        const row = await db.employee.update({ where: { id }, data, select: employeeSelect });
        return toEmployeeDto(row);
      } catch (error) {
        throw await translateWriteError(error, input.email);
      }
    },

    async deactivate(id) {
      const existing = await db.employee.findUnique({ where: { id }, select: employeeSelect });
      if (!existing) throw employeeNotFound();
      // Idempotent: deactivating an already-terminated employee succeeds and
      // leaves the row (including updatedAt) untouched.
      if (existing.employmentStatus === 'TERMINATED') return toEmployeeDto(existing);

      try {
        const row = await db.employee.update({
          where: { id },
          data: { employmentStatus: 'TERMINATED' },
          select: employeeSelect,
        });
        return toEmployeeDto(row);
      } catch (error) {
        throw await translateWriteError(error);
      }
    },

    async getFilterOptions() {
      const [countries, jobTitles] = await Promise.all([
        db.country.findMany({ orderBy: { name: 'asc' }, select: { code: true, name: true } }),
        // GROUP BY in the database — not a full-table read deduplicated in Node.
        db.employee.groupBy({ by: ['jobTitle'], orderBy: { jobTitle: 'asc' } }),
      ]);
      return {
        countries,
        departments: [...DEPARTMENTS],
        jobTitles: jobTitles.map((row) => row.jobTitle),
        statuses: [...STATUS_FILTERS],
      };
    },
  };
}
