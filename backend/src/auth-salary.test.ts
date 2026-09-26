import { describe, it, expect, vi, afterEach } from 'vitest';
import { scryptSync } from 'node:crypto';
import type { PrismaClient } from './generated/prisma/index.js';
import { env } from './config/env.js';
import { buildApp } from './app.js';

const ID = '11111111-1111-4111-8111-111111111111';
const password = 'test-strong-password';
const salt = '00112233445566778899aabbccddeeff';
const hash = `scrypt$${salt}$${scryptSync(password, Buffer.from(salt, 'hex'), 32).toString('hex')}`;

afterEach(() => {
  env.HR_PASSWORD_HASH = '';
});

describe('authentication', () => {
  it('rejects protected data without a token; logs in, resolves session, and revokes it', async () => {
    env.HR_PASSWORD_HASH = hash;
    let session: { tokenHash: string; expiresAt: Date } | undefined;
    const authDb = {
      hrSession: {
        create: vi.fn(async ({ data }: { data: typeof session }) => {
          session = data;
        }),
        findUnique: vi.fn(async () => session),
        deleteMany: vi.fn(async () => {
          session = undefined;
        }),
      },
    } as unknown as PrismaClient;
    const app = await buildApp({ authDb });
    try {
      const missing = await app.inject('/employees');
      expect(missing.statusCode).toBe(401);
      const bad = await app.inject({
        method: 'POST',
        url: '/auth/login',
        payload: { email: env.HR_EMAIL, password: 'wrong' },
      });
      expect(bad.statusCode).toBe(401);
      const login = await app.inject({
        method: 'POST',
        url: '/auth/login',
        payload: { email: env.HR_EMAIL, password },
      });
      expect(login.statusCode).toBe(200);
      const token = login.json().data.token as string;
      expect(session?.tokenHash).not.toBe(token);
      expect(
        (
          await app.inject({ url: '/auth/me', headers: { authorization: `Bearer ${token}` } })
        ).json().data.email,
      ).toBe(env.HR_EMAIL);
      expect(
        (
          await app.inject({
            method: 'POST',
            url: '/auth/logout',
            headers: { authorization: `Bearer ${token}` },
          })
        ).statusCode,
      ).toBe(204);
      expect(
        (await app.inject({ url: '/auth/me', headers: { authorization: `Bearer ${token}` } }))
          .statusCode,
      ).toBe(401);
    } finally {
      await app.close();
    }
  });
});

describe('salary', () => {
  it('closes the old record and inserts the new one in one transaction; preserves history', async () => {
    const current = { id: 'old', effectiveDate: new Date('2024-01-01'), endDate: null };
    const created = {
      id: ID,
      amount: { toFixed: () => '120000.00' },
      currencyCode: 'USD',
      effectiveDate: new Date('2025-01-01'),
      endDate: null,
      createdBy: 'HR Manager',
      createdAt: new Date('2025-01-01'),
    };
    const tx = {
      $queryRaw: vi.fn(async () => [{ id: ID }]),
      employee: {
        findUnique: vi.fn(async () => ({
          employmentStatus: 'ACTIVE',
          hireDate: new Date('2020-01-01'),
        })),
      },
      salaryRecord: {
        findFirst: vi.fn(async () => current),
        update: vi.fn(async () => ({})),
        create: vi.fn(async () => created),
      },
    };
    const db = {
      currency: { findUnique: vi.fn(async () => ({ minorUnit: 2 })) },
      $transaction: vi.fn(async (fn: (tx: typeof tx) => unknown) => fn(tx)),
      employee: { findUnique: vi.fn(async () => ({ id: ID })) },
      salaryRecord: { findMany: vi.fn(async () => [created]) },
    } as unknown as PrismaClient;
    const app = await buildApp({ testOnlyDisableAuth: true, salaryDb: db });
    try {
      const response = await app.inject({
        method: 'POST',
        url: `/employees/${ID}/salary`,
        payload: { amount: '120000.00', currencyCode: 'USD', effectiveDate: '2025-01-01' },
      });
      expect(response.statusCode).toBe(201);
      expect(tx.salaryRecord.update).toHaveBeenCalledWith({
        where: { id: 'old' },
        data: { endDate: new Date('2025-01-01') },
      });
      expect(tx.salaryRecord.create).toHaveBeenCalledTimes(1);
      const history = await app.inject(`/employees/${ID}/salary-history`);
      expect(history.json().data[0].amount).toBe('120000.00');
      const conflict = await app.inject({
        method: 'POST',
        url: `/employees/${ID}/salary`,
        payload: { amount: '100.00', currencyCode: 'USD', effectiveDate: '2024-01-01' },
      });
      expect(conflict.statusCode).toBe(409);
      const malformed = await app.inject({
        method: 'POST',
        url: `/employees/${ID}/salary`,
        payload: { amount: 100, currencyCode: 'USD', effectiveDate: '2025-01-01' },
      });
      expect(malformed.statusCode).toBe(400);
      expect(db.$transaction).toHaveBeenCalledTimes(2);
    } finally {
      await app.close();
    }
  });
});
