import { PrismaClient } from '../generated/prisma/index.js';
import { env } from '../config/env.js';
import { PrismaPg } from '@prisma/adapter-pg';
// A single shared PrismaClient instance for the process. Re-created only in
// tests via separate wiring if ever needed — for the app itself, one
// singleton avoids exhausting DB connections across hot reloads.

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
export const prisma = new PrismaClient({
  adapter,
  log: env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
});
